
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const VerifyPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || 'your email';

    const [code, setCode] = useState(['', '', '', '']);
    const [resendTimer, setResendTimer] = useState(30);
    const [isResending, setIsResending] = useState(false);

    const codeInputs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        let interval: number;
        if (resendTimer > 0) {
            interval = window.setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleVerify = () => {
        if (code.every(digit => digit !== '')) {
            navigate('/onboarding', { state: { email } });
        }
    };

    const handleResend = async () => {
        if (resendTimer > 0 || isResending) return;

        setIsResending(true);
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        setResendTimer(30);
        setIsResending(false);
        setCode(['', '', '', '']);
        codeInputs.current[0]?.focus();
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

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center">
            <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Check your email
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-base">
                    We sent a verification code to {email}
                </p>
            </div>

            <div className="flex items-center gap-2 mb-2 justify-center">
                <span className="h-1.5 w-12 rounded-full transition-all duration-300 bg-primary shadow-[0_0_8px_rgba(2,143,245,0.4)]"></span>
                <span className="h-1.5 w-12 rounded-full transition-all duration-300 bg-primary shadow-[0_0_8px_rgba(2,143,245,0.4)]"></span>
                <span className="h-1.5 w-12 rounded-full transition-all duration-300 bg-slate-200 dark:bg-slate-700"></span>
            </div>

            <div className="flex justify-center mb-2">
                <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-primary animate-pulse">mark_email_unread</span>
                </div>
            </div>

            <div className="flex justify-center gap-3 my-4">
                {code.map((digit, idx) => (
                    <input
                        key={idx}
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

                <div className="mt-2 p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20 flex items-center gap-4 text-left">
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
                onClick={() => navigate('/register')}
                className="mt-4 text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm flex items-center justify-center gap-1 transition-colors"
            >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Back to sign up
            </button>
        </div>
    );
};

export default VerifyPage;
