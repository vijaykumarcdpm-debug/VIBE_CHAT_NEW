const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(/className="space-y-1\.5 text-\[11px\] text-slate-400 mb-4 bg-slate-900\/40 p-3 rounded-xl border border-slate-800\/40"/g,
    'className={`space-y-1.5 text-[11px] mb-4 p-3 rounded-xl border ${theme === "light" ? "bg-white border-slate-200 text-slate-500" : "bg-slate-900/40 border-slate-800/40 text-slate-400"}`}'
  );

  content = content.replace(/className="relative max-h-56 rounded-xl overflow-hidden border border-slate-800 bg-slate-900\/20 mb-4 flex items-center justify-center p-2 group cursor-pointer"/g,
    'className={`relative max-h-56 rounded-xl overflow-hidden mb-4 flex items-center justify-center p-2 group cursor-pointer border ${theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900/20 border-slate-800"}`}'
  );

  content = content.replace(/className="py-8 text-center text-slate-600 bg-slate-900\/40 text-xs rounded-xl mb-4"/g,
    'className={`py-8 text-center text-xs rounded-xl mb-4 ${theme === "light" ? "bg-slate-50 text-slate-500" : "bg-slate-900/40 text-slate-600"}`}'
  );

  fs.writeFileSync(file, content);
}

fixFile('src/components/AdminPanel.tsx');
