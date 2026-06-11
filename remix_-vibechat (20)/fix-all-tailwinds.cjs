const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Any color ending in 5 like 655, 405, 605, etc.
  content = content.replace(/-([a-zA-Z]+)-(\d\d)5/g, '-$1-$20');

  // Let's also do specifically:
  content = content.replace(/text-slate-655/g, 'text-slate-600');
  content = content.replace(/text-slate-555/g, 'text-slate-500');
  content = content.replace(/text-violet-405/g, 'text-violet-400');
  content = content.replace(/text-violet-605/g, 'text-violet-600');
  content = content.replace(/border-slate-830/g, 'border-slate-800');

  fs.writeFileSync(file, content);
}

['src/components/HomePage.tsx', 'src/App.tsx', 'src/components/ChatInterface.tsx', 'src/components/AdminPanel.tsx', 'src/components/AdminLoginPortal.tsx', 'src/components/VipPlansPage.tsx', 'src/components/AudioVideoCall.tsx'].forEach(fixFile);
