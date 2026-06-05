import React, { useEffect, useState } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import NewLoanApplicationFlow from '../components/NewLoanApplicationFlow';
import { getStatusStyles } from '../utils/statusStyles';
import { formatDate } from '../utils/dateFormatter';
import { motion, AnimatePresence } from 'motion/react';

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
    const officerFilter = searchParams.get('officer') || '';
    const currentPage = parseInt(searchParams.get('page') || '1', 10);
    const itemsPerPage = 10;

    const [loans, setLoans] = useState<any[]>([]);
    const [officers, setOfficers] = useState<any[]>([]);
    const [totalLoans, setTotalLoans] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedLoans, setSelectedLoans] = useState<number[]>([]);
    const [isBulkApproving, setIsBulkApproving] = useState(false);
    const [glAccounts, setGlAccounts] = useState<any[]>([]);
    const [bulkGL, setBulkGL] = useState('');


    const fetchLoans = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${''}/api/staff/loans`, {
                params: {
                    search: searchQuery,
                    status: statusFilter,
                    stage: stageFilter,
                    officer: officerFilter,
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
        if (['sales_manager', 'admin', 'super_admin', 'superadmin', 'customer_experience', 'marketing'].includes(user.role || '')) {
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
                loanIds: selectedLoans,
                gl_account: bulkGL || null
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
    }, [user.role, searchQuery, statusFilter, stageFilter, officerFilter, currentPage]);

    // Fetch GL accounts when finance stage is filtered
    useEffect(() => {
        if (stageFilter === 'finance') {
            axios.get('/api/gl-accounts', { withCredentials: true })
                .then(res => {
                    if (res.data.success) {
                        setGlAccounts(res.data.data.filter((gl: any) => gl.status === 'Active'));
                    }
                })
                .catch(err => console.error('Failed to fetch GL accounts:', err));
        }
    }, [stageFilter]);

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
        if (!str) return 'PSL';
        return str.split(' ')
            .filter(word => word.length > 0)
            .map(word => word[0].toUpperCase())
            .join('');
    };

    const stats = [
        { label: 'Total Volume', value: `₦${Number(loans.reduce((acc, curr) => acc + (Number(curr.requested_loan_amount) || 0), 0)).toLocaleString()}`, icon: 'payments', color: 'blue' },
        { label: 'Pending Review', value: loans.filter(l => l.status === 'pending').length, icon: 'pending_actions', color: 'orange' },
        { label: 'Approved Today', value: loans.filter(l => l.status === 'approved' && formatDate(l.updated_at) === formatDate(new Date().toISOString())).length, icon: 'verified', color: 'emerald' },
        { label: 'Disbursed', value: loans.filter(l => l.status === 'disbursed').length, icon: 'account_balance_wallet', color: 'purple' },
    ];

    const STAGE_ORDER = ['onboarding', 'sales', 'customer_experience', 'credit_check_1', 'credit_check_2', 'internal_audit', 'finance', 'disbursed'];

    const getStageProgress = (stage: string) => {
        const index = STAGE_ORDER.indexOf(stage);
        if (index === -1) return 0;
        return ((index + 1) / STAGE_ORDER.length) * 100;
    };

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-[1600px] mx-auto"
            >
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                            Loan Queue
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                            Operational control center for lending pipeline and risk management.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {(user.role === 'sales_officer' || user.role === 'admin' || user.role === 'super_admin') && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-6 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/25"
                            >
                                <span className="material-symbols-outlined text-lg">add</span>
                                New Application
                            </motion.button>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white dark:bg-slate-800/50 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className={`size-12 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center mb-4`}>
                                <span className={`material-symbols-outlined text-${stat.color}-500`}>{stat.icon}</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
                            <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stat.value}</h4>
                        </motion.div>
                    ))}
                </div>

                {/* Filter Bar */}
                <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-4 rounded-3xl border border-slate-200 dark:border-slate-800 mb-6 flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[200px] relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Search by name, ID or phone..."
                            value={searchQuery}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div className="flex gap-2 items-center">
                        <select
                            value={statusFilter}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase border border-slate-200 dark:border-slate-700 outline-none cursor-pointer hover:border-blue-500 transition-colors"
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
                            className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase border border-slate-200 dark:border-slate-700 outline-none cursor-pointer hover:border-blue-500 transition-colors"
                        >
                            <option value="">All Stages</option>
                            <option value="sales">Sales</option>
                            <option value="customer_experience">Customer Experience</option>
                            <option value="credit_check_1">Credit Check 1</option>
                            <option value="credit_check_2">Credit Check 2</option>
                            <option value="internal_audit">Internal Audit</option>
                            <option value="finance">Finance</option>
                            <option value="disbursed">Disbursed</option>
                        </select>

                        <select
                            value={officerFilter}
                            onChange={(e) => handleFilterChange('officer', e.target.value)}
                            className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase border border-slate-200 dark:border-slate-700 outline-none cursor-pointer hover:border-blue-500 transition-colors"
                        >
                            <option value="">All Officers</option>
                            <option value="unassigned">Unassigned</option>
                            {officers.map(officer => (
                                <option key={officer.id} value={officer.id}>{officer.full_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

            {/* Bulk Action Bar */}
            {selectedLoans.length > 0 && stageFilter === 'finance' && ['finance', 'admin', 'super_admin', 'superadmin'].includes(user.role || '') && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedLoans.length} selected</span>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
                    <div className="relative">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${
                            bulkGL 
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700' 
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                        }`}>
                            <span className="material-symbols-outlined text-sm text-slate-400">account_balance</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
                                {bulkGL ? glAccounts.find((g: any) => g.code === bulkGL)?.name || bulkGL : 'No GL Account'}
                            </span>
                            <span className="material-symbols-outlined text-xs text-slate-400">expand_more</span>
                        </div>
                        <select
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            value={bulkGL}
                            onChange={(e) => setBulkGL(e.target.value)}
                        >
                            <option value="">No GL Account</option>
                            {glAccounts.map((gl: any) => (
                                <option key={gl.id} value={gl.code}>{gl.code} — {gl.name}</option>
                            ))}
                        </select>
                    </div>
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

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-none">
                    <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <div>
                            <h3 className="font-black text-xl text-slate-900 dark:text-white">Active Pipeline</h3>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Found {totalLoans} total records</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                                {officers.slice(0, 4).map((o, i) => (
                                    <div key={i} className="size-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                                        {o.full_name[0]}
                                    </div>
                                ))}
                                {officers.length > 4 && (
                                    <div className="size-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                        +{officers.length - 4}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] uppercase text-slate-400 font-black tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                                    <th className="p-6 w-4">
                                        <div
                                            onClick={handleSelectAll}
                                            className={`size-5 rounded-lg border-2 cursor-pointer flex items-center justify-center transition-all ${selectedLoans.length > 0 && selectedLoans.length === filteredLoans.length
                                                ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/30'
                                                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
                                                }`}
                                        >
                                            {selectedLoans.length > 0 && selectedLoans.length === filteredLoans.length && <span className="material-symbols-outlined text-xs text-white font-black">check</span>}
                                        </div>
                                    </th>
                                    <th className="p-6">Applicant</th>
                                    <th className="p-6">Loan Detail</th>
                                    <th className="p-6">Stage & Progress</th>
                                    <th className="p-6">Ownership</th>
                                    <th className="p-6">Financials</th>

                                    <th className="p-6 text-center">Indemnity</th>
                                    <th className="p-6 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                <AnimatePresence mode="popLayout">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={8} className="p-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="size-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Synchronizing...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredLoans.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-20 text-center">
                                                <div className="flex flex-col items-center gap-4 opacity-50">
                                                    <span className="material-symbols-outlined text-6xl">cloud_off</span>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No records matching your search</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLoans.map((loan, i) => (
                                            <motion.tr
                                                key={loan.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                onClick={() => navigate(`/staff/loans/${loan.id}`)}
                                                className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all group cursor-pointer ${selectedLoans.includes(loan.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                            >
                                                <td className="p-6" onClick={(e) => e.stopPropagation()}>
                                                    <div
                                                        onClick={() => handleToggleSelection(loan.id)}
                                                        className={`size-5 rounded-lg border-2 cursor-pointer flex items-center justify-center transition-all ${selectedLoans.includes(loan.id)
                                                            ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/30'
                                                            : 'border-slate-200 dark:border-slate-700 group-hover:border-slate-400'
                                                            }`}
                                                    >
                                                        {selectedLoans.includes(loan.id) && <span className="material-symbols-outlined text-xs text-white font-black">check</span>}
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="size-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-lg font-black text-slate-700 dark:text-white border border-white dark:border-slate-600 shadow-inner group-hover:scale-110 transition-transform">
                                                            {loan.applicant_full_name ? loan.applicant_full_name[0] : '?'}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900 dark:text-white text-sm leading-tight">{loan.applicant_full_name}</p>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                <span className="text-[10px] font-mono text-slate-400">#LOAN-{loan.id}</span>
                                                                <span className="size-1 rounded-full bg-slate-300"></span>
                                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{formatDate(loan.created_at)}</span>
                                                                {loan.casa && (
                                                                    <>
                                                                        <span className="size-1 rounded-full bg-slate-300"></span>
                                                                        <span className="text-[10px] font-mono text-blue-500">CASA: {loan.casa}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="space-y-2">
                                                        <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider border border-blue-500/20">
                                                            {loan.product_type || 'Public Sector'}
                                                        </span>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{loan.loan_type ? loan.loan_type.replace('_', ' ') : 'New Application'}</p>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="w-40">
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">{loan.stage?.replace('_', ' ') || 'Onboarding'}</span>
                                                            <span className="text-[10px] font-bold text-slate-400">{Math.round(getStageProgress(loan.stage || 'onboarding'))}%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700/50">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${getStageProgress(loan.stage || 'onboarding')}%` }}
                                                                className={`h-full rounded-full ${loan.status === 'rejected' ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]'}`}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6" onClick={(e) => e.stopPropagation()}>
                                                    {['sales_manager', 'admin', 'super_admin', 'superadmin', 'customer_experience'].includes(user.role || '') ? (
                                                        <div className="relative group/assign w-fit">
                                                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors">
                                                                <span className="material-symbols-outlined text-sm text-slate-400">shield_person</span>
                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{loan.officer_name || 'Unassigned'}</span>
                                                                <span className="material-symbols-outlined text-xs text-slate-400">expand_more</span>
                                                            </div>
                                                            <select
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                value={loan.sales_officer_id || ''}
                                                                onChange={(e) => handleAssignOfficer(loan.id, e.target.value)}
                                                            >
                                                                <option value="" disabled>Reassign Officer</option>
                                                                {officers.map(officer => (
                                                                    <option key={officer.id} value={officer.id}>{officer.full_name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                                                            <span className="material-symbols-outlined text-sm">person</span>
                                                            {loan.officer_name || 'System Generated'}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-6">
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-black text-slate-900 dark:text-white">
                                                            ₦{Number(
                                                                ['topup', 'add_on', 'add-on', 're-app', 're_app'].includes(loan.loan_type?.toLowerCase()) ? loan.topup_amount :
                                                                    loan.loan_type === 'buy_over' ? loan.buy_over_amount :
                                                                        loan.requested_loan_amount
                                                            ).toLocaleString()}
                                                        </p>
                                                        {loan.disbursement_amount && (
                                                            <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[10px]">payments</span>
                                                                Disbursed: ₦{Number(loan.disbursement_amount).toLocaleString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="p-6">
                                                    <div className="flex justify-center">
                                                        {loan.indemnity_document_url ? (
                                                            <div className="size-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20" title="Indemnity Signed">
                                                                <span className="material-symbols-outlined text-lg">verified</span>
                                                            </div>
                                                        ) : (
                                                            <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center border border-slate-200 dark:border-slate-700" title="Signature Pending">
                                                                <span className="material-symbols-outlined text-lg">history_edu</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-6 text-right">
                                                    {(() => {
                                                        const styles = getStatusStyles(loan.status);
                                                        return (
                                                            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.1em] ${styles.container}`}>
                                                                <span className={`size-2 rounded-full ${styles.dot} animate-pulse`}></span>
                                                                {loan.status}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-8 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="text-slate-500 dark:text-slate-400 text-sm font-bold">
                            Showing <span className="text-slate-900 dark:text-white">{loans.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalLoans)}</span> of <span className="text-slate-900 dark:text-white">{totalLoans}</span> applications
                        </div>

                        <div className="flex items-center gap-3">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                disabled={currentPage === 1}
                                onClick={() => setSearchParams(prev => {
                                    const newParams = new URLSearchParams(prev);
                                    newParams.set('page', String(Math.max(1, currentPage - 1)));
                                    return newParams;
                                })}
                                className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed font-black text-[10px] uppercase tracking-[0.2em] transition-all"
                            >
                                Previous
                            </motion.button>

                            <div className="flex items-center gap-2 hidden md:flex">
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
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-all
                                                ${currentPage === p
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110'
                                                    : 'text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                disabled={currentPage * itemsPerPage >= totalLoans}
                                onClick={() => setSearchParams(prev => {
                                    const newParams = new URLSearchParams(prev);
                                    newParams.set('page', String(currentPage + 1));
                                    return newParams;
                                })}
                                className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed font-black text-[10px] uppercase tracking-[0.2em] transition-all"
                            >
                                Next
                            </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>

            {isCreateModalOpen && (
                <NewLoanApplicationFlow
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        fetchLoans();
                        setIsCreateModalOpen(false);
                    }}
                    user={user}
                />
            )}
        </StaffLayout>
    );
};

export default LoanQueuePage;
