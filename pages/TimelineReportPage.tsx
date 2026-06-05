import React, { useEffect, useState } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie
} from 'recharts';
import DateRangePicker from '../components/DateRangePicker';
import DemographyReportPage from './DemographyReportPage';
import { format, startOfYear } from 'date-fns';

interface TimelineReportPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string; id?: number };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

interface SummaryStats {
    approved: number;
    pending: number;
    rejected: number;
    totalVolume: number;
}

type ProductType = 'LOAN' | 'INVESTMENT';
type ReportView = 'TAT' | 'DEMOGRAPHY';

const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string; icon: string }[] = [
    { value: 'LOAN', label: 'Loan Analytics', icon: 'credit_card' },
    { value: 'INVESTMENT', label: 'Investment Analytics', icon: 'account_balance_wallet' },
];

const REPORT_VIEW_OPTIONS: { value: ReportView; label: string; icon: string; desc: string }[] = [
    { value: 'TAT', label: 'TAT Report', icon: 'timer', desc: 'Turnaround time & pipeline metrics' },
    { value: 'DEMOGRAPHY', label: 'Demography Report', icon: 'groups', desc: 'Applicant profiles & demographics' },
];

const TimelineReportPage: React.FC<TimelineReportPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const [searchParams] = useSearchParams();
    const searchQuery = searchParams.get('search') || '';
    
    const [productType, setProductType] = useState<ProductType>('LOAN');
    const [reportView, setReportView] = useState<ReportView>('TAT');
    const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
    const [isReportDropdownOpen, setIsReportDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    // Date range state (default to start of this month -> today)
    const [dateRangeStart, setDateRangeStart] = useState<Date | null>(startOfYear(new Date()));
    const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(new Date());
    
    const [summary, setSummary] = useState<SummaryStats>({ 
        approved: 0, pending: 0, rejected: 0, totalVolume: 0 
    });
    
    const [dailyApprovals, setDailyApprovals] = useState<any[]>([]);
    const [productMix, setProductMix] = useState<any[]>([]);
    const [performance, setPerformance] = useState<{ fastest: any[], slowest: any[] }>({ fastest: [], slowest: [] });
    const [stageVolume, setStageVolume] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);

    const fetchAnalytics = async () => {
        if (reportView !== 'TAT') return; // Don't fetch TAT data when on demography view
        setIsLoading(true);
        try {
            const params: Record<string, string> = { type: productType };
            if (dateRangeStart && dateRangeEnd) {
                params.startDate = format(dateRangeStart, 'yyyy-MM-dd');
                params.endDate = format(dateRangeEnd, 'yyyy-MM-dd');
            } else if (dateRangeStart) {
                params.startDate = format(dateRangeStart, 'yyyy-MM-dd');
            } else {
                params.period = 'this_month';
            }
            const queryString = new URLSearchParams(params).toString();
            const response = await axios.get(`/api/staff/reports/tat-summary?${queryString}`, { withCredentials: true });
            if (response.data) {
                setSummary(response.data.summary);
                setDailyApprovals(response.data.dailyApprovals || []);
                setProductMix(response.data.productMix || []);
                setPerformance(response.data.performance || { fastest: [], slowest: [] });
                setStageVolume(response.data.stageVolume || []);
                setChartData(response.data.chartData || []);
            }
        } catch (error) {
            console.error("Failed to fetch analytics data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (reportView === 'TAT') {
            fetchAnalytics();
        }
    }, [productType, searchQuery, dateRangeStart, dateRangeEnd, reportView]);

    const handleDateRangeChange = (start: Date | null, end: Date | null) => {
        setDateRangeStart(start);
        setDateRangeEnd(end);
    };

    const handleExportCsv = async () => {
        setIsExporting(true);
        try {
            const endpoint = productType === 'LOAN' ? '/api/staff/loans/timeline-report/export-csv' : '/api/staff/investments/timeline-report/export-csv';
            const response = await axios.get(
                `${endpoint}?search=${searchQuery}`,
                { withCredentials: true, responseType: 'blob' }
            );
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${productType.toLowerCase()}_timeline_report_${new Date().toISOString().split('T')[0]}.csv`;
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

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: 'spring',
                damping: 12,
                stiffness: 100
            }
        }
    };

    if (user.role !== 'customer_experience' && user.role !== 'super_admin' && user.role !== 'superadmin') {
        return (
            <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <div className="size-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-4xl text-slate-400">lock</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Restricted Access</h2>
                    <p className="text-slate-500 max-w-md">You do not have permission to view the Timeline Report.</p>
                </div>
            </StaffLayout>
        );
    }

    const MIX_COLORS = ['#fbbf24', '#10b981', '#2563eb', '#8b5cf6'];
    const totalApps = summary.approved + summary.pending + summary.rejected;
    const isDark = theme === 'dark' || !theme;

    const selectedProduct = PRODUCT_TYPE_OPTIONS.find(o => o.value === productType)!;
    const selectedReportView = REPORT_VIEW_OPTIONS.find(o => o.value === reportView)!;

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className={`min-h-screen -m-8 p-10 font-sans relative overflow-x-hidden transition-colors duration-500 ${isDark ? 'bg-[#060b13] text-slate-300' : 'bg-[#f8fafc] text-slate-600'}`}>
                
                {/* Header Section */}
                <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mb-8 flex flex-col lg:flex-row justify-between items-start gap-6"
                >
                    {/* Left: Report View Dropdown + Product Type Dropdown */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Report View Dropdown (TAT / Demography) */}
                        <div className="relative">
                            <button
                                onClick={() => { setIsReportDropdownOpen(!isReportDropdownOpen); setIsProductDropdownOpen(false); }}
                                className={`flex items-center gap-4 px-6 py-3.5 rounded-2xl border transition-all ${isDark ? 'bg-[#111827] border-slate-800/60 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
                            >
                                <div className={`size-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-[#fbbf24]/10' : 'bg-amber-50'}`}>
                                    <span className={`material-symbols-outlined text-xl ${isDark ? 'text-[#fbbf24]' : 'text-amber-500'}`}>
                                        {selectedReportView.icon}
                                    </span>
                                </div>
                                <div className="text-left">
                                    <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Report Type</p>
                                    <p className={`text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedReportView.label}</p>
                                </div>
                                <span className={`material-symbols-outlined text-lg ml-2 transition-transform ${isReportDropdownOpen ? 'rotate-180' : ''} ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    expand_more
                                </span>
                            </button>

                            <AnimatePresence>
                                {isReportDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                        transition={{ duration: 0.15 }}
                                        className={`absolute left-0 top-full mt-2 z-50 w-full min-w-[280px] rounded-xl border overflow-hidden shadow-xl ${isDark ? 'bg-[#0a101f] border-slate-800/60' : 'bg-white border-slate-200 shadow-lg'}`}
                                    >
                                        {REPORT_VIEW_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => {
                                                    setReportView(option.value);
                                                    setIsReportDropdownOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all ${
                                                    reportView === option.value
                                                        ? isDark ? 'bg-[#fbbf24]/10 text-[#fbbf24]' : 'bg-amber-50 text-amber-600'
                                                        : isDark ? 'text-slate-400 hover:bg-[#111827] hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                }`}
                                            >
                                                <span className={`material-symbols-outlined text-lg ${
                                                    reportView === option.value
                                                        ? isDark ? 'text-[#fbbf24]' : 'text-amber-500'
                                                        : isDark ? 'text-slate-600' : 'text-slate-400'
                                                }`}>
                                                    {option.icon}
                                                </span>
                                                <div>
                                                    <span className="text-[11px] font-black uppercase tracking-wider block">{option.label}</span>
                                                    <span className={`text-[9px] font-bold ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{option.desc}</span>
                                                </div>
                                                {reportView === option.value && (
                                                    <span className={`material-symbols-outlined text-sm ml-auto ${isDark ? 'text-[#fbbf24]' : 'text-amber-500'}`}>check</span>
                                                )}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {isReportDropdownOpen && (
                                <div className="fixed inset-0 z-40" onClick={() => setIsReportDropdownOpen(false)} />
                            )}
                        </div>

                        {/* Divider */}
                        <div className={`hidden lg:block w-px h-10 ${isDark ? 'bg-slate-800/60' : 'bg-slate-200'}`} />

                        {/* Product Type Dropdown (Loan / Investment) */}
                        <div className="relative">
                            <button
                                onClick={() => { setIsProductDropdownOpen(!isProductDropdownOpen); setIsReportDropdownOpen(false); }}
                                className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${isDark ? 'bg-[#111827] border-slate-800/60 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
                            >
                                <span className={`material-symbols-outlined text-lg ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {selectedProduct.icon}
                                </span>
                                <div className="text-left">
                                    <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Product</p>
                                    <p className={`text-xs font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedProduct.label}</p>
                                </div>
                                <span className={`material-symbols-outlined text-sm ml-1 transition-transform ${isProductDropdownOpen ? 'rotate-180' : ''} ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    expand_more
                                </span>
                            </button>

                            <AnimatePresence>
                                {isProductDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                        transition={{ duration: 0.15 }}
                                        className={`absolute left-0 top-full mt-2 z-50 w-full min-w-[240px] rounded-xl border overflow-hidden shadow-xl ${isDark ? 'bg-[#0a101f] border-slate-800/60' : 'bg-white border-slate-200 shadow-lg'}`}
                                    >
                                        {PRODUCT_TYPE_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => {
                                                    setProductType(option.value);
                                                    setIsProductDropdownOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all ${
                                                    productType === option.value
                                                        ? isDark ? 'bg-[#fbbf24]/10 text-[#fbbf24]' : 'bg-amber-50 text-amber-600'
                                                        : isDark ? 'text-slate-400 hover:bg-[#111827] hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                }`}
                                            >
                                                <span className={`material-symbols-outlined text-lg ${
                                                    productType === option.value
                                                        ? isDark ? 'text-[#fbbf24]' : 'text-amber-500'
                                                        : isDark ? 'text-slate-600' : 'text-slate-400'
                                                }`}>
                                                    {option.icon}
                                                </span>
                                                <span className="text-[11px] font-black uppercase tracking-wider">{option.label}</span>
                                                {productType === option.value && (
                                                    <span className={`material-symbols-outlined text-sm ml-auto ${isDark ? 'text-[#fbbf24]' : 'text-amber-500'}`}>check</span>
                                                )}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {isProductDropdownOpen && (
                                <div className="fixed inset-0 z-40" onClick={() => setIsProductDropdownOpen(false)} />
                            )}
                        </div>
                    </div>

                    {/* Right: Date Range Picker & Snapshot */}
                    <div className="flex flex-col items-end gap-3">
                        <DateRangePicker
                            startDate={dateRangeStart}
                            endDate={dateRangeEnd}
                            onChange={handleDateRangeChange}
                            isDark={isDark}
                        />
                        <p className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors ${isDark ? 'text-slate-500 bg-slate-900/80 border-slate-800/50' : 'text-slate-400 bg-white border-slate-200 shadow-sm'}`}>
                            Snapshot: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                </motion.div>

                {/* ========== CONDITIONAL REPORT RENDERING ========== */}
                <AnimatePresence mode="wait">
                    {reportView === 'DEMOGRAPHY' ? (
                        <motion.div
                            key="demography"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <DemographyReportPage
                                user={user}
                                onLogout={onLogout}
                                toggleTheme={toggleTheme}
                                theme={theme}
                                productType={productType}
                                dateRangeStart={dateRangeStart}
                                dateRangeEnd={dateRangeEnd}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="tat"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >

                {/* ========== TAT REPORT CONTENT ========== */}

                {/* Hero Stats */}
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                >
                    {[
                        { label: 'Approved Final', value: summary.approved, color: '#10b981', icon: 'verified' },
                        { label: 'In Pipeline', value: summary.pending, color: '#2563eb', icon: 'pending' },
                        { label: 'Total Volume', value: `₦${(summary.totalVolume / 1000000).toFixed(1)}M`, color: '#fbbf24', icon: 'account_balance_wallet' },
                        { label: 'Total Apps', value: totalApps, color: '#8b5cf6', icon: 'apps' },
                    ].map((stat, i) => (
                        <motion.div key={i} variants={itemVariants} className={`p-6 rounded-2xl border transition-all group relative overflow-hidden ${isDark ? 'bg-[#111827]/40 border-slate-800/60 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'}`}>
                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="material-symbols-outlined text-8xl" style={{ color: stat.color }}>{stat.icon}</span>
                            </div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">{stat.label}</p>
                            <h3 className={`text-3xl font-black tracking-tight transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.value}</h3>
                        </motion.div>
                    ))}
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    
                    {/* Daily Flow Chart */}
                    <motion.div variants={itemVariants} initial="hidden" animate="visible" className={`lg:col-span-2 p-8 rounded-3xl border flex flex-col transition-all ${isDark ? 'bg-[#111827]/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                             Daily Approvals Volume
                        </h2>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyApprovals}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1f2937' : '#e2e8f0'} opacity={0.6} />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: isDark ? '#4b5563' : '#94a3b8' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: isDark ? '#4b5563' : '#94a3b8' }} />
                                    <Tooltip 
                                        cursor={{ fill: isDark ? '#fbbf2410' : '#fbbf2405' }} 
                                        contentStyle={{ backgroundColor: isDark ? '#030712' : '#ffffff', border: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`, borderRadius: '12px', fontSize: '10px', color: isDark ? '#ffffff' : '#0f172a' }} 
                                    />
                                    <Bar dataKey="new" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={45} />
                                    <Bar dataKey="spillover" stackId="a" fill="#fbbf24" radius={[6, 6, 0, 0]} barSize={45} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-8 mt-6">
                            <div className="flex items-center gap-2.5">
                                <span className="size-2 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b98140]"></span>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">New Applications</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <span className="size-2 rounded-full bg-[#fbbf24] shadow-[0_0_10px_#fbbf2440]"></span>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Spillover (48h+)</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Mix Chart */}
                    <motion.div variants={itemVariants} initial="hidden" animate="visible" className={`p-8 rounded-3xl border flex flex-col items-center transition-all ${isDark ? 'bg-[#111827]/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] self-start mb-8 transition-colors">{productType === 'LOAN' ? 'Portfolio Mix' : 'Product Breakdown'}</h2>
                        <div className="relative w-full h-[240px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={productMix} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={6} dataKey="value" stroke="none">
                                        {productMix.map((_, index) => <Cell key={`cell-${index}`} fill={MIX_COLORS[index % MIX_COLORS.length]} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className={`absolute text-center size-[130px] rounded-full flex flex-col items-center justify-center border backdrop-blur-sm transition-colors ${isDark ? 'bg-[#060b13]/50 border-slate-800/40' : 'bg-white/50 border-slate-100 shadow-inner'}`}>
                                <span className={`text-3xl font-black transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalApps}</span>
                                <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Total Apps</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-10 w-full px-4">
                            {productMix.map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="size-2 rounded-full" style={{ backgroundColor: MIX_COLORS[i % MIX_COLORS.length] }}></div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                </div>

                {/* Average TAT Graph */}
                <motion.div variants={itemVariants} initial="hidden" animate="visible" className={`p-8 rounded-3xl border mb-8 transition-all ${isDark ? 'bg-[#111827]/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                             Average Stage Turnaround Time (Hours) - Excl. Finance
                        </h2>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target: &lt; 24h</span>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.filter(d => !d.stage.toLowerCase().includes('finance'))}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1f2937' : '#e2e8f0'} opacity={0.6} />
                                <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: isDark ? '#4b5563' : '#94a3b8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: isDark ? '#4b5563' : '#94a3b8' }} unit="h" />
                                <Tooltip 
                                    cursor={{ fill: isDark ? '#fbbf2410' : '#fbbf2405' }} 
                                    contentStyle={{ backgroundColor: isDark ? '#030712' : '#ffffff', border: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`, borderRadius: '12px', fontSize: '10px', color: isDark ? '#ffffff' : '#0f172a' }} 
                                />
                                <Bar dataKey="avgHours" fill="#fbbf24" radius={[6, 6, 0, 0]} barSize={60}>
                                    {chartData.filter(d => !d.stage.toLowerCase().includes('finance')).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={MIX_COLORS[index % MIX_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Performance Monitoring Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    
                    {/* Fastest List */}
                    <motion.div variants={itemVariants} initial="hidden" animate="visible" className={`p-8 rounded-3xl border transition-all ${isDark ? 'bg-[#111827]/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <h2 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                             Lightning Approvals 
                        </h2>
                        <div className="space-y-6">
                            {performance.fastest.length === 0 ? (
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest text-center py-12">No Finalized Data Available</p>
                            ) : performance.fastest.map((app, i) => (
                                <motion.div 
                                    key={i} 
                                    initial={{ x: -20, opacity: 0 }} 
                                    animate={{ x: 0, opacity: 1 }} 
                                    transition={{ delay: i * 0.1 }}
                                    className={`p-4 rounded-xl border transition-all cursor-default ${isDark ? 'bg-slate-900/30 border-slate-800/30 hover:bg-slate-900/50' : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 shadow-sm'}`}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex gap-3 items-center">
                                            <span className="text-[9px] font-black text-emerald-500 py-0.5 px-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">{app.ref}</span>
                                            <span className={`text-[11px] font-black uppercase truncate transition-colors ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{app.name}</span>
                                        </div>
                                        <span className="text-[11px] font-black text-emerald-400 transition-colors">{app.tatHours}h</span>
                                    </div>
                                    <div className={`w-full h-1.5 rounded-full overflow-hidden transition-colors mb-2 ${isDark ? 'bg-slate-950' : 'bg-slate-200'}`}>
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${Math.min(100, (app.tatHours / (performance.slowest[0]?.tatHours || 100)) * 100)}%` }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                            className="bg-emerald-500 h-full rounded-full"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                                        <span>{app.type}</span>
                                        <span>{new Date(app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Slowest List */}
                    <motion.div variants={itemVariants} initial="hidden" animate="visible" className={`p-8 rounded-3xl border transition-all ${isDark ? 'bg-[#111827]/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <h2 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                             SLA Bottlenecks
                        </h2>
                        <div className="space-y-6">
                            {performance.slowest.length === 0 ? (
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest text-center py-12">No Finalized Data Available</p>
                            ) : performance.slowest.map((app, i) => (
                                <motion.div 
                                    key={i} 
                                    initial={{ x: 20, opacity: 0 }} 
                                    animate={{ x: 0, opacity: 1 }} 
                                    transition={{ delay: i * 0.1 }}
                                    className={`p-4 rounded-xl border transition-all cursor-default ${isDark ? 'bg-slate-900/30 border-slate-800/30 hover:bg-slate-900/50' : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 shadow-sm'}`}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex gap-3 items-center">
                                            <span className="text-[9px] font-black text-rose-500 py-0.5 px-2 bg-rose-500/10 rounded-full border border-rose-500/20">{app.ref}</span>
                                            <span className={`text-[11px] font-black uppercase truncate transition-colors ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{app.name}</span>
                                        </div>
                                        <span className="text-[11px] font-black text-rose-400 transition-colors">{(app.tatHours / 24).toFixed(1)} Days</span>
                                    </div>
                                    <div className={`w-full h-1.5 rounded-full overflow-hidden transition-colors mb-2 ${isDark ? 'bg-slate-950' : 'bg-slate-200'}`}>
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: "100%" }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                            className="bg-rose-500 h-full rounded-full opacity-60"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                                        <span>{app.type}</span>
                                        <span>{new Date(app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                </div>

                {/* Stage Throughput Visualization */}
                <motion.div variants={itemVariants} initial="hidden" animate="visible" className={`p-8 rounded-3xl border mb-12 transition-all ${isDark ? 'bg-[#111827]/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-10 transition-colors">Historical Node Throughput (Passes)</h2>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stageVolume} layout="vertical" margin={{ left: 60, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#1f2937' : '#e2e8f0'} opacity={0.4} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: isDark ? '#4b5563' : '#94a3b8', textTransform: 'uppercase' }} width={140} />
                                <Bar dataKey="passes" fill="#fbbf24" radius={[0, 4, 4, 0]} barSize={10} animationDuration={1500}>
                                    {stageVolume.map((_, index) => <Cell key={`cell-${index}`} fill={MIX_COLORS[index % MIX_COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Floating Export Button for TAT */}
                <div className="fixed bottom-10 right-10 flex flex-col gap-4 items-end">
                    <AnimatePresence>
                        {isExporting && (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-colors ${isDark ? 'bg-[#030712] border-slate-800 text-[#fbbf24]' : 'bg-white border-slate-200 text-amber-600 shadow-lg'}`}
                            >
                                Reconstructing CSV sequence...
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button 
                        onClick={handleExportCsv}
                        disabled={isExporting}
                        className={`group flex items-center gap-4 px-8 py-4 rounded-full font-black text-[12px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all z-50 disabled:opacity-50 ${isDark ? 'bg-[#fbbf24] text-[#060b13] shadow-[0_15px_40px_rgba(251,191,36,0.3)]' : 'bg-slate-900 text-white shadow-[0_15px_40px_rgba(15,23,42,0.2)] hover:bg-slate-800'}`}
                    >
                        <span className="material-symbols-outlined text-2xl">download</span>
                        {isExporting ? 'Processing' : 'Export TAT Data'}
                    </button>
                </div>

                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </StaffLayout>
    );
};

export default TimelineReportPage;
