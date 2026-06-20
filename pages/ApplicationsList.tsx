import React, { useState, useEffect } from 'react';
import { AppStep, SavedDraft, UserState } from '../types';
import { storageService } from '../services/storageService';
import axios from 'axios';
import { formatDate } from '../utils/dateFormatter';

interface ApplicationsListProps {
  navigate: (step: AppStep, draft?: SavedDraft | null) => void;
  formatMoney: (amount: number) => string;
  user: UserState;
}


// ── CompletedCard ──────────────────────────────────────────────────────────
interface CompletedCardProps {
  item: any;
  idx: number;
  uploadedReceipts: Record<string, boolean>;
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
  handleShowDetails: (app: any) => void;
  handleLiquidate: (app: any) => void;
  navigate: (step: AppStep, draft?: SavedDraft | null) => void;
  formatMoney: (amount: number) => string;
}

const statusConfig: Record<string, { label: string; cls: string; dot: string }> = {
  ACTIVE:           { label: 'Active',           cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20', dot: 'bg-emerald-500' },
  APPROVED:         { label: 'Approved',          cls: 'bg-blue-500/15 text-blue-600 border-blue-500/20',         dot: 'bg-blue-500' },
  DISBURSED:        { label: 'Disbursed',         cls: 'bg-blue-500/15 text-blue-600 border-blue-500/20',         dot: 'bg-blue-500' },
  COMPLETED:        { label: 'Completed',         cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20', dot: 'bg-emerald-500' },
  MATURED:          { label: 'Matured',           cls: 'bg-violet-500/15 text-violet-600 border-violet-500/20',   dot: 'bg-violet-500' },
  LIQUIDATED:       { label: 'Liquidated',        cls: 'bg-slate-500/15 text-slate-500 border-slate-500/20',      dot: 'bg-slate-400' },
  REJECTED:         { label: 'Rejected',          cls: 'bg-red-500/15 text-red-500 border-red-500/20',            dot: 'bg-red-500' },
  PENDING_PAYMENT:  { label: 'Pending Payment',   cls: 'bg-amber-500/15 text-amber-600 border-amber-500/20',      dot: 'bg-amber-500 animate-pulse' },
  REPAYMENT_STARTED:{ label: 'Repayment',         cls: 'bg-sky-500/15 text-sky-600 border-sky-500/20',            dot: 'bg-sky-500' },
  CLOSED:           { label: 'Closed',            cls: 'bg-slate-500/15 text-slate-500 border-slate-500/20',      dot: 'bg-slate-400' },
};

const CompletedCard: React.FC<CompletedCardProps> = ({
  item, idx, uploadedReceipts, openDropdownId, setOpenDropdownId,
  handleShowDetails, handleLiquidate, navigate, formatMoney
}) => {
  const isLoan = item.type.toLowerCase().includes('loan');
  const statusKey = (item.uploadedReceipts ? 'PAYMENT_VERIFYING' : item.status) as string;
  const s = statusConfig[statusKey] || { label: statusKey.replace(/_/g, ' '), cls: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
  const displayLabel = uploadedReceipts[item.id] ? 'Payment Verifying' : s.label;
  const displayCls   = uploadedReceipts[item.id] ? statusConfig['PENDING_PAYMENT'].cls : s.cls;
  const displayDot   = uploadedReceipts[item.id] ? 'bg-amber-500 animate-pulse' : s.dot;

  return (
    <div
      style={{ animationDelay: `${idx * 50}ms` }}
      className={`group relative bg-white dark:bg-slate-800/80 backdrop-blur border rounded-[2rem] p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-lg shadow-slate-100/80 dark:shadow-none hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
        openDropdownId === item.id ? 'z-50 border-primary/30 shadow-primary/5' : 'z-10 border-slate-100 dark:border-slate-700/60 hover:border-primary/20'
      }`}
    >
      {/* Subtle top accent line */}
      <div className={`absolute top-0 left-8 right-8 h-px ${isLoan ? 'bg-gradient-to-r from-transparent via-violet-300/40 to-transparent' : 'bg-gradient-to-r from-transparent via-primary/30 to-transparent'} rounded-full`} />

      {/* Icon */}
      <div className={`relative size-14 md:size-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
        isLoan ? 'bg-violet-500/10 text-violet-500 shadow-violet-500/10' : 'bg-primary/10 text-primary shadow-primary/10'
      }`}>
        <span className="material-symbols-outlined text-2xl md:text-3xl filled">{item.icon}</span>
        {/* Active pulse ring */}
        {item.status === 'ACTIVE' && (
          <span className="absolute inset-0 rounded-2xl ring-2 ring-emerald-400/30 animate-ping" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 space-y-2 text-center md:text-left min-w-0">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
          <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{item.type}</h3>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest border ${displayCls}`}>
            <span className={`size-1.5 rounded-full ${displayDot}`} />
            {displayLabel}
          </span>
        </div>

        {item.data?.isOnBehalf && (
          <div className="flex items-center justify-center md:justify-start gap-1.5 text-primary font-bold text-[10px] bg-primary/5 w-fit px-3 py-1 rounded-lg border border-primary/10">
            <span className="material-symbols-outlined text-xs">person</span>
            <span>For: {item.data.fullName}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
          <span className="text-lg font-black text-slate-800 dark:text-slate-100">{formatMoney(item.amount)}</span>
          <span className="text-xs text-slate-400 font-medium">Submitted {item.submittedAt}</span>
        </div>
      </div>

      {/* Actions dropdown */}
      <div className="relative z-30 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === item.id ? null : item.id); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md ${
            openDropdownId === item.id
              ? 'bg-primary text-white shadow-primary/20'
              : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-white hover:shadow-primary/20 shadow-slate-200/80 dark:shadow-none'
          }`}
        >
          Actions
          <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${openDropdownId === item.id ? 'rotate-180' : ''}`}>expand_more</span>
        </button>

        {openDropdownId === item.id && (
          <div
            className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-slate-100 dark:border-slate-700 py-3 animate-in fade-in slide-in-from-top-3 duration-200 z-[100]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-1.5 right-6 size-3 bg-white dark:bg-slate-800 rotate-45 border-l border-t border-slate-100 dark:border-slate-700" />
            <div className="px-4 py-2 mb-1 border-b border-slate-50 dark:border-slate-700/50">
              <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">{isLoan ? 'Loan Management' : 'Investment Management'}</p>
            </div>

            {!isLoan && (
              <>
                {item.data?.is_liquidating ? (
                  <div className="flex items-center gap-3 px-4 py-3 text-xs font-black text-amber-500 uppercase tracking-widest">
                    <span className="material-symbols-outlined text-base animate-pulse">pending</span>
                    Liquidation Processing
                  </div>
                ) : (
                  <>
                    {item.status !== 'PENDING_PAYMENT' && (
                      <button
                        onClick={() => { setOpenDropdownId(null); navigate('INVESTMENT_FLOW', { id: `T-${Math.floor(Math.random() * 9000) + 1000}`, type: 'INVESTMENT', subStep: 0, label: item.type, data: { isTopUp: true, originalInvestmentId: item.id.replace('INV-', ''), selectedPlan: item.type.includes('VAULT') ? 'VAULT' : item.type.includes('SURGE') ? 'SURGE' : 'RISE', cba_td_account_number: item.data?.cba_td_account_number, casa_account_number: item.data?.casa_account_number }, updatedAt: Date.now() }); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 transition-all uppercase tracking-widest group"
                      >
                        <span className="size-7 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                          <span className="material-symbols-outlined text-sm">add_circle</span>
                        </span>
                        Top-Up
                      </button>
                    )}
                    <button
                      onClick={() => { setOpenDropdownId(null); handleLiquidate(item); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-all uppercase tracking-widest group"
                    >
                      <span className="size-7 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                      </span>
                      Liquidate
                    </button>
                  </>
                )}
              </>
            )}

            {item.status === 'PENDING_PAYMENT' && !uploadedReceipts[item.id] && (
              <button
                onClick={() => { setOpenDropdownId(null); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-primary hover:bg-primary/5 transition-all uppercase tracking-widest group"
              >
                <span className="size-7 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-sm">payments</span>
                </span>
                Complete Payment
              </button>
            )}

            {uploadedReceipts[item.id] && (
              <div className="flex items-center gap-3 px-4 py-3 text-xs font-black text-emerald-500 uppercase tracking-widest">
                <span className="material-symbols-outlined text-base">check_circle</span>
                Receipt Uploaded
              </div>
            )}

            <button
              onClick={() => { setOpenDropdownId(null); handleShowDetails(item); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-primary/5 hover:text-primary transition-all uppercase tracking-widest group"
            >
              <span className="size-7 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-sm">verified</span>
              </span>
              Certificate
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ApplicationsList: React.FC<ApplicationsListProps> = ({ navigate, formatMoney, user }) => {

  const [activeTab, setActiveTab] = useState<'DRAFTS' | 'COMPLETED'>('COMPLETED');
  const [uploadingReceiptId, setUploadingReceiptId] = useState<string | null>(null);
  const [uploadedReceipts, setUploadedReceipts] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<SavedDraft[]>(storageService.getDrafts());
  const [completedApps, setCompletedApps] = useState<any[]>([]);
  const [pendingGift, setPendingGift] = useState<any>(null);

  // Modal State
  const [selectedApp, setSelectedApp] = useState<{ id: string, type: string, amount: number, data?: any } | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Computed values for Investment Certificate
  const isInvestment = selectedApp && !selectedApp.type.toLowerCase().includes('loan');

  const principal = selectedApp ? parseFloat(selectedApp.data?.investment_amount || selectedApp.amount || 0) : 0;
  const rate = selectedApp ? parseFloat(selectedApp.data?.interest_rate || 0) : 0;
  const tenureDays = selectedApp ? parseInt(selectedApp.data?.tenure_days || 0) : 0;

  const valDate = selectedApp?.data?.start_date 
    ? new Date(selectedApp.data.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) 
    : 'N/A';
  const matDate = selectedApp?.data?.maturity_date 
    ? new Date(selectedApp.data.maturity_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) 
    : 'N/A';

  const interestAmt = (principal * (rate / 100) * tenureDays) / 365;
  const whtAmt = interestAmt * 0.1; // 10% WHT
  const maturityValue = principal + interestAmt - whtAmt;

  const principalStr = principal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const interestAmtStr = interestAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const whtAmtStr = whtAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const maturityValueStr = maturityValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const casaNumber = selectedApp?.data?.casa_account_number || '22222222222222';
  const investmentType = selectedApp?.data?.investment_type || 'NOLT Investment';
  const customerName = selectedApp?.data?.fullName || user.name;

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showLiquidationModal, setShowLiquidationModal] = useState(false);
  const [liquidationType, setLiquidationType] = useState<'FULL' | 'CUSTOM'>('FULL');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Only close if the click was NOT on the Actions button area
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-trigger]') && !target.closest('[data-dropdown-menu]')) {
        setOpenDropdownId(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLiquidate = (app: any) => {
    setSelectedApp(app);
    setLiquidationType('FULL');
    setCustomAmount('');
    setShowLiquidationModal(true);
  };

  const validateLiquidation = () => {
    if (!selectedApp) return;
    
    const amountToLiquidate = liquidationType === 'FULL' ? selectedApp.amount : parseFloat(customAmount);
    
    if (isNaN(amountToLiquidate) || amountToLiquidate <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    
    if (amountToLiquidate > selectedApp.amount) {
      alert('Amount exceeds available investment balance.');
      return;
    }

    const maturityDate = selectedApp.data?.maturity_date ? new Date(selectedApp.data.maturity_date) : null;
    const today = new Date();
    
    if (maturityDate && today < maturityDate) {
      setShowWarningModal(true);
    } else {
      processLiquidation();
    }
  };

  const processLiquidation = async () => {
    setShowWarningModal(false);
    setShowLiquidationModal(false);
    setIsProcessing(true);
    
    try {
      const amountToLiquidate = liquidationType === 'FULL' ? selectedApp?.amount : parseFloat(customAmount);
      
      // Extract numeric ID from e.g. "INV-42"
      const realId = selectedApp?.id?.replace('INV-', '');

      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/investments/${realId}/liquidate`, {
        liquidation_type: liquidationType,
        amount: amountToLiquidate
      }, { withCredentials: true });

      setIsProcessing(false);
      setProcessingMessage(`Your liquidation request for ${selectedApp?.id} is being processed by our CX team. We will notify you once it moves to the next stage.`);
      
      // Update local state to reflect is_liquidating status to prevent duplicate clicks without refetching immediately
      setCompletedApps(prev => prev.map(app => 
        app.id === selectedApp?.id 
        ? { ...app, data: { ...app.data, is_liquidating: true } } 
        : app
      ));

      setTimeout(() => setProcessingMessage(null), 8000);
    } catch (err: any) {
      setIsProcessing(false);
      alert(err.response?.data?.message || 'Failed to submit liquidation request');
    }
  };


  useEffect(() => {
    setDrafts(storageService.getDrafts());

    // Fetch Completed Applications
    const fetchApplications = async () => {
      try {
        const [loansRes, investmentsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL || ''}/api/loans`, { withCredentials: true }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL || ''}/api/investments`, { withCredentials: true }).catch(() => ({ data: [] }))
        ]);
        
        console.log("DEBUG: Fetched Completed Loans:", loansRes.data);
        console.log("DEBUG: Fetched Completed Investments:", investmentsRes.data);
        
        let completed: any[] = [];
        
        if (Array.isArray(loansRes.data)) {
          // Filter for completed statuses (disbursed, rejected)
          // Also including repayment_started and closed as they are logically completed/advanced steps of disbursed
          const completedLoans = loansRes.data.filter((app: any) =>
            ['disbursed', 'rejected', 'repayment_started', 'closed', 'approved'].includes(app.status?.toLowerCase())
          ).map(app => ({
            id: String(app.id), // Ensure string for consistency
            type: 'Business Loan', // Default type or derive from data if available
            amount: parseFloat(['topup', 'add_on', 'add-on', 're-app', 're_app'].includes(app.loan_type?.toLowerCase()) ? app.topup_amount : app.loan_type === 'buy_over' ? app.buy_over_amount : app.requested_loan_amount || 0),
            submittedAt: formatDate(app.created_at),
            status: app.status.toUpperCase(),
            icon: app.status === 'rejected' ? 'cancel' : 'check_circle',
            // Ensure all fields are mapped
            data: {
              ...app, // Spread all properties
              isOnBehalf: app.applying_for_others,
              fullName: app.applicant_full_name,
              bankDetails: {
                bankName: app.bank_name,
                accountNumber: app.account_number,
                accountName: app.account_name
              },
              references: app.customer_references,
              // Additional Fields
              bvn: app.bvn,
              nin: app.nin,
              state_of_origin: app.state_of_origin,
              state_of_residence: app.state_of_residence,
              documents: {
                govt_id: app.govt_id_url,
                bank_statement: app.statement_of_account_url,
                proof_of_address: app.proof_of_residence_url,
                selfie: app.selfie_verification_url,
                work_id: app.work_id_url,
                payslip: app.payslip_url
              }
            }
          }));
          completed = [...completed, ...completedLoans];
        }

        if (Array.isArray(investmentsRes.data)) {
          const completedInvestments = investmentsRes.data.filter((app: any) =>
            ['active', 'completed', 'liquidated', 'matured', 'approved', 'rejected', 'pending_payment'].includes(app.status?.toLowerCase())
          ).map((app: any) => ({
            id: app.id ? `INV-${app.id}` : `INV-${Math.random().toString(36).substr(2, 5)}`,
            type: app.investment_type?.replace('_', ' ') + ' INVESTMENT' || 'INVESTMENT',
            amount: parseFloat(app.investment_amount || app.target_amount || 0),
            submittedAt: formatDate(app.created_at),
            status: app.status.toUpperCase(),
            icon: app.status === 'rejected' ? 'cancel' : (app.status === 'active' ? 'lock_clock' : 'trending_up'),
            data: {
              ...app,
              isOnBehalf: app.is_on_behalf,
              fullName: app.rep_full_name || app.company_name,
              bankDetails: {
                bankName: app.bank_name || app.rep_bank_name,
                accountNumber: app.account_number || app.rep_account_number,
                accountName: app.account_name || app.rep_account_name
              }
            }
          }));
          completed = [...completed, ...completedInvestments];
        }

        // Sort by submitted date descending
        completed.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

        setCompletedApps(completed);
      } catch (error) {
        console.error("Failed to fetch applications", error);
      }
    };
    fetchApplications();

    // Check for Pending Gift from Session Storage
    const checkPendingGift = async () => {
      const token = localStorage.getItem('pending_gift_token');
      if (token) {
        try {
          const { data } = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/investments/claim-gift/${token}`);
          setPendingGift({ ...data, token });
        } catch (e) {
          console.error("Failed to fetch pending gift matching token", e);
        }
      }
    };
    checkPendingGift();
  }, []);


  const handleUploadReceipt = (id: string) => {
    setUploadingReceiptId(id);
    setTimeout(() => {
      setUploadingReceiptId(null);
      setUploadedReceipts(prev => ({ ...prev, [id]: true }));
    }, 2000);
  };

  const handleResume = (draft: SavedDraft) => {
    if (draft.type === 'LOAN') {
      navigate('LOAN_TYPE', draft);
    } else {
      navigate('INVESTMENT_FLOW', draft);
    }
  };

  const handleDeleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation(); // stops the window 'click' listener too
    storageService.deleteDraft(id);
    setDrafts(storageService.getDrafts());
  };

  const handleShowDetails = (app: any) => {
    setSelectedApp(app);
    setShowModal(true);
  };

  const handleDownload = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 md:py-20 animate-in fade-in duration-500 print:p-0 print:max-w-none">
      <div className="print:hidden">
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="relative mb-14">
          {/* Ambient glow */}
          <div className="absolute -top-10 -left-10 size-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <button
            onClick={() => navigate('DASHBOARD')}
            className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-primary transition-colors mb-6 uppercase tracking-widest group"
          >
            <span className="material-symbols-outlined text-base group-hover:-translate-x-1 transition-transform">arrow_back</span>
            Dashboard
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-2">
              <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                My Applications
              </h1>
              <p className="text-slate-400 dark:text-slate-500 font-medium">Track submissions, manage active plans, resume drafts.</p>
            </div>

            {/* ── Tabs ── */}
            <div className="relative flex bg-slate-100 dark:bg-slate-800/80 backdrop-blur p-1.5 rounded-2xl gap-1 shadow-inner shrink-0">
              {/* Sliding active pill */}
              <button
                onClick={() => setActiveTab('COMPLETED')}
                className={`relative px-7 py-3 rounded-xl font-black text-sm transition-all duration-300 flex items-center gap-2 ${
                  activeTab === 'COMPLETED'
                    ? 'bg-white dark:bg-slate-700 text-primary shadow-md shadow-primary/10 scale-[1.02]'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <span className="material-symbols-outlined text-sm">verified</span>
                Completed
                <span className={`ml-1 px-2 py-0.5 rounded-lg text-[10px] font-black ${
                  activeTab === 'COMPLETED' ? 'bg-primary/10 text-primary' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                }`}>{completedApps.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('DRAFTS')}
                className={`relative px-7 py-3 rounded-xl font-black text-sm transition-all duration-300 flex items-center gap-2 ${
                  activeTab === 'DRAFTS'
                    ? 'bg-white dark:bg-slate-700 text-primary shadow-md shadow-primary/10 scale-[1.02]'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <span className="material-symbols-outlined text-sm">edit_document</span>
                Drafts
                {drafts.length > 0 && (
                  <span className={`ml-1 px-2 py-0.5 rounded-lg text-[10px] font-black ${
                    activeTab === 'DRAFTS' ? 'bg-primary/10 text-primary' : 'bg-amber-500/20 text-amber-500'
                  }`}>{drafts.length}</span>
                )}
              </button>
            </div>
          </div>
        </div>

      {activeTab === 'COMPLETED' && completedApps.some((i: any) => i.status === 'PENDING_PAYMENT' && !uploadedReceipts[i.id]) && (
        <div className="mb-8 p-6 bg-primary/10 border-2 border-primary/20 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500 print:hidden">
          <div className="flex items-center gap-5">
            <div className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <span className="material-symbols-outlined text-3xl filled">receipt_long</span>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Action Required: Upload Proof of Payment</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Your investment is pending confirmation. Please upload your transfer receipt below to activate your plan.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 print:hidden">
        {activeTab === 'DRAFTS' ? (
          <>
            {/* Pending Gift Banner */}
            {pendingGift && (
              <div className="mb-6 p-8 rounded-[2.5rem] bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-transparent border-2 border-rose-500/20 shadow-2xl shadow-rose-500/10 flex flex-col md:flex-row items-center gap-8 animate-in slide-in-from-top-4 duration-700 relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 size-40 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-all" />
                <div className="size-20 bg-rose-500 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-rose-500/40 shrink-0 transform -rotate-6 group-hover:rotate-0 transition-transform">
                  <span className="material-symbols-outlined text-4xl">redeem</span>
                </div>
                <div className="flex-1 space-y-2 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Incoming Gift Ready! 🎁</h3>
                    <span className="px-3 py-1 bg-rose-500 text-white text-[10px] font-black rounded-full uppercase tracking-widest animate-pulse">Claim Now</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 font-medium">You have a pending gift investment of <span className="text-rose-600 dark:text-rose-400 font-black">{formatMoney(parseFloat(pendingGift.amount))}</span> waiting for you.</p>
                </div>
                <button onClick={() => { localStorage.setItem('pending_gift_token', pendingGift.token); navigate('INVESTMENT_FLOW'); }} className="px-10 py-5 bg-rose-500 text-white font-black rounded-2xl shadow-xl shadow-rose-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3">
                  Claim Investment
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            )}

            {drafts.length > 0 ? drafts.map((draft, idx) => {
              const totalSteps = draft.type === 'LOAN' ? 12 : 11;
              const pct = Math.min(Math.round(((draft.subStep + 1) / totalSteps) * 100), 100);
              const isLoan = draft.type === 'LOAN';
              return (
                <div
                  key={draft.id}
                  style={{ animationDelay: `${idx * 60}ms` }}
                  className="group bg-white dark:bg-slate-800/80 backdrop-blur border border-slate-100 dark:border-slate-700/60 rounded-[2rem] p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-lg shadow-slate-200/50 dark:shadow-none hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 relative overflow-hidden"
                >
                  {/* Hover gradient - must be pointer-events-none or it blocks all card clicks */}
                  <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-primary/[0.02] to-transparent rounded-[2rem]" />


                  {/* Icon */}
                  <div className={`relative size-14 md:size-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                    isLoan ? 'bg-violet-500/10 text-violet-500 shadow-violet-500/10' : 'bg-primary/10 text-primary shadow-primary/10'
                  }`}>
                    <span className="material-symbols-outlined text-2xl md:text-3xl filled">{isLoan ? 'payments' : (draft.data?.isGift ? 'card_giftcard' : draft.data?.isTopUp ? 'add_circle' : 'trending_up')}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 space-y-1.5 text-center md:text-left min-w-0">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                      <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
                        {draft.label || (draft.type === 'LOAN' ? 'Business Loan' : (draft.data?.isGift ? 'Gift Investment 🎁' : (draft.data?.isTopUp ? 'Investment Top-Up' : 'NOLT Investment')))}
                      </h3>
                      <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-400 text-[10px] font-black rounded-lg uppercase tracking-widest shrink-0">#{draft.id}</span>
                    </div>
                    {draft.data?.isOnBehalf && (
                      <div className="flex items-center justify-center md:justify-start gap-1.5 text-primary font-bold text-[10px] bg-primary/5 w-fit px-3 py-1 rounded-lg border border-primary/10">
                        <span className="material-symbols-outlined text-xs">person</span>
                        <span>For: <span className="uppercase">{draft.data.fullName}</span></span>
                      </div>
                    )}
                    <p className="text-slate-400 text-sm font-medium">Step {draft.subStep + 1} of {totalSteps} &middot; Modified {formatDate(draft.updatedAt)}</p>
                  </div>

                  {/* Progress */}
                  <div className="w-full md:w-40 space-y-2 shrink-0">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">Progress</span>
                      <span className={pct >= 80 ? 'text-emerald-500' : 'text-primary'}>{pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          pct >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-primary/80 to-primary'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleDeleteDraft(draft.id, e)}
                      className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                      title="Delete draft"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                    <button
                      onClick={() => handleResume(draft)}
                      className="px-6 py-3.5 bg-primary text-white font-black text-sm rounded-xl shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-primary/40 active:scale-95 transition-all flex items-center gap-2"
                    >
                      Resume
                      <span className="material-symbols-outlined text-base">play_arrow</span>
                    </button>
                  </div>
                </div>
              );
            }) : (
              <div className="py-24 text-center space-y-5 animate-in fade-in duration-500">
                <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-4xl text-slate-300">folder_open</span>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-black text-slate-300 dark:text-slate-600">No saved drafts</p>
                  <p className="text-sm text-slate-400">Your in-progress applications will appear here.</p>
                </div>
                <button onClick={() => navigate('PRODUCT_SELECT')} className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-black text-sm rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
                  <span className="material-symbols-outlined text-base">add</span>
                  Start a new application
                </button>
              </div>
            )}
          </>
        ) : (
          /* ── COMPLETED TAB ─────────────────────────────────────── */
          <>
            {/* Pending payment alert */}
            {completedApps.some((i: any) => i.status === 'PENDING_PAYMENT' && !uploadedReceipts[i.id]) && (
              <div className="mb-6 p-6 bg-amber-500/10 border-2 border-amber-500/20 rounded-2xl flex items-center gap-5 animate-in slide-in-from-top-2 duration-500">
                <div className="size-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                  <span className="material-symbols-outlined text-2xl filled">receipt_long</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Action Required: Upload Proof of Payment</h3>
                  <p className="text-sm text-slate-500 font-medium">Your investment is pending confirmation — upload your transfer receipt to activate.</p>
                </div>
              </div>
            )}

            {completedApps.length === 0 ? (
              <div className="py-24 text-center space-y-5 animate-in fade-in duration-500">
                <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-4xl text-slate-300">inbox</span>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-black text-slate-300 dark:text-slate-600">No completed applications</p>
                  <p className="text-sm text-slate-400">Submitted loans and active investments will appear here.</p>
                </div>
              </div>
            ) : (
              <>
                {/* ── Completed Investments ── */}
                {completedApps.filter(a => !a.type.toLowerCase().includes('loan')).length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                      <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-base">trending_up</span>
                      </div>
                      <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Investments</h2>
                      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                      <span className="text-[10px] font-black text-slate-300 dark:text-slate-600">{completedApps.filter(a => !a.type.toLowerCase().includes('loan')).length} record{completedApps.filter(a => !a.type.toLowerCase().includes('loan')).length !== 1 ? 's' : ''}</span>
                    </div>
                    {completedApps.filter(a => !a.type.toLowerCase().includes('loan')).map((item: any, idx: number) => (
                      <CompletedCard key={item.id} item={item} idx={idx} uploadedReceipts={uploadedReceipts} openDropdownId={openDropdownId} setOpenDropdownId={setOpenDropdownId} handleShowDetails={handleShowDetails} handleLiquidate={handleLiquidate} navigate={navigate} formatMoney={formatMoney} />
                    ))}
                  </div>
                )}

                {/* ── Completed Loans ── */}
                {completedApps.filter(a => a.type.toLowerCase().includes('loan')).length > 0 && (
                  <div className="space-y-4 mt-8">
                    <div className="flex items-center gap-3 px-1">
                      <div className="size-8 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-base">payments</span>
                      </div>
                      <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Loans</h2>
                      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                      <span className="text-[10px] font-black text-slate-300 dark:text-slate-600">{completedApps.filter(a => a.type.toLowerCase().includes('loan')).length} record{completedApps.filter(a => a.type.toLowerCase().includes('loan')).length !== 1 ? 's' : ''}</span>
                    </div>
                    {completedApps.filter(a => a.type.toLowerCase().includes('loan')).map((item: any, idx: number) => (
                      <CompletedCard key={item.id} item={item} idx={idx} uploadedReceipts={uploadedReceipts} openDropdownId={openDropdownId} setOpenDropdownId={setOpenDropdownId} handleShowDetails={handleShowDetails} handleLiquidate={handleLiquidate} navigate={navigate} formatMoney={formatMoney} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>


      {processingMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] w-full max-w-md px-6 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl border border-white/10 flex items-start gap-4">
            <div className="size-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined filled">check_circle</span>
            </div>
            <div className="space-y-1">
              <p className="font-black uppercase tracking-tight text-sm">Request Processing</p>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">{processingMessage}</p>
            </div>
            <button onClick={() => setProcessingMessage(null)} className="text-slate-500 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-sm bg-slate-900/20">
          <div className="bg-white dark:bg-slate-800 p-12 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in duration-300">
            <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Processing Request...</p>
          </div>
        </div>
      )}

      {/* Liquidation Form Modal */}
      {showLiquidationModal && selectedApp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-md">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setShowLiquidationModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-lg rounded-[3rem] shadow-2xl p-8 md:p-12 animate-in zoom-in duration-500 border border-white/20 dark:border-slate-700">
            <div className="text-center space-y-4 mb-10">
              <div className="size-20 rounded-[2rem] bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-4xl filled">account_balance_wallet</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Liquidate Investment</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Available Balance: <span className="text-slate-900 dark:text-white font-black">{formatMoney(selectedApp.amount)}</span></p>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setLiquidationType('FULL')}
                  className={`p-6 rounded-3xl border-2 transition-all text-left space-y-2 ${liquidationType === 'FULL' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'}`}
                >
                  <div className={`size-6 rounded-full border-2 flex items-center justify-center ${liquidationType === 'FULL' ? 'border-primary' : 'border-slate-300'}`}>
                    {liquidationType === 'FULL' && <div className="size-3 bg-primary rounded-full"></div>}
                  </div>
                  <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Full Amount</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatMoney(selectedApp.amount)}</p>
                </button>
                <button 
                  onClick={() => setLiquidationType('CUSTOM')}
                  className={`p-6 rounded-3xl border-2 transition-all text-left space-y-2 ${liquidationType === 'CUSTOM' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'}`}
                >
                  <div className={`size-6 rounded-full border-2 flex items-center justify-center ${liquidationType === 'CUSTOM' ? 'border-primary' : 'border-slate-300'}`}>
                    {liquidationType === 'CUSTOM' && <div className="size-3 bg-primary rounded-full"></div>}
                  </div>
                  <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Custom Amount</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Specify Value</p>
                </button>
              </div>

              {liquidationType === 'CUSTOM' && (
                <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Enter Amount</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                    <input 
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 pl-10 pr-6 font-black text-xl text-slate-900 dark:text-white focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowLiquidationModal(false)}
                  className="flex-1 py-5 rounded-full font-black text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-xs"
                >
                  Cancel
                </button>
                <button 
                  onClick={validateLiquidation}
                  className="flex-[2] py-5 bg-red-500 text-white font-black rounded-full shadow-xl shadow-red-500/20 hover:-translate-y-1 transition-all uppercase tracking-widest text-xs active:scale-95"
                >
                  Confirm Liquidation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal for Early Liquidation */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-md">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setShowWarningModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-md rounded-[3rem] shadow-2xl p-8 md:p-12 animate-in zoom-in duration-500 border border-red-100 dark:border-red-900/30">
            <div className="text-center space-y-6">
              <div className="size-20 rounded-[2rem] bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto animate-bounce">
                <span className="material-symbols-outlined text-4xl filled">warning</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Early Liquidation Warning</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Your investment has not reached its maturity date. 
                  Liquidating now will attract a <span className="text-red-500 font-black">10% early termination fee</span> on the principal amount.
                </p>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 text-left">
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-400 uppercase tracking-widest">Estimated Fine</span>
                  <span className="text-red-500">{formatMoney((liquidationType === 'FULL' ? (selectedApp?.amount || 0) : parseFloat(customAmount || '0')) * 0.1)}</span>
                </div>
                <div className="flex justify-between text-xs font-black">
                  <span className="text-slate-900 dark:text-white uppercase tracking-widest">Net Payout</span>
                  <span className="text-emerald-500">{formatMoney((liquidationType === 'FULL' ? (selectedApp?.amount || 0) : parseFloat(customAmount || '0')) * 0.9)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={processLiquidation}
                  className="w-full py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black rounded-full shadow-xl hover:-translate-y-1 transition-all uppercase tracking-widest text-xs active:scale-95"
                >
                  I Consent, Proceed
                </button>
                <button 
                  onClick={() => setShowWarningModal(false)}
                  className="w-full py-5 rounded-full font-black text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-xs"
                >
                  Wait for Maturity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      </div>

      {/* Agreement Modal */}
      {showModal && selectedApp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300 backdrop-blur-md overflow-y-auto print:fixed print:inset-0 print:z-[1000] print:bg-white print:p-0 modal-container">
          <div className="absolute inset-0 bg-slate-900/60 print:hidden" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-500 border border-white/20 dark:border-slate-700 print:shadow-none print:border-none print:rounded-none print:w-full print:max-w-none">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">description</span>
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Application Details</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{selectedApp.id} • {selectedApp.type}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Print Styles to hide background and force high-quality print */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                @page { margin: 0; size: auto; }
                body { 
                  margin: 0 !important; 
                  padding: 0 !important; 
                  background: white !important; 
                  width: 100% !important;
                }
                
                /* Completely hide UI but leave the Modal path open */
                header, footer, nav, aside, .no-print, .print-hidden, 
                .back-button-glow, .bg-slate-900\\/60,
                #ze-snippet, #launcher, .zEWidget-launcher, .zEWidget-messenger, 
                iframe[name="launcher"] { 
                  display: none !important; 
                }

                /* Force the modal to become the single source of truth */
                .modal-container {
                   display: block !important;
                   position: absolute !important;
                   left: 0 !important;
                   top: 0 !important;
                   width: 100% !important;
                   height: auto !important;
                   padding: 0 !important;
                   margin: 0 !important;
                   background: white !important;
                   z-index: 1 !important;
                   visibility: visible !important;
                }

                .modal-container > * {
                  display: block !important;
                  width: 100% !important;
                }

                /* Targeted Certificate Alignment */
                .modal-container .max-w-3xl, .modal-container .max-w-\\[700px\\] {
                  width: 210mm !important; /* A4 Width */
                  max-width: 100% !important;
                  margin: 0 auto !important;
                  padding: 2.5cm !important; /* Proper Page Margins */
                  background: white !important;
                  border: none !important;
                  box-shadow: none !important;
                  border-radius: 0 !important;
                }

                /* Force Grid Columns to Stay side-by-side during print */
                .intro-grid-print {
                  display: grid !important;
                  grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
                  gap: 1.5rem !important;
                  align-items: center !important;
                }
                .investor-details-print {
                  grid-column: span 3 / span 3 !important;
                }
                .nuban-card-print {
                  grid-column: span 2 / span 2 !important;
                }

                /* Remove scrollbars and overflows for print */
                .overflow-y-auto { overflow: visible !important; }
                .flex-1 { flex: none !important; display: block !important; }

                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              }
            `}} />

            {/* Modal Content - Full Details (Certificate View) */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-slate-50 dark:bg-slate-900/50 print:bg-white print:p-0">
              {isInvestment ? (
                /* ══ BEAUTIFUL BRANDED INVESTMENT CERTIFICATE (EXACT TEMPLATE) ══ */
                <div className="max-w-[700px] mx-auto bg-[#d6e8f7] rounded-[14px] overflow-hidden shadow-2xl print:bg-white print:shadow-none print:rounded-none">
                  {/* HEADER */}
                  <div className="bg-[#028ff5] p-8 pb-4 text-white relative flex justify-between items-end min-h-[140px] rounded-t-[14px] print:rounded-none">
                    <div className="space-y-3">
                      <img 
                        src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/NF-Logo-White%20(2).png" 
                        alt="NOLT Finance" 
                        className="h-10 w-auto object-contain"
                      />
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/80">Investment Certificate</p>
                      <p className="text-[9px] text-white/60">NOLT Finance Company Limited &nbsp;•&nbsp; RC: 1870631</p>
                    </div>
                    <img 
                      src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Inv_Bkt-view.png" 
                      alt="Certificate of Investment" 
                      className="h-28 w-auto object-contain z-10 shrink-0 print:h-20"
                    />
                  </div>
                  
                  {/* ACCENT BARS */}
                  <div className="h-1 bg-white"></div>
                  <div className="h-0.5 bg-[#f8c14b]"></div>

                  {/* MAIN BODY */}
                  <div className="bg-white p-8 md:p-10 space-y-8 text-slate-800">
                    {/* INTRO GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center intro-grid-print">
                      {/* Left: Investor Details */}
                      <div className="md:col-span-3 space-y-2 investor-details-print">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#028ff5]">This is to certify that —</p>
                        <h2 className="text-2xl font-black text-[#031421] leading-tight uppercase">{customerName}</h2>
                        <p className="text-xs text-slate-500 font-bold">Has invested the sum of</p>
                        <p className="text-2xl font-black text-[#028ff5]">&#8358;{principalStr}</p>
                        <p className="text-xs text-slate-500 font-medium">In the <strong className="text-[#031421] uppercase">{investmentType.replace('_', ' ')}</strong> product</p>
                        <p className="text-xs text-slate-400">Investment ID: <strong className="text-[#031421]">{selectedApp.data?.cba_td_account_number ? `#${selectedApp.data.cba_td_account_number}` : `#${selectedApp.id}`}</strong></p>
                      </div>

                      {/* Right: NUBAN Card */}
                      <div className="md:col-span-2 rounded-[8px] overflow-hidden shadow-lg border border-slate-100 nuban-card-print">
                        <div className="bg-[#028ff5] px-4 py-2">
                          <p className="text-[9px] font-black uppercase tracking-wider text-white">Account Number</p>
                        </div>
                        <div className="bg-[#031421] p-4 text-white space-y-3">
                          <p className="text-xl font-black text-[#f8c14b] tracking-wider">{casaNumber}</p>
                          <div className="border-t border-white/10"></div>
                          <p className="text-[10px] leading-relaxed text-[#ade5fc]/80 font-medium">To top up on your investment, make transfers to your account number <strong className="text-white">{casaNumber}</strong>.</p>
                        </div>
                      </div>
                    </div>

                    {/* DETAILS CARD */}
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500 font-medium">Transaction details are as follows:</p>
                      <div className="bg-[#031421] text-white rounded-[10px] overflow-hidden shadow-lg">
                        {/* Details Header */}
                        <div className="bg-[#028ff5] px-6 py-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-white">Transaction Details</p>
                        </div>
                        
                        {/* Details Body */}
                        <div className="grid grid-cols-2 divide-x divide-white/5">
                          {/* LEFT */}
                          <div className="p-6 space-y-4">
                            <div className="border-b border-white/5 pb-3">
                              <p className="text-[9px] font-black uppercase tracking-wider text-[#ade5fc]">Principal</p>
                              <p className="text-base font-black text-[#f8c14b]">&#8358;{principalStr}</p>
                            </div>
                            <div className="border-b border-white/5 pb-3">
                              <p className="text-[9px] font-black uppercase tracking-wider text-[#ade5fc]">Tenure</p>
                              <p className="text-sm font-bold">{tenureDays} Day(s)</p>
                            </div>
                            <div className="border-b border-white/5 pb-3">
                              <p className="text-[9px] font-black uppercase tracking-wider text-[#ade5fc]">Interest Rate</p>
                              <p className="text-sm font-bold">{rate.toFixed(2)}% per annum</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-wider text-[#ade5fc]">Value Date</p>
                              <p className="text-sm font-bold">{valDate}</p>
                            </div>
                          </div>

                          {/* RIGHT */}
                          <div className="p-6 space-y-4">
                            <div className="border-b border-white/5 pb-3">
                              <p className="text-[9px] font-black uppercase tracking-wider text-[#ade5fc]">Maturity Date</p>
                              <p className="text-sm font-bold">{matDate}</p>
                            </div>
                            <div className="border-b border-white/5 pb-3">
                              <p className="text-[9px] font-black uppercase tracking-wider text-[#ade5fc]">Interest Amount</p>
                              <p className="text-sm font-black text-[#35A374]">&#8358;{interestAmtStr}</p>
                            </div>
                            <div className="border-b border-white/5 pb-3">
                              <p className="text-[9px] font-black uppercase tracking-wider text-[#ade5fc]">WHT</p>
                              <p className="text-sm font-bold">&#8358;{whtAmtStr}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-wider text-[#ade5fc]">Maturity Value</p>
                              <p className="text-base font-black text-[#f8c14b]">&#8358;{maturityValueStr}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DISCLAIMER */}
                    <div className="flex rounded-r-[6px] rounded-l-none overflow-hidden border border-[#028ff5]/10">
                      <div className="w-1 bg-[#028ff5]"></div>
                      <div className="bg-[#e8f4fe] p-4 flex-1">
                        <p className="text-[11px] leading-relaxed text-[#444444] italic font-medium">Please note that pre-liquidation of this investment before the maturity date above will attract a <strong className="text-red-600">30% charge on the accrued interest</strong>. However, if we do not receive any instruction from you on maturity, we shall be pleased to roll over at the terms and conditions prevailing on the rollover date.</p>
                      </div>
                    </div>

                    {/* SIGNATURES */}
                    <div className="pt-8 border-t border-slate-100 flex justify-between items-end gap-6">
                      {/* Sig 1 */}
                      <div className="w-1/3 text-left space-y-2">
                        <img 
                          src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Inv_AS1.png" 
                          alt="Authorized Signatory 1" 
                          className="h-10 w-auto object-contain"
                        />
                        <div className="border-t border-[#031421] pt-1">
                          <p className="text-[10px] font-black text-[#031421] uppercase">Authorized Signatory</p>
                          <p className="text-[9px] text-[#028ff5]">NOLT Finance</p>
                        </div>
                      </div>

                      {/* Stamp */}
                      <div className="w-1/3 flex justify-center">
                        <img 
                          src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/NF_Stamp.jpg" 
                          alt="Stamp" 
                          className="h-16 w-auto object-contain rounded-full shadow-sm"
                        />
                      </div>

                      {/* Sig 2 */}
                      <div className="w-1/3 text-right space-y-2">
                        <img 
                          src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Inv_AS2.png" 
                          alt="Authorized Signatory 2" 
                          className="h-10 w-auto object-contain ml-auto"
                        />
                        <div className="border-t border-[#031421] pt-1">
                          <p className="text-[10px] font-black text-[#031421] uppercase">Authorized Signatory</p>
                          <p className="text-[9px] text-[#028ff5]">NOLT Finance</p>
                        </div>
                      </div>
                    </div>

                    {/* SEAL NOTE */}
                    <div className="pt-6 border-t border-slate-100 text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">This is a computer-generated document. No physical signature is required.</p>
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="bg-[#031421] px-8 py-4 text-white text-[9px] flex justify-between items-center rounded-b-[14px] print:rounded-none">
                    <p className="text-slate-400">NOLT Finance Company Limited &nbsp;•&nbsp; RC: 1870631</p>
                    <p className="font-bold text-[#ade5fc] uppercase tracking-wider">Licensed by CBN</p>
                    <p className="font-bold text-[#ade5fc]">www.noltfinance.com</p>
                  </div>
                </div>
              ) : (
                /* ══ DEFAULT LOAN AGREEMENT TEMPLATE ══ */
                <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 p-8 md:p-16 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-700 space-y-10 print:shadow-none print:border-none print:p-0">
                  {/* Document Header / Letterhead */}
                  <div className="flex justify-between items-start border-b-2 border-slate-100 dark:border-slate-700 pb-8 min-h-[120px]">
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-primary mb-2">
                         <img 
                          src="https://noltfinance.s3.us-east-1.amazonaws.com/logo+updated+white.png" 
                          className="h-12 w-auto object-contain [filter:invert(38%)_sepia(98%)_saturate(2136%)_hue-rotate(187deg)_brightness(101%)_contrast(101%)] dark:[filter:none]" 
                          alt="NOLT" 
                        />
                      </div>
                      <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        Loan Agreement
                      </h1>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date Issued</p>
                      <p className="font-bold dark:text-white">{selectedApp.submittedAt || new Date().toLocaleDateString()}</p>
                      <div className="mt-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                        <p className={`text-xs font-black px-3 py-1 rounded-full inline-block ${selectedApp.status === 'ACTIVE' || selectedApp.status === 'DISBURSED' || selectedApp.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
                          {selectedApp.status}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Agreement Body / Clauses */}
                  <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed font-medium space-y-8">
                    <section>
                      <h4 className="text-slate-900 dark:text-white font-black uppercase text-sm tracking-widest mb-4 flex items-center gap-2">
                        <span className="size-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px]">01</span>
                        Parties Involved
                      </h4>
                      <p className="pl-8">
                        This formal certificate serves as an agreement between <strong>NOLT Finance</strong> ("The Provider") and the Applicant identified as <strong>{selectedApp.data?.fullName || user.name}</strong> (Account ID: #{selectedApp.id}).
                      </p>
                    </section>
                    
                    <section>
                      <h4 className="text-slate-900 dark:text-white font-black uppercase text-sm tracking-widest mb-4 flex items-center gap-2">
                        <span className="size-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px]">02</span>
                        Principal Loan Amount
                      </h4>
                      <p className="pl-8">
                        The total sum agreed upon for this disbursement is <strong>{formatMoney(selectedApp.amount)}</strong>. All interest calculations, payment cycles, and maturity terms are strictly governed by the standard operating policy of NOLT Finance.
                      </p>
                    </section>

                    <section>
                      <h4 className="text-slate-900 dark:text-white font-black uppercase text-sm tracking-widest mb-4 flex items-center gap-2">
                        <span className="size-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px]">03</span>
                        Compliance & Security
                      </h4>
                      <p className="pl-8">
                        The Client agrees to maintain the accuracy of all provided data. NOLT Finance guarantees the security of all funds/data transition and confirms that this loan follows all registered and regulatory compliance mandates.
                      </p>
                    </section>
                  </div>

                  {/* Signature Section */}
                  <div className="pt-10 border-t-2 border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-end gap-8">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Digital Signature</p>
                      <div className="w-64 h-24 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center relative overflow-hidden">
                          {/* Display User's REAL signature if available */}
                          {selectedApp.data?.signatures?.[0] ? (
                            <img 
                              src={selectedApp.data.signatures[0]} 
                              alt="Digital Signature" 
                              className="w-full h-full object-contain px-4" 
                            />
                          ) : (
                            <svg className="absolute inset-0 w-full h-full text-primary opacity-80" viewBox="0 0 200 80">
                                <path d="M20,60 C40,20 60,80 80,40 C100,0 120,60 140,20 C160,-20 180,40 190,30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                          )}
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Verified via NOLT Platform</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Authorized Seal</p>
                      <div className="size-24 rounded-full border-4 border-primary/20 flex items-center justify-center text-primary ml-auto relative">
                          <div className="absolute inset-2 rounded-full border border-primary/10 border-dashed animate-spin-slow"></div>
                          <span className="material-symbols-outlined text-5xl filled">verified</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 text-center border-t border-slate-100 dark:border-slate-700">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em]">This is a computer-generated document. No physical signature is required.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col sm:flex-row items-center justify-end gap-4 shrink-0 print:hidden">
              <button
                onClick={() => setShowModal(false)}
                className="w-full sm:w-auto px-8 py-3 rounded-full font-black text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                Back to List
              </button>
              <button
                onClick={handleDownload}
                className="w-full sm:w-auto px-10 py-4 bg-primary text-white font-black rounded-full shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                Download PDF
                <span className="material-symbols-outlined">download</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-16 p-8 rounded-[2rem] bg-primary/5 dark:bg-slate-900/50 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-8 print:hidden">
        <div className="flex items-center gap-6 text-center md:text-left">
          <div className="size-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <span className="material-symbols-outlined filled text-3xl">support_agent</span>
          </div>
          <div>
            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">Need Assistance?</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed">Our team is available 24/7 to help you with your applications or payment confirmations.</p>
          </div>
        </div>
        <button 
          onClick={() => (window as any).zE?.('messenger', 'open')}
          className="whitespace-nowrap px-10 py-4 rounded-full border-2 border-primary text-primary font-black text-sm hover:bg-primary hover:text-white transition-all active:scale-95"
        >
          Talk to Us
        </button>
      </div>
    </div>
  );
};

export default ApplicationsList;