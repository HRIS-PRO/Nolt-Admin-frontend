import React, { useState, useEffect } from 'react';
import { AppStep, SavedDraft } from '../types';
import { storageService } from '../services/storageService';
import axios from 'axios';
import { formatDate } from '../utils/dateFormatter';

interface ApplicationsListProps {
  navigate: (step: AppStep, draft?: SavedDraft | null) => void;
  formatMoney: (amount: number) => string;
}

const ApplicationsList: React.FC<ApplicationsListProps> = ({ navigate, formatMoney }) => {
  const [activeTab, setActiveTab] = useState<'DRAFTS' | 'COMPLETED'>('DRAFTS');
  const [uploadingReceiptId, setUploadingReceiptId] = useState<string | null>(null);
  const [uploadedReceipts, setUploadedReceipts] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<SavedDraft[]>(storageService.getDrafts());
  const [completedApps, setCompletedApps] = useState<any[]>([]);
  const [pendingGift, setPendingGift] = useState<any>(null);

  // Modal State
  const [selectedApp, setSelectedApp] = useState<{ id: string, type: string, amount: number, data?: any } | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setDrafts(storageService.getDrafts());

    // Fetch Completed Applications
    const fetchApplications = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/loans`, { withCredentials: true });
        console.log("DEBUG: Fetched Completed Loans:", data);
        if (Array.isArray(data)) {
          // Filter for completed statuses (disbursed, rejected)
          // Also including repayment_started and closed as they are logically completed/advanced steps of disbursed
          const completed = data.filter((app: any) =>
            ['disbursed', 'rejected', 'repayment_started', 'closed', 'approved'].includes(app.status?.toLowerCase())
          ).map(app => ({
            id: String(app.id), // Ensure string for consistency
            type: 'Business Loan', // Default type or derive from data if available
            amount: parseFloat(app.requested_loan_amount),
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
          setCompletedApps(completed);
        }
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 print:hidden">
        <div className="space-y-2">
          <button
            onClick={() => navigate('DASHBOARD')}
            className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-primary transition-colors mb-4 uppercase tracking-widest"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Dashboard
          </button>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">My Applications</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your ongoing drafts and track submission status.</p>
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex gap-1 shadow-inner">
          <button
            onClick={() => setActiveTab('DRAFTS')}
            className={`px-8 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'DRAFTS' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Drafts ({drafts.length})
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-8 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'COMPLETED' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Completed ({completedApps.length})
          </button>
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

      <div className="grid grid-cols-1 gap-6 print:hidden">
        {activeTab === 'DRAFTS' ? (
          <>
            {/* Surfaced Pending Gift Block */}
            {pendingGift && (
              <div className="mb-8 p-8 rounded-[3rem] bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-transparent border-2 border-rose-500/20 shadow-2xl shadow-rose-500/10 flex flex-col md:flex-row items-center gap-8 animate-in slide-in-from-top-4 duration-700 relative overflow-hidden group">
                   <div className="absolute -top-10 -right-10 size-40 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-all"></div>
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
                   <div className="flex items-center gap-4">
                     <button onClick={() => { localStorage.setItem('pending_gift_token', pendingGift.token); navigate('INVESTMENT_FLOW'); }} className="px-10 py-5 bg-rose-500 text-white font-black rounded-2xl shadow-xl shadow-rose-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3">
                       Claim Investment
                       <span className="material-symbols-outlined">arrow_forward</span>
                     </button>
                   </div>
              </div>
            )}

            {drafts.length > 0 ? (
            drafts.map((draft) => (
              <div
                key={draft.id}
                className="group bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-8 shadow-xl shadow-slate-200/40 dark:shadow-none hover:border-primary transition-all relative overflow-hidden"
              >
                <div className={`size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0`}>
                  <span className="material-symbols-outlined text-3xl filled">{draft.type === 'LOAN' ? 'payments' : 'trending_up'}</span>
                </div>

                <div className="flex-1 space-y-1 text-center md:text-left">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {draft.label || (draft.type === 'LOAN' ? 'Business Loan' : (draft.data?.isGift ? 'Gift Investment 🎁' : (draft.data?.isTopUp ? 'Investment Top-Up' : 'NOLT Investment')))}
                    </h3>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 text-[10px] font-black rounded-full uppercase tracking-widest">#{draft.id}</span>
                  </div>

                  {/* On Behalf Indicator */}
                  {draft.data?.isOnBehalf && (
                    <div className="flex items-center justify-center md:justify-start gap-2 text-primary font-bold text-xs bg-primary/5 w-fit px-3 py-1.5 rounded-lg border border-primary/10">
                      <span className="material-symbols-outlined text-sm">person</span>
                      <span>Applied for: <span className="uppercase">{draft.data.fullName}</span></span>
                    </div>
                  )}

                  <p className="text-slate-500 font-bold">Step {draft.subStep + 1} of {draft.type === 'LOAN' ? 12 : 11}</p>
                  <p className="text-xs text-slate-400 font-medium">Modified {formatDate(draft.updatedAt)}</p>
                </div>

                <div className="w-full md:w-48 space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                    <span>Progress</span>
                    <span>{Math.round(((draft.subStep + 1) / (draft.type === 'LOAN' ? 12 : 11)) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${((draft.subStep + 1) / (draft.type === 'LOAN' ? 12 : 11)) * 100}%` }}></div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDeleteDraft(draft.id, e)}
                    className="p-4 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                  <button
                    onClick={() => handleResume(draft)}
                    className="w-full md:w-auto px-10 py-4 bg-primary text-white font-black rounded-full shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    Resume
                    <span className="material-symbols-outlined">play_arrow</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center space-y-4">
              <span className="material-symbols-outlined text-6xl text-slate-200">folder_open</span>
              <p className="text-slate-400 font-bold">No saved drafts found.</p>
              <button onClick={() => navigate('PRODUCT_SELECT')} className="text-primary font-black uppercase tracking-widest text-sm hover:underline">Start a new one</button>
            </div>
            )}
          </>
        ) : (
          completedApps.map((item: any) => (
            <div
              key={item.id}
              className="bg-slate-900 dark:bg-slate-950 text-white rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

              <div className="size-16 rounded-2xl bg-white/10 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-3xl filled">{item.icon}</span>
              </div>

              <div className="flex-1 space-y-2 text-center md:text-left relative z-10">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <h3 className="text-xl font-black uppercase tracking-tight">{item.type}</h3>
                  <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest ${item.status === 'PENDING_PAYMENT' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-primary text-white'}`}>
                    {uploadedReceipts[item.id] ? 'PAYMENT VERIFYING' : item.status.replace('_', ' ')}
                  </span>
                </div>

                {/* On Behalf Indicator for Completed Applications */}
                {item.data?.isOnBehalf && (
                  <div className="flex items-center justify-center md:justify-start gap-2 text-primary font-bold text-[10px] bg-primary/10 w-fit px-3 py-1.5 rounded-full border border-primary/20 uppercase tracking-widest">
                    <span className="material-symbols-outlined text-sm">person</span>
                    <span>Representative for: {item.data.fullName}</span>
                  </div>
                )}

                <p className="text-slate-300 font-bold">{formatMoney(item.amount)}</p>
                <p className="text-xs text-slate-400 font-medium">Submitted on {item.submittedAt}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                {item.status === 'PENDING_PAYMENT' && !uploadedReceipts[item.id] && (
                  <button
                    onClick={() => handleUploadReceipt(item.id)}
                    disabled={uploadingReceiptId === item.id}
                    className="px-8 py-4 bg-primary text-white font-black rounded-full hover:bg-primary-dark transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {uploadingReceiptId === item.id ? (
                      <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span className="material-symbols-outlined">cloud_upload</span>
                    )}
                    {uploadingReceiptId === item.id ? 'Uploading...' : 'Upload Receipt'}
                  </button>
                )}
                {uploadedReceipts[item.id] && (
                  <div className="px-8 py-4 bg-green-500/10 text-green-500 border border-green-500/30 rounded-full font-black flex items-center gap-2">
                    <span className="material-symbols-outlined filled">check_circle</span>
                    Receipt Provided
                  </div>
                )}
                <button
                  onClick={() => handleShowDetails(item)}
                  className="px-8 py-4 bg-white/10 text-white font-black rounded-full hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                >
                  Details
                  <span className="material-symbols-outlined">receipt_long</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Agreement Modal */}
      {showModal && selectedApp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300 backdrop-blur-md overflow-y-auto print:fixed print:inset-0 print:z-[1000] print:bg-white print:p-0">
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

            {/* Modal Content - Full Details */}
            <div className="flex-1 p-8 md:p-12 bg-slate-50 dark:bg-slate-900/50 print:bg-white print:p-8">
              <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 p-8 md:p-16 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-700 space-y-10 print:shadow-none print:border-none print:p-0">
                {/* Document Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-100 dark:border-slate-700 pb-8">
                  <div>
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <img src="/logo.png" className="h-8" alt="NOLT" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Loan Application</h1>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <p className="font-bold text-primary">{selectedApp.status}</p>
                    <p className="text-xs text-slate-400 mt-2">Submitted: {selectedApp.submittedAt}</p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">

                  {/* Applicant Info */}
                  <div className="col-span-full">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Applicant Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs uppercase font-bold">Full Name</p>
                        <p className="font-bold dark:text-white">
                          {selectedApp.data?.applicant_full_name ||
                            (selectedApp.data?.surname && selectedApp.data?.first_name
                              ? `${selectedApp.data.surname} ${selectedApp.data.first_name} ${selectedApp.data.middle_name || ''}`
                              : 'N/A')}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase font-bold">Mobile</p>
                        <p className="font-bold dark:text-white">{selectedApp.data?.mobile_number || 'N/A'}</p>
                      </div>

                      <div>
                        <p className="text-slate-500 text-xs uppercase font-bold">Email</p>
                        <p className="font-bold dark:text-white">{selectedApp.data?.personal_email}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase font-bold">Date of Birth</p>
                        <p className="font-bold dark:text-white">{formatDate(selectedApp.data?.date_of_birth)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase font-bold">BVN</p>
                        <p className="font-bold dark:text-white font-mono tracking-wider">{selectedApp.data?.bvn || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase font-bold">NIN</p>
                        <p className="font-bold dark:text-white font-mono tracking-wider">{selectedApp.data?.nin || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase font-bold">State of Origin</p>
                        <p className="font-bold dark:text-white">{selectedApp.data?.state_of_origin || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase font-bold">State of Residence</p>
                        <p className="font-bold dark:text-white">{selectedApp.data?.state_of_residence || 'N/A'}</p>
                      </div>
                      <div className="col-span-full">
                        <p className="text-slate-500 text-xs uppercase font-bold">Primary Address</p>
                        <p className="font-bold dark:text-white">{selectedApp.data?.primary_home_address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Loan Details */}
                  <div className="col-span-full">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Loan Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs uppercase font-bold">Amount Requested</p>
                        <p className="font-bold text-lg text-primary">{formatMoney(selectedApp.amount)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase font-bold">Tenure</p>
                        <p className="font-bold dark:text-white">{selectedApp.data?.loan_tenure_months} Months</p>
                      </div>
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div className="col-span-full">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Disbursement Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs uppercase font-bold">Bank Name</p>
                        <p className="font-bold dark:text-white">{selectedApp.data?.bankDetails?.bankName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase font-bold">Account Number</p>
                        <p className="font-bold dark:text-white tracking-widest">{selectedApp.data?.bankDetails?.accountNumber || 'N/A'}</p>
                      </div>
                      <div className="col-span-full">
                        <p className="text-slate-500 text-xs uppercase font-bold">Account Name</p>
                        <p className="font-bold dark:text-white">{selectedApp.data?.bankDetails?.accountName || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="col-span-full">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Uploaded Documents</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedApp.data?.documents?.govt_id && (
                        <a href={selectedApp.data.documents.govt_id} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                          <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">id_card</span>
                          </div>
                          <div>
                            <p className="font-bold text-sm dark:text-white">Government ID</p>
                            <p className="text-xs text-slate-500">Click to view</p>
                          </div>
                        </a>
                      )}
                      {selectedApp.data?.documents?.bank_statement && (
                        <a href={selectedApp.data.documents.bank_statement} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                          <div className="size-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">account_balance</span>
                          </div>
                          <div>
                            <p className="font-bold text-sm dark:text-white">Bank Statement</p>
                            <p className="text-xs text-slate-500">Click to view</p>
                          </div>
                        </a>
                      )}
                      {selectedApp.data?.documents?.proof_of_address && (
                        <a href={selectedApp.data.documents.proof_of_address} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                          <div className="size-10 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">home_pin</span>
                          </div>
                          <div>
                            <p className="font-bold text-sm dark:text-white">Proof of Address</p>
                            <p className="text-xs text-slate-500">Click to view</p>
                          </div>
                        </a>
                      )}
                      {selectedApp.data?.documents?.selfie && (
                        <a href={selectedApp.data.documents.selfie} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                          <div className="size-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">face</span>
                          </div>
                          <div>
                            <p className="font-bold text-sm dark:text-white">Selfie Verification</p>
                            <p className="text-xs text-slate-500">Click to view</p>
                          </div>
                        </a>
                      )}
                      {selectedApp.data?.documents?.work_id && (
                        <a href={selectedApp.data.documents.work_id} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                          <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">badge</span>
                          </div>
                          <div>
                            <p className="font-bold text-sm dark:text-white">Work ID</p>
                            <p className="text-xs text-slate-500">Click to view</p>
                          </div>
                        </a>
                      )}
                      {selectedApp.data?.documents?.payslip && (
                        <a href={selectedApp.data.documents.payslip} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                          <div className="size-10 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">payments</span>
                          </div>
                          <div>
                            <p className="font-bold text-sm dark:text-white">Payslip</p>
                            <p className="text-xs text-slate-500">Click to view</p>
                          </div>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* References */}
                  <div className="col-span-full">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">References</h4>
                    <div className="space-y-4">
                      {(selectedApp.data?.references || []).map((ref: any, i: number) => (
                        <div key={i} className="flex justify-between items-start text-sm p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                          <div>
                            <p className="font-bold dark:text-white">{ref.fullName}</p>
                            <p className="text-xs text-slate-500">{ref.relationship}</p>
                          </div>
                          <p className="font-bold font-mono">{ref.phoneNumber}</p>
                        </div>
                      ))}
                      {(!selectedApp.data?.references || selectedApp.data.references.length === 0) && (
                        <p className="text-sm italic text-slate-400">No references provided.</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>
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