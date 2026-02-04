
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const RegisterPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Navigate to verification page with email in state
        navigate('/verify', { state: { email } });
    };

    const handleGoogleLogin = () => {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        window.location.href = `${backendUrl}/auth/google`;
    };

    return (
        <>
            <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Create your account
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-base">
                    Start your financial journey with us today.
                </p>
            </div>

            <div className="flex items-center gap-2 mb-2">
                <span className="h-1.5 w-12 rounded-full transition-all duration-300 bg-primary shadow-[0_0_8px_rgba(2,143,245,0.4)]"></span>
                <span className="h-1.5 w-12 rounded-full transition-all duration-300 bg-slate-200 dark:bg-slate-700"></span>
                <span className="h-1.5 w-12 rounded-full transition-all duration-300 bg-slate-200 dark:bg-slate-700"></span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
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

                <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-full transition-all transform active:scale-[0.98] shadow-lg shadow-primary/20 mt-2 flex items-center justify-center gap-2">
                    Create Account
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
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary font-bold hover:underline">
                        Log in
                    </Link>
                </p>
            </form>
        </>
    );
};

export default RegisterPage;
