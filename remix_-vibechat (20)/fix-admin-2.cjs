const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(/className="text-3xl font-bold text-white font-display"/g,
    'className={`text-3xl font-bold font-display ${theme === "light" ? "text-slate-900" : "text-white"}`}');

  content = content.replace(/className="text-lg font-bold font-display text-white"/g,
    'className={`text-lg font-bold font-display ${theme === "light" ? "text-slate-900" : "text-white"}`}');
  
  content = content.replace(/className="text-lg font-bold font-display text-white mb-6"/g,
    'className={`text-lg font-bold font-display mb-6 ${theme === "light" ? "text-slate-900" : "text-white"}`}');

  content = content.replace(/className="text-lg font-bold font-display text-white mb-6 animate-fade-in"/g,
    'className={`text-lg font-bold font-display mb-6 animate-fade-in ${theme === "light" ? "text-slate-900" : "text-white"}`}');

  content = content.replace(/className="text-lg font-bold font-display text-white mb-6 border-b border-slate-800 pb-3"/g,
    'className={`text-lg font-bold font-display mb-6 border-b pb-3 ${theme === "light" ? "text-slate-900 border-slate-200" : "text-white border-slate-800"}`}');

  content = content.replace(/className="text-xs font-bold text-white font-display truncate"/g,
    'className={`text-xs font-bold font-display truncate ${theme === "light" ? "text-slate-900" : "text-white"}`}');

  content = content.replace(/className="text-white font-semibold"/g,
    'className={`font-semibold ${theme === "light" ? "text-slate-900" : "text-white"}`}');

  content = content.replace(/className="text-sm font-bold text-white mb-1 font-display"/g,
    'className={`text-sm font-bold mb-1 font-display ${theme === "light" ? "text-slate-900" : "text-white"}`}');

  content = content.replace(/className={`font-bold hover:text-violet-400 transition block text-white \$\{u\.type === 'Royal VIP' \? 'text-violet-400' : ''\}`}/g,
    'className={`font-bold hover:text-violet-400 transition block ${theme === "light" ? "text-slate-900" : "text-white"} ${u.type === "Royal VIP" ? "text-violet-500" : ""}`}');

  // And replace hover:text-white tabs
  content = content.replace(/activeTab === 'users' \? 'text-violet-400' : 'text-slate-400 hover:text-white'/g,
    'activeTab === "users" ? "text-violet-500" : (theme === "light" ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white")');
  content = content.replace(/activeTab === 'payments' \? 'text-violet-400' : 'text-slate-400 hover:text-white'/g,
    'activeTab === "payments" ? "text-violet-500" : (theme === "light" ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white")');
  content = content.replace(/activeTab === 'reports' \? 'text-violet-400' : 'text-slate-400 hover:text-white'/g,
    'activeTab === "reports" ? "text-violet-500" : (theme === "light" ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white")');
  content = content.replace(/activeTab === 'content' \? 'text-violet-400' : 'text-slate-400 hover:text-white'/g,
    'activeTab === "content" ? "text-violet-500" : (theme === "light" ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white")');

  // bg-slate-950 border-slate-800 input
  content = content.replace(/className="w-12 py-0\.5 px-1 bg-slate-950 border border-slate-800 rounded text-center text-\[10px\] text-white"/g,
    'className={`w-12 py-0.5 px-1 rounded text-center text-[10px] border ${theme === "light" ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-slate-800 text-white"}`}'
  );

  fs.writeFileSync(file, content);
}

fixFile('src/components/AdminPanel.tsx');
