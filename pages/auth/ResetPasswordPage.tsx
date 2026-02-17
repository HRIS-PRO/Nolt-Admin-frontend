import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthLayout from '../../components/layouts/AuthLayout';

const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const token = searchParams.get('token');
    const email = searchParams.get('email');

    useEffect(() => {
        if (!token || !email) {
            setStatus('error');
            setMessage('Invalid reset link. Missing token or email.');
        }
    }, [token, email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setStatus('error');
            setMessage('Password must be at least 6 characters');
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            const backendUrl = '';
            await axios.post(`${backendUrl}/auth/reset-password`, {
                token,
                email,
                password
            });
            setStatus('success');
            setMessage('Your password has been reset successfully.');

            // Redirect after a delay
            setTimeout(() => {
                navigate('/login?reset=success');
            }, 3000);

        } catch (error: any) {
            console.error("Reset password error:", error);
            setStatus('error');
            setMessage(error.response?.data?.message || 'Failed to reset password. The link may have expired.');
        }
    };

    if (status === 'success') {
        return (
            <AuthLayout>
                <div className="w-full max-w-md mx-auto p-6 text-center">
                    <div className="bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 p-6 rounded-lg mb-6">
                        <h2 className="text-xl font-bold mb-2">Password Reset Complete</h2>
                        <p>{message}</p>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">You are being redirected to login...</p>
                    <Link to="/login" className="inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors">
                        Go to Login Now
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <div className="w-full max-w-md mx-auto p-6">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reset Password</h1>
                    <p className="mt-2 text-slate-600 dark:text-slate-400">
                        Create a new password for your account.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {status === 'error' && (
                        <div className="bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-3 rounded-md text-sm">
                            {message}
                        </div>
                    )}

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            New Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Confirm New Password
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            required
                            minLength={6}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'loading' || !token}
                        className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {status === 'loading' ? 'Resetting...' : 'Reset Password'}
                    </button>

                    <div className="text-center">
                        <Link to="/login" className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                            Back to Login
                        </Link>
                    </div>
                </form>
            </div>
        </AuthLayout>
    );
};

export default ResetPasswordPage;
