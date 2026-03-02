import React, { useEffect, useState } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import axios from 'axios';
import { getStatusStyles } from '../utils/statusStyles';

interface StaffDashboardProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const StaffDashboard: React.FC<StaffDashboardProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const [stats, setStats] = useState({
        totalLoans: 0,
        totalUsers: 0,
        pendingLoans: 0
    });
    const [loans, setLoans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, loansRes] = await Promise.all([
                    axios.get(`${''}/api/stats/dashboard`, { withCredentials: true }),
                    axios.get(`${''}/api/staff/loans`, { withCredentials: true }) // Fetch ALL loans
                ]);
                setStats(statsRes.data);
                setLoans(loansRes.data.loans || []);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const navigate = (path: string) => {
        window.location.href = path; // Simple navigation
    };

    const getInitials = (str: string) => {
        if (!str) return 'PSL'; // Default fallback
        return str.split(' ')
            .filter(word => word.length > 0)
            .map(word => word[0].toUpperCase())
            .join('');
    };

    const handleExport = () => {
        if (!loans || loans.length === 0) {
            alert("No data to export");
            return;
        }

        const headers = [
            "Reference ID",
            "Applicant Name",
            "Applicant Email",
            "Node/Stage",
            "Sales Officer",
            "Requested Amount",
            "Status",
            "Product Type",
            "Date Applied"
        ];

        const csvContent = [
            headers.join(","),
            ...loans.map(loan => {
                const row = [
                    `LOAN-${loan.id}`,
                    `"${loan.applicant_full_name || ''}"`,
                    `"${loan.applicant_email || ''}"`, // Assuming email might be available, otherwise blank
                    `"${loan.stage || ''}"`,
                    `"${loan.officer_name || 'Unassigned'}"`,
                    `${loan.requested_loan_amount || 0}`,
                    `"${loan.status || ''}"`,
                    `"${loan.product_type || ''}"`,
                    `"${new Date(loan.created_at).toLocaleDateString()}"`
                ];
                return row.join(",");
            })
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `loans_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };



    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <header className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        Welcome back, {user.name.split(' ')[0]}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Overview of financial metrics and system logs for today.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 rounded-lg bg-white dark:bg-[#1e293b] text-blue-500 dark:text-blue-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                        {user.role} View
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">download</span>
                        Export Report
                    </button>
                </div>
            </header>

            {/* AI Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-[1px] shadow-xl shadow-blue-500/10 mb-8">
                <div className="bg-white dark:bg-[#0f172a] rounded-[23px] p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6 relative z-10 text-center md:text-left">
                        <div className="size-14 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/40 shrink-0">
                            <span className="material-symbols-outlined text-white text-3xl">auto_awesome</span>
                        </div>
                        <div>
                            <p className="text-blue-500 dark:text-blue-400 text-xs font-black uppercase tracking-widest mb-1">AI Assistant Intelligence</p>
                            <h3 className="text-slate-900 dark:text-white font-bold text-lg max-w-xl">Need a quick analysis? Let AI summarize the current review queue and identify trends.</h3>
                        </div>
                    </div>
                    <button className="w-full md:w-auto px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm tracking-wide shadow-lg shadow-blue-500/30 transition-all z-10 whitespace-nowrap">
                        GENERATE ANALYSIS
                    </button>

                    {/* Background Decor */}
                    <div className="absolute right-0 top-0 w-96 h-full bg-blue-500/10 blur-3xl rounded-full translate-x-1/2"></div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {[
                    { label: 'Loan Requests', value: `${isLoading ? '...' : stats.totalLoans} Applications`, sub: '₦0.00', change: '+5.0%', icon: 'payments', color: 'text-cyan-500 dark:text-cyan-400', bg: 'bg-white dark:bg-[#1e293b]' },
                    { label: 'Active Users', value: `${isLoading ? '...' : stats.totalUsers} Users`, sub: '', change: '+8.4%', icon: 'group', color: 'text-purple-500 dark:text-purple-400', bg: 'bg-white dark:bg-[#1e293b]' },
                    { label: 'Pending Loans', value: `${isLoading ? '...' : stats.pendingLoans} Pending`, sub: '', change: 'High Priority', changeColor: 'text-amber-500 dark:text-amber-400 border-amber-400/20', icon: 'pending_actions', color: 'text-amber-500 dark:text-amber-400', bg: 'bg-white dark:bg-[#1e293b]' },
                ].map((stat, idx) => (
                    <div key={idx} className={`${stat.bg} p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition-all relative overflow-hidden`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 ${stat.color}`}>
                                <span className="material-symbols-outlined">{stat.icon}</span>
                            </div>
                            <div className={`px-2 py-1 rounded-lg border text-[10px] font-bold ${stat.changeColor ? 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-500' : 'border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-500'}`}>
                                {stat.change} {stat.changeColor ? '' : '↑'}
                            </div>
                        </div>
                        <div>
                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">{stat.label}</p>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{stat.value}</h3>
                            {stat.sub && <p className="text-xs font-bold text-slate-500 mt-1">{stat.sub}</p>}
                        </div>
                        <div className={`absolute -bottom-4 -right-4 size-24 ${stat.color} opacity-5 blur-2xl rounded-full`}></div>
                    </div>
                ))}
            </div>

            {/* Review Queue */}
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0f172a]/50">
                    <div>
                        <h3 className="font-black text-lg text-slate-900 dark:text-white">Review Queue</h3>
                        <p className="text-slate-500 text-xs font-medium">From All Loan Applications.</p>
                    </div>
                    <button className="px-4 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20">
                        View Full Queue
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead className="bg-slate-50/50 dark:bg-[#0f172a]/30 text-xs uppercase text-slate-500 font-black tracking-wider">
                            <tr>
                                <th className="p-4 w-4"><div className="size-4 rounded border border-slate-300 dark:border-slate-700"></div></th>
                                <th className="p-4">Reference ID</th>
                                <th className="p-4">Applicant</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Loan Type</th>
                                <th className="p-4">Stage</th>
                                <th className="p-4">Sales Officer</th>
                                <th className="p-4">Amount</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                            {loans.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-slate-500 font-medium">
                                        No loans found.
                                    </td>
                                </tr>
                            ) : (
                                loans.slice(0, 10).map((loan, i) => (
                                    <tr
                                        key={i}
                                        onClick={() => navigate(`/staff/loans/${loan.id}`)}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                                    >
                                        <td className="p-4"><div className="size-4 rounded border border-slate-300 dark:border-slate-700 group-hover:border-slate-500"></div></td>
                                        <td className="p-4 font-mono text-slate-500 dark:text-slate-400 text-xs text-nowrap">LOAN-{loan.id}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 shrink-0">
                                                    {loan.applicant_full_name ? loan.applicant_full_name[0] : '?'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-xs">{loan.applicant_full_name}</p>
                                                    <p className="text-[10px] text-slate-500">Applied {new Date(loan.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded border text-[10px] font-black uppercase tracking-wider border-blue-500/20 bg-blue-500/10 text-blue-500 dark:text-blue-400`} title={loan.product_type || 'Public Sector Loan'}>
                                                {getInitials(loan.product_type || 'Public Sector Loan')}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                                                {loan.loan_type?.replace('_', ' ') || 'NEW'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded border border-orange-500/20 text-[10px] font-black uppercase text-orange-500 dark:text-orange-400 tracking-wider text-nowrap">
                                                {loan.stage || 'Onboarding'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-2">
                                            {loan.officer_name || 'Unassigned'}
                                        </td>
                                        <td className="p-4 font-black text-slate-900 dark:text-white">
                                            ₦{Number(
                                                loan.loan_type === 'topup' || loan.loan_type === 're-app' || loan.loan_type === 'add-on' ? loan.topup_amount :
                                                    loan.loan_type === 'buy_over' ? loan.buy_over_amount :
                                                        loan.requested_loan_amount
                                            ).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-xs">
                                            {(() => {
                                                const styles = getStatusStyles(loan.status);
                                                return (
                                                    <div className={`flex items-center gap-2 px-2 py-1 rounded border w-fit text-[10px] font-bold uppercase tracking-widest ${styles.container}`}>
                                                        <span className={`size-1.5 rounded-full ${styles.dot}`}></span>
                                                        {loan.status}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </StaffLayout>
    );
};

export default StaffDashboard;
