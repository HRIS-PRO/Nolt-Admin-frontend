import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { isAgentRole, isSuperAdminRole } from '../../lib/staff-roles';

type SummaryData = {
    investment_count: number;
    total_commission: number;
    total_investment_amount: number;
    weighted_avg_commission_percent: number;
};

const AgentCommissionSummaryPanel: React.FC<{
    user: { id?: number; role?: string };
}> = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canLoad =
        isSuperAdminRole(user.role) || isAgentRole(user.role);

    useEffect(() => {
        if (!canLoad) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get('/api/staff/agent-commissions/summary', {
                    withCredentials: true,
                });
                if (!cancelled && res.data?.success) {
                    setSummary(res.data.data);
                }
            } catch (err: any) {
                if (!cancelled) {
                    setError(err.response?.data?.message || 'Could not load commission summary.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [canLoad, user.id]);

    if (!canLoad) {
        return null;
    }

    if (loading) {
        return (
            <div className="mb-6 p-6 rounded-[24px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 animate-pulse h-28" />
        );
    }

    if (error || !summary) {
        return null;
    }

    return (
        <div className="mb-6 p-6 rounded-[24px] bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
            <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-indigo-500">paid</span>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
                    Agent referral commission
                </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Attributed apps</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{summary.investment_count}</p>
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total commission</p>
                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                        ₦{Number(summary.total_commission).toLocaleString()}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Investment volume</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                        ₦{Number(summary.total_investment_amount).toLocaleString()}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Avg rate</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                        {summary.weighted_avg_commission_percent}%
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AgentCommissionSummaryPanel;
