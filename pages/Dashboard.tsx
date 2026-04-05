import React, { useMemo, useEffect, useState } from 'react';
import { AppStep, UserState } from '../types';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardProps {
  user: UserState;
  navigate: (step: AppStep) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, navigate }) => {
  const [pendingGiftToken, setPendingGiftToken] = useState<string | null>(localStorage.getItem('pending_gift_token'));
  const navigateRouter = useNavigate();
  const drafts = storageService.getDrafts();

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        ease: "easeOut",
        duration: 0.6
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0 }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full overflow-hidden bg-slate-50 dark:bg-slate-950 px-6 py-8 md:py-16">
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 right-0 -trnaslate-y-1/2 translate-x-1/2 size-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 trnaslate-y-1/2 -translate-x-1/2 size-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div 
        className="max-w-4xl mx-auto space-y-10 relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* User Hero Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left pt-4">
          <div className="relative group">
            <div className="size-20 md:size-24 rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 shadow-xl flex items-center justify-center overflow-hidden">
                {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="size-full object-cover" />
                ) : (
                    <span className="material-symbols-outlined text-4xl text-primary filled">person</span>
                )}
            </div>
            <div className="absolute -bottom-2 -right-2 size-8 bg-green-500 border-4 border-slate-50 dark:border-slate-950 rounded-full shadow-lg"></div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black text-primary uppercase tracking-[0.2em]">{greeting}</p>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                {user.name.split(' ')[0]} 👋
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">What's your financial goal for today?</p>
          </div>
        </motion.div>

        {/* Gift Redempton (if any) */}
        <AnimatePresence>
            {pendingGiftToken && (
                <motion.div 
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 40 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="w-full overflow-hidden"
                >
                    <div className="group relative p-6 md:p-8 rounded-[2.5rem] bg-gradient-to-br from-rose-500 to-rose-600 shadow-2xl shadow-rose-500/20 flex flex-col md:flex-row items-center gap-6">
                        <div className="size-16 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/30 transform transition-transform group-hover:scale-110">
                            <span className="material-symbols-outlined text-3xl">redeem</span>
                        </div>
                        <div className="flex-1 text-center md:text-left py-2">
                            <h3 className="text-xl font-black text-white tracking-tight">Special Gift Claiming Available! 🎁</h3>
                            <p className="text-rose-100 font-medium opacity-90 text-sm md:text-base">A reward is waiting for you. Claim your investment to grow your portfolio.</p>
                        </div>
                        <button 
                            onClick={() => navigateRouter(`/investment?gift_token=${pendingGiftToken}`)}
                            className="w-full md:w-auto px-8 py-4 bg-white text-rose-600 font-black rounded-2xl shadow-xl hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            Claim Now
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <motion.button
                variants={itemVariants}
                whileHover={{ y: -5 }}
                onClick={() => navigateRouter('/products')}
                className="group p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none text-left flex flex-col gap-8 transition-all hover:border-primary/30"
            >
                <div className="flex justify-between items-start">
                    <div className="size-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                        <span className="material-symbols-outlined text-4xl filled">add_circle</span>
                    </div>
                    <div className="p-2 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">arrow_outward</span>
                    </div>
                </div>
                <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Start New Application</h3>
                    <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        Secure high-yield investments or flexible financing options tailored for you.
                    </p>
                </div>
            </motion.button>

            <motion.button
                variants={itemVariants}
                whileHover={{ y: -5 }}
                onClick={() => navigate('APPLICATIONS_LIST')}
                className="group p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none text-left flex flex-col gap-8 transition-all hover:border-primary/30"
            >
                <div className="flex justify-between items-start">
                    <div className="size-16 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-all shadow-inner">
                        <span className="material-symbols-outlined text-4xl filled">edit_document</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary text-xs font-black rounded-full border border-primary/20">
                        <span className="size-2 rounded-full bg-primary animate-pulse"></span>
                        {drafts.length} SAVED
                    </div>
                </div>
                <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">My Active Drafts</h3>
                    <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        Don't leave your progress behind. Resume and complete your pending applications.
                    </p>
                </div>
            </motion.button>
        </div>

        {/* Footer Utilities */}
        <motion.div variants={itemVariants} className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center gap-8">
            <div className="w-full flex flex-wrap justify-center gap-4">
                <button
                    onClick={() => navigate('CALCULATOR')}
                    className="flex flex-1 md:flex-none items-center justify-center gap-3 px-8 py-5 bg-white dark:bg-slate-900 rounded-2xl text-sm font-black text-slate-600 dark:text-slate-300 shadow-lg border border-slate-100 dark:border-slate-800 hover:border-primary hover:text-primary transition-all group"
                >
                    <span className="material-symbols-outlined text-primary transition-transform group-hover:scale-110 filled">calculate</span>
                    Loan Calculator
                </button>
                <button
                    onClick={() => (window as any).zE?.('messenger', 'open')}
                    className="flex flex-1 md:flex-none items-center justify-center gap-3 px-8 py-5 bg-slate-200 dark:bg-slate-800 rounded-2xl text-sm font-black text-slate-700 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all group"
                >
                    <span className="material-symbols-outlined text-primary transition-transform group-hover:rotate-12">support_agent</span>
                    Live Assistance
                </button>
            </div>
            <div className="flex items-center gap-2 px-6 py-2 rounded-full bg-slate-100 dark:bg-slate-900 text-xs font-bold text-slate-400 uppercase tracking-widest border border-slate-200/50 dark:border-slate-800">
                <span className="material-symbols-outlined text-sm">schedule</span>
                Last login: Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </motion.div>
      </motion.div>
    </div>
  );
};


export default Dashboard;
