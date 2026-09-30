import React, { useEffect, useState } from 'react';
import axios from 'axios';

type Props = {
    customerId: number | null | undefined;
};

type StatementPayload = {
    found: boolean;
    isValid?: boolean;
    validUntil?: string;
    statement?: Record<string, unknown> | null;
};

function money(v: unknown): string {
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
}

export default function LoanBankStatementInsights({ customerId }: Props) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<StatementPayload | null>(null);

    useEffect(() => {
        if (!customerId) return;
        setLoading(true);
        void axios
            .get(`/api/staff/customers/${customerId}/bank-statement`, { withCredentials: true })
            .then((res) => setData(res.data as StatementPayload))
            .catch(() => setData({ found: false, statement: null }))
            .finally(() => setLoading(false));
    }, [customerId]);

    if (!customerId) return null;

    if (loading) {
        return (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 animate-pulse h-40" />
        );
    }

    if (!data?.found || !data.statement) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-amber-900 dark:text-amber-200">Bank statement</h3>
                <p className="text-sm text-amber-800 dark:text-amber-100 mt-2">
                    No analysed bank statement on file for this customer. Mobile applicants must upload a recent statement before applying.
                </p>
            </div>
        );
    }

    const s = data.statement;
    const stale = data.isValid === false;

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Bank statement insights</h3>
                    <p className="text-xs text-slate-500 mt-1">
                        {String(s.bankName ?? 'Bank')} · {String(s.accountNumber ?? '—')} · {String(s.accountName ?? '')}
                    </p>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${stale ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {stale ? 'Expired — re-upload required' : 'Valid'}
                </span>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Metric label="Statement period" value={`${String(s.periodStart ?? '—')} → ${String(s.periodEnd ?? '—')}`} />
                <Metric label="Reconciliation" value={String(s.reconciliationStatus ?? '—')} />
                <Metric label="Avg. daily balance" value={money(s.averageDailyBalance)} />
                <Metric label="Est. monthly salary" value={money(s.estimatedMonthlySalary)} />
                <Metric label="Employer (detected)" value={String(s.detectedEmployerName ?? '—')} />
                <Metric label="Monthly debt servicing" value={money(s.monthlyDebtServicing)} />
                <Metric label="DTI ratio" value={s.estimatedDtiRatio != null ? `${Number(s.estimatedDtiRatio).toFixed(2)}` : '—'} />
                <Metric label="Income stability" value={s.incomeStabilityScore != null ? String(s.incomeStabilityScore) : '—'} />
                <Metric label="Gambling txns" value={String(s.gamblingTransactionCount ?? '0')} />
                <Metric label="Document authentic" value={s.isAuthenticProducer === false ? 'Review' : s.isAuthenticProducer ? 'Yes' : '—'} />
                <Metric label="Modified PDF flag" value={s.modificationMismatch ? 'Yes' : 'No'} />
                <Metric label="Closing balance" value={money(s.closingBalance)} />
            </div>
            {typeof s.fileUrl === 'string' && s.fileUrl ? (
                <div className="px-6 pb-6">
                    <a href={s.fileUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline">
                        Open archived PDF →
                    </a>
                </div>
            ) : null}
        </div>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 break-words">{value}</p>
        </div>
    );
}
