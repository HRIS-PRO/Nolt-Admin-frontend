import React, { useState, useEffect } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import axios from 'axios';

interface ReportsPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const ReportsPage: React.FC<ReportsPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const [reports, setReports] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchReports = async () => {
        setIsLoading(true);
        try {
            const params: any = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const response = await axios.get('/api/staff/reports', {
                params,
                withCredentials: true
            });
            setReports(response.data);
        } catch (error) {
            console.error("Failed to fetch reports", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []); // Initial load

    const handleExport = () => {
        if (!reports || reports.length === 0) {
            alert("No data to export");
            return;
        }

        const headers = [
            "Applicant Name",
            "Institution/Ministry",
            "Approved Amount",
            "Net Salary",
            "Account No",
            "Bank",
            "Tenure",
            "Product",
            "Branch",
            "Account Officer",
            "Loan Type",
            "IPPIS No",
            "Staff ID",
            "Phone No",
            "Status",
            "Date"
        ];

        const csvContent = [
            headers.join(","),
            ...reports.map(r => {
                const row = [
                    `"${r.applicant_full_name || ''}"`,
                    `"${r.mda_tertiary || ''}"`,
                    `${r.eligible_amount || r.requested_loan_amount || 0}`,
                    `${r.average_monthly_income || 0}`,
                    `"${r.account_number || ''}"`,
                    `"${r.bank_name || ''}"`,
                    `${r.loan_tenure_months || 0}`,
                    `"${r.product_type || ''}"`,
                    `""`, // Branch (Empty)
                    `"${r.officer_name || ''}"`,
                    `"${r.loan_type || ''}"`,
                    `"${r.ippis_number || ''}"`,
                    `"${r.staff_id || ''}"`,
                    `"${r.mobile_number || ''}"`,
                    `"${r.status || r.stage || ''}"`,
                    `"${new Date(r.created_at).toLocaleDateString()}"`
                ];
                return row.join(",");
            })
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `loan_reports_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Loan Reports</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Export approved and rejected loan data.</p>
                </div>
                <button
                    onClick={handleExport}
                    className="px-6 py-3 rounded-xl bg-green-600 text-white font-bold uppercase tracking-wider hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">download</span>
                    Export to Excel
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-[#1e293b] p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm"
                        >
                            <option value="all">All Reports</option>
                            <option value="approved">Approved / Disbursed</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm"
                        />
                    </div>
                    <button
                        onClick={fetchReports}
                        className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold uppercase tracking-wider hover:bg-blue-700 transition-all"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-[#1e293b] rounded-[24px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[1200px]">
                        <thead className="bg-slate-50/50 dark:bg-[#0f172a]/30 text-[10px] uppercase text-slate-500 font-black tracking-wider">
                            <tr>
                                <th className="p-4">Applicant</th>
                                <th className="p-4">Institution</th>
                                <th className="p-4">Amount</th>
                                <th className="p-4">Net Salary</th>
                                <th className="p-4">Bank</th>
                                <th className="p-4">Tenure</th>
                                <th className="p-4">Officer</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-slate-400">Loading reports...</td>
                                </tr>
                            ) : reports.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-slate-400">No data found for selected filters.</td>
                                </tr>
                            ) : (
                                reports.map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 font-bold text-slate-900 dark:text-white">{r.applicant_full_name}</td>
                                        <td className="p-4 max-w-[200px] truncate" title={r.mda_tertiary}>{r.mda_tertiary}</td>
                                        <td className="p-4">₦{Number(r.eligible_amount || r.requested_loan_amount).toLocaleString()}</td>
                                        <td className="p-4">₦{Number(r.average_monthly_income).toLocaleString()}</td>
                                        <td className="p-4">
                                            <div>{r.bank_name}</div>
                                            <div className="font-mono text-[10px] text-slate-400">{r.account_number}</div>
                                        </td>
                                        <td className="p-4">{r.loan_tenure_months} M</td>
                                        <td className="p-4">{r.officer_name || '-'}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded border text-[10px] font-black uppercase tracking-wider 
                                                ${(r.status === 'approved' || r.stage === 'disbursed')
                                                    ? 'border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-500'
                                                    : 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-500'}`
                                            }>
                                                {r.status || r.stage}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
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

export default ReportsPage;
