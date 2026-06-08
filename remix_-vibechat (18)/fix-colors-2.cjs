const fs = require('fs');

function fixFile(file) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/text-slate-605/g, 'text-slate-600');
  content = content.replace(/text-slate-660/g, 'text-slate-600');
  content = content.replace(/border-slate-250/g, 'border-slate-200');
  content = content.replace(/bg-slate-810/g, 'bg-slate-800');
  content = content.replace(/text-slate-[a-zA-Z0-9]{3}/g, (match) => {
    if (['text-slate-205', 'text-slate-855', 'text-slate-350'].includes(match)) {
       return match.replace(/5$/, '0').replace(/350$/, '400');
    }
    return match;
  });

  fs.writeFileSync(file, content);
}

['src/App.tsx', 'src/components/HomePage.tsx', 'src/components/ChatInterface.tsx', 'src/components/VipPlansPage.tsx'].forEach(fixFile);
