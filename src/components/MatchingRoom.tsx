import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';

interface MatchingRoomProps {
  ws: WebSocket | null;
  me: UserProfile;
  onExit: () => void;
  onTriggerVipPage: () => void;
}

const MatchingRoom: React.FC<MatchingRoomProps> = ({ ws, me, onExit, onTriggerVipPage }) => {
  const [chatState, setChatState] = useState<'idle' | 'searching'>('idle');
  const [genderFilter, setGenderFilter] = useState<'None' | 'Male' | 'Female' | 'Other'>('None');
  const [ageFilter, setAgeFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [isMatchingLoading, setIsMatchingLoading] = useState(false);
  
  const isVIP = me.type === 'Royal VIP' || me.type === 'Admin' || me.type === 'Moderator';

  useEffect(() => {
    // Load last filters
    const lastFiltersStr = localStorage.getItem('vibechat_last_match_filters');
    if (lastFiltersStr) {
      try {
        const lf = JSON.parse(lastFiltersStr);
        if (lf.gender) setGenderFilter(lf.gender);
        if (lf.age) setAgeFilter(lf.age);
        if (lf.city && isVIP) setCityFilter(lf.city);
        if (lf.state && isVIP) setStateFilter(lf.state);
      } catch (e) {
        // ignore
      }
    }
  }, [isVIP]);

  const handleStartMatching = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (isMatchingLoading || chatState === 'searching') return;
    if (!isVIP && (genderFilter !== 'None' || ageFilter || cityFilter.trim() || stateFilter.trim())) {
      onTriggerVipPage();
      return;
    }

    setIsMatchingLoading(true);

    const filters: any = {};
    if (genderFilter !== 'None') filters.gender = genderFilter;
    if (ageFilter) filters.age = ageFilter;
    if (cityFilter.trim()) filters.city = cityFilter.trim();
    if (stateFilter.trim()) filters.state = stateFilter.trim();

    localStorage.setItem('vibechat_last_match_filters', JSON.stringify(filters));

    try {
      ws.send(JSON.stringify({ event: 'match:start', data: { filters } }));
      setChatState('searching');
    } catch (err) {
      console.error('Failed to start matchmaking', err);
      setIsMatchingLoading(false);
    }
  };

  const handleCancelMatching = () => {
    setIsMatchingLoading(false);
    setChatState('idle');
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: 'match:cancel', data: {} }));
    }
  };

  useEffect(() => {
    if (!ws) return;
    const handleMessage = (e: MessageEvent) => {
      try {
        const { event } = JSON.parse(e.data);
        if (event === 'match:stopped' || event === 'match:none' || event === 'match:success' || event === 'match:call_start') {
           setChatState('idle');
           setIsMatchingLoading(false);
        }
      } catch (err) {}
    };
    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && chatState === 'searching') {
        handleCancelMatching();
      }
    };
    const handleBeforeUnload = () => {
      if (chatState === 'searching') handleCancelMatching();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (chatState === 'searching') handleCancelMatching();
    };
  }, [chatState, ws]);

  return (
    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-white z-40 px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        
        {/* Background Animation */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-indigo-600/5 pointer-events-none" />
        
        <button 
          onClick={() => {
            if (chatState === 'searching') handleCancelMatching();
            onExit();
          }}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white transition rounded-full hover:bg-slate-800"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        <div className="text-center mt-6 mb-8 relative z-10">
          <div className="w-20 h-20 mx-auto bg-violet-500/20 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">🛰️</span>
          </div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-white">Matching Room</h2>
          <p className="text-sm text-slate-400 mt-2">Find a stranger and start an audio call instantly.</p>
        </div>

        {chatState === 'searching' ? (
          <div className="py-8 text-center space-y-8 flex flex-col items-center animate-fade-in relative z-10">
            <div className="relative">
              <span className="absolute -inset-6 rounded-full bg-violet-600/20 animate-ping"></span>
              <span className="absolute -inset-10 rounded-full bg-sky-400/10 animate-pulse"></span>
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-violet-500 animate-spin-slow flex items-center justify-center bg-slate-950">
                <span className="text-3xl animate-bounce">🌍</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-bold text-lg text-white">Searching for a match...</h4>
              <p className="text-xs text-slate-400 animate-pulse">This might take a few moments</p>
            </div>
            
            <button
              onClick={handleCancelMatching}
              className="w-full px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm uppercase tracking-wide transition shadow-lg shadow-rose-500/20"
            >
              Cancel Matching
            </button>
          </div>
        ) : (
          <div className="space-y-6 relative z-10">
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span>🎯</span> Match Preferences
                </span>
                {!isVIP && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold uppercase">VIP Only</span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Gender</label>
                  <select
                    value={genderFilter}
                    onChange={(e) => {
                      if (e.target.value !== 'None' && !isVIP) {
                        onTriggerVipPage();
                        return;
                      }
                      setGenderFilter(e.target.value as any);
                    }}
                    className="w-full p-2.5 text-sm rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-violet-500 focus:outline-none transition"
                  >
                    <option value="None">Any</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Age Range</label>
                  <select
                    value={ageFilter}
                    onChange={(e) => {
                      if (e.target.value !== '' && !isVIP) {
                        onTriggerVipPage();
                        return;
                      }
                      setAgeFilter(e.target.value);
                    }}
                    className={`w-full p-2.5 text-sm rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-violet-500 focus:outline-none transition ${!isVIP ? 'opacity-75' : ''}`}
                  >
                    <option value="">Any</option>
                    <option value="10-20">10-20</option>
                    <option value="20-30">20-30</option>
                    <option value="30-40">30-40</option>
                    <option value="40-50">40-50</option>
                    <option value="50-60">50-60</option>
                    <option value="60-70">60-70</option>
                  </select>
                </div>
              </div>

              {isVIP && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">City</label>
                    <input
                      type="text"
                      placeholder="Any"
                      value={cityFilter}
                      onChange={(e) => setCityFilter(e.target.value)}
                      className="w-full p-2.5 text-sm rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-violet-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">State</label>
                    <input
                      type="text"
                      placeholder="Any"
                      value={stateFilter}
                      onChange={(e) => setStateFilter(e.target.value)}
                      className="w-full p-2.5 text-sm rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-violet-500 focus:outline-none transition"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleStartMatching}
              disabled={isMatchingLoading}
              className="w-full py-3.5 rounded-xl font-bold uppercase tracking-wide text-sm shadow-xl transition-all duration-300 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white hover:scale-[1.02] shadow-violet-500/20 active:scale-95 flex items-center justify-center"
            >
              Start Matching
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchingRoom;
