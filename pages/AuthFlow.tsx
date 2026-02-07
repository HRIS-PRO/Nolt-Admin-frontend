
import React, { useState, useRef, useEffect } from 'react';

// Add axios import at the top
import axios from 'axios';

interface AuthFlowProps {
  onComplete: (email: string) => void;
}

const AuthFlow: React.FC<AuthFlowProps> = ({ onComplete }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  const [authStep, setAuthStep] = useState(1); // 1: Registration Form, 2: Verification (OTP), 3: Acquisition
  const [code, setCode] = useState(['', '', '', '']);
  const [source, setSource] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // Resend functionality states
  const [resendTimer, setResendTimer] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer logic for resend cooldown
  useEffect(() => {
    let interval: number;
    if (resendTimer > 0) {
      interval = window.setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      onComplete(email);
    } else {
      setAuthStep(2);
      // Start cooldown when first entering the verification step
      setResendTimer(30);
    }
  };

  const handleVerify = async () => {
    const otpToken = code.join('');
    if (otpToken.length !== 4 && otpToken.length !== 6) return;

    try {
      const backendUrl = ''; // Use proxy
      const { data } = await axios.post(`${backendUrl}/auth/verify-email-otp`, {
        email,
        otp: otpToken
      }, { withCredentials: true });

      console.log("Verify Response:", data);
      setAuthStep(3);
    } catch (err: any) {
      console.error("Verification failed", err);
      alert(err.response?.data?.message || 'Invalid verification code.');
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || isResending) return;

    setIsResending(true);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    setResendTimer(30);
    setIsResending(false);
    // Clear existing code for a fresh start
    setCode(['', '', '', '']);
    codeInputs.current[0]?.focus();
  };

  const handleAcquisitionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(email);
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 3) {
      codeInputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  const sources = [
    { id: 'social_media', label: 'Social Media', icon: 'public' },
    { id: 'online_search', label: 'Online Search', icon: 'search' },
    { id: 'friend_family', label: 'Friend / Family', icon: 'diversity_3' },
    { id: 'advertisement', label: 'Advertisement', icon: 'campaign' },
    { id: 'blog_article', label: 'Blog / Article', icon: 'article' },
    { id: 'other', label: 'Other', icon: 'more_horiz' },
  ];


  const handleGoogleLogin = () => {
    const backendUrl = ''; // Use proxy
    window.location.href = `${backendUrl}/auth/google`;
  };

  return (
    <div className="min-h-screen flex w-full bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased transition-colors duration-300 overflow-x-hidden">
      {/* Left Branding Panel */}
      <div className="hidden md:flex md:w-5/12 lg:w-1/2 relative flex-col justify-between p-8 lg:p-12 overflow-hidden bg-slate-900 border-r border-slate-800">
        <div className="absolute inset-0 w-full h-full z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/80 to-slate-900 z-10"></div>
          <div
            className="w-full h-full bg-cover bg-center opacity-40 grayscale brightness-[0.4] sepia-[0.3] hue-rotate-[180deg]"
            style={{
              backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDB0RJs5vDneUNTwinXrTi7gJ6DLVoF9VZanKWoccy9AsSUastMTMqM7zYdhMjT7Y2HTJdV0PVUftDdzbdznYAILFUPmRvBOe-zQcdxMjnuybXASn2JANmWTsVrYYN7HxZ74Urr2tw_5PFP8Qs-ryFYp14sv8lePCeXKR0WNXCd1Wrhof8xZUYWYflEmdh7uEWPyqMBcg1An_csvxMHHgMMw_u_fS8zRJ4hE6Rb_tS_V3JOkQQIJEd_pvjK2CYPPU0h5269Imm-7w")',
            }}
          ></div>
        </div>

        <div className="relative z-20 flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary text-white shadow-[0_0_15px_rgba(2,143,245,0.4)]">
            <span className="material-symbols-outlined text-2xl">ssid_chart</span>
          </div>
          <h2 className="text-white text-xl font-bold tracking-tight">NOLT Finance</h2>
        </div>

        <div className="relative z-20 mt-auto max-w-md">
          <div className="glass-effect p-8 rounded-3xl border border-white/5 shadow-2xl">
            <div className="flex gap-1 mb-4 text-primary">
              <span className="material-symbols-outlined text-sm filled">star</span>
              <span className="material-symbols-outlined text-sm filled">star</span>
              <span className="material-symbols-outlined text-sm filled">star</span>
              <span className="material-symbols-outlined text-sm filled">star</span>
              <span className="material-symbols-outlined text-sm filled">star</span>
            </div>
            <blockquote className="text-lg font-medium text-white leading-relaxed mb-4">
              "NOLT made getting a business loan incredibly simple. The process was transparent, fast, and secure."
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-slate-700 bg-cover bg-center border border-white/10" style={{ backgroundImage: 'url("https://picsum.photos/seed/user123/100/100")' }}></div>
              <div>
                <p className="text-sm font-bold text-white">David Chen</p>
                <p className="text-xs text-slate-400 font-medium">CEO, TechStart Inc.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col relative w-full md:w-7/12 lg:w-1/2">
        <header className="md:hidden flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-white">
              <span className="material-symbols-outlined text-lg">ssid_chart</span>
            </div>
            <h2 className="text-lg font-bold dark:text-white">NOLT Finance</h2>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-24 overflow-y-auto">
          <div className="w-full max-w-xl flex flex-col gap-8">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                {isLogin ? 'Welcome back' : authStep === 1 ? 'Create your account' : authStep === 2 ? 'Check your email' : 'Help us grow'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-base">
                {isLogin ? 'Log in to manage your portfolio.' : authStep === 1 ? 'Start your financial journey with us today.' : authStep === 2 ? `We sent a verification code to ${email}` : 'How did you hear about our offers?'}
              </p>
            </div>

            {!isLogin && (
              <div className="flex items-center gap-2 mb-2">
                <span className={`h-1.5 w-12 rounded-full transition-all duration-300 ${authStep >= 1 ? 'bg-primary shadow-[0_0_8px_rgba(2,143,245,0.4)]' : 'bg-slate-200 dark:bg-slate-700'}`}></span>
                <span className={`h-1.5 w-12 rounded-full transition-all duration-300 ${authStep >= 2 ? 'bg-primary shadow-[0_0_8px_rgba(2,143,245,0.4)]' : 'bg-slate-200 dark:bg-slate-700'}`}></span>
                <span className={`h-1.5 w-12 rounded-full transition-all duration-300 ${authStep >= 3 ? 'bg-primary shadow-[0_0_8px_rgba(2,143,245,0.4)]' : 'bg-slate-200 dark:bg-slate-700'}`}></span>
              </div>
            )}

            {authStep === 1 ? (
              <form onSubmit={handleInitialSubmit} className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-white ml-1">Email Address</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">mail</span>
                    <input
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 pl-12 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      placeholder="name@example.com"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-white ml-1">Password</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">lock</span>
                    <input
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 pl-12 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      placeholder="Min. 8 characters"
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-white ml-1">Confirm Password</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">verified_user</span>
                        <input
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 pl-12 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                          placeholder="Re-enter password"
                          required
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex items-start gap-3 px-1">
                      <input type="checkbox" required className="mt-1 size-4 rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary" id="terms" />
                      <label htmlFor="terms" className="text-sm text-slate-500">
                        I agree to the <a href="#" className="font-bold text-slate-900 dark:text-white underline">Terms</a> and <a href="#" className="font-bold text-slate-900 dark:text-white underline">Privacy Policy</a>.
                      </label>
                    </div>
                  </>
                )}

                <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-full transition-all transform active:scale-[0.98] shadow-lg shadow-primary/20 mt-2 flex items-center justify-center gap-2">
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>

                <div className="relative flex py-4 items-center">
                  <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase tracking-widest font-black">Or continue with</span>
                  <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
                </div>

                <button type="button" onClick={handleGoogleLogin} className="flex items-center justify-center gap-2 w-full h-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-bold">
                  <img src="https://www.google.com/favicon.ico" className="size-5" alt="Google" />
                  Google
                </button>

                <p className="text-center text-sm text-slate-500 mt-4 font-medium">
                  {isLogin ? "New to NOLT?" : "Already have an account?"}{' '}
                  <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary font-bold hover:underline">
                    {isLogin ? 'Create an Account' : 'Log in'}
                  </button>
                </p>
              </form>
            ) : authStep === 2 ? (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center">
                <div className="flex justify-center mb-2">
                  <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-primary animate-pulse">mark_email_unread</span>
                  </div>
                </div>

                <div className="flex justify-center gap-3 my-4">
                  {code.map((digit, idx) => (
                    <input
                      key={idx}
                      // Fix: Use braces in ref callback to avoid returning the element, which causes a TypeScript type mismatch.
                      ref={el => { codeInputs.current[idx] = el; }}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="size-14 text-center text-2xl font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                  ))}
                </div>

                <div className="flex flex-col gap-4">
                  <button
                    type="button"
                    onClick={handleVerify}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-full transition-all transform active:scale-[0.98] shadow-lg shadow-primary/20"
                  >
                    Verify Email
                  </button>

                  {/* Secure Guarantee Section */}
                  <div className="mt-2 p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20 flex items-center gap-4 text-left animate-in fade-in duration-700 delay-300">
                    <div className="size-10 rounded-full bg-primary flex items-center justify-center text-white shrink-0 shadow-md shadow-primary/20">
                      <span className="material-symbols-outlined text-xl filled">verified_user</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">NOLT Secure Guarantee</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-tight">Your data is protected by bank-grade 256-bit encryption. We take your security seriously!</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 mt-2">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <span className="text-slate-500">Didn't receive the email?</span>
                      <button
                        className={`font-bold flex items-center gap-1 transition-all ${resendTimer > 0 || isResending ? 'text-slate-400 cursor-not-allowed' : 'text-primary hover:underline'}`}
                        type="button"
                        onClick={handleResend}
                        disabled={resendTimer > 0 || isResending}
                      >
                        {isResending ? (
                          <div className="size-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        ) : null}
                        {isResending ? 'Sending...' : 'Resend'}
                      </button>
                    </div>
                    {resendTimer > 0 && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 animate-in fade-in slide-in-from-top-1">
                        Try again in {resendTimer}s
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAuthStep(1)}
                  className="mt-4 text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm flex items-center justify-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  Back to sign up
                </button>
              </div>
            ) : (
              <form onSubmit={handleAcquisitionSubmit} className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sources.map((item) => (
                    <label key={item.id} className="cursor-pointer group">
                      <input
                        type="radio"
                        name="source"
                        value={item.id}
                        className="peer sr-only"
                        onChange={(e) => setSource(e.target.value)}
                        required
                      />
                      <div className="flex items-center gap-4 h-16 px-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full transition-all hover:bg-slate-50 dark:hover:bg-slate-700 peer-checked:border-primary peer-checked:bg-primary/5">
                        <span className={`material-symbols-outlined transition-colors ${source === item.id ? 'text-primary' : 'text-slate-400'}`}>
                          {item.icon}
                        </span>
                        <span className={`text-base font-bold flex-1 transition-colors ${source === item.id ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                          {item.label}
                        </span>
                        <div className={`size-5 rounded-full border flex items-center justify-center transition-all ${source === item.id ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                          {source === item.id && <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800 w-full"></div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-white ml-1">Officer Name (Optional)</label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">badge</span>
                      <input
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-4 pl-12 h-14 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-all"
                        placeholder="Enter Officer's Name"
                        value={officerName}
                        onChange={(e) => setOfficerName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-white ml-1">Referral Code (Optional)</label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">loyalty</span>
                      <input
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-4 pl-12 h-14 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-all"
                        placeholder="Enter Code"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-full transition-all transform active:scale-[0.98] shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                  Complete Registration
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </form>
            )}
          </div>
        </main>

        <footer className="p-6 text-center">
          <p className="text-xs text-slate-400 font-medium">
            © 2024 NOLT Finance. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default AuthFlow;
