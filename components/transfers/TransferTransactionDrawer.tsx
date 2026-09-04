import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

export interface CbaTransactionRow {
    id: number;
    accountNumber: string;
    transactionReference: string;
    amount: number;
    fee: number;
    customerId: string;
    currencyCode: string;
    narration: string;
    transactionStatusCode: string;
    transactionTypeCode: string;
    beneficiaryAccountNumber: string;
    beneficiaryBankCode: string;
    paymentGatewayError: string | null;
    extSessionID: string | null;
    extTransactionId: string | null;
    extPaymentReference: string | null;
    transactionDate: string;
    dateCreated?: string;
    dateModified?: string;
    status?: number;
    statusDescription?: string;
}

interface TransactionContext {
    source: {
        customerId?: number;
        fullName?: string;
        email?: string;
        phone?: string;
        tierLevel?: number;
        bvn?: string;
        casa?: string;
        cbaCustomerId?: string;
        currentBalance?: number | null;
        estimatedPostDebit?: number | null;
    };
    destination: {
        isInternalWallet: boolean;
        accountNumber: string | null;
        bankCode: string | null;
        bankLabel: string;
        profile: { fullName?: string; tierLevel?: number; casa?: string } | null;
    };
}

type DrawerTab = 'overview' | 'ledger' | 'audit' | 'payload';

const drawerPanelClass = 'rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60';

type Props = {
    transaction: CbaTransactionRow | null;
    open: boolean;
    onClose: () => void;
};

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

function statusTone(code: string): string {
    const s = (code ?? '').toLowerCase();
    if (s === 'success' || s === 'successful') {
        return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30';
    }
    if (s.includes('fail') || s === 'failed') {
        return 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30';
    }
    if (s === 'pending' || s === 'processing') {
        return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30';
    }
    return 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600';
}

function typeLabel(code: string): string {
    const map: Record<string, string> = {
        WalletTransfer: 'NOLT wallet transfer',
        BankTransfer: 'Bank transfer (NIP)',
        BillPayment: 'Bill payment',
    };
    return map[code] ?? code.replace(/([A-Z])/g, ' $1').trim();
}

function copyText(text: string) {
    void navigator.clipboard.writeText(text);
}

export function TransferTransactionDrawer({ transaction, open, onClose }: Props) {
    const [tab, setTab] = useState<DrawerTab>('overview');
    const [context, setContext] = useState<TransactionContext | null>(null);
    const [loadingContext, setLoadingContext] = useState(false);
    const [showReversalConfirm, setShowReversalConfirm] = useState(false);

    const panelClass = drawerPanelClass;
    const canReverse = useMemo(() => {
        if (!transaction) return false;
        const status = (transaction.transactionStatusCode ?? '').toLowerCase();
        return status === 'success' || status === 'successful';
    }, [transaction]);

    useEffect(() => {
        if (!open) {
            setTab('overview');
            setContext(null);
            setShowReversalConfirm(false);
            return;
        }
        if (!transaction) return;

        setLoadingContext(true);
        axios
            .get('/api/staff/cba-transactions/context', {
                withCredentials: true,
                params: {
                    accountNumber: transaction.accountNumber,
                    customerId: transaction.customerId?.trim(),
                    beneficiaryAccountNumber: transaction.beneficiaryAccountNumber,
                    beneficiaryBankCode: transaction.beneficiaryBankCode,
                    amount: transaction.amount,
                    fee: transaction.fee,
                },
            })
            .then((res) => setContext(res.data))
            .catch(() => setContext(null))
            .finally(() => setLoadingContext(false));
    }, [open, transaction]);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    const totalDebited = useMemo(() => {
        if (!transaction) return 0;
        return Number(transaction.amount) + Number(transaction.fee || 0);
    }, [transaction]);

    const ledgerEntries = useMemo(() => {
        if (!transaction) return [];
        return [
            {
                label: 'Principal transfer',
                account: transaction.accountNumber,
                direction: 'DR',
                amount: transaction.amount,
            },
            ...(Number(transaction.fee) > 0
                ? [{
                    label: 'Transfer / switch fee',
                    account: transaction.accountNumber,
                    direction: 'DR',
                    amount: transaction.fee,
                }]
                : []),
            {
                label: 'Beneficiary credit',
                account: transaction.beneficiaryAccountNumber || '—',
                direction: 'CR',
                amount: transaction.amount,
            },
        ];
    }, [transaction]);

    const auditEvents = useMemo(() => {
        if (!transaction) return [];
        const events = [
            { at: transaction.transactionDate, label: 'Transaction posted', detail: 'CBA core ledger event' },
            { at: transaction.dateCreated, label: 'Record created', detail: 'CBA transaction row inserted' },
            { at: transaction.dateModified, label: 'Last updated', detail: 'CBA transaction metadata sync' },
        ].filter((e) => e.at);
        return events;
    }, [transaction]);

    if (!transaction) return null;

    const preDebit =
        context?.source?.currentBalance != null && Number.isFinite(totalDebited)
            ? context.source.currentBalance + totalDebited
            : null;

    const drawer = (
        <div
            className={`fixed top-0 left-0 right-0 bottom-0 z-[200] flex justify-end h-[100dvh] w-screen transition-opacity duration-300 ${
                open ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
        >
            <div className="absolute inset-0 bg-black/50 dark:bg-slate-900/70 backdrop-blur-sm" onClick={onClose} aria-hidden />

            <aside
                className={`relative w-full max-w-xl bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white shadow-2xl flex flex-col h-[100dvh] min-h-0 transition-transform duration-300 border-l border-slate-200 dark:border-slate-800 ${
                    open ? 'translate-x-0' : 'translate-x-full'
                }`}
                role="dialog"
                aria-modal="true"
                aria-label="Transaction audit"
            >
                {/* header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                    Transfer transaction audit
                                </p>
                                <span
                                    className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusTone(transaction.transactionStatusCode)}`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                    {transaction.transactionStatusCode}
                                </span>
                            </div>
                            <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{formatNaira(transaction.amount)}</p>
                            <div className="mt-3 space-y-1">
                                <p className="text-xs text-slate-400 font-mono truncate">
                                    Ref: {transaction.transactionReference}
                                </p>
                                {transaction.extSessionID ? (
                                    <p className="text-[11px] text-slate-500 font-mono truncate">
                                        Session: {transaction.extSessionID}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                type="button"
                                title="Copy reference"
                                onClick={() => copyText(transaction.transactionReference)}
                                className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400"
                            >
                                <span className="material-symbols-outlined text-lg">content_copy</span>
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 -mb-px overflow-x-auto">
                        {(
                            [
                                ['overview', 'Overview'],
                                ['ledger', `Ledger (${ledgerEntries.length})`],
                                ['audit', `Audit trail (${auditEvents.length})`],
                                ['payload', 'CBA payload'],
                            ] as const
                        ).map(([id, label]) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setTab(id)}
                                className={`px-3 py-2.5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors ${
                                    tab === id
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {tab === 'overview' && (
                        <div className="space-y-6">
                            {loadingContext ? (
                                <div className="py-8 flex justify-center">
                                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-500" />
                                </div>
                            ) : null}

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className={`${panelClass} p-4`}>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">north_east</span>
                                        Source (initiator)
                                    </p>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm mb-3">
                                        {context?.source?.fullName ?? 'Customer profile not linked'}
                                    </p>
                                    <dl className="space-y-2 text-xs">
                                        <Row label="Account" value={`${transaction.accountNumber} (CASA)`} mono />
                                        <Row label="CBA customer ID" value={transaction.customerId?.trim() || '—'} mono />
                                        <Row label="Bank" value="NOLT Microfinance Bank" />
                                        {context?.source?.bvn ? <Row label="BVN" value={context.source.bvn} mono /> : null}
                                        {context?.source?.tierLevel != null ? (
                                            <Row label="KYC tier" value={`Tier ${context.source.tierLevel}`} />
                                        ) : null}
                                        {preDebit != null ? (
                                            <Row label="Est. pre-debit balance" value={formatNaira(preDebit)} highlight />
                                        ) : null}
                                        {context?.source?.currentBalance != null ? (
                                            <Row label="Current balance (live)" value={formatNaira(context.source.currentBalance)} />
                                        ) : null}
                                    </dl>
                                </div>

                                <div className={`${panelClass} p-4`}>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">south_west</span>
                                        Destination (beneficiary)
                                    </p>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm mb-3">
                                        {context?.destination?.profile?.fullName
                                            ?? (context?.destination?.isInternalWallet
                                                ? 'NOLT wallet customer'
                                                : 'External beneficiary')}
                                    </p>
                                    <dl className="space-y-2 text-xs">
                                        <Row
                                            label="Account"
                                            value={transaction.beneficiaryAccountNumber || '—'}
                                            mono
                                        />
                                        <Row label="Bank / rail" value={context?.destination?.bankLabel ?? '—'} />
                                        {context?.destination?.profile?.tierLevel != null ? (
                                            <Row label="KYC tier" value={`Tier ${context.destination.profile.tierLevel}`} />
                                        ) : null}
                                        {transaction.beneficiaryBankCode ? (
                                            <Row label="NIP bank code" value={transaction.beneficiaryBankCode} mono />
                                        ) : null}
                                    </dl>
                                </div>
                            </div>

                            <section>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                                    Transaction pricing &amp; charges
                                </p>
                                <div className={`${panelClass} divide-y divide-slate-200 dark:divide-slate-800`}>
                                    <PricingRow label="Principal transfer amount" value={formatNaira(transaction.amount)} />
                                    <PricingRow label="Processing fee" value={formatNaira(transaction.fee)} />
                                    <PricingRow
                                        label="Total amount debited"
                                        value={formatNaira(totalDebited)}
                                        emphasis
                                    />
                                </div>
                            </section>

                            <section>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                                    Transaction narration
                                </p>
                                <blockquote className={`${panelClass} px-4 py-3 text-sm text-slate-600 dark:text-slate-300 italic`}>
                                    &ldquo;{transaction.narration || 'No narration provided'}&rdquo;
                                </blockquote>
                            </section>

                            <section>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                                    Transfer analytics
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <AnalyticsTile label="Type" value={typeLabel(transaction.transactionTypeCode)} />
                                    <AnalyticsTile label="Currency" value={transaction.currencyCode || 'NGN'} />
                                    <AnalyticsTile label="Channel" value="Mobile app → CBA" />
                                    <AnalyticsTile label="Posted at" value={formatDateTime(transaction.transactionDate)} />
                                    {transaction.paymentGatewayError ? (
                                        <div className="col-span-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-3 py-2.5">
                                            <p className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-400 mb-1">Gateway error</p>
                                            <p className="text-xs text-rose-800 dark:text-rose-200">{transaction.paymentGatewayError}</p>
                                        </div>
                                    ) : null}
                                </div>
                            </section>

                            {context?.source?.email || context?.source?.phone ? (
                                <section>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                                        Customer contact (LMS)
                                    </p>
                                    <div className={`${panelClass} p-4 text-xs space-y-2`}>
                                        {context.source.email ? <Row label="Email" value={context.source.email} /> : null}
                                        {context.source.phone ? <Row label="Phone" value={context.source.phone} mono /> : null}
                                        {context.source.customerId ? (
                                            <Row
                                                label="LMS profile"
                                                value={`Customer #${context.source.customerId}`}
                                            />
                                        ) : null}
                                    </div>
                                </section>
                            ) : null}
                        </div>
                    )}

                    {tab === 'ledger' && (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-400 mb-4">
                                Derived ledger view from CBA amounts — full GL posting detail requires CBA reconciliation module.
                            </p>
                            {ledgerEntries.map((entry, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center justify-between gap-4 ${panelClass} px-4 py-3`}
                                >
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{entry.label}</p>
                                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{entry.account}</p>
                                    </div>
                                    <div className="text-right">
                                        <span
                                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                                entry.direction === 'DR'
                                                    ? 'bg-rose-500/15 text-rose-400'
                                                    : 'bg-emerald-500/15 text-emerald-400'
                                            }`}
                                        >
                                            {entry.direction}
                                        </span>
                                        <p className="text-sm font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                                            {formatNaira(Number(entry.amount))}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'audit' && (
                        <div className="space-y-4">
                            {auditEvents.map((event, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                                        {i < auditEvents.length - 1 ? (
                                            <span className="w-px flex-1 bg-slate-700 my-1 min-h-[2rem]" />
                                        ) : null}
                                    </div>
                                    <div className="pb-4">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{event.label}</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">{event.detail}</p>
                                        <p className="text-xs text-slate-400 font-mono mt-1">{formatDateTime(event.at)}</p>
                                    </div>
                                </div>
                            ))}
                            {transaction.extTransactionId || transaction.extPaymentReference ? (
                                <div className={`${drawerPanelClass} p-4 text-xs space-y-2 mt-4`}>
                                    {transaction.extTransactionId ? (
                                        <Row label="External txn ID" value={transaction.extTransactionId} mono />
                                    ) : null}
                                    {transaction.extPaymentReference ? (
                                        <Row label="Payment reference" value={transaction.extPaymentReference} mono />
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    )}

                    {tab === 'payload' && (
                        <pre className={`text-[11px] leading-relaxed font-mono text-slate-700 dark:text-slate-300 ${panelClass} p-4 overflow-x-auto whitespace-pre-wrap break-all`}>
                            {JSON.stringify(transaction, null, 2)}
                        </pre>
                    )}
                </div>

                <div className="shrink-0 p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b]">
                    <button
                        type="button"
                        disabled={!canReverse}
                        onClick={() => setShowReversalConfirm(true)}
                        className="w-full h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        Reverse transaction
                    </button>
                    {!canReverse ? (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-2">
                            Reversal is only available for successful transfers.
                        </p>
                    ) : null}
                </div>

                {showReversalConfirm ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-black/40 dark:bg-slate-950/70">
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="reversal-confirm-title"
                            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl"
                        >
                            <h3 id="reversal-confirm-title" className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                Confirm reversal
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                                This will request a reversal for{' '}
                                <span className="font-bold">{formatNaira(transaction.amount)}</span> to account{' '}
                                <span className="font-mono">{transaction.beneficiaryAccountNumber || '—'}</span>.
                                The reversal API is not connected yet — this action is a placeholder for staff workflow.
                            </p>
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowReversalConfirm(false)}
                                    className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowReversalConfirm(false);
                                        window.alert('Reversal request queued. Tunde will connect the live reversal API soon.');
                                    }}
                                    className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-widest"
                                >
                                    Confirm reversal
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </aside>
        </div>
    );

    return createPortal(drawer, document.body);
}

function Row({
    label,
    value,
    mono,
    highlight,
}: {
    label: string;
    value: string;
    mono?: boolean;
    highlight?: boolean;
}) {
    return (
        <div className="flex justify-between gap-3">
            <dt className="text-slate-500 shrink-0">{label}</dt>
            <dd
                className={`text-right ${mono ? 'font-mono' : ''} ${
                    highlight ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-200'
                }`}
            >
                {value}
            </dd>
        </div>
    );
}

function PricingRow({
    label,
    value,
    emphasis,
}: {
    label: string;
    value: string;
    emphasis?: boolean;
}) {
    return (
        <div className="flex justify-between items-center px-4 py-3 text-sm">
            <span className={emphasis ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}>{label}</span>
            <span className={`tabular-nums ${emphasis ? 'text-blue-600 dark:text-blue-400 font-black text-base' : 'text-slate-800 dark:text-slate-200 font-bold'}`}>
                {value}
            </span>
        </div>
    );
}

function AnalyticsTile({ label, value }: { label: string; value: string }) {
    return (
        <div className={`${drawerPanelClass} px-3 py-2.5`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 leading-snug">{value}</p>
        </div>
    );
}
