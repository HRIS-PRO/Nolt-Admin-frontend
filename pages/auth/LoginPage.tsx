
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface LoginPageProps {
    onLogin: (email: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
            const { data } = await axios.post(`${backendUrl}/auth/login`, {
                email,
                password
            }, { withCredentials: true });

            if (data.requireOtp) {
                navigate('/verify', { state: { email } });
            } else {
                // Fallback if no OTP required (though our backend enforces it)
                onLogin(email);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        // Use relative path for proxy (dev & prod) or fallback to env/localhost
        const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
        window.location.href = `${backendUrl}/auth/google`;
    };

    return (
        <>
            <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Welcome back
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-base">
                    Log in to manage your portfolio.
                </p>
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

                {error && (
                    <div className="p-4 bg-red-50 text-red-500 text-sm font-bold rounded-xl border border-red-100 mb-4 animate-in fade-in">
                        {error}
                    </div>
                )}

                <button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-full transition-all transform active:scale-[0.98] shadow-lg shadow-primary/20 mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? (
                        <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <>
                            Sign In
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </>
                    )}
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
                    New to NOLT?{' '}
                    <Link to="/register" className="text-primary font-bold hover:underline">
                        Create an Account
                    </Link>
                </p>
            </form>
        </>
    );
};

export default LoginPage;
