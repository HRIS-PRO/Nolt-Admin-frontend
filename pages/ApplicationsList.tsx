import React, { useState, useEffect } from 'react';
import { AppStep, SavedDraft } from '../types';
import { storageService } from '../services/storageService';

interface ApplicationsListProps {
  navigate: (step: AppStep, draft?: SavedDraft | null) => void;
  formatMoney: (amount: number) => string;
}

const ApplicationsList: React.FC<ApplicationsListProps> = ({ navigate, formatMoney }) => {
  const [activeTab, setActiveTab] = useState<'DRAFTS' | 'COMPLETED'>('DRAFTS');
  const [uploadingReceiptId, setUploadingReceiptId] = useState<string | null>(null);
  const [uploadedReceipts, setUploadedReceipts] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<SavedDraft[]>([]);
  
  // Modal State
  const [selectedApp, setSelectedApp] = useState<{ id: string, type: string, amount: number, data?: any } | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setDrafts(storageService.getDrafts());
  }, []);

  const completed = [
    // {
    //   id: 'C-1002',
    //   type: 'NOLT Vault Investment',
    //   amount: 15000,
    //   submittedAt: 'Jan 15, 2024',
    //   status: 'PENDING_PAYMENT',
    //   icon: 'lock_clock',
    //   requiresReceipt: true,
    //   data: { isOnBehalf: false }
    // },
    // {
    //   id: 'C-0988',
    //   type: 'Working Capital Loan',
    //   amount: 12000,
    //   submittedAt: 'Jan 10, 2024',
    //   status: 'UNDER_REVIEW',
    //   icon: 'verified',
    //   requiresReceipt: false,
    //   data: { 
    //     isOnBehalf: true, 
    //     fullName: 'Sarah Jenkins',
    //     representativeRelation: 'Business Partner'
    //   }
    // }
  ];

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
    if (!selectedApp) return;
    const link = document.createElement('a');
    link.href = '#';
    link.setAttribute('download', `NOLT_${selectedApp.type.replace(/\s+/g, '_')}_${selectedApp.id}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 md:py-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
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
            Completed ({completed.length})
          </button>
        </div>
      </div>

      {activeTab === 'COMPLETED' && completed.some(i => i.status === 'PENDING_PAYMENT' && !uploadedReceipts[i.id]) && (
        <div className="mb-8 p-6 bg-primary/10 border-2 border-primary/20 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500">
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

      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'DRAFTS' ? (
          drafts.length > 0 ? (
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
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{draft.label || (draft.type === 'LOAN' ? 'Business Loan' : 'NOLT Investment')}</h3>
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
                  <p className="text-xs text-slate-400 font-medium">Modified {new Date(draft.updatedAt).toLocaleDateString()}</p>
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
          )
        ) : (
          completed.map((item) => (
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300 backdrop-blur-md">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-500 border border-white/20 dark:border-slate-700">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">description</span>
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Agreement Preview</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{selectedApp.id} • {selectedApp.type}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content - The Agreement Document */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-slate-50 dark:bg-slate-900/50">
              <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 p-8 md:p-16 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-700 space-y-10">
                {/* Document Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-100 dark:border-slate-700 pb-8">
                  <div>
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <span className="material-symbols-outlined font-black">finance_chip</span>
                      <span className="font-black uppercase tracking-widest text-sm">NOLT Finance</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Financial Agreement</h1>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Date Issued</p>
                    <p className="font-bold dark:text-white">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Agreement Body */}
                <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  <h4 className="text-slate-900 dark:text-white font-black uppercase text-sm tracking-widest mb-4">1. Parties involved</h4>
                  <p className="mb-4">This agreement is entered into between NOLT Finance ("The Provider") and the Applicant identified as #{selectedApp.id} ("The Client").</p>
                  
                  {selectedApp.data?.isOnBehalf && (
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 mb-8">
                       <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">Representative Agreement</p>
                       <p className="text-sm font-bold">This application was submitted on behalf of <span className="text-primary uppercase">{selectedApp.data.fullName}</span>.</p>
                    </div>
                  )}
                  
                  <h4 className="text-slate-900 dark:text-white font-black uppercase text-sm tracking-widest mb-4">2. Principal amount</h4>
                  <p className="mb-8">The total sum agreed upon for this {selectedApp.type.toLowerCase().includes('loan') ? 'loan' : 'investment'} is <strong>{formatMoney(selectedApp.amount)}</strong>. All calculations and disbursements are subject to the standard terms and conditions of NOLT Finance platforms.</p>

                  <h4 className="text-slate-900 dark:text-white font-black uppercase text-sm tracking-widest mb-4">3. Obligations & Terms</h4>
                  <p className="mb-4">The Client agrees to abide by the repayment schedules or tenure commitments as defined in the application configuration. Any default in repayment may lead to administrative actions as outlined in our primary policy documents.</p>
                  <p className="mb-8">The Provider guarantees the security of funds and strictly adheres to all national financial regulations for both disbursement and capital management.</p>
                </div>

                {/* Signature Section */}
                <div className="pt-10 border-t-2 border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-end gap-8">
                  <div className="space-y-4">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Client Signature</p>
                    <div className="w-64 h-24 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center relative">
                        {/* Simulated Signature */}
                        <svg className="absolute inset-0 w-full h-full text-primary" viewBox="0 0 200 80">
                            <path d="M20,60 C40,20 60,80 80,40 C100,0 120,60 140,20 C160,-20 180,40 190,30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500">Electronically Signed via NOLT Platform</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Authorized Seal</p>
                    <div className="size-20 rounded-full border-4 border-primary/20 flex items-center justify-center text-primary ml-auto">
                        <span className="material-symbols-outlined text-4xl filled">verified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col sm:flex-row items-center justify-end gap-4 shrink-0">
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

      <div className="mt-16 p-8 rounded-[2rem] bg-primary/5 dark:bg-slate-900/50 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6 text-center md:text-left">
          <div className="size-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <span className="material-symbols-outlined filled text-3xl">support_agent</span>
          </div>
          <div>
            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">Need Assistance?</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed">Our team is available 24/7 to help you with your applications or payment confirmations.</p>
          </div>
        </div>
        <button className="whitespace-nowrap px-10 py-4 rounded-full border-2 border-primary text-primary font-black text-sm hover:bg-primary hover:text-white transition-all active:scale-95">
          Talk to Us
        </button>
      </div>
    </div>
  );
};

export default ApplicationsList;