import React, { useEffect, useState } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

interface TimelineReportPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const TimelineReportPage: React.FC<TimelineReportPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const [searchParams] = useSearchParams();
    const [page, setPage] = useState(1);
    const searchQuery = searchParams.get('search') || '';
    const [timelineData, setTimelineData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [isExporting, setIsExporting] = useState(false);

    const LIMIT = 50; // Use a larger limit for reports

    useEffect(() => {
        const fetchTimeline = async () => {
            setIsLoading(true);
            try {
                const response = await axios.get(`${''}/api/staff/loans/timeline-report?page=${page}&limit=${LIMIT}&search=${searchQuery}`, { withCredentials: true });
                if (response.data && response.data.data) {
                    setTimelineData(response.data.data);
                    setTotal(response.data.meta.total);
                }
            } catch (error) {
                console.error("Failed to fetch timeline report", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTimeline();
    }, [page, searchQuery]);

    const handlePrevPage = () => setPage((p) => Math.max(1, p - 1));
    const handleNextPage = () => setPage((p) => p + 1);

    const handleExportCsv = async () => {
        setIsExporting(true);
        try {
            const response = await axios.get(
                `${''}/api/staff/loans/timeline-report/export-csv?search=${searchQuery}`,
                { withCredentials: true, responseType: 'blob' }
            );
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `timeline_report_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export CSV:', error);
        } finally {
            setIsExporting(false);
        }
    };

    if (user.role !== 'customer_experience' && user.role !== 'super_admin' && user.role !== 'superadmin') {
        return (
            <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <div className="size-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-4xl text-slate-400">lock</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Restricted Access</h2>
                    <p className="text-slate-500 max-w-md">You do not have permission to view the Timeline Report. This section is reserved for Customer Experience teams.</p>
                </div>
            </StaffLayout>
        );
    }

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        Timeline Report
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Turnaround Time (TAT) Tracking per application stage.
                    </p>
                </div>
                <button
                    onClick={handleExportCsv}
                    disabled={isExporting || isLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow shadow-emerald-200 dark:shadow-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    {isExporting ? 'Exporting...' : 'Export CSV'}
                </button>
            </div>

            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[max-content] border-collapse">
                        <thead className="bg-[#18467b] text-white text-xs font-semibold">
                            <tr>
                                <th className="p-3 border border-slate-200 dark:border-[#0f172a]">Reference</th>
                                <th className="p-3 border border-slate-200 dark:border-[#0f172a]">Product Type</th>
                                <th className="p-3 border border-slate-200 dark:border-[#0f172a] text-right">Amount</th>
                                <th className="p-3 border border-slate-200 dark:border-[#0f172a]">Current Status</th>
                                <th className="p-3 border border-slate-200 dark:border-[#0f172a]">Sales Officer</th>
                                <th className="p-3 border border-slate-200 dark:border-[#0f172a]">Initiator</th>
                                <th className="p-3 border border-slate-200 dark:border-[#0f172a]">Stage Name</th>
                                <th className="p-3 border border-slate-200 dark:border-[#0f172a]">Stage Entry Timestamp</th>
                                <th className="p-3 border border-slate-200 dark:border-[#0f172a]">Stage Exit Timestamp</th>
                                <th className="p-3 border border-slate-200 dark:border-[#0f172a] bg-[#f8f9fa] dark:bg-[#334155] text-slate-800 dark:text-slate-200 italic">Stage TAT (Hours)</th>
                                <th className="p-3 border border-slate-200 dark:border-[#0f172a] bg-[#f8f9fa] dark:bg-[#334155] text-slate-800 dark:text-slate-200 italic">Final Node</th>
                                <th className="p-3 border border-slate-200 dark:border-[#0f172a] bg-[#f8f9fa] dark:bg-[#334155] text-slate-800 dark:text-slate-200 italic">Return Reason</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {isLoading ? (
                                <tr><td colSpan={12} className="p-8 text-center text-slate-500 bg-white dark:bg-[#1e293b]">Loading timeline data...</td></tr>
                            ) : timelineData.length === 0 ? (
                                <tr><td colSpan={12} className="p-8 text-center text-slate-500 bg-white dark:bg-[#1e293b]">No records found.</td></tr>
                            ) : (
                                timelineData.map((row, idx) => (
                                    <tr key={idx} className="bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200 dark:border-[#0f172a]">
                                        <td className="p-2 px-3 border-r border-slate-200 dark:border-[#0f172a] text-slate-700 dark:text-slate-300">APP-{row.loanId.toString().padStart(3, '0')}</td>
                                        <td className="p-2 px-3 border-r border-slate-200 dark:border-[#0f172a] text-slate-700 dark:text-slate-300">{row.productType}</td>
                                        <td className="p-2 px-3 border-r border-slate-200 dark:border-[#0f172a] text-right font-mono text-slate-700 dark:text-slate-300">{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="p-2 px-3 border-r border-slate-200 dark:border-[#0f172a] capitalize text-slate-700 dark:text-slate-300">{row.currentStatus}</td>
                                        <td className="p-2 px-3 border-r border-slate-200 dark:border-[#0f172a] text-slate-700 dark:text-slate-300">{row.officerName}</td>
                                        <td className="p-2 px-3 border-r border-slate-200 dark:border-[#0f172a] text-slate-700 dark:text-slate-300">{row.initiator}</td>
                                        <td className="p-2 px-3 border-r border-slate-200 dark:border-[#0f172a] text-slate-700 dark:text-slate-300">{row.stageName}</td>
                                        <td className="p-2 px-3 border-r border-slate-200 dark:border-[#0f172a] text-slate-700 dark:text-slate-300">
                                            {new Date(row.entryTimestamp).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' ', ' ')}
                                        </td>
                                        <td className="p-2 px-3 border-r border-slate-200 dark:border-[#0f172a] text-slate-700 dark:text-slate-300">
                                            {row.exitTimestamp ? new Date(row.exitTimestamp).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' ', ' ') : ''}
                                        </td>
                                        <td className="p-2 px-3 border-r border-slate-200 dark:border-[#0f172a] bg-[#f8f9fa]/50 dark:bg-[#334155]/50 text-right font-mono text-slate-700 dark:text-slate-300">{row.tatHours}</td>
                                        <td className="p-2 px-3 border-r border-slate-200 dark:border-[#0f172a] bg-[#f8f9fa]/50 dark:bg-[#334155]/50 text-slate-700 dark:text-slate-300">{row.finalNode || ''}</td>
                                        <td className="p-2 px-3 bg-[#f8f9fa]/50 dark:bg-[#334155]/50 text-slate-700 dark:text-slate-300 text-xs">{row.returnReason || ''}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {timelineData.length > 0 && (
                <div className="flex justify-between items-center mt-6">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Showing page {page} {(LIMIT * page < total) ? `(Total loans: ${total})` : ''}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrevPage}
                            disabled={page === 1}
                            className="px-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            onClick={handleNextPage}
                            disabled={timelineData.length < LIMIT} // Simplistic check if more pages exist or could use total
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 shadow shadow-indigo-200 dark:shadow-none text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </StaffLayout>
    );
};

export default TimelineReportPage;
