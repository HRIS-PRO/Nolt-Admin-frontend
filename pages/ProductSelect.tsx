import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppStep, SavedDraft } from '../types';

interface ProductSelectProps {
  navigate: (step: AppStep, draft?: SavedDraft | null) => void;
}

const ProductSelect: React.FC<ProductSelectProps> = ({ navigate }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        ease: "easeOut",
        duration: 0.6
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full overflow-hidden bg-slate-50 dark:bg-slate-950 px-6 py-8 md:py-16">
      {/* Background Accents */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 size-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <motion.div 
        className="max-w-6xl mx-auto space-y-12 relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header & Progress */}
        <motion.div variants={itemVariants} className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2 md:px-0">
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-full w-fit border border-primary/20">
                    Step 1 of 4
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
                    What would you like <br className="hidden md:block" /> to do today?
                </h2>
                <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl font-medium">
                    Select a product to get started with your application.
                </p>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
                <p className="text-primary font-black text-sm uppercase tracking-widest animate-pulse">10% Completed</p>
                <div className="h-3 w-40 md:w-64 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '10%' }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-primary relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                    </motion.div>
                </div>
            </div>
          </div>
        </motion.div>

        {/* Mobile Swipe Hint */}
        <motion.div 
            variants={itemVariants}
            className="md:hidden flex items-center justify-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] pb-2"
        >
            <span className="material-symbols-outlined text-sm">west</span>
            Swipe to Explore
            <span className="material-symbols-outlined text-sm">east</span>
        </motion.div>

        {/* Product Cards Container - Carousel on Mobile, Grid on Desktop */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 -mx-6 px-6 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:snap-none md:mx-0 md:px-0 no-scrollbar">
          
          {/* Investment Card */}
          <div className="min-w-[85vw] md:min-w-0 snap-center transition-transform hover:scale-[1.01]">
            <motion.button
                variants={itemVariants}
                whileHover={{ y: -8 }}
                onClick={() => navigate('INVESTMENT_FLOW', null)}
                className="w-full h-full group p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none text-left flex flex-col transition-all hover:border-primary/30"
            >
                <div className="size-16 rounded-[1.5rem] bg-primary flex items-center justify-center text-white mb-8 shadow-xl shadow-primary/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                <span className="material-symbols-outlined text-4xl">trending_up</span>
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Investment</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-medium">
                    Secure high-yield returns with our flexible investment plans.
                </p>

                <div className="space-y-4 flex-1">
                {[
                    { name: 'NOLT Rise', desc: 'High Growth Fund', icon: 'rocket_launch' },
                    { name: 'NOLT Surge', desc: 'Accelerated Returns', icon: 'bolt' },
                    { name: 'NOLT Vault', desc: 'Secure Fixed Deposit', icon: 'savings' }
                ].map(plan => (
                    <div key={plan.name} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 border border-transparent group-hover:border-slate-100 dark:group-hover:border-slate-700 transition-all">
                    <div className="size-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-primary shadow-sm">
                        <span className="material-symbols-outlined text-xl">{plan.icon}</span>
                    </div>
                    <div>
                        <p className="font-black text-sm text-slate-900 dark:text-white">{plan.name}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{plan.desc}</p>
                    </div>
                    </div>
                ))}
                </div>

                <div className="mt-10 flex items-center justify-between text-primary font-black uppercase tracking-widest text-xs">
                <span>Start Investing</span>
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all transform group-hover:translate-x-2">
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </div>
                </div>
            </motion.button>
          </div>

          {/* Gift Card */}
          <div className="min-w-[88vw] md:min-w-0 snap-center">
            <motion.button
                variants={itemVariants}
                whileHover={{ y: -8 }}
                onClick={() => navigate('INVESTMENT_FLOW', { id: `G-${Date.now()}`, type: 'INVESTMENT', subStep: 0, label: 'Gift Investment', data: { isGift: true }, updatedAt: Date.now() })}
                className="w-full h-full group p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none text-left relative overflow-hidden transition-all hover:border-indigo-500/30"
            >
                {/* Decorative Background Accents & Sparkles */}
                <div className="absolute top-0 right-0 size-48 bg-indigo-500/5 rounded-full -trnaslate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-indigo-500/10 transition-all duration-700"></div>
                <div className="absolute bottom-0 left-0 size-40 bg-rose-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl group-hover:bg-rose-500/10 transition-all duration-700"></div>
                
                {/* Floating Sparkles that appear on hover - Enhanced Visibility */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden">
                    {[...Array(12)].map((_, i) => (
                        <motion.span
                            key={i}
                            animate={{ 
                                y: [0, -120], 
                                opacity: [0, 1, 0, 0],
                                scale: [0, 1, 0.5, 0],
                                rotate: [0, 90, 180]
                            }}
                            transition={{ 
                                duration: 2.5 + Math.random() * 1.5, 
                                repeat: Infinity, 
                                delay: i * 0.3,
                                ease: "easeOut"
                            }}
                            className="absolute text-indigo-500 dark:text-indigo-400 font-bold"
                            style={{ 
                                left: `${5 + Math.random() * 90}%`, 
                                top: '100%',
                                fontSize: `${12 + Math.random() * 20}px`
                            }}
                        >
                            {['✦', '★', '🌟', '✦'][i % 4]}
                        </motion.span>
                    ))}
                    {[...Array(20)].map((_, i) => (
                        <motion.span
                            key={i + 'star'}
                            animate={{ opacity: [0.1, 0.8, 0.1], scale: [1, 1.5, 1] }}
                            transition={{ duration: 1 + Math.random(), repeat: Infinity, delay: i * 0.15 }}
                            className="absolute size-1.5 bg-amber-400 dark:bg-amber-300 rounded-full blur-[0.5px]"
                            style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}
                        />
                    ))}
                </div>

                <div className="relative z-10 flex flex-col h-full">
                    <div className="size-14 md:size-16 rounded-[1.5rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mb-8 shadow-xl shadow-indigo-500/30 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                        <span className="material-symbols-outlined text-3xl md:text-4xl">card_giftcard</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                        <div className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black tracking-widest uppercase py-1.5 px-4 rounded-full border border-indigo-500/20">
                            SPECIAL FEATURE
                        </div>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight group-hover:text-indigo-600 transition-colors">Gift Investment</h3>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-medium">
                        Set up an investment for a loved one and share a surprise gift link.
                    </p>

                    <div className="space-y-4 flex-1">
                        {[
                            { text: 'Recipient details', step: 1 },
                            { text: 'Pick a plan & pay', step: 2 },
                            { text: 'Share gift link', step: 3 }
                        ].map((s) => (
                            <div key={s.step} className="flex items-center gap-4">
                                <div className="size-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-[10px] font-black text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                                    {s.step}
                                </div>
                                <p className="text-xs md:text-sm font-bold text-slate-600 dark:text-slate-300">{s.text}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 flex items-center justify-between text-indigo-500 font-black uppercase tracking-widest text-[10px]">
                        <span>Gift Now</span>
                        <div className="size-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all transform group-hover:translate-x-2">
                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </div>
                    </div>
                </div>
            </motion.button>
          </div>

          {/* Loan Card */}
          <div className="min-w-[88vw] md:min-w-0 snap-center">
            <motion.button
                variants={itemVariants}
                whileHover={{ y: -8 }}
                onClick={() => navigate('LOAN_TYPE', null)}
                className="w-full h-full group p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none text-left flex flex-col transition-all hover:border-primary/30"
            >
                <div className="size-14 md:size-16 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 mb-8 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
                    <span className="material-symbols-outlined text-3xl md:text-4xl">payments</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Loan</h3>
                <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-medium">
                    Access fast financing with our flexible repayment options.
                </p>

                <div className="space-y-3 flex-1">
                    {[
                        'Business & Asset Financing',
                        'Salary Advance & Public Sector'
                    ].map(item => (
                        <div key={item} className="flex items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-300 p-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl group-hover:border-primary/20 transition-colors">
                            <span className="material-symbols-outlined text-primary text-xl">verified</span>
                            {item}
                        </div>
                    ))}
                </div>

                <div className="mt-10 flex items-center justify-between text-slate-900 dark:text-white group-hover:text-primary font-black uppercase tracking-widest text-[10px]">
                    <span>Apply for Loan</span>
                    <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all transform group-hover:translate-x-2">
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </div>
                </div>
            </motion.button>
          </div>
        </div>

        {/* Back Action */}
        <motion.div variants={itemVariants} className="flex justify-center pt-8">
            <button 
                onClick={() => navigate('DASHBOARD')}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-xs hover:border-primary hover:text-primary transition-all shadow-lg shadow-slate-200/50 dark:shadow-none active:scale-95 group"
            >
                <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">west</span>
                Back to Dashboard
            </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ProductSelect;
