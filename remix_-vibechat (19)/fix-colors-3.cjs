const fs = require('fs');

function fixFile(file) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/border-slate-205/g, 'border-slate-200');
  content = content.replace(/text-slate-850/g, 'text-slate-900');
  content = content.replace(/text-slate-350/g, 'text-slate-400');
  content = content.replace(/bg-slate-850/g, 'bg-slate-800');
  content = content.replace(/border-slate-850\/60/g, 'border-slate-800/60');
  fs.writeFileSync(file, content);
}

['src/components/AdminLoginPortal.tsx', 'src/components/AdminPanel.tsx'].forEach(fixFile);
