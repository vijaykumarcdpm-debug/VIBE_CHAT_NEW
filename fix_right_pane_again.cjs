const fs = require('fs');
let code = fs.readFileSync('src/components/ChatInterface.tsx', 'utf8');

const replacement = `              {!activePartner ? (
                chatState === 'idle' ? (
                  <div className="flex flex-col items-center justify-center h-full w-full opacity-60 space-y-4 pt-32 animate-fade-in">
                    <MessageSquare className="w-16 h-16 text-slate-400" />
                    <p className={\`text-sm font-medium \${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}\`}>
                      {sidebarTab === 'chat' ? 'Select a conversation to start chatting' : 'Select a person to start chatting'}
                    </p>
                  </div>
                ) : chatState === 'searching' ? (`

const originalStr = `              {!activePartner ? (
                chatState === 'idle' ? (
              <div className="py-12 text-center space-y-6 max-w-md mx-auto animate-fade-in text-left">
                <div className="relative">
                  <span className={\`flex items-center justify-center w-14 h-14 rounded-full text-2xl animate-bounce border \${
                    theme === 'light' ? 'bg-sky-50 border-sky-100 text-sky-600' : 'bg-violet-950/40 border-violet-500/20 text-violet-400'
                  }\`}>
                    👋
                  </span>
                </div>
                <div className="text-center">
                  <h4 className={\`font-bold text-base mb-2 font-display \${theme === 'light' ? 'text-slate-800' : 'text-white'}\`}>Welcome to VibeChat Space</h4>
                  <p className={\`text-xs leading-relaxed \${theme === 'light' ? 'text-slate-500' : 'text-slate-200'}\`}>
                    Connect instantly with online users around the world. No unnecessary popups, 100% fast matchmaking, secure socket line connections.
                  </p>
                </div>
                
                {/* Embedded matching filter indicators inside central screen preview */}
                <div className={\`w-full p-5 rounded-2xl text-left space-y-4 text-xs max-w-sm border transition \${
                  theme === 'light' 
                    ? 'bg-white border-slate-200 shadow-sm' 
                    : 'bg-slate-950/50 border-slate-800 shadow-black/20'
                }\`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">⚙️</span>
                    <h5 className={\`font-bold \${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}\`}>Advanced Partner Filters</h5>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-500 text-[8px] uppercase font-bold tracking-wider block mb-1">Gender</label>
                      <select 
                        value={genderFilter}
                        onChange={(e) => {
                          if (e.target.value !== 'None' && !isVIP) return;
                          setGenderFilter(e.target.value as any);
                        }}
                        disabled={!isVIP}
                        className={\`w-full p-2 text-xs rounded-lg focus:outline-none transition border \${
                          theme === 'light' 
                            ? 'bg-slate-50 border-slate-200 text-slate-800' 
                            : 'bg-slate-900/60 border-slate-800 text-white'
                        } \${!isVIP ? 'opacity-75 cursor-not-allowed' : ''}\`}
                      >
                        <option value="None">Any Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-500 text-[8px] uppercase font-bold tracking-wider block mb-1">Age</label>
                      <select 
                        value={ageFilter}
                        onChange={(e) => {
                          if (!isVIP) return;
                          setAgeFilter(e.target.value);
                        }}
                        disabled={!isVIP}
                        className={\`w-full p-2 text-xs rounded-lg focus:outline-none transition border \${
                          theme === 'light' 
                            ? 'bg-slate-50 border-slate-200 text-slate-800' 
                            : 'bg-slate-900/60 border-slate-800 text-white'
                        } \${!isVIP ? 'opacity-75 cursor-not-allowed' : ''}\`}
                      >
                        <option value="">Any Age</option>
                        <option value="10-20">10–20</option>
                        <option value="20-30">20–30</option>
                        <option value="30-40">30–40</option>
                        <option value="40-50">40–50</option>
                        <option value="50-60">50–60</option>
                        <option value="60-70">60–70</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-500 text-[8px] uppercase font-bold tracking-wider block mb-1">City</label>
                      <input 
                        type="text" 
                        placeholder={!isVIP ? "🔒 City (VIP Only)" : "e.g. Mumbai"}
                        value={cityFilter}
                        onClick={() => { if (!isVIP) { handleFilterClick('city'); } }}
                        onChange={(e) => {
                          if (!isVIP) return;
                          setCityFilter(e.target.value);
                        }}
                        disabled={!isVIP}
                        className={\`w-full p-2 text-xs rounded-lg focus:outline-none transition border \${
                          theme === 'light' 
                            ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400' 
                            : 'bg-slate-900/60 border-slate-800 text-white placeholder-slate-500'
                        } \${!isVIP ? 'opacity-75 cursor-not-allowed' : ''}\`}
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 text-[8px] uppercase font-bold tracking-wider block mb-1">State</label>
                      <input 
                        type="text" 
                        placeholder={!isVIP ? "🔒 State (VIP Only)" : "e.g. Karnataka"}
                        value={stateFilter}
                        onClick={() => { if (!isVIP) { handleFilterClick('state'); } }}
                        onChange={(e) => {
                          if (!isVIP) return;
                          setStateFilter(e.target.value);
                        }}
                        disabled={!isVIP}
                        className={\`w-full p-2 text-xs rounded-lg focus:outline-none transition border \${
                          theme === 'light' 
                            ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400' 
                            : 'bg-slate-900/60 border-slate-800 text-white'
                        } \${!isVIP ? 'opacity-75 cursor-not-allowed' : ''}\`}
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full pt-3 border-t border-slate-700/50">
                  <button
                    onClick={handleStartMatching}
                    disabled={isMatchingLoading}
                    className={\`w-full px-6 py-2.5 rounded-xl font-bold uppercase font-display tracking-wide text-xs shadow-lg duration-150 transition flex items-center justify-center gap-2 \${
                      isMatchingLoading 
                        ? 'bg-violet-500/50 text-white cursor-not-allowed'
                        : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white hover:scale-[1.01] shadow-violet-500/20'
                    }\`}
                  >
                    {isMatchingLoading ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                        Searching...
                      </>
                    ) : (
                      'Start Matching'
                    )}
                  </button>
                </div>
              </div>
                  ) : chatState === 'searching' ? (`

if (code.includes(originalStr)) {
  console.log("Original found. Replacing with placeholder.");
  fs.writeFileSync('src/components/ChatInterface.tsx', code.replace(originalStr, replacement));
} else if (code.includes(replacement)) {
  console.log("Placeholder found. It is already correct.");
} else {
  console.log("Neither found! Let's find out what's in the right pane idle state.");
}
