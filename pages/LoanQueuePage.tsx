import React, { useEffect, useState } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import StaffLoanForm from '../components/StaffLoanForm';
import { getStatusStyles } from '../utils/statusStyles';

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
    const [officers, setOfficers] = useState<any[]>([]);
    const [totalLoans, setTotalLoans] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedLoans, setSelectedLoans] = useState<number[]>([]);
    const [isBulkApproving, setIsBulkApproving] = useState(false);


    const fetchLoans = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${''}/api/staff/loans`, {
                params: {
                    search: searchQuery,
                    status: statusFilter,
                    stage: stageFilter,
                    page: currentPage,
                    limit: itemsPerPage
                },
                withCredentials: true
            });
            setLoans(response.data.loans);
            setTotalLoans(response.data.total);
        } catch (error) {
            console.error("Failed to fetch loans", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchOfficers = async () => {
        if (['sales_manager', 'admin', 'super_admin', 'superadmin'].includes(user.role || '')) {
            try {
                // Fetch specifically sales officers with a high limit to ensure we get them all
                const response = await axios.get(`${''}/api/staff/users?role=sales_officer&limit=200`, { withCredentials: true });
                setOfficers(response.data.users.filter((u: any) => u.is_active));
            } catch (error) {
                console.error("Failed to fetch officers", error);
            }
        }
    };

    const handleToggleSelection = (id: number) => {
        setSelectedLoans(prev =>
            prev.includes(id) ? prev.filter(loanId => loanId !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedLoans.length === filteredLoans.length) {
            setSelectedLoans([]);
        } else {
            setSelectedLoans(filteredLoans.map(l => l.id));
        }
    };


    // console.log(loans)

    const handleBulkApprove = async () => {
        if (!confirm(`Are you sure you want to approve ${selectedLoans.length} loans? This will move them to Disbursed stage.`)) return;

        setIsBulkApproving(true);
        try {
            const response = await axios.post(`${''}/api/staff/loans/bulk-approve`, {
                loanIds: selectedLoans
            }, { withCredentials: true });

            alert(response.data.message);
            setSelectedLoans([]);
            fetchLoans(); // Refresh list
        } catch (error: any) {
            console.error("Bulk approval failed", error);
            alert(error.response?.data?.message || "Bulk approval failed");
        } finally {
            setIsBulkApproving(false);
        }
    };

    const handleAssignOfficer = async (loanId: string, officerId: string) => {
        if (!confirm("Are you sure you want to reassign this loan?")) return;
        try {
            await axios.patch(`${''}/api/staff/loans/${loanId}/assign`, {
                sales_officer_id: officerId
            }, { withCredentials: true });

            // Optimistic Update
            setLoans(prev => prev.map(l => {
                if (String(l.id) === String(loanId)) { // Ensure ID comparison works
                    const officer = officers.find(o => String(o.id) === String(officerId)); // Ensure ID comparison works
                    return { ...l, sales_officer_id: officerId, officer_name: officer?.full_name, officer_email: officer?.email };
                }
                return l;
            }));
            alert("Loan reassigned successfully");
        } catch (error: any) {
            alert(error.response?.data?.message || "Reassignment failed");
        }
    };

    useEffect(() => {
        fetchLoans();
        fetchOfficers();

        // Socket Listeners
        import('../services/socket').then(({ socket }) => {
            const handleLoanChange = () => {
                console.log("Real-time update received");
                fetchLoans(); // Refresh list on any change
            };

            socket.on('loan_new', handleLoanChange);
            socket.on('loan_updated', handleLoanChange);

            return () => {
                socket.off('loan_new', handleLoanChange);
                socket.off('loan_updated', handleLoanChange);
            };
        });
    }, [user.role, searchQuery, statusFilter, stageFilter, currentPage]);

    // Re-fetch on params change

    // Client-side filtering removed as pagination is server-side now
    const filteredLoans = loans;

    const handleFilterChange = (key: string, value: string) => {
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            if (value) {
                newParams.set(key, value);
            } else {
                newParams.delete(key);
            }
            newParams.set('page', '1'); // Reset to page 1 on filter
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

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        Loan Queue
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Comprehensive management of historical and ongoing loan transactions.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <select
                        value={statusFilter}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-white dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 shadow-sm outline-none cursor-pointer"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="disbursed">Disbursed</option>
                    </select>

                    <select
                        value={stageFilter}
                        onChange={(e) => handleFilterChange('stage', e.target.value)}
                        className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-white dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 shadow-sm outline-none cursor-pointer"
                    >
                        <option value="">All Stages</option>
                        {/* <option value="onboarding">Onboarding</option> */}
                        <option value="sales">Sales</option>
                        <option value="customer_experience">Customer Experience</option>
                        <option value="credit_check_1">Credit Check 1</option>
                        <option value="credit_check_2">Credit Check 2</option>
                        <option value="internal_audit">Internal Audit</option>
                        <option value="finance">Finance</option>
                        <option value="disbursed">Disbursed</option>
                    </select>
                    {(user.role === 'sales_officer' || user.role === 'admin' || user.role === 'super_admin') && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="w-full md:w-auto px-4 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                            New Application
                        </button>
                    )}
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedLoans.length > 0 && stageFilter === 'finance' && ['finance', 'admin', 'super_admin', 'superadmin'].includes(user.role || '') && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedLoans.length} selected</span>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
                    <button
                        onClick={handleBulkApprove}
                        disabled={isBulkApproving}
                        className="text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-colors"
                    >
                        {isBulkApproving ? 'Processing...' : 'Approve Selected'}
                    </button>
                </div>
            )}

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
                                <th className="p-4 w-4">
                                    <div
                                        onClick={handleSelectAll}
                                        className={`size-4 rounded border cursor-pointer flex items-center justify-center transition-colors ${selectedLoans.length > 0 && selectedLoans.length === filteredLoans.length
                                            ? 'bg-blue-500 border-blue-500'
                                            : 'border-slate-300 dark:border-slate-700'
                                            }`}
                                    >
                                        {selectedLoans.length > 0 && selectedLoans.length === filteredLoans.length && <span className="material-symbols-outlined text-[10px] text-white font-bold">check</span>}
                                    </div>
                                </th>
                                <th className="p-4">Reference ID</th>
                                <th className="p-4">Applicant</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Loan Type</th>
                                <th className="p-4">Stage</th>
                                <th className="p-4">Sales Officer</th>
                                <th className="p-4">Amount</th>
                                <th className="p-4">Disbursement</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Status</th>
                                {/* <th className="p-4 text-right">Actions</th> */}
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
                                filteredLoans.map((loan, i) => (
                                    <tr
                                        key={i}
                                        onClick={() => navigate(`/staff/loans/${loan.id}`)}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer ${selectedLoans.includes(loan.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                    >
                                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                            <div
                                                onClick={() => handleToggleSelection(loan.id)}
                                                className={`size-4 rounded border cursor-pointer flex items-center justify-center transition-colors ${selectedLoans.includes(loan.id)
                                                    ? 'bg-blue-500 border-blue-500'
                                                    : 'border-slate-300 dark:border-slate-700 group-hover:border-slate-500'
                                                    }`}
                                            >
                                                {selectedLoans.includes(loan.id) && <span className="material-symbols-outlined text-[10px] text-white font-bold">check</span>}
                                            </div>
                                        </td>
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
                                            <span className="px-2 py-1 rounded border border-purple-500/20 text-[10px] font-black uppercase text-purple-500 dark:text-purple-400 tracking-wider text-nowrap">
                                                {loan.loan_type ? loan.loan_type.replace('_', ' ') : 'New'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded border border-orange-500/20 text-[10px] font-black uppercase text-orange-500 dark:text-orange-400 tracking-wider text-nowrap">
                                                {loan.stage || 'Onboarding'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-700 dark:text-slate-300 font-bold text-xs" onClick={(e) => e.stopPropagation()}>
                                            {['sales_manager', 'admin', 'super_admin', 'superadmin'].includes(user.role || '') ? (
                                                <div className="relative group/assign">
                                                    <div className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                        <span className="material-symbols-outlined text-sm text-slate-400 dark:text-slate-500">person</span>
                                                        <span>{loan.officer_name || 'Unassigned'}</span>
                                                        <span className="material-symbols-outlined text-sm text-slate-400 ml-auto opacity-0 group-hover/assign:opacity-100">edit</span>
                                                    </div>
                                                    <select
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                        value={loan.sales_officer_id || ''}
                                                        onChange={(e) => handleAssignOfficer(loan.id, e.target.value)}
                                                    >
                                                        <option value="" disabled>Select Officer</option>
                                                        {officers.map(officer => (
                                                            <option key={officer.id} value={officer.id}>{officer.full_name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm text-slate-400 dark:text-slate-500">person</span>
                                                    {loan.officer_name || 'Unassigned'}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 font-black text-slate-900 dark:text-white">
                                            ₦{Number(
                                                loan.loan_type === 'topup' || loan.loan_type === 're-app' || loan.loan_type === 'add-on' ? loan.topup_amount :
                                                    loan.loan_type === 'buy_over' ? loan.buy_over_amount :
                                                        loan.requested_loan_amount
                                            ).toLocaleString()}
                                        </td>
                                        <td className="p-4 font-black text-slate-900 dark:text-white">
                                            {loan.disbursement_amount ? `₦${Number(loan.disbursement_amount).toLocaleString()}` : '-'}
                                        </td>
                                        <td className="p-4 text-slate-500 text-xs">{new Date(loan.created_at).toLocaleDateString()}</td>
                                        <td className="p-4">
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
                                        {/* <td className="p-4 text-right">
                                            <button
                                                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all">
                                                View Details
                                            </button>
                                        </td> */}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {/* Pagination Controls */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                        Showing {loans.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalLoans)} of {totalLoans} applications
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setSearchParams(prev => {
                                const newParams = new URLSearchParams(prev);
                                newParams.set('page', String(Math.max(1, currentPage - 1)));
                                return newParams;
                            })}
                            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs uppercase"
                        >
                            Previous
                        </button>

                        <div className="flex items-center gap-1 hidden md:flex">
                            {Array.from({ length: Math.min(5, Math.ceil(totalLoans / itemsPerPage)) }, (_, i) => {
                                let p = i + 1;
                                if (currentPage > 3 && Math.ceil(totalLoans / itemsPerPage) > 5) {
                                    p = currentPage - 2 + i;
                                }
                                if (p > Math.ceil(totalLoans / itemsPerPage)) return null;

                                return (
                                    <button
                                        key={p}
                                        onClick={() => setSearchParams(prev => {
                                            const newParams = new URLSearchParams(prev);
                                            newParams.set('page', String(p));
                                            return newParams;
                                        })}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors
                                            ${currentPage === p
                                                ? 'bg-blue-600 text-white'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            disabled={currentPage * itemsPerPage >= totalLoans}
                            onClick={() => setSearchParams(prev => {
                                const newParams = new URLSearchParams(prev);
                                newParams.set('page', String(currentPage + 1));
                                return newParams;
                            })}
                            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs uppercase"
                        >
                            Next
                        </button>
                    </div>
                </div>
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
