import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { investmentService } from '../../services/investmentService';

const VerifyGiftPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [giftToken, setGiftToken] = useState<string>('');
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const reference = searchParams.get('reference');
        if (!reference) {
            setStatus('error');
            setError('Missing payment reference');
            return;
        }

        const verify = async () => {
            try {
                const response = await investmentService.verifyGift(reference);
                if (response.success) {
                    setGiftToken(response.token);
                    setStatus('success');
                } else {
                    throw new Error(response.message || 'Verification failed');
                }
            } catch (err: any) {
                console.error(err);
                setStatus('error');
                setError(err.message || 'Payment verification failed');
            }
        };

        verify();
    }, [searchParams]);

    if (status === 'verifying') {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
                <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <h2 className="text-2xl font-black dark:text-white">Verifying Gift Payment...</h2>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-6">
                <div className="size-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl">error</span>
                </div>
                <h2 className="text-3xl font-black dark:text-white">Payment Failed</h2>
                <p className="text-slate-500 max-w-md">{error}</p>
                <button onClick={() => navigate('/investment')} className="px-8 py-4 bg-primary text-white font-black rounded-2xl shadow-lg">Try Again</button>
            </div>
        );
    }

    const giftLink = `${window.location.origin}/claim-gift?token=${giftToken}`;

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-10 text-center px-6 animate-in fade-in zoom-in duration-500">
            <div className="size-24 bg-green-500 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-green-500/20 animate-bounce">
                <span className="material-symbols-outlined text-5xl">celebration</span>
            </div>
            <div className="space-y-4">
                <h2 className="text-5xl font-black dark:text-white tracking-tight">Gift Created! 🎉</h2>
                <p className="text-xl text-slate-500 max-w-lg mx-auto">Your investment gift has been successfully processed. Here is your magic link to share.</p>
            </div>

            <div className="w-full max-w-xl p-8 rounded-[3rem] bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 text-left space-y-4">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest ml-2">Secure Shareable Link</p>
                <div className="flex gap-2">
                    <input readOnly className="flex-1 h-16 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 font-bold dark:text-white text-sm" value={giftLink} />
                    <button onClick={() => { navigator.clipboard.writeText(giftLink); alert('Link Copied!'); }} className="px-8 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all">Copy</button>
                </div>
            </div>

            <button onClick={() => navigate('/dashboard')} className="text-slate-500 font-bold uppercase tracking-widest hover:text-primary transition-colors">Back to Dashboard</button>
        </div>
    );
};

export default VerifyGiftPage;
