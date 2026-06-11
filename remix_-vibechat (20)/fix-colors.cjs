const fs = require('fs');

function fixFile(file) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/border-slate-205/g, 'border-slate-200');
  content = content.replace(/text-slate-850/g, 'text-slate-900');
  content = content.replace(/text-slate-855/g, 'text-slate-800');
  content = content.replace(/text-slate-350/g, 'text-slate-400');
  content = content.replace(/bg-slate-850/g, 'bg-slate-800');
  content = content.replace(/bg-slate-805/g, 'bg-slate-800');
  content = content.replace(/border-slate-805/g, 'border-slate-800');
  content = content.replace(/border-slate-850/g, 'border-slate-800');
  
  if(file.includes('HomePage.tsx')) {
    content = content.replace(/className="w-1\/2 p-2 text-xs font-mono font-bold tracking-widest text-center rounded-lg bg-slate-900 border border-slate-800 text-white"/g, 'className={`w-1/2 p-2 text-xs font-mono font-bold tracking-widest text-center rounded-lg border ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-900 border-slate-800 text-white"}`}');
  }

  fs.writeFileSync(file, content);
}

['src/App.tsx', 'src/components/HomePage.tsx', 'src/components/ChatInterface.tsx', 'src/components/VipPlansPage.tsx'].forEach(fixFile);
