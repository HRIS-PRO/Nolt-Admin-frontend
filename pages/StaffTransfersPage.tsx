import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import StaffLayout from '../components/layouts/StaffLayout';
import {
    TransferTransactionDrawer,
    type CbaTransactionRow,
} from '../components/transfers/TransferTransactionDrawer';

interface CbaTransaction extends CbaTransactionRow {}

interface Pagination {
    pageIndex: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}

interface Summary {
    totalCount: number;
    pageCount: number;
    pageAmount: number;
    pageFees: number;
    successCount: number;
    failedCount: number;
    pendingCount: number;
}

interface StaffTransfersPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

type StatusFilter = 'ALL' | 'SUCCESSFUL' | 'FAILED' | 'PENDING' | 'REVERSED';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function formatNaira(amount: number): string {
    return `₦${Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string): string {
    if (!iso) return '—';
    try {
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).format(new Date(iso));
    } catch {
        return iso;
    }
}

function normalizeStatus(code: string): StatusFilter {
    const s = (code ?? '').toLowerCase();
    if (s === 'success' || s === 'successful') return 'SUCCESSFUL';
    if (s === 'failed') return 'FAILED';
    if (s === 'reversed') return 'REVERSED';
    if (s === 'pending' || s === 'processing') return 'PENDING';
    return 'ALL';
}

function statusStyles(code: string): string {
    const bucket = normalizeStatus(code);
    if (bucket === 'SUCCESSFUL') return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
    if (bucket === 'FAILED') return 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400';
    if (bucket === 'PENDING') return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400';
    if (bucket === 'REVERSED') return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
}

const StaffTransfersPage: React.FC<StaffTransfersPageProps> = ({
    user,
    onLogout,
    toggleTheme,
    theme,
}) => {
    const [searchParams, setSearchParams] = useSearchParams();

    const accountNumber = searchParams.get('accountNumber') ?? '';
    const customerId = searchParams.get('customerId') ?? '';
    const startDate = searchParams.get('startDate') ?? '';
    const endDate = searchParams.get('endDate') ?? '';
    const pageIndex = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10', 10);
    const statusFilter = (searchParams.get('status') ?? 'ALL') as StatusFilter;
    const tableSearch = searchParams.get('q') ?? '';

    const [draftAccount, setDraftAccount] = useState(accountNumber);
    const [draftCustomer, setDraftCustomer] = useState(customerId);
    const [draftStart, setDraftStart] = useState(startDate);
    const [draftEnd, setDraftEnd] = useState(endDate);

    const [transactions, setTransactions] = useState<CbaTransaction[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        pageIndex: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 1,
    });
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTx, setSelectedTx] = useState<CbaTransaction | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const updateParams = useCallback(
        (patch: Record<string, string | null>, resetPage = false) => {
            const next = new URLSearchParams(searchParams);
            Object.entries(patch).forEach(([key, value]) => {
                if (value === null || value === '') next.delete(key);
                else next.set(key, value);
            });
            if (resetPage) next.set('page', '1');
            setSearchParams(next);
        },
        [searchParams, setSearchParams],
    );

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get('/api/staff/cba-transactions', {
                withCredentials: true,
                params: {
                    accountNumber: accountNumber || undefined,
                    customerId: customerId || undefined,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    pageIndex,
                    pageSize,
                },
            });
            setTransactions(res.data.transactions ?? []);
            setPagination(res.data.pagination ?? { pageIndex: 1, pageSize, totalCount: 0, totalPages: 1 });
            setSummary(res.data.summary ?? null);
        } catch (err) {
            const msg = axios.isAxiosError(err)
                ? (err.response?.data as { message?: string })?.message ?? 'Failed to load transactions'
                : 'Failed to load transactions';
            setError(msg);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    }, [accountNumber, customerId, startDate, endDate, pageIndex, pageSize]);

    useEffect(() => {
        void fetchTransactions();
    }, [fetchTransactions]);

    useEffect(() => {
        setDraftAccount(accountNumber);
        setDraftCustomer(customerId);
        setDraftStart(startDate);
        setDraftEnd(endDate);
    }, [accountNumber, customerId, startDate, endDate]);

    const filteredRows = useMemo(() => {
        const q = tableSearch.trim().toLowerCase();
        return transactions.filter((tx) => {
            const bucket = normalizeStatus(tx.transactionStatusCode);
            if (statusFilter !== 'ALL' && bucket !== statusFilter) return false;
            if (!q) return true;
            const haystack = [
                tx.transactionReference,
                tx.narration,
                tx.accountNumber,
                tx.beneficiaryAccountNumber,
                tx.customerId,
                tx.transactionTypeCode,
                tx.extSessionID,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [transactions, statusFilter, tableSearch]);

    const handleApplyFilters = (e: React.FormEvent) => {
        e.preventDefault();
        updateParams(
            {
                accountNumber: draftAccount.trim() || null,
                customerId: draftCustomer.trim() || null,
                startDate: draftStart || null,
                endDate: draftEnd || null,
            },
            true,
        );
    };

    const handleClearFilters = () => {
        setDraftAccount('');
        setDraftCustomer('');
        setDraftStart('');
        setDraftEnd('');
        setSearchParams(new URLSearchParams({ page: '1', pageSize: String(pageSize) }));
    };

    const openDrawer = (tx: CbaTransaction) => {
        setSelectedTx(tx);
        setDrawerOpen(true);
    };

    const closeDrawer = () => {
        setDrawerOpen(false);
        setSelectedTx(null);
    };

    const exportCsv = () => {
        if (filteredRows.length === 0) {
            alert('No rows to export.');
            return;
        }
        const headers = [
            'Reference',
            'Date',
            'Source Account',
            'Customer ID',
            'Beneficiary Account',
            'Bank Code',
            'Amount',
            'Fee',
            'Type',
            'Status',
            'Narration',
        ];
        const rows = filteredRows.map((tx) => [
            tx.transactionReference,
            tx.transactionDate,
            tx.accountNumber,
            tx.customerId?.trim(),
            tx.beneficiaryAccountNumber,
            tx.beneficiaryBankCode,
            tx.amount,
            tx.fee,
            tx.transactionTypeCode,
            tx.transactionStatusCode,
            tx.narration,
        ]);
        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cba-transactions_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const statCardClass =
        'bg-white dark:bg-[#1e293b] rounded-[24px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm';

    const pageStart = pagination.totalCount === 0 ? 0 : (pageIndex - 1) * pageSize + 1;
    const pageEnd = Math.min(pageIndex * pageSize, pagination.totalCount);

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Dashboard / Management / CBA Transfers
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            Mobile app transfers
                        </h1>
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                                CBA gateway live
                            </span>
                        </span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => void fetchTransactions()}
                        className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={exportCsv}
                        className="h-11 px-5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <div className={statCardClass}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Total matching records
                    </p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                        {summary?.totalCount?.toLocaleString() ?? '—'}
                    </p>
                    <p className="text-xs font-medium text-slate-500 mt-2">
                        Page volume {formatNaira(summary?.pageAmount ?? 0)} · fees {formatNaira(summary?.pageFees ?? 0)}
                    </p>
                </div>
                <div className={statCardClass}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">
                        Successful (this page)
                    </p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                        {summary?.successCount ?? 0}
                    </p>
                    <p className="text-xs font-medium text-slate-500 mt-2">
                        {summary?.pageCount
                            ? `${Math.round(((summary.successCount ?? 0) / summary.pageCount) * 100)}% of loaded rows`
                            : '—'}
                    </p>
                </div>
                <div className={statCardClass}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-2">
                        Failed / reversed (page)
                    </p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                        {summary?.failedCount ?? 0}
                    </p>
                </div>
                <div className={statCardClass}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">
                        Pending (page)
                    </p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                        {summary?.pendingCount ?? 0}
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e293b] rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden">
                <div className="px-6 pt-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap gap-2 mb-6">
                        <span className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest">
                            Transaction feed ({pagination.totalCount})
                        </span>
                        <span className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 border border-slate-200 dark:border-slate-700">
                            Reconciliation &amp; GL — soon
                        </span>
                        <span className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 border border-slate-200 dark:border-slate-700">
                            Switch analytics — soon
                        </span>
                    </div>

                    <form onSubmit={handleApplyFilters} className="grid lg:grid-cols-4 gap-4 pb-6">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                                Account number
                            </label>
                            <input
                                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 text-sm font-medium"
                                placeholder="e.g. 2220014326"
                                value={draftAccount}
                                onChange={(e) => setDraftAccount(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                                Customer ID (CBA)
                            </label>
                            <input
                                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 text-sm font-medium"
                                placeholder="e.g. 5828"
                                value={draftCustomer}
                                onChange={(e) => setDraftCustomer(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                                Start date
                            </label>
                            <input
                                type="datetime-local"
                                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 text-sm font-medium"
                                value={draftStart}
                                onChange={(e) => setDraftStart(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                                End date
                            </label>
                            <input
                                type="datetime-local"
                                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 text-sm font-medium"
                                value={draftEnd}
                                onChange={(e) => setDraftEnd(e.target.value)}
                            />
                        </div>
                        <div className="lg:col-span-4 flex flex-wrap gap-2">
                            <button
                                type="submit"
                                className="h-11 px-6 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700"
                            >
                                Apply filters
                            </button>
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="h-11 px-6 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-slate-500"
                            >
                                Clear
                            </button>
                        </div>
                    </form>

                    <div className="flex flex-col xl:flex-row xl:items-center gap-4 pb-6">
                        <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">
                                search
                            </span>
                            <input
                                className="w-full h-11 pl-12 pr-4 rounded-xl bg-slate-100 dark:bg-slate-900/50 border-none text-sm font-medium"
                                placeholder="Search reference, narration, accounts, customer ID…"
                                value={tableSearch}
                                onChange={(e) => updateParams({ q: e.target.value || null })}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(['ALL', 'SUCCESSFUL', 'FAILED', 'PENDING', 'REVERSED'] as StatusFilter[]).map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => updateParams({ status: s === 'ALL' ? null : s })}
                                    className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                                        statusFilter === s
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {error ? (
                    <div className="p-10 text-center">
                        <p className="font-bold text-rose-600 dark:text-rose-400">{error}</p>
                        <button
                            type="button"
                            onClick={() => void fetchTransactions()}
                            className="mt-4 text-sm font-bold text-blue-600"
                        >
                            Retry
                        </button>
                    </div>
                ) : loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="py-20 text-center text-slate-500 font-medium">
                        No transactions match your filters.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1100px]">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                    {[
                                        'Txn ref / session',
                                        'Date & time',
                                        'Source account',
                                        'Customer ID',
                                        'Destination',
                                        'Amount & fees',
                                        'Narration',
                                        'Status',
                                        'Type',
                                        '',
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map((tx) => (
                                    <tr
                                        key={tx.id}
                                        onClick={() => openDrawer(tx)}
                                        className="border-b border-slate-50 dark:border-slate-800/80 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 cursor-pointer transition-colors"
                                    >
                                        <td className="px-4 py-4">
                                            <p className="font-bold text-xs text-slate-900 dark:text-white font-mono">
                                                {tx.transactionReference}
                                            </p>
                                            {tx.extSessionID ? (
                                                <p className="text-[10px] text-slate-400 mt-1 font-mono">{tx.extSessionID}</p>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-4 text-xs font-medium text-slate-500 whitespace-nowrap">
                                            {formatDateTime(tx.transactionDate)}
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                                                {tx.accountNumber}
                                            </p>
                                            <p className="text-[10px] text-slate-400 uppercase mt-0.5">CASA</p>
                                        </td>
                                        <td className="px-4 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 font-mono">
                                            {tx.customerId?.trim() || '—'}
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                                                {tx.beneficiaryAccountNumber || '—'}
                                            </p>
                                            {tx.beneficiaryBankCode ? (
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    Bank {tx.beneficiaryBankCode}
                                                </p>
                                            ) : (
                                                <p className="text-[10px] text-slate-400 mt-0.5">NOLT wallet</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <p className="font-black text-slate-900 dark:text-white">
                                                {formatNaira(tx.amount)}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                Fee {formatNaira(tx.fee)}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4 text-xs font-medium text-slate-600 dark:text-slate-300 max-w-[180px]">
                                            <span className="line-clamp-2">{tx.narration || '—'}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span
                                                className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${statusStyles(tx.transactionStatusCode)}`}
                                            >
                                                {tx.transactionStatusCode}
                                            </span>
                                            {tx.paymentGatewayError ? (
                                                <p className="text-[10px] text-rose-500 mt-1 max-w-[120px] line-clamp-2">
                                                    {tx.paymentGatewayError}
                                                </p>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-4 text-[10px] font-bold uppercase text-slate-500 whitespace-nowrap">
                                            {tx.transactionTypeCode}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className="material-symbols-outlined text-slate-400 text-lg">
                                                chevron_right
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <p className="text-xs font-medium text-slate-500">
                        Showing {pageStart}–{pageEnd} of {pagination.totalCount.toLocaleString()} records
                        {tableSearch || statusFilter !== 'ALL' ? ` · ${filteredRows.length} visible after local filters` : ''}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold"
                            value={pageSize}
                            onChange={(e) =>
                                updateParams({ pageSize: e.target.value, page: '1' })
                            }
                        >
                            {PAGE_SIZE_OPTIONS.map((n) => (
                                <option key={n} value={n}>
                                    {n} / page
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            disabled={pageIndex <= 1}
                            onClick={() => updateParams({ page: String(pageIndex - 1) })}
                            className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase disabled:opacity-40"
                        >
                            Prev
                        </button>
                        <span className="text-xs font-bold text-slate-500 tabular-nums">
                            Page {pageIndex} / {pagination.totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={pageIndex >= pagination.totalPages}
                            onClick={() => updateParams({ page: String(pageIndex + 1) })}
                            className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <TransferTransactionDrawer
                transaction={selectedTx}
                open={drawerOpen}
                onClose={closeDrawer}
            />
        </StaffLayout>
    );
};

export default StaffTransfersPage;
