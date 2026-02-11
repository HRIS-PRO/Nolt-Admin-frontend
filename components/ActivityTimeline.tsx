import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Activity {
    id: string;
    action_type: string;
    description: string;
    metadata: any;
    created_at: string;
    user_name?: string;
    user_email?: string;
    user_role?: string;
    avatar_url?: string;
}

interface ActivityTimelineProps {
    loanId: string | undefined;
    refreshTrigger?: number;
    defaultOpen?: boolean;
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ loanId, refreshTrigger = 0, defaultOpen = false }) => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const [isTimelineOpen, setIsTimelineOpen] = useState(defaultOpen);

    const toggleExpand = (id: string) => {
        setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!loanId) return;
            try {
                const [activitiesRes, commentsRes] = await Promise.all([
                    axios.get(`/api/staff/loans/${loanId}/activities`, { withCredentials: true }),
                    axios.get(`/api/staff/loans/${loanId}/comments`, { withCredentials: true })
                ]);

                // Combine and sort
                const combined = [
                    ...activitiesRes.data.map((a: any) => ({ ...a, type: 'activity' })),
                    ...commentsRes.data.map((c: any) => ({ ...c, type: 'comment' }))
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                setItems(combined);
            } catch (error) {
                console.error("Failed to fetch timeline:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [loanId, refreshTrigger]);

    return (
        <div className="bg-white dark:bg-[#1e293b] rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div
                onClick={() => setIsTimelineOpen(!isTimelineOpen)}
                className="flex items-center justify-between p-6 cursor-pointer bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <span className="material-symbols-outlined text-lg">history</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Timeline</h3>
                </div>
                <span className={`material-symbols-outlined transition-transform text-slate-400 ${isTimelineOpen ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>
            </div>

            {isTimelineOpen && (
                <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-800">
                    {loading ? (
                        <div className="p-4 animate-pulse text-center text-slate-400 text-sm">Loading activity...</div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                                <span className="material-symbols-outlined">history</span>
                            </div>
                            <p className="font-bold text-slate-900 dark:text-white">No Activity Yet</p>
                            <p className="text-xs text-slate-500">Actions taken on this loan will appear here.</p>
                        </div>
                    ) : (
                        <div className="relative pl-4 border-l-2 border-slate-100 dark:border-slate-800 space-y-8 mt-6">
                            {items.map((item, idx) => {
                                const isComment = item.type === 'comment';
                                const isReject = item.action_type === 'reject';
                                const isApprove = item.action_type === 'approve';
                                const isReturn = item.action_type === 'return';

                                // Color logic
                                let colorClass = 'bg-slate-400';
                                if (isComment) colorClass = 'bg-yellow-500';
                                else if (isReject) colorClass = 'bg-red-500';
                                else if (isApprove) colorClass = 'bg-emerald-500';
                                else if (isReturn) colorClass = 'bg-orange-500';

                                const isExpanded = expandedItems[item.id];

                                return (
                                    <div key={item.id} className="relative group">
                                        {/* Dot */}
                                        <div className={`absolute -left-[21px] top-0 size-3 rounded-full border-2 border-white dark:border-[#1e293b] ${colorClass} group-hover:scale-125 transition-transform`}></div>

                                        <div className="flex flex-col gap-2">
                                            <div
                                                className="flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 -m-2 rounded-lg transition-colors"
                                                onClick={() => toggleExpand(item.id)}
                                            >
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white capitalize leading-tight flex items-center gap-2">
                                                        {isComment ? 'New Comment' : item.action_type?.replace(/_/g, ' ')}
                                                        <span className="material-symbols-outlined text-[10px] text-slate-400 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                                                        {isComment ? item.comment : item.description}
                                                    </p>
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                                                    {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <div className="mt-2 pl-2 border-l-2 border-slate-100 dark:border-slate-800">
                                                    {/* User Info */}
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="size-5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                                            {item.avatar_url ? (
                                                                <img src={item.avatar_url} alt="" className="size-full object-cover" />
                                                            ) : (
                                                                <span className="material-symbols-outlined text-[10px] text-slate-400 flex items-center justify-center size-full">person</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                                            {item.user_name || 'System'}
                                                        </span>
                                                        {item.user_role && (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-wider">
                                                                {item.user_role.replace(/_/g, ' ')}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Full Content */}
                                                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                                                        {isComment ? item.comment : item.description}
                                                        {item.metadata?.reason && (
                                                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                                                <span className="font-bold text-xs uppercase tracking-wider text-slate-400 block mb-1">Legacy Reason</span>
                                                                {item.metadata.reason}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ActivityTimeline;
