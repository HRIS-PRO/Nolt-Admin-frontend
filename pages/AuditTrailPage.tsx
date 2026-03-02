import React, { useEffect, useState } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import ActivityTimeline from '../components/ActivityTimeline';
import { getStatusStyles } from '../utils/statusStyles';

interface AuditTrailPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const AuditTrailPage: React.FC<AuditTrailPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const searchQuery = searchParams.get('search') || '';
    const [loans, setLoans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

    // Fetch all loans
    useEffect(() => {
        const fetchLoans = async () => {
            try {
                const response = await axios.get(`${''}/api/staff/loans`, { withCredentials: true });
                if (response.data && Array.isArray(response.data.loans)) {
                    setLoans(response.data.loans);
                } else if (Array.isArray(response.data)) {
                    setLoans(response.data);
                } else {
                    setLoans([]);
                }
            } catch (error) {
                console.error("Failed to fetch loans", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLoans();
    }, []);

    // Filter Logic
    const filteredLoans = loans.filter(loan => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            loan.applicant_full_name?.toLowerCase().includes(query) ||
            String(loan.id).includes(query) ||
            loan.status?.toLowerCase().includes(query)
        );
    });

    if (user.role !== 'super_admin') {
        return (
            <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <div className="size-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-4xl text-slate-400">lock</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Restricted Access</h2>
                    <p className="text-slate-500 max-w-md">You do not have permission to view the audit trail. This section is reserved for Super Administrators.</p>
                </div>
            </StaffLayout>
        );
    }

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    Audit Trail
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                    Detailed system logs and activity history per loan application.
                </p>
            </div>

            <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a]/50">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white">All Transactions</h3>
                    <p className="text-slate-500 text-xs font-medium">Select a transaction to view detailed logs.</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-50/50 dark:bg-[#0f172a]/30 text-xs uppercase text-slate-500 font-black tracking-wider">
                            <tr>
                                <th className="p-4 w-4"></th>
                                <th className="p-4">Reference</th>
                                <th className="p-4">Applicant</th>
                                <th className="p-4">Amount</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Date</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                            {isLoading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Loading audit data...</td></tr>
                            ) : filteredLoans.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-slate-500">No records found.</td></tr>
                            ) : (
                                filteredLoans.map((loan) => (
                                    <tr
                                        key={loan.id}
                                        onClick={() => setSelectedLoanId(String(loan.id))}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="p-4"><div className="size-2 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-500 transition-colors"></div></td>
                                        <td className="p-4 font-mono text-xs text-slate-500 dark:text-slate-400 font-bold">LOAN-{loan.id}</td>
                                        <td className="p-4 font-bold text-slate-900 dark:text-white">{loan.applicant_full_name}</td>
                                        <td className="p-4 font-mono text-slate-600 dark:text-slate-300">₦{Number(loan.requested_loan_amount).toLocaleString()}</td>
                                        <td className="p-4">
                                            {(() => {
                                                const styles = getStatusStyles(loan.status);
                                                return (
                                                    <span className={`px-2 py-1 rounded border text-[10px] font-black uppercase tracking-wider ${styles.container}`}>
                                                        {loan.status}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="p-4 text-xs text-slate-500">{new Date(loan.created_at).toLocaleDateString()}</td>
                                        <td className="p-4 text-right">
                                            <button className="text-blue-500 hover:text-blue-600 text-xs font-bold uppercase tracking-wider flex items-center gap-1 ml-auto">
                                                <span className="material-symbols-outlined text-sm">visibility</span>
                                                View Logs
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Audit Log Modal */}
            {selectedLoanId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedLoanId(null)}>
                    <div
                        className="bg-white dark:bg-[#0f172a] w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#0f172a] z-10">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">Audit Logs</h2>
                                <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">Transaction ID: LOAN-{selectedLoanId}</p>
                            </div>
                            <button
                                onClick={() => setSelectedLoanId(null)}
                                className="size-8 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                            >
                                <span className="material-symbols-outlined text-slate-400">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-[#0f172a]/50">
                            <ActivityTimeline loanId={selectedLoanId} defaultOpen={true} />
                        </div>
                    </div>
                </div>
            )}
        </StaffLayout>
    );
};

export default AuditTrailPage;
