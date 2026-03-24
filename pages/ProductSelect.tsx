import React from 'react';
import { motion } from 'motion/react';
import { AppStep, SavedDraft } from '../types';

interface ProductSelectProps {
  navigate: (step: AppStep, draft?: SavedDraft | null) => void;
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
          onClick={() => navigate('INVESTMENT_FLOW', { id: `G-${Date.now()}`, type: 'INVESTMENT', subStep: 0, label: 'Gift Investment', data: { isGift: true }, updatedAt: Date.now() })}
          className="group cursor-pointer p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-indigo-500 transition-all duration-500 text-left relative shadow-xl shadow-slate-200/50 dark:shadow-none hover:-translate-y-2 active:scale-[0.98] overflow-hidden"
        >
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full -mr-24 -mt-24 group-hover:bg-indigo-500/10 transition-all duration-700 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-rose-500/5 rounded-full -ml-20 -mb-20 group-hover:bg-rose-500/10 transition-all duration-700 blur-3xl"></div>

          {/* Sparkles and Icons that appear on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                  y: [0, -20, -40],
                  x: [0, (i % 2 === 0 ? 10 : -10), (i % 2 === 0 ? 20 : -20)]
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeInOut"
                }}
                className="absolute text-amber-400"
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${20 + Math.random() * 60}%`,
                  fontSize: `${8 + Math.random() * 12}px`
                }}
              >
                ✦
              </motion.span>
            ))}
            <motion.span
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-24 left-8 text-rose-400 text-lg"
            >
              ✦
            </motion.span>
            <motion.span
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute top-1/2 right-8 text-indigo-400 text-xs"
            >
              ★
            </motion.span>
          </div>

          <div className="size-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mb-8 shadow-lg shadow-indigo-500/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
            <span className="material-symbols-outlined text-4xl">card_giftcard</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <div className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black tracking-widest uppercase py-1 px-3 rounded-full w-fit">
              New Feature
            </div>
            <div className="bg-rose-500 text-white text-[10px] font-black tracking-widest uppercase py-1 px-3 rounded-full w-fit shadow-lg shadow-rose-500/20 animate-pulse flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px] filled">local_fire_department</span>
              Limited Promo
            </div>
          </div>

          <h3 className="text-3xl font-bold mb-4 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Gift an Investment</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">The perfect gift for loved ones. Set up an investment in their name and share a surprise link.</p>

          <div className="space-y-4 py-4 relative z-10">
            <div className="flex items-start gap-4 group/item">
              <div className="size-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 shrink-0 group-hover/item:scale-110 transition-transform">1</div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Fill in recipient details</p>
            </div>
            <div className="flex items-start gap-4 group/item">
              <div className="size-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 shrink-0 group-hover/item:scale-110 transition-transform">2</div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Choose plan & pay</p>
            </div>
            <div className="flex items-start gap-4 group/item">
              <div className="size-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 shrink-0 group-hover/item:scale-110 transition-transform">3</div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Share the gift link!</p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between text-indigo-500 font-bold group-hover:text-indigo-600 transition-colors">
            <span className="group-hover:translate-x-1 transition-transform">Gift Now</span>
            <div className="size-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
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
