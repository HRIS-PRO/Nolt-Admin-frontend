import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StaffLayout from '../components/layouts/StaffLayout';
import ActivityTimeline from '../components/ActivityTimeline';
import DocumentsList from '../components/DocumentsList';
import axios from 'axios';
import SensitiveDataField from '../components/SensitiveDataField';
import StaffLoanForm from '../components/StaffLoanForm';
import { getStatusStyles } from '../utils/statusStyles';

interface LoanDetailsPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

// --- Action Card Component ---
const ActionCard = ({ loan, userRole, onActionComplete }: { loan: any, userRole: any, onActionComplete: () => void }) => {
    const [actionLoading, setActionLoading] = useState(false);
    const [eligibleAmount, setEligibleAmount] = useState(loan.topup_amount ? loan.topup_amount.toString() : '');
    const [tenure, setTenure] = useState(loan.loan_tenure_months ? loan.loan_tenure_months.toString() : '');
    const [existingLoanBalance, setExistingLoanBalance] = useState(loan.existing_loan_balance ? loan.existing_loan_balance.toString() : '');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [reason, setReason] = useState('');
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnTargetStage, setReturnTargetStage] = useState('');

    // Disbursement Logic State
    const [applyManagementFee, setApplyManagementFee] = useState(loan.apply_management_fee || false);
    const [applyInsuranceFee, setApplyInsuranceFee] = useState(loan.apply_insurance_fee || false);

    // Check if loan is a special type (Top-Up, Add-On, Re-App)
    const isSpecialLoan = ['topup', 'add_on', 're-app', 're_app'].includes(loan.loan_type?.toLowerCase());

    // Calculate Disbursement Amount
    const calculateDisbursementAmount = () => {
        const amount = parseFloat(eligibleAmount) || 0;
        const balance = parseFloat(existingLoanBalance) || 0;
        const buyOverAmount = parseFloat(loan.buy_over_amount) || 0;

        let baseAmountForFees = amount;

        // For SPECIAL LOANS: Fees are applied to the (Eligible Amount - Existing Balance)
        if (isSpecialLoan) {
            baseAmountForFees = amount - balance;
        } else {
            // For STANDARD LOANS: Fees are applied to the Eligible Amount
            baseAmountForFees = amount;
        }

        // Ensure base amount isn't negative
        if (baseAmountForFees < 0) baseAmountForFees = 0;

        let fees = 0;
        if (applyManagementFee) fees += baseAmountForFees * 0.02; // 2% Management Fee
        if (applyInsuranceFee) fees += baseAmountForFees * 0.005; // 0.5% Insurance Fee

        // Disbursement = Eligible Amount - Existing Balance - Fees (Wait, need to clarify deduction logic)
        // Standard: Eligible - Fees
        // TopUp: (Eligible - ExistingBalance) - Fees

        let disbursement = amount - fees;
        if (isSpecialLoan) {
            disbursement = disbursement - balance;
        } else if (loan.loan_type === 'buy_over') {
            disbursement = disbursement - buyOverAmount;
        }

        return disbursement > 0 ? disbursement : 0;
    };

    const handleAction = async (action: 'approve' | 'reject' | 'return', targetStage?: string) => {
        if ((action === 'reject' || action === 'return') && !reason.trim()) {
            alert("Please provide a reason for this action.");
            return;
        }

        setActionLoading(true);
        try {
            const payload: any = {
                action,
                data: { eligible_amount: eligibleAmount, tenure, target_stage: targetStage },
                reason
            };

            // Add fee flags and disbursement amount for approval in Credit stages
            if (action === 'approve' && (stage === 'credit_check_1' || stage === 'credit_check_2')) {
                payload.data.apply_management_fee = applyManagementFee;
                payload.data.apply_insurance_fee = applyInsuranceFee;
                payload.data.disbursement_amount = calculateDisbursementAmount();

                if (isSpecialLoan) {
                    payload.data.existing_loan_balance = existingLoanBalance;
                }
            }

            await axios.post(
                `/api/staff/loans/${loan.id}/action`,
                payload,
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
            case 'customer_experience': return ['customer_experience', 'customer_service'].includes(userRole);
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

                {/* Sales Manager / Credit Officer Input */}
                {(stage === 'credit_check_1' || stage === 'credit_check_2') && (
                    <div className="space-y-4 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Hide Approved Amount for Special Loans (uses default/fixed topup amount) */}
                            {!isSpecialLoan ? (
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Approved Amount (₦)</label>
                                    <input
                                        type="number"
                                        value={eligibleAmount}
                                        onChange={(e) => setEligibleAmount(e.target.value)}
                                        className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                                        placeholder="Enter amount..."
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Principal Amount (Fixed)</label>
                                    <div className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold">
                                        ₦{Number(eligibleAmount).toLocaleString()}
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Approved Tenure (Months)</label>
                                <select
                                    value={tenure}
                                    onChange={(e) => setTenure(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold appearance-none"
                                >
                                    <option value="">Select Tenure</option>
                                    {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(m => (
                                        <option key={m} value={m}>{m} Months</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* SPECIAL LOAN INPUT: Top-Up/Add-On Balance */}
                        {isSpecialLoan && (
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
                                    Top Up Balance (To Deduct)
                                </label>
                                <input
                                    type="number"
                                    value={existingLoanBalance}
                                    onChange={(e) => setExistingLoanBalance(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700 text-amber-900 dark:text-amber-100 font-bold placeholder:text-amber-300"
                                    placeholder="Enter balance..."
                                />
                                <p className="text-[10px] text-amber-600 mt-1">
                                    Resulting Net Amount = Top Up Amount - Top Up Balance
                                </p>
                            </div>
                        )}

                        {/* Fees & Disbursement Checkboxes */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3 border border-slate-100 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fees & Deductions</p>
                                {isSpecialLoan && (
                                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                        Special Loan Logic Active
                                    </span>
                                )}
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`size-5 rounded border flex items-center justify-center transition-colors ${applyManagementFee ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300 dark:bg-slate-700 dark:border-slate-600'}`}>
                                    {applyManagementFee && <span className="material-symbols-outlined text-white text-sm">check</span>}
                                </div>
                                <input type="checkbox" checked={applyManagementFee} onChange={(e) => setApplyManagementFee(e.target.checked)} className="hidden" />
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Apply Management Fee (2.00%)</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`size-5 rounded border flex items-center justify-center transition-colors ${applyInsuranceFee ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300 dark:bg-slate-700 dark:border-slate-600'}`}>
                                    {applyInsuranceFee && <span className="material-symbols-outlined text-white text-sm">check</span>}
                                </div>
                                <input type="checkbox" checked={applyInsuranceFee} onChange={(e) => setApplyInsuranceFee(e.target.checked)} className="hidden" />
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Apply Insurance Fee (0.50%)</span>
                            </label>

                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                                {/* Special Loan Breakdown */}
                                {isSpecialLoan && (
                                    <div className="mb-2 text-[10px] text-slate-500 flex justify-between">
                                        <span>Net Amount (Top Up - Balance):</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">
                                            ₦{Math.max(0, (parseFloat(eligibleAmount) || 0) - (parseFloat(existingLoanBalance) || 0)).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Disbursement Amount</span>
                                    <span className="text-lg font-black text-slate-900 dark:text-white">₦{calculateDisbursementAmount().toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload Section */}
                {/* Upload Section */}
                {(() => {
                    const canUpload = (
                        (stage === 'sales' && ['sales_officer', 'sales_manager', 'super_admin', 'superadmin'].includes(userRole)) ||
                        (stage === 'customer_experience' && ['customer_experience', 'customer_service', 'super_admin', 'superadmin'].includes(userRole)) ||
                        (stage === 'credit_check_1' && ['credit_officer', 'super_admin', 'superadmin'].includes(userRole))
                    );
                    return canUpload;
                })() && (
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

                    {/* Return Action with Modal */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => {
                                if (stage !== 'sales') setShowReturnModal(true);
                            }}
                            disabled={actionLoading || stage === 'sales'}
                            className="w-full py-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-all border border-amber-200 dark:border-amber-900/30 flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">undo</span>
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

                    {/* Return Application Modal */}
                    {showReturnModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Return Application</h3>
                                        <p className="text-sm text-slate-500">Select where to return this application to.</p>
                                    </div>
                                    <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Return To Stage</label>
                                        <select
                                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold appearance-none outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                                            value={returnTargetStage}
                                            onChange={(e) => setReturnTargetStage(e.target.value)}
                                        >
                                            <option value="">Select Stage...</option>
                                            {(() => {
                                                const allStages = [
                                                    { id: 'sales', label: 'Sales' },
                                                    { id: 'customer_experience', label: 'Review (CX)' },
                                                    { id: 'credit_check_1', label: 'Credit Check I' },
                                                    { id: 'credit_check_2', label: 'Credit Check II' },
                                                    { id: 'internal_audit', label: 'Internal Audit' },
                                                    { id: 'finance', label: 'Finance' }
                                                ];
                                                const currentIdx = allStages.findIndex(s => s.id === (stage === 'credit_check' ? 'credit_check_1' : stage));
                                                return allStages.filter((_, idx) => idx < currentIdx).map(s => (
                                                    <option key={s.id} value={s.id}>{s.label}</option>
                                                ));
                                            })()}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
                                            Reason for Return <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-400"
                                            placeholder="Please explain why you are returning this application..."
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setShowReturnModal(false)}
                                        className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!returnTargetStage) {
                                                alert("Please select a target stage.");
                                                return;
                                            }
                                            if (!reason.trim()) {
                                                alert("Please provide a reason.");
                                                return;
                                            }
                                            handleAction('return', returnTargetStage);
                                            setShowReturnModal(false);
                                        }}
                                        disabled={actionLoading || !returnTargetStage || !reason.trim()}
                                        className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold shadow-lg shadow-amber-500/20 hover:bg-amber-600 hover:shadow-amber-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                                    >
                                        {actionLoading ? 'Processing...' : 'Confirm Return'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
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


        // Socket Listeners
        import('../services/socket').then(({ socket }) => {
            if (!id) return;

            const handleUpdate = (data: any) => {
                if (String(data.id) === String(id) || String(data.loanId) === String(id)) {
                    console.log("Real-time update for this loan");
                    // Re-fetch loan
                    axios.get(`/api/staff/loans/${id}`, { withCredentials: true })
                        .then(res => setLoan(res.data))
                        .catch(console.error);
                }
            };

            const handleDocUpload = (data: any) => {
                if (String(data.loanId) === String(id)) {
                    console.log("Document uploaded");
                    // Force refresh of DocumentsList
                    setLoan((prev: any) => ({ ...prev, updated_at: new Date().toISOString() }));
                }
            }

            const handleDocDelete = (data: any) => {
                if (String(data.loanId) === String(id)) {
                    console.log("Document deleted");
                    // Force refresh
                    setLoan((prev: any) => ({ ...prev, updated_at: new Date().toISOString() }));
                }
            }

            socket.on('loan_updated', handleUpdate);
            socket.on('doc_uploaded', handleDocUpload);
            socket.on('doc_deleted', handleDocDelete);

            return () => {
                socket.off('loan_updated', handleUpdate);
                socket.off('doc_uploaded', handleDocUpload);
                socket.off('doc_deleted', handleDocDelete);
            };
        });
    }, [id, navigate]);

    // console.log(loan);

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
                        <div className="flex items-center gap-3 mb-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Application #{loan.id}</p>
                            {(() => {
                                const styles = getStatusStyles(loan.status);
                                return (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${styles.container}`}>
                                        {loan.status}
                                    </span>
                                );
                            })()}
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{loan.applicant_full_name}</h1>

                        {/* Edit Button Logic */}
                        {((loan.stage === 'sales' || loan.stage === 'submitted') &&
                            (['sales_officer', 'sales_manager', 'super_admin', 'superadmin'].includes(user.role || ''))) ||
                            ((loan.stage === 'customer_experience') &&
                                (['customer_experience', 'customer_service', 'super_admin', 'superadmin'].includes(user.role || ''))) ? (
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="mt-2 text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">edit</span>
                                Edit Application
                            </button>
                        ) : null}
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
                    <div className="bg-white dark:bg-slate-900 rounded-[24px] p-8 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Loan Type</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white capitalize">{loan.loan_type?.replace(/_/g, ' ') || 'New'}</h3>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                {['topup', 'add_on', 're-app'].includes(loan.loan_type) ? 'Principal Amount' :
                                    loan.loan_type === 'buy_over' ? 'Buy Over Amount' : 'Requested Amount'}
                            </p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                                ₦{Number(
                                    ['topup', 'add_on', 're-app'].includes(loan.loan_type) ? (loan.topup_amount || loan.requested_loan_amount) :
                                        loan.loan_type === 'buy_over' ? (loan.buy_over_amount || loan.requested_loan_amount) :
                                            loan.requested_loan_amount
                                ).toLocaleString()}
                            </h3>
                        </div>
                        {['topup', 'add_on', 're-app', 'buy_over', 'new'].includes(loan.loan_type) && (
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tenure</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{loan.loan_tenure_months || 6} Months</h3>
                            </div>
                        )}
                        {loan.eligible_amount && (
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-1">Approved Amount</p>
                                <h3 className="text-3xl font-black text-green-600 dark:text-green-400">₦{Number(loan.eligible_amount).toLocaleString()}</h3>
                            </div>
                        )}
                        {loan.disbursement_amount && (
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Disbursement</p>
                                <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400">₦{Number(loan.disbursement_amount).toLocaleString()}</h3>
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

                        {/* New Fields */}
                        {loan.casa && <Field label="CASA" value={String(loan.casa).split('.')[0]} />}
                        {loan.topup_amount && <Field label="Top Up Amount" value={`₦${Number(loan.topup_amount).toLocaleString()}`} />}
                        {loan.buy_over_amount && <Field label="Buy Over Amount" value={`₦${Number(loan.buy_over_amount).toLocaleString()}`} />}
                        {loan.buy_over_company_name && <Field label="Buy Over Company" value={loan.buy_over_company_name} />}
                        {loan.buy_over_company_account_name && <Field label="Buy Over Account Name" value={loan.buy_over_company_account_name} />}
                        {loan.buy_over_company_account_number && <Field label="Buy Over Account Number" value={loan.buy_over_company_account_number} copy />}
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
