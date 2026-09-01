/** Shared styles aligned with Staff Promotions / dashboard pages. */
export const fieldClass =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all';

export const labelClass =
    'block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2';

export const panelClass =
    'bg-white dark:bg-[#1e293b] rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none';

export const staffStatCardClass =
    'bg-white dark:bg-[#1e293b] rounded-[24px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5';

export const statusPill: Record<string, string> = {
    sent: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    scheduled: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
    draft: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-500',
};

export const primaryBtnClass =
    'h-12 px-6 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50';
