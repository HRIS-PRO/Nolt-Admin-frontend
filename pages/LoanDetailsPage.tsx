import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StaffLayout from '../components/layouts/StaffLayout';
import ActivityTimeline from '../components/ActivityTimeline';
import DocumentsList from '../components/DocumentsList';
import axios from 'axios';
import SensitiveDataField from '../components/SensitiveDataField';
import StaffLoanForm from '../components/StaffLoanForm';
import { getStatusStyles } from '../utils/statusStyles';
import { formatDate } from '../utils/dateFormatter';

interface LoanDetailsPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

// --- Action Card Component ---
const ActionCard = ({ loan, userRole, onActionComplete }: { loan: any, userRole: any, onActionComplete: () => void }) => {
    const [actionLoading, setActionLoading] = useState(false);
    const isSpecialLoan = ['topup', 'add_on', 're-app', 're_app'].includes(loan.loan_type?.toLowerCase());
    const isBuyOver = loan.loan_type?.toLowerCase() === 'buy_over';

    const [eligibleAmount, setEligibleAmount] = useState(
        isSpecialLoan 
            ? (loan.topup_amount?.toString() || '0') 
            : (loan.requested_loan_amount?.toString() || '0')
    );
    const [buyOverAmount, setBuyOverAmount] = useState(loan.buy_over_amount?.toString() || '0');
    const [tenure, setTenure] = useState(loan.loan_tenure_months ? loan.loan_tenure_months.toString() : '');
    const [existingLoanBalance, setExistingLoanBalance] = useState(loan.existing_loan_balance ? loan.existing_loan_balance.toString() : '');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [reason, setReason] = useState('');
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnTargetStage, setReturnTargetStage] = useState('');
    const [showCXRejectModal, setShowCXRejectModal] = useState(false);
    const [cxRejectionReason, setCxRejectionReason] = useState('');
    const [glAccounts, setGlAccounts] = useState<any[]>([]);
    const [selectedGL, setSelectedGL] = useState(loan.gl_account || '');
    const [startDate, setStartDate] = useState(() => {
        if (loan.start_date) {
            // Slice directly — never parse through Date to avoid UTC timezone shift.
            // e.g. "2026-06-30T00:00:00.000Z" → "2026-06-30"
            //      "2026-06-30 00:00:00"       → "2026-06-30"
            return String(loan.start_date).slice(0, 10);
        }
        // Fallback: today in LOCAL time (not UTC) so WAT doesn't shift it back a day
        const t = new Date();
        return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    });
    const [isStartDateExpanded, setIsStartDateExpanded] = useState(false);
    const [manualInterestRate, setManualInterestRate] = useState(() => {
        // postgres returns NUMERIC as a string e.g. "3.5000" — parse and strip trailing zeros
        const raw = loan.manual_interest_rate;
        if (raw === null || raw === undefined || raw === '') return '';
        const n = parseFloat(String(raw));
        return isNaN(n) ? '' : String(n); // e.g. "3.5", not "3.5000"
    });
    const [product, setProduct] = useState<any>(null);

    // ── KYC Tier State ───────────────────────────────────────────────────────
    const TIER_LIMITS: Record<number, number> = { 1: 300_000, 2: 500_000, 3: Infinity };
    const [customerKycTier, setCustomerKycTier] = useState<number>(
        Math.max(1, Number(loan.customer_kyc_tier) || 1)
    );
    const [selectedTier, setSelectedTier] = useState<number>(
        Math.max(1, Number(loan.customer_kyc_tier) || 1)
    );
    const requestedAmount = Number(
        ['topup', 'add_on', 're-app', 're_app'].includes(loan.loan_type?.toLowerCase())
            ? loan.topup_amount || loan.requested_loan_amount
            : loan.loan_type?.toLowerCase() === 'buy_over'
                ? loan.buy_over_amount || loan.requested_loan_amount
                : loan.requested_loan_amount
    ) || 0;
    // ── Effective amount: MAX of requested, approved (DB), and disbursed (DB) ─
    // Read directly from the loan object — NOT from UI state (eligibleAmount state
    // is seeded from requested_loan_amount, not the credit-approved eligible_amount).
    const dbApprovedAmount  = Number(loan.eligible_amount) || 0;
    const dbDisbursedAmount = Number(loan.disbursement_amount) || 0;
    const effectiveLoanAmount = Math.max(requestedAmount, dbApprovedAmount, dbDisbursedAmount);
    const tierLimitExceeded = (loan.stage || 'submitted') === 'customer_experience' && effectiveLoanAmount > TIER_LIMITS[selectedTier];

    // Fetch matching product so we can show its default interest rate
    useEffect(() => {
        if (!loan.product_type) return;
        axios.get('/api/staff/products/loans/active', { withCredentials: true })
            .then(res => {
                const match = res.data.find((p: any) => p.custom_name.toLowerCase() === loan.product_type.toLowerCase());
                setProduct(match || null);
            })
            .catch(() => setProduct(null));
    }, [loan.product_type]);

    // Disbursement Logic State
    const [applyManagementFee, setApplyManagementFee] = useState(loan.apply_management_fee || false);
    const [applyInsuranceFee, setApplyInsuranceFee] = useState(loan.apply_insurance_fee || false);

    // Check if loan is a special type (Top-Up, Add-On, Re-App)
    // Initial flags moved to top of component

    // Calculate Disbursement Amount
    const calculateDisbursementAmount = () => {
        const amount = parseFloat(eligibleAmount) || 0;
        const balance = parseFloat(existingLoanBalance) || 0;
        const activeBuyOverAmount = parseFloat(buyOverAmount) || 0;

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

        let disbursement = amount - fees;
        if (isSpecialLoan) {
            disbursement = disbursement - balance;
        } else if (isBuyOver) {
            disbursement = disbursement - activeBuyOverAmount;
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
            // ── KYC Tier Upgrade (CX approval only) ─────────────────────────
            if (action === 'approve' && stage === 'customer_experience' && selectedTier !== customerKycTier) {
                try {
                    const tierRes = await axios.post(
                        '/api/staff/upgrade-customer-tier',
                        {
                            customer_id: loan.customer_id,
                            new_tier: selectedTier,
                            context: 'loan',
                            context_id: loan.id
                        },
                        { withCredentials: true }
                    );
                    if (tierRes.data?.success) {
                        setCustomerKycTier(selectedTier);
                    }
                } catch (tierError: any) {
                    alert(tierError.response?.data?.message || 'Tier upgrade failed. Cannot proceed.');
                    setActionLoading(false);
                    return;
                }
            }

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
                payload.data.start_date = startDate;

                // Include manual interest rate if set
                const parsedRate = parseFloat(manualInterestRate);
                if (!isNaN(parsedRate) && parsedRate > 0) {
                    payload.data.manual_interest_rate = parsedRate;
                }

                if (isSpecialLoan) {
                    payload.data.existing_loan_balance = existingLoanBalance;
                }

                if (isBuyOver) {
                    payload.data.buy_over_amount = buyOverAmount;
                }
            }
            if (action === 'approve' && stage === 'finance') {
                payload.data.gl_account = selectedGL;
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

    // ── CX-specific rejection handler (bypasses textarea requirement) ─────────
    const handleCXReject = async () => {
        if (!cxRejectionReason) {
            alert('Please select a rejection reason.');
            return;
        }
        setActionLoading(true);
        try {
            await axios.post(
                `/api/staff/loans/${loan.id}/action`,
                { action: 'reject', cx_rejection_reason: cxRejectionReason, reason: cxRejectionReason },
                { withCredentials: true }
            );
            setShowCXRejectModal(false);
            setCxRejectionReason('');
            onActionComplete();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Rejection failed. Please try again.');
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

    useEffect(() => {
        if (stage === 'finance') {
            axios.get('/api/gl-accounts', { withCredentials: true })
                .then(res => {
                    if (res.data.success) {
                        setGlAccounts(res.data.data.filter((gl: any) => gl.status === 'Active'));
                    }
                })
                .catch(err => console.error("Failed to fetch GL accounts:", err));
        }
    }, [stage]);

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

                {isBuyOver && (
                    <div className="mb-6 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-purple-500 text-white flex items-center justify-center">
                                <span className="material-symbols-outlined text-sm">payments</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-purple-600 tracking-widest leading-none">Product Type</p>
                                <p className="text-xs font-bold text-purple-900 dark:text-purple-400 mt-1">BUY OVER LOAN</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none">Base Amount</p>
                            <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">₦{Number(loan.requested_loan_amount).toLocaleString()}</p>
                        </div>
                    </div>
                )}

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

                        {/* BUY OVER INPUT: Update Buy Over Amount */}
                        {isBuyOver && (
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
                                    Buy Over Amount (To Deduct)
                                </label>
                                <input
                                    type="number"
                                    value={buyOverAmount}
                                    onChange={(e) => setBuyOverAmount(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-700 text-purple-900 dark:text-purple-100 font-bold placeholder:text-purple-300"
                                    placeholder="Enter buy over amount..."
                                />
                                <p className="text-[10px] text-purple-600 mt-1">
                                    This amount will be deducted from the disbursement.
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

                                {/* Buy Over Breakdown */}
                                {isBuyOver && (
                                    <>
                                        <div className="mb-2 text-[10px] text-slate-500 flex justify-between">
                                            <span>Approved Disbursement Amount:</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-300">
                                                ₦{(parseFloat(eligibleAmount) || 0).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="mb-2 text-[10px] text-purple-500 flex justify-between">
                                            <span>Buy Over Amount (Less):</span>
                                            <span className="font-bold">
                                                - ₦{(parseFloat(buyOverAmount) || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </>
                                )}

                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        {isBuyOver ? 'Final Net Payout' : 'Disbursement Amount'}
                                    </span>
                                    <span className="text-lg font-black text-slate-900 dark:text-white">₦{calculateDisbursementAmount().toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loan Start Date Picker - Only for Credit 1 and Credit 2 */}
                {(stage === 'credit_check_1' || stage === 'credit_check_2') && (
                    <div className="mb-6 p-5 rounded-[20px] bg-slate-50 dark:bg-[#111C2A] border border-slate-200 dark:border-slate-700 space-y-3">
                        <button 
                            onClick={() => setIsStartDateExpanded(!isStartDateExpanded)}
                            className="w-full flex items-center justify-between text-left focus:outline-none"
                        >
                            <div>
                                <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 select-none">Loan Start Date</p>
                                <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                                    {startDate ? new Date(startDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today'}
                                </p>
                            </div>
                            <span className={`material-symbols-outlined text-slate-400 transition-transform duration-200 ${isStartDateExpanded ? 'rotate-180' : ''}`}>
                                expand_more
                            </span>
                        </button>
                        
                        {isStartDateExpanded && (
                            <div className="space-y-2 pt-3 border-t border-slate-200/60 dark:border-slate-700 animate-in fade-in duration-200">
                                <label htmlFor="loan-start-date" className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Select Date</label>
                                <input 
                                    id="loan-start-date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-xl p-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/20 focus:outline-none transition-all"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Manual Interest Rate — Credit Check 1 & 2 (new / buy-over / re-app only) */}
                {(stage === 'credit_check_1' || stage === 'credit_check_2') &&
                 ['new', 'buy_over', 're-app', 're_app'].includes(loan.loan_type?.toLowerCase()) && (
                    <div className="mb-6 p-5 rounded-[20px] bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-amber-500 text-sm">percent</span>
                            <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Monthly Interest Rate</p>
                            <span className="text-[9px] font-bold text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">Sent to CBA</span>
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.0001"
                                min="0"
                                max="100"
                                value={manualInterestRate}
                                onChange={e => setManualInterestRate(e.target.value)}
                                placeholder="e.g. 3.5"
                                className="w-full px-4 py-3 pr-14 rounded-2xl bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all placeholder:text-slate-300"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-amber-500">%/mo</span>
                        </div>
                        {manualInterestRate && !isNaN(parseFloat(manualInterestRate)) && parseFloat(manualInterestRate) > 0 ? (
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[10px] text-emerald-500">check_circle</span>
                                CBA will receive:
                                <span className="text-amber-600 dark:text-amber-400 font-black">{(parseFloat(manualInterestRate) * 12).toFixed(4)}% annual</span>
                                <span className="text-slate-400">(monthly × 12)</span>
                            </p>
                        ) : (
                            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[10px] text-slate-400">warning</span>
                                Not set — will fall back to product rate{product?.interest_rate != null ? ` (${parseFloat(product.interest_rate)}%/mo)` : ' or 3.5%l'} default
                            </p>
                        )}
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

                {/* Finance GL Selection */}
                {stage === 'finance' && (
                    <div className="mb-6 p-5 rounded-[24px] bg-slate-50 dark:bg-[#111C2A] border border-emerald-500/20 relative overflow-hidden">
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-3 block">
                            SELECT BANK GL (FINANCE NODE)
                        </label>
                        <div className="relative">
                            <select
                                value={selectedGL}
                                onChange={async (e) => {
                                    const val = e.target.value;
                                    setSelectedGL(val);
                                    try {
                                        await axios.patch(`/api/staff/loans/${loan.id}/gl-account`, 
                                            { gl_account: val || null }, 
                                            { withCredentials: true }
                                        );
                                    } catch (err: any) {
                                        console.error('Failed to save GL:', err);
                                    }
                                }}
                                className="w-full p-4 rounded-[16px] bg-transparent border-2 border-[#0099FF] text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#0099FF]/20 cursor-pointer appearance-none transition-all"
                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.25em 1.25em', paddingRight: '3rem' }}
                            >
                                <option value="" className="text-slate-500 bg-white dark:bg-slate-800">-- SELECT BANK GL ACCOUNT --</option>
                                {glAccounts.map((gl) => (
                                    <option key={gl.id} value={gl.code} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">
                                        {gl.code} - {gl.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* ── Customer Tier Settings (CX Stage Only) ── */}
                {stage === 'customer_experience' && (
                    <div className="mb-6 p-5 rounded-[20px] bg-slate-50 dark:bg-[#111C2A] border border-[#0099FF]/30">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#0099FF] mb-3 block">
                            Customer Tier Settings
                        </label>
                        {customerKycTier >= 3 ? (
                            <div className="w-full p-4 rounded-[16px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-sm">
                                Tier 3
                            </div>
                        ) : (
                            <div className="relative">
                                <select
                                    value={selectedTier}
                                    onChange={(e) => setSelectedTier(Number(e.target.value))}
                                    className="w-full p-4 rounded-[16px] bg-transparent border-2 border-[#0099FF] text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#0099FF]/20 cursor-pointer appearance-none transition-all"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.25em 1.25em', paddingRight: '3rem' }}
                                >
                                    {customerKycTier <= 1 && <option value={1}>Tier 1</option>}
                                    {customerKycTier <= 2 && <option value={2}>Tier 2</option>}
                                    <option value={3}>Tier 3</option>
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Limit Enforced Banner (CX Stage Only) ── */}
                {tierLimitExceeded && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                        <span className="material-symbols-outlined text-red-500 text-xl mt-0.5 shrink-0">warning</span>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Limit Enforced</p>
                            <p className="text-xs font-semibold text-red-700 dark:text-red-400 leading-relaxed">
                                Tier {selectedTier} limit exceeded! Highest amount on record ₦{effectiveLoanAmount.toLocaleString()} exceeds
                                the ₦{(TIER_LIMITS[selectedTier] ?? 0).toLocaleString()} threshold limit.
                                Please upgrade the customer tier status first.
                            </p>
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
                        disabled={actionLoading || tierLimitExceeded}
                        title={tierLimitExceeded ? `Tier ${selectedTier} limit exceeded. Upgrade tier to proceed.` : ''}
                        className={`w-full py-4 rounded-xl text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${
                            tierLimitExceeded
                                ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed opacity-60'
                                : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
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
                            onClick={() => {
                                const stage = loan.stage || 'submitted';
                                if (stage === 'customer_experience' || stage === 'submitted') {
                                    setShowCXRejectModal(true);
                                } else {
                                    handleAction('reject');
                                }
                            }}
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

                    {/* ── CX Rejection Modal ─────────────────────────────────── */}
                    {showCXRejectModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-white dark:bg-[#0d1a2a] rounded-2xl w-full max-w-md shadow-2xl border border-red-500/20 overflow-hidden">
                                {/* Header */}
                                <div className="bg-red-600 px-6 py-5 flex items-start justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-red-200 mb-1">Customer Experience Node</p>
                                        <h3 className="text-xl font-black text-white">Reject Application</h3>
                                        <p className="text-sm text-red-200 mt-1">Select the official rejection reason. An email will be sent to the customer.</p>
                                    </div>
                                    <button onClick={() => { setShowCXRejectModal(false); setCxRejectionReason(''); }} className="text-red-200 hover:text-white transition-colors mt-1">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="p-6 space-y-5">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 block">
                                            Rejection Reason <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={cxRejectionReason}
                                                onChange={(e) => setCxRejectionReason(e.target.value)}
                                                className="w-full p-4 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-red-500/20 focus:border-red-500 cursor-pointer appearance-none transition-all"
                                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25em 1.25em' }}
                                            >
                                                <option value="">-- Select a Rejection Reason --</option>
                                                <option value="POOR_CREDIT_REPORT_IPPIS">POOR or BAD CREDIT REPORT (IPPIS)</option>
                                                <option value="EXISTING_CUSTOMER_RECENT_LOAN">EXISTING CUSTOMER — WITH RECENTLY DISBURSED LOAN</option>
                                                <option value="LOW_NET_PAY">LOW NET PAY</option>
                                                <option value="OVERLEVERAGED">OVERLEVERAGED</option>
                                                <option value="DOCUMENTS_INCOMPLETE">DOCUMENTS ARE NOT COMPLETE</option>
                                                <option value="EMPLOYER_NOT_ON_LIST">EMPLOYER NOT ON OUR LIST</option>
                                                <option value="BAD_CREDIT_REPORT_PRIVATE">BAD CREDIT REPORT (PRIVATE LOANS)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {cxRejectionReason && (
                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30">
                                            <span className="material-symbols-outlined text-amber-500 text-base mt-0.5 shrink-0">mail</span>
                                            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                                A rejection email will automatically be sent to the customer when you confirm.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-6 pb-6 flex gap-3">
                                    <button
                                        onClick={() => { setShowCXRejectModal(false); setCxRejectionReason(''); }}
                                        className="flex-1 py-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCXReject}
                                        disabled={actionLoading || !cxRejectionReason}
                                        className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black text-sm uppercase tracking-wider hover:bg-red-700 shadow-lg shadow-red-600/25 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-2"
                                    >
                                        {actionLoading
                                            ? <><span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
                                            : <><span className="material-symbols-outlined text-sm">cancel</span> Reject Application</>
                                        }
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
    const [officers, setOfficers] = useState<any[]>([]);
    const [activePanel, setActivePanel] = useState<'overview' | 'manage' | 'activity'>('overview');
    
    // Indemnity Management State
    const [isProcessingIndemnity, setIsProcessingIndemnity] = useState(false);
    const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
    const [directIndemnityUrl, setDirectIndemnityUrl] = useState<string | null>(null);

    const handleFileUpload = async (file: File, type: 'signature' | 'indemnity') => {
        if (type === 'signature') {
            const reader = new FileReader();
            reader.onload = () => {
                setSignatureBase64(reader.result as string);
                setDirectIndemnityUrl(null); // Clear direct upload if signature is provided
            };
            reader.readAsDataURL(file);
        } else {
            setIsProcessingIndemnity(true);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('loan_id', id || '');
            formData.append('document_type', 'indemnity');

            try {
                const res = await axios.post(`/api/upload`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    withCredentials: true
                });
                setDirectIndemnityUrl(res.data.document.file_url);
                setSignatureBase64(null); // Clear signature if direct upload is provided
            } catch (error) {
                console.error("Upload failed:", error);
                alert("Upload failed.");
            } finally {
                setIsProcessingIndemnity(false);
            }
        }
    };

    const handleProcessIndemnity = async () => {
        if (!signatureBase64 && !directIndemnityUrl) {
            alert("Please provide a signature or a document URL.");
            return;
        }

        setIsProcessingIndemnity(true);
        try {
            const payload: any = {};
            if (signatureBase64) payload.signature_base64 = signatureBase64;
            if (directIndemnityUrl) payload.indemnity_document_url = directIndemnityUrl;

            await axios.post(`/api/staff/loans/${id}/indemnity`, payload, { withCredentials: true });
            
            setSignatureBase64(null);
            setDirectIndemnityUrl(null);
            alert("Indemnity Agreement updated successfully.");
            
            // Refresh loan data
            const response = await axios.get(`/api/staff/loans/${id}`, { withCredentials: true });
            setLoan(response.data);
        } catch (error: any) {
            console.error("Indemnity processing failed:", error);
            alert(error.response?.data?.message || "Failed to process indemnity.");
        } finally {
            setIsProcessingIndemnity(false);
        }
    };

    const fetchOfficers = async () => {
        if (['sales_manager', 'admin', 'super_admin', 'superadmin', 'customer_experience'].includes(user.role || '')) {
            try {
                const response = await axios.get(`/api/staff/users?role=sales_officer&limit=200`, { withCredentials: true });
                setOfficers(response.data.users.filter((u: any) => u.is_active));
            } catch (error) {
                console.error("Failed to fetch officers", error);
            }
        }
    };

    const handleAssignOfficer = async (officerId: string) => {
        if (!confirm("Are you sure you want to reassign this loan?")) return;
        try {
            await axios.patch(`/api/staff/loans/${id}/assign`, {
                sales_officer_id: officerId
            }, { withCredentials: true });
            // Refresh
            const response = await axios.get(`/api/staff/loans/${id}`, { withCredentials: true });
            setLoan(response.data);
            alert("Loan reassigned successfully");
        } catch (error: any) {
            alert(error.response?.data?.message || "Reassignment failed");
        }
    };

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

        if (id) {
            fetchLoan();
            fetchOfficers();
        }

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
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                            {[loan.preferred_first_name, loan.preferred_surname].filter(Boolean).join(' ') || loan.applicant_full_name}
                        </h1>

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

            {/* Customer Banking Info Bar */}
            {loan.customer_id && (loan.cba_customer_id || loan.casa) && (
                <div className="flex flex-wrap items-center gap-3 mt-4 mb-8">
                    {loan.cba_customer_id && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-outlined text-sm">badge</span>
                            CBA ID: {loan.cba_customer_id}
                        </span>
                    )}
                    {loan.casa && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            <span className="material-symbols-outlined text-sm">account_balance</span>
                            CASA: {loan.casa}
                        </span>
                    )}
                    <button
                        onClick={() => navigate(`/staff/customers/${loan.customer_id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-sm">person_search</span>
                        View Customer Profile
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                </div>
            )}

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
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">

                            {/* Loan Type */}
                            <div className="p-6">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                                    Loan Type
                                </p>
                                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white capitalize leading-tight">
                                    {loan.loan_type?.replace(/_/g, ' ') || 'New'}
                                </h3>
                            </div>

                            {loan.loan_type === "buy_over" && (
                            <div className="p-6">
                                <p className="text-xs font-semibold uppercase tracking-wider text-blue-500 mb-3">
                                    Loan amount
                                </p>
                                <h3 className="text-2xl font-semibold text-blue-600 dark:text-blue-400 leading-tight">
                                    ₦{Number(loan.requested_loan_amount).toLocaleString()}
                                </h3>
                            </div>
                            )}

                            {/* Amount */}
                            <div className="p-6">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                                    {['topup', 'add_on', 're-app'].includes(loan.loan_type) ? 'Principal Amount' :
                                        loan.loan_type === 'buy_over' ? 'Buy Over Amount' : 'Requested Amount'}
                                </p>
                                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white leading-tight">
                                    ₦{Number(
                                        ['topup', 'add_on', 'add-on', 're-app', 're_app'].includes(loan.loan_type?.toLowerCase()) ? (loan.topup_amount || loan.requested_loan_amount) :
                                            loan.loan_type === 'buy_over' ? (loan.buy_over_amount || loan.requested_loan_amount) :
                                                loan.requested_loan_amount
                                    ).toLocaleString()}
                                </h3>
                            </div>

                            {/* Tenure */}
                            {['topup', 'add_on', 're-app', 'buy_over', 'new'].includes(loan.loan_type) && (
                                <div className="p-6">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                                        Tenure
                                    </p>
                                    <h3 className="text-2xl font-semibold text-slate-900 dark:text-white leading-tight">
                                        {loan.loan_tenure_months || 6} Months
                                    </h3>
                                </div>
                            )}

                            {/* Approved */}
                            {loan.eligible_amount && (
                                <div className="p-6">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-3">
                                        Approved Amount
                                    </p>
                                    <h3 className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 leading-tight">
                                        ₦{Number(loan.eligible_amount).toLocaleString()}
                                    </h3>
                                </div>
                            )}

                            {/* Disbursement */}
                            {loan.disbursement_amount && (
                                <div className="p-6">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-500 mb-3">
                                        Disbursement
                                    </p>
                                    <h3 className="text-2xl font-semibold text-blue-600 dark:text-blue-400 leading-tight">
                                        ₦{Number(loan.disbursement_amount).toLocaleString()}
                                    </h3>
                                </div>
                            )}

                        </div>
                    </div>

                    <CollapsibleGroup title="Personal Information" icon="person" defaultOpen={true}>
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-8">
                                {/* Preferred Name — prominent */}
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preferred Name</p>
                                    <p className="font-bold text-slate-900 dark:text-white text-lg">
                                        {[loan.preferred_first_name, loan.preferred_middle_name, loan.preferred_surname].filter(Boolean).join(' ') || loan.applicant_full_name || 'Not provided'}
                                    </p>
                                </div>

                                {/* BVN Verified Name — with badge */}
                                {(loan.bvn_first_name || loan.bvn_surname) && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified Name</p>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider rounded-full border border-emerald-200 dark:border-emerald-800">
                                                <span className="material-symbols-outlined text-[11px]">verified</span>
                                                BVN Verified
                                            </span>
                                        </div>
                                        <p className="font-bold text-slate-600 dark:text-slate-300">
                                            {[loan.bvn_surname, loan.bvn_first_name, loan.bvn_middle_name].filter(Boolean).join(' ')}
                                        </p>
                                    </div>
                                )}

                                <Field label="Gender" value={loan.gender} />
                                <Field label="Date of Birth" value={formatDate(loan.date_of_birth)} />
                                <Field label="Marital Status" value={loan.marital_status} />
                                <Field label="Religion" value={loan.religion} />
                                <Field label="State of Origin" value={loan.state_of_origin} />
                                <Field label="State of Residence" value={loan.state_of_residence} />
                                <Field label="Phone" value={loan.mobile_number} />
                                <Field label="Email" value={loan.personal_email} />
                                <Field label="Address" value={loan.primary_home_address} />
                                <SensitiveDataField loanId={loan.id} field="bvn" label="BVN" verified={loan.is_identity_verified} />
                                <SensitiveDataField loanId={loan.id} field="nin" label="NIN" />
                            </div>

                            {loan.selfie_verification_url && (
                                <div className="flex flex-col items-center justify-start pt-4">
                                    <div className="relative group">
                                        <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-[40px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                        <div className="relative">
                                            <img
                                                src={loan.selfie_verification_url}
                                                alt="Captured Face"
                                                className="w-64 h-80 object-cover rounded-[32px] border-4 border-white dark:border-slate-800 shadow-2xl relative z-0"
                                            />
                                            <div className="absolute top-4 right-4 z-10">
                                                <span className="flex items-center gap-1 px-3 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-lg rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                                                    <span className="material-symbols-outlined text-[14px] text-blue-500">face</span>
                                                    Live Image
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Identity Verification Image</p>
                                </div>
                            )}
                        </div>
                    </CollapsibleGroup>

                    <CollapsibleGroup title="Financial Profile" icon="trending_up">
                        <Field label="Monthly Income" value={`₦${Number(loan.average_monthly_income).toLocaleString()}`} />
                        <Field label="Bank Name" value={loan.bank_name} />
                        <Field label="Account Number" value={loan.account_number} copy />
                        <Field label="Account Name" value={loan.account_name} />
                        <Field label="IPPIS" value={loan.ippis_number} />
                        <Field label="MDA / Tertiary" value={loan.mda_tertiary} />
                        <Field label="Staff ID" value={loan.staff_id} />

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
                    {(loan.promotion_source || loan.hear_about_us) && (
                        <CollapsibleGroup title="Marketing Data" icon="campaign">
                            {loan.promotion_source && (
                                <>
                                    <Field label="Promotion Source" value={loan.promotion_source} />
                                    <Field label="Promotion Medium" value={loan.promotion_medium} />
                                    <Field label="Promotion Campaign" value={loan.promotion_campaign} />
                                </>
                            )}
                            <Field label="Hear About Us" value={loan.hear_about_us} />
                            <Field label="Referral Code" value={loan.marketing_referral} />
                            <Field label="Attributed Officer" value={loan.marketing_officer} />
                        </CollapsibleGroup>
                    )}

                    <CollapsibleGroup title="Indemnity Agreement" icon="gavel" defaultOpen={!loan.indemnity_document_url}>
                        {loan.indemnity_document_url ? (
                            <div className="md:col-span-2 space-y-6">
                                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="size-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                                            <span className="material-symbols-outlined">description</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-emerald-900 dark:text-emerald-400 font-mono">INDEMNITY_AGREEMENT_L-{loan.id}.pdf</p>
                                            <p className="text-[10px] font-bold text-emerald-600">Agreement Signed & Verified</p>
                                        </div>
                                    </div>
                                    <a
                                        href={loan.indemnity_document_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">download</span>
                                        Download PDF
                                    </a>
                                </div>
                                <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Update Agreement</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase text-slate-500 block">Option 1: Upload Signature Image</label>
                                            <div className="relative group">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'signature')}
                                                />
                                                <div className={`p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 ${signatureBase64 ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500/50'}`}>
                                                    <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-purple-500 transition-colors">{signatureBase64 ? 'check_circle' : 'draw'}</span>
                                                    <p className="text-xs font-bold text-slate-500">{signatureBase64 ? 'Signature Selected' : 'Drop signature image here'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase text-slate-500 block">Option 2: Direct PDF Upload</label>
                                            <div className="relative group">
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'indemnity')}
                                                />
                                                <div className={`p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 ${directIndemnityUrl ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500/50'}`}>
                                                    <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-purple-500 transition-colors">{directIndemnityUrl ? 'check_circle' : 'upload_file'}</span>
                                                    <p className="text-xs font-bold text-slate-500">{directIndemnityUrl ? 'Document Uploaded' : 'Upload signed PDF'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleProcessIndemnity}
                                        disabled={isProcessingIndemnity || (!signatureBase64 && !directIndemnityUrl)}
                                        className="w-full mt-6 py-4 rounded-xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {isProcessingIndemnity ? (
                                            <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <span className="material-symbols-outlined text-lg">verified</span>
                                        )}
                                        {isProcessingIndemnity ? 'Processing Agreement...' : 'Finalize Indemnity Agreement'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="md:col-span-2 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6 flex flex-col items-center text-center gap-3">
                                    <div className="size-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                                        <span className="material-symbols-outlined filled">pending_actions</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-rose-900 dark:text-rose-400 uppercase tracking-widest">Agreement Pending</h4>
                                        <p className="text-xs font-bold text-rose-600/70 mt-1">This loan application requires a signed indemnity agreement before it can be finalized.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase text-slate-500 block">Option 1: Upload Signature Image</label>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'signature')}
                                            />
                                            <div className={`p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 ${signatureBase64 ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500/50'}`}>
                                                <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-purple-500 transition-colors">{signatureBase64 ? 'check_circle' : 'draw'}</span>
                                                <p className="text-xs font-bold text-slate-500">{signatureBase64 ? 'Signature Selected' : 'Drop signature image here'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase text-slate-500 block">Option 2: Direct PDF Upload</label>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'indemnity')}
                                            />
                                            <div className={`p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 ${directIndemnityUrl ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500/50'}`}>
                                                <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-purple-500 transition-colors">{directIndemnityUrl ? 'check_circle' : 'upload_file'}</span>
                                                <p className="text-xs font-bold text-slate-500">{directIndemnityUrl ? 'Document Uploaded' : 'Upload signed PDF'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleProcessIndemnity}
                                    disabled={isProcessingIndemnity || (!signatureBase64 && !directIndemnityUrl)}
                                    className="w-full mt-6 py-4 rounded-xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isProcessingIndemnity ? (
                                        <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <span className="material-symbols-outlined text-lg">verified</span>
                                    )}
                                    {isProcessingIndemnity ? 'Processing Agreement...' : 'Finalize Indemnity Agreement'}
                                </button>
                            </div>
                        )}
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
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-2 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-1">
                        <button 
                            onClick={() => setActivePanel('overview')} 
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activePanel === 'overview' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                        >
                            <span className="material-symbols-outlined text-[16px]">page_info</span>
                            Status
                        </button>
                        {['sales_manager', 'admin', 'super_admin', 'superadmin', 'customer_experience'].includes(user?.role?.toLowerCase() || '') && (
                            <button 
                                onClick={() => setActivePanel('manage')} 
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activePanel === 'manage' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                            >
                                <span className="material-symbols-outlined text-[16px]">tune</span>
                                Manage
                            </button>
                        )}
                        <button 
                            onClick={() => setActivePanel('activity')} 
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activePanel === 'activity' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                        >
                            <span className="material-symbols-outlined text-[16px]">history</span>
                            Activity
                        </button>
                    </div>

                    {activePanel === 'overview' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                        </div>
                    )}

                    {activePanel === 'manage' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Assignment Control Card */}
                            {['sales_manager', 'admin', 'super_admin', 'superadmin', 'customer_experience'].includes(user.role?.toLowerCase() || '') && (
                                <div className="bg-white dark:bg-[#1e293b] rounded-[24px] p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none mb-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="material-symbols-outlined text-blue-500">person_add</span>
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Account Assignment</p>
                                    </div>
                                    <h3 className="text-2xl font-black mb-6 text-slate-900 dark:text-white">Sales Officer</h3>

                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-black">
                                                    {loan.officer_name ? loan.officer_name[0] : 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">
                                                        {loan.officer_name || 'Unassigned'}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight text-nowrap truncate max-w-[150px]">
                                                        {loan.officer_email || 'Promotion / Marketing'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <select
                                                value={loan.sales_officer_id || ''}
                                                onChange={(e) => handleAssignOfficer(e.target.value)}
                                                className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-sm font-black text-slate-900 dark:text-white appearance-none cursor-pointer focus:border-blue-500 transition-all outline-none"
                                            >
                                                <option value="">Select Officer to Reassign</option>
                                                {officers.map(off => (
                                                    <option key={off.id} value={off.id}>{off.full_name}</option>
                                                ))}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activePanel === 'activity' && (
                        <div className="bg-white dark:bg-[#1e293b] rounded-[24px] overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[75vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <ActivityTimeline loanId={id} />
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <StaffLoanForm
                    user={user}
                    initialData={loan}
                    loanId={loan.id}
                    onClose={() => setShowEditModal(false)}
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
            )}

        </StaffLayout>
    );
};

export default LoanDetailsPage;
