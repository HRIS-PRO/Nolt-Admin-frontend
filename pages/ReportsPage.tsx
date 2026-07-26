import React, { useState, useEffect } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { formatDate } from '../utils/dateFormatter';

interface ReportsPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const ReportsPage: React.FC<ReportsPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const [reports, setReports] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Active Tab: 'standard' or 'zenith'
    const [reportTab, setReportTab] = useState<'standard' | 'zenith'>('standard');

    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [stageFilter, setStageFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalReports, setTotalReports] = useState(0);

    const fetchReports = async () => {
        setIsLoading(true);
        try {
            const params: any = {
                page: currentPage,
                limit: limit
            };
            if (statusFilter !== 'all') params.status = statusFilter;
            if (stageFilter !== 'all') params.stage = stageFilter;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const response = await axios.get('/api/staff/reports', {
                params,
                withCredentials: true
            });

            // Handle Paginated Response
            if (response.data.reports) {
                setReports(response.data.reports);
                setTotalReports(response.data.total);
            } else {
                setReports(response.data);
                setTotalReports(response.data.length);
            }
        } catch (error) {
            console.error("Failed to fetch reports", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [currentPage, limit]); // Re-fetch on page/limit change

    // Reset to page 1 when filters change
    const applyFilters = () => {
        setCurrentPage(1);
        fetchReports();
    };

    // Helper: Format record for Zenith Bank Payout Report
    const formatZenithRecord = (r: any) => {
        const verifiedName = r.verified_bank_name || r.account_name || r.applicant_full_name || '';

        // 1. TRANSACTION REFERENCE NUMBER: static 'LOAN - ' concatenated with customer verified bank name. NO spaces. Max 30 chars.
        const cleanName = String(verifiedName).replace(/\s+/g, '');
        const transactionRef = `LOAN-${cleanName}`.slice(0, 30);

        // 2. BENEFICIARY NAME: verified bank name. Max 100 characters.
        const beneficiaryName = String(verifiedName).slice(0, 100);

        // 3. PAYMENT AMOUNT: disbursement amount. Format to 2 decimal places with NO commas (12324.00)
        const rawAmount = Number(r.disbursement_amount || r.eligible_amount || r.requested_loan_amount || 0);
        const paymentAmount = rawAmount.toFixed(2);

        // 4. PAYMENT DUE DATE: today's date, DD/MM/YYYY format
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        const paymentDueDate = `${dd}/${mm}/${yyyy}`;

        // 5. BENEFICIARY CODE: customer CASA (preserve starting 0)
        const beneficiaryCode = r.casa !== undefined && r.casa !== null ? String(r.casa) : '';

        // 6. BENEFICIARY ACCOUNT NUMBER: account number provided at verification (preserve starting 0)
        const beneficiaryAccount = r.account_number ? String(r.account_number) : '';

        // 7. BENEFICIARY BANK SORT CODE: bank code from Paystack enquiry endpoint (preserve starting 0)
        let bankSortCode = r.bank_code ? String(r.bank_code) : '';
        if (bankSortCode.length > 0 && bankSortCode.length < 3 && /^\d+$/.test(bankSortCode)) {
            bankSortCode = bankSortCode.padStart(3, '0');
        }

        // 8. DEBIT ACCOUNT NUMBER: static 1224905946 (or linked to selected GL used in disbursement)
        const debitAccount = r.gl_account ? String(r.gl_account) : '1224905946';

        return {
            transactionRef,
            beneficiaryName,
            paymentAmount,
            paymentDueDate,
            beneficiaryCode,
            beneficiaryAccount,
            bankSortCode,
            debitAccount
        };
    };

    // Export Handler for Zenith Bank Report (Excel / CSV)
    const handleExportZenith = async (format: 'xlsx' | 'csv' = 'xlsx') => {
        setIsExporting(true);
        try {
            const params: any = { page: 1, limit: 999999 };
            if (statusFilter !== 'all') params.status = statusFilter;
            if (stageFilter !== 'all') params.stage = stageFilter;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const response = await axios.get('/api/staff/reports', { params, withCredentials: true });
            const allReports = response.data.reports || response.data || [];

            if (!allReports || allReports.length === 0) {
                alert("No data to export for the selected filters");
                return;
            }

            const headers = [
                "TRANSACTION REFERENCE NUMBER",
                "BENEFICIARY NAME",
                "PAYMENT AMOUNT",
                "PAYMENT DUE DATE",
                "BENEFICIARY CODE",
                "BENEFICIARY ACCOUNT NUMBER",
                "BENEFICIARY BANK SORT CODE",
                "DEBIT ACCOUNT NUMBER"
            ];

            const rows = allReports.map((r: any) => formatZenithRecord(r));

            if (format === 'xlsx') {
                const matrix = [
                    headers,
                    ...rows.map(z => [
                        z.transactionRef,
                        z.beneficiaryName,
                        z.paymentAmount,
                        z.paymentDueDate,
                        z.beneficiaryCode,
                        z.beneficiaryAccount,
                        z.bankSortCode,
                        z.debitAccount
                    ])
                ];

                const worksheet = XLSX.utils.aoa_to_sheet(matrix);

                // Ensure cells for codes and account numbers preserve leading zeros as text
                const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
                for (let R = 1; R <= range.e.r; ++R) {
                    [4, 5, 6, 7].forEach(C => {
                        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
                        if (worksheet[cellAddr]) {
                            worksheet[cellAddr].z = '@'; // Text format
                            worksheet[cellAddr].t = 's'; // String type
                        }
                    });
                }

                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Zenith_Payout");

                const dateStr = new Date().toISOString().split('T')[0];
                XLSX.writeFile(workbook, `Zenith_Payout_Report_${dateStr}.xlsx`);
            } else {
                // CSV format
                const csvLines = [
                    headers.join(","),
                    ...rows.map(z => [
                        `"${z.transactionRef}"`,
                        `"${z.beneficiaryName}"`,
                        `${z.paymentAmount}`,
                        `"${z.paymentDueDate}"`,
                        `"${z.beneficiaryCode}"`,
                        `"${z.beneficiaryAccount}"`,
                        `"${z.bankSortCode}"`,
                        `"${z.debitAccount}"`
                    ].join(","))
                ].join("\n");

                const blob = new Blob([csvLines], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `Zenith_Payout_Report_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error("Zenith Export failed:", error);
            alert("Failed to export Zenith Bank Payout data. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    // Export Handler for Standard Loan Report
    const handleExportStandard = async () => {
        setIsExporting(true);
        try {
            const params: any = { page: 1, limit: 999999 };
            if (statusFilter !== 'all') params.status = statusFilter;
            if (stageFilter !== 'all') params.stage = stageFilter;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const response = await axios.get('/api/staff/reports', { params, withCredentials: true });
            const allReports = response.data.reports || response.data || [];

            if (!allReports || allReports.length === 0) {
                alert("No data to export for the selected filters");
                return;
            }

            const headers = [
                "Applicant Name",
                "CASA Account",
                "CBA Customer ID",
                "IPPIS No",
                "Institution/Ministry",
                "Amount",
                "Disbursement Amount",
                "Net Salary",
                "Account No",
                "Bank",
                "Tenure",
                "Product",
                "Branch",
                "Account Officer",
                "Loan Type",
                "Staff ID",
                "Phone No",
                "Status",
                "Creation Date",
                "Disb. Date"
            ];

            const csvContent = [
                headers.join(","),
                ...allReports.map((r: any) => {
                    const amount = ['topup', 'add_on', 're-app', 're_app'].includes(r.loan_type?.toLowerCase())
                        ? (r.topup_amount || 0)
                        : (r.eligible_amount || r.requested_loan_amount || 0);

                    const row = [
                        `"${r.applicant_full_name || ''}"`,
                        `"${r.casa || ''}"`,
                        `"${r.cba_customer_id || ''}"`,
                        `"${r.ippis_number || ''}"`,
                        `"${r.mda_tertiary || ''}"`,
                        `${amount}`,
                        `${r.disbursement_amount || 0}`,
                        `${r.average_monthly_income || 0}`,
                        `"${r.account_number || ''}"`,
                        `"${r.bank_name || ''}"`,
                        `${r.loan_tenure_months || 0}`,
                        `"${r.product_type || ''}"`,
                        `""`,
                        `"${r.officer_name || ''}"`,
                        `"${r.loan_type || ''}"`,
                        `"${r.staff_id || ''}"`,
                        `"${r.mobile_number || ''}"`,
                        `"${r.status || r.stage || ''}"`,
                        `"${formatDate(r.created_at)}"`,
                        `"${formatDate(r.disb_date)}"`
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
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export data. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Loan Reports</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">View and export loan data & disbursement payout files.</p>
                </div>

                <div className="flex items-center gap-3">
                    {reportTab === 'zenith' ? (
                        <>
                            <button
                                onClick={() => handleExportZenith('xlsx')}
                                disabled={isExporting}
                                className="px-5 py-3 rounded-xl bg-green-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isExporting ? (
                                    <>
                                        <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg">description</span>
                                        Export Zenith Excel (.xlsx)
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => handleExportZenith('csv')}
                                disabled={isExporting}
                                className="px-5 py-3 rounded-xl bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-700/20 flex items-center gap-2 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-lg">download</span>
                                Export CSV
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleExportStandard}
                            disabled={isExporting}
                            className="px-6 py-3 rounded-xl bg-green-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center gap-2 disabled:opacity-50"
                        >
                            {isExporting ? (
                                <>
                                    <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">download</span>
                                    Export Standard CSV
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 gap-2">
                <button
                    onClick={() => setReportTab('standard')}
                    className={`pb-3 px-4 text-sm font-bold tracking-wider transition-all flex items-center gap-2 border-b-2 ${
                        reportTab === 'standard'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                >
                    <span className="material-symbols-outlined text-lg">table_chart</span>
                    Standard Loan Report
                </button>
                <button
                    onClick={() => setReportTab('zenith')}
                    className={`pb-3 px-4 text-sm font-bold tracking-wider transition-all flex items-center gap-2 border-b-2 ${
                        reportTab === 'zenith'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                >
                    <span className="material-symbols-outlined text-lg">payments</span>
                    Zenith Payout / Disbursement Format
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-[#1e293b] p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm"
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="disbursed">Disbursed</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stage</label>
                        <select
                            value={stageFilter}
                            onChange={(e) => setStageFilter(e.target.value)}
                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm"
                        >
                            <option value="all">All Stages</option>
                            <option value="sales">Sales</option>
                            <option value="customer_experience">Customer Experience</option>
                            <option value="credit_check_1">Credit Check 1</option>
                            <option value="credit_check_2">Credit Check 2</option>
                            <option value="internal_audit">Internal Audit</option>
                            <option value="finance">Finance</option>
                            <option value="disbursed">Disbursed</option>
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
                        onClick={applyFilters}
                        className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold uppercase tracking-wider hover:bg-blue-700 transition-all text-xs"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-[#1e293b] rounded-[24px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    {reportTab === 'zenith' ? (
                        /* Zenith Bank Payout Report Table */
                        <table className="w-full text-left min-w-[1200px]">
                            <thead className="bg-slate-50/50 dark:bg-[#0f172a]/30 text-[10px] uppercase text-slate-500 font-black tracking-wider">
                                <tr>
                                    <th className="p-4">TRANSACTION REFERENCE NUMBER</th>
                                    <th className="p-4">BENEFICIARY NAME</th>
                                    <th className="p-4">PAYMENT AMOUNT</th>
                                    <th className="p-4">PAYMENT DUE DATE</th>
                                    <th className="p-4">BENEFICIARY CODE</th>
                                    <th className="p-4">BENEFICIARY ACCOUNT NUMBER</th>
                                    <th className="p-4">BENEFICIARY BANK SORT CODE</th>
                                    <th className="p-4">DEBIT ACCOUNT NUMBER</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-slate-400">Loading payout reports...</td>
                                    </tr>
                                ) : reports.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-slate-400">No data found for selected filters.</td>
                                    </tr>
                                ) : (
                                    reports.map((r, i) => {
                                        const z = formatZenithRecord(r);
                                        return (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="p-4 font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">{z.transactionRef}</td>
                                                <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{z.beneficiaryName}</td>
                                                <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">{z.paymentAmount}</td>
                                                <td className="p-4 font-mono text-slate-500">{z.paymentDueDate}</td>
                                                <td className="p-4 font-mono text-slate-800 dark:text-slate-200 font-bold">{z.beneficiaryCode || '-'}</td>
                                                <td className="p-4 font-mono text-slate-800 dark:text-slate-200 font-bold">{z.beneficiaryAccount || '-'}</td>
                                                <td className="p-4 font-mono text-slate-800 dark:text-slate-200 font-bold">{z.bankSortCode || '-'}</td>
                                                <td className="p-4 font-mono text-slate-800 dark:text-slate-200 font-bold">{z.debitAccount}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    ) : (
                        /* Standard Loan Report Table */
                        <table className="w-full text-left min-w-[1200px]">
                            <thead className="bg-slate-50/50 dark:bg-[#0f172a]/30 text-[10px] uppercase text-slate-500 font-black tracking-wider">
                                <tr>
                                    <th className="p-4">Applicant</th>
                                    <th className="p-4">CASA</th>
                                    <th className="p-4">CBA ID</th>
                                    <th className="p-4">Institution</th>
                                    <th className="p-4">Amount</th>
                                    <th className="p-4">Disbursement</th>
                                    <th className="p-4">Net Salary</th>
                                    <th className="p-4">Bank</th>
                                    <th className="p-4">Tenure</th>
                                    <th className="p-4">Officer</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Creation Date</th>
                                    <th className="p-4">Disb. Date</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={13} className="p-8 text-center text-slate-400">Loading reports...</td>
                                    </tr>
                                ) : reports.length === 0 ? (
                                    <tr>
                                        <td colSpan={13} className="p-8 text-center text-slate-400">No data found for selected filters.</td>
                                    </tr>
                                ) : (
                                    reports.map((r, i) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="p-4 font-bold text-slate-900 dark:text-white">{r.applicant_full_name}</td>
                                            <td className="p-4">
                                                <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{r.casa || '-'}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-mono text-xs text-slate-500">{r.cba_customer_id || '-'}</div>
                                            </td>
                                            <td className="p-4 max-w-[200px] truncate" title={r.mda_tertiary}>{r.mda_tertiary}</td>
                                            <td className="p-4">
                                                {['topup', 'add_on', 're-app', 're_app'].includes(r.loan_type?.toLowerCase())
                                                    ? `₦${Number(r.topup_amount || 0).toLocaleString()} (TopUp)`
                                                    : `₦${Number(r.eligible_amount || r.requested_loan_amount || 0).toLocaleString()}`}
                                            </td>
                                            <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                                                {r.disbursement_amount ? `₦${Number(r.disbursement_amount).toLocaleString()}` : '-'}
                                            </td>
                                            <td className="p-4">₦{Number(r.average_monthly_income || 0).toLocaleString()}</td>
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
                                            <td className="p-4 text-slate-500">{formatDate(r.created_at)}</td>
                                            <td className="p-4 text-slate-500">{formatDate(r.disb_date)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-6">
                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                    Showing {reports.length > 0 ? (currentPage - 1) * limit + 1 : 0} - {Math.min(currentPage * limit, totalReports)} of {totalReports} reports
                </div>

                <div className="flex items-center gap-2">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs uppercase"
                    >
                        Previous
                    </button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, Math.ceil(totalReports / limit)) }, (_, i) => {
                            let p = i + 1;
                            if (currentPage > 3 && Math.ceil(totalReports / limit) > 5) {
                                p = currentPage - 2 + i;
                            }
                            if (p > Math.ceil(totalReports / limit)) return null;

                            return (
                                <button
                                    key={p}
                                    onClick={() => setCurrentPage(p)}
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
                        disabled={currentPage * limit >= totalReports}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs uppercase"
                    >
                        Next
                    </button>

                    <select
                        value={limit}
                        onChange={(e) => {
                            setLimit(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="ml-4 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-400 text-xs font-bold"
                    >
                        <option value="10">10 / page</option>
                        <option value="20">20 / page</option>
                        <option value="50">50 / page</option>
                        <option value="100">100 / page</option>
                        <option value="999999">All</option>
                    </select>
                </div>
            </div>
        </StaffLayout>
    );
};

export default ReportsPage;

