import React from 'react';
import { panelClass, primaryBtnClass, statusPill } from './push-hub-styles';

export interface CampaignRow {
    id: string;
    title: string;
    body: string;
    priority: 'high' | 'normal' | 'low';
    deep_link: string | null;
    status: string;
    scheduled_at: string | null;
    sent_at: string | null;
    created_at: string;
}

type Props = {
    campaigns: CampaignRow[];
    onCompose: () => void;
    onSend: (id: string) => void;
    sending: boolean;
};

function formatWhen(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(iso));
    } catch {
        return iso;
    }
}

function priorityLabel(p: string): string {
    if (p === 'high') return 'High';
    if (p === 'low') return 'Low';
    return 'Normal';
}

export function CampaignsHubTable({ campaigns, onCompose, onSend, sending }: Props) {
    return (
        <div className={`${panelClass} p-8`}>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        Campaigns hub
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Broadcast pushes, scheduled sends, and drafts in one place.
                    </p>
                </div>
                <button type="button" onClick={onCompose} className={primaryBtnClass}>
                    <span className="material-symbols-outlined text-lg">add</span>
                    New push campaign
                </button>
            </div>

            {campaigns.length === 0 ? (
                <div className="py-20 text-center">
                    <div className="size-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <span className="material-symbols-outlined text-4xl">notifications_active</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">No campaigns yet</h3>
                    <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto mt-2">
                        Create your first push to reach customers on iOS and Android lock screens.
                    </p>
                    <button
                        type="button"
                        onClick={onCompose}
                        className="mt-6 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Compose campaign →
                    </button>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[720px]">
                        <thead>
                            <tr>
                                {['Campaign', 'Status', 'Priority', 'Schedule / sent', 'Actions'].map((h) => (
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
                            {campaigns.map((c) => {
                                const pill = statusPill[c.status] ?? statusPill.default;
                                const when =
                                    c.status === 'sent'
                                        ? formatWhen(c.sent_at ?? c.created_at)
                                        : c.status === 'scheduled'
                                          ? formatWhen(c.scheduled_at)
                                          : formatWhen(c.created_at);

                                return (
                                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 max-w-xs">
                                            <p className="font-bold text-slate-900 dark:text-white truncate">{c.title}</p>
                                            <p className="text-xs font-medium text-slate-500 mt-0.5 line-clamp-1">{c.body}</p>
                                            {c.deep_link ? (
                                                <p className="text-[10px] text-slate-400 mt-1 truncate">→ {c.deep_link}</p>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
                                            <span
                                                className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${pill}`}
                                            >
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 text-xs font-bold uppercase text-slate-500">
                                            {priorityLabel(c.priority)}
                                        </td>
                                        <td className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-500 whitespace-nowrap">
                                            {when}
                                        </td>
                                        <td className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
                                            {c.status !== 'sent' ? (
                                                <button
                                                    type="button"
                                                    disabled={sending}
                                                    onClick={() => onSend(c.id)}
                                                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
                                                >
                                                    Send now
                                                </button>
                                            ) : (
                                                <span className="text-xs font-bold text-slate-400 uppercase">Delivered</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
