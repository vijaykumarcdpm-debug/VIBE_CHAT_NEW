import React, { useState, useEffect } from 'react';
import { SystemStats } from '../types';
import { getRandomAvatar } from '../lib/avatars';
import { 
  Users, 
  Sparkles, 
  Tv, 
  Lock, 
  UserPlus, 
  CheckCircle,
  HelpCircle,
  Info,
  ExternalLink,
  ShieldAlert,
  Moon,
  Sun,
  MessageSquare,
  Shield,
  Phone,
  Video,
  Compass,
  MapPin,
  Camera,
  Palette
} from 'lucide-react';

interface HomePageProps {
  onGuestLogin: (userName: string, gender: 'Male' | 'Female' | 'Other', age?: number, profilePic?: string) => void;
  onMemberLogin: (credentials: { identifier: string; passwordPlain: string }) => Promise<void>;
  onMemberRegister: (payload: any) => Promise<void>;
  onAdminAccess: () => void;
  onAutoLogin: (types: string[]) => boolean;
  stats: SystemStats | null;
  announcement?: string;
  detectedGeo: { city: string; state: string; country: string };
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onRejoin?: () => void;
}

export function VibeChatLogo({ className = 'w-12 h-12', idPrefix = 'vibe' }: { className?: string, idPrefix?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Concentric Modern Social Connection Rings */}
      <circle cx="50" cy="40" r="28" stroke={`url(#${idPrefix}Grad1)`} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
      <circle cx="50" cy="40" r="22" stroke={`url(#${idPrefix}Grad2)`} strokeWidth="2.5" opacity="0.8" />
      <circle cx="50" cy="40" r="16" stroke="#06B6D4" strokeWidth="2" opacity="0.4" />
      
      {/* Social Connection Dots */}
      <circle cx="50" cy="18" r="4.5" fill="#8B5CF6" className="animate-pulse" />
      <circle cx="28" cy="40" r="3.5" fill="#3B82F6" />
      <circle cx="72" cy="40" r="3.5" fill="#06B6D4" />
      
      {/* Geolocation Pin Head & Modern V Body */}
      <path 
        d="M26 34 L50 78 L74 34 Q74 24 64 24 L50 24 L36 24 Q26 24 26 34 Z" 
        fill={`url(#${idPrefix}Grad1)`} 
        opacity="0.15"
      />
      <path 
        d="M32 30 L50 72 L68 30" 
        stroke={`url(#${idPrefix}Grad1)`} 
        strokeWidth="7" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M38 32 L50 64 L62 32" 
        stroke={`url(#${idPrefix}Grad2)`} 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Geolocation central connection node */}
      <circle cx="50" cy="40" r="6" fill="#fff" className="shadow-lg" />
      <circle cx="50" cy="40" r="3" fill="#06B6D4" />

      {/* Pin-point anchoring drop-shadow effect */}
      <ellipse cx="50" cy="78" rx="7" ry="1.5" fill="#06B6D4" opacity="0.75" />

      <defs>
        <linearGradient id={`${idPrefix}Grad1`} x1="0" y1="0" x2="100" y2="100">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id={`${idPrefix}Grad2`} x1="100" y1="0" x2="0" y2="100">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function HomePage({
  onGuestLogin,
  onMemberLogin,
  onMemberRegister,
  onAdminAccess,
  onAutoLogin,
  stats,
  announcement,
  detectedGeo,
  theme,
  onToggleTheme,
  onRejoin
}: HomePageProps) {
  const rejoinToken = typeof window !== 'undefined' ? localStorage.getItem('vibechat_rejoin_token') : null;
  const rejoinUsername = typeof window !== 'undefined' ? localStorage.getItem('vibechat_rejoin_username') : null;
  const rejoinType = typeof window !== 'undefined' ? localStorage.getItem('vibechat_rejoin_type') : null;
  // Views: 'none' | 'guest' | 'login' | 'register'
  const [authView, setAuthView] = useState<'none' | 'guest' | 'login' | 'register'>('none');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPhotoVerificationUI, setShowPhotoVerificationUI] = useState<boolean>(false);
  const [humanVerificationPic, setHumanVerificationPic] = useState<string>('');

  // Guest inputs
  const [guestName, setGuestName] = useState<string>('');
  const [guestGender, setGuestGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [guestAge, setGuestAge] = useState<string>('');
  const [agreeRules, setAgreeRules] = useState<boolean>(true);

  // Login inputs
  const [loginId, setLoginId] = useState<string>('');
  const [loginPass, setLoginPass] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  // Register inputs
  const [regUser, setRegUser] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPass, setRegPass] = useState<string>('');
  const [regConfirmPass, setRegConfirmPass] = useState<string>('');
  const [regAge, setRegAge] = useState<string>('');
  const [regGender, setRegGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [regDob, setRegDob] = useState<string>('');
  const [regPic, setRegPic] = useState<string>('');

  // Email verification states
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [otpVerified, setOtpVerified] = useState<boolean>(false);
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  const [simulatedOtp, setSimulatedOtp] = useState<string>('');

  // Forgot password inputs
  const [showForgotForm, setShowForgotForm] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotPassResult, setForgotPassResult] = useState<string>('');

  const [guestPic, setGuestPic] = useState<string>('');

  // Automatically select random male or female default avatar immediately after gender selection
  useEffect(() => {
    const ava = getRandomAvatar(guestGender);
    setGuestPic(ava);
  }, [guestGender]);

  useEffect(() => {
    const ava = getRandomAvatar(regGender);
    setRegPic(ava);
  }, [regGender]);

  const handleSendOtp = async () => {
    if (!regEmail.trim()) {
      setErrorMessage('Please enter a valid email address first.');
      return;
    }
    setOtpLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch verification OTP');
      setOtpSent(true);
      setSimulatedOtp(data.otp);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!enteredOtp.trim()) {
      setErrorMessage('Please enter the 4-digit verification code.');
      return;
    }
    setOtpLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail.trim(), otp: enteredOtp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOtpVerified(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP Verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setForgotPassResult('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForgotPassResult(data.tempPass);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      setErrorMessage('Nickname is required.');
      return;
    }
    if (!guestAge.trim()) {
      setErrorMessage('Age is required.');
      return;
    }
    const ageNum = Number(guestAge);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
      setErrorMessage('Please enter a valid age of 18 or above.');
      return;
    }
    if (!agreeRules) {
      setErrorMessage('You must agree to the community rules to start a vibe session.');
      return;
    }
    setErrorMessage('');
    onGuestLogin(guestName.trim(), guestGender, ageNum, guestPic);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !loginPass) {
      setErrorMessage('Identification and Password fields required.');
      return;
    }
    setErrorMessage('');
    setLoading(true);
    try {
      await onMemberLogin({ identifier: loginId, passwordPlain: loginPass });
    } catch (err: any) {
      if (err.message && err.message.includes('You have been banned')) {
        window.alert(err.message);
      } else {
        setErrorMessage(err.message || 'Authorization failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUser.trim() || !regEmail.trim() || !regPass || !regConfirmPass || !regAge.trim() || !regGender) {
      setErrorMessage('All registration inputs are required.');
      return;
    }
    if (regPass !== regConfirmPass) {
      setErrorMessage('Verification failed: Confirm password does not match.');
      return;
    }
    const ageNum = Number(regAge);
    if (isNaN(ageNum) || ageNum < 18) {
      setErrorMessage('You must be 18 years of age or older to register.');
      return;
    }
    if (!otpVerified) {
      setErrorMessage('Please complete your email verification via the 4-digit OTP code.');
      return;
    }
    if (!humanVerificationPic) {
      setErrorMessage('');
      setShowPhotoVerificationUI(true);
      return;
    }
    
    setErrorMessage('');
    setLoading(true);
    try {
      await onMemberRegister({
        username: regUser.trim(),
        email: regEmail.trim(),
        password: regPass,
        age: ageNum,
        gender: regGender,
        dateOfBirth: regDob || undefined,
        profilePic: regPic || undefined,
        city: detectedGeo.city,
        state: detectedGeo.state,
        country: detectedGeo.country,
        otpVerified: true,
        photoVerified: true, // Set verified to true
        humanVerificationPic: humanVerificationPic
      });
      if (rememberMe) {
        localStorage.setItem(`vibechat_remember_email_${regUser.trim()}`, 'true');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('You have been banned')) {
        window.alert(err.message);
      } else {
        setErrorMessage(err.message || 'Signup failed. Username/Email might be taken.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPic = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setRegPic(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`relative h-full w-full overflow-y-auto overflow-x-hidden transition-colors duration-300 flex flex-col justify-between ${
      theme === 'light' ? 'bg-slate-50 text-slate-800' : 'bg-[#0F172A] text-slate-100'
    }`}>
      
      {/* Decorative Atmosphere Gradients */}
      {theme === 'dark' && (
        <>
          <div className="hidden md:block absolute top-0 -right-20 w-[500px] h-[500px] bg-gradient-to-tr from-violet-600/10 via-indigo-500/10 to-transparent blur-[120px] rounded-full pointer-events-none overflow-hidden"></div>
          <div className="hidden md:block absolute bottom-0 -left-20 w-[500px] h-[500px] bg-gradient-to-bl from-cyan-500/5 via-violet-500/10 to-transparent blur-[120px] rounded-full pointer-events-none overflow-hidden"></div>
        </>
      )}

      {/* Navbar Header */}
      <header className={`border-b h-20 flex items-center relative z-10 transition-colors duration-300 ${
        theme === 'light' ? 'border-slate-200 bg-white/85' : 'border-slate-800/60 bg-slate-900/40'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 shrink-0 mt-1">
            <VibeChatLogo className="w-8 h-8 sm:w-10 sm:h-10" idPrefix="hp-header" />
            <div className="block">
              <span className={`text-lg sm:text-xl font-bold font-display tracking-tight block leading-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>VibeChat</span>
              <span className={`text-[8px] sm:text-[10px] font-bold leading-none block ${theme === 'light' ? 'text-blue-600' : 'text-indigo-400'}`}>WHERE STRANGERS MEET</span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-4 shrink-0">
            {/* Day / Night toggle switch */}
            <button
              onClick={onToggleTheme}
              className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer flex items-center justify-center ${
                theme === 'light' 
                  ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600' 
                  : 'bg-slate-800/40 hover:bg-slate-800 border-slate-700/50 text-stone-300'
              }`}
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button
              onClick={() => { setAuthView('login'); setErrorMessage(''); }}
              className={`px-2 py-1.5 sm:px-4 sm:py-2 border rounded-xl text-[10px] sm:text-xs font-semibold transition cursor-pointer ${
                theme === 'light'
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  : 'bg-slate-800/40 hover:bg-slate-800 border-slate-700/50 text-stone-300 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setAuthView('register'); setErrorMessage(''); }}
              className={`px-2 py-1.5 sm:px-4 sm:py-2 text-white rounded-xl text-[10px] sm:text-xs font-bold transition shadow-lg cursor-pointer ${
                theme === 'light'
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/10'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 shadow-violet-500/15'
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* GLOBAL ANNOUNCEMENTS SCROLL BAR */}
      {announcement && (
        <div className={`border-b ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-gradient-to-r from-violet-950/40 via-violet-900/10 to-transparent border-violet-500/20'}`}>
          <div className="max-w-7xl mx-auto px-6 py-2.5 overflow-hidden flex items-center gap-3">
            <span className={`shrink-0 scale-95 uppercase text-[9px] font-extrabold tracking-widest px-2.5 py-0.5 rounded-full font-display animate-pulse ${
              theme === 'light' ? 'bg-blue-600/10 border border-blue-500/20 text-blue-600' : 'bg-violet-600/20 border border-violet-500/20 text-violet-400 glow-purple'
            }`}>Platform Announcement</span>
            <div className={`relative flex overflow-x-hidden text-xs select-none font-semibold truncate flex-grow ${
              theme === 'light' ? 'text-slate-700' : 'text-violet-300'
            }`}>
              <div className="animate-marquee whitespace-nowrap">
                {announcement}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Core Viewport */}
      <main className="max-w-7xl mx-auto px-6 py-12 md:py-16 relative z-10 w-full flex-grow flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Splash Intro */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider font-display border ${
                theme === 'light' 
                  ? 'bg-blue-50 border-blue-100 text-blue-600' 
                  : 'bg-violet-500/10 border-violet-500/20 text-violet-400'
              }`}>
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>Modern Stranger Connect</span>
              </span>
              
              <h1 className={`text-4xl sm:text-5xl md:text-6xl font-extrabold font-display leading-[1.1] tracking-tight ${
                theme === 'light' ? 'text-slate-900' : 'text-white'
              }`}>
                Meet New People. <br />
                <span className={`bg-clip-text text-transparent bg-gradient-to-r ${
                  theme === 'light' ? 'from-blue-600 via-indigo-500 to-sky-500' : 'from-violet-400 via-indigo-400 to-cyan-400'
                }`}>
                  Share Your Vibe.
                </span>
              </h1>
              
              <p className={`text-sm sm:text-base leading-relaxed max-w-lg ${
                theme === 'light' ? 'text-slate-600' : 'text-slate-400'
              }`}>
                Discover a secure, premium space where random stranger conversations transform into long-term connections. Join instant audio, high-definition video, or responsive text chats immediately without clutter.
              </p>
            </div>

            {/* LIVE Statistics Panel from active sockets (Real online values) */}
            <div className={`border rounded-2xl p-6 backdrop-blur space-y-4 max-w-xl transition-colors duration-300 ${
              theme === 'light' ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900/60 border-slate-800/80 shadow-2xl shadow-slate-950/20'
            }`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider font-display flex items-center gap-2 ${
                theme === 'light' ? 'text-blue-600' : 'text-indigo-400'
              }`}>
                <Users className="w-4 h-4" /> Live Platform Statistics
              </h3>
              
              <div className="grid grid-cols-3 gap-4 pt-1">
                <div className={`p-4 border rounded-xl space-y-1 ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                }`}>
                  <span className="text-[10px] text-slate-500 block uppercase font-display font-bold">🟢 Online Users</span>
                  <span className={`text-2xl font-bold font-mono ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{stats?.totalOnline || 0}</span>
                </div>
                <div className={`p-4 border rounded-xl space-y-1 ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                }`}>
                  <span className="text-[10px] text-slate-500 block uppercase font-display font-bold">👦 Male Users</span>
                  <span className={`text-2xl font-bold font-mono ${theme === 'light' ? 'text-blue-600' : 'text-violet-400'}`}>{stats?.maleOnline || 0}</span>
                </div>
                <div className={`p-4 border rounded-xl space-y-1 ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                }`}>
                  <span className="text-[10px] text-slate-500 block uppercase font-display font-bold">👧 Female Users</span>
                  <span className={`text-2xl font-bold font-mono ${theme === 'light' ? 'text-pink-600' : 'text-cyan-400'}`}>{stats?.femaleOnline || 0}</span>
                </div>
              </div>

              <div className="pt-2 text-[10px] text-slate-500 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Real-time active tracking derived from secure server socket connections.
              </div>
            </div>
          </div>

          {/* Right Column: Interaction Onboarding Box */}
          <div className="lg:col-span-5 relative">
            <div className={`border p-8 rounded-3xl shadow-2xl transition-all duration-300 relative z-10 ${
              theme === 'light' ? 'bg-white border-slate-200 shadow-slate-200/55' : 'bg-slate-900 border-slate-800'
            }`}>
              
              {errorMessage && (
                <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
                  {errorMessage}
                </div>
              )}

               <div className="space-y-4 pt-1.5 animate-fade-in">
                <div className="text-center">
                  <h2 className={`text-2xl font-bold font-display mb-1 tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Join VibeChat Gateway</h2>
                  <p className="text-xs text-slate-500">Select an entrance gateway to access the stranger lounge</p>
                </div>

                {rejoinToken && rejoinUsername && (
                  <div className="p-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 animate-pulse-slow space-y-2 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">⚡ One-Click Instant Rejoin</span>
                      <span className="text-[9px] bg-indigo-500/20 px-2 py-0.5 rounded-full font-bold text-indigo-300 uppercase">{rejoinType}</span>
                    </div>
                    <p className={`text-xs ${theme === 'light' ? 'text-slate-750' : 'text-slate-300'}`}>
                      Welcome back! Would you like to instantly rejoin as <span className="font-extrabold text-indigo-400">{rejoinUsername}</span>?
                    </p>
                    <button 
                      type="button"
                      onClick={() => onRejoin && onRejoin()}
                      className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs transition duration-300 shadow-md cursor-pointer transform active:scale-95"
                    >
                      Connect Lobby Safely
                    </button>
                  </div>
                )}

                  <div className="grid grid-cols-1 gap-5 pt-4">
                    {/* Guest access card gateway */}
                    <div 
                      onClick={() => { 
                        setAuthView('guest'); setErrorMessage(''); 
                      }}
                      className={`group p-6 sm:p-7 rounded-3xl border-2 transition-all duration-300 cursor-pointer flex items-center gap-5 sm:gap-6 hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-2xl ${
                        theme === 'light'
                          ? 'bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/50 border-indigo-200/60 hover:border-indigo-400 shadow-indigo-500/10'
                          : 'bg-gradient-to-br from-[#1a2340] to-[#111524] border-slate-700/80 hover:border-violet-500/80 shadow-violet-500/10 relative overflow-hidden'
                      }`}
                    >
                      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${
                        theme === 'light'
                          ? 'bg-white border-indigo-100 text-indigo-600 shadow-sm'
                          : 'bg-slate-800 border-slate-700 text-violet-400 group-hover:bg-violet-900/40 group-hover:border-violet-500'
                      }`}>
                        <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-violet-500 group-hover:animate-pulse" />
                      </div>
                      <div className="flex-grow z-10">
                        <span className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-violet-500 block mb-1">Instant Access</span>
                        <h4 className={`font-black text-lg sm:text-xl tracking-tight font-display mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>GUEST SECURE DOOR</h4>
                        <p className={`text-xs sm:text-[13px] leading-relaxed font-medium ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Jump completely into stranger chat instantly. No password required.</p>
                      </div>
                    </div>

                    {/* Login account card gateway */}
                    <div 
                      onClick={() => { 
                        setAuthView('login'); setErrorMessage(''); 
                      }}
                      className={`group p-6 sm:p-7 rounded-3xl border-2 transition-all duration-300 cursor-pointer flex items-center gap-5 sm:gap-6 hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-2xl ${
                        theme === 'light'
                          ? 'bg-gradient-to-br from-blue-50/80 via-white to-sky-50/50 border-blue-200/60 hover:border-blue-400 shadow-blue-500/10'
                          : 'bg-gradient-to-br from-[#131b34] to-[#0e1220] border-slate-700/80 hover:border-blue-500/80 shadow-blue-500/10 relative overflow-hidden'
                      }`}
                    >
                      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6 ${
                        theme === 'light'
                          ? 'bg-white border-blue-100 text-blue-600 shadow-sm'
                          : 'bg-slate-800 border-slate-700 text-blue-400 group-hover:bg-blue-900/40 group-hover:border-blue-500'
                      }`}>
                        <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" />
                      </div>
                      <div className="flex-grow z-10">
                        <span className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-blue-500 block mb-1">Registered Members</span>
                        <h4 className={`font-black text-lg sm:text-xl tracking-tight font-display mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>MEMBER SECURE LOGIN</h4>
                        <p className={`text-xs sm:text-[13px] leading-relaxed font-medium ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Authenticate using your registered credentials to resume your data.</p>
                      </div>
                    </div>

                    {/* Register account card gateway */}
                    <div 
                      onClick={() => { setAuthView('register'); setErrorMessage(''); }}
                      className={`group p-6 sm:p-7 rounded-3xl border-2 transition-all duration-300 cursor-pointer flex items-center gap-5 sm:gap-6 hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-2xl ${
                        theme === 'light'
                          ? 'bg-gradient-to-br from-cyan-50/80 via-white to-emerald-50/50 border-cyan-200/60 hover:border-cyan-400 shadow-cyan-500/10'
                          : 'bg-gradient-to-br from-[#0e1e35] to-[#09111c] border-slate-700/80 hover:border-cyan-500/80 shadow-cyan-500/10 relative overflow-hidden'
                      }`}
                    >
                      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${
                        theme === 'light'
                          ? 'bg-white border-cyan-100 text-cyan-600 shadow-sm'
                          : 'bg-slate-800 border-slate-700 text-cyan-400 group-hover:bg-cyan-900/40 group-hover:border-cyan-500'
                      }`}>
                        <UserPlus className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-500" />
                      </div>
                      <div className="flex-grow z-10">
                        <span className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-cyan-500 block mb-1">Unlock VIP Perks</span>
                        <h4 className={`font-black text-lg sm:text-xl tracking-tight font-display mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>REGISTER NEW PROFILE</h4>
                        <p className={`text-xs sm:text-[13px] leading-relaxed font-medium ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Enjoy advanced region matching, custom photos & ranking benefits.</p>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Auth Modals */}
              {authView !== 'none' && (
                <div 
                  className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in" 
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setAuthView('none');
                    }
                  }}
                >
                  <div 
                    className={`w-full max-w-md rounded-3xl p-6 relative overflow-y-auto max-h-[90vh] shadow-2xl border ${
                      theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Guest Login Form */}
              {authView === 'guest' && (
                <form onSubmit={handleGuestSubmit} className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className={`font-bold text-base font-display ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Configure Guest Access</h3>
                    <button type="button" onClick={() => setAuthView('none')} className={`text-xs transition ${theme === 'light' ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>✕ Cancel</button>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 font-display ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Enter Your Nickname</label>
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Choose a screen nickname"
                        className={`w-full p-2.5 text-xs rounded-xl outline-none border transition ${
                          theme === 'light'
                            ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            : 'bg-slate-950 border-slate-800 text-white focus:border-violet-500'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 font-display ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Age</label>
                        <input
                          type="number"
                          required
                          min="18"
                          max="120"
                          value={guestAge}
                          onChange={(e) => setGuestAge(e.target.value)}
                          placeholder="Age (Must be >= 18)"
                          className={`w-full p-2.5 text-xs rounded-xl outline-none border transition ${
                            theme === 'light'
                              ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
                              : 'bg-slate-950 border-slate-800 text-white focus:border-violet-500'
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 font-display ${theme === 'light' ? 'text-slate-650' : 'text-slate-400'}`}>Gender Identity</label>
                        <select
                          required
                          value={guestGender}
                          onChange={(e) => setGuestGender(e.target.value as any)}
                          className={`w-full p-2.5 text-xs rounded-xl outline-none border transition cursor-pointer ${
                            theme === 'light'
                              ? 'bg-slate-50 border-slate-200 text-slate-852 focus:border-blue-500'
                              : 'bg-slate-950 border-slate-800 text-slate-300 focus:border-violet-500'
                          }`}
                        >
                          <option value="Male">Male 👦</option>
                          <option value="Female">Female 👧</option>
                          <option value="Other">Other 🌈</option>
                        </select>
                      </div>
                    </div>

                    {/* Live Default Avatar Preview */}
                    {guestPic && (
                      <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 animate-fade-in">
                        <img 
                          src={guestPic} 
                          alt="Pre-allocated Guest Avatar" 
                          className="w-12 h-12 rounded-full border-2 border-indigo-500/30 object-cover"
                        />
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">Vibe Avatar Allocated</span>
                          <span className="text-[9px] text-slate-500 block">Personalised default avatar assigned immediately!</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="agree-checkbox"
                        checked={agreeRules}
                        onChange={(e) => setAgreeRules(e.target.checked)}
                        className="mt-0.5 rounded text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                      <label htmlFor="agree-checkbox" className={`text-[10px] leading-snug cursor-pointer select-none ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                        I represent that I am 18+ and agree to the platform's safe community guidelines.
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-3 mt-1.5 text-white font-bold font-display tracking-wider text-xs rounded-xl transition cursor-pointer ${
                      theme === 'light'
                        ? 'bg-blue-600 hover:bg-blue-600 shadow-md'
                        : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 shadow-violet-600/15'
                    }`}
                  >
                    Enter as a guest
                  </button>
                </form>
              )}

              {/* Login Account Form */}
              {authView === 'login' && (
                <div className="animate-fade-in">
                  {!showForgotForm ? (
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className={`font-bold text-base font-display ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Member Authentication</h3>
                        <button type="button" onClick={() => setAuthView('none')} className={`text-xs transition ${theme === 'light' ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>✕ Close</button>
                      </div>

                      <div className="space-y-3.5">
                        <div>
                          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 font-display ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Username or Email</label>
                          <input
                            type="text"
                            required
                            value={loginId}
                            onChange={(e) => setLoginId(e.target.value)}
                            placeholder="Your registered handle or email address"
                            className={`w-full p-2.5 text-xs rounded-xl outline-none border transition ${
                              theme === 'light'
                                ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                                : 'bg-slate-950 border-slate-800 text-white focus:border-violet-500'
                            }`}
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className={`block text-[9px] font-bold uppercase tracking-wider font-display ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Secret Password</label>
                            <button
                              type="button"
                              onClick={() => { setShowForgotForm(true); setErrorMessage(''); setForgotPassResult(''); }}
                              className={`text-[9px] font-bold uppercase tracking-wider transition hover:underline cursor-pointer ${theme === 'light' ? 'text-blue-600' : 'text-violet-400'}`}
                            >
                              Forgot Password?
                            </button>
                          </div>
                          <input
                            type="password"
                            required
                            value={loginPass}
                            onChange={(e) => setLoginPass(e.target.value)}
                            placeholder="••••••••"
                            className={`w-full p-2.5 text-xs rounded-xl outline-none border transition ${
                              theme === 'light'
                                ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                                : 'bg-slate-950 border-slate-800 text-white focus:border-violet-500'
                            }`}
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-0.5">
                          <input
                            type="checkbox"
                            id="remember-login-checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="rounded text-violet-600 focus:ring-violet-500 cursor-pointer"
                          />
                          <label htmlFor="remember-login-checkbox" className={`text-[10px] font-medium leading-none cursor-pointer select-none ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                            Remember Me on this device
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 text-white font-bold font-display rounded-xl text-xs tracking-wider uppercase transition cursor-pointer mt-4 ${
                          theme === 'light'
                            ? 'bg-blue-600 hover:bg-blue-500 shadow shadow-blue-500/10'
                            : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 shadow shadow-violet-500/10'
                        }`}
                      >
                        {loading ? 'Validating Credentials...' : 'Secure Account Login'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className={`font-bold text-base font-display ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Password Recovery</h3>
                        <button type="button" onClick={() => { setShowForgotForm(false); setErrorMessage(''); }} className={`text-xs transition ${theme === 'light' ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400'}`}>✕ Return</button>
                      </div>

                      <p className={`text-[11px] leading-relaxed ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                        Enter your registered account profile email address to recover your credentials instantly.
                      </p>

                      <div className="space-y-3">
                        <div>
                          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 font-display ${theme === 'light' ? 'text-slate-650' : 'text-slate-400'}`}>Email Address</label>
                          <input
                            type="email"
                            required
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="registered@email.com"
                            className={`w-full p-2.5 text-xs rounded-xl outline-none border transition ${
                              theme === 'light'
                                ? 'bg-slate-50 border-slate-200 focus:border-blue-500'
                                : 'bg-slate-950 border-slate-800 text-white focus:border-violet-500'
                            }`}
                          />
                        </div>

                        {forgotPassResult && (
                          <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/25 rounded-xl space-y-1 text-center">
                            <span className="text-[10px] text-emerald-400 block font-semibold uppercase tracking-wider">Simulated Reset Password Received!</span>
                            <span className="text-sm font-mono font-bold text-white tracking-widest">{forgotPassResult}</span>
                            <p className="text-[9px] text-slate-400">Copy this temporary password and use it to log in now.</p>
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 text-white font-bold font-display rounded-xl text-xs tracking-wider uppercase transition cursor-pointer ${
                          theme === 'light' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-violet-600 hover:bg-violet-500'
                        }`}
                      >
                        {loading ? 'Resetting credentials...' : 'Reset Secret Password'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Register Account Form */}
              {authView === 'register' && !showPhotoVerificationUI && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3 animate-fade-in">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className={`font-bold text-base font-display ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Register Profile Handle</h3>
                    <button type="button" onClick={() => setAuthView('none')} className={`text-xs transition ${theme === 'light' ? 'text-slate-500 hover:text-slate-950' : 'text-slate-400 hover:text-white'}`}>✕ Close</button>
                  </div>

                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    <div>
                      <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 font-display ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Username</label>
                      <input
                        type="text"
                        required
                        value={regUser}
                        onChange={(e) => setRegUser(e.target.value)}
                        placeholder="Choose unique username"
                        maxLength={15}
                        className={`w-full p-2.5 text-xs rounded-xl outline-none border transition ${
                          theme === 'light'
                            ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
                            : 'bg-slate-950 border-slate-800 text-white focus:border-violet-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 font-display ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Email Address</label>
                      <div className="flex gap-1.5">
                        <input
                          type="email"
                          required
                          value={regEmail}
                          disabled={otpSent && otpVerified}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="you@email.com"
                          className={`flex-grow p-2.5 text-xs rounded-xl outline-none border transition ${
                            theme === 'light'
                              ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
                              : 'bg-slate-950 border-slate-800 text-white focus:border-violet-500'
                          }`}
                        />
                        <button
                          type="button"
                          disabled={otpLoading || !regEmail || otpVerified}
                          onClick={handleSendOtp}
                          className={`px-3 py-1 text-[10px] font-bold rounded-xl transition border shrink-0 cursor-pointer ${
                            otpVerified 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : (theme === 'light'
                                ? 'bg-blue-50 hover:bg-blue-100/50 text-blue-600 border-blue-200'
                                : 'bg-violet-950/40 hover:bg-violet-900 border-violet-800 text-violet-400')
                          }`}
                        >
                          {otpVerified ? 'Verified ✔' : (otpSent ? 'Resend OTP' : 'Send OTP')}
                        </button>
                      </div>

                      {otpSent && !otpVerified && (
                        <div className="mt-2 p-2.5 rounded-xl border space-y-2 animate-fade-in bg-slate-950/40 border-slate-800">
                          <span className="text-[9.5px] text-amber-400 font-semibold uppercase tracking-wider font-display flex items-center gap-1">
                            ⚠️ SIMULATED EMAIL KEY DISPATCHED: <b>{simulatedOtp}</b>
                          </span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={4}
                              placeholder="Enter OTP"
                              value={enteredOtp}
                              onChange={(e) => setEnteredOtp(e.target.value)}
                              className={`w-1/2 p-2 text-xs font-mono font-bold tracking-widest text-center rounded-lg border ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-900 border-slate-800 text-white"}`}
                            />
                            <button
                              type="button"
                              onClick={handleVerifyOtp}
                              className="w-1/2 px-2.5 py-2 bg-violet-600 hover:bg-violet-600 text-white font-bold text-[10px] rounded-lg tracking-wider cursor-pointer"
                            >
                              Verify Code
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 font-display ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Secret Password</label>
                        <input
                          type="password"
                          required
                          value={regPass}
                          onChange={(e) => setRegPass(e.target.value)}
                          placeholder="••••••••"
                          className={`w-full p-2.5 text-xs rounded-xl outline-none border transition ${
                            theme === 'light'
                              ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
                              : 'bg-slate-950 border-slate-800 text-white focus:border-violet-500'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 font-display ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Confirm Password</label>
                        <input
                          type="password"
                          required
                          value={regConfirmPass}
                          onChange={(e) => setRegConfirmPass(e.target.value)}
                          placeholder="••••••••"
                          className={`w-full p-2.5 text-xs rounded-xl outline-none border transition ${
                            theme === 'light'
                              ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
                              : 'bg-slate-950 border-slate-800 text-white focus:border-violet-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 font-display ${theme === 'light' ? 'text-slate-650' : 'text-slate-400'}`}>Gender</label>
                        <select
                          value={regGender}
                          onChange={(e) => setRegGender(e.target.value as any)}
                          className={`w-full p-2.5 text-xs rounded-xl outline-none border transition cursor-pointer ${
                            theme === 'light'
                              ? 'bg-slate-50 border-slate-200 text-slate-852 focus:border-blue-500'
                              : 'bg-slate-950 border-slate-800 text-slate-300 focus:border-violet-500'
                          }`}
                        >
                          <option value="Male">Male 👦</option>
                          <option value="Female">Female 👧</option>
                          <option value="Other">Other 🌈</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 font-display ${theme === 'light' ? 'text-slate-650' : 'text-slate-400'}`}>Age</label>
                        <input
                          type="number"
                          required
                          value={regAge}
                          onChange={(e) => setRegAge(e.target.value)}
                          placeholder="Min 18 years"
                          min="18"
                          className={`w-full p-2.5 text-xs rounded-xl outline-none border transition cursor-pointer ${
                            theme === 'light'
                              ? 'bg-slate-50 border-slate-200 text-slate-852 focus:border-blue-500'
                              : 'bg-slate-950 border-slate-800 text-slate-300 focus:border-violet-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 font-display ${theme === 'light' ? 'text-slate-650' : 'text-slate-400'}`}>Date of Birth</label>
                      <input
                        type="date"
                        value={regDob}
                        onChange={(e) => setRegDob(e.target.value)}
                        className={`w-full p-2.5 text-xs rounded-xl outline-none border transition cursor-pointer ${
                          theme === 'light'
                            ? 'bg-slate-50 border-slate-200 text-slate-852 focus:border-blue-500'
                            : 'bg-slate-950 border-slate-800 text-slate-300 focus:border-violet-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 font-display ${theme === 'light' ? 'text-slate-650' : 'text-slate-400'}`}>Profile Picture</label>
                      <div className="flex items-center gap-3">
                        {regPic ? (
                          <img
                            src={regPic}
                            alt="avatar preview"
                            className={`w-11 h-11 rounded-full object-cover border-2 shadow-sm ${theme === 'light' ? 'border-blue-500' : 'border-violet-500'}`}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[9px] border font-semibold ${
                            theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-slate-800 border-slate-800 text-slate-500'
                          }`}>Avatar</div>
                        )}
                        <label className={`px-2.5 py-1.5 border text-[9px] font-bold rounded-lg transition cursor-pointer ${
                          theme === 'light'
                            ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900'
                            : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}>
                          Override with Photo
                          <input type="file" accept="image/*" onChange={handleUploadPic} className="hidden" />
                        </label>
                      </div>
                      <span className="text-[9px] text-slate-500 block mt-1.5 leading-normal">
                        ✨ A default avatar belonging to your selected gender has been pre-allocated. You can override it with a photo key.
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5 pb-1">
                      <input
                        type="checkbox"
                        id="reg-remember-checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                      <label htmlFor="reg-remember-checkbox" className={`text-[10px] font-medium leading-none cursor-pointer select-none ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                        Remember Me on this device
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 text-white font-bold font-display rounded-xl text-xs tracking-wider uppercase transition cursor-pointer ${
                      theme === 'light'
                        ? 'bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/10'
                        : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500'
                    }`}
                  >
                    {loading ? 'Creating account credentials...' : 'Register Official Account'}
                  </button>
                </form>
              )}

              {/* Photo Verification Form */}
              {authView === 'register' && showPhotoVerificationUI && (
                <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className={`font-bold text-base font-display ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Human Verification Required</h3>
                    <button type="button" onClick={() => setShowPhotoVerificationUI(false)} className={`text-xs transition ${theme === 'light' ? 'text-slate-500 hover:text-slate-950' : 'text-slate-400 hover:text-white'}`}>✕ Go Back</button>
                  </div>
                  <div className={`p-4 rounded-xl border text-sm ${theme === 'light' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/20 border-amber-900/50 text-amber-400'}`}>
                    <p className="mb-2 font-bold flex items-center gap-2"><Camera className="w-4 h-4" /> To ensure safety, we require proof of gender.</p>
                    <p className="text-xs mb-2 opacity-90">You may cover your face, but we need visible proof. To verify you are human, please take a photo.</p>
                    <ul className="text-xs list-disc pl-4 space-y-1 opacity-90">
                      <li>Show a victory sign (✌️) OR visible hair.</li>
                      <li>Face cover is allowed.</li>
                      <li>Must be a clear, real photo.</li>
                    </ul>
                  </div>

                  <div className="p-4 border-2 border-dashed border-slate-500/30 rounded-xl relative hover:bg-slate-500/5 transition cursor-pointer text-center group">
                     {humanVerificationPic ? (
                       <div className="relative">
                         <img src={humanVerificationPic} alt="Verification" className="w-full h-48 object-cover rounded-lg" />
                         <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-lg">
                           <span className="text-white text-xs font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">Change Photo</span>
                         </div>
                       </div>
                     ) : (
                       <div className={`py-6 flex flex-col items-center justify-center gap-2 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                         <Camera className="w-8 h-8 opacity-50 mb-1" />
                         <span className="text-sm font-medium">Capture or Upload Photo</span>
                         <span className="text-[10px] opacity-75">Tap here to open camera</span>
                       </div>
                     )}
                     <input 
                       type="file" 
                       accept="image/*" 
                       capture="user"
                       onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                           const r = new FileReader();
                           r.onloadend = () => setHumanVerificationPic(r.result as string);
                           r.readAsDataURL(file);
                         }
                       }}
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                       required={!humanVerificationPic}
                     />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading || !humanVerificationPic}
                    className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest text-white transition-all transform hover:scale-[1.01] ${
                      loading || !humanVerificationPic ? 'opacity-50 cursor-not-allowed bg-slate-600' : (theme === 'light' ? 'bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/10' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500')
                    }`}
                  >
                    {loading ? 'Processing Registration...' : 'Verify & Register Account'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

            </div>
          </div>

        </div>
      </main>

      {/* Modern Features Grid Section */}
      <section className={`py-16 relative z-10 border-t border-b transition-colors duration-300 ${
        theme === 'light' ? 'bg-slate-100/50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className={`text-2xl sm:text-3xl font-bold font-display mb-3 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Engineered for Safe High-Speed Vibe Sharing</h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">Six distinct features configured with modern technical standards ensures optimal connectivity</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className={`p-6 border rounded-2xl space-y-3 transition-colors duration-305 ${
              theme === 'light' ? 'bg-white border-slate-200/80 shadow-sm' : 'bg-slate-900/40 border-slate-800/60'
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                theme === 'light' ? 'bg-blue-50 text-blue-600' : 'bg-violet-500/10 text-violet-400'
              }`}>
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className={`text-base font-bold font-display ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Random Stranger Chat</h3>
              <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Match instantly with people around the world without sharing personal identifiers or profile archives.</p>
            </div>

            <div className={`p-6 border rounded-2xl space-y-3 transition-colors duration-305 ${
              theme === 'light' ? 'bg-white border-slate-200/80 shadow-sm' : 'bg-slate-900/40 border-slate-800/60'
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                theme === 'light' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-500/10 text-indigo-400'
              }`}>
                <Phone className="w-5 h-5" />
              </div>
              <h3 className={`text-base font-bold font-display ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Audio Calls</h3>
              <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Voice call with low-latency WebRTC streams. Fully supports micro toggles, sound controls, and secure relay lines.</p>
            </div>

            <div className={`p-6 border rounded-2xl space-y-3 transition-colors duration-305 ${
              theme === 'light' ? 'bg-white border-slate-200/80 shadow-sm' : 'bg-slate-900/40 border-slate-800/60'
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                theme === 'light' ? 'bg-blue-50 text-blue-600' : 'bg-blue-500/10 text-blue-400'
              }`}>
                <Video className="w-5 h-5" />
              </div>
              <h3 className={`text-base font-bold font-display ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Video Calls</h3>
              <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Engage in high-definition video feeds. Supports toggles, lens flipping, and fullscreens.</p>
            </div>

            <div className={`p-6 border rounded-2xl space-y-3 transition-colors duration-305 ${
              theme === 'light' ? 'bg-white border-slate-200/80 shadow-sm' : 'bg-slate-900/40 border-slate-800/60'
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                theme === 'light' ? 'bg-blue-50 text-blue-600' : 'bg-cyan-500/10 text-cyan-400'
              }`}>
                <Compass className="w-5 h-5" />
              </div>
              <h3 className={`text-base font-bold font-display ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Meet New Friends</h3>
              <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Issue real friend requests inside active stranger dialogs to build your dynamic private circle of buddies.</p>
            </div>

            <div className={`p-6 border rounded-2xl space-y-3 transition-colors duration-305 ${
              theme === 'light' ? 'bg-white border-slate-200/80 shadow-sm' : 'bg-slate-900/40 border-slate-800/60'
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                theme === 'light' ? 'bg-green-50 text-green-600' : 'bg-emerald-500/10 text-emerald-400'
              }`}>
                <Shield className="w-5 h-5" />
              </div>
              <h3 className={`text-base font-bold font-display ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Safe and Secure Platform</h3>
              <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Robust user safety structures including interactive blocking tools, moderator abuse complaints, and cryptographic encryption.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer copyright */}
      <footer className={`py-8 text-center text-xs relative z-10 border-t transition-colors duration-300 ${
        theme === 'light' ? 'bg-white border-slate-200 text-slate-500' : 'bg-slate-950 border-slate-800 text-slate-500'
      }`}>
        <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-center">
          <p>© 2026 VibeChat Platform Group. Meet New People. Where Strangers Meet. All Rights Secure.</p>
        </div>
      </footer>
      
      {authView === 'login' && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <button
            onClick={onAdminAccess}
            className={`text-[9px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${
              theme === 'light' 
                ? 'bg-white/80 border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 shadow-sm' 
                : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-800 backdrop-blur-sm'
            }`}
          >
            Admin Access
          </button>
        </div>
      )}

    </div>
  );
}
