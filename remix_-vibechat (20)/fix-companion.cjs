const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(/className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-900\/40 border border-slate-800\/60 shadow-xl relative overflow-hidden"/g,
    'className={`flex flex-col items-center text-center p-4 rounded-2xl border shadow-xl relative overflow-hidden ${theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900/40 border-slate-800/60"}`}');

  content = content.replace(/className="p-2 bg-slate-900\/30 rounded-xl border border-slate-800\/40"/g,
    'className={`p-2 rounded-xl border ${theme === "light" ? "bg-white border-slate-200" : "bg-slate-900/30 border-slate-800/40"}`}');

  content = content.replace(/className="font-extrabold text-stone-200 capitalize"/g,
    'className={`font-extrabold capitalize ${theme === "light" ? "text-slate-700" : "text-stone-200"}`}');

  content = content.replace(/className="font-extrabold text-stone-200 truncate block"/g,
    'className={`font-extrabold truncate block ${theme === "light" ? "text-slate-700" : "text-stone-200"}`}');

  content = content.replace(/className="p-2\.5 bg-slate-900\/40 rounded-xl border border-slate-800\/50 space-y-1"/g,
    'className={`p-2.5 rounded-xl border space-y-1 ${theme === "light" ? "bg-white border-slate-200" : "bg-slate-900/40 border-slate-800/50"}`}');

  content = content.replace(/className="p-4 border-t border-slate-800 bg-slate-950\/20"/g,
    'className={`p-4 border-t ${theme === "light" ? "bg-slate-50 border-slate-200" : "border-slate-800 bg-slate-950/20"}`}');

  content = content.replace(/className={`p-2 rounded-xl transition cursor-pointer \${theme === \"light\" \? \"hover:bg-slate-100 text-slate-500 hover:text-slate-800\" : \"hover:bg-slate-900 text-slate-400 hover:text-white\"}`}/g,
    'className={`p-2 rounded-xl transition cursor-pointer ${theme === "light" ? "hover:bg-slate-100 text-slate-500 hover:text-slate-800" : "hover:bg-slate-900 text-slate-400 hover:text-white"}`}');

  content = content.replace(/className={`text-\[9px\] uppercase font-bold tracking-wider font-display text-slate-500 border-b border-slate-800\/40 pb-1`}/g,
    'className={`text-[9px] uppercase font-bold tracking-wider font-display text-slate-500 border-b pb-1 ${theme === "light" ? "border-slate-200" : "border-slate-800/40"}`}');

  fs.writeFileSync(file, content);
}

fixFile('src/components/ChatInterface.tsx');
