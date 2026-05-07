import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { formatDate, formatDateTime } from '../../utils/dateFormatter';
import { maskValue } from '../../utils/maskHelper';

interface CustomerDetailsDrawerProps {
    customerId: number | null;
    onClose: () => void;
}

interface CustomerProfile {
    id: number;
    full_name: string;
    email: string;
    mobile_number?: string;
    state_of_residence?: string;
    employer?: string;
    avatar_url?: string;
    role: string;
    bvn?: string;
    nin?: string;
    date_of_birth?: string;
    primary_home_address?: string;
    bank_name?: string;
    account_number?: string;
    is_active: boolean;
    created_at: string;
    account_name?: string;
    gender?: string;
    marital_status?: string;
    religion?: string;
    state_of_origin?: string;
    residential_status?: string;
    ippis_number?: string;
    staff_id?: string;
    average_monthly_income?: string;
    mda_tertiary?: string;
    personal_email?: string;
    phone_number?: string;
    bank_verified?: boolean;
    bank_statement_url?: string;
    is_corporate_account?: boolean;
    is_identity_verified?: boolean;
    selfie_verification_url?: string;
    kyc_tier?: number;
    tier_3_status?: string;
}

interface Investment {
    id: number;
    investment_amount: number;
    status: string;
    created_at: string;
    investment_type: string;
}

interface Loan {
    id: number;
    requested_loan_amount: number;
    status: string;
    created_at: string;
    loan_type: string;
}

interface Document {
    type: string;
    url: string;
    date: string;
}

const CustomerDetailsDrawer: React.FC<CustomerDetailsDrawerProps> = ({ customerId, onClose }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'loans' | 'investments' | 'documents'>('overview');
    const [profile, setProfile] = useState<CustomerProfile | null>(null);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isApproving, setIsApproving] = useState(false);

    useEffect(() => {
        if (customerId) {
            fetchDetails(customerId);
        }
    }, [customerId]);

    const fetchDetails = async (id: number) => {
        setIsLoading(true);
        try {
            const res = await axios.get(`/api/staff/customers/${id}`, { withCredentials: true });
            setProfile(res.data.profile);
            setLoans(res.data.loans);
            setInvestments(res.data.investments || []);
            setDocuments(res.data.documents);
        } catch (error) {
            console.error("Failed to fetch customer details", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyBank = async () => {
        if (!customerId || !profile) return;
        if (!window.confirm("Are you sure you want to approve these bank details?")) return;

        try {
            const res = await axios.put(`/api/staff/customers/${customerId}/verify-bank`, {}, { withCredentials: true });
            if (res.data.success) {
                alert("Bank details manually verified.");
                setProfile({ ...profile, bank_verified: true });
            }
        } catch (error: any) {
            console.error("Failed to verify bank details", error);
            alert(error.response?.data?.message || "Verification failed");
        }
    };

    const handleApproveTier3 = async () => {
        if (!customerId || !profile) return;
        if (!window.confirm("Are you sure you want to approve this customer for Tier 3? This will increase their investment limits.")) return;

        setIsApproving(true);
        try {
            const res = await axios.patch(`/api/staff/kyc/approve-tier-3`, { customerId }, { withCredentials: true });
            if (res.data.success) {
                alert("Customer upgraded to Tier 3 successfully!");
                setProfile({ ...profile, kyc_tier: 3, tier_3_status: 'verified' });
            }
        } catch (error: any) {
            console.error("Failed to approve Tier 3", error);
            alert(error.response?.data?.message || "Approval failed");
        } finally {
            setIsApproving(false);
        }
    };

    if (!customerId) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Drawer */}
            <div className="relative w-full max-w-md bg-white dark:bg-[#1e293b] h-full shadow-2xl flex flex-col transform transition-transform duration-300 animate-slide-in-right">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full size-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : profile ? (
                    <>
                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex justify-between items-start mb-4">
                                <button onClick={onClose} className="p-2 -ml-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                    <span className="material-symbols-outlined text-slate-500">close</span>
                                </button>
                                <div className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${profile.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {profile.is_active ? 'Active' : 'Inactive'}
                                </div>
                            </div>

                                <div className="flex items-center gap-4">
                                    <div className="size-16 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border-2 border-white dark:border-slate-600 shadow-sm">
                                        {profile.avatar_url ? (
                                            <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-slate-500">
                                                {profile.full_name ? profile.full_name[0] : '?'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="text-xl font-black text-slate-900 dark:text-white truncate">{profile.full_name}</h2>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                                profile.kyc_tier === 3 ? 'bg-blue-600 text-white shadow-sm' :
                                                profile.kyc_tier === 2 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                                'bg-slate-100 text-slate-600 dark:bg-slate-700'
                                            }`}>
                                                Tier {profile.kyc_tier || 0}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{profile.personal_email || profile.email}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {profile.employer && (
                                            <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                                                <span className="material-symbols-outlined text-[14px]">work</span>
                                                {profile.employer}
                                            </div>
                                        )}
                                        {profile.is_identity_verified && (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-black uppercase tracking-wider border border-green-500/20">
                                                <span className="material-symbols-outlined text-[12px]">verified</span>
                                                Verified
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 dark:border-slate-700">
                            {['overview', 'loans', 'investments', 'documents'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors border-b-2 ${activeTab === tab
                                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                                {activeTab === 'overview' && (
                                    <div className="space-y-8">
                                        {profile.tier_3_status === 'pending' && (
                                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 border border-amber-200 dark:border-amber-800/50 shadow-sm animate-pulse-subtle mb-6">
                                                <div className="flex items-start gap-4">
                                                    <div className="p-3 bg-white dark:bg-amber-900 rounded-xl text-amber-600 dark:text-amber-400 shadow-sm">
                                                        <span className="material-symbols-outlined">assignment_late</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-xs font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider mb-1">Tier 3 Review Required</h3>
                                                        <p className="text-amber-800 dark:text-amber-200/70 text-xs font-medium leading-relaxed mb-4">
                                                            Customer has requested a Tier 3 upgrade. Please review their address and uploaded documents before approving.
                                                        </p>
                                                        <button 
                                                            onClick={handleApproveTier3}
                                                            disabled={isApproving}
                                                            className="w-full py-2.5 rounded-xl bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50"
                                                        >
                                                            {isApproving ? 'Approving...' : 'Approve Tier 3 Upgrade'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-800">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-white dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-400 shadow-sm">
                                                <span className="material-symbols-outlined">location_on</span>
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black uppercase text-blue-500 dark:text-blue-400 tracking-wider mb-1">Primary Residence</h3>
                                                <p className="text-slate-900 dark:text-white font-medium text-sm leading-relaxed">
                                                    {profile.primary_home_address || 'No address provided'}
                                                </p>
                                                <div className="mt-2 text-xs text-slate-500 font-bold">{profile.state_of_residence} State</div>
                                            </div>
                                        </div>
                                    </div>

                                    <Section title="Contact & Identity">
                                        <InfoItem label="Mobile" value={profile.mobile_number || profile.phone_number} icon="call" />
                                        <InfoItem label="Email" value={profile.personal_email || profile.email} icon="mail" />
                                        <InfoItem 
                                            label="BVN" 
                                            value={profile.is_identity_verified ? maskValue(profile.bvn) : profile.bvn} 
                                            icon="fingerprint" 
                                            verified={profile.is_identity_verified}
                                        />
                                        <InfoItem 
                                            label="NIN" 
                                            value={profile.is_identity_verified ? maskValue(profile.nin) : profile.nin} 
                                            icon="badge" 
                                            verified={profile.is_identity_verified}
                                        />
                                        <InfoItem label="Date of Birth" value={formatDate(profile.date_of_birth)} icon="cake" />
                                    </Section>
                                    
                                    {(profile.promotion_source || profile.hear_about_us || profile.marketing_officer) && (
                                        <Section title="Acquisition Details">
                                            <InfoItem label="Marketing Source" value={profile.promotion_source || profile.hear_about_us} icon="campaign" />
                                            <InfoItem label="UTM Medium" value={profile.promotion_medium} icon="ads_click" />
                                            <InfoItem label="Campaign" value={profile.promotion_campaign} icon="label" />
                                            <InfoItem label="Referral Code" value={profile.marketing_referral} icon="group_add" />
                                            <InfoItem label="Assigned Officer" value={profile.marketing_officer} icon="person_pin" />
                                        </Section>
                                    )}

                                    {profile.selfie_verification_url && (
                                        <Section title="Identity Verification">
                                            <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Live Captured Selfie</p>
                                                <div className="group relative aspect-square w-full max-w-[200px] mx-auto rounded-2xl overflow-hidden border-4 border-slate-50 dark:border-slate-800 shadow-lg">
                                                    <img 
                                                        src={profile.selfie_verification_url} 
                                                        alt="Selfie" 
                                                        className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <a 
                                                            href={profile.selfie_verification_url} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined">zoom_in</span>
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </Section>
                                    )}

                                    <Section title="Financial Details">
                                        <InfoItem label="Bank Name" value={profile.bank_name} icon="account_balance" />
                                        <InfoItem label="Account Number" value={profile.account_number} icon="numbers" />
                                        <InfoItem label="Account Name" value={profile.account_name} icon="person" />
                                        
                                        <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Bank Status</span>
                                                {profile.bank_verified ? (
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold rounded-full uppercase">Verified</span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-bold rounded-full uppercase">Pending Review</span>
                                                )}
                                            </div>
                                            
                                            {profile.is_corporate_account && (
                                                <div className="mb-3 text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">business</span>
                                                    Corporate Account
                                                </div>
                                            )}

                                            {!profile.bank_verified && profile.bank_statement_url && (
                                                <div className="space-y-3">
                                                    <a 
                                                        href={profile.bank_statement_url} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="w-full h-10 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">visibility</span>
                                                        View Bank Statement
                                                    </a>
                                                    <button 
                                                        onClick={handleVerifyBank}
                                                        className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                                        Approve Bank Details
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </Section>

                                    <Section title="Employment Details">
                                        <InfoItem label="Employer" value={profile.mda_tertiary || profile.employer} icon="business" />
                                        <InfoItem label="MDA/Institution" value={profile.mda_tertiary} icon="account_balance" />
                                        <InfoItem label="IPPIS Number" value={profile.ippis_number} icon="tag" />
                                        <InfoItem label="Staff ID" value={profile.staff_id} icon="badge" />
                                        <InfoItem label="Monthly Income" value={profile.average_monthly_income ? `₦${Number(profile.average_monthly_income).toLocaleString()}` : undefined} icon="payments" />
                                    </Section>

                                    <Section title="Additional Information">
                                        <InfoItem label="Gender" value={profile.gender} icon="person" />
                                        <InfoItem label="Marital Status" value={profile.marital_status} icon="favorite" />
                                        <InfoItem label="Religion" value={profile.religion} icon="church" />
                                        <InfoItem label="State of Origin" value={profile.state_of_origin} icon="flag" />
                                        <InfoItem label="Residential Status" value={profile.residential_status} icon="home" />
                                    </Section>
                                </div>
                            )}

                            {activeTab === 'loans' && (
                                <div className="space-y-4">
                                    {loans.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                                <span className="material-symbols-outlined text-2xl">credit_card_off</span>
                                            </div>
                                            <p className="text-slate-500 font-medium">No loan history available.</p>
                                        </div>
                                    ) : (
                                        loans.map(loan => (
                                            <div key={loan.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                                            {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(loan.requested_loan_amount))}
                                                        </div>
                                                        <div className="text-xs text-slate-500 font-medium font-mono">
                                                            Applied: {formatDateTime(loan.created_at)}
                                                        </div>
                                                    </div>
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${loan.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                        loan.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                            'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                                        }`}>
                                                        {loan.status}
                                                    </span>
                                                </div>
                                                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                                    <span className="text-xs text-slate-400 font-bold">{loan.loan_type?.toUpperCase() || 'LOAN'}</span>
                                                    <span className="text-xs text-blue-500 font-bold cursor-pointer hover:underline">View Details</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'investments' && (
                                <div className="space-y-4">
                                    {investments.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                                <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                                            </div>
                                            <p className="text-slate-500 font-medium">No investment history available.</p>
                                        </div>
                                    ) : (
                                        investments.map(inv => (
                                            <div key={inv.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                                            {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(inv.investment_amount))}
                                                        </div>
                                                        <div className="text-xs text-slate-500 font-medium font-mono">
                                                            Applied: {formatDateTime(inv.created_at)}
                                                        </div>
                                                    </div>
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${inv.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                        inv.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                            'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                                        }`}>
                                                        {inv.status}
                                                    </span>
                                                </div>
                                                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                                    <span className="text-xs text-slate-400 font-bold">{inv.investment_type?.replace(/_/g, ' ') || 'INVESTMENT'}</span>
                                                    <span className="text-xs text-blue-500 font-bold cursor-pointer hover:underline">View Details</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'documents' && (
                                <div className="space-y-3">
                                    {documents.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                                <span className="material-symbols-outlined text-2xl">folder_off</span>
                                            </div>
                                            <p className="text-slate-500 font-medium">No documents uploaded.</p>
                                        </div>
                                    ) : (
                                        documents.map((doc, idx) => (
                                            <a
                                                key={idx}
                                                href={doc.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group bg-white dark:bg-slate-800/50"
                                            >
                                                <div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                                    <span className="material-symbols-outlined">description</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors truncate">
                                                        {doc.type}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-medium font-mono">
                                                        Uploaded: {formatDateTime(doc.date)}
                                                    </div>
                                                </div>
                                                <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-500 transition-colors text-lg">open_in_new</span>
                                            </a>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="p-6 text-center text-red-500">Failed to load profile.</div>
                )}
            </div>
        </div>
    );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3 px-1">{title}</h3>
        <div className="space-y-0.5">{children}</div>
    </div>
);

const InfoItem: React.FC<{ label: string; value?: string; icon?: string; verified?: boolean }> = ({ label, value, icon, verified }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
        <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
            <span className="material-symbols-outlined text-sm">{icon || 'info'}</span>
        </div>
        <div className="flex-1">
            <div className="flex items-center gap-2">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">{label}</p>
                {verified && (
                    <span className="text-[8px] font-black text-green-500 bg-green-500/10 px-1 py-0.5 rounded uppercase tracking-[0.1em] border border-green-500/20">Verified</span>
                )}
            </div>
            <p className="font-bold text-slate-900 dark:text-slate-200 text-[13px] font-mono">{value || 'N/A'}</p>
        </div>
    </div>
);

export default CustomerDetailsDrawer;
