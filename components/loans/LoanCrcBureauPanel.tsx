import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { staffPath } from '@/lib/api/staff-path';

type OverviewRow = { indicator: string; type: string; value: string };

type CrcSummary = {
    responseCode: string;
    responseLabel: string;
    productName: string | null;
    reportOrderNumber: string | null;
    reportDate: string | null;
    subjectName: string | null;
    overview: OverviewRow[];
    institutions: Record<string, string>[];
    products: Record<string, string>[];
    performance: Record<string, string>[];
    facilities: Record<string, string>[];
};

type CrcPayload = {
    found: boolean;
    canPull?: boolean;
    reportId?: number;
    bvnTail?: string | null;
    pulledAt?: string;
    pulledByName?: string | null;
    reused?: boolean;
    source?: 'cached' | 'reused' | 'crc';
    summary?: CrcSummary;
};

function money(value: unknown): string {
    const cleaned = String(value ?? '').replace(/NGN/gi, '').replace(/,/g, '').trim();
    const n = Number(cleaned);
    if (!Number.isFinite(n) || cleaned === '') return value ? String(value) : '—';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
}

function formatWhen(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function LoanCrcBureauPanel({
    loanId,
    canRequest,
}: {
    loanId: number;
    canRequest: boolean;
}) {
    const [data, setData] = useState<CrcPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [pulling, setPulling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(staffPath(`loans/${loanId}/crc`), { withCredentials: true });
            setData(res.data as CrcPayload);
        } catch {
            setError('Could not load the credit bureau tab.');
            setData({ found: false });
        } finally {
            setLoading(false);
        }
    }, [loanId]);

    useEffect(() => {
        void load();
    }, [load]);

    async function pull(force = false) {
        if (!canRequest) return;
        const confirmed = window.confirm(
            force
                ? 'Request a fresh CRC report? This is a paid bureau search.'
                : 'Request a CRC Classic Standard report? This is a paid bureau search.',
        );
        if (!confirmed) return;
        setPulling(true);
        setError(null);
        try {
            const res = await axios.post(
                staffPath(`loans/${loanId}/crc`),
                { force },
                { withCredentials: true, timeout: 120000 },
            );
            setData(res.data as CrcPayload);
        } catch (err: unknown) {
            const message = axios.isAxiosError(err)
                ? err.response?.data?.message || 'Could not reach CRC. Try again.'
                : 'Could not reach CRC. Try again.';
            setError(String(message));
        } finally {
            setPulling(false);
        }
    }

    if (loading) {
        return <div className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 animate-pulse h-48" />;
    }

    const summary = data?.summary;
    const noHit = summary?.responseCode === '2';

    return (
        <div className="space-y-6">
            <div className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Credit bureau</p>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">CRC Classic Standard</h2>
                        {data?.found && summary ? (
                            <p className="text-sm text-slate-500 mt-2">
                                {summary.productName || 'Consumer Classic Report'}
                                {summary.reportOrderNumber ? ` · ${summary.reportOrderNumber}` : ''}
                                {data.bvnTail ? ` · BVN ${data.bvnTail}` : ''}
                                {data.reused ? ' · reused recent search' : ''}
                            </p>
                        ) : (
                            <p className="text-sm text-slate-500 mt-2">
                                No CRC report on this application yet. Credit I / II can request one from here.
                            </p>
                        )}
                    </div>
                    {canRequest ? (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => void pull(Boolean(data?.found))}
                                disabled={pulling}
                                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50"
                            >
                                {pulling ? 'Requesting…' : data?.found ? 'Refresh report' : 'Request CRC report'}
                            </button>
                        </div>
                    ) : (
                        <p className="text-xs font-bold text-slate-400">Only Credit I / II can request a report.</p>
                    )}
                </div>

                {error ? (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-800 dark:text-red-200">
                        {error}
                    </div>
                ) : null}

                {data?.found && data.pulledAt ? (
                    <p className="text-xs font-bold text-slate-400 mt-4">
                        Pulled {formatWhen(data.pulledAt)}
                        {data.pulledByName ? ` by ${data.pulledByName}` : ''}
                    </p>
                ) : null}
            </div>

            {noHit ? (
                <div className="rounded-[24px] border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-amber-900 dark:text-amber-200">No bureau record</h3>
                    <p className="text-sm text-amber-800 dark:text-amber-100 mt-2">
                        CRC has no credit exposure for this BVN, or lenders have not reported it yet.
                    </p>
                </div>
            ) : null}

            {summary && !noHit && data?.found ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {summary.overview.map((row) => (
                            <Metric key={row.type || row.indicator} label={row.indicator} value={row.value || '—'} />
                        ))}
                    </div>

                    {summary.institutions.length > 0 ? (
                        <Section title="By institution type">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            <th className="pb-3">Institution</th>
                                            <th className="pb-3">Accounts</th>
                                            <th className="pb-3">Outstanding</th>
                                            <th className="pb-3">Overdue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summary.institutions.map((row, idx) => (
                                            <tr key={`${row.INSTITUTION_TYPE}-${idx}`} className="border-t border-slate-100 dark:border-slate-800">
                                                <td className="py-3 font-bold">{row.INSTITUTION_TYPE || '—'}</td>
                                                <td className="py-3">{row.NO_OF_ACCOUNTS || '—'}</td>
                                                <td className="py-3">{money(row.OUSTANDING_BALANCE || row.OUTSTANDING_BALANCE)}</td>
                                                <td className="py-3">{money(row.AMOUNT_OVERDUE)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Section>
                    ) : null}

                    {summary.performance.length > 0 ? (
                        <Section title="Performance by lender">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            <th className="pb-3">Lender</th>
                                            <th className="pb-3">Facilities</th>
                                            <th className="pb-3">Performing</th>
                                            <th className="pb-3">NPL</th>
                                            <th className="pb-3">Balance</th>
                                            <th className="pb-3">Overdue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summary.performance.slice(0, 25).map((row, idx) => (
                                            <tr key={`${row.INSTITUTION_NAME}-${idx}`} className="border-t border-slate-100 dark:border-slate-800">
                                                <td className="py-3 font-bold">{row.INSTITUTION_NAME || '—'}</td>
                                                <td className="py-3">{row.FACILITIES_COUNT || '—'}</td>
                                                <td className="py-3">{row.PERFORMING_FACILITY || '—'}</td>
                                                <td className="py-3">{row.NONPERFORMING_FACILITY || '—'}</td>
                                                <td className="py-3">{money(row.ACCOUNT_BALANCE)}</td>
                                                <td className="py-3">{money(row.OVERDUE_AMOUNT)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Section>
                    ) : null}

                    {summary.facilities.length > 0 ? (
                        <Section title="Facilities">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            <th className="pb-3">Status</th>
                                            <th className="pb-3">Lender</th>
                                            <th className="pb-3">Product</th>
                                            <th className="pb-3">Sanctioned</th>
                                            <th className="pb-3">Overdue</th>
                                            <th className="pb-3">Days due</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summary.facilities.map((row, idx) => (
                                            <tr key={`${row.INSTITUTION_NAME}-${idx}`} className="border-t border-slate-100 dark:border-slate-800">
                                                <td className="py-3 font-bold">{row.ACCOUNT_STATUS || '—'}</td>
                                                <td className="py-3">{row.INSTITUTION_NAME || '—'}</td>
                                                <td className="py-3">{row.CREDIT_FACILITY_TYPE || '—'}</td>
                                                <td className="py-3">{money(row.SANCTION_AMOUNT)}</td>
                                                <td className="py-3">{money(row.OVER_DUE_AMT_PRICIPAL)}</td>
                                                <td className="py-3">{row.MAX_NUM_DAYS_DUE || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Section>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-4">{title}</h3>
            {children}
        </div>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-2 break-words">{value}</p>
        </div>
    );
}
