
import React from 'react';
import { LoanState } from '../types';
import { useNavigate } from 'react-router-dom';

interface SuccessProps {
  onDashboard: () => void;
  loan: LoanState;
  formatMoney: (amount: number) => string;
  productType?: 'LOAN' | 'INVESTMENT';
  indemnityUrl?: string | null;
}

const SuccessScreen: React.FC<SuccessProps> = ({ onDashboard, loan, formatMoney, productType = 'LOAN', indemnityUrl }) => {
  const isInvestment = productType === 'INVESTMENT';
  const navigate = useNavigate();

  const handleDownload = () => {
    if (indemnityUrl) {
      window.open(indemnityUrl, '_blank');
      return;
    }
    const link = document.createElement('a');
    link.href = '#';
    link.setAttribute('download', `NOLT_Agreement_${Math.floor(Math.random() * 10000)}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center min-h-[80vh] justify-center relative overflow-hidden">
      {/* Background Watermark */}
      <h1 className="absolute top-10 left-1/2 -translate-x-1/2 text-[120px] md:text-[180px] font-black tracking-tighter text-primary/5 dark:text-primary/10 select-none pointer-events-none animate-in fade-in zoom-in duration-1000">
        Received!
      </h1>

      {/* Main Success Message */}
      <div className="flex flex-col items-center text-center gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10 mb-10">
        <div className="size-20 rounded-full bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30 border-4 border-white dark:border-slate-900">
          <span className="material-symbols-outlined text-4xl filled">check</span>
        </div>

        <div className="space-y-3">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Application <span className="text-primary">Received!</span>
          </h2>
          <p className="text-base text-slate-500 dark:text-slate-400 font-bold leading-relaxed max-w-xl mx-auto">
            Thank you for choosing NOLT Finance. Your {isInvestment ? 'investment' : 'loan'} application has been securely received and is currently being processed.
          </p>
        </div>
      </div>

      {/* Steps/Info Cards */}
      <div className="w-full flex flex-col gap-6 max-w-2xl relative z-10">

        {/* Step 1: Review in Progress */}
        <div className="bg-white dark:bg-slate-800/50 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-center gap-6 shadow-sm">
          <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">description</span>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-0.5">
              Review in Progress
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
              Our credit team is currently verifying your documents and profile. This process typically takes between <span className="text-primary font-black">2 to 4 business hours</span> during working days.
            </p>
          </div>
        </div>

        {/* Step 2: Loan Agreement (Highlighted) */}
        {!isInvestment && (
          <div className="relative group">
            <div className="absolute -inset-2 bg-slate-200/50 dark:bg-slate-700/50 rounded-[3rem] blur-xl opacity-70"></div>

            <div className="relative bg-white dark:bg-slate-800 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-center gap-6 shadow-sm">
              <div className="size-14 rounded-full bg-primary flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-2xl">file_download</span>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h4 className="text-lg font-black text-primary uppercase tracking-tight mb-0.5">Indemnity Agreement</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                  Your signed indemnity agreement is available for download. Keep a copy for your records.
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="w-full md:w-auto px-8 py-3.5 bg-primary text-white rounded-2xl text-[13px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
              >
                Download
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Next Step */}
        <div className="bg-[#0B1121] dark:bg-slate-950 p-6 md:p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center gap-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>

          <div className="size-14 rounded-full bg-white/10 text-primary flex items-center justify-center shrink-0 relative z-10">
            <span className="material-symbols-outlined text-2xl filled">payments</span>
          </div>
          <div className="flex-1 text-center md:text-left relative z-10">
            <h4 className="text-lg font-black uppercase tracking-tight mb-0.5">Next Step: Disbursement</h4>
            <p className="text-xs text-slate-400 font-bold leading-relaxed">
              Once approved, you will receive a notification to sign your final offer. Funds will then be{' '}
              <span className="text-primary font-black">disbursed instantly</span> to your linked account.
            </p>
          </div>
          <button className="w-full md:w-auto px-8 py-3.5 bg-white text-slate-900 rounded-full text-[13px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors relative z-10 shadow-lg active:scale-95">
            Help
          </button>
        </div>
      </div>

      {/* Main Action Button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="w-full max-w-[480px] h-14 bg-primary text-white font-black rounded-full shadow-2xl shadow-primary/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 mt-12 active:scale-95 text-lg group"
      >
        Go to Dashboard
        <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
      </button>

      {/* Footer ID */}
      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-10">
        Application ID: #NOLT-{Math.floor(Math.random() * 9000) + 1000}-LOAN
      </p>
    </div>
  );
};

export default SuccessScreen;
