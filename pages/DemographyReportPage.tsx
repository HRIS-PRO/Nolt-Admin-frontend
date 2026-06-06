import React, { useEffect, useState } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie,
    LineChart, Line,
    ComposedChart,
    Legend
} from 'recharts';
import DateRangePicker from '../components/DateRangePicker';
import { format, startOfMonth } from 'date-fns';

interface DemographyReportPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string; id?: number };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
    productType: 'LOAN' | 'INVESTMENT';
    dateRangeStart: Date | null;
    dateRangeEnd: Date | null;
}

interface DemoKPI {
    totalApplicants: number;
    maleCount: number;
    femaleCount: number;
    overallApprovalRate: number;
    maleApprovalRate: number;
    femaleApprovalRate: number;
    avgAmount: number;
    avgMaleAmount: number;
    avgFemaleAmount: number;
    avgAge: number;
    ageRange: { min: number; max: number };
}

interface DemoData {
    kpi: DemoKPI;
    genderSplit: { name: string; value: number }[];
    maritalStatus: { name: string; value: number }[];
    religion: { name: string; value: number }[];
    ageDistribution: { band: string; count: number; approvalRate: number }[];
    stateOfOrigin: { name: string; value: number }[];
    employerMDA: { name: string; value: number }[];
    amountBands: { band: string; total: number; male: number; female: number }[];
    tenurePreference: { name: string; value: number }[];
    bankDistribution: { name: string; value: number }[];
    typeByGender: { type: string; male: number; female: number }[];
}

const DONUT_COLORS = [
    'rgba(59,130,246,0.8)', 'rgba(240,192,64,0.8)', 'rgba(52,211,153,0.8)',
    'rgba(167,139,250,0.8)', 'rgba(251,146,60,0.8)', 'rgba(248,113,113,0.8)',
    'rgba(107,117,133,0.5)'
];

const CHART_COLORS = ['#3b82f6', '#fbbf24', '#10b981', '#a78bfa', '#fb923c', '#f87171', '#22d3ee', '#6b7585'];

const formatNaira = (val: number) => {
    if (val >= 1000000) return `₦${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `₦${(val / 1000).toFixed(0)}k`;
    return `₦${val}`;
};

// Custom tooltip styles
const tooltipStyle = (isDark: boolean) => ({
    backgroundColor: isDark ? '#161a20' : '#ffffff',
    border: `1px solid ${isDark ? '#2a3140' : '#e2e8f0'}`,
    borderRadius: '8px',
    fontSize: '10px',
    color: isDark ? '#e8eaf0' : '#0f172a',
    padding: '10px 14px',
    fontFamily: "'DM Mono', monospace",
});

const DemographyReportPage: React.FC<DemographyReportPageProps> = ({
    user, onLogout, toggleTheme, theme, productType, dateRangeStart, dateRangeEnd
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [data, setData] = useState<DemoData | null>(null);

    const isDark = theme === 'dark' || !theme;

    // Chart theme colors
    const gridColor = isDark ? '#2a3140' : '#e2e8f0';
    const tickColor = isDark ? '#6b7585' : '#94a3b8';
    const tooltipStyles = tooltipStyle(isDark);

    const fetchDemography = async () => {
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
            const res = await axios.get(`/api/staff/reports/demography?${queryString}`, { withCredentials: true });
            setData(res.data);
        } catch (error) {
            console.error('Failed to fetch demography data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDemography();
    }, [productType, dateRangeStart, dateRangeEnd]);

    const handleExportCsv = async () => {
        setIsExporting(true);
        try {
            const params: Record<string, string> = { type: productType };
            if (dateRangeStart && dateRangeEnd) {
                params.startDate = format(dateRangeStart, 'yyyy-MM-dd');
                params.endDate = format(dateRangeEnd, 'yyyy-MM-dd');
            }
            const queryString = new URLSearchParams(params).toString();
            const response = await axios.get(`/api/staff/reports/demography/export-csv?${queryString}`, {
                withCredentials: true,
                responseType: 'blob'
            });
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${productType.toLowerCase()}_demography_${new Date().toISOString().split('T')[0]}.csv`;
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
        visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
    };
    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 14, stiffness: 100 } }
    };

    const kpi = data?.kpi;
    const isLoan = productType === 'LOAN';
    const amountLabel = isLoan ? 'Avg Loan Amount' : 'Avg Investment';

    // Donut helper component
    const DonutChart = ({ title, subtitle, chartData, height = 200 }: { title: string; subtitle: string; chartData: { name: string; value: number }[]; height?: number }) => (
        <motion.div variants={itemVariants} className={`p-6 rounded-2xl border transition-all ${isDark ? 'bg-[#111827]/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h2 className={`text-sm font-black tracking-tight mb-0.5 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
            <p className={`text-[9px] font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{subtitle}</p>
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value" stroke={isDark ? '#161a20' : '#ffffff'} strokeWidth={3}>
                            {chartData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyles} formatter={(value: number, name: string) => [`${value} applicants`, name]} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-3">
                {chartData.map((item, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}></span>
                        <span className={`text-[9px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.name}</span>
                    </span>
                ))}
            </div>
        </motion.div>
    );

    // Section Label component
    const SectionLabel = ({ children }: { children: string }) => (
        <div className={`text-[9px] font-black uppercase tracking-[0.2em] pb-2 mb-5 mt-8 border-b ${isDark ? 'text-slate-600 border-slate-800/60' : 'text-slate-400 border-slate-200'}`}>
            {children}
        </div>
    );

    if (isLoading && !data) {
        return (
            <div className={`min-h-[60vh] flex items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin size-8 border-2 border-current border-t-transparent rounded-full"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Loading Demography Data</p>
                </div>
            </div>
        );
    }

    if (!data || !kpi) return null;

    return (
        <>
            {/* Notice Banner */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-6 p-4 rounded-xl border-l-4 ${isDark ? 'bg-[#131720] border-[#fbbf24] border border-l-[#fbbf24] border-t-slate-800/60 border-r-slate-800/60 border-b-slate-800/60' : 'bg-amber-50 border-amber-400 border border-l-amber-400 border-t-amber-200 border-r-amber-200 border-b-amber-200'}`}
            >
                <p className={`text-[10px] font-bold leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    <span className="mr-1.5">⚠</span>
                    Demographic fields (gender, age, marital status, state, {isLoan ? 'ministry, tenure' : 'investment type, tenure'}) are drawn from applicant profile records submitted at onboarding.
                    {isLoan ? ' Product Type: Public Sector Loan.' : ' Product Type: Investment Portfolio.'}
                </p>
            </motion.div>

            {/* KPI Strip */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    {
                        value: kpi.totalApplicants.toLocaleString(),
                        label: 'Total Applicants',
                        sub: `${kpi.maleCount} male · ${kpi.femaleCount} female`,
                        color: '#fbbf24'
                    },
                    {
                        value: `${kpi.overallApprovalRate}%`,
                        label: 'Overall Approval Rate',
                        sub: `${kpi.maleApprovalRate}% male · ${kpi.femaleApprovalRate}% female`,
                        color: '#10b981'
                    },
                    {
                        value: formatNaira(kpi.avgAmount),
                        label: amountLabel,
                        sub: `${formatNaira(kpi.avgMaleAmount)} male · ${formatNaira(kpi.avgFemaleAmount)} female`,
                        color: '#3b82f6'
                    },
                    {
                        value: kpi.avgAge.toString(),
                        label: 'Average Age (Yrs)',
                        sub: kpi.ageRange.max > 0 ? `Range: ${kpi.ageRange.min} – ${kpi.ageRange.max} years` : 'No age data',
                        color: '#a78bfa'
                    },
                ].map((stat, i) => (
                    <motion.div key={i} variants={itemVariants} className={`p-5 rounded-2xl border transition-all group ${isDark ? 'bg-[#111827]/40 border-slate-800/60 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                        <div className="text-2xl font-black tracking-tight mb-1" style={{ color: stat.color }}>{stat.value}</div>
                        <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</p>
                        <p className={`text-[9px] font-bold ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{stat.sub}</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* ── SECTION 1: Core Demographics ── */}
            <SectionLabel>Core Demographics</SectionLabel>

            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <DonutChart title="Gender Split" subtitle="Proportion of Male vs Female Applicants" chartData={data.genderSplit} />
                <DonutChart title="Marital Status" subtitle="Distribution across applicant pool" chartData={data.maritalStatus} />
                <DonutChart title="Religion" subtitle="Declared religious affiliation" chartData={data.religion} />
            </motion.div>

            {/* Age Group Distribution */}
            <motion.div variants={itemVariants} initial="hidden" animate="visible" className={`p-6 rounded-2xl border mb-5 transition-all ${isDark ? 'bg-[#111827]/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h2 className={`text-sm font-black tracking-tight mb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>Age Group Distribution</h2>
                <p className={`text-[9px] font-bold uppercase tracking-widest mb-6 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Count of Applicants by Age Band · Approval Rate Overlay (Line)</p>
                <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data.ageDistribution}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} opacity={0.6} />
                            <XAxis dataKey="band" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: tickColor }} dy={8} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: tickColor }} />
                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: tickColor }} domain={[80, 100]} tickFormatter={(v: number) => `${v}%`} />
                            <Tooltip contentStyle={tooltipStyles} />
                            <Bar yAxisId="left" dataKey="count" fill="rgba(167,139,250,0.65)" radius={[4, 4, 0, 0]} barSize={50} name="Applicants" />
                            <Line yAxisId="right" dataKey="approvalRate" stroke="#fbbf24" strokeWidth={2.5} dot={{ fill: '#fbbf24', r: 4 }} name="Approval Rate %" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-8 mt-4">
                    <span className="flex items-center gap-2"><span className="size-2 rounded-sm bg-[rgba(167,139,250,0.65)]"></span><span className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Applicants</span></span>
                    <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#fbbf24]"></span><span className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Approval Rate %</span></span>
                </div>
            </motion.div>

            {/* ── SECTION 2: Geography ── */}
            <SectionLabel>Geography</SectionLabel>

            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                {/* State of Origin */}
                <motion.div variants={itemVariants} className={`p-6 rounded-2xl border transition-all ${isDark ? 'bg-[#111827]/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <h2 className={`text-sm font-black tracking-tight mb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>Top 10 States of Origin</h2>
                    <p className={`text-[9px] font-bold uppercase tracking-widest mb-6 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Count of Applicants by State</p>
                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.stateOfOrigin} layout="vertical" margin={{ left: 20, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} opacity={0.6} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: tickColor }} />
                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: tickColor }} width={100} />
                                <Tooltip contentStyle={tooltipStyles} formatter={(v: number) => [`${v} applicants`]} />
                                <Bar dataKey="value" fill="rgba(34,211,238,0.65)" radius={[0, 4, 4, 0]} barSize={14} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Employer MDA (only for Loans, show Investment Type breakdown for Investments) */}
                <motion.div variants={itemVariants} className={`p-6 rounded-2xl border transition-all ${isDark ? 'bg-[#111827]/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <h2 className={`text-sm font-black tracking-tight mb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {isLoan ? 'Employer Ministry' : 'Bank Distribution'}
                    </h2>
                    <p className={`text-[9px] font-bold uppercase tracking-widest mb-6 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                        {isLoan ? 'Top 8 MDAs by Application Count' : 'Top Banks by Applicant Count'}
                    </p>
                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={isLoan ? data.employerMDA : data.bankDistribution} layout="vertical" margin={{ left: 20, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} opacity={0.6} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: tickColor }} />
                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: tickColor }} width={120} />
                                <Tooltip contentStyle={tooltipStyles} formatter={(v: number) => [`${v} applicants`]} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                                    {(isLoan ? data.employerMDA : data.bankDistribution).map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length] + 'a8'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </motion.div>

            {/* ── SECTION 3: Financial Profile ── */}
            <SectionLabel>Financial Profile</SectionLabel>

            {/* Amount Band */}
            <motion.div variants={itemVariants} initial="hidden" animate="visible" className={`p-6 rounded-2xl border mb-5 transition-all ${isDark ? 'bg-[#111827]/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h2 className={`text-sm font-black tracking-tight mb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{isLoan ? 'Loan Amount Band' : 'Investment Amount Band'}</h2>
                <p className={`text-[9px] font-bold uppercase tracking-widest mb-6 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Count of Applications by Requested Amount Range</p>
                <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.amountBands}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} opacity={0.6} />
                            <XAxis dataKey="band" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: tickColor }} dy={8} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: tickColor }} />
                            <Tooltip contentStyle={tooltipStyles} />
                            <Bar dataKey="total" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={55} name="Applications">
                                {data.amountBands.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length] + 'a8'} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Amount Band by Gender - Stacked */}
            <motion.div variants={itemVariants} initial="hidden" animate="visible" className={`p-6 rounded-2xl border mb-5 transition-all ${isDark ? 'bg-[#111827]/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h2 className={`text-sm font-black tracking-tight mb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{isLoan ? 'Loan' : 'Investment'} Amount Band by Gender</h2>
                <p className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Stacked Count · Male vs Female per Amount Range</p>
                <div className="flex gap-4 mb-4">
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[rgba(59,130,246,0.72)]"></span><span className={`text-[9px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Male</span></span>
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[rgba(240,192,64,0.72)]"></span><span className={`text-[9px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Female</span></span>
                </div>
                <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.amountBands}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} opacity={0.6} />
                            <XAxis dataKey="band" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: tickColor }} dy={8} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: tickColor }} />
                            <Tooltip contentStyle={tooltipStyles} />
                            <Bar dataKey="male" stackId="a" fill="rgba(59,130,246,0.72)" radius={[0, 0, 0, 0]} barSize={50} name="Male" />
                            <Bar dataKey="female" stackId="a" fill="rgba(240,192,64,0.72)" radius={[4, 4, 0, 0]} barSize={50} name="Female" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* ── SECTION 4: Product & Behaviour ── */}
            <SectionLabel>Product &amp; Behaviour</SectionLabel>

            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                {/* Tenure Preference - Donut */}
                <DonutChart
                    title={isLoan ? 'Loan Tenure Preference' : 'Investment Tenure Preference'}
                    subtitle={isLoan ? 'Preferred Repayment Duration by Applicant Count' : 'Preferred Investment Duration by Applicant Count'}
                    chartData={data.tenurePreference}
                    height={220}
                />

                {/* Bank Distribution */}
                <motion.div variants={itemVariants} className={`p-6 rounded-2xl border transition-all ${isDark ? 'bg-[#111827]/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <h2 className={`text-sm font-black tracking-tight mb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {isLoan ? 'Bank Distribution' : 'Applicant Banks'}
                    </h2>
                    <p className={`text-[9px] font-bold uppercase tracking-widest mb-6 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                        Salary Bank Used by Applicants
                    </p>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.bankDistribution}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} opacity={0.6} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: tickColor }} dy={8} interval={0} angle={-15} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: tickColor }} />
                                <Tooltip contentStyle={tooltipStyles} formatter={(v: number) => [`${v} applicants`]} />
                                <Bar dataKey="value" fill="rgba(52,211,153,0.65)" radius={[4, 4, 0, 0]} barSize={35} name="Applicants" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </motion.div>

            {/* Loan/Product Type by Gender - Stacked */}
            <motion.div variants={itemVariants} initial="hidden" animate="visible" className={`p-6 rounded-2xl border mb-5 transition-all ${isDark ? 'bg-[#111827]/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h2 className={`text-sm font-black tracking-tight mb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isLoan ? 'Loan Type by Gender' : 'Investment Type by Gender'}
                </h2>
                <p className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    Application Count Per {isLoan ? 'Loan' : 'Investment'} Type · Male vs Female Stacked
                </p>
                <div className="flex gap-4 mb-4">
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[rgba(59,130,246,0.72)]"></span><span className={`text-[9px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Male</span></span>
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[rgba(240,192,64,0.72)]"></span><span className={`text-[9px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Female</span></span>
                </div>
                <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.typeByGender}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} opacity={0.6} />
                            <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: tickColor }} dy={8} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: tickColor }} />
                            <Tooltip contentStyle={tooltipStyles} />
                            <Bar dataKey="male" stackId="a" fill="rgba(59,130,246,0.72)" radius={[0, 0, 0, 0]} barSize={55} name="Male" />
                            <Bar dataKey="female" stackId="a" fill="rgba(240,192,64,0.72)" radius={[4, 4, 0, 0]} barSize={55} name="Female" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Approval Rate by Age Group - Line */}
            <motion.div variants={itemVariants} initial="hidden" animate="visible" className={`p-6 rounded-2xl border mb-10 transition-all ${isDark ? 'bg-[#111827]/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h2 className={`text-sm font-black tracking-tight mb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>Approval Rate by Age Group</h2>
                <p className={`text-[9px] font-bold uppercase tracking-widest mb-6 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>% of Applications Approved Per Age Band · Sample Size Shown</p>
                <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.ageDistribution.map(d => ({ ...d, label: `${d.band} (n=${d.count})` }))}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} opacity={0.6} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: tickColor }} dy={8} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: tickColor }} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                            <Tooltip contentStyle={tooltipStyles} formatter={(v: number) => [`${v.toFixed(1)}% approved`]} />
                            <Line
                                dataKey="approvalRate"
                                stroke="#34d399"
                                strokeWidth={2.5}
                                dot={{ fill: '#34d399', r: 5, strokeWidth: 0 }}
                                activeDot={{ r: 7 }}
                                fill="rgba(52,211,153,0.07)"
                                name="Approval Rate %"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Footer */}
            <div className={`border-t pt-4 mb-4 flex justify-between flex-wrap gap-3 ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    Nolt Finance · {isLoan ? 'Loan' : 'Investment'} Pipeline Demography Report
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    Profile Data · {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
            </div>

            {/* Floating Export Button */}
            <div className="fixed bottom-10 right-10 flex flex-col gap-4 items-end z-50">
                <AnimatePresence>
                    {isExporting && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border ${isDark ? 'bg-[#030712] border-slate-800 text-[#fbbf24]' : 'bg-white border-slate-200 text-amber-600 shadow-lg'}`}
                        >
                            Generating demography CSV...
                        </motion.div>
                    )}
                </AnimatePresence>
                <button
                    onClick={handleExportCsv}
                    disabled={isExporting}
                    className={`group flex items-center gap-4 px-8 py-4 rounded-full font-black text-[12px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 ${isDark ? 'bg-[#fbbf24] text-[#060b13] shadow-[0_15px_40px_rgba(251,191,36,0.3)]' : 'bg-slate-900 text-white shadow-[0_15px_40px_rgba(15,23,42,0.2)] hover:bg-slate-800'}`}
                >
                    <span className="material-symbols-outlined text-2xl">download</span>
                    {isExporting ? 'Processing' : 'Export Demography Data'}
                </button>
            </div>
        </>
    );
};

export default DemographyReportPage;
