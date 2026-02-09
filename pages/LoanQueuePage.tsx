import React, { useEffect, useState } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import StaffLoanForm from '../components/StaffLoanForm';

interface LoanQueuePageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const LoanQueuePage: React.FC<LoanQueuePageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const searchQuery = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || '';
    const stageFilter = searchParams.get('stage') || '';
    const currentPage = parseInt(searchParams.get('page') || '1', 10);
    const itemsPerPage = 10;

    const [loans, setLoans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);


    const fetchLoans = async () => {
        try {
            const response = await axios.get(`${''}/api/staff/loans`, { withCredentials: true });
            setLoans(response.data);
        } catch (error) {
            console.error("Failed to fetch loans", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLoans();
    }, []);

    const filteredLoans = loans.filter(loan => {
        const matchesSearch = !searchQuery || (
            loan.applicant_full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            String(loan.id).includes(searchQuery.toLowerCase()) ||
            (loan.officer_name && loan.officer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (loan.officer_email && loan.officer_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (loan.status && loan.status.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        const matchesStatus = !statusFilter || loan.status === statusFilter;
        const matchesStage = !stageFilter || loan.stage === stageFilter;

        return matchesSearch && matchesStatus && matchesStage;
    });

    const handleFilterChange = (key: string, value: string) => {
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            if (value) {
                newParams.set(key, value);
                newParams.set('page', '1'); // Reset to page 1 on filter change
            } else {
                newParams.delete(key);
            }
            return newParams;
        });
    };

    const handlePageChange = (newPage: number) => {
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.set('page', newPage.toString());
            return newParams;
        });
    };

    const getInitials = (str: string) => {
        if (!str) return 'PSL'; // Default fallback
        return str.split(' ')
            .filter(word => word.length > 0)
            .map(word => word[0].toUpperCase())
            .join('');
    };

    const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);
    const paginatedLoans = filteredLoans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            {/* ... (previous code remains same) ... */}

            <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0f172a]/50">
                    <div>
                        <h3 className="font-black text-lg text-slate-900 dark:text-white">All Applications</h3>
                        <p className="text-slate-500 text-xs font-medium"> Total: {filteredLoans.length} applications</p>
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
                            ) : filteredLoans.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="p-8 text-center text-slate-500 font-medium">
                                        No loans found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedLoans.map((loan, i) => (
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
                                                    <p className="text-[10px] text-slate-500">{loan.officer_email || 'No Email'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded border text-[10px] font-black uppercase tracking-wider border-blue-500/20 bg-blue-500/10 text-blue-500 dark:text-blue-400`} title={loan.product_type || 'Public Sector Loan'}>
                                                {getInitials(loan.product_type || 'Public Sector Loan')}
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

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <p className="text-xs text-slate-500 font-bold">
                            Showing page {currentPage} of {totalPages} ({filteredLoans.length} total applications)
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => handlePageChange(currentPage - 1)}
                                className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-all flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                                Previous
                            </button>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => handlePageChange(currentPage + 1)}
                                className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-all flex items-center gap-1"
                            >
                                Next
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isCreateModalOpen && (
                <StaffLoanForm
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        fetchLoans();
                        setIsCreateModalOpen(false);
                    }}
                />
            )}
        </StaffLayout>
    );
};

export default LoanQueuePage;
