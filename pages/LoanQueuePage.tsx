import React, { useEffect, useState } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface LoanQueuePageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const LoanQueuePage: React.FC<LoanQueuePageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const navigate = useNavigate();
    const [loans, setLoans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLoans = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/staff/loans/pending`, { withCredentials: true });
                setLoans(response.data);
            } catch (error) {
                console.error("Failed to fetch pending loans", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLoans();
    }, []);

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        Loan
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Comprehensive management of historical and ongoing loan transactions.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 rounded-lg bg-white dark:bg-[#1e293b] text-blue-500 dark:text-blue-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <span className="material-symbols-outlined text-sm">filter_list</span>
                        Filter
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20">
                        <span className="material-symbols-outlined text-sm">add</span>
                        New Application
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0f172a]/50">
                    <div>
                        <h3 className="font-black text-lg text-slate-900 dark:text-white">Pending Applications</h3>
                        <p className="text-slate-500 text-xs font-medium"> Total: {loans.length} applications</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 dark:bg-[#0f172a]/30 text-xs uppercase text-slate-500 font-black tracking-wider">
                            <tr>
                                <th className="p-4 w-4"><div className="size-4 rounded border border-slate-300 dark:border-slate-700"></div></th>
                                <th className="p-4">Reference ID</th>
                                <th className="p-4">Applicant</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Stage</th>
                                <th className="p-4">Sales Officer</th>
                                <th className="p-4">Amount</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={10} className="p-8 text-center text-slate-500">Loading...</td>
                                </tr>
                            ) : loans.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="p-8 text-center text-slate-500 font-medium">
                                        No pending loans found.
                                    </td>
                                </tr>
                            ) : (
                                loans.map((loan, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="p-4"><div className="size-4 rounded border border-slate-300 dark:border-slate-700 group-hover:border-slate-500"></div></td>
                                        <td className="p-4 font-mono text-slate-500 dark:text-slate-400 text-xs text-nowrap">LOAN-{loan.id}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 shrink-0">
                                                    {loan.applicant_full_name ? loan.applicant_full_name[0] : '?'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-xs">{loan.applicant_full_name}</p>
                                                    <p className="text-[10px] text-slate-500">{loan.officer_email || 'No Email'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded border text-[10px] font-black uppercase tracking-wider border-blue-500/20 bg-blue-500/10 text-blue-500 dark:text-blue-400`}>
                                                LOAN
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded border border-orange-500/20 text-[10px] font-black uppercase text-orange-500 dark:text-orange-400 tracking-wider text-nowrap">
                                                {loan.stage || 'Onboarding'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-700 dark:text-slate-300 font-bold text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm text-slate-400 dark:text-slate-500">person</span>
                                                {loan.officer_name || 'Unassigned'}
                                            </div>
                                        </td>
                                        <td className="p-4 font-black text-slate-900 dark:text-white">₦{Number(loan.requested_loan_amount).toLocaleString()}</td>
                                        <td className="p-4 text-slate-500 text-xs">{new Date(loan.created_at).toLocaleDateString()}</td>
                                        <td className="p-4">
                                            <div className={`flex items-center gap-2 px-2 py-1 rounded border w-fit text-[10px] font-bold uppercase tracking-widest border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-500`}>
                                                <span className={`size-1.5 rounded-full bg-amber-500`}></span>
                                                {loan.status}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => navigate(`/staff/loans/${loan.id}`)}
                                                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all">
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination (Placeholder) */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                    <p>Showing 1-{Math.max(1, loans.length)} of {loans.length}</p>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50" disabled>Previous</button>
                        <button className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50" disabled>Next</button>
                    </div>
                </div>
            </div>
        </StaffLayout>
    );
};

export default LoanQueuePage;
