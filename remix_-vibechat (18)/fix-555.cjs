const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(/text-slate-555/g, 'text-slate-500');
  content = content.replace(/text-slate-404/g, 'text-slate-400');
  
  content = content.replace(/text-white/g, (match, offset, string) => {
    // We already fixed text-white mostly, let's grep later.
    return match;
  });

  fs.writeFileSync(file, content);
}

['src/components/HomePage.tsx', 'src/App.tsx', 'src/components/ChatInterface.tsx', 'src/components/AdminPanel.tsx', 'src/components/AdminLoginPortal.tsx', 'src/components/VipPlansPage.tsx', 'src/components/AudioVideoCall.tsx'].forEach(fixFile);
