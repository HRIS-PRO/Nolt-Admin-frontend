import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StaffLayout from '../components/layouts/StaffLayout';
import ActivityTimeline from '../components/ActivityTimeline';
import DocumentsList from '../components/DocumentsList';
import axios from 'axios';
import SensitiveDataField from '../components/SensitiveDataField';
import StaffLoanForm from '../components/StaffLoanForm';

interface LoanDetailsPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

// --- Action Card Component ---
const ActionCard = ({ loan, userRole, onActionComplete }: { loan: any, userRole: any, onActionComplete: () => void }) => {
    const [actionLoading, setActionLoading] = useState(false);
    const [eligibleAmount, setEligibleAmount] = useState(loan.eligible_amount ? loan.eligible_amount.toString() : '');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [reason, setReason] = useState('');

    const handleAction = async (action: 'approve' | 'reject' | 'return') => {
        if ((action === 'reject' || action === 'return') && !reason.trim()) {
            alert("Please provide a reason for this action.");
            return;
        }

        setActionLoading(true);
        try {
            await axios.post(
                `/api/staff/loans/${loan.id}/action`,
                { action, data: { eligible_amount: eligibleAmount }, reason },
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
        formData.append('document_type', 'proof_of_address'); // Defaulting

        try {
            await axios.post(`/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            });
            setUploadFile(null);
            alert("Document uploaded successfully");
            onActionComplete();
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
            case 'sales': return ['sales_officer', 'sales_manager'].includes(userRole);
            case 'customer_experience': return ['customer_experience', 'customer_service', 'sales_officer', 'sales_manager'].includes(userRole);
            case 'credit_check_1': return userRole === 'credit_officer';
            case 'credit_check_2': return userRole === 'credit_manager';
            case 'internal_audit': return userRole === 'internal_audit';
            case 'finance': return userRole === 'finance';
            default: return false;
        }
    })();

    if (stage === 'rejected' || loan.status === 'rejected') {
        return (
            <div className="bg-red-50 dark:bg-red-900/10 rounded-[24px] p-6 border border-red-200 dark:border-red-900/20 text-center">
                <span className="material-symbols-outlined text-3xl text-red-500 mb-2">cancel</span>
                <p className="font-bold text-red-700 dark:text-red-400 mb-1">loan application rejected</p>
            </div>
        );
    }

    if (stage === "disbursed") {
        return (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[24px] p-6 border border-slate-200 dark:border-slate-800 text-center opacity-75">
                <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">check_circle</span>
                <p className="font-bold text-slate-900 dark:text-white mb-1">loan application completed</p>
            </div>
        )
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

                {/* Sales Manager Input */}
                {(stage === 'credit_check_1' || stage === 'credit_check_2') && (
                    <div className="mb-6">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Approved Amount (₦)</label>
                        <input
                            type="number"
                            value={eligibleAmount}
                            onChange={(e) => setEligibleAmount(e.target.value)}
                            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                            placeholder="Enter amount..."
                        />
                    </div>
                )}

                {/* Upload Section */}
                {(stage === 'sales' || stage === 'credit_check_1' || stage === 'customer_experience') && (
                    ['sales_officer', 'sales_manager', 'customer_experience', 'super_admin', 'superadmin'].includes(userRole)
                ) && (
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

                {/* Reason Input */}
                <div className="mb-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
                        Reason / Comment <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm min-h-[100px]"
                        placeholder="Provide a reason for approval, return, or rejection..."
                    />
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => handleAction('approve')}
                        disabled={actionLoading || (stage === 'credit_check_2' && !eligibleAmount)}
                        className="w-full py-4 rounded-xl bg-blue-600 text-white font-black text-sm uppercase tracking-wider hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        {actionLoading ? <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Approve & Proceed'}
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleAction('return')}
                            disabled={actionLoading || stage === 'sales'}
                            className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-all"
                        >
                            {stage === 'sales' ? 'Disabled' : 'Return'}
                        </button>
                        <button
                            onClick={() => handleAction('reject')}
                            disabled={actionLoading}
                            className="w-full py-3 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider hover:bg-red-100 transition-all border border-red-200"
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
    const [showEditModal, setShowEditModal] = useState(false);

    useEffect(() => {
        const fetchLoan = async () => {
            try {
                const response = await axios.get(`/api/staff/loans/${id}`, { withCredentials: true });
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
                <div className="flex flex-col items-center justify-center h-[60vh]">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Application Not Found</h2>
                    <button onClick={() => navigate('/staff/loans')} className="px-8 py-4 rounded-xl bg-blue-600 text-white font-bold">Back to Queue</button>
                </div>
            </StaffLayout>
        );
    }

    const stages = [
        { id: 'submitted', label: 'Submission', icon: 'send' },
        { id: 'sales', label: 'Sales', icon: 'point_of_sale' },
        { id: 'customer_experience', label: 'Review', icon: 'support_agent' },
        { id: 'credit_check_1', label: 'Credit I', icon: 'manage_search' },
        { id: 'credit_check_2', label: 'Credit II', icon: 'manage_search' },
        { id: 'internal_audit', label: 'Audit', icon: 'policy' },
        { id: 'finance', label: 'Finance', icon: 'payments' },
        { id: 'disbursed', label: 'Disbursed', icon: 'check_circle' }
    ];

    const currentStageId = loan.stage || 'submitted';
    const currentStageIndex = stages.findIndex(s => s.id === (currentStageId === 'credit_check' ? 'credit_check_1' : currentStageId));
    const activeIndex = currentStageIndex === -1 ? 0 : currentStageIndex;

    const CollapsibleGroup = ({ title, icon, children, defaultOpen = false }: any) => {
        const [isOpen, setIsOpen] = useState(defaultOpen);
        return (
            <div className="bg-white dark:bg-[#1e293b] rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-6">
                <div onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between p-6 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-2xl text-slate-400">{icon}</span>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{title}</h3>
                    </div>
                    <span className={`material-symbols-outlined transition-transform ${isOpen ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>
                </div>
                {isOpen && <div className="p-8 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8">{children}</div>}
            </div>
        );
    };

    const Field = ({ label, value, isLink = false, copy = false }: any) => (
        <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            {isLink && value ? (
                <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold underline">View Document</a>
            ) : (
                <p className="font-bold text-slate-900 dark:text-white break-words">{value || 'Not provided'}</p>
            )}
        </div>
    );

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/staff/loans')} className="size-12 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Application #{loan.id}</p>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{loan.applicant_full_name}</h1>

                        {/* Edit Button Logic */}
                        {(loan.stage === 'sales' || loan.stage === 'submitted') &&
                            (['sales_officer', 'sales_manager', 'super_admin', 'superadmin'].includes(user.role || '')) && (
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="mt-2 text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                    Edit Application
                                </button>
                            )}
                    </div>
                </div>
            </div>

            {/* Stage Tracker */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[24px] p-8 mb-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                <div className="flex justify-between items-center relative z-10 overflow-x-auto pb-4">
                    {stages.map((stage, idx) => {
                        const isCompleted = idx < activeIndex;
                        const isActive = idx === activeIndex;
                        return (
                            <div key={stage.id} className="flex flex-col items-center gap-3 min-w-[80px]">
                                <div className={`size-10 rounded-full flex items-center justify-center border-2 ${isActive ? 'border-blue-500 text-blue-500' : isCompleted ? 'border-green-500 text-green-500' : 'border-slate-200 text-slate-300'}`}>
                                    <span className="material-symbols-outlined text-lg">{isCompleted ? 'check' : stage.icon}</span>
                                </div>
                                <p className={`text-[10px] font-black uppercase text-center ${isActive ? 'text-blue-500' : 'text-slate-400'}`}>{stage.label}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                <div className="xl:col-span-8 space-y-8">
                    {/* Summary Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-[24px] p-8 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Requested Amount</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">₦{Number(loan.requested_loan_amount).toLocaleString()}</h3>
                        </div>
                        {loan.eligible_amount && (
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-1">Approved Amount</p>
                                <h3 className="text-3xl font-black text-green-600 dark:text-green-400">₦{Number(loan.eligible_amount).toLocaleString()}</h3>
                            </div>
                        )}
                    </div>

                    <CollapsibleGroup title="Personal Information" icon="person" defaultOpen={true}>
                        <Field label="Full Name" value={loan.applicant_full_name} copy />
                        <Field label="Gender" value={loan.gender} />
                        <Field label="Date of Birth" value={loan.date_of_birth ? new Date(loan.date_of_birth).toLocaleDateString() : '-'} />
                        <Field label="Marital Status" value={loan.marital_status} />
                        <Field label="Phone" value={loan.mobile_number} />
                        <Field label="Email" value={loan.personal_email} />
                        <Field label="Address" value={loan.primary_home_address} />
                    </CollapsibleGroup>

                    <CollapsibleGroup title="Financial Profile" icon="trending_up">
                        <Field label="Monthly Income" value={`₦${Number(loan.average_monthly_income).toLocaleString()}`} />
                        <Field label="Bank Name" value={loan.bank_name} />
                        <Field label="Account Number" value={loan.account_number} copy />
                        <Field label="Account Name" value={loan.account_name} />
                        <Field label="IPPIS" value={loan.ippis_number} />
                        <Field label="MDA / Tertiary" value={loan.mda_tertiary} />
                        <Field label="Staff ID" value={loan.staff_id} />
                        <SensitiveDataField loanId={loan.id} field="bvn" label="BVN" />
                        <SensitiveDataField loanId={loan.id} field="nin" label="NIN" />
                    </CollapsibleGroup>

                    <CollapsibleGroup title="Documents" icon="folder_open">
                        <Field label="Government ID" value={loan.govt_id_url} isLink />
                        <Field label="Work ID" value={loan.work_id_url} isLink />
                        <Field label="Payslip" value={loan.payslip_url} isLink />
                        <Field label="Bank Statement" value={loan.statement_of_account_url} isLink />
                        <Field label="Proof of Residence" value={loan.proof_of_residence_url} isLink />
                        <Field label="Selfie" value={loan.selfie_verification_url} isLink />
                    </CollapsibleGroup>

                    {/* References */}
                    {loan.customer_references && (
                        <CollapsibleGroup title="References" icon="group">
                            {(loan.customer_references as any[]).map((ref, idx) => (
                                <div key={idx} className="col-span-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <p className="font-bold">{ref.fullName} ({ref.relationship})</p>
                                    <p className="text-xs text-slate-500">{ref.phoneNumber}</p>
                                    <p className="text-xs text-slate-500">{ref.address}</p>
                                </div>
                            ))}
                        </CollapsibleGroup>
                    )}
                </div>

                <div className="xl:col-span-4 space-y-6 sticky top-8">
                    <ActionCard
                        loan={loan}
                        userRole={user.role}
                        onActionComplete={() => {
                            const fetchLoan = async () => {
                                try {
                                    const response = await axios.get(`/api/staff/loans/${id}`, { withCredentials: true });
                                    setLoan(response.data);
                                } catch (error) { console.error("Refresh failed", error); }
                            };
                            fetchLoan();
                        }}
                    />

                    <div className="bg-white dark:bg-[#1e293b] rounded-[24px] p-6 border border-slate-200 dark:border-slate-800">
                        <DocumentsList loanId={id} refreshTrigger={loan ? new Date(loan.updated_at).getTime() : 0} />
                    </div>

                    <div className="bg-white dark:bg-[#1e293b] rounded-[24px] overflow-hidden border border-slate-200 dark:border-slate-800">
                        <ActivityTimeline loanId={id} />
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                        <button
                            onClick={() => setShowEditModal(false)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors z-10"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <div className="p-8">
                            <h2 className="text-2xl font-black mb-6 text-slate-900 dark:text-white">Edit Application</h2>
                            <StaffLoanForm
                                user={user}
                                initialData={loan}
                                loanId={loan.id}
                                onClose={() => setShowEditModal(false)} // Pass existing onClose
                                onSuccess={() => {
                                    setShowEditModal(false);
                                    // Refresh logic
                                    const fetchLoan = async () => {
                                        try {
                                            const response = await axios.get(`/api/staff/loans/${id}`, { withCredentials: true });
                                            setLoan(response.data);
                                        } catch (error) { console.error("Refresh failed", error); }
                                    };
                                    fetchLoan();
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

        </StaffLayout>
    );
};

export default LoanDetailsPage;
