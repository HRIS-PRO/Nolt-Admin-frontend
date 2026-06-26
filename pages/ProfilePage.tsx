
import React, { useState, useEffect, useRef } from 'react';
import { profileService, UserProfile } from '../services/profileService';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { maskValue } from '../utils/maskHelper';
import CameraCapture from '../components/CameraCapture';

const NIGERIAN_STATES = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
    "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", 
    "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
    "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", 
    "Taraba", "Yobe", "Zamfara"
];

type TabType = 'security' | 'personal' | 'residential' | 'bank' | 'selfie';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<Partial<UserProfile>>({
        first_name: '',
        surname: '',
        middle_name: '',
        phone_number: '',
        personal_email: '',
        state_of_origin: '',
        state_of_residence: '',
        address: '',
        bvn: '',
        nin: '',
        date_of_birth: '',
        is_identity_verified: false,
        title: '',
        gender: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [verifyingBank, setVerifyingBank] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('security');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
    const formRef = useRef<HTMLDivElement>(null);

    // Selfie state
    const [showCamera, setShowCamera] = useState(false);
    const [selfieVerified, setSelfieVerified] = useState(false);
    const [selfieLoading, setSelfieLoading] = useState(false);
    const [selfieError, setSelfieError] = useState<string | null>(null);
    const [selfieConfidence, setSelfieConfidence] = useState<number | null>(null);

    const goToTab = (tab: TabType) => {
        setActiveTab(tab);
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    useEffect(() => {
        fetchProfile();
        fetchBanks();
    }, []);

    const fetchBanks = async () => {
        try {
            const res = await profileService.getBanks();
            if (res.success && res.data) {
                setBanks(res.data);
            }
        } catch (err) {
            console.error("Failed to fetch banks", err);
        }
    };

    const fetchProfile = async () => {
        try {
            const response = await profileService.getProfile();
            if (response.success && response.profile) {
                const p = response.profile;
                if (p.date_of_birth) {
                    p.date_of_birth = p.date_of_birth.split('T')[0];
                }
                setProfile(p);
                if (p.selfie_url) {
                    setSelfieVerified(true);
                }
            }
        } catch (err) {
            console.error("Failed to fetch profile:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyBVN = async () => {
        if (!profile.bvn || profile.bvn.length !== 11) {
            setMessage({ type: 'error', text: "Please enter a valid 11-digit BVN first." });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            console.log("[Profile] Pre-verifying BVN:", profile.bvn);
            const response = await profileService.verifyBVN(profile.bvn);
            if (response.success && response.data) {
                const data = response.data;
                // Format DOB for date input if needed
                let formattedDob = data.dob;
                if (formattedDob && formattedDob.includes('T')) {
                    formattedDob = formattedDob.split('T')[0];
                }

                setProfile(prev => ({
                    ...prev,
                    first_name: data.first_name || prev.first_name,
                    surname: data.surname || prev.surname,
                    middle_name: data.middle_name || prev.middle_name,
                    date_of_birth: formattedDob || prev.date_of_birth,
                    phone_number: data.phone_number || prev.phone_number,
                    gender: data.gender || prev.gender
                }));

                setMessage({ type: 'success', text: "BVN verified! Your details have been pre-filled. Please review them in the next tabs." });
                
                // Smoothly transition to personal tab after a short delay
                setTimeout(() => goToTab('personal'), 1500);
            } else {
                setMessage({ type: 'error', text: response.message || "BVN verification failed." });
            }
        } catch (err: any) {
            console.error("[Profile] BVN verification error:", err);
            setMessage({ type: 'error', text: err.response?.data?.message || "BVN lookup failed. Please check your BVN." });
        } finally {
            setSaving(false);
        }
    };

    const handleNextToResidential = () => {
        const requiredFields = [
            'first_name', 'surname', 'phone_number', 'personal_email', 'date_of_birth'
        ];
        
        for (const field of requiredFields) {
            if (!profile[field as keyof UserProfile] || profile[field as keyof UserProfile] === '') {
                setMessage({ type: 'error', text: `Please fill out all required fields to continue (Missing: ${field.replace(/_/g, ' ')})` });
                setTimeout(() => {
                    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
                return;
            }
        }
        
        setMessage(null);
        goToTab('residential');
    };

    const handleNextToBank = () => {
        const requiredFields = [
            'state_of_origin', 'state_of_residence', 'address'
        ];
        
        for (const field of requiredFields) {
            if (!profile[field as keyof UserProfile] || profile[field as keyof UserProfile] === '') {
                setMessage({ type: 'error', text: `Please fill out all residential fields to continue (Missing: ${field.replace(/_/g, ' ')})` });
                setTimeout(() => {
                    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
                return;
            }
        }
        
        setMessage(null);
        goToTab('bank');
    };

    const handleVerifyBankAccount = async () => {
        if (!profile.account_number || !profile.bank_code || !profile.bank_name) {
            setMessage({ type: 'error', text: "Please provide Bank, and Account Number." });
            return;
        }

        setVerifyingBank(true);
        setMessage(null);
        try {
            const bvn_name = `${profile.first_name || ''} ${profile.surname || ''} ${profile.middle_name || ''}`;
            const res = await profileService.verifyBank({
                account_number: profile.account_number,
                bank_code: profile.bank_code,
                bvn_name: bvn_name.trim(),
                is_corporate: profile.is_corporate_account
            });

            if (res.success) {
                const { account_name, isMatch, reason } = res.data;
                setProfile(prev => ({ 
                    ...prev, 
                    account_name, 
                    bank_verified: isMatch && !profile.is_corporate_account
                }));

                if (isMatch) {
                    setMessage({ type: 'success', text: `Account Verified: ${account_name}` });
                } else {
                    setMessage({ type: 'error', text: `Account name mismatch or Corporate Account. Please upload a bank statement. Name found: ${account_name}` });
                }
            } else {
                setMessage({ type: 'error', text: res.message || "Failed to verify account" });
            }
        } catch (err: any) {
            console.error("Bank verify error", err);
            setMessage({ type: 'error', text: err.response?.data?.message || err.message || "Bank verification failed." });
        } finally {
            setVerifyingBank(false);
        }
    };

    const handleSelfieCapture = async (file: File) => {
        setShowCamera(false);
        setSelfieLoading(true);
        setSelfieError(null);
        setSelfieConfidence(null);
        try {
            const res = await profileService.verifySelfie(file, profile.bvn || undefined);
            if (res.success) {
                setSelfieVerified(true);
                setSelfieConfidence(res.confidence ?? null);
                setProfile(prev => ({ ...prev, selfie_url: res.selfie_url }));
            } else {
                setSelfieError(res.message || 'Face does not match. Please try again.');
                setSelfieConfidence(res.confidence ?? null);
            }
        } catch (err: any) {
            setSelfieError(err.response?.data?.message || 'Verification failed. Please try again.');
        } finally {
            setSelfieLoading(false);
        }
    };

    const handleNextToSelfie = () => {
        const requiredFields = ['bank_name', 'account_number'];
        for (const field of requiredFields) {
            if (!profile[field as keyof UserProfile] || profile[field as keyof UserProfile] === '') {
                setMessage({ type: 'error', text: `Please complete your bank details before continuing (Missing: ${field.replace(/_/g, ' ')})` });
                return;
            }
        }
        if (!profile.bank_verified && !profile.bank_statement_url) {
            setMessage({ type: 'error', text: 'Please verify your bank account or upload a bank statement before continuing.' });
            return;
        }
        setMessage(null);
        goToTab('selfie');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Comprehensive Frontend Validation
        const requiredFields = [
            'first_name', 'surname', 'phone_number', 'personal_email', 
            'date_of_birth', 'state_of_origin', 'state_of_residence', 'address',
            'bank_name', 'account_number'
        ];
        
        for (const field of requiredFields) {
            if (!profile[field as keyof UserProfile] || profile[field as keyof UserProfile] === '') {
                setMessage({ type: 'error', text: `Please fill out all required fields (Missing: ${field.replace(/_/g, ' ')})` });
                return;
            }
        }

        if (!profile.bank_verified && !profile.bank_statement_url) {
            setMessage({ type: 'error', text: "Your bank account name does not match or it's a corporate account. You MUST upload a bank statement before completing your profile." });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            // Step 1: Save profile (PUT /api/profile)
            console.log("[Profile] Saving profile:", profile);
            const response = await profileService.updateProfile(profile);
            console.log("[Profile] Update response:", response);
            
            if (!response.success) {
                const errMsg = response.message || "Failed to update profile";
                setMessage({ type: 'error', text: errMsg });
                setSaving(false);
                return;
            }

            setProfile(response.profile);

            // Step 2: Register on Core Banking (POST /api/profile/register-cba)
            try {
                const cbaRes = await profileService.registerCBA();
                if (cbaRes.success) {
                    if (cbaRes.already_exists) {
                        setMessage({ type: 'success', text: `ℹ️ ${cbaRes.message}` });
                    } else {
                        setMessage({ type: 'success', text: `✅ ${cbaRes.message}` });
                    }
                } else {
                    // Profile saved but CBA failed — warn but don't block
                    setMessage({ type: 'error', text: `⚠️ Profile saved, but banking registration failed: ${cbaRes.message}. Please try saving again.` });
                }
            } catch (cbaErr: any) {
                // CBA network error — profile is already saved, just warn
                setMessage({ type: 'error', text: "⚠️ Profile saved, but could not reach Core Banking. Please try saving again." });
            }

            // Dispatch event to instruct App.tsx to refetch profile state from the DB immediately
            window.dispatchEvent(new Event('user-profile-updated'));

            // Navigate back to dashboard
            setTimeout(() => {
                navigate('/dashboard');
            }, 2500);
        } catch (err: any) {
            console.error("[Profile] Update error:", err);
            const errMsg = err.response?.data?.message || err.message || "An error occurred";
            setMessage({ type: 'error', text: errMsg });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const tabVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    };

    return (
        <>
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] pb-20 overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -right-[10%] size-[500px] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute -bottom-[10%] -left-[10%] size-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
            </div>

            <div ref={formRef} className="max-w-5xl mx-auto px-6 pt-16 relative z-10">
                {/* Header Section */}
                <header className="mb-12">
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col md:flex-row md:items-end justify-between gap-8"
                    >
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-1px w-12 bg-primary/30" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Account Center</span>
                            </div>
                            <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-4">
                                My Profile
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm max-w-md leading-relaxed">
                                Manage your identity verification and personal security preferences.
                            </p>
                        </div>

                        {/* Summary Card */}
                        <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 p-4 rounded-3xl flex items-center gap-4 shadow-sm">
                           <div className={`size-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${profile.is_identity_verified ? 'bg-green-500 shadow-green-500/20' : 'bg-amber-500 shadow-amber-500/20'}`}>
                                <span className="material-symbols-outlined text-2xl font-black uppercase">
                                    {profile.is_identity_verified ? 'verified_user' : 'gpp_maybe'}
                                </span>
                           </div>
                           <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</div>
                                <div className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {profile.is_identity_verified ? 'Fully Verified' : 'Action Required'}
                                </div>
                           </div>
                        </div>
                    </motion.div>
                </header>

                {/* Tab Navigation */}
                <div className="flex flex-wrap gap-2 mb-10 bg-slate-100 dark:bg-slate-900/50 p-2 rounded-2xl w-fit">
                    {(['security', 'personal', 'residential', 'bank', 'selfie'] as TabType[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`relative px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === tab ? 'text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
                        >
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-primary rounded-xl shadow-lg shadow-primary/20"
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-1.5">
                                {tab}
                                {tab === 'selfie' && selfieVerified && (
                                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                )}
                            </span>
                        </button>
                    ))}
                </div>

                {message && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`mb-10 p-6 rounded-3xl border-2 flex items-center gap-4 ${message.type === 'success' ? 'bg-green-500/5 border-green-500/10 text-green-600' : 'bg-red-500/5 border-red-500/10 text-red-600'}`}
                    >
                        <span className="material-symbols-outlined font-black">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                        <span className="font-black text-sm uppercase tracking-widest">{message.text}</span>
                    </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Main Content Areas */}
                    <div className="lg:col-span-2">
                        <form onSubmit={handleSave} className="space-y-10">
                            <AnimatePresence mode="wait">
                                {activeTab === 'security' && (
                                    <motion.div
                                        key="security"
                                        variants={tabVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-8"
                                    >
                                        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 space-y-10">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                                    <span className="material-symbols-outlined font-black">lock</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Identity Verification</h3>
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Manage your core identity data</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BVN (11 Digits)</label>
                                                        {profile.is_identity_verified && <span className="text-[9px] bg-green-500/10 text-green-500 font-bold px-2 py-0.5 rounded-full uppercase">Locked</span>}
                                                    </div>
                                                    <input 
                                                        disabled={profile.is_identity_verified}
                                                        type="text" 
                                                        className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-6 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all disabled:opacity-50 tracking-[0.5em]" 
                                                        value={profile.is_identity_verified ? maskValue(profile.bvn) : profile.bvn} 
                                                        onChange={e => setProfile({...profile, bvn: e.target.value.replace(/\D/g, '').substring(0, 11)})} 
                                                        placeholder="..." 
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NIN (11 Digits)</label>
                                                        {profile.is_identity_verified && <span className="text-[9px] bg-green-500/10 text-green-500 font-bold px-2 py-0.5 rounded-full uppercase">Locked</span>}
                                                    </div>
                                                    <input 
                                                        disabled={profile.is_identity_verified}
                                                        className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-6 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all disabled:opacity-50" 
                                                        value={profile.is_identity_verified ? maskValue(profile.nin) : profile.nin} 
                                                        onChange={e => setProfile({...profile, nin: e.target.value.replace(/\D/g, '').substring(0, 11)})} 
                                                        placeholder="Enter NIN" 
                                                    />
                                                </div>
                                            </div>

                                            <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 flex gap-4">
                                                <span className="material-symbols-outlined text-amber-500 font-black">info</span>
                                                <p className="text-[11px] font-bold text-amber-700/80 dark:text-amber-500/80 leading-relaxed uppercase tracking-tight">
                                                    Ensure details match your bank records exactly. Once verified, core identity fields become read-only for your security.
                                                </p>
                                            </div>

                                            {!profile.is_identity_verified && (
                                                <div className="flex justify-end pt-4">
                                                    <button 
                                                        type="button"
                                                        onClick={handleVerifyBVN}
                                                        disabled={saving}
                                                        className="h-14 px-10 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary font-black uppercase tracking-widest text-xs transition-all flex items-center gap-3"
                                                    >
                                                        {saving ? (
                                                            <div className="size-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-sm font-black">check_circle</span>
                                                        )}
                                                        Verify BVN & Auto-fill Details
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'personal' && (
                                    <motion.div
                                        key="personal"
                                        variants={tabVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-8"
                                    >
                                        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 space-y-10">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                    <span className="material-symbols-outlined font-black">person</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Basic Information</h3>
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Public and contact information</p>
                                                </div>
                                            </div>

                                        {/* Title & Gender Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Title</label>
                                                <select
                                                    className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all"
                                                    value={profile.title || ''}
                                                    onChange={e => setProfile({...profile, title: e.target.value})}
                                                >
                                                    <option value="">Select Title</option>
                                                    <option value="Mr">Mr</option>
                                                    <option value="Mrs">Mrs</option>
                                                    <option value="Miss">Miss</option>
                                                    <option value="Ms">Ms</option>
                                                    <option value="Master">Master</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Gender</label>
                                                <select
                                                    className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all"
                                                    value={profile.gender || ''}
                                                    onChange={e => setProfile({...profile, gender: e.target.value})}
                                                >
                                                    <option value="">Select Gender</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Surname</label>
                                                    <input disabled={profile.is_identity_verified} className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all disabled:opacity-50" value={profile.surname} onChange={e => setProfile({...profile, surname: e.target.value})} placeholder="e.g. Obinali" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">First Name</label>
                                                    <input disabled={profile.is_identity_verified} className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all disabled:opacity-50" value={profile.first_name} onChange={e => setProfile({...profile, first_name: e.target.value})} placeholder="e.g. Divine" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Middle Name</label>
                                                    <input disabled={profile.is_identity_verified} className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all disabled:opacity-50" value={profile.middle_name} onChange={e => setProfile({...profile, middle_name: e.target.value})} placeholder="e.g. Chinedu (Optional)" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                                                    <input className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all" value={profile.personal_email} onChange={e => setProfile({...profile, personal_email: e.target.value})} placeholder="Email" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                                                    <input disabled={profile.is_identity_verified} className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all disabled:opacity-50" value={profile.phone_number} onChange={e => setProfile({...profile, phone_number: e.target.value})} placeholder="e.g. 080..." />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date of Birth</label>
                                                    <input type="date" disabled={profile.is_identity_verified} className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all disabled:opacity-50" value={profile.date_of_birth} onChange={e => setProfile({...profile, date_of_birth: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'residential' && (
                                    <motion.div
                                        key="residential"
                                        variants={tabVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-8"
                                    >
                                        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 space-y-10">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                                    <span className="material-symbols-outlined font-black">home_pin</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Regional Details</h3>
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Residency and mailing address</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">State of Origin</label>
                                                    <select className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none" value={profile.state_of_origin} onChange={e => setProfile({...profile, state_of_origin: e.target.value})}>
                                                        <option value="">Select State</option>
                                                        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">State of Residence</label>
                                                    <select className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none" value={profile.state_of_residence} onChange={e => setProfile({...profile, state_of_residence: e.target.value})}>
                                                        <option value="">Select State</option>
                                                        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Residential Address</label>
                                                <textarea rows={4} className="w-full p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none leading-relaxed" value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} placeholder="e.g. 12 Nolt Avenue, VI, Lagos" />
                                            </div>
                                        </div>
                                </motion.div>
                                )}

                                {activeTab === 'bank' && (
                                    <motion.div
                                        key="bank"
                                        variants={tabVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-8"
                                    >
                                        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 space-y-10">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                    <span className="material-symbols-outlined font-black">account_balance</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Bank Details</h3>
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Provide your primary NUBAN account</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Bank Name</label>
                                                    <select 
                                                        disabled={profile.bank_verified}
                                                        className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none disabled:opacity-50" 
                                                        value={profile.bank_code || ''} 
                                                        onChange={e => {
                                                            const code = e.target.value;
                                                            const bank = banks.find(b => b.code === code);
                                                            setProfile({...profile, bank_code: code, bank_name: bank?.name || ''});
                                                        }}
                                                    >
                                                        <option value="">Select Bank</option>
                                                        {banks.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Account Number</label>
                                                    <input 
                                                        disabled={profile.bank_verified}
                                                        type="text"
                                                        maxLength={10}
                                                        className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none disabled:opacity-50" 
                                                        value={profile.account_number || ''} 
                                                        onChange={e => setProfile({...profile, account_number: e.target.value.replace(/\D/g, '')})} 
                                                        placeholder="e.g. 0123456789" 
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <input 
                                                    disabled={profile.bank_verified}
                                                    type="checkbox" 
                                                    id="is_corporate" 
                                                    className="size-5 rounded border-slate-300 text-primary focus:ring-primary"
                                                    checked={profile.is_corporate_account || false}
                                                    onChange={e => setProfile({...profile, is_corporate_account: e.target.checked})}
                                                />
                                                <label htmlFor="is_corporate" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                    This is a Corporate / Company Account
                                                </label>
                                            </div>

                                            {!profile.bank_verified && profile.account_number?.length === 10 && profile.bank_code && (
                                                <div className="flex justify-start">
                                                    <button 
                                                        type="button"
                                                        onClick={handleVerifyBankAccount}
                                                        disabled={verifyingBank}
                                                        className="h-12 px-8 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2"
                                                    >
                                                        {verifyingBank ? 'Verifying...' : 'Verify Account Name'}
                                                    </button>
                                                </div>
                                            )}

                                            {profile.account_name && (
                                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Name</p>
                                                    <p className="font-bold text-slate-900 dark:text-white">{profile.account_name}</p>
                                                </div>
                                            )}

                                            {(!profile.bank_verified && profile.account_name) || profile.is_corporate_account ? (
                                                <div className="space-y-3 p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20">
                                                    <p className="text-xs font-bold text-amber-600 dark:text-amber-500 leading-relaxed">
                                                        You must upload a bank statement for manual verification because this is a corporate account or the name does not match exactly.
                                                    </p>
                                                    <input 
                                                        type="file" 
                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                        onChange={async (e) => {
                                                            if (e.target.files && e.target.files[0]) {
                                                                const file = e.target.files[0];
                                                                const formData = new FormData();
                                                                formData.append('document', file);
                                                                try {
                                                                    const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/upload`, {
                                                                        method: 'POST',
                                                                        body: formData
                                                                    });
                                                                    const data = await res.json();
                                                                    if (data.url) {
                                                                        setProfile({...profile, bank_statement_url: data.url});
                                                                    }
                                                                } catch (error) {
                                                                    console.error(error);
                                                                }
                                                            }
                                                        }}
                                                        className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                                    />
                                                    {profile.bank_statement_url && <p className="text-xs text-green-500 font-bold mt-2">Statement Uploaded!</p>}
                                                </div>
                                            ) : null}

                                            {profile.bank_verified && (
                                                <div className="flex items-center gap-2 text-green-500 font-bold bg-green-500/10 p-4 rounded-2xl">
                                                    <span className="material-symbols-outlined">check_circle</span>
                                                    <span>Bank Account Successfully Verified</span>
                                                </div>
                                            )}

                                        </div>
                                    </motion.div>
                                )}
                                {activeTab === 'selfie' && (
                                    <motion.div
                                        key="selfie"
                                        variants={tabVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-8"
                                    >
                                        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 space-y-10">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                                    <span className="material-symbols-outlined font-black">face</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Selfie Verification</h3>
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Match your face to your BVN record</p>
                                                </div>
                                            </div>

                                            {selfieVerified ? (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="flex flex-col items-center gap-6 py-8"
                                                >
                                                    <div className="size-24 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-5xl text-emerald-500">verified_user</span>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xl font-black text-slate-900 dark:text-white mb-2">Identity Confirmed</p>
                                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                                            Your face has been matched to your BVN record
                                                            {selfieConfidence !== null && ` (${selfieConfidence.toFixed(0)}% confidence)`}
                                                        </p>
                                                    </div>
                                                    {profile.selfie_url && (
                                                        <div className="size-28 rounded-3xl overflow-hidden border-4 border-emerald-500/20 shadow-xl">
                                                            <img src={profile.selfie_url} alt="Verified selfie" className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => { setSelfieVerified(false); setSelfieError(null); setShowCamera(true); }}
                                                        className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest underline transition-colors"
                                                    >
                                                        Retake Photo
                                                    </button>
                                                </motion.div>
                                            ) : (
                                                <div className="space-y-8">
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                                        {[
                                                            { icon: 'light_mode', text: 'Ensure your face is well-lit' },
                                                            { icon: 'face', text: 'Remove glasses or face coverings' },
                                                            { icon: 'center_focus_strong', text: 'Look directly at the camera' }
                                                        ].map(item => (
                                                            <div key={item.icon} className="flex flex-col items-center gap-3 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl text-center">
                                                                <span className="material-symbols-outlined text-3xl text-primary">{item.icon}</span>
                                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">{item.text}</p>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {selfieError && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className="p-6 rounded-3xl bg-red-500/5 border border-red-500/10 flex items-start gap-4"
                                                        >
                                                            <span className="material-symbols-outlined text-red-500 font-black shrink-0">error</span>
                                                            <div>
                                                                <p className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-tight">{selfieError}</p>
                                                                {selfieConfidence !== null && selfieConfidence > 0 && (
                                                                    <p className="text-xs font-bold text-red-400 mt-1">Confidence: {selfieConfidence.toFixed(0)}%</p>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}

                                                    <div className="flex justify-center">
                                                        <button
                                                            type="button"
                                                            disabled={selfieLoading}
                                                            onClick={() => { setSelfieError(null); setShowCamera(true); }}
                                                            className="h-16 px-12 rounded-2xl font-black text-white uppercase tracking-[0.2em] text-xs transition-all active:scale-95 flex items-center gap-4 bg-primary shadow-xl shadow-primary/30 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                                        >
                                                            {selfieLoading ? (
                                                                <>
                                                                    <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                                    Verifying...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                                                                    {selfieError ? 'Try Again' : 'Open Camera'}
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex justify-end pt-4">
                                {activeTab === 'personal' && (
                                    <button 
                                        type="button"
                                        onClick={handleNextToResidential}
                                        disabled={saving}
                                        className="h-16 px-12 rounded-2xl font-black text-white uppercase tracking-[0.2em] text-xs transition-all active:scale-95 flex items-center gap-4 bg-slate-800 dark:bg-white/10 shadow-xl shadow-slate-900/20 hover:-translate-y-1"
                                    >
                                        Next: Residential Details
                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </button>
                                )}
                                
                                {activeTab === 'residential' && (
                                    <button
                                        type="button"
                                        onClick={handleNextToBank}
                                        disabled={saving}
                                        className="h-16 px-12 rounded-2xl font-black text-white uppercase tracking-[0.2em] text-xs transition-all active:scale-95 flex items-center gap-4 bg-slate-800 dark:bg-white/10 shadow-xl shadow-slate-900/20 hover:-translate-y-1"
                                    >
                                        Next: Bank Details
                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </button>
                                )}

                                {activeTab === 'bank' && (
                                    <button
                                        type="button"
                                        onClick={handleNextToSelfie}
                                        disabled={saving}
                                        className="h-16 px-12 rounded-2xl font-black text-white uppercase tracking-[0.2em] text-xs transition-all active:scale-95 flex items-center gap-4 bg-slate-800 dark:bg-white/10 shadow-xl shadow-slate-900/20 hover:-translate-y-1"
                                    >
                                        Next: Selfie Verification
                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </button>
                                )}

                                {activeTab === 'selfie' && selfieVerified && (
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className={`h-16 px-12 rounded-2xl font-black text-white uppercase tracking-[0.2em] text-xs transition-all active:scale-95 flex items-center gap-4 ${saving ? 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed opacity-50' : 'bg-primary shadow-xl shadow-primary/30 hover:-translate-y-1'}`}
                                    >
                                        {saving ? (
                                            <>
                                                <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                Updating Profile...
                                            </>
                                        ) : (
                                            <>
                                                Complete & Save Profile
                                                <span className="material-symbols-outlined text-sm">save</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Sidebar / Stats Card */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                <span className="material-symbols-outlined text-[100px]">shield</span>
                            </div>
                            
                            <h4 className="text-lg font-black uppercase tracking-widest mb-6 relative z-10">Verification Tier</h4>
                            
                            <div className="space-y-6 relative z-10">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Level 1</span>
                                    <span className="text-xs font-black text-primary uppercase">Completed</span>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: profile.is_identity_verified ? '100%' : '60%' }}
                                        className="h-full bg-primary"
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">
                                    {profile.is_identity_verified 
                                        ? "Congratulations! Your identity is fully verified. You can now access all NOLT products."
                                        : "Complete your profile verification to unlock access to NOLT Investments and Loans."}
                                </p>
                            </div>
                        </div>

                        {!profile.is_identity_verified && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10"
                            >
                                <span className="material-symbols-outlined text-primary text-3xl mb-4 block">info_i</span>
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed uppercase tracking-tight">
                                    Identity verification is mandatory for all financial transactions to comply with regulatory standards.
                                </p>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <AnimatePresence>
            {showCamera && (
                <CameraCapture
                    label="Selfie Verification"
                    onCapture={handleSelfieCapture}
                    onClose={() => setShowCamera(false)}
                />
            )}
        </AnimatePresence>
        </>
    );
};

export default ProfilePage;
