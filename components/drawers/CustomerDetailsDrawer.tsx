import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { formatDate } from '../../utils/dateFormatter';

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
    monthly_income?: string;
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
    const [activeTab, setActiveTab] = useState<'overview' | 'loans' | 'documents'>('overview');
    const [profile, setProfile] = useState<CustomerProfile | null>(null);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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
            setDocuments(res.data.documents);
        } catch (error) {
            console.error("Failed to fetch customer details", error);
        } finally {
            setIsLoading(false);
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
                                            {profile.full_name[0]}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white">{profile.full_name}</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{profile.email}</p>
                                    {profile.employer && (
                                        <div className="flex items-center gap-1 mt-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                                            <span className="material-symbols-outlined text-[14px]">work</span>
                                            {profile.employer}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 dark:border-slate-700">
                            {['overview', 'loans', 'documents'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === tab
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
                                        <InfoItem label="Mobile" value={profile.mobile_number} icon="call" />
                                        <InfoItem label="Email" value={profile.email} icon="mail" />
                                        <InfoItem label="BVN" value={profile.bvn} icon="fingerprint" />
                                        <InfoItem label="NIN" value={profile.nin} icon="badge" />
                                        <InfoItem label="Date of Birth" value={formatDate(profile.date_of_birth)} icon="cake" />
                                    </Section>

                                    <Section title="Financial Details">
                                        <InfoItem label="Bank Name" value={profile.bank_name} icon="account_balance" />
                                        <InfoItem label="Account Number" value={profile.account_number} icon="numbers" />
                                        <InfoItem label="Account Name" value={profile.account_name} icon="person" />
                                    </Section>

                                    <Section title="Employment Details">
                                        <InfoItem label="Employer" value={profile.employer} icon="business" />
                                        <InfoItem label="MDA/Institution" value={profile.employer} icon="account_balance" />
                                        <InfoItem label="IPPIS Number" value={profile.ippis_number} icon="tag" />
                                        <InfoItem label="Staff ID" value={profile.staff_id} icon="badge" />
                                        <InfoItem label="Monthly Income" value={profile.monthly_income ? `₦${Number(profile.monthly_income).toLocaleString()}` : undefined} icon="payments" />
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
                                                        <div className="text-xs text-slate-500 font-medium">
                                                            Applied on {formatDate(loan.created_at)}
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
                                                    <div className="text-[10px] text-slate-400 font-medium">
                                                        Uploaded: {formatDate(doc.date)}
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

const InfoItem: React.FC<{ label: string; value?: string; icon?: string }> = ({ label, value, icon }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
        <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
            <span className="material-symbols-outlined text-sm">{icon || 'info'}</span>
        </div>
        <div className="flex-1">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</p>
            <p className="font-medium text-slate-900 dark:text-slate-200 text-sm">{value || 'N/A'}</p>
        </div>
    </div>
);

export default CustomerDetailsDrawer;
