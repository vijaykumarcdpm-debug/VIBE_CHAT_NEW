const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/className="inline-flex items-center gap-2 mb-6 px-4 py-2 text-stone-300 hover:text-white bg-slate-800\/40 hover:bg-slate-800 border border-slate-700\/50 rounded-xl transition cursor-pointer"/g,
    'className={`inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-xl border transition cursor-pointer ${theme === "light" ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm" : "text-stone-300 hover:text-white bg-slate-800/40 hover:bg-slate-800 border-slate-700/50"}`}'
  );

  content = content.replace(/className="bg-slate-900\/60 border border-slate-800 rounded-3xl p-6 sm:p-10 backdrop-blur-md"/g,
    'className={`border rounded-3xl p-6 sm:p-10 backdrop-blur-md ${theme === "light" ? "bg-slate-50/80 border-slate-200 shadow-xl" : "bg-slate-900/60 border-slate-800"}`}'
  );

  content = content.replace(/className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-white mb-4"/g,
    'className={`text-3xl sm:text-4xl font-bold font-display tracking-tight mb-4 ${theme === "light" ? "text-slate-900" : "text-white"}`}'
  );

  content = content.replace(/className="text-slate-400 text-sm sm:text-base leading-relaxed"/g,
    'className={`text-sm sm:text-base leading-relaxed ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}'
  );

  content = content.replace(/className="text-2xl font-bold font-display text-white mb-3"/g,
    'className={`text-2xl font-bold font-display mb-3 ${theme === "light" ? "text-slate-900" : "text-white"}`}'
  );

  content = content.replace(/className="text-slate-400 text-sm leading-relaxed mb-6"/g,
    'className={`text-sm leading-relaxed mb-6 ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}'
  );

  content = content.replace(/className="text-slate-300 text-sm leading-relaxed mb-6"/g,
    'className={`text-sm leading-relaxed mb-6 ${theme === "light" ? "text-slate-600" : "text-slate-300"}`}'
  );

  content = content.replace(/className="text-lg font-bold font-display text-white mb-5 flex items-center gap-2"/g,
    'className={`text-lg font-bold font-display mb-5 flex items-center gap-2 ${theme === "light" ? "text-slate-900" : "text-white"}`}'
  );

  content = content.replace(/className="font-bold text-white text-base truncate"/g,
    'className={`font-bold text-base truncate ${theme === "light" ? "text-slate-900" : "text-white"}`}'
  );

  content = content.replace(/className="text-2xl font-bold text-white font-display"/g,
    'className={`text-2xl font-bold font-display ${theme === "light" ? "text-slate-900" : "text-white"}`}'
  );

  content = content.replace(/className="text-\[10px\] text-slate-500 border-t border-slate-800 pt-2 bg-slate-950\/30 -mx-4 px-4 -mb-4 rounded-b-2xl"/g,
    'className={`text-[10px] border-t pt-2 -mx-4 px-4 -mb-4 rounded-b-2xl ${theme === "light" ? "text-slate-500 border-slate-200 bg-slate-100" : "text-slate-500 border-slate-800 bg-slate-950/30"}`}'
  );

  content = content.replace(/className="bg-slate-950\/60 p-6 rounded-2xl border border-slate-800\/50 flex flex-col items-center justify-center"/g,
    'className={`p-6 rounded-2xl border flex flex-col items-center justify-center ${theme === "light" ? "bg-white border-slate-200" : "bg-slate-950/60 border-slate-800/50"}`}'
  );

  content = content.replace(/className="text-base font-bold font-display text-white mb-4 text-center"/g,
    'className={`text-base font-bold font-display mb-4 text-center ${theme === "light" ? "text-slate-900" : "text-white"}`}'
  );

  content = content.replace(/className="text-slate-400 text-center text-xs"/g,
    'className={`text-center text-xs ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}'
  );

  content = content.replace(/className="text-\[11px\] text-slate-400"/g,
    'className={`text-[11px] ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}'
  );

  content = content.replace(/className="text-base font-bold font-display text-white mb-4 flex items-center gap-2"/g,
    'className={`text-base font-bold font-display mb-4 flex items-center gap-2 ${theme === "light" ? "text-slate-900" : "text-white"}`}'
  );

  content = content.replace(/className="text-xs text-slate-400 mb-4 leading-relaxed"/g,
    'className={`text-xs mb-4 leading-relaxed ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}'
  );

  content = content.replace(/className="relative border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-xl transition p-8 text-center cursor-pointer group bg-slate-900\/30"/g,
    'className={`relative border-2 border-dashed rounded-xl transition p-8 text-center cursor-pointer group ${theme === "light" ? "border-slate-300 hover:border-slate-400 bg-slate-50/50" : "border-slate-700 hover:border-slate-500 bg-slate-900/30"}`}'
  );

  content = content.replace(/className="block text-sm font-semibold text-stone-300"/g,
    'className={`block text-sm font-semibold ${theme === "light" ? "text-slate-700" : "text-stone-300"}`}'
  );

  content = content.replace(/className="text-\[10px\] text-center text-slate-500 mt-2 flex items-center justify-center gap-1"/g,
    'className={`text-[10px] text-center mt-2 flex items-center justify-center gap-1 ${theme === "light" ? "text-slate-500" : "text-slate-500"}`}'
  );

  content = content.replace(/className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-5 font-display text-center"/g,
    'className={`text-sm font-bold uppercase tracking-wider mb-5 font-display text-center ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}'
  );

  content = content.replace(/className="p-4 bg-slate-900\/40 rounded-xl border border-slate-800\/30"/g,
    'className={`p-4 rounded-xl border ${theme === "light" ? "bg-white border-slate-200" : "bg-slate-900/40 border-slate-800/30"}`}'
  );

  content = content.replace(/className="font-semibold text-white text-xs mb-1"/g,
    'className={`font-semibold text-xs mb-1 ${theme === "light" ? "text-slate-900" : "text-white"}`}'
  );

  content = content.replace(/className="text-slate-400 text-\[11px\] leading-normal"/g,
    'className={`text-[11px] leading-normal ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}'
  );

  content = content.replace(/className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition cursor-pointer"/g,
    'className={`w-full py-3 rounded-xl font-medium transition cursor-pointer ${theme === "light" ? "bg-slate-800 hover:bg-slate-900 text-white" : "bg-slate-800 hover:bg-slate-700 text-white"}`}'
  );

  content = content.replace(/className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 p-2"/g,
    'className={`relative rounded-xl overflow-hidden border p-2 ${theme === "light" ? "border-slate-200 bg-white" : "border-slate-700 bg-slate-950"}`}'
  );

  fs.writeFileSync(file, content);
}

fixFile('src/components/VipPlansPage.tsx');
