import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { AppStep, UserState } from '../types';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { profileService } from '../services/profileService';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardProps {
  user: UserState;
  navigate: (step: AppStep) => void;
}

type CardView = 'balance' | 'investment';

const Dashboard: React.FC<DashboardProps> = ({ user, navigate }) => {
  const [pendingGiftToken] = useState<string | null>(localStorage.getItem('pending_gift_token'));
  const navigateRouter = useNavigate();
  const drafts = storageService.getDrafts();

  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [acctName, setAcctName] = useState<string | null>(null);

  const [investmentTotal, setInvestmentTotal] = useState<number | null>(null);
  const [investmentCount, setInvestmentCount] = useState<number>(0);
  const [investmentLoading, setInvestmentLoading] = useState(false);

  const [balanceVisible, setBalanceVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<CardView>('balance');

  useEffect(() => {
    if (!user.profile?.casa) return;
    setBalanceLoading(true);
    profileService.getBalance()
      .then(res => {
        if (res.success && res.balance !== null) setBalance(res.balance);
        if (res.acct_name) setAcctName(res.acct_name);
      })
      .catch(() => {})
      .finally(() => setBalanceLoading(false));
  }, [user.profile?.casa]);

  useEffect(() => {
    if (!user.profile?.cba_customer_id) return;
    setInvestmentLoading(true);
    profileService.getTotalInvestment()
      .then(res => {
        if (res.success) {
          setInvestmentTotal(res.investment_total);
          setInvestmentCount(res.investment_count);
        }
      })
      .catch(() => {})
      .finally(() => setInvestmentLoading(false));
  }, [user.profile?.cba_customer_id]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', emoji: '☀️' };
    if (hour < 18) return { text: 'Good afternoon', emoji: '🌤️' };
    return { text: 'Good evening', emoji: '🌙' };
  }, []);

  const copyCasa = useCallback(() => {
    if (!user.profile?.casa) return;
    navigator.clipboard.writeText(user.profile.casa).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }, [user.profile?.casa]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(amount);

  const firstName = user.profile?.first_name || user.name.split(' ')[0];
  const isLoading = activeView === 'balance' ? balanceLoading : investmentLoading;
  const displayAmount = activeView === 'balance' ? balance : investmentTotal;

  const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.09 } }
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full overflow-hidden bg-slate-50 dark:bg-slate-950 px-4 sm:px-6 py-8 md:py-14">

      {/* Ambient background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-48 -right-48 size-[600px] rounded-full blur-[120px] opacity-60 transition-all duration-700 ${activeView === 'balance' ? 'bg-blue-500/10' : 'bg-violet-500/10'}`} />
        <div className="absolute bottom-0 -left-32 size-[500px] rounded-full blur-[100px] bg-primary/5 opacity-50" />
      </div>

      <motion.div
        className="relative z-10 max-w-4xl mx-auto space-y-8"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >

        {/* ── Greeting ─────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mb-1">
              {greeting.emoji} <span>{greeting.text}</span>
            </p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              {firstName}
            </h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
          </div>
        </motion.div>

        {/* ── Account Card Block ──────────────────────────────────── */}
        {user.profile?.casa && (
          <motion.div variants={fadeUp} className="space-y-0">

            {/* Tab switcher — fused to the top of the card */}
            <div className="flex items-center rounded-t-[2rem] overflow-hidden border border-b-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              {(
                [
                  { view: 'balance' as CardView, label: 'CASA Balance', icon: 'account_balance_wallet' },
                  { view: 'investment' as CardView, label: 'Investments', icon: 'trending_up', badge: investmentCount || null },
                ] as { view: CardView; label: string; icon: string; badge?: number | null }[]
              ).map((tab, idx) => (
                <button
                  key={tab.view}
                  onClick={() => setActiveView(tab.view)}
                  className={`relative flex-1 flex items-center justify-center gap-2 py-3.5 text-[11px] font-black uppercase tracking-widest transition-all ${
                    activeView === tab.view
                      ? 'text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  } ${idx === 0 ? '' : 'border-l border-slate-200 dark:border-slate-800'}`}
                >
                  {/* Active indicator fills the button */}
                  {activeView === tab.view && (
                    <motion.div
                      layoutId="tab-active"
                      className={`absolute inset-0 ${tab.view === 'balance' ? 'bg-[#162d72]' : 'bg-[#2a1060]'}`}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                    />
                  )}
                  <span className="relative material-symbols-outlined text-sm">{tab.icon}</span>
                  <span className="relative">{tab.label}</span>
                  {tab.badge && tab.badge > 0 && (
                    <span className={`relative px-1.5 py-0.5 rounded-full text-[9px] font-black ${activeView === tab.view ? 'bg-white/20 text-white' : 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400'}`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* The Card itself */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className={`relative rounded-b-[2rem] overflow-hidden shadow-2xl ${activeView === 'balance' ? 'shadow-blue-950/30' : 'shadow-violet-950/30'}`}
              >
                {/* Card gradient bg */}
                <div className={`absolute inset-0 ${activeView === 'balance' ? 'bg-gradient-to-br from-[#0d1d5a] via-[#162d72] to-[#091540]' : 'bg-gradient-to-br from-[#160836] via-[#2a1060] to-[#0e062a]'}`} />

                {/* Decorative overlays */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="absolute -top-24 -left-24 size-72 rounded-full bg-white/[0.04]" />
                  <div className="absolute top-6 right-10 size-[28rem] rounded-full bg-white/[0.02]" />
                  <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="cg" width="44" height="44" patternUnits="userSpaceOnUse">
                        <path d="M 44 0 L 0 0 0 44" fill="none" stroke="white" strokeWidth="0.6"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#cg)" />
                  </svg>
                </div>

                {/* Card content */}
                <div className="relative p-6 md:p-8">
                  {/* Row 1: Brand + controls */}
                  <div className="flex items-start justify-between mb-7">
                    <div>
                      <p className={`text-[9px] font-black uppercase tracking-[0.35em] mb-1 ${activeView === 'balance' ? 'text-blue-300/70' : 'text-violet-300/70'}`}>
                        NOLT Finance
                      </p>
                      <p className="text-white/50 text-[11px] font-semibold">
                        {activeView === 'balance' ? 'Current Account' : 'Fixed Deposit Portfolio'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setBalanceVisible(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white/60 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all"
                      >
                        <span className="material-symbols-outlined text-base leading-none">
                          {balanceVisible ? 'visibility' : 'visibility_off'}
                        </span>
                        {balanceVisible ? 'Hide' : 'Show'}
                      </button>
                      {/* EMV Chip */}
                      <div className={`w-9 h-6 rounded-md opacity-90 shadow-inner bg-gradient-to-br ${activeView === 'balance' ? 'from-yellow-300 to-amber-500' : 'from-violet-300 to-violet-500'} transition-all duration-500`} />
                    </div>
                  </div>

                  {/* Row 2: Amount */}
                  <div className="mb-8">
                    <p className="text-[9px] font-semibold text-white/40 uppercase tracking-[0.3em] mb-3">
                      {activeView === 'balance' ? 'Available Balance' : 'Total Invested'}
                    </p>
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div key="sk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <div className="h-11 w-56 rounded-xl bg-white/10 animate-pulse" />
                        </motion.div>
                      ) : (
                        <motion.div key="amt" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                          <p className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                            {balanceVisible
                              ? (displayAmount !== null ? formatCurrency(displayAmount) : '₦ —')
                              : '₦ ●●●●●'}
                          </p>
                          {activeView === 'investment' && investmentCount > 0 && balanceVisible && (
                            <p className="mt-2 text-[11px] font-semibold text-white/40">
                              Across {investmentCount} active plan{investmentCount !== 1 ? 's' : ''}
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Row 3: Account holder + copyable account number */}
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-4 border-t border-white/10">
                    <div>
                      <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mb-1">Account Holder</p>
                      <p className="text-sm font-black text-white tracking-wide">
                        {acctName || user.name.toUpperCase()}
                      </p>
                    </div>

                    {/* Copyable pill */}
                    <button
                      onClick={copyCasa}
                      className="group relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-2xl bg-white/10 hover:bg-white/[0.16] active:scale-95 transition-all border border-white/10 hover:border-white/25"
                      title="Copy account number"
                    >
                      <div className="text-left">
                        <p className="text-[8px] text-white/35 uppercase tracking-[0.3em] font-bold">Account No.</p>
                        <p className="text-sm font-black text-white tracking-[0.18em] font-mono mt-0.5">
                          {user.profile.casa}
                        </p>
                      </div>
                      <div className={`size-8 rounded-xl flex items-center justify-center transition-all ${copied ? 'bg-emerald-500' : 'bg-white/10 group-hover:bg-white/20'}`}>
                        <span className={`material-symbols-outlined text-base ${copied ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                          {copied ? 'done' : 'content_copy'}
                        </span>
                      </div>

                      {/* Copied tooltip */}
                      <AnimatePresence>
                        {copied && (
                          <motion.span
                            initial={{ opacity: 0, y: 6, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute -top-8 right-0 px-2.5 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-lg shadow-lg whitespace-nowrap"
                          >
                            ✓ Copied!
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Gift Banner ─────────────────────────────────────────── */}
        <AnimatePresence>
          {pendingGiftToken && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-500 to-rose-700 p-6 md:p-8 flex flex-col sm:flex-row items-center gap-5 shadow-2xl shadow-rose-500/20">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="absolute -top-12 -right-12 size-48 bg-white/10 rounded-full" />
                </div>
                <div className="size-14 shrink-0 bg-white/20 rounded-2xl flex items-center justify-center text-white border border-white/20">
                  <span className="material-symbols-outlined text-3xl">redeem</span>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-lg font-black text-white tracking-tight">Special Gift Available 🎁</h3>
                  <p className="text-rose-100/80 text-sm font-medium mt-0.5">A reward is waiting — claim your investment to grow your portfolio.</p>
                </div>
                <button
                  onClick={() => navigateRouter(`/investment?gift_token=${pendingGiftToken}`)}
                  className="shrink-0 px-6 py-3 bg-white text-rose-600 font-black rounded-xl shadow-lg hover:bg-rose-50 active:scale-95 transition-all text-sm flex items-center gap-2"
                >
                  Claim Now <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Action Cards ───────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* New Application */}
          <motion.button
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigateRouter('/products')}
            className="group relative overflow-hidden rounded-[1.75rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none p-6 text-left flex flex-col gap-5 transition-all hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xl hover:shadow-blue-100 dark:hover:shadow-blue-950/30"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-500/5 rounded-full translate-x-12 -translate-y-12 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative flex justify-between items-start">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <span className="material-symbols-outlined text-2xl filled">add_circle</span>
              </div>
              <div className="size-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-all">
                <span className="material-symbols-outlined text-base">arrow_outward</span>
              </div>
            </div>
            <div className="relative">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-1">New Application</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Apply for loans or high-yield investment products.
            </p>
            </div>
            <div className="relative flex gap-2">
              <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-500/20">Loans</span>
              <span className="px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-black uppercase tracking-widest border border-violet-100 dark:border-violet-500/20">Investments</span>
            </div>
          </motion.button>

          {/* My Applications */}
          <motion.button
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('APPLICATIONS_LIST')}
            className="group relative overflow-hidden rounded-[1.75rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none p-6 text-left flex flex-col gap-5 transition-all hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-xl hover:shadow-violet-100 dark:hover:shadow-violet-950/30"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-50 dark:bg-violet-500/5 rounded-full translate-x-12 -translate-y-12 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative flex justify-between items-start">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
                <span className="material-symbols-outlined text-2xl filled">edit_document</span>
              </div>
              {drafts.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-full">
                  <span className="size-1.5 rounded-full bg-violet-500 animate-pulse" />
                  <span className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">{drafts.length} Saved</span>
                </div>
              )}
            </div>
            <div className="relative">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-1">My Applications</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Resume pending applications and track your submission status.
            </p>
            </div>
            <div className="relative">
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-violet-400 to-violet-600" />
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-1.5">{drafts.length} application{drafts.length !== 1 ? 's' : ''} in progress</p>
            </div>
          </motion.button>
        </motion.div>

        {/* ── Utilities ─────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('CALCULATOR')}
            className="group flex items-center justify-center gap-3 py-5 rounded-[1.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none text-sm font-black text-slate-600 dark:text-slate-300 transition-all hover:border-primary/30 hover:text-primary"
          >
            <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform filled text-xl">calculate</span>
            Loan Calculator
          </button>
          <button
            onClick={() => (window as any).zE?.('messenger', 'open')}
            className="group flex items-center justify-center gap-3 py-5 rounded-[1.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none text-sm font-black text-slate-600 dark:text-slate-300 transition-all hover:border-emerald-500/30 hover:text-emerald-600"
          >
            <span className="material-symbols-outlined text-emerald-500 group-hover:rotate-12 transition-transform text-xl">support_agent</span>
            Live Support
          </button>
        </motion.div>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="flex items-center justify-center gap-2 pb-4">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-sm">schedule</span>
          <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">
            Last login: Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default Dashboard;
