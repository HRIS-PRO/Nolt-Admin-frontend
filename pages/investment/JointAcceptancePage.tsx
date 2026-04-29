import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthLayout from '../../components/layouts/AuthLayout';

const JointAcceptancePage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [invitation, setInvitation] = useState<any>(null);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        // Check if user is logged in
        const checkUser = async () => {
            try {
                const { data } = await axios.get('/api/me');
                setUser(data);
            } catch (err) {
                // Not logged in. Save token and redirect immediately.
                if (token) localStorage.setItem('pending_joint_token', token);
                navigate('/login');
            }
        };
        checkUser();
    }, [navigate, token]);

    useEffect(() => {
        const fetchInvitation = async () => {
            if (!token) {
                setError("No invitation token provided.");
                setIsLoading(false);
                return;
            }
            try {
                const response = await axios.get(`/api/investments/joint/validate/${token}`);
                setInvitation(response.data);
            } catch (err: any) {
                setError(err.response?.data?.message || "Invalid or expired invitation link.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchInvitation();
    }, [token]);

    const handleContinue = () => {
        // Logged in, go to Investment Flow with joint_token
        // Remove the pending token so it doesn't trigger again
        localStorage.removeItem('pending_joint_token');
        navigate(`/investment?joint_token=${token}`);
    };

    if (isLoading) {
        return (
            <AuthLayout>
                <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-md mx-auto">
                    <div className="size-16 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-purple-600 animate-spin mb-4"></div>
                    <p className="text-slate-500 font-bold">Verifying Invitation...</p>
                </div>
            </AuthLayout>
        );
    }

    if (error || !invitation) {
        return (
            <AuthLayout>
                <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-md mx-auto text-center border border-red-100 dark:border-red-900/30">
                    <div className="size-16 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-3xl">error</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Invalid Link</h2>
                    <p className="text-slate-500 mb-8 font-medium">{error}</p>
                    <button onClick={() => navigate('/')} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl">
                        Return Home
                    </button>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <div className="w-full max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-[32px] p-8 md:p-12 shadow-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-center mb-6">
                    <div className="size-16 rounded-2xl bg-gradient-to-tr from-green-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                        <span className="material-symbols-outlined text-3xl">check_circle</span>
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Invitation Verified</h1>
                    <p className="text-slate-500">
                        You have been invited by <span className="font-bold text-slate-900 dark:text-white">{invitation.initiator_name || 'your partner'}</span> to join an investment application.
                    </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 mb-8 border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
                        <span className="text-sm font-bold text-slate-500">Investment Amount</span>
                        <span className="font-black text-lg text-slate-900 dark:text-white">NGN {Number(invitation.investment_amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
                        <span className="text-sm font-bold text-slate-500">Plan Type</span>
                        <span className="font-bold text-slate-900 dark:text-white capitalize">{invitation.investment_type?.replace(/_/g, ' ')}</span>
                    </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-6 mb-8 border border-purple-100 dark:border-purple-900/30">
                    <h3 className="font-black text-purple-900 dark:text-purple-100 mb-2">Next Steps</h3>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                        To accept this invitation and complete the joint investment, you will need to fill out your KYC (Know Your Customer) profile.
                    </p>
                </div>

                <button
                    onClick={handleContinue}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-black rounded-xl text-sm uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-purple-500/20 flex items-center justify-center gap-2"
                >
                    Continue to KYC Form
                    <span className="material-symbols-outlined">arrow_forward</span>
                </button>
            </div>
        </AuthLayout>
    );
};

export default JointAcceptancePage;
