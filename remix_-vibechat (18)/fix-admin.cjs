const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Add theme prop
  content = content.replace(/interface AdminPanelProps \{/g, 'interface AdminPanelProps {\n  theme: string;');
  content = content.replace(/export default function AdminPanel\(\{ onBack, token \}: AdminPanelProps\) \{/g, 'export default function AdminPanel({ onBack, token, theme }: AdminPanelProps) {');

  // Fix root header text
  content = content.replace(/className="text-3xl font-bold font-display text-white tracking-tight flex items-center gap-2"/g,
    'className={`text-3xl font-bold font-display tracking-tight flex items-center gap-2 ${theme === "light" ? "text-slate-900" : "text-white"}`}');
  content = content.replace(/className="text-slate-400 text-xs mt-1"/g,
    'className={`text-xs mt-1 ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}');

  // Fix stats cards
  content = content.replace(/className="p-5 bg-slate-900\/60 border border-slate-800 rounded-2xl"/g,
    'className={`p-5 rounded-2xl border ${theme === "light" ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"}`}');
  content = content.replace(/className="text-2xl font-bold text-white mb-1"/g,
    'className={`text-2xl font-bold mb-1 ${theme === "light" ? "text-slate-900" : "text-white"}`}');

  // Fix sub-cards
  content = content.replace(/className="bg-slate-900\/40 border border-slate-800 rounded-2xl p-6 backdrop-blur"/g,
    'className={`rounded-2xl p-6 backdrop-blur border ${theme === "light" ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/40 border-slate-800"}`}');
  content = content.replace(/className="text-xl font-bold font-display text-white mb-4"/g,
    'className={`text-xl font-bold font-display mb-4 ${theme === "light" ? "text-slate-900" : "text-white"}`}');

  // Fix inputs/selects
  content = content.replace(/className="w-full py-2 pl-9 pr-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500 transition"/g,
    'className={`w-full py-2 pl-9 pr-4 rounded-xl text-xs focus:outline-none transition border ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500 placeholder-slate-400" : "bg-slate-950 border-slate-800 text-white focus:border-violet-500"}`}'
  );
  content = content.replace(/className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500 transition"/g,
    'className={`w-full p-3 rounded-xl text-xs focus:outline-none transition border ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500 placeholder-slate-400" : "bg-slate-950 border-slate-800 text-white focus:border-violet-500"}`}'
  );
  content = content.replace(/className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500 transition resize-none"/g,
    'className={`w-full p-3 rounded-xl text-xs focus:outline-none transition resize-none border ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500 placeholder-slate-400" : "bg-slate-950 border-slate-800 text-white focus:border-violet-500"}`}'
  );

  // Fix plan inputs
  content = content.replace(/className="w-full text-xs p-2\.5 bg-slate-900 border border-slate-850 rounded-xl text-white focus:outline-none focus:border-amber-500 transition"/g,
    'className={`w-full text-xs p-2.5 rounded-xl focus:outline-none transition border ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500" : "bg-slate-900 border-slate-800 text-white focus:border-amber-500"}`}'
  );

  // Fix table texts
  content = content.replace(/className="text-white font-bold text-xs"/g,
    'className={`font-bold text-xs ${theme === "light" ? "text-slate-900" : "text-white"}`}');
  content = content.replace(/className="hover:bg-slate-950\/20"/g,
    'className={`${theme === "light" ? "hover:bg-slate-50" : "hover:bg-slate-950/20"}`}');

  // Fix specific containers
  content = content.replace(/className="bg-slate-900\/40 p-5 rounded-2xl border border-slate-800"/g,
    'className={`p-5 rounded-2xl border ${theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900/40 border-slate-800"}`}');
  content = content.replace(/className="p-4 bg-slate-950\/60 border border-slate-850 rounded-2xl space-y-3"/g,
    'className={`p-4 rounded-2xl space-y-3 border ${theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"}`}');
  content = content.replace(/className="p-5 bg-slate-950\/60 rounded-2xl border border-slate-800\/80 flex flex-col justify-between"/g,
    'className={`p-5 rounded-2xl border flex flex-col justify-between ${theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"}`}');
  content = content.replace(/className="text-lg font-bold font-display text-white mb-4 flex items-center gap-2"/g,
    'className={`text-lg font-bold font-display mb-4 flex items-center gap-2 ${theme === "light" ? "text-slate-900" : "text-white"}`}');
  
  // Minor text-white and text-slate-400 remaining
  content = content.replace(/className="relative border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950 rounded-xl p-6 text-center cursor-pointer group transition"/g,
    'className={`relative border border-dashed rounded-xl p-6 text-center cursor-pointer group transition ${theme === "light" ? "border-slate-300 hover:border-slate-400 bg-slate-50/50" : "border-slate-800 hover:border-slate-700 bg-slate-950"}`}'
  );
  content = content.replace(/className="bg-slate-950 p-4 rounded-xl border border-slate-800 w-40 h-40 flex items-center justify-center mx-auto shadow"/g,
    'className={`p-4 rounded-xl border w-40 h-40 flex items-center justify-center mx-auto shadow ${theme === "light" ? "bg-slate-50 border-slate-300" : "bg-slate-950 border-slate-800"}`}'
  );

  content = content.replace(/className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-stone-300 hover:text-white rounded-xl border border-slate-700\/50 transition font-medium text-xs cursor-pointer"/g,
    'className={`px-4 py-2 rounded-xl border transition font-medium text-xs cursor-pointer ${theme === "light" ? "bg-white border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900" : "bg-slate-800 hover:bg-slate-700 border-slate-700/50 text-stone-300 hover:text-white"}`}'
  );

  fs.writeFileSync(file, content);
}

fixFile('src/components/AdminPanel.tsx');
