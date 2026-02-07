import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StaffLayout from '../components/layouts/StaffLayout';
import ActivityTimeline from '../components/ActivityTimeline';
import DocumentsList from '../components/DocumentsList';
import axios from 'axios';


interface LoanDetailsPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

// --- Action Card Component ---
// Refined to be cleaner and less "bright" while maintaining professional feel
const ActionCard = ({ loan, userRole, onActionComplete }: { loan: any, userRole: any, onActionComplete: () => void }) => {
    const [actionLoading, setActionLoading] = useState(false);
    const [eligibleAmount, setEligibleAmount] = useState('');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadLoading, setUploadLoading] = useState(false);

    const handleAction = async (action: 'approve' | 'reject' | 'return') => {
        setActionLoading(true);
        try {
            await axios.post(
                `${''}/api/staff/loans/${loan.id}/action`,
                { action, data: { eligible_amount: eligibleAmount } },
                { withCredentials: true }
            );
            onActionComplete();
        } catch (error: any) {
            alert(error.response?.data?.message || "Action failed");
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!uploadFile) return;
        setUploadLoading(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('loan_id', loan.id);
        formData.append('document_type', 'proof_of_address'); // Defaulting, could be improved with select

        try {
            await axios.post(`${''}/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            });
            setUploadFile(null);
            alert("Document uploaded successfully");
            onActionComplete(); // Refresh everything
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed");
        } finally {
            setUploadLoading(false);
        }
    };


    const stage = loan.stage || 'submitted';

    // --- VISIBILITY CHECK ---
    const isAllowed = (() => {
        if (userRole === 'super_admin' || userRole === 'superadmin') return true;

        switch (stage) {
            case 'submitted':
            case 'customer_experience': return ['customer_experience', 'customer_service'].includes(userRole);
            case 'credit_check_1': return userRole === 'sales_officer';
            case 'credit_check_2': return ['credit_manager', 'sales_manager'].includes(userRole);
            case 'internal_audit': return userRole === 'internal_audit';
            case 'finance': return userRole === 'finance';
            default: return false;
        }
    })();

    if (stage === 'rejected' || loan.status === 'rejected') {
        return (
            <div className="bg-red-50 dark:bg-red-900/10 rounded-[24px] p-6 border border-red-200 dark:border-red-900/20 text-center">
                <span className="material-symbols-outlined text-3xl text-red-500 mb-2">cancel</span>
                <p className="font-bold text-red-700 dark:text-red-400 mb-1">Application Rejected</p>
                <p className="text-xs text-red-600/80 dark:text-red-400/70">This loan application has been rejected and closed.</p>
            </div>
        );
    }

    if (!isAllowed) {
        return (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[24px] p-6 border border-slate-200 dark:border-slate-800 text-center opacity-75">
                <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">lock</span>
                <p className="font-bold text-slate-900 dark:text-white mb-1">View Only</p>
                <p className="text-xs text-slate-500">This loan is currently with the <strong>{stage.replace(/_/g, ' ').toUpperCase()}</strong> team.</p>
            </div>
        );
    }

    // --- CONTENT ---
    return (
        <div className="bg-white dark:bg-[#1e293b] rounded-[32px] p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden group">
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                    <span className="size-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Action Required</p>
                </div>

                <h3 className="text-2xl font-black mb-2 capitalize text-slate-900 dark:text-white">
                    {stage.replace(/_/g, ' ')} Review
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium leading-relaxed">
                    You have permission to process this application.
                </p>

                {/* Special Input for Sales Manager (Credit Check 2) */}
                {stage === 'credit_check_2' && (
                    <div className="mb-6">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Approved Amount (₦)</label>
                        <input
                            type="number"
                            value={eligibleAmount}
                            onChange={(e) => setEligibleAmount(e.target.value)}
                            placeholder="Enter amount..."
                            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                    </div>
                )}

                {/* Upload for Sales Officer (Credit Check 1) */}
                {stage === 'credit_check_1' && (userRole === 'sales_officer' || userRole === 'super_admin' || userRole === 'superadmin') && (
                    <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Upload Supporting Document</label>
                        <div className="flex gap-2">
                            <input
                                type="file"
                                onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                                className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            {uploadFile && (
                                <button
                                    onClick={handleUpload}
                                    disabled={uploadLoading}
                                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {uploadLoading ? 'Uploading...' : 'Upload'}
                                </button>
                            )}
                        </div>
                    </div>
                )}


                <div className="space-y-3">
                    <button
                        onClick={() => handleAction('approve')}
                        disabled={actionLoading || (stage === 'credit_check_2' && !eligibleAmount)}
                        className="w-full py-4 rounded-xl bg-blue-600 text-white font-black text-sm uppercase tracking-wider hover:bg-blue-700 hover:-translate-y-1 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                    >
                        {actionLoading ? <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Approve & Proceed'}
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleAction('return')}
                            disabled={actionLoading || stage === 'customer_experience'}
                            className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                        >
                            Return
                        </button>
                        <button
                            onClick={() => handleAction('reject')}
                            disabled={actionLoading}
                            className="w-full py-3 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider hover:bg-red-100 dark:hover:bg-red-900/20 transition-all border border-red-200 dark:border-red-900/20"
                        >
                            Reject
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Page Component ---
const LoanDetailsPage: React.FC<LoanDetailsPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loan, setLoan] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLoan = async () => {
            try {
                const response = await axios.get(`${''}/api/staff/loans/${id}`, { withCredentials: true });
                setLoan(response.data);
            } catch (error) {
                console.error("Failed to fetch loan details", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchLoan();
    }, [id, navigate]);

    if (isLoading) {
        return (
            <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
                <div className="flex items-center justify-center h-[60vh] bg-slate-50 dark:bg-[#0f172a] rounded-[32px] border border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col items-center gap-6">
                        <div className="size-16 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 animate-spin"></div>
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm animate-pulse">Loading Application...</p>
                    </div>
                </div>
            </StaffLayout>
        );
    }

    if (!loan) {
        return (
            <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
                <div className="flex flex-col items-center justify-center h-[60vh] text-center bg-white dark:bg-[#1e293b] rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl p-12">
                    <div className="size-24 rounded-3xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6 shadow-inner">
                        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">folder_off</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Application Not Found</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md text-lg leading-relaxed">The loan application you are looking for might have been moved, deleted, or you may lack permissions.</p>
                    <button onClick={() => navigate('/staff/loans')} className="px-8 py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 hover:-translate-y-1 transition-all shadow-lg shadow-blue-500/30">Back to Queue</button>
                </div>
            </StaffLayout>
        );
    }

    // Stages Config
    const stages = [
        { id: 'submitted', label: 'Submission', icon: 'send' },
        { id: 'customer_experience', label: 'Review', icon: 'support_agent' },
        { id: 'credit_check_1', label: 'Credit I', icon: 'manage_search' },
        { id: 'credit_check_2', label: 'Credit II', icon: 'manage_search' },
        { id: 'internal_audit', label: 'Audit', icon: 'policy' },
        { id: 'finance', label: 'Finance', icon: 'payments' },
        { id: 'disbursed', label: 'Disbursed', icon: 'check_circle' }
    ];

    const currentStageId = loan.stage || 'submitted';
    const currentStageIndex = stages.findIndex(s => s.id === (currentStageId === 'credit_check' ? 'credit_check_1' : currentStageId));
    // ^ Fallback for older data if stage was generic 'credit_check'
    const activeIndex = currentStageIndex === -1 ? 0 : currentStageIndex;

    // --- Collapsible UI Components ---
    const CollapsibleGroup = ({ title, icon, children, defaultOpen = false }: { title: string, icon: string, children: React.ReactNode, defaultOpen?: boolean }) => {
        const [isOpen, setIsOpen] = useState(defaultOpen);

        return (
            <div className="bg-white dark:bg-[#1e293b] rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-between p-6 cursor-pointer select-none bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className={`size-10 rounded-xl flex items-center justify-center transition-colors ${isOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                            <span className="material-symbols-outlined text-xl">{icon}</span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{title}</h3>
                    </div>
                    <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}>
                        keyboard_arrow_down
                    </span>
                </div>

                <div className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                        <div className="p-8 pt-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 border-t border-slate-100 dark:border-slate-800/50">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const DetailGroup = ({ title, children, icon }: { title: string, children: React.ReactNode, icon: string }) => (
        <CollapsibleGroup title={title} icon={icon} defaultOpen={false}>
            {children}
        </CollapsibleGroup>
    );

    const Field = ({ label, value, isLink = false, copy = false }: { label: string, value: any, isLink?: boolean, copy?: boolean }) => (
        <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                {label}
                {copy && value && (
                    <span
                        onClick={() => {
                            navigator.clipboard.writeText(value.toString());
                            // Small toast logic could go here
                        }}
                        className="material-symbols-outlined text-[10px] cursor-pointer hover:text-blue-500 transition-colors bg-slate-100 dark:bg-slate-800 p-1 rounded-md"
                        title="Copy"
                    >
                        content_copy
                    </span>
                )}
            </p>
            {isLink && value ? (
                <a href={value} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all w-full md:w-fit min-w-[300px]">
                    <div className="size-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-blue-500 shadow-sm border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-xl">description</span>
                    </div>
                    <div className="flex flex-col flex-1">
                        <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">View Document</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 group-hover:text-blue-500/70">
                            Opens in new tab
                            <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                        </span>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-500 dark:text-slate-600 transition-colors">chevron_right</span>
                </a>
            ) : (
                <p className="font-bold text-slate-900 dark:text-white text-base leading-relaxed break-words font-heading">
                    {value ? value.toString() : <span className="text-slate-300 dark:text-slate-600 italic font-normal text-sm">Not provided</span>}
                </p>
            )}
        </div>
    );

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            {/* Header & Breadcrumb */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/staff/loans')} className="size-12 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm hover:shadow-md">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            <span onClick={() => navigate('/staff/loans')} className="cursor-pointer hover:text-blue-500 transition-colors">Queue</span>
                            <span className="text-slate-300 dark:text-slate-700">/</span>
                            <span className="text-blue-500">Application #{loan.id}</span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                            {loan.applicant_full_name}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Stage Tracker */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[24px] p-8 mb-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden group transition-colors duration-300">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 dark:bg-blue-600/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

                <div className="relative z-10 overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
                    <div className="flex justify-between items-start relative min-w-[700px] px-4">
                        {/* Connecting Line */}
                        <div className="absolute top-[26px] left-0 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full z-0 block"></div>

                        {/* Progressive Fill Line */}
                        <div
                            className="absolute top-[26px] left-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400 rounded-full z-0 block transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                            style={{ width: `${(activeIndex / (stages.length - 1)) * 100}%` }}
                        ></div>

                        {stages.map((stage, idx) => {
                            const isCompleted = idx < activeIndex; // Past stages
                            const isActive = idx === activeIndex;   // Current blinking stage
                            const isPending = idx > activeIndex;    // Future stages

                            return (
                                <div key={stage.id} className="relative z-10 flex flex-col items-center gap-3 w-24 group/stage">
                                    {/* Icon Circle */}
                                    <div className={`
                                        size-12 rounded-xl flex items-center justify-center transition-all duration-500 border-[3px] relative
                                        ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20' : ''}
                                        ${isActive ? 'bg-white dark:bg-slate-900 border-white dark:border-slate-800 text-blue-600 shadow-[0_0_0_4px_rgba(59,130,246,0.1)] scale-110 z-20 ring-2 ring-blue-100 dark:ring-blue-900/30' : ''}
                                        ${isPending ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600' : ''}
                                    `}>
                                        <span className={`material-symbols-outlined text-xl ${isActive ? 'animate-pulse' : ''}`}>
                                            {isCompleted ? 'check' : stage.icon}
                                        </span>
                                    </div>

                                    {/* Label */}
                                    <div className={`text-center transition-all duration-500 flex flex-col items-center gap-1 ${isActive ? '-translate-y-1' : ''}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-blue-600 dark:text-blue-400' : isCompleted ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-600 group-hover/stage:text-slate-500 dark:group-hover/stage:text-slate-500'}`}>
                                            {stage.label}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                {/* Left Column: Loan Summary & Form Data */}
                <div className="xl:col-span-8 space-y-8 animate-in slide-in-from-bottom-8 duration-700 delay-100">

                    {/* Key Info Card - Adaptive Theme */}
                    <div className="bg-white dark:bg-slate-900 rounded-[24px] p-8 text-slate-900 dark:text-white shadow-sm hover:shadow-md transition-all relative overflow-hidden border border-slate-200 dark:border-slate-800 group">
                        {/* Subtle top light */}
                        <div className="absolute -top-24 right-0 w-[500px] h-[500px] bg-blue-50/50 dark:bg-slate-800/50 blur-[80px] rounded-full pointer-events-none transition-colors duration-300"></div>

                        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="size-20 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-500">
                                    <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-white transition-colors">account_balance_wallet</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                                            {loan.id ? `REF-${loan.id}` : 'PENDING-ID'}
                                        </span>
                                        <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20 animate-pulse-slow">
                                            Active Application
                                        </span>
                                    </div>
                                    <h2 className="text-3xl font-black mb-1 tracking-tight text-slate-900 dark:text-white">{loan.applicant_full_name}</h2>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium text-xs flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                                        Applied on {new Date(loan.created_at || Date.now()).toLocaleDateString('en-US', { dateStyle: 'long' })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 min-w-[200px]">
                                {/* Requested Amount */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Requested</p>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1">
                                        ₦{Number(loan.requested_loan_amount).toLocaleString()}
                                        <span className="text-xs font-bold text-slate-400 ml-1">NGN</span>
                                    </h3>
                                </div>

                                {/* Eligible Amount (Only show if approved/set) */}
                                {loan.eligible_amount && (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Approved Amount</p>
                                            <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                                        </div>
                                        <h3 className="text-3xl font-black text-emerald-700 dark:text-white tracking-tight flex items-baseline gap-1">
                                            ₦{Number(loan.eligible_amount).toLocaleString()}
                                            <span className="text-xs font-bold text-emerald-600/70 dark:text-emerald-500/70 ml-1">NGN</span>
                                        </h3>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <DetailGroup title="Personal Information" icon="person">
                        <Field label="Full Name" value={loan.applicant_full_name} copy />
                        <Field label="Gender" value={loan.gender} />
                        <Field label="Date of Birth" value={loan.date_of_birth} />
                        <Field label="Marital Status" value={loan.marital_status} />
                        <Field label="Religion" value={loan.religion} />
                        <Field label="Mother's Maiden Name" value={loan.mothers_maiden_name} />
                        <Field label="PEP Status" value={loan.is_politically_exposed ? 'Yes, Exposed' : 'No'} />
                        <Field label="Title" value={loan.title} />
                    </DetailGroup>

                    <DetailGroup title="Contact Data" icon="call">
                        <Field label="Mobile Number" value={loan.mobile_number} copy />
                        <Field label="Email Address" value={loan.personal_email} copy />
                        <Field label="Primary Address" value={loan.primary_home_address} />
                        <Field label="Residential Status" value={loan.residential_status} />
                        <Field label="State of Residence" value={loan.state_of_residence} />
                        <Field label="State of Origin" value={loan.state_of_origin} />
                    </DetailGroup>

                    <DetailGroup title="Financial Profile" icon="trending_up">
                        <Field label="Monthly Income" value={`₦${Number(loan.average_monthly_income).toLocaleString()}`} />
                        <Field label="Number of Dependents" value={loan.number_of_dependents} />
                        <Field label="Has Active Loans?" value={loan.has_active_loans ? 'Yes' : 'No'} />
                        <Field label="Bank Verification Number (BVN)" value={loan.bvn} copy />
                        <Field label="National ID (NIN)" value={loan.nin} copy />
                        {loan.mda_tertiary && (
                            <>
                                <Field label="MDA / Tertiary Institution" value={loan.mda_tertiary} />
                                <Field label="IPPIS Number" value={loan.ippis_number} copy />
                            </>
                        )}
                    </DetailGroup>

                    <DetailGroup title="Documentation" icon="folder_special">
                        <Field label="Government ID" value={loan.govt_id_url} isLink />
                        <Field label="Bank Statement" value={loan.statement_of_account_url} isLink />
                        <Field label="Proof of Residence" value={loan.proof_of_residence_url} isLink />
                        <Field label="Selfie Verification" value={loan.selfie_verification_url} isLink />
                    </DetailGroup>

                    {loan.customer_references && (
                        <div className="bg-white dark:bg-[#1e293b] rounded-[24px] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                                <div className="size-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                    <span className="material-symbols-outlined text-lg">group</span>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">References</h3>
                            </div>
                            <div className="grid gap-4">
                                {(loan.customer_references as any[]).map((ref, idx) => (
                                    <div key={idx} className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors group/ref">
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 rounded-full bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center font-black text-sm border border-slate-200 dark:border-slate-600 shadow-sm">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white text-lg">{ref.fullName}</p>
                                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{ref.relationship}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a href={`tel:${ref.phoneNumber}`} className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono font-bold text-sm hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 transition-colors flex items-center gap-2">
                                                <span className="material-symbols-outlined text-base">call</span>
                                                {ref.phoneNumber}
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Signatures Section */}
                    {loan.signatures && loan.signatures.length > 0 && (
                        <div className="bg-white dark:bg-[#1e293b] rounded-[24px] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                                <div className="size-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <span className="material-symbols-outlined text-lg">ink_pen</span>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Signatures</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {(loan.signatures as string[]).map((sig, idx) => (
                                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 flex flex-col items-center gap-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors group/sig">
                                        <div className="w-full h-32 flex items-center justify-center bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                            <img src={sig} alt={`Signature ${idx + 1}`} className="max-w-full max-h-full object-contain" />
                                        </div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Signed by Applicant</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Sidebar Actions */}
                <div className="xl:col-span-4 space-y-6 sticky top-8 animate-in slide-in-from-right-8 duration-700 delay-200">
                    {/* Dynamic Action Card */}
                    <ActionCard
                        loan={loan}
                        userRole={user.role}
                        onActionComplete={() => {
                            const fetchLoan = async () => {
                                try {
                                    const response = await axios.get(`${''}/api/staff/loans/${id}`, { withCredentials: true });
                                    setLoan(response.data);
                                } catch (error) { console.error("Refresh failed", error); }
                            };
                            fetchLoan();
                        }}
                    />

                    <div className="bg-white dark:bg-[#1e293b] rounded-[24px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-slate-400 text-lg">folder_open</span>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documents</p>
                        </div>
                        <DocumentsList loanId={id} refreshTrigger={loan ? new Date(loan.updated_at).getTime() : 0} />
                    </div>

                    <div className="bg-white dark:bg-[#1e293b] rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-0">
                            <CollapsibleGroup title="Activity Timeline" icon="history" defaultOpen={false}>
                                <div className="col-span-1 md:col-span-2 -mx-4 -my-2">
                                    <ActivityTimeline loanId={id} />
                                </div>
                            </CollapsibleGroup>
                        </div>
                    </div>

                    {/* Officer Card */}
                    <div className="bg-white dark:bg-[#1e293b] rounded-[24px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Assigned Officer</p>
                        <div className="flex items-center gap-4">
                            <div className="size-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-200 dark:border-slate-700">
                                {loan.officer_avatar ? <img src={loan.officer_avatar} className="size-full rounded-2xl object-cover" /> : <span className="material-symbols-outlined text-2xl">person</span>}
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">{loan.officer_name || 'Unassigned'}</p>
                                <p className="text-xs text-slate-500 font-medium">{loan.officer_email || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="bg-slate-50 dark:bg-[#0f172a]/50 rounded-[24px] p-6 text-xs text-slate-500 space-y-4 border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center">
                            <span className="font-bold uppercase tracking-wider text-slate-400">Created At</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{new Date(loan.created_at).toLocaleString()}</span>
                        </div>
                        <div className="w-full h-px bg-slate-200 dark:bg-slate-800"></div>
                        <div className="flex justify-between items-center">
                            <span className="font-bold uppercase tracking-wider text-slate-400">Last Update</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{new Date(loan.updated_at || loan.created_at).toLocaleString()}</span>
                        </div>
                        <div className="w-full h-px bg-slate-200 dark:bg-slate-800"></div>
                        <div className="flex justify-between items-center">
                            <span className="font-bold uppercase tracking-wider text-slate-400">Source</span>
                            <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px]">
                                {loan.referral_code ? 'Referral' : 'Direct'}
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </StaffLayout>
    );
};

export default LoanDetailsPage;
