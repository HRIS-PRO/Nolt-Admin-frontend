import React, { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { CampaignRow } from './CampaignsHubTable';
import { panelClass, staffStatCardClass, statusPill } from './push-hub-styles';

interface BannerSummary {
    id: string;
    title: string;
    is_active: boolean;
}

type Props = {
    campaigns: CampaignRow[];
    banners: BannerSummary[];
};

function formatShortDate(iso: string): string {
    try {
        return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(iso));
    } catch {
        return iso;
    }
}

export function DeliveryAnalyticsPanel({ campaigns, banners }: Props) {
    const sent = campaigns.filter((c) => c.status === 'sent');
    const scheduled = campaigns.filter((c) => c.status === 'scheduled');
    const drafts = campaigns.filter((c) => c.status === 'draft');
    const highPriority = sent.filter((c) => c.priority === 'high').length;

    const last7Days = useMemo(() => {
        const days: { label: string; sends: number }[] = [];
        for (let i = 6; i >= 0; i -= 1) {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const label = formatShortDate(d.toISOString());
            const sends = sent.filter((c) => {
                const when = c.sent_at ?? c.created_at;
                return when?.slice(0, 10) === key;
            }).length;
            days.push({ label, sends });
        }
        return days;
    }, [sent]);

    const priorityMix = useMemo(
        () => [
            { name: 'High', count: campaigns.filter((c) => c.priority === 'high').length },
            { name: 'Normal', count: campaigns.filter((c) => c.priority === 'normal').length },
            { name: 'Low', count: campaigns.filter((c) => c.priority === 'low').length },
        ],
        [campaigns],
    );

    const recentSent = [...sent]
        .sort((a, b) => new Date(b.sent_at ?? b.created_at).getTime() - new Date(a.sent_at ?? a.created_at).getTime())
        .slice(0, 8);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    {
                        label: 'Broadcasts sent',
                        value: sent.length,
                        icon: 'send',
                        tone: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10',
                    },
                    {
                        label: 'Queued / scheduled',
                        value: scheduled.length,
                        icon: 'schedule',
                        tone: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
                    },
                    {
                        label: 'Draft campaigns',
                        value: drafts.length,
                        icon: 'draft',
                        tone: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800',
                    },
                    {
                        label: 'Live home banners',
                        value: banners.filter((b) => b.is_active).length,
                        icon: 'view_carousel',
                        tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
                    },
                ].map((stat) => (
                    <div key={stat.label} className={staffStatCardClass}>
                        <div className={`size-14 rounded-2xl flex items-center justify-center shrink-0 ${stat.tone}`}>
                            <span className="material-symbols-outlined text-3xl">{stat.icon}</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                {stat.label}
                            </p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                                {stat.value}
                            </h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-5 gap-6">
                <div className={`${panelClass} p-8 lg:col-span-3`}>
                    <div className="flex items-start justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                Send activity
                            </h2>
                            <p className="text-sm font-medium text-slate-500 mt-1">Broadcasts dispatched in the last 7 days</p>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                            By send date
                        </span>
                    </div>
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={last7Days} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.25)" />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: 12,
                                        border: '1px solid #e2e8f0',
                                        fontSize: 12,
                                        fontWeight: 700,
                                    }}
                                    formatter={(value: number) => [`${value} broadcast${value === 1 ? '' : 's'}`, 'Sent']}
                                />
                                <Bar dataKey="sends" fill="#2563eb" radius={[8, 8, 0, 0]} maxBarSize={48} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={`${panelClass} p-8 lg:col-span-2`}>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">
                        Priority mix
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mb-6">All campaigns by delivery priority</p>
                    <div className="space-y-4">
                        {priorityMix.map((row) => {
                            const pct = campaigns.length ? Math.round((row.count / campaigns.length) * 100) : 0;
                            return (
                                <div key={row.name}>
                                    <div className="flex justify-between text-xs font-bold mb-1.5">
                                        <span className="text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                                            {row.name}
                                        </span>
                                        <span className="text-slate-400 tabular-nums">
                                            {row.count} · {pct}%
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-blue-600 transition-all"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {highPriority > 0 ? (
                        <p className="mt-6 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-3 py-2.5">
                            {highPriority} high-priority broadcast{highPriority === 1 ? '' : 's'} include in-app overlay delivery.
                        </p>
                    ) : null}
                </div>
            </div>

            <div className={`${panelClass} p-8`}>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            Campaign delivery log
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                            Recent broadcasts — open and tap metrics will populate when mobile event tracking is live.
                        </p>
                    </div>
                </div>

                {recentSent.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="size-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                            <span className="material-symbols-outlined text-3xl">insights</span>
                        </div>
                        <p className="font-bold text-slate-600 dark:text-slate-300">No sent broadcasts yet</p>
                        <p className="text-sm text-slate-500 mt-1">Analytics will appear after your first campaign goes out.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[720px]">
                            <thead>
                                <tr>
                                    {['Campaign', 'Priority', 'Sent', 'Delivered', 'Opened', 'Tapped'].map((h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-widest"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {recentSent.map((c) => (
                                    <tr
                                        key={c.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                    >
                                        <td className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
                                            <p className="font-bold text-slate-900 dark:text-white">{c.title}</p>
                                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{c.body}</p>
                                        </td>
                                        <td className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
                                            <span className="text-xs font-bold uppercase text-slate-500">{c.priority}</span>
                                        </td>
                                        <td className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-500 whitespace-nowrap">
                                            {formatShortDate(c.sent_at ?? c.created_at)}
                                        </td>
                                        <td className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
                                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${statusPill.sent}`}>
                                                Tracking soon
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 text-sm font-black text-slate-300 dark:text-slate-600 tabular-nums">
                                            —
                                        </td>
                                        <td className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 text-sm font-black text-slate-300 dark:text-slate-600 tabular-nums">
                                            —
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
