import { test, expect, chromium } from '@playwright/test';

// This test creates two pages (peer A and peer B) and establishes a WebRTC
// PeerConnection between them. Peer A will create a mirrored local preview
// (via CSS) but will send an unmirrored outgoing stream via canvas capture.
// The test verifies peer B receives the unmirrored video by sampling pixels.

async function createPeerConnection(pageA: any, pageB: any) {
  // establish simple signaling via Playwright message passing
  await pageA.exposeFunction('sendSignalToB', (msg: any) => pageB.evaluate((m) => window.__receiveSignal(m), msg));
  await pageB.exposeFunction('sendSignalToA', (msg: any) => pageA.evaluate((m) => window.__receiveSignal(m), msg));

  await pageA.evaluate(() => {
    window.pc = new RTCPeerConnection();
    window.__pending = [];
    window.__receiveSignal = async (m) => {
      if (m.sdp) await window.pc.setRemoteDescription(m.sdp);
      if (m.candidate) await window.pc.addIceCandidate(m.candidate);
    };
  });

  await pageB.evaluate(() => {
    window.pc = new RTCPeerConnection();
    window.__pending = [];
    window.__receiveSignal = async (m) => {
      if (m.sdp) await window.pc.setRemoteDescription(m.sdp);
      if (m.candidate) await window.pc.addIceCandidate(m.candidate);
    };
  });

  // wire ICE candidates between pages
  await pageA.evaluate(() => {
    window.pc.onicecandidate = (e) => { if (e.candidate) window.sendSignalToB({ candidate: e.candidate }); };
  });
  await pageB.evaluate(() => {
    window.pc.onicecandidate = (e) => { if (e.candidate) window.sendSignalToA({ candidate: e.candidate }); };
  });
}

async function exchangeOfferAnswer(pageA: any, pageB: any) {
  const offer = await pageA.evaluate(async () => {
    const pc = window.pc;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    window.sendSignalToB({ sdp: offer });
    return offer;
  });

  await pageB.waitForFunction(() => window.pc.remoteDescription);

  await pageB.evaluate(async () => {
    const pc = window.pc;
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    window.sendSignalToA({ sdp: answer });
  });

  await pageA.waitForFunction(() => window.pc.remoteDescription);
}

// Utility to draw an asymmetric frame (left red, right green) onto a canvas and capture stream
function asymmetricCanvasScript() {
  return `(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 240;
    const ctx = canvas.getContext('2d');
    let t = 0;
    function frame() {
      // left half red, right half green, with a moving blue square
      ctx.fillStyle = 'red'; ctx.fillRect(0,0,160,240);
      ctx.fillStyle = 'green'; ctx.fillRect(160,0,160,240);
      ctx.fillStyle = 'blue'; ctx.fillRect(10 + ((t*2)%140), 100, 40, 40);
      t++;
      requestAnimationFrame(frame);
    }
    frame();
    const video = document.createElement('video');
    video.autoplay = true; video.muted = true; video.playsInline = true;
    video.srcObject = canvas.captureStream(25);
    document.body.appendChild(video);
    window.__localCanvas = canvas;
    window.__localVideo = video;
    return true;
  })()`;
}

// Sample pixel color from remote video by drawing to temporary canvas
async function sampleRemotePixel(page: any, x: number, y: number) {
  return await page.evaluate(({x,y}) => {
    const v = document.querySelector('video#remote');
    const c = document.createElement('canvas');
    c.width = v.videoWidth || 320; c.height = v.videoHeight || 240;
    const ctx = c.getContext('2d');
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const sampleSize = 7;
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let count = 0;
    for (let dx = -Math.floor(sampleSize / 2); dx <= Math.floor(sampleSize / 2); dx++) {
      for (let dy = -Math.floor(sampleSize / 2); dy <= Math.floor(sampleSize / 2); dy++) {
        const px = Math.min(Math.max(0, Math.floor(x + dx)), c.width - 1);
        const py = Math.min(Math.max(0, Math.floor(y + dy)), c.height - 1);
        const d = ctx.getImageData(px, py, 1, 1).data;
        totalR += d[0];
        totalG += d[1];
        totalB += d[2];
        count++;
      }
    }
    return [Math.round(totalR / count), Math.round(totalG / count), Math.round(totalB / count)];
  }, {x,y});
}

test('receiver sees unmirrored video from sender', async () => {
  const browser = await chromium.launch({ headless: true });
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // setup simple pages
  await pageA.setContent('<html><body></body></html>');
  await pageB.setContent('<html><body><video id="remote" autoplay playsinline></video></body></html>');

  // create asymmetric canvas on A and mirror local preview via CSS
  await pageA.evaluate(asymmetricCanvasScript());
  await pageA.evaluate(() => {
    const v = window.__localVideo;
    // local preview mirrored for natural self-view
    v.style.transform = 'scaleX(-1)';
  });

  // create peer connections and wire signaling
  await createPeerConnection(pageA, pageB);

  // attach local stream from canvas to A.pc and set ontrack handler on B to attach to #remote
  await pageB.evaluate(() => {
    const pc = window.pc;
    pc.ontrack = (ev) => {
      const [s] = ev.streams;
      const remoteV = document.getElementById('remote');
      remoteV.srcObject = s;
    };
  });

  await pageA.evaluate(() => {
    const stream = window.__localVideo.srcObject;
    const pc = window.pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  });

  await exchangeOfferAnswer(pageA, pageB);

  await pageB.evaluate(() => {
    const v = document.getElementById('remote');
    if (v) {
      v.play().catch(() => {});
    }
  });

  // wait for remote video to be playing and have frames
  await pageB.waitForFunction(() => {
    const v = document.getElementById('remote');
    return v && v.readyState >= 2 && v.videoWidth > 0 && v.currentTime > 0;
  }, { timeout: 10000 });

  // sample left and right pixels to confirm orientation: left should be red (255,0,0), right green (0,255,0)
  const left = await sampleRemotePixel(pageB, 40, 120);
  const right = await sampleRemotePixel(pageB, 280, 120);

  // close
  await browser.close();

  // Expect left to be predominantly red, right predominantly green
  expect(left[0]).toBeGreaterThan(120);
  expect(left[1]).toBeLessThan(100);
  expect(right[1]).toBeGreaterThan(120);
  expect(right[0]).toBeLessThan(100);
});
