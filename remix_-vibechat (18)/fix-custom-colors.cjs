const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix 450, 550, 650, 850 etc
  content = content.replace(/text-slate-650/g, 'text-slate-600');
  content = content.replace(/bg-blue-650/g, 'bg-blue-600');
  content = content.replace(/bg-blue-550/g, 'bg-blue-500');
  content = content.replace(/text-indigo-450/g, 'text-indigo-500');
  
  content = content.replace(/text-violet-650/g, 'text-violet-600');
  content = content.replace(/bg-violet-650/g, 'bg-violet-600');
  content = content.replace(/from-violet-650/g, 'from-violet-600');
  content = content.replace(/to-indigo-650/g, 'to-indigo-600');
  content = content.replace(/hover:from-violet-550/g, 'hover:from-violet-500');
  content = content.replace(/text-rose-450/g, 'text-rose-400');
  content = content.replace(/text-yellow-450/g, 'text-yellow-400');
  content = content.replace(/placeholder-slate-450/g, 'placeholder-slate-400');
  content = content.replace(/text-slate-450/g, 'text-slate-400');
  content = content.replace(/focus:border-sky-450/g, 'focus:border-sky-400');
  content = content.replace(/shadow-slate-250\/40/g, 'shadow-slate-200/40');
  content = content.replace(/border-slate-550/g, 'border-slate-500');
  content = content.replace(/border-violet-850/g, 'border-violet-800');
  content = content.replace(/border-violet-550/g, 'border-violet-500');
  content = content.replace(/bg-slate-105/g, 'bg-slate-100');
  content = content.replace(/bg-violet-955/g, 'bg-violet-950');
  content = content.replace(/bg-slate-750/g, 'bg-slate-800');
  content = content.replace(/divide-slate-850/g, 'divide-slate-800');

  fs.writeFileSync(file, content);
}

['src/components/HomePage.tsx', 'src/App.tsx', 'src/components/ChatInterface.tsx', 'src/components/AdminPanel.tsx', 'src/components/AdminLoginPortal.tsx', 'src/components/VipPlansPage.tsx', 'src/components/AudioVideoCall.tsx'].forEach(fixFile);
