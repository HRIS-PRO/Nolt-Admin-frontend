
import React from 'react';
import { AppStep } from '../types';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  navigate: (step: AppStep) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ navigate }) => {

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <button 
          onClick={() => navigateRouter('/loan')}
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
            <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-black rounded-full border border-primary/20">2 SAVED</span>
          </div>
          <h3 className="text-2xl font-bold mb-4 dark:text-white">Continue from Saved</h3>
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
          <div className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-black text-slate-600 dark:text-slate-300">
            <span className="material-symbols-outlined text-primary text-[20px]">support_agent</span>
            Support
          </div>
        </div>
        <p className="text-sm text-slate-400">Last login: Today, 10:42 AM</p>
      </div>
    </div>
  );
};

export default Dashboard;
