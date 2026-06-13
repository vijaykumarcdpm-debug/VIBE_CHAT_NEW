import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Maximize, Minimize, Volume2, VolumeX, AlertTriangle } from 'lucide-react';

interface AudioVideoCallProps {
  ws: WebSocket | null;
  userId: string;
  peerId: string;
  peerName: string;
  peerPic: string;
  isCaller: boolean;
  callType: 'audio' | 'video';
  onHangup: () => void;
}

export default function AudioVideoCall({
  ws,
  userId,
  peerId,
  peerName,
  peerPic,
  isCaller,
  callType,
  onHangup
}: AudioVideoCallProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(callType === 'audio');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [callStatus, setCallStatus] = useState<string>('Connecting stream...');
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Ref elements
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Audio only elements need audio elements explicitly for better mobile support
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const signalQueue = useRef<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const processSignal = async (signal: any, pc: RTCPeerConnection) => {
    try {
      if (signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (pc.remoteDescription?.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (ws) {
            ws.send(JSON.stringify({
              event: 'webrtc:signal',
              data: { targetId: peerId, signal: { sdp: answer } }
            }));
          }
        }
      } else if (signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) {
      console.warn('Error processing signal:', err);
    }
  };

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isComponentMounted = true;

    async function initCall() {
      try {
        const constraints = {
          audio: true,
          video: callType === 'video' ? { facingMode } : false
        };

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia(constraints)
            .catch((e) => {
              throw new Error(`Media access denied or not available. ${e.message}`);
            });

          if (!isComponentMounted) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }

          activeStream = stream;
          setLocalStream(stream);

          if (callType === 'video' && localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          } else if (callType === 'audio' && localAudioRef.current) {
            localAudioRef.current.srcObject = stream;
          }

          setCallStatus(isCaller ? 'Ringing...' : 'Connecting WebRTC...');
          setupWebRTC(stream);
        } else {
          throw new Error('WebRTC API missing or insecure context (HTTPS required)');
        }

      } catch (err: any) {
        console.error('WebRTC Initialization Error:', err);
        setErrorMsg(err.message || 'Camera/Microphone initialization failed.');
        setCallStatus('Failed');
      }
    }

    initCall();

    return () => {
      isComponentMounted = false;
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, [facingMode]);

  // Handle incoming signaling messages from websocket
  useEffect(() => {
    if (!ws) return;

    const handleSignaling = (e: MessageEvent) => {
      try {
        const { event, data } = JSON.parse(e.data);
        if (event === 'webrtc:signal' && data.senderId === peerId) {
          const { signal } = data;
          
          if (pcRef.current) {
            processSignal(signal, pcRef.current);
          } else {
            signalQueue.current.push(signal);
          }
        } else if (event === 'call:hangup' && data.senderId === peerId) {
          setCallStatus('Finished');
          setTimeout(() => {
            onHangup();
          }, 1000);
        }
      } catch (e) {
        console.error('Signaling relay fail:', e);
      }
    };

    ws.addEventListener('message', handleSignaling);
    return () => {
      ws.removeEventListener('message', handleSignaling);
    };
  }, [ws, peerId]);

  const setupWebRTC = (stream: MediaStream) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(configuration);
    pcRef.current = pc;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      const [remoteMediaStream] = event.streams;
      setRemoteStream(remoteMediaStream);
      setCallStatus('Connected');

      if (callType === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteMediaStream;
      } else if (callType === 'audio' && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteMediaStream;
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setCallStatus('Connection Lost');
      } else if (pc.connectionState === 'connected') {
        setCallStatus('Connected');
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        setCallStatus('Connection Lost');
      } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setCallStatus('Connected');
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && ws) {
        ws.send(JSON.stringify({
          event: 'webrtc:signal',
          data: {
            targetId: peerId,
            signal: { candidate: event.candidate }
          }
        }));
      }
    };

    if (isCaller) {
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        if (ws) {
          ws.send(JSON.stringify({
            event: 'webrtc:signal',
            data: {
              targetId: peerId,
              signal: { sdp: offer }
            }
          }));
        }
      });
    }

    // Process any queued signals
    while (signalQueue.current.length > 0) {
      const queuedSignal = signalQueue.current.shift();
      processSignal(queuedSignal, pc);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!localStream.getAudioTracks()[0]?.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!localStream.getVideoTracks()[0]?.enabled);
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const toggleSpeaker = () => {
    const el = callType === 'video' ? remoteVideoRef.current : remoteAudioRef.current;
    if (el) {
      el.muted = isSpeakerOn; 
    }
    setIsSpeakerOn(!isSpeakerOn);
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((e) => console.warn(e));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const hangUpCall = () => {
    if (ws) {
      ws.send(JSON.stringify({
        event: 'call:hangup',
        data: { targetId: peerId }
      }));
    }
    onHangup();
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center w-full min-h-[500px] h-[100dvh] md:h-[620px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 transition ${
        isFullscreen ? 'h-screen rounded-none border-none' : ''
      }`}
    >
      {/* Error Output */}
      {errorMsg && (
        <div className="absolute top-4 left-0 right-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 bg-rose-600/90 font-display text-[12px] font-bold text-white rounded-full shadow border border-rose-500 backdrop-blur w-fit max-w-[90%] text-center leading-tight">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Reconnecting Full-Frame Overlay Info */}
      {callStatus === 'Connection Lost' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-30 flex flex-col items-center justify-center p-8 text-center animate-fade-in text-slate-100">
          <div className="relative mb-6">
            <span className="absolute inset-0 w-20 h-20 bg-amber-500/10 rounded-full animate-ping"></span>
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 relative border border-amber-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-3.536 4.978 4.978 0 011.414-3.536m0 0l2.829 2.829M3 3l18 18" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-extrabold text-white mb-2 font-display tracking-tight flex items-center gap-2 justify-center">
            ⚠️ Connection Disrupted
          </h2>
          <p className="text-xs text-amber-400 font-extrabold uppercase tracking-widest mb-4">Reconnecting with {peerName}...</p>
          <div className="max-w-xs space-y-3 mx-auto">
            <p className="text-xs text-slate-400 leading-relaxed">
              We are actively re-establishing WebRTC telemetry signal channels. Please check your network internet and stay online.
            </p>
            <div className="flex justify-center items-center gap-1.5">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '250ms' }}></span>
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '500ms' }}></span>
            </div>
          </div>
        </div>
      )}

      {/* Connection Indicator Overlay */}
      {callStatus !== 'Connected' && callStatus !== 'Finished' && !errorMsg && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center justify-center p-4 bg-slate-900/80 backdrop-blur border border-slate-700/50 rounded-2xl shadow-xl text-center pointer-events-none">
          <h2 className="text-sm font-bold text-white mb-1 font-display drop-shadow-md">{peerName}</h2>
          <p className="text-[10px] text-violet-400 capitalize mb-1 drop-shadow-md">{callType} Calling...</p>
          <p className="text-[10px] text-slate-200 animate-pulse drop-shadow-md">{callStatus}</p>
        </div>
      )}

      {/* Finished State Screen */}
      {callStatus === 'Finished' && (
        <div className="absolute inset-0 bg-slate-950 z-20 flex flex-col items-center justify-center p-6 text-center">
          <PhoneOff className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-white mb-2 font-display">Call Completed</h2>
          <p className="text-xs text-slate-500">Leaving connection...</p>
        </div>
      )}

      {/* VIDEO / CANVAS INTERACTIVE DISPLAY GRID */}
      {callType === 'video' ? (
        <div className="absolute inset-0 w-full h-full bg-slate-900">
          {/* Main Remote Feed Area */}
          <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
             <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            
            {/* User Label overlay */}
            <div className="absolute bottom-20 left-4 px-3 py-1 bg-slate-950/80 rounded-lg text-xs font-semibold text-white border border-slate-800">
              {peerName}
            </div>
          </div>

          {/* Picture-In-Picture Local Feed Window */}
          {!isVideoOff && !errorMsg && (
            <div className="absolute top-4 right-4 w-28 sm:w-44 h-40 sm:h-48 rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-950 z-10">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-slate-950/60 rounded text-[9px] text-white">
                You
              </div>
            </div>
           )}
        </div>
      ) : (
        /* AUDIO ONLY CALL PULSING CARD */
        <div className="relative flex flex-col items-center justify-center p-12 text-center w-full h-full bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/20">
          <audio
            ref={remoteAudioRef}
            autoPlay
            className="hidden"
          />
          <audio
            ref={localAudioRef}
            autoPlay
            muted
            className="hidden"
          />
          
          {callStatus !== 'Connected' && (
          <div className="relative mb-6">
            <span className="absolute inset-0 w-28 h-28 bg-violet-500/10 rounded-full animate-bounce"></span>
            <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 p-1 animate-pulse">
              <img
                src={peerPic || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%238B5CF6'/></svg>`}
                alt={peerName}
                className="w-24 h-24 rounded-full object-cover bg-slate-900"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          )}
          <h3 className="text-xl font-bold font-display text-white mb-2">{peerName}</h3>
          <p className="text-indigo-400 text-xs tracking-wider uppercase font-semibold animate-pulse">
             {callStatus === 'Connected' ? 'Active Audio Call' : 'Connecting...'}
          </p>
          <div className="w-16 h-1 bg-slate-800 rounded-full my-6 flex overflow-hidden">
             <span className="h-full bg-violet-500 animate-slide-wide w-1/2"></span>
          </div>
          <span className="text-slate-500 text-[11px]">Secure end-to-end encrypted connection</span>
        </div>
      )}

      {/* INTERACTIVE CONTROLS BAR */}
      <div className="absolute bottom-6 flex items-center justify-center gap-2 sm:gap-4 px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-950/80 backdrop-blur border border-slate-800 rounded-2xl shadow-2xl flex-wrap w-fit max-w-[95%] z-20 mx-auto">
        {/* Toggle Audio Mute */}
        <button
          onClick={toggleMute}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          className={`p-3 sm:p-3.5 rounded-full sm:rounded-xl border transition duration-200 cursor-pointer shrink-0 ${
            isMuted
              ? 'bg-rose-500/20 border-rose-500/30 text-rose-400 hover:bg-rose-500/30'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5 sm:w-5 sm:h-5" /> : <Mic className="w-5 h-5 sm:w-5 sm:h-5" />}
        </button>

        {/* Toggle Speaker */}
        <button
          onClick={toggleSpeaker}
          title={isSpeakerOn ? 'Mute speaker' : 'Unmute speaker'}
          className={`p-3 sm:p-3.5 rounded-full sm:rounded-xl border transition duration-200 cursor-pointer shrink-0 ${
            !isSpeakerOn
              ? 'bg-rose-500/20 border-rose-500/30 text-rose-400 hover:bg-rose-500/30'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          {!isSpeakerOn ? <VolumeX className="w-5 h-5 sm:w-5 sm:h-5" /> : <Volume2 className="w-5 h-5 sm:w-5 sm:h-5" />}
        </button>

        {/* Toggle Video Feed (For Video calls only) */}
        {callType === 'video' && (
          <button
            onClick={toggleVideo}
            title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
            className={`p-3 sm:p-3.5 rounded-full sm:rounded-xl border transition duration-200 cursor-pointer shrink-0 ${
              isVideoOff
                ? 'bg-rose-500/20 border-rose-500/30 text-rose-400 hover:bg-rose-500/30'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5 sm:w-5 sm:h-5" /> : <Video className="w-5 h-5 sm:w-5 sm:h-5" />}
          </button>
        )}

        {/* Toggle Lens Switch Camera */}
        {callType === 'video' && !isVideoOff && !errorMsg && (
          <button
            onClick={switchCamera}
            title="Switch Camera (Front/Back)"
            className="p-3 sm:p-3.5 bg-slate-900 hover:bg-slate-800 border fill-current border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-full sm:rounded-xl transition duration-200 cursor-pointer shrink-0"
          >
            <span className="text-xs font-semibold px-0.5" style={{ display: 'flex' }}>Flip</span>
          </button>
        )}

        {/* Hang Up trigger */}
        <button
          onClick={hangUpCall}
          title="Hang Up Connection"
          className="p-3 sm:p-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full sm:rounded-xl shadow-lg shadow-rose-600/30 hover:scale-105 duration-200 cursor-pointer shrink-0"
        >
          <PhoneOff className="w-5 h-5 sm:w-5 sm:h-5" />
        </button>

        {/* Toggle Fullscreen mode */}
        <button
          onClick={handleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className="p-3 sm:p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-full sm:rounded-xl transition duration-200 cursor-pointer shrink-0 hidden sm:block"
        >
          {isFullscreen ? <Minimize className="w-5 h-5 sm:w-5 sm:h-5" /> : <Maximize className="w-5 h-5 sm:w-5 sm:h-5" />}
        </button>
      </div>
    </div>
  );
}

