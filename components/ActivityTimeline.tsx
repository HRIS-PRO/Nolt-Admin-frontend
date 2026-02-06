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
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ loanId }) => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivities = async () => {
            if (!loanId) return;
            try {
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/staff/loans/${loanId}/activities`, { withCredentials: true });
                setActivities(response.data);
            } catch (error) {
                console.error("Failed to fetch activities:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchActivities();
        // Poll every 30 seconds for live updates
        const interval = setInterval(fetchActivities, 30000);
        return () => clearInterval(interval);
    }, [loanId]);

    if (loading && activities.length === 0) {
        return (
            <div className="bg-white dark:bg-[#1e293b] rounded-[24px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
                <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
                <div className="space-y-4">
                    <div className="h-12 bg-slate-50 dark:bg-slate-800 rounded-xl"></div>
                    <div className="h-12 bg-slate-50 dark:bg-slate-800 rounded-xl"></div>
                </div>
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="bg-white dark:bg-[#1e293b] rounded-[24px] p-8 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <span className="material-symbols-outlined">history</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white">No Activity Yet</p>
                <p className="text-xs text-slate-500">Actions taken on this loan will appear here.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#1e293b] rounded-[24px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                <div className="size-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <span className="material-symbols-outlined text-lg">history</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Timeline</h3>
            </div>

            <div className="relative pl-4 border-l-2 border-slate-100 dark:border-slate-800 space-y-8">
                {activities.map((activity, idx) => {
                    const isReject = activity.action_type === 'reject';
                    const isApprove = activity.action_type === 'approve';
                    const isReturn = activity.action_type === 'return';

                    let icon = 'edit';
                    let colorClass = 'bg-slate-100 text-slate-500';

                    if (isReject) { icon = 'cancel'; colorClass = 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'; }
                    else if (isApprove) { icon = 'check_circle'; colorClass = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'; }
                    else if (isReturn) { icon = 'undo'; colorClass = 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'; }
                    else if (activity.action_type === 'submitted') { icon = 'send'; colorClass = 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'; }

                    return (
                        <div key={activity.id} className="relative">
                            {/* Dot */}
                            <div className={`absolute -left-[21px] top-0 size-3 rounded-full border-2 border-white dark:border-[#1e293b] ${isReject ? 'bg-red-500' : isApprove ? 'bg-emerald-500' : isReturn ? 'bg-orange-500' : 'bg-slate-400'}`}></div>

                            <div className="flex flex-col gap-2">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white capitalize leading-tight">
                                            {activity.action_type.replace(/_/g, ' ')}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            {activity.description}
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                                        {new Date(activity.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 mt-2">
                                    <div className="size-6 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                                        {activity.avatar_url ? (
                                            <img src={activity.avatar_url} alt="" className="size-full object-cover" />
                                        ) : (
                                            <span className="material-symbols-outlined text-[10px] text-slate-400 flex items-center justify-center size-full">person</span>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                        {activity.user_name || 'System'}
                                    </span>
                                    {activity.user_role && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-wider">
                                            {activity.user_role.replace(/_/g, ' ')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ActivityTimeline;
