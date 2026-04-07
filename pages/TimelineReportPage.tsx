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

const TimelineReportPage: React.FC<TimelineReportPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const [searchParams] = useSearchParams();
    const searchQuery = searchParams.get('search') || '';
    
    const [productType, setProductType] = useState<'LOAN' | 'INVESTMENT'>('LOAN');
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    
    const [summary, setSummary] = useState<SummaryStats>({ 
        approved: 0, pending: 0, rejected: 0, totalVolume: 0 
    });
    
    const [dailyApprovals, setDailyApprovals] = useState<any[]>([]);
    const [productMix, setProductMix] = useState<any[]>([]);
    const [performance, setPerformance] = useState<{ fastest: any[], slowest: any[] }>({ fastest: [], slowest: [] });
    const [stageVolume, setStageVolume] = useState<any[]>([]);

    const fetchAnalytics = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`/api/staff/reports/tat-summary?type=${productType}`, { withCredentials: true });
            if (response.data) {
                setSummary(response.data.summary);
                setDailyApprovals(response.data.dailyApprovals || []);
                setProductMix(response.data.productMix || []);
                setPerformance(response.data.performance || { fastest: [], slowest: [] });
                setStageVolume(response.data.stageVolume || []);
            }
        } catch (error) {
            console.error("Failed to fetch analytics data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [productType, searchQuery]);

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
    const isDark = theme === 'dark' || !theme; // Defaulting to dark if undefined as per existing style

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className={`min-h-screen -m-8 p-10 font-sans relative overflow-x-hidden transition-colors duration-500 ${isDark ? 'bg-[#060b13] text-slate-300' : 'bg-[#f8fafc] text-slate-600'}`}>
                
                {/* Header Section */}
                <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mb-8 flex flex-col md:flex-row justify-between items-start gap-4"
                >
                    <div>
                        <h1 className="text-3xl font-black text-[#fbbf24] tracking-tight uppercase mb-4 drop-shadow-sm flex items-center gap-3">
                            <span className="material-symbols-outlined text-3xl">insights</span>
                            {productType} ANALYTICS
                        </h1>
                        <div className={`flex p-1 rounded-xl border w-fit transition-colors ${isDark ? 'bg-[#111827] border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <button 
                                onClick={() => setProductType('LOAN')}
                                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${productType === 'LOAN' ? 'bg-[#fbbf24] text-[#060b13] shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Loans
                            </button>
                            <button 
                                onClick={() => setProductType('INVESTMENT')}
                                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${productType === 'INVESTMENT' ? 'bg-[#fbbf24] text-[#060b13] shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Investments
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <p className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors ${isDark ? 'text-slate-500 bg-slate-900/80 border-slate-800/50' : 'text-slate-400 bg-white border-slate-200 shadow-sm'}`}>
                            Snapshot: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                </motion.div>

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
                                            <span className={`text-[11px] font-black uppercase truncate max-w-[120px] transition-colors ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{app.name}</span>
                                        </div>
                                        <span className="text-[11px] font-black text-emerald-400 transition-colors">{app.tatHours}h</span>
                                    </div>
                                    <div className={`w-full h-1.5 rounded-full overflow-hidden transition-colors ${isDark ? 'bg-slate-950' : 'bg-slate-200'}`}>
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${Math.min(100, (app.tatHours / (performance.slowest[0]?.tatHours || 100)) * 100)}%` }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                            className="bg-emerald-500 h-full rounded-full"
                                        />
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
                                            <span className={`text-[11px] font-black uppercase truncate max-w-[120px] transition-colors ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{app.name}</span>
                                        </div>
                                        <span className="text-[11px] font-black text-rose-400 transition-colors">{(app.tatHours / 24).toFixed(1)} Days</span>
                                    </div>
                                    <div className={`w-full h-1.5 rounded-full overflow-hidden transition-colors ${isDark ? 'bg-slate-950' : 'bg-slate-200'}`}>
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: "100%" }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                            className="bg-rose-500 h-full rounded-full opacity-60"
                                        />
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

                {/* Floating Export Button */}
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
                        {isExporting ? 'Processing' : 'Export Demography Data'}
                    </button>
                </div>

            </div>
        </StaffLayout>
    );
};

export default TimelineReportPage;
