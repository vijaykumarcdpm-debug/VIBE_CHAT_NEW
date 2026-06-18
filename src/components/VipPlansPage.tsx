import React, { useState, useEffect, useRef } from 'react';
import { VIPPlan } from '../types';
import { Sparkles, ArrowLeft, CreditCard, Shield, Image, Check, AlertCircle, Crown, Star, Pin, X, Download } from 'lucide-react';

interface VipPlansPageProps {
  onBack: () => void;
  onSubmitPayment: (planId: string, screenshotBase64: string) => Promise<void>;
  plans: VIPPlan[];
  qrCodeUrl: string;
  paymentPending: boolean;
  theme: string;
  autoScrollToPlans?: boolean;
}

export default function VipPlansPage({
  onBack,
  onSubmitPayment,
  plans,
  qrCodeUrl,
  paymentPending,
  theme,
  autoScrollToPlans = false
}: VipPlansPageProps) {
  const [selectedPlan, setSelectedPlan] = useState<VIPPlan | null>(null);
  const [screenshot, setScreenshot] = useState<string>('');
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
  
  const plansContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScrollToPlans && plansContainerRef.current) {
      setTimeout(() => {
        plansContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [autoScrollToPlans]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, JPEG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image exceeds the maximum size of 5MB');
      return;
    }

    setUploadError('');
    setScreenshotName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshot(reader.result as string);
    };
    reader.onerror = () => {
      setUploadError('Failed to read image script. Try another image.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedPlan) return;
    if (!screenshot) {
      setUploadError('Please upload your payment transaction screenshot.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitPayment(selectedPlan.id, screenshot);
      setSubmissionSuccess(true);
    } catch (e: any) {
      setUploadError(e.message || 'Payment submission failed. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex-1 overflow-y-auto max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={onBack}
        className={`inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-xl border transition cursor-pointer ${theme === "light" ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm" : "text-stone-300 hover:text-white bg-slate-800/40 hover:bg-slate-800 border-slate-700/50"}`}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </button>

      {/* Main Container */}
      <div className={`border rounded-3xl p-6 sm:p-10 backdrop-blur-md ${theme === "light" ? "bg-slate-50/80 border-slate-200 shadow-xl" : "bg-slate-900/60 border-slate-800"}`}>
        
        {/* Header (Removed per user request) */}

        {submissionSuccess ? (
          <div className="max-w-md mx-auto text-center py-8 px-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 font-bold" />
            </div>
            <h2 className={`text-2xl font-bold font-display mb-3 ${theme === "light" ? "text-slate-900" : "text-white"}`}>Invoice Sent!</h2>
            <p className={`text-sm leading-relaxed mb-6 ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
              Wait for a while so that admin will verify your profile and payment status.
            </p>
            <button
              onClick={onBack}
              className={`w-full py-3 rounded-xl font-medium transition cursor-pointer ${theme === "light" ? "bg-slate-800 hover:bg-slate-900 text-white" : "bg-slate-800 hover:bg-slate-700 text-white"}`}
            >
              Continue to VibeChat
            </button>
          </div>
        ) : paymentPending ? (
          <div className="max-w-md mx-auto text-center py-8 px-4 bg-violet-500/5 border border-violet-500/20 rounded-2xl">
            <div className="w-16 h-16 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>
            <h2 className={`text-2xl font-bold font-display mb-3 ${theme === "light" ? "text-slate-900" : "text-white"}`}>Verification Pending</h2>
            <p className={`text-sm leading-relaxed mb-6 ${theme === "light" ? "text-slate-600" : "text-slate-300"}`}>
              You already have a pending VIP request. System administrators are actively verifying your transaction invoice right now.
            </p>
            <button
              onClick={onBack}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition cursor-pointer"
            >
              Continue to VibeChat
            </button>
          </div>
        ) : (
          <div className="space-y-10">

            {/* VIP Perks Grid */}
            <div className={`mb-12 pb-6 border-b ${theme === "light" ? "border-slate-200" : "border-slate-800/60"}`}>
              <div className="text-center max-w-2xl mx-auto mb-10">
                <h3 className="text-2xl sm:text-3xl font-black mb-3 font-display tracking-tight">
                  <span className={`mr-2 ${theme === "light" ? "text-slate-900" : "text-white"}`}>
                    Exclusive
                  </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500">
                    Royal VIP
                  </span>
                  <span className={`ml-2 ${theme === "light" ? "text-slate-900" : "text-white"}`}>
                    Privileges Included
                  </span>
                </h3>
                <p className={`text-sm sm:text-base font-bold ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}>
                  Experience the ultimate level of connection, privileges, and premium status.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Privilege 1 */}
                <div className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 group shadow-lg hover:shadow-xl ${theme === "light" ? "bg-white border border-violet-100 hover:border-violet-300" : "bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-violet-500/50"}`}>
                  <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-10 group-hover:rotate-12 transition-all duration-500">
                    <Crown className="w-32 h-32 text-violet-500" />
                  </div>
                  <div className={`w-14 h-14 rounded-2xl mb-5 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300 ${theme === "light" ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-violet-500/20" : "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-violet-900/50"}`}>
                    <Crown className="w-7 h-7" />
                  </div>
                  <h4 className={`text-lg font-black mb-2 font-display tracking-wide ${theme === "light" ? "text-slate-900" : "text-white"}`}>All Recent Features</h4>
                  <p className={`text-sm font-semibold leading-relaxed ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
                    Upgrade to VIP to bypass the history limit and unlock all recent dialogues effortlessly.
                  </p>
                </div>

                {/* Privilege 2 */}
                <div className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 group shadow-lg hover:shadow-xl ${theme === "light" ? "bg-white border border-blue-100 hover:border-blue-300" : "bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-blue-500/50"}`}>
                  <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-10 group-hover:-rotate-12 transition-all duration-500">
                    <Shield className="w-32 h-32 text-blue-500" />
                  </div>
                  <div className={`w-14 h-14 rounded-2xl mb-5 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300 ${theme === "light" ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-blue-500/20" : "bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-blue-900/50"}`}>
                    <Shield className="w-7 h-7" />
                  </div>
                  <h4 className={`text-lg font-black mb-2 font-display tracking-wide ${theme === "light" ? "text-slate-900" : "text-white"}`}>Advanced Matching</h4>
                  <p className={`text-sm font-semibold leading-relaxed ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
                    Filter strangers by exact Gender, City, and State parameters in real-time.
                  </p>
                </div>

                {/* Privilege 3 */}
                <div className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 group shadow-lg hover:shadow-xl ${theme === "light" ? "bg-white border border-emerald-100 hover:border-emerald-300" : "bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-emerald-500/50"}`}>
                  <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                    <Sparkles className="w-32 h-32 text-emerald-500" />
                  </div>
                  <div className={`w-14 h-14 rounded-2xl mb-5 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300 ${theme === "light" ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-emerald-500/20" : "bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-emerald-900/50"}`}>
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <h4 className={`text-lg font-black mb-2 font-display tracking-wide ${theme === "light" ? "text-slate-900" : "text-white"}`}>Call Breakthrough</h4>
                  <p className={`text-sm font-semibold leading-relaxed ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
                    Bypass busy line restrictions and instantly reach users with priority calls.
                  </p>
                </div>

                {/* Privilege 4 */}
                <div className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 group shadow-lg hover:shadow-xl ${theme === "light" ? "bg-white border border-amber-100 hover:border-amber-300" : "bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-amber-500/50"}`}>
                  <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-10 group-hover:rotate-12 transition-all duration-500">
                    <Crown className="w-32 h-32 text-amber-500" />
                  </div>
                  <div className={`w-14 h-14 rounded-2xl mb-5 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300 ${theme === "light" ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-amber-500/20" : "bg-gradient-to-br from-amber-600 to-orange-600 text-white shadow-amber-900/50"}`}>
                    <Crown className="w-7 h-7" />
                  </div>
                  <h4 className={`text-lg font-black mb-2 font-display tracking-wide ${theme === "light" ? "text-slate-900" : "text-white"}`}>VIP Crown Status</h4>
                  <p className={`text-sm font-semibold leading-relaxed ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
                    Get the Royal VIP Crown symbol next to your name and appear at the top of all lists.
                  </p>
                </div>

                {/* Privilege 5 - Spotlight */}
                <div className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 group shadow-lg hover:shadow-xl ${theme === "light" ? "bg-white border border-orange-100 hover:border-orange-300" : "bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-orange-500/50"}`}>
                  <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-10 group-hover:rotate-12 transition-all duration-500">
                    <Star className="w-32 h-32 text-orange-500" />
                  </div>
                  <div className={`w-14 h-14 rounded-2xl mb-5 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300 ${theme === "light" ? "bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-orange-500/20" : "bg-gradient-to-br from-orange-500 to-rose-600 text-white shadow-orange-900/50"}`}>
                    <Star className="w-7 h-7" />
                  </div>
                  <h4 className={`text-lg font-black mb-2 font-display tracking-wide ${theme === "light" ? "text-slate-900" : "text-white"}`}>Spotlight Message</h4>
                  <p className={`text-sm font-semibold leading-relaxed ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
                    Your message appears on top of the header for every online user. Be famous instantly!
                  </p>
                </div>

                {/* Privilege 6 - Priority Inbox */}
                <div className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 group shadow-lg hover:shadow-xl ${theme === "light" ? "bg-white border border-rose-100 hover:border-rose-300" : "bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-rose-500/50"}`}>
                  <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-10 group-hover:-rotate-12 transition-all duration-500">
                    <Pin className="w-32 h-32 text-rose-500" />
                  </div>
                  <div className={`w-14 h-14 rounded-2xl mb-5 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300 ${theme === "light" ? "bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-rose-500/20" : "bg-gradient-to-br from-rose-600 to-pink-600 text-white shadow-rose-900/50"}`}>
                    <Pin className="w-7 h-7" />
                  </div>
                  <h4 className={`text-lg font-black mb-2 font-display tracking-wide ${theme === "light" ? "text-slate-900" : "text-white"}`}>Priority In-boxes</h4>
                  <p className={`text-sm font-semibold leading-relaxed ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
                    Your message stays pinned on the top of the receiver's chat list until they read it.
                  </p>
                </div>
              </div>
            </div>

            {/* Phase 1: Plans */}
            <div ref={plansContainerRef} className={`pt-2 ${theme === "light" ? "border-slate-200" : "border-slate-800"}`}>
              <h2 className={`plan-duration-header text-lg font-bold font-display mb-5 flex items-center gap-2 ${theme === "light" ? "text-slate-900" : "text-white"}`}>
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs shadow-inner">1</span>
                Select Your Plan Duration
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                {plans.map((pl) => {
                  const isSelected = selectedPlan?.id === pl.id;
                  const pricePerDay = (pl.price / pl.days).toFixed(1);

                  return (
                    <button
                      key={pl.id}
                      onClick={() => { setSelectedPlan(pl); setSubmissionSuccess(false); }}
                      className={`plan-duration-card plan-duration-card-bg text-left p-4 rounded-2xl border-2 transition relative duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-black scale-[1.02] shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
                          : 'border-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <h3 className="font-black text-base truncate text-black">{pl.name.replace('Royal VIP ', '')}</h3>
                      <div className="flex items-baseline gap-1 mt-2 mb-1">
                        <span className="text-2xl font-black font-display text-black">₹{pl.price}</span>
                      </div>
                      <p className="text-black font-bold text-xs mb-3">{pl.days} Days</p>
                      <div className="text-[10px] font-bold border-t pt-2 -mx-4 px-4 -mb-4 rounded-b-xl border-slate-300 plan-duration-card-bg">
                        ~₹{pricePerDay}/day
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3 bg-black rounded-full p-0.5" style={{backgroundColor: 'black'}}>
                          <Check className="w-3 h-3" style={{color: 'white'}} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Payment Popup Modal */}
      {selectedPlan && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in ${theme === 'light' ? 'bg-slate-900/60' : 'bg-black/80'}`}>
          <div className={`w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl p-6 sm:p-8 shadow-2xl relative ${theme === "light" ? "bg-white border border-slate-200" : "bg-slate-950 border border-slate-800"}`}>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
               <h2 className={`text-2xl font-black font-display tracking-tight ${theme === "light" ? "text-slate-900" : "text-white"}`}>
                  Complete VIP Enrollment
               </h2>
               <button 
                 onClick={() => { setSelectedPlan(null); setScreenshot(''); setScreenshotName(''); setUploadError(''); }} 
                 className={`p-2 rounded-full transition cursor-pointer ${theme === "light" ? "hover:bg-slate-100 text-slate-500" : "hover:bg-slate-800 text-slate-400"}`}
               >
                  <X className="w-6 h-6" />
               </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* QR Code Segment */}
              <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center ${theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900/50 border-slate-800/80"}`}>
                <h3 className={`text-lg font-bold font-display mb-4 text-center ${theme === "light" ? "text-slate-900" : "text-white"}`}>
                  Pay <span className="text-violet-500">₹{selectedPlan.price}</span> via QR Code
                </h3>
                
                <div className="bg-white p-4 rounded-3xl mb-4 w-56 h-56 flex items-center justify-center shadow-xl border border-slate-100">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="UPI Payment QR Code"
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={`text-center text-xs ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}>QR Unloaded</div>
                  )}
                </div>
                
                {qrCodeUrl && (
                  <a 
                    href={qrCodeUrl} 
                    download="vibechat-vip-qr.png" 
                    className="flex items-center gap-2 text-sm font-bold text-violet-500 hover:text-violet-600 mb-4 transition"
                  >
                    <Download className="w-4 h-4" /> Download QR
                  </a>
                )}

                <div className="text-center max-w-sm mt-2">
                  <p className="text-sm text-rose-500 mb-2 font-bold tracking-wide">
                    Exact Amount Required: ₹{selectedPlan.price}
                  </p>
                  <p className={`text-xs font-semibold leading-relaxed ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}>
                    Scan or Download the QR to pay with GPay, PhonePe, Paytm, BHIM, or any UPI App to issue your invoice.
                  </p>
                </div>
              </div>

              {/* Screenshot Upload Segment */}
              <div className="flex flex-col justify-between">
                <div>
                  <h3 className={`text-lg font-bold font-display mb-3 flex items-center gap-2 ${theme === "light" ? "text-slate-900" : "text-white"}`}>
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-violet-500 text-white shadow-lg shadow-violet-500/30 text-xs">2</span>
                    Upload Transaction Screenshot
                  </h3>
                  
                  <p className={`text-sm mb-5 font-medium leading-relaxed ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
                    Upload the full transaction screenshot of your pay slip. To expedite authorization, please ensure the <strong className={theme === "light" ? "text-slate-900" : "text-white"}>UTR / UPI reference ID</strong> is visible.
                  </p>

                  <div className="space-y-4">
                    <div className={`relative border-2 border-dashed rounded-2xl transition-all duration-300 p-8 text-center cursor-pointer group ${theme === "light" ? "border-slate-300 hover:border-violet-400 bg-slate-50/50 hover:bg-violet-50/50" : "border-slate-700 hover:border-violet-500 bg-slate-900/30 hover:bg-violet-900/10"}`}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Image className={`w-12 h-12 mx-auto mb-4 transition-colors duration-300 ${theme === "light" ? "text-slate-400 group-hover:text-violet-500" : "text-slate-600 group-hover:text-violet-400"}`} />
                      <span className={`block text-base font-bold mb-1 ${theme === "light" ? "text-slate-800" : "text-slate-200"}`}>
                        {screenshotName ? screenshotName : 'Click to Upload Screenshot'}
                      </span>
                      <span className="block text-xs font-semibold text-slate-500">
                        PNG, JPG, or JPEG (Max 5MB)
                      </span>
                    </div>

                    {uploadError && (
                      <div className="flex items-center gap-2 text-rose-500 text-xs font-bold bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                    )}

                    {screenshot && (
                      <div className={`relative rounded-2xl overflow-hidden border p-3 shadow-lg ${theme === "light" ? "border-slate-200 bg-white" : "border-slate-700 bg-slate-900"}`}>
                        <div className="absolute top-4 right-4 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-md">
                          UPLOADED
                        </div>
                        <img
                          src={screenshot}
                          alt="Payment receipt preview"
                          className="max-h-40 mx-auto object-contain rounded-xl"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !screenshot}
                    className="w-full py-4 bg-gradient-to-r from-violet-600 via-violet-500 to-fuchsia-500 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:dark:from-slate-800 disabled:dark:to-slate-800 disabled:dark:text-slate-600 hover:from-violet-500 hover:to-fuchsia-400 text-white rounded-2xl font-black font-display tracking-widest uppercase shadow-xl shadow-violet-500/20 disabled:shadow-none transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Verifying Upload...' : `Submit Payment of ₹${selectedPlan.price}`}
                  </button>
                  <p className={`text-xs font-bold text-center mt-4 flex items-center justify-center gap-1.5 ${theme === "light" ? "text-slate-400" : "text-slate-500"}`}>
                    <Shield className="w-4 h-4" /> Secure 256-bit UPI Gateway Protection
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
