import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';

const indianCities = [
  'Agra','Ahmedabad','Allahabad','Amritsar','Aurangabad','Bengaluru','Bhopal','Bhubaneswar','Chandigarh','Chennai','Coimbatore','Cuttack','Dehradun','Delhi','Dhanbad','Durgapur','Faridabad','Gaya','Ghaziabad','Goa','Gurugram','Guwahati','Hubballi','Hyderabad','Indore','Jabalpur','Jaipur','Jamshedpur','Jodhpur','Kanpur','Kochi','Kolkata','Kota','Lucknow','Ludhiana','Mangaluru','Meerut','Mumbai','Mysuru','Nagpur','Nashik','Navi Mumbai','Noida','Patna','Pune','Rajkot','Ranchi','Rourkela','Salem','Siliguri','Srinagar','Surat','Thiruvananthapuram','Tiruchirappalli','Udaipur','Udupi','Vadodara','Varanasi','Vijayawada','Visakhapatnam'
];

const indianStates = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'
];

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
  const [matchNotice, setMatchNotice] = useState('');
  const [searchStatusIndex, setSearchStatusIndex] = useState(0);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const matchRetryTimeoutRef = useRef<number | null>(null);
  
  const isVIP = me.type === 'Royal VIP' || me.type === 'Admin' || me.type === 'Moderator';
  const isDarkMode = typeof window !== 'undefined' && localStorage.getItem('vibechat_theme') === 'dark';
  const searchStatusMessages = [
    'Searching for an available audio partner...',
    'Looking for the best match...',
    'Checking online users...',
    'Finding someone with your preferences...',
    'Almost there...',
    'Please wait...'
  ];

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

  const clearMatchRetryTimer = () => {
    if (matchRetryTimeoutRef.current !== null) {
      window.clearTimeout(matchRetryTimeoutRef.current);
      matchRetryTimeoutRef.current = null;
    }
  };

  const handleStartMatching = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (isMatchingLoading || chatState === 'searching') return;
    if (!isVIP && (genderFilter !== 'None' || ageFilter || cityFilter.trim() || stateFilter.trim())) {
      onTriggerVipPage();
      return;
    }

    clearMatchRetryTimer();
    setMatchNotice('');
    setSearchStatusIndex(0);
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
    clearMatchRetryTimer();
    setMatchNotice('');
    setSearchStatusIndex(0);
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
        const { event, data } = JSON.parse(e.data);
        if (event === 'match:stopped' || event === 'match:success' || event === 'match:call_start') {
           clearMatchRetryTimer();
           setMatchNotice('');
           setChatState('idle');
           setIsMatchingLoading(false);
        } else if (event === 'match:none') {
           clearMatchRetryTimer();
           const fallbackMessage = data?.message || 'No users are currently online. We\'ll automatically keep searching until someone joins.';
           setMatchNotice(fallbackMessage);
           setChatState('searching');
           setIsMatchingLoading(true);
           matchRetryTimeoutRef.current = window.setTimeout(() => {
             setMatchNotice('');
             handleStartMatching();
           }, 2000);
        }
      } catch (err) {}
    };
    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws]);

  useEffect(() => {
    if (!isMatchingLoading || chatState !== 'searching') return;

    const interval = window.setInterval(() => {
      setSearchStatusIndex((prev) => (prev + 1) % searchStatusMessages.length);
    }, 2200);

    return () => window.clearInterval(interval);
  }, [chatState, isMatchingLoading, searchStatusMessages.length]);

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
      clearMatchRetryTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (chatState === 'searching') handleCancelMatching();
    };
  }, [chatState, ws]);

  const filteredCities = indianCities.filter((city) => city.toLowerCase().includes(citySearch.toLowerCase()));
  const filteredStates = indianStates.filter((state) => state.toLowerCase().includes(stateSearch.toLowerCase()));
  const statusMessage = matchNotice || searchStatusMessages[searchStatusIndex] || 'Searching for an available audio partner...';
  const shellClassName = isDarkMode
    ? 'bg-slate-950/95 text-white border-violet-500/20 shadow-[0_0_70px_rgba(139,92,246,0.14)]'
    : 'bg-white/90 text-slate-800 border-violet-200/70 shadow-[0_0_50px_rgba(139,92,246,0.10)]';
  const panelClassName = isDarkMode
    ? 'border-slate-800/70 bg-slate-950/70 text-white'
    : 'border-slate-200/80 bg-white/80 text-slate-800';
  const inputClassName = isDarkMode
    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-violet-500'
    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-violet-500';

  return (
    <div className={`fixed inset-0 z-40 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 ${isDarkMode ? 'bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.22),_transparent_45%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#030712_100%)]' : 'bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.14),_transparent_45%),linear-gradient(135deg,_#f8f7ff_0%,_#f5f3ff_45%,_#eef2ff_100%)]'}`}>
      <div className={`relative w-full max-w-2xl mx-auto rounded-[2rem] border backdrop-blur-xl ${shellClassName}`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${isDarkMode ? 'from-violet-600/15 via-transparent to-indigo-600/10' : 'from-violet-500/10 via-transparent to-indigo-500/8'} pointer-events-none`} />
        <div className={`absolute -top-20 left-10 h-40 w-40 rounded-full ${isDarkMode ? 'bg-violet-500/20' : 'bg-violet-400/15'} blur-3xl`} />
        <div className={`absolute bottom-0 right-0 h-48 w-48 rounded-full ${isDarkMode ? 'bg-sky-500/10' : 'bg-sky-400/10'} blur-3xl`} />

        <button 
          onClick={() => {
            if (chatState === 'searching') handleCancelMatching();
            onExit();
          }}
          className={`absolute top-4 left-4 z-20 p-2 transition rounded-full ${isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800/80' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'}`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        <div className="relative z-10 px-5 sm:px-8 py-7 sm:py-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className={`relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border shadow-[0_0_25px_rgba(139,92,246,0.18)] ${isDarkMode ? 'border-violet-400/30 bg-violet-500/15' : 'border-violet-300/50 bg-violet-500/10'}`}>
              <span className={`absolute inset-2 rounded-full border animate-pulse ${isDarkMode ? 'border-violet-400/20' : 'border-violet-300/30'}`} />
              <span className="text-4xl">🛰️</span>
            </div>
            <h2 className={`text-2xl sm:text-3xl font-bold font-display tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Matching Room</h2>
            <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Find a stranger and start an audio call instantly.</p>
          </div>

          {chatState === 'searching' ? (
            <div className={`rounded-[1.75rem] border p-6 sm:p-8 text-center space-y-5 animate-fade-in relative ${panelClassName}`}>
              <div className={`absolute inset-0 ${isDarkMode ? 'bg-[radial-gradient(circle_at_center,_rgba(129,140,248,0.12),_transparent_70%)]' : 'bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.08),_transparent_70%)]'}`} />
              <div className="relative">
                <span className={`absolute -inset-6 rounded-full ${isDarkMode ? 'bg-violet-600/20' : 'bg-violet-400/15'} animate-ping`}></span>
                <span className={`absolute -inset-10 rounded-full ${isDarkMode ? 'bg-sky-400/10' : 'bg-sky-400/10'} animate-pulse`}></span>
                <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed animate-spin-slow shadow-[0_0_30px_rgba(139,92,246,0.12)] ${isDarkMode ? 'border-violet-500 bg-slate-950/80' : 'border-violet-400 bg-white/90'}`}>
                  <span className="text-3xl animate-bounce">🌍</span>
                </div>
              </div>

              <div className="relative space-y-2">
                <h4 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Searching for a match...</h4>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} animate-pulse`}>{statusMessage}</p>
              </div>

              <button
                onClick={handleCancelMatching}
                className="relative w-full px-6 py-3 bg-rose-600/90 hover:bg-rose-500 text-white font-bold rounded-xl text-sm uppercase tracking-wide transition shadow-lg shadow-rose-500/20"
              >
                Cancel Matching
              </button>
            </div>
          ) : (
            <div className="space-y-5 relative">
              <div className={`rounded-[1.5rem] border p-4 sm:p-5 space-y-4 shadow-inner ${panelClassName}`}>
                <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <span className={`text-xs font-bold uppercase tracking-[0.25em] flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span>🎯</span> Match Preferences
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`text-[10px] uppercase font-bold block mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Gender</label>
                    <select
                      value={genderFilter}
                      onChange={(e) => {
                        if (e.target.value !== 'None' && !isVIP) {
                          onTriggerVipPage();
                          return;
                        }
                        setGenderFilter(e.target.value as any);
                      }}
                      className={`w-full p-2.5 text-sm rounded-xl border focus:border-violet-500 focus:outline-none transition ${inputClassName}`}
                    >
                      <option value="None">Any</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className={`text-[10px] uppercase font-bold block mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Age Range</label>
                    <select
                      value={ageFilter}
                      onChange={(e) => {
                        if (e.target.value !== '' && !isVIP) {
                          onTriggerVipPage();
                          return;
                        }
                        setAgeFilter(e.target.value);
                      }}
                      className={`w-full p-2.5 text-sm rounded-xl border focus:border-violet-500 focus:outline-none transition ${inputClassName} ${!isVIP ? 'opacity-75' : ''}`}
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

                  <div>
                    <label className={`text-[10px] uppercase font-bold block mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      <span className="inline-flex items-center gap-1.5">
                        City 🔒 VIP ONLY
                      </span>
                    </label>
                    <div
                      className="relative"
                      onClick={() => {
                        if (!isVIP) {
                          onTriggerVipPage();
                          return;
                        }
                        setShowCityDropdown(true);
                        setCitySearch(cityFilter);
                      }}
                      onFocus={() => {
                        if (!isVIP) {
                          onTriggerVipPage();
                          return;
                        }
                        setShowCityDropdown(true);
                        setCitySearch(cityFilter);
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Any"
                        value={cityFilter}
                        onChange={(e) => {
                          if (!isVIP) return;
                          setCityFilter(e.target.value);
                          setCitySearch(e.target.value);
                          setShowCityDropdown(true);
                        }}
                        onBlur={() => window.setTimeout(() => setShowCityDropdown(false), 120)}
                        readOnly={!isVIP}
                        className={`w-full p-2.5 text-sm rounded-xl border focus:border-violet-500 focus:outline-none transition ${inputClassName} ${!isVIP ? 'opacity-75 cursor-not-allowed' : ''}`}
                      />
                      {showCityDropdown && isVIP && (
                        <div className={`absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border shadow-lg ${isDarkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800'}`}>
                          {filteredCities.length > 0 ? filteredCities.map((city) => (
                            <button
                              key={city}
                              type="button"
                              className={`block w-full px-3 py-2 text-left text-sm hover:bg-violet-500/10 ${isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'}`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setCityFilter(city);
                                setCitySearch(city);
                                setShowCityDropdown(false);
                              }}
                            >
                              {city}
                            </button>
                          )) : (
                            <div className="px-3 py-2 text-sm text-slate-500">No cities found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className={`text-[10px] uppercase font-bold block mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      <span className="inline-flex items-center gap-1.5">
                        State 🔒 VIP ONLY
                      </span>
                    </label>
                    <div
                      className="relative"
                      onClick={() => {
                        if (!isVIP) {
                          onTriggerVipPage();
                          return;
                        }
                        setShowStateDropdown(true);
                        setStateSearch(stateFilter);
                      }}
                      onFocus={() => {
                        if (!isVIP) {
                          onTriggerVipPage();
                          return;
                        }
                        setShowStateDropdown(true);
                        setStateSearch(stateFilter);
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Any"
                        value={stateFilter}
                        onChange={(e) => {
                          if (!isVIP) return;
                          setStateFilter(e.target.value);
                          setStateSearch(e.target.value);
                          setShowStateDropdown(true);
                        }}
                        onBlur={() => window.setTimeout(() => setShowStateDropdown(false), 120)}
                        readOnly={!isVIP}
                        className={`w-full p-2.5 text-sm rounded-xl border focus:border-violet-500 focus:outline-none transition ${inputClassName} ${!isVIP ? 'opacity-75 cursor-not-allowed' : ''}`}
                      />
                      {showStateDropdown && isVIP && (
                        <div className={`absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border shadow-lg ${isDarkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800'}`}>
                          {filteredStates.length > 0 ? filteredStates.map((state) => (
                            <button
                              key={state}
                              type="button"
                              className={`block w-full px-3 py-2 text-left text-sm hover:bg-violet-500/10 ${isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'}`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setStateFilter(state);
                                setStateSearch(state);
                                setShowStateDropdown(false);
                              }}
                            >
                              {state}
                            </button>
                          )) : (
                            <div className="px-3 py-2 text-sm text-slate-500">No states found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {matchNotice && (
                <p className={`text-sm text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{matchNotice}</p>
              )}

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
    </div>
  );
};

export default MatchingRoom;
