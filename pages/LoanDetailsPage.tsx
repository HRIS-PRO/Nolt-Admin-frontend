import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StaffLayout from '../components/layouts/StaffLayout';
import axios from 'axios';

interface LoanDetailsPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const LoanDetailsPage: React.FC<LoanDetailsPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loan, setLoan] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLoan = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/staff/loans/${id}`, { withCredentials: true });
                setLoan(response.data);
            } catch (error) {
                console.error("Failed to fetch loan details", error);
                // navigate('/staff/loans');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchLoan();
    }, [id, navigate]);

    if (isLoading) {
        return (
            <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </StaffLayout>
        );
    }

    if (!loan) {
        return (
            <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
                <div className="text-center py-20">
                    <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300">Loan not found</h2>
                    <button onClick={() => navigate('/staff/loans')} className="mt-4 text-primary font-bold hover:underline">Return to Queue</button>
                </div>
            </StaffLayout>
        );
    }

    const stages = [
        { id: 'submitted', label: 'Submission', icon: 'send' },
        { id: 'customer_experience', label: 'Customer Validation', icon: 'assignment_ind' }, // "Customer Experience"
        { id: 'credit_check', label: 'Credit Checks', icon: 'analytics' }, // "Credit 2 stages" -> Check
        { id: 'internal_control', label: 'Request for Payment', icon: 'wallet' }, // "Internal Control" -> "Finance" flow... mapping loosely to user req
        { id: 'disbursed', label: 'Disbursed', icon: 'check_circle' }
    ];

    // Simple mapping logic for stage progress
    // If loan.stage matches an ID, that and all before match.
    // If loan.stage is 'onboarding', only first is active? Or 'pending'?
    // Let's assume linear progression for visualization.
    const currentStageIndex = stages.findIndex(s => s.id === (loan.stage || 'submitted'));
    const safeStageIndex = currentStageIndex === -1 ? 0 : currentStageIndex;

    const DetailGroup = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6">
            <h3 className="text-xl font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">{title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {children}
            </div>
        </div>
    );

    const Field = ({ label, value, isLink = false }: { label: string, value: any, isLink?: boolean }) => (
        <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
            {isLink && value ? (
                <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline break-all flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    View Document
                </a>
            ) : (
                <p className="font-bold text-slate-900 dark:text-white text-lg break-words">{value || <span className="text-slate-400 italic">N/A</span>}</p>
            )}
        </div>
    );

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            {/* Header / Nav */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/staff/loans')} className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                        <span onClick={() => navigate('/staff/loans')} className="cursor-pointer hover:text-primary">Return to List</span>
                        <span>/</span>
                        <span>Loan Details</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {loan.applicant_full_name} <span className="text-slate-400 font-medium text-lg">#{loan.id}</span>
                    </h1>
                </div>
                <div className="ml-auto flex gap-3">
                    <button className="px-4 py-2 rounded-lg bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider">
                        Edit Details
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold uppercase tracking-wider">
                        Re-assign Owner
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold uppercase tracking-wider hover:bg-red-500 hover:text-white transition-all">
                        Reject Loan
                    </button>
                </div>
            </div>

            {/* Stage Tracker */}
            <div className="bg-[#0f172a] rounded-3xl p-8 md:p-12 mb-8 shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex md:justify-between items-center relative">
                        {/* Progress Line Background */}
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-700 -translate-y-1/2 z-0 hidden md:block"></div>

                        {/* Progress Line Fill */}
                        <div className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 hidden md:block transition-all duration-1000" style={{ width: `${(safeStageIndex / (stages.length - 1)) * 100}%` }}></div>

                        {stages.map((stage, idx) => {
                            const isCompleted = idx <= safeStageIndex;
                            const isCurrent = idx === safeStageIndex;

                            return (
                                <div key={stage.id} className="relative z-10 flex flex-col items-center gap-4 group">
                                    <div className={`size-14 rounded-2xl flex items-center justify-center transition-all duration-500 border-4 ${isCompleted ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-100' : 'bg-slate-800 border-slate-700 text-slate-500 scale-90'}`}>
                                        <span className="material-symbols-outlined text-2xl">{stage.icon}</span>
                                    </div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest text-center max-w-[100px] transition-colors ${isCompleted ? 'text-white' : 'text-slate-600'}`}>
                                        {stage.label}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {/* Decor */}
                <div className="absolute top-0 right-0 w-[500px] h-full bg-primary/5 blur-3xl rounded-full translate-x-1/2"></div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">

                {/* Left Column: Loan Summary & Header Card */}
                <div className="xl:col-span-3 space-y-6">

                    <div className="bg-[#0f172a] rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
                        <div className="flex items-center gap-6">
                            <div className="size-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-inner flex items-center justify-center">
                                {loan.officer_avatar ? <img src={loan.officer_avatar} className="size-full object-cover rounded-2xl" /> : <span className="material-symbols-outlined text-white text-4xl">person</span>}
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white uppercase tracking-tight">{loan.applicant_full_name}</h2>
                                <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">#{loan.id} • {loan.mda_tertiary ? 'Public Sector (IPPIS)' : 'Personal Loan'}</p>
                            </div>
                        </div>
                        <div className="text-right bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Principal Requested</p>
                            <h2 className="text-4xl font-black text-primary">₦{Number(loan.requested_loan_amount).toLocaleString()}</h2>
                        </div>
                    </div>

                    {/* Internal Control / Officer Info */}
                    <div className="bg-[#0f172a] rounded-xl p-6 border border-slate-800 flex flex-col md:flex-row justify-between gap-6 text-sm">
                        <div>
                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Linked Sales Officer</p>
                            <div className="flex items-center gap-2 text-white font-bold">
                                <span className="material-symbols-outlined text-xs">badge</span>
                                {loan.officer_name || 'Unassigned'}
                            </div>
                        </div>
                        <div>
                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Referral Code Used</p>
                            <p className="text-white font-bold">{loan.referral_code || '-'}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Application Source</p>
                            <p className="text-white font-bold">{loan.referral_code ? 'REFERRED_LINK' : 'ORGANIC_DASHBOARD'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Step ID</p>
                            <p className="text-white font-bold">STEP {safeStageIndex}</p>
                        </div>
                    </div>

                </div>

                {/* Left Column: Form Details */}
                <div className="xl:col-span-2 space-y-8">

                    <DetailGroup title="Personal Information">
                        <Field label="Full Name" value={loan.applicant_full_name} />
                        <Field label="Title" value={loan.title} />
                        <Field label="Gender" value={loan.gender} />
                        <Field label="Date of Birth" value={loan.date_of_birth} />
                        <Field label="Marital Status" value={loan.marital_status} />
                        <Field label="Religion" value={loan.religion} />
                        <Field label="Mother's Maiden Name" value={loan.mothers_maiden_name} />
                        <Field label="PEP Status" value={loan.is_politically_exposed ? 'Yes' : 'No'} />
                    </DetailGroup>

                    <DetailGroup title="Contact Details">
                        <Field label="Mobile Number" value={loan.mobile_number} />
                        <Field label="Email Address" value={loan.personal_email} />
                        <Field label="Home Address" value={loan.primary_home_address} />
                        <Field label="Residential Status" value={loan.residential_status} />
                        <Field label="State of Residence" value={loan.state_of_residence} />
                        <Field label="State of Origin" value={loan.state_of_origin} />
                    </DetailGroup>

                    <DetailGroup title="Financial Information">
                        <Field label="Avg. Monthly Income" value={`₦${Number(loan.average_monthly_income).toLocaleString()}`} />
                        <Field label="Dependents" value={loan.number_of_dependents} />
                        <Field label="Active Loans?" value={loan.has_active_loans ? 'Yes' : 'No'} />
                        <Field label="BVN" value={loan.bvn} />
                        <Field label="NIN" value={loan.nin} />
                        {loan.mda_tertiary && (
                            <>
                                <Field label="MDA / Tertiary" value={loan.mda_tertiary} />
                                <Field label="IPPIS Number" value={loan.ippis_number} />
                            </>
                        )}
                    </DetailGroup>

                    <DetailGroup title="Documents & Proofs">
                        <Field label="Government ID" value={loan.govt_id_url} isLink />
                        <Field label="Bank Statement" value={loan.statement_of_account_url} isLink />
                        <Field label="Proof of Residence" value={loan.proof_of_residence_url} isLink />
                        <Field label="Selfie Verification" value={loan.selfie_verification_url} isLink />
                    </DetailGroup>

                    {loan.customer_references && (
                        <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-6">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">References</h3>
                            <div className="grid grid-cols-1 gap-4">
                                {(loan.customer_references as any[]).map((ref, idx) => (
                                    <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{ref.fullName}</p>
                                            <p className="text-xs text-slate-500 font-medium">{ref.relationship}</p>
                                        </div>
                                        <p className="font-mono text-slate-700 dark:text-slate-300 text-sm">{ref.phoneNumber}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Actions / Timeline */}
                <div className="xl:col-span-1 space-y-6">
                    <div className="bg-[#0f172a] rounded-3xl border border-slate-800 p-6">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-slate-800 pb-4 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">history</span>
                            Operation Log
                        </h3>
                        <div className="py-12 text-center">
                            <div className="size-16 bg-slate-800 rounded-2xl mx-auto flex items-center justify-center text-slate-600 mb-4">
                                <span className="material-symbols-outlined text-2xl">content_paste_off</span>
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">No activity logged yet</p>
                        </div>
                    </div>

                    <div className="bg-blue-600 text-white rounded-3xl p-8 shadow-xl shadow-blue-600/20 relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">Next Step Action</p>
                            <h3 className="text-2xl font-black mb-6">Validate Customer</h3>
                            <p className="text-sm opacity-90 mb-6 font-medium leading-relaxed">Ensure all KYC documents are valid and match the provided details. Once verified, move to Credit Check.</p>
                            <button className="w-full py-4 rounded-xl bg-white text-blue-600 font-black text-sm uppercase tracking-wide hover:bg-white/90 transition-all">
                                Approve & Next Stage
                            </button>
                        </div>
                        <div className="absolute -bottom-12 -right-12 size-48 bg-white/10 blur-3xl rounded-full"></div>
                    </div>
                </div>

            </div>
        </StaffLayout>
    );
};

export default LoanDetailsPage;
