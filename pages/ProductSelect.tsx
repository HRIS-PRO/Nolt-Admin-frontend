import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AppStep, SavedDraft } from '../types';
import { productService, InvestmentProduct } from '../services/productService';

interface ProductSelectProps {
  navigate: (step: AppStep, draft?: SavedDraft | null) => void;
}


// Icon cycle for plans (DB doesn't store icons)
const PLAN_ICONS = ['rocket_launch', 'bolt', 'savings', 'trending_up', 'currency_exchange', 'account_balance'];

const LOAN_TYPES = [
  { label: 'Business & Asset Financing', icon: 'business_center' },
  { label: 'Salary Advance & Public Sector', icon: 'badge' },
];

const GIFT_STEPS = [
  { step: 1, text: 'Recipient details' },
  { step: 2, text: 'Pick a plan & pay' },
  { step: 3, text: 'Share gift link' },
];

const ProductSelect: React.FC<ProductSelectProps> = ({ navigate }) => {
  const [investmentPlans, setInvestmentPlans] = useState<InvestmentProduct[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    productService.getInvestmentProducts()
      .then(res => { if (res.success) setInvestmentPlans(res.products); })
      .catch(() => {})
      .finally(() => setPlansLoading(false));
  }, []);

  const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, ease: 'easeOut' } }
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 22 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full overflow-hidden bg-slate-50 dark:bg-slate-950 px-4 sm:px-6 py-10 md:py-16">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 -left-40 w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[100px]" />
      </div>

      <motion.div
        className="relative z-10 max-w-6xl mx-auto space-y-10"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >

        {/* ── Header ──────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              Step 1 of 4
            </div>
            <h2 className="text-4xl md:text-[3.5rem] font-black text-slate-900 dark:text-white tracking-tight leading-[1.08]">
              What would you<br className="hidden md:block" /> like to do today?
            </h2>
            <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 font-medium max-w-lg">
              Select a product to get started with your application.
            </p>
          </div>

          {/* Progress */}
          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            <p className="text-[11px] font-black text-primary uppercase tracking-widest">10% Completed</p>
            <div className="h-2.5 w-44 md:w-64 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '10%' }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="h-full rounded-full bg-primary relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Mobile swipe hint */}
        <motion.p
          variants={fadeUp}
          className="md:hidden flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-600"
        >
          <span className="material-symbols-outlined text-sm">west</span>
          Swipe to explore
          <span className="material-symbols-outlined text-sm">east</span>
        </motion.p>

        {/* ── Cards Grid ──────────────────────────────────────────── */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-5 pb-6 -mx-4 px-4 sm:-mx-6 sm:px-6 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:snap-none md:mx-0 md:px-0 no-scrollbar">

          {/* ── Investment Card ─────── */}
          <div className="min-w-[82vw] sm:min-w-[72vw] md:min-w-0 snap-center">
            <motion.button
              variants={fadeUp}
              whileHover={{ y: -8 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('INVESTMENT_FLOW', null)}
              className="w-full h-full group p-7 md:p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/30 dark:shadow-none text-left flex flex-col transition-all hover:border-primary/40 hover:shadow-primary/10"
            >
              {/* Icon */}
              <div className="size-16 rounded-[1.5rem] bg-primary flex items-center justify-center text-white mb-7 shadow-xl shadow-primary/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                <span className="material-symbols-outlined text-4xl">trending_up</span>
              </div>

              <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Investment</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium mb-7">
                Secure high-yield returns with our flexible investment plans.
              </p>

              {/* Plan list — live from products table */}
              <div className="space-y-4 flex-1">
                {plansLoading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="size-4 rounded bg-slate-200 dark:bg-slate-700 shrink-0" />
                      <div className="h-4 rounded bg-slate-200 dark:bg-slate-700 w-36" />
                    </div>
                  ))
                ) : investmentPlans.length > 0 ? (
                  investmentPlans.map((plan, i) => (
                    <div key={plan.id} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-base shrink-0">
                        {PLAN_ICONS[i % PLAN_ICONS.length]}
                      </span>
                      <div>
                        <span className="text-sm font-black text-slate-900 dark:text-white">{plan.custom_name}</span>
                        {plan.interest_rate != null && (
                          <>
                            <span className="mx-2 text-slate-300 dark:text-slate-700">·</span>
                            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{plan.interest_rate}% p.a.</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium italic">No plans available right now.</p>
                )}
              </div>

              {/* CTA */}
              <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-black text-primary uppercase tracking-widest">Start Investing</span>
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white group-hover:translate-x-1.5 transition-all duration-300">
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </div>
              </div>
            </motion.button>
          </div>

          {/* ── Gift Investment Card ─── */}
          <div className="min-w-[82vw] sm:min-w-[72vw] md:min-w-0 snap-center">
            <motion.button
              variants={fadeUp}
              whileHover={{ y: -8 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('INVESTMENT_FLOW', {
                id: `G-${Date.now()}`, type: 'INVESTMENT', subStep: 0,
                label: 'Gift Investment', data: { isGift: true }, updatedAt: Date.now()
              })}
              className="w-full h-full group p-7 md:p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/30 dark:shadow-none text-left relative overflow-hidden flex flex-col transition-all hover:border-indigo-400/40"
            >
              {/* Ambient blobs inside card */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-16 -right-16 size-48 rounded-full bg-indigo-500/5 blur-2xl group-hover:bg-indigo-500/10 transition-all duration-700" />
                <div className="absolute -bottom-16 -left-16 size-40 rounded-full bg-rose-500/5 blur-2xl group-hover:bg-rose-500/10 transition-all duration-700" />
              </div>

              {/* Floating sparkles on hover */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                {[...Array(8)].map((_, i) => (
                  <motion.span
                    key={i}
                    animate={{ y: [0, -100], opacity: [0, 1, 0], scale: [0, 1, 0] }}
                    transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.35, ease: 'easeOut' }}
                    className="absolute text-indigo-400 text-lg font-bold"
                    style={{ left: `${10 + i * 11}%`, top: '90%' }}
                  >
                    {['✦', '★', '✦', '⋆'][i % 4]}
                  </motion.span>
                ))}
              </div>

              <div className="relative z-10 flex flex-col flex-1">
                {/* Badge + Icon row */}
                <div className="flex items-start justify-between mb-6">
                  <div className="size-16 rounded-[1.5rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                    <span className="material-symbols-outlined text-4xl">card_giftcard</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-black tracking-widest uppercase">
                    Special Feature
                  </div>
                </div>

                <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                  Gift Investment
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium mb-7">
                  Set up an investment for a loved one and share a surprise gift link.
                </p>

                {/* Steps */}
                <div className="space-y-3.5 flex-1">
                  {GIFT_STEPS.map(s => (
                    <div key={s.step} className="flex items-center gap-3.5">
                      <div className="size-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-[10px] font-black text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 shrink-0">
                        {s.step}
                      </div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{s.text}</p>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">Gift Now</span>
                  <div className="size-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white group-hover:translate-x-1.5 transition-all duration-300">
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </div>
                </div>
              </div>
            </motion.button>
          </div>

          {/* ── Loan Card ───────────── */}
          <div className="min-w-[82vw] sm:min-w-[72vw] md:min-w-0 snap-center md:col-span-2 lg:col-span-1">
            <motion.button
              variants={fadeUp}
              whileHover={{ y: -8 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('LOAN_TYPE', null)}
              className="w-full h-full group p-7 md:p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/30 dark:shadow-none text-left flex flex-col transition-all hover:border-primary/40"
            >
              <div className="size-16 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-7 shadow-inner group-hover:bg-primary group-hover:text-white transition-all duration-500">
                <span className="material-symbols-outlined text-4xl">payments</span>
              </div>

              <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Loan</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium mb-7">
                Access fast financing with our flexible repayment options.
              </p>

              {/* Loan types */}
              <div className="space-y-3 flex-1">
                {LOAN_TYPES.map(item => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3.5 p-4 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800 group-hover:border-primary/20 group-hover:bg-primary/[0.02] transition-all"
                  >
                    <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-900 dark:text-white group-hover:text-primary uppercase tracking-widest transition-colors">Apply for Loan</span>
                <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-primary group-hover:text-white group-hover:translate-x-1.5 transition-all duration-300">
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </div>
              </div>
            </motion.button>
          </div>

        </div>

        {/* ── Back Button ──────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="flex justify-center pt-4 pb-6">
          <button
            onClick={() => navigate('DASHBOARD')}
            className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-200/50 dark:shadow-none hover:border-primary/30 hover:text-primary transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">west</span>
            Back to Dashboard
          </button>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default ProductSelect;
