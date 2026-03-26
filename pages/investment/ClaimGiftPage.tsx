import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const ClaimGiftPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [giftDetails, setGiftDetails] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            navigate('/dashboard');
            return;
        }

        const fetchDetails = async () => {
            try {
                const response = await fetch(`/api/investments/claim-gift/${token}`);
                if (response.ok) {
                    const data = await response.json();
                    setGiftDetails(data);
                    
                    if (data.status === 'paid') {
                        // ONLY store for persistence if it's actually claimable
                        localStorage.setItem('pending_gift_token', token);
                    } else if (data.status === 'claimed') {
                        // Clean up if we find it's already used
                        localStorage.removeItem('pending_gift_token');
                        sessionStorage.removeItem('pending_gift_token');
                    }
                }
            } catch (err) {
                console.error("Failed to fetch gift details", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [searchParams, navigate]);

    const handleClaim = () => {
        const token = localStorage.getItem('pending_gift_token');
        navigate(`/investment?gift_token=${token}`);
    };

    const isClaimed = giftDetails?.status === 'claimed';

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Unwrapping your gift...</p>
                </div>
            </div>
        );
    }

    if (!giftDetails) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-6">
                    <span className="material-symbols-outlined text-6xl text-slate-300">error</span>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Gift Link Invalid</h2>
                    <p className="text-slate-500 font-medium">This link appears to be broken or expired. Please check with the person who sent it to you.</p>
                    <button onClick={() => navigate('/dashboard')} className="px-8 py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black">Go to Dashboard</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
            <div className={`max-w-md w-full bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl overflow-hidden border border-white/20 relative animate-in fade-in zoom-in duration-500 ${isClaimed ? 'grayscale-[0.5]' : ''}`}>
                <div className={`p-12 text-white text-center relative ${isClaimed ? 'bg-slate-400' : 'bg-gradient-to-r from-rose-500 to-pink-600'}`}>
                    <div className="absolute top-0 right-0 size-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="size-24 bg-white/20 rounded-3xl mx-auto flex items-center justify-center backdrop-blur-md border border-white/30 mb-6 scale-110 shadow-xl">
                        <span className="material-symbols-outlined text-6xl">{isClaimed ? 'check_circle' : 'redeem'}</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight mb-2">
                        {isClaimed ? 'Already Claimed!' : "You've Got a Gift! 🎁"}
                    </h1>
                    <p className="text-white/80 font-medium tracking-wide uppercase text-xs">
                        {isClaimed ? 'This investment is already active' : 'A special investment awaits you'}
                    </p>
                </div>

                <div className="p-10 space-y-8">
                    {!isClaimed ? (
                        <div className="space-y-6">
                            <div className="text-center space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gift Amount</p>
                                <p className="text-4xl font-black text-slate-900 dark:text-white">
                                    {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(parseFloat(giftDetails.amount))}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-6 border-y border-slate-100 dark:border-slate-700">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Product</p>
                                    <p className="font-bold dark:text-white">{giftDetails.plan_name?.includes('NOLT') ? giftDetails.plan_name : `NOLT ${giftDetails.plan_name}`}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tenure</p>
                                    <p className="font-bold dark:text-white">{giftDetails.tenure_months} Months</p>
                                </div>
                            </div>

                            {giftDetails.gift_message && (
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Personal Message</p>
                                    <p className="text-slate-600 dark:text-slate-300 italic font-medium leading-relaxed">"{giftDetails.gift_message}"</p>
                                </div>
                            )}

                            <button
                                onClick={handleClaim}
                                className="w-full py-5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black text-xl shadow-xl shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                Claim My Investment
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-center space-y-4">
                                <p className="text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                                    This gift has already been claimed and added to an account. If you were the one who claimed it, you can view it in your applications list.
                                </p>
                                <div className="flex justify-center gap-1 text-rose-500">
                                    {[1,2,3].map(i => <span key={i} className="material-symbols-outlined text-sm">favorite</span>)}
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/dashboard')}
                                className="w-full py-5 rounded-2xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                Go to Dashboard
                                <span className="material-symbols-outlined">dashboard</span>
                            </button>
                        </div>
                    )}

                    <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Powered by NOLT Finance</p>
                </div>
            </div>
        </div>
    );
};

export default ClaimGiftPage;
