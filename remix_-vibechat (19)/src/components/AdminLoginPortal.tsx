import React, { useState } from 'react';
import { ShieldCheck, ArrowLeft, KeyRound, AlertTriangle, User, Lock, Terminal } from 'lucide-react';

interface AdminLoginProps {
  theme: 'light' | 'dark';
  onBack: () => void;
  onAdminSuccess: (adminToken: string, adminUser: any) => void;
}

export default function AdminLoginPortal({ theme, onBack, onAdminSuccess }: AdminLoginProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin-login-step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Invalid Admin Username.');
        setLoading(false);
        return;
      }

      setStep(2);
    } catch (e) {
      setErrorMsg('Could not establish link with security core.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin-login-step2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Mismatched Password credentials.');
        setLoading(false);
        return;
      }

      setSimulatedOtp(data.otpCode || '');
      setStep(3);
    } catch (e) {
      setErrorMsg('Could not verify credentials with primary node.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin-login-step3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), otp: otp.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'MFA Verification failed: Access Denied.');
        setLoading(false);
        return;
      }

      // Admin verification success!
      onAdminSuccess(data.token, data.user);
    } catch (e) {
      setErrorMsg('Access Denied: Verification failed on administrative node.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`h-full w-full overflow-y-auto flex items-center justify-center p-6 transition-colors duration-300 ${
      theme === 'light' ? 'bg-slate-100' : 'bg-[#060913]'
    }`}>
      <div className="absolute top-8 left-8">
        <button
          onClick={onBack}
          className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-semibold tracking-wide cursor-pointer transition ${
            theme === 'light'
              ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to VibeChat
        </button>
      </div>

      <div className={`w-full max-w-md border p-8 rounded-3xl shadow-3xl transition-all duration-300 relative overflow-hidden ${
        theme === 'light' ? 'bg-white border-slate-200 shadow-slate-200/40' : 'bg-[#0d1326] border-slate-800 shadow-black/80'
      }`}>
        {/* Glow effect */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none"></div>

        {/* Steps indicator badges */}
        <div className="flex justify-center gap-2.5 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all duration-300 flex items-center gap-1.5 ${
                step === s
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/15 scale-105'
                  : step > s
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800/20 border border-slate-800 text-slate-500'
              }`}
            >
              <span>Step {s}</span>
              {s === 1 && <span className="text-[9px] opacity-70">User</span>}
              {s === 2 && <span className="text-[9px] opacity-70">Pass</span>}
              {s === 3 && <span className="text-[9px] opacity-70">MFA Code</span>}
            </div>
          ))}
        </div>

        <div className="text-center space-y-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
            <KeyRound className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className={`text-xl font-black font-display tracking-tight uppercase ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              VIBECHAT ADMIN
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Secured Node Authenticator</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 mb-5 text-xs font-semibold rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 animate-shake flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold uppercase text-[10px] tracking-wider mb-0.5">Authentication Failure</p>
              <p className="text-[11px] leading-relaxed opacity-95">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* STEP 1 FORM: USERNAME */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4 animate-fade-in">
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 font-display ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                Administrator Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin identifier"
                  className={`w-full pl-10 pr-4 py-3 text-xs rounded-xl outline-none border transition ${
                    theme === 'light'
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-950 border-slate-800 text-white focus:border-amber-500'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 text-white font-bold font-display tracking-wider text-xs uppercase rounded-xl transition cursor-pointer ${
                theme === 'light'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-500/15'
                  : 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 shadow-lg shadow-black/40'
              }`}
            >
              {loading ? 'Querying Roster...' : 'Verify username • Next'}
            </button>
          </form>
        )}

        {/* STEP 2 FORM: PASSWORD */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-4 animate-fade-in">
            <div className={`p-2 py-1.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800/60'
            }`}>
              <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                <User className="w-3.5 h-3.5 text-amber-500" /> Identifier:
              </div>
              <span className="font-mono text-xs font-bold text-slate-400">{username}</span>
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 font-display ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                Secret Password Access Key
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full pl-10 pr-4 py-3 text-xs rounded-xl outline-none border transition ${
                    theme === 'light'
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-950 border-slate-800 text-white focus:border-amber-500'
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`py-3 px-4 font-bold text-xs uppercase rounded-xl border transition cursor-pointer ${
                  theme === 'light'
                    ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-grow py-3 text-white font-bold font-display tracking-wider text-xs uppercase rounded-xl transition cursor-pointer ${
                  theme === 'light'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-500/15'
                    : 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 shadow-lg shadow-black/40'
                }`}
              >
                {loading ? 'Decrypting Key...' : 'Validate Password • Next'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3 FORM: MFA OTP */}
        {step === 3 && (
          <form onSubmit={handleStep3Submit} className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 font-display space-y-1 mt-1 text-[11px] leading-relaxed">
              <span className="font-extrabold uppercase tracking-wider flex items-center gap-1 text-[10px]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> MFA SECURITY SMS/EMAIL DISPATCHED:
              </span>
              <p className="opacity-90">Please enter the security verification key: <b className="font-mono text-xs underline font-black underline-offset-2 tracking-widest">{simulatedOtp || '----'}</b></p>
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 font-display text-center ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                Enter 4-Digit Multi-Factor OTP Code
              </label>
              <input
                type="text"
                required
                maxLength={4}
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="0000"
                className="w-full py-3.5 text-sm text-center font-mono font-black tracking-[1.5em] pl-[1.5em] rounded-xl outline-none border transition bg-slate-950 border-slate-800 text-amber-400 focus:border-amber-500 shadow-inner"
              />
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`py-3 px-4 font-bold text-xs uppercase rounded-xl border transition cursor-pointer ${
                  theme === 'light'
                    ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-grow py-3 text-white font-bold font-display tracking-wider text-xs uppercase rounded-xl transition cursor-pointer ${
                  theme === 'light'
                    ? 'bg-emerald-600 hover:bg-emerald-550'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 shadow-lg shadow-black/40'
                }`}
              >
                {loading ? 'Authorizing Session...' : 'Verify MFA Code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
