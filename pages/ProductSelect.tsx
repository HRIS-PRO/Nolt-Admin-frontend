
import React from 'react';
import { AppStep } from '../types';

interface ProductSelectProps {
  navigate: (step: AppStep) => void;
}

const ProductSelect: React.FC<ProductSelectProps> = ({ navigate }) => {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-12">
        <div className="flex justify-between items-end mb-3">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Step 1 of 4</p>
          <p className="text-primary font-bold">10% Completed</p>
        </div>
        <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-primary w-[10%] transition-all duration-1000"></div>
        </div>
      </div>

      <div className="mb-12 space-y-4">
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">What would you like to do today?</h2>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl">Choose between growing your wealth with our investment products or applying for a loan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <button 
          onClick={() => navigate('INVESTMENT_FLOW')}
          className="group cursor-pointer p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-primary transition-all duration-300 text-left relative shadow-xl shadow-slate-200/50 dark:shadow-none hover:-translate-y-1 active:scale-[0.98]"
        >
          <div className="size-16 rounded-2xl bg-primary flex items-center justify-center text-white mb-8 shadow-lg shadow-primary/30">
            <span className="material-symbols-outlined text-4xl">trending_up</span>
          </div>
          <div className="bg-primary/10 text-primary text-[10px] font-black tracking-widest uppercase py-1 px-3 rounded-full mb-4 w-fit">
            Interest up to 18% p.a.
          </div>
          <h3 className="text-3xl font-bold mb-4 dark:text-white">Investment</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">Secure your future with high-yield returns on your capital through Rise or Vault products.</p>
          
          <div className="space-y-3">
             <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
               <span className="material-symbols-outlined text-primary">rocket_launch</span>
               <div>
                 <p className="font-bold text-sm dark:text-white">NOLT Rise</p>
                 <p className="text-xs text-slate-400">High Growth Fund</p>
               </div>
             </div>
             <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
               <span className="material-symbols-outlined text-primary">savings</span>
               <div>
                 <p className="font-bold text-sm dark:text-white">NOLT Vault</p>
                 <p className="text-xs text-slate-400">Secure Fixed Deposit</p>
               </div>
             </div>
          </div>
          <div className="mt-8 flex items-center justify-between text-primary font-bold">
            <span>Start Investing</span>
            <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_forward</span>
          </div>
        </button>

        <button 
          onClick={() => navigate('LOAN_TYPE')}
          className="group cursor-pointer p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-primary transition-all duration-300 text-left relative shadow-xl shadow-slate-200/50 dark:shadow-none hover:-translate-y-1 active:scale-[0.98]"
        >
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8">
            <span className="material-symbols-outlined text-4xl">payments</span>
          </div>
          <h3 className="text-3xl font-bold mb-4 dark:text-white">Loan</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">Instant access to financing for personal, employee, or business needs with flexible repayment.</p>
          
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-4 text-sm font-bold text-slate-700 dark:text-slate-300 p-4 border rounded-xl border-dashed border-slate-200 dark:border-slate-700">
              <span className="material-symbols-outlined text-primary">check</span>
              Business & Asset Financing
            </div>
            <div className="flex items-center gap-4 text-sm font-bold text-slate-700 dark:text-slate-300 p-4 border rounded-xl border-dashed border-slate-200 dark:border-slate-700">
              <span className="material-symbols-outlined text-primary">check</span>
              Salary Advance & Public Sector
            </div>
          </div>
          <div className="mt-8 flex items-center justify-between text-primary font-bold">
            <span>Apply for Loan</span>
            <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_forward</span>
          </div>
        </button>
      </div>

      <div className="mt-16 flex justify-center">
        <button onClick={() => navigate('DASHBOARD')} className="flex items-center gap-2 px-8 py-3 rounded-full font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400">
          <span className="material-symbols-outlined">arrow_back</span>
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

// Fix: Add missing default export
export default ProductSelect;
