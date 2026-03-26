
import React from 'react';
import { AppStep } from '../types';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';

interface DashboardProps {
  navigate: (step: AppStep) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ navigate }) => {
  const [pendingGiftToken, setPendingGiftToken] = React.useState<string | null>(localStorage.getItem('pending_gift_token'));
  const navigateRouter = useNavigate();
  return (
    <div className="max-w-5xl mx-auto px-6 py-16 flex flex-col items-center gap-12">
      <div className="text-center space-y-4">
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          How can we serve you today?
        </h2>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl">
          Apply for flexible financing or secure your future with high-yield investments.
        </p>
      </div>
      
      {pendingGiftToken && (
        <div className="w-full max-w-4xl p-8 rounded-[2.5rem] bg-gradient-to-r from-rose-500/10 to-indigo-500/5 border-2 border-rose-500/20 shadow-xl shadow-rose-500/10 flex flex-col md:flex-row items-center gap-8 animate-in slide-in-from-top-4 duration-700 relative overflow-hidden group">
            <div className="absolute top-0 right-0 size-40 bg-rose-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="size-20 bg-rose-500 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-rose-500/30 transform -rotate-6 group-hover:rotate-0 transition-transform">
                <span className="material-symbols-outlined text-4xl">redeem</span>
            </div>
            <div className="flex-1 space-y-2 text-center md:text-left">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">You've reached your gift! 🎁</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Click below to claim your investment and start growing your wealth.</p>
            </div>
            <button 
                onClick={() => navigateRouter(`/investment?gift_token=${pendingGiftToken}`)}
                className="px-10 py-5 bg-rose-500 text-white font-black rounded-2xl shadow-xl shadow-rose-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
            >
                Claim Now
                <span className="material-symbols-outlined">arrow_forward</span>
            </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <button
          onClick={() => navigateRouter('/products')}
          className="group relative bg-white dark:bg-slate-800 p-10 rounded-3xl border-2 border-transparent hover:border-primary transition-all duration-500 text-left shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col"
        >
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8 group-hover:bg-primary group-hover:text-white transition-all">
            <span className="material-symbols-outlined text-4xl filled">add_circle</span>
          </div>
          <h3 className="text-2xl font-bold mb-4 dark:text-white">Start a New Application</h3>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-10 flex-1">
            Apply for a new loan or investment product. Choose from Business, Salary Advance, and more.
          </p>
          <div className="flex items-center gap-3 text-primary font-bold">
            <span>Begin Application</span>
            <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_forward</span>
          </div>
        </button>

        <button
          onClick={() => navigate('APPLICATIONS_LIST')}
          className="group relative bg-white dark:bg-slate-800 p-10 rounded-3xl border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-500 text-left shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col"
        >
          <div className="flex justify-between items-start mb-8">
            <div className="size-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 mb-8 group-hover:bg-slate-200 dark:group-hover:bg-slate-600 transition-all">
              <span className="material-symbols-outlined text-4xl filled">edit_document</span>
            </div>
            <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-black rounded-full border border-primary/20">{storageService.getDrafts().length} SAVED</span>
          </div>
          <h3 className="text-2xl font-bold mb-4 dark:text-white">My Applications</h3>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-10 flex-1">
            Resume your previous applications where you left off. You have pending drafts waiting for completion.
          </p>
          <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100 font-bold">
            <span>Resume Draft</span>
            <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_forward</span>
          </div>
        </button>
      </div>

      <div className="w-full flex flex-col md:flex-row items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-10 mt-10 gap-8">
        <div className="flex gap-4">
          <button
            onClick={() => navigate('CALCULATOR')}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 rounded-xl text-sm font-black text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-primary transition-all"
          >
            <span className="material-symbols-outlined text-primary text-[20px] filled">calculate</span>
            Calculator
          </button>
          <button
            onClick={() => (window as any).zE?.('messenger', 'open')}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-black text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            <span className="material-symbols-outlined text-primary text-[20px]">support_agent</span>
            Support
          </button>
        </div>
        <p className="text-sm text-slate-400">Last login: Today, 10:42 AM</p>
      </div>
    </div>
  );
};

export default Dashboard;
