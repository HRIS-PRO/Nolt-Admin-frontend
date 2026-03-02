
export const getStatusStyles = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';

    switch (normalizedStatus) {
        case 'disbursed':
            return {
                container: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500',
                dot: 'bg-emerald-500'
            };
        case 'approved':
            return {
                container: 'border-pink-500/20 bg-pink-500/10 text-pink-600 dark:text-pink-500',
                dot: 'bg-pink-500'
            };
        case 'pending':
        case 'processing':
            return {
                container: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-500',
                dot: 'bg-amber-500'
            };
        case 'rejected':
            return {
                container: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-500',
                dot: 'bg-red-500'
            };
        default:
            return {
                container: 'border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-500',
                dot: 'bg-slate-500'
            };
    }
};
