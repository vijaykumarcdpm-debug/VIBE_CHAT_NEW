const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Fix drop-down Report/Block menu
  content = content.replace(/className="absolute right-0 top-10 w-40 bg-slate-950 border border-slate-800 rounded-xl py-1\.5 shadow-2xl z-20 font-display text-xs"/g,
    'className={`absolute right-0 top-10 w-40 border rounded-xl py-1.5 shadow-2xl z-20 font-display text-xs ${theme === "light" ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"}`}');

  content = content.replace(/className="w-full text-left px-4 py-2 hover:bg-slate-900 text-amber-500 hover:text-amber-400 flex items-center gap-2 cursor-pointer"/g,
    'className={`w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer ${theme === "light" ? "hover:bg-slate-50 text-amber-600 hover:text-amber-500" : "hover:bg-slate-900 text-amber-500 hover:text-amber-400"}`}');

  content = content.replace(/className="w-full text-left px-4 py-2 hover:bg-slate-900 text-sky-500 hover:text-sky-400 border-t border-slate-900 mt-1\.5 flex items-center gap-2 cursor-pointer"/g,
    'className={`w-full text-left px-4 py-2 border-t mt-1.5 flex items-center gap-2 cursor-pointer ${theme === "light" ? "hover:bg-slate-50 border-slate-100 text-sky-600 hover:text-sky-500" : "hover:bg-slate-900 text-sky-500 hover:text-sky-400 border-slate-900"}`}');

  content = content.replace(/className="w-full text-left px-4 py-2 hover:bg-slate-900 text-rose-500 hover:text-rose-450 border-t border-slate-900 mt-1\.5 flex items-center gap-2 cursor-pointer"/g,
    'className={`w-full text-left px-4 py-2 border-t mt-1.5 flex items-center gap-2 cursor-pointer ${theme === "light" ? "hover:bg-slate-50 border-slate-100 text-rose-600 hover:text-rose-500" : "hover:bg-slate-900 text-rose-500 hover:text-rose-450 border-slate-900"}`}');

  // Fix report modal
  content = content.replace(/<div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm">/g,
    '<div className={`p-6 rounded-2xl w-full max-w-sm border ${theme === "light" ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>');

  // Fix report modal texts
  content = content.replace(/<p className="text-xs text-slate-400 mb-4">/g,
    '<p className={`text-xs mb-4 ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}>');
  content = content.replace(/<h3 className="text-xl font-bold text-white mb-2 font-display">/g,
    '<h3 className={`text-xl font-bold mb-2 font-display ${theme === "light" ? "text-slate-900" : "text-white"}`}>');
  
  content = content.replace(/className="w-full p-2\.5 bg-slate-950 border border-slate-800 text-xs text-white rounded-lg focus:outline-none focus:border-rose-500 transition resize-none"/g,
    'className={`w-full p-2.5 border text-xs rounded-lg focus:outline-none focus:border-rose-500 transition resize-none ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-950 border-slate-800 text-white"}`}');

  content = content.replace(/className="w-1\/2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition font-medium text-xs"/g,
    'className={`w-1/2 py-2 rounded-lg transition font-medium text-xs ${theme === "light" ? "bg-slate-100 hover:bg-slate-200 text-slate-600" : "bg-slate-800 hover:bg-slate-700 text-slate-400"}`}');


  // Fix plan limit modal
  content = content.replace(/<div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">/g,
    '<div className={`w-full max-w-sm border rounded-3xl p-6 relative overflow-hidden shadow-2xl ${theme === "light" ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-slate-800 text-slate-100"}`}>');

  content = content.replace(/<div className="w-full bg-slate-950\/40 border border-slate-800 rounded-2xl p-4 text-left text-xs space-y-2\.5">/g,
    '<div className={`w-full border rounded-2xl p-4 text-left text-xs space-y-2.5 ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-slate-950/40 border-slate-800"}`}>');

  content = content.replace(/<h3 className="text-xl font-bold font-display text-white mb-2">/g,
    '<h3 className={`text-xl font-bold font-display mb-2 ${theme === "light" ? "text-slate-900" : "text-white"}`}>');

  // Any leftover typos
  content = content.replace(/bg-slate-205/g, 'bg-slate-200');
  content = content.replace(/bg-slate-250/g, 'bg-slate-200');

  // Fix 3 dot menu hover
  content = content.replace(/className="p-2 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"/g,
    'className={`p-2 rounded-xl transition cursor-pointer ${theme === "light" ? "hover:bg-slate-100 text-slate-500 hover:text-slate-800" : "hover:bg-slate-900 text-slate-400 hover:text-white"}`}');

  fs.writeFileSync(file, content);
}

fixFile('src/components/ChatInterface.tsx');
