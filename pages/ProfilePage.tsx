
import React, { useState, useEffect, useRef } from 'react';
import { profileService, UserProfile } from '../services/profileService';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const NIGERIAN_STATES = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
    "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", 
    "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
    "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", 
    "Taraba", "Yobe", "Zamfara"
];

type TabType = 'security' | 'personal' | 'residential';

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
        is_identity_verified: false
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('security');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const formRef = useRef<HTMLDivElement>(null);

    const goToTab = (tab: TabType) => {
        setActiveTab(tab);
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await profileService.getProfile();
            if (response.success && response.profile) {
                const p = response.profile;
                if (p.date_of_birth) {
                    p.date_of_birth = p.date_of_birth.split('T')[0];
                }
                setProfile(p);
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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Comprehensive Frontend Validation
        const requiredFields = [
            'first_name', 'surname', 'phone_number', 'personal_email', 
            'date_of_birth', 'state_of_origin', 'state_of_residence', 'address'
        ];
        
        for (const field of requiredFields) {
            if (!profile[field as keyof UserProfile] || profile[field as keyof UserProfile] === '') {
                setMessage({ type: 'error', text: `Please fill out all required fields (Missing: ${field.replace(/_/g, ' ')})` });
                return;
            }
        }

        setSaving(true);
        setMessage(null);

        try {
            console.log("[Profile] Saving profile:", profile);
            const response = await profileService.updateProfile(profile);
            console.log("[Profile] Update response:", response);
            
            if (response.success) {
                setMessage({ type: 'success', text: "Profile updated successfully! Redirecting..." });
                setProfile(response.profile);
                
                // Navigate back to dashboard after a short delay to show success message
                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);
            } else {
                const errMsg = response.message || "Failed to update profile";
                setMessage({ type: 'error', text: errMsg });
                alert(errMsg);
            }
        } catch (err: any) {
            console.error("[Profile] Update error:", err);
            const errMsg = err.response?.data?.message || err.message || "An error occurred";
            setMessage({ type: 'error', text: errMsg });
            alert(errMsg);
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
                    {(['security', 'personal', 'residential'] as TabType[]).map((tab) => (
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
                            <span className="relative z-10">{tab}</span>
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
                                                        className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-6 text-base font-bold dark:text-white focus:border-primary outline-none transition-all disabled:opacity-50 tracking-[0.5em]" 
                                                        value={profile.bvn} 
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
                                                        className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-6 text-base font-bold dark:text-white focus:border-primary outline-none transition-all disabled:opacity-50" 
                                                        value={profile.nin} 
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

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Surname</label>
                                                    <input disabled={profile.is_identity_verified} className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:border-primary outline-none transition-all disabled:opacity-50" value={profile.surname} onChange={e => setProfile({...profile, surname: e.target.value})} placeholder="Surname" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">First Name</label>
                                                    <input disabled={profile.is_identity_verified} className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:border-primary outline-none transition-all disabled:opacity-50" value={profile.first_name} onChange={e => setProfile({...profile, first_name: e.target.value})} placeholder="First Name" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Middle Name</label>
                                                    <input disabled={profile.is_identity_verified} className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:border-primary outline-none transition-all disabled:opacity-50" value={profile.middle_name} onChange={e => setProfile({...profile, middle_name: e.target.value})} placeholder="Optional" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                                                    <input className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:border-primary outline-none transition-all" value={profile.personal_email} onChange={e => setProfile({...profile, personal_email: e.target.value})} placeholder="Email" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                                                    <input disabled={profile.is_identity_verified} className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:border-primary outline-none transition-all disabled:opacity-50" value={profile.phone_number} onChange={e => setProfile({...profile, phone_number: e.target.value})} placeholder="Phone" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date of Birth</label>
                                                    <input type="date" disabled={profile.is_identity_verified} className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:border-primary outline-none transition-all disabled:opacity-50" value={profile.date_of_birth} onChange={e => setProfile({...profile, date_of_birth: e.target.value})} />
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
                                                    <select className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:border-primary outline-none" value={profile.state_of_origin} onChange={e => setProfile({...profile, state_of_origin: e.target.value})}>
                                                        <option value="">Select State</option>
                                                        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">State of Residence</label>
                                                    <select className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 px-5 text-base font-bold dark:text-white focus:border-primary outline-none" value={profile.state_of_residence} onChange={e => setProfile({...profile, state_of_residence: e.target.value})}>
                                                        <option value="">Select State</option>
                                                        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Residential Address</label>
                                                <textarea rows={4} className="w-full p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 text-base font-bold dark:text-white focus:border-primary outline-none leading-relaxed" value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} placeholder="Street name, house number, area..." />
                                            </div>
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
                                                Update Profile Details
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
    );
};

export default ProfilePage;
