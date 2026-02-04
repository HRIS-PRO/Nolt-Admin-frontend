import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface OnboardingPageProps {
    onComplete: (email: string) => void;
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || '';

    const [source, setSource] = useState('');
    const [officerName, setOfficerName] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [referralError, setReferralError] = useState('');
    const [isOfficerDisabled, setIsOfficerDisabled] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const handleReferralBlur = async () => {
        if (!referralCode.trim()) {
            setReferralError('');
            setIsOfficerDisabled(false);
            setOfficerName('');
            return;
        }

        setIsValidating(true);
        setReferralError('');

        try {
            const { data } = await axios.get(`${backendUrl}/api/referral/${referralCode}`);
            setOfficerName(data.full_name);
            setIsOfficerDisabled(true);
        } catch (error) {
            setReferralError('Invalid referral code');
            setOfficerName('');
            setIsOfficerDisabled(false);
        } finally {
            setIsValidating(false);
        }
    };

    const handleAcquisitionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (referralError) return;

        setIsSubmitting(true);
        try {
            await axios.post(`${backendUrl}/api/marketing`, {
                hear_about_us: source,
                referral_code: referralCode,
                officer_name: officerName
            }, { withCredentials: true });

            onComplete(email);
        } catch (error) {
            console.error("Failed to submit marketing data", error);
        } finally {
            setIsSubmitting(false);
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

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Help us grow
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-base">
                    How did you hear about our offers?
                </p>
            </div>

            <div className="flex items-center gap-2 mb-2">
                <span className="h-1.5 w-12 rounded-full transition-all duration-300 bg-primary shadow-[0_0_8px_rgba(2,143,245,0.4)]"></span>
                <span className="h-1.5 w-12 rounded-full transition-all duration-300 bg-primary shadow-[0_0_8px_rgba(2,143,245,0.4)]"></span>
                <span className="h-1.5 w-12 rounded-full transition-all duration-300 bg-primary shadow-[0_0_8px_rgba(2,143,245,0.4)]"></span>
            </div>

            <form onSubmit={handleAcquisitionSubmit} className="flex flex-col gap-8">
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
                        <label className="text-sm font-bold text-slate-700 dark:text-white ml-1">Referral Code (Optional)</label>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">loyalty</span>
                            <input
                                className={`w-full bg-white dark:bg-slate-800 border ${referralError ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-full px-4 pl-12 h-14 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-all`}
                                placeholder="Enter Code"
                                value={referralCode}
                                onChange={(e) => setReferralCode(e.target.value)}
                                onBlur={handleReferralBlur}
                            />
                            {isValidating && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                        {referralError && <p className="text-xs text-red-500 ml-4 font-bold">{referralError}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-white ml-1">Officer Name</label>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">badge</span>
                            <input
                                className="w-full bg-white dark:bg-slate-800 disabled:bg-slate-100 dark:disabled:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-4 pl-12 h-14 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-all"
                                placeholder="Enter Officer's Name"
                                value={officerName}
                                onChange={(e) => setOfficerName(e.target.value)}
                                disabled={true}
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || !!referralError || isValidating}
                    className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-full transition-all transform active:scale-[0.98] shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <>
                            Complete Registration
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};
export default OnboardingPage;
