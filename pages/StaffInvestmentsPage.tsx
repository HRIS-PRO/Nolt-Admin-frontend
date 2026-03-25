import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import StaffLayout from '../components/layouts/StaffLayout';

interface StaffInvestmentsPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const StaffInvestmentsPage: React.FC<StaffInvestmentsPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'applications' | 'rate_guide'>('applications');
    const [showAddRateForm, setShowAddRateForm] = useState(false);
    const [isInfinity, setIsInfinity] = useState(false);
    const [rates, setRates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [stageFilter, setStageFilter] = useState('all');

    const initialFormData = {
        plan: 'NOLT Rise',
        currency: 'NGN',
        tenure: '',
        minAmount: '',
        maxAmount: '',
        interest: ''
    };

    const currencySymbols: Record<string, string> = {
        NGN: '₦',
        USD: '$',
        GBP: '£',
        EUR: '€'
    };

    const [formData, setFormData] = useState(initialFormData);

    const handleCloseForm = () => {
        setShowAddRateForm(false);
        setFormData(initialFormData);
        setIsInfinity(false);
        setEditingId(null);
    };

    const [allInvestments, setAllInvestments] = useState<any[]>([]);

    const fetchInvestments = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/staff/investments');
            setAllInvestments(response.data);
        } catch (error) {
            console.error('Error fetching investments:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRates = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/yield-rates');
            setRates(response.data);
        } catch (error) {
            console.error('Error fetching rates:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'rate_guide') {
            fetchRates();
        } else {
            fetchInvestments();
        }
    }, [activeTab]);

    const handleActivateYieldRate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const min = parseFloat(formData.minAmount);
            const max = isInfinity ? null : parseFloat(formData.maxAmount);

            if (max !== null && max < min) {
                alert(`Maximum amount cannot be less than Minimum amount (${currencySymbols[formData.currency]}${min.toLocaleString()})`);
                setIsSubmitting(false);
                return;
            }

            const payload = {
                plan_name: formData.plan,
                currency: formData.currency,
                tenure_months: formData.tenure,
                min_amount: formData.minAmount,
                max_amount: max,
                interest_rate: formData.interest
            };

            if (editingId) {
                await axios.put(`/api/yield-rates/${editingId}`, payload);
            } else {
                await axios.post('/api/yield-rates', payload);
            }

            fetchRates();
            handleCloseForm();
        } catch (error: any) {
            console.error('Error saving yield rate:', error);
            const message = error.response?.data?.message || 'Failed to save yield rate. Please check console for details.';
            alert(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditRate = (rate: any) => {
        setFormData({
            plan: rate.plan_name,
            currency: rate.currency,
            tenure: rate.tenure_months.toString(),
            minAmount: rate.min_amount.toString(),
            maxAmount: rate.max_amount ? rate.max_amount.toString() : '',
            interest: rate.interest_rate.toString()
        });
        setIsInfinity(!rate.max_amount);
        setEditingId(rate.id);
        setShowAddRateForm(true);
    };

    const handleDuplicateRate = async (rate: any) => {
        try {
            const payload = {
                plan_name: rate.plan_name,
                currency: rate.currency,
                tenure_months: 1,
                min_amount: 1,
                max_amount: 2,
                interest_rate: 1
            };

            await axios.post('/api/yield-rates', payload);
            fetchRates();
            alert(`Draft duplicated for ${rate.plan_name} (${rate.currency}). You can now edit its details.`);
        } catch (error: any) {
            console.error('Error duplicating rate:', error);
            const message = error.response?.data?.message || 'Failed to duplicate rate.';
            alert(message);
        }
    };

    const handleDeleteRate = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this yield rate?')) {
            try {
                await axios.delete(`/api/yield-rates/${id}`);
                fetchRates();
            } catch (error) {
                console.error('Error deleting rate:', error);
                alert('Failed to delete rate.');
            }
        }
    };

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className="space-y-8">
                {/* Header with Tabs */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                            Investments
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                            Manage investment portfolios and rates.
                        </p>
                    </div>
                    <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl backdrop-blur-sm shadow-inner">
                        <button
                            onClick={() => { setActiveTab('applications'); handleCloseForm(); }}
                            className={`px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeTab === 'applications'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            APPLICATIONS
                        </button>
                        <button
                            onClick={() => { setActiveTab('rate_guide'); handleCloseForm(); }}
                            className={`px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeTab === 'rate_guide'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            RATE GUIDE
                        </button>
                    </div>
                </div>

                {activeTab === 'applications' ? (() => {
                    const filteredInvestments = allInvestments.filter(inv => {
                        const matchesSearch = !searchQuery || 
                            (inv.rep_full_name && inv.rep_full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (inv.customer_name && inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (inv.id && inv.id.toString().includes(searchQuery));
                        
                        const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
                        const matchesStage = stageFilter === 'all' || (inv.stage || 'submitted') === stageFilter;

                        return matchesSearch && matchesStatus && matchesStage;
                    });

                    return (
                    <div className="bg-white dark:bg-[#1e293b] rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center bg-slate-50 dark:bg-[#0f172a]/50 gap-4">
                            <div>
                                <h3 className="font-black text-lg text-slate-900 dark:text-white">All Investments</h3>
                                <p className="text-slate-500 text-xs font-medium"> Total: {filteredInvestments.length} matching applications</p>
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                    <input 
                                        type="text" 
                                        placeholder="Search name or ID..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold w-48 focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                                <select 
                                    value={stageFilter}
                                    onChange={(e) => setStageFilter(e.target.value)}
                                    className="px-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 outline-none"
                                >
                                    <option value="all">All Stages</option>
                                    <option value="submitted">Submitted</option>
                                    <option value="compliance_review">Compliance</option>
                                    <option value="finance_review">Finance</option>
                                    <option value="active">Active</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 outline-none"
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="terminated">Terminated</option>
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 dark:bg-[#0f172a]/30 text-xs uppercase text-slate-500 font-black tracking-wider">
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        <th className="p-4 w-4"></th>
                                        <th className="p-4">Reference ID</th>
                                        <th className="p-4">Applicant</th>
                                        <th className="p-4">Investment Plan</th>
                                        <th className="p-4">Principal Amount</th>
                                        <th className="p-4 text-center">Interest</th>
                                        <th className="p-4">Tenure</th>
                                        <th className="p-4">Application Date</th>
                                        <th className="p-4">Stage</th>
                                        <th className="p-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredInvestments.length > 0 ? (
                                        filteredInvestments.map((inv) => (
                                            <tr key={inv.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-300 cursor-pointer" onClick={() => navigate(`/staff/investments/${inv.id}`)}>
                                                <td className="p-4">
                                                    <div className="size-4 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center transition-colors"></div>
                                                </td>
                                                <td className="p-4 font-mono text-slate-500 dark:text-slate-400 text-xs text-nowrap">
                                                    INV-{inv.id}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 shrink-0">
                                                            {inv.rep_full_name ? inv.rep_full_name.charAt(0) : (inv.customer_name ? inv.customer_name.charAt(0) : '?')}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900 dark:text-white text-xs">
                                                                {inv.rep_full_name || inv.customer_name || 'Individual'}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-500 lowercase">{inv.customer_email || 'No email'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 rounded border border-purple-500/20 bg-purple-500/10 text-[10px] font-black uppercase text-purple-500 dark:text-purple-400 tracking-wider text-nowrap">
                                                        {inv.investment_type?.replace(/_/g, ' ') || 'INVESTMENT'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-black text-slate-900 dark:text-white tracking-tight text-sm">
                                                        {inv.currency === 'USD' ? '$' : '₦'}{Number(inv.investment_amount).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">{inv.interest_rate}% P.A</span>
                                                </td>
                                                <td className="p-4 font-bold text-slate-600 dark:text-slate-300 text-xs text-nowrap">
                                                    {inv.tenure_days / 30} Months
                                                </td>
                                                <td className="p-4 text-slate-500 text-xs text-nowrap">
                                                    {new Date(inv.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider text-nowrap">
                                                        {inv.stage?.replace(/_/g, ' ') || 'Submitted'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className={`flex items-center gap-2 px-2 py-1 rounded border w-fit text-[10px] font-bold uppercase tracking-widest ${
                                                        inv.status === 'active' ? 'border-green-500/20 bg-green-500/10 text-green-500' :
                                                        inv.status === 'completed' ? 'border-blue-500/20 bg-blue-500/10 text-blue-500' :
                                                        inv.status === 'terminated' ? 'border-red-500/20 bg-red-500/10 text-red-500' :
                                                        'border-orange-500/20 bg-orange-500/10 text-orange-500'
                                                    }`}>
                                                        <span className={`size-1.5 rounded-full ${
                                                            inv.status === 'active' ? 'bg-green-500' :
                                                            inv.status === 'completed' ? 'bg-blue-500' :
                                                            inv.status === 'terminated' ? 'bg-red-500' :
                                                            'bg-orange-500'
                                                        }`}></span>
                                                        {inv.status || 'pending'}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3 text-slate-400">
                                                    <span className="material-symbols-outlined text-4xl">inbox</span>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">No investment applications found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })() : (
                    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Left Side: Rates Table */}
                        <div className="flex-1 bg-white dark:bg-[#1e293b]/50 rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden backdrop-blur-md">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Rates</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manage investment product yields</p>
                                </div>
                                <button
                                    onClick={() => setShowAddRateForm(true)}
                                    className="px-6 py-3 rounded-2xl bg-blue-600 text-white text-xs font-black lg:flex items-center gap-3 hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 active:scale-95 uppercase tracking-widest"
                                >
                                    <span className="material-symbols-outlined text-sm">add</span>
                                    Add New Rate
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                                            <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Plan</th>
                                            <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Range (₦)</th>
                                            <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Tenure</th>
                                            <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Interest</th>
                                            <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {rates.length > 0 ? (
                                            rates.map((rate) => (
                                                <tr key={rate.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`size-2 rounded-full ${rate.plan_name === 'NOLT Rise' ? 'bg-blue-500' : rate.plan_name === 'NOLT Surge' ? 'bg-purple-500' : 'bg-orange-500'}`} />
                                                            <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">{rate.plan_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 font-bold text-slate-600 dark:text-slate-300 text-sm">
                                                        {currencySymbols[rate.currency]}{Number(rate.min_amount).toLocaleString()} - {rate.max_amount ? `${currencySymbols[rate.currency]}${Number(rate.max_amount).toLocaleString()}` : '∞'}
                                                    </td>
                                                    <td className="px-8 py-6 font-bold text-slate-600 dark:text-slate-300 text-sm">
                                                        {rate.tenure_months} Months
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className="px-3 py-1.5 rounded-lg border border-green-500/30 bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest">
                                                            {rate.interest_rate}% P.A
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleDuplicateRate(rate)}
                                                                className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors flex items-center justify-center"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">content_copy</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleEditRate(rate)}
                                                                className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors flex items-center justify-center"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">edit</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteRate(rate.id)}
                                                                className="size-8 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">delete</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-8 py-20 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                                    {loading ? 'Loading rates...' : 'No yield rates configured'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Right Side: Rate Management Info Card */}
                        <div className="w-full lg:w-80 space-y-6">
                            <div className="bg-slate-900 dark:bg-[#1e293b] rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <span className="material-symbols-outlined text-8xl">trending_up</span>
                                </div>
                                <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                                    <div className="size-16 rounded-[22px] bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                        <span className="material-symbols-outlined text-3xl">info</span>
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-xl font-black uppercase tracking-tight text-white leading-none">Rate Management</h3>
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                            Select a rate from the list to modify its parameters. Changes will be reflected immediately on the customer-facing portal.
                                        </p>
                                    </div>
                                    <div className="w-full pt-6 border-t border-slate-800 space-y-4 font-black uppercase tracking-widest text-[9px]">
                                        <div className="flex justify-between items-center text-slate-500">
                                            <span>Last Updated</span>
                                            <span className="text-white">TODAY, 10:42 AM</span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-500">
                                            <span>Active Plans</span>
                                            <span className="text-white">2 Products</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add New Rate Form / Modal Overlay */}
            {showAddRateForm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseForm} />
                    <div className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-300 text-slate-900 dark:text-white">
                        <div className="p-10 space-y-10">
                            <div className="flex justify-between items-center px-2">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tight">{editingId ? 'EDIT YIELD RATE' : 'ADD NEW RATE'}</h3>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Configure investment parameters</p>
                                </div>
                                <button onClick={handleCloseForm} className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl">close</span>
                                </button>
                            </div>

                            <form className="space-y-8" onSubmit={handleActivateYieldRate}>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Investment Plan</label>
                                        <select
                                            value={formData.plan}
                                            onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                                            className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                                        >
                                            <option>NOLT Rise</option>
                                            <option>NOLT Surge</option>
                                            <option>NOLT Vault</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Currency</label>
                                        <select
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                            className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="NGN">NGN (₦)</option>
                                            <option value="USD">USD ($)</option>
                                            <option value="GBP">GBP (£)</option>
                                            <option value="EUR">EUR (€)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Tenure (Months)</label>
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            placeholder="e.g. 12"
                                            value={formData.tenure}
                                            onChange={(e) => setFormData({ ...formData, tenure: e.target.value })}
                                            className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Annual Interest Rate (%)</label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="e.g. 14.5"
                                                value={formData.interest}
                                                onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                                                className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-500 font-black text-xs uppercase">% P.A</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Investment Range ({currencySymbols[formData.currency]})</label>
                                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsInfinity(!isInfinity)}>
                                            <div className={`size-4 rounded border transition-all flex items-center justify-center ${isInfinity ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-700'}`}>
                                                {isInfinity && <span className="material-symbols-outlined text-white text-[10px] font-bold">check</span>}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500 transition-colors">Infinity</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbols[formData.currency]}</span>
                                            <input
                                                required
                                                type="number"
                                                min="0"
                                                placeholder="Min Amount"
                                                value={formData.minAmount}
                                                onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                                                className="w-full h-14 pl-10 pr-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbols[formData.currency]}</span>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder={isInfinity ? "∞" : "Max Amount"}
                                                disabled={isInfinity}
                                                value={isInfinity ? '' : formData.maxAmount}
                                                onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                                                className={`w-full h-14 pl-10 pr-5 rounded-2xl border-none outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isInfinity ? 'bg-slate-100 dark:bg-slate-900/50 text-slate-400 cursor-not-allowed opacity-50' : 'bg-slate-50 dark:bg-slate-800'}`}
                                            />
                                        </div>
                                    </div>
                                </div>


                                <div className="pt-6 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={handleCloseForm}
                                        className="flex-1 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-[10px]"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] h-14 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:bg-blue-500 transition-all active:scale-95 text-xs"
                                    >
                                        {isSubmitting ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update Rate' : 'Create New Rate')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </StaffLayout>
    );
};

export default StaffInvestmentsPage;
