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
    const [entityFilter, setEntityFilter] = useState('all');
    const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

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

    const [officers, setOfficers] = useState<any[]>([]);
    
    const fetchOfficers = async () => {
        if (['sales_manager', 'admin', 'super_admin', 'superadmin'].includes(user.role || '')) {
            try {
                const response = await axios.get(`/api/staff/users?role=sales_officer&limit=200`, { withCredentials: true });
                setOfficers(response.data.users.filter((u: any) => u.is_active));
            } catch (error) {
                console.error("Failed to fetch officers", error);
            }
        }
    };

    const handleAssignOfficer = async (investmentId: string, officerId: string) => {
        if (!confirm("Are you sure you want to reassign this investment?")) return;
        try {
            await axios.patch(`/api/staff/investments/${investmentId}/assign`, {
                sales_officer_id: officerId
            }, { withCredentials: true });

            // Optimistic Update
            setAllInvestments(prev => prev.map(inv => {
                if (String(inv.id) === String(investmentId)) {
                    const officer = officers.find(o => String(o.id) === String(officerId));
                    return { ...inv, sales_officer_id: officerId, officer_name: officer?.full_name, officer_email: officer?.email };
                }
                return inv;
            }));
            alert("Investment reassigned successfully");
        } catch (error: any) {
            alert(error.response?.data?.message || "Reassignment failed");
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
            fetchOfficers();
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

    const handleTopUp = (inv: any) => {
        const plan = inv.investment_type?.includes('VAULT') ? 'VAULT' : inv.investment_type?.includes('SURGE') ? 'SURGE' : 'RISE';
        const draft = {
            id: `T-${Math.floor(Math.random() * 9000) + 1000}`,
            type: 'INVESTMENT',
            subStep: 0,
            label: inv.investment_type || 'NOLT Investment',
            data: { 
                isTopUp: true, 
                selectedPlan: plan,
                originalInvestmentId: inv.id,
                currency: inv.currency
            },
            updatedAt: Date.now()
        };
        
        // Navigate to customer investment flow with top-up data
        navigate('/investment', { state: { draft } });
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
                                ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            APPLICATIONS
                        </button>
                        <button
                            onClick={() => { setActiveTab('rate_guide'); handleCloseForm(); }}
                            className={`px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeTab === 'rate_guide'
                                ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm'
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
                        const matchesEntity = entityFilter === 'all' || inv.entity_type === entityFilter;

                        return matchesSearch && matchesStatus && matchesStage && matchesEntity;
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
                                <select 
                                    value={entityFilter}
                                    onChange={(e) => setEntityFilter(e.target.value)}
                                    className="px-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 outline-none"
                                >
                                    <option value="all">All Entities</option>
                                    <option value="INDIVIDUAL">Individual</option>
                                    <option value="CORPORATE">Corporate</option>
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 dark:bg-[#0f172a]/30 text-[10px] uppercase text-slate-500 font-black tracking-widest">
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        <th className="p-4 w-4"></th>
                                        <th className="p-4 min-w-[120px]">Reference</th>
                                        <th className="p-4 min-w-[200px]">Applicant</th>
                                        <th className="p-4 min-w-[150px]">Investment Plan</th>
                                        <th className="p-4 min-w-[150px]">Officer</th>
                                        <th className="p-4 min-w-[150px]">Status</th>
                                        <th className="p-4 min-w-[150px]">Stage</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredInvestments.length > 0 ? (
                                        filteredInvestments.map((inv) => (
                                            <tr key={inv.id} className={`group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-300 cursor-pointer ${inv.is_gift ? 'bg-rose-50/50 dark:bg-rose-900/10' : ''}`} onClick={() => navigate(`/staff/investments/${inv.id}`)}>
                                                <td className="p-4">
                                                    <div className={`size-4 rounded border transition-colors ${inv.is_gift ? 'border-rose-300 bg-rose-200' : 'border-slate-300 dark:border-slate-700'}`}>
                                                        {inv.is_gift && <span className="material-symbols-outlined text-rose-600 text-[10px] font-black">favorite</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-mono text-slate-900 dark:text-white text-xs font-bold text-nowrap">
                                                            INV-{inv.id}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-500 text-nowrap">
                                                            {new Date(inv.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`size-8 rounded-full flex items-center justify-center text-xs font-black border shrink-0 ${
                                                            inv.is_gift ? 'bg-rose-100 border-rose-200 text-rose-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white border-slate-300 dark:border-slate-700'
                                                        }`}>
                                                            {inv.company_name ? inv.company_name.charAt(0) : (inv.rep_full_name ? inv.rep_full_name.charAt(0) : '?')}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-slate-900 dark:text-white text-xs leading-none">
                                                                    {inv.company_name || inv.rep_full_name || 'Anonymous'}
                                                                </span>
                                                                <span className={`px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest leading-none ${
                                                                    inv.entity_type === 'CORPORATE' ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-500' : 'border-slate-400/20 bg-slate-400/10 text-slate-500 dark:text-slate-400'
                                                                }`}>
                                                                    {inv.entity_type === 'CORPORATE' ? 'CORP' : 'INDV'}
                                                                </span>
                                                                {inv.is_liquidating && (
                                                                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-500 text-white text-[8px] font-black uppercase tracking-tighter leading-none">
                                                                        <span className="material-symbols-outlined text-[8px]">warning</span>
                                                                        LIQ
                                                                    </span>
                                                                )}
                                                                {inv.is_gift && (
                                                                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-500 text-white text-[8px] font-black uppercase tracking-tighter leading-none">
                                                                        <span className="material-symbols-outlined text-[8px]">featured_seasonal</span>
                                                                        GIFT
                                                                    </span>
                                                                )}
                                                                {inv.original_investment_id && (
                                                                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-600 text-white text-[8px] font-black uppercase tracking-tighter shadow-sm leading-none">
                                                                        <span className="material-symbols-outlined text-[8px]">add_circle</span>
                                                                        TOP-UP
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-500 mt-1">
                                                                {inv.entity_type === 'CORPORATE' ? inv.rep_full_name : inv.customer_email}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-2 py-0.5 rounded border border-purple-500/20 bg-purple-500/10 text-[9px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider text-nowrap">
                                                                {inv.investment_type?.replace(/_/g, ' ') || 'INVESTMENT'}
                                                            </span>
                                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{inv.interest_rate}% P.A</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                            <span>{inv.currency === 'USD' ? '$' : '₦'}{Number(inv.investment_amount).toLocaleString()}</span>
                                                            <span className="size-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                                                            <span>{inv.tenure_days / 30} Mos</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-slate-700 dark:text-slate-300 font-bold text-xs" onClick={(e) => e.stopPropagation()}>
                                                    {['sales_manager', 'admin', 'super_admin', 'superadmin'].includes(user.role || '') ? (
                                                        <div className="relative group/assign w-fit">
                                                            <div className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                                                                <span className="material-symbols-outlined text-sm text-slate-400 dark:text-slate-500">person</span>
                                                                <span className="text-xs font-bold">{inv.officer_name || 'Unassigned'}</span>
                                                                <span className="material-symbols-outlined text-[10px] text-slate-400 ml-1 opacity-0 group-hover/assign:opacity-100">edit</span>
                                                            </div>
                                                            <select
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                value={inv.sales_officer_id || ''}
                                                                onChange={(e) => handleAssignOfficer(inv.id, e.target.value)}
                                                            >
                                                                <option value="" disabled>Select Officer</option>
                                                                {officers.map(officer => (
                                                                    <option key={officer.id} value={officer.id}>{officer.full_name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-slate-500 py-1.5">
                                                            <span className="material-symbols-outlined text-sm font-bold opacity-70">person</span>
                                                            <span className="text-xs font-bold">{inv.officer_name || 'Unassigned'}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-2 w-fit">
                                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded uppercase tracking-wider text-[9px] font-black border ${
                                                            inv.status === 'active' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                                            inv.status === 'completed' ? 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400' :
                                                            inv.status === 'rejected' || inv.status === 'terminated' ? 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                                                            'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-500'
                                                        }`}>
                                                            <span className={`size-1.5 rounded-full ${
                                                                inv.status === 'active' ? 'bg-emerald-500' :
                                                                inv.status === 'completed' ? 'bg-sky-500' :
                                                                inv.status === 'rejected' || inv.status === 'terminated' ? 'bg-rose-500' :
                                                                'bg-amber-500'
                                                            }`}></span>
                                                            {inv.status || 'pending'}
                                                        </div>
                                                        {/* <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate max-w-[120px]">
                                                            {inv.stage?.replace(/_/g, ' ') || 'Submitted'}
                                                        </span> */}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-2 w-fit">
                                                        {/* <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded uppercase tracking-wider text-[9px] font-black border ${
                                                            inv.status === 'active' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                                            inv.status === 'completed' ? 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400' :
                                                            inv.status === 'rejected' || inv.status === 'terminated' ? 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                                                            'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-500'
                                                        }`}>
                                                            <span className={`size-1.5 rounded-full ${
                                                                inv.status === 'active' ? 'bg-emerald-500' :
                                                                inv.status === 'completed' ? 'bg-sky-500' :
                                                                inv.status === 'rejected' || inv.status === 'terminated' ? 'bg-rose-500' :
                                                                'bg-amber-500'
                                                            }`}></span>
                                                            {inv.status || 'pending'}
                                                        </div> */}
                                                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate max-w-[120px]">
                                                            {inv.stage?.replace(/_/g, ' ') || 'Submitted'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    {(inv.status === 'active' || inv.status === 'completed') && (user?.role?.toLowerCase() === 'finance' || user?.role?.toLowerCase() === 'superadmin' || user?.role?.toLowerCase() === 'super_admin') ? (
                                                        <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                                                            <button 
                                                                onClick={() => setOpenDropdownId(openDropdownId === inv.id ? null : inv.id)}
                                                                className={`p-2 rounded-xl transition-all ${openDropdownId === inv.id ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-purple-600'}`}
                                                            >
                                                                <span className="material-symbols-outlined text-xl">more_vert</span>
                                                            </button>

                                                            {openDropdownId === inv.id && (
                                                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                                                    <div className="px-4 py-2 mb-1 border-b border-slate-50 dark:border-slate-700/50">
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Management</p>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => {
                                                                            setOpenDropdownId(null);
                                                                            handleTopUp(inv);
                                                                        }}
                                                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-500 transition-all uppercase tracking-widest group"
                                                                    >
                                                                        <div className="size-7 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors text-emerald-500">
                                                                            <span className="material-symbols-outlined text-base">add_circle</span>
                                                                        </div>
                                                                        Top-Up
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => {
                                                                            setOpenDropdownId(null);
                                                                            navigate(`/staff/investments/${inv.id}`);
                                                                        }}
                                                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-blue-500/10 hover:text-blue-500 transition-all uppercase tracking-widest group border-t border-slate-50 dark:border-slate-700/50"
                                                                    >
                                                                        <div className="size-7 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-white transition-colors text-blue-500">
                                                                            <span className="material-symbols-outlined text-base">visibility</span>
                                                                        </div>
                                                                        View Details
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/staff/investments/${inv.id}`); }}
                                                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-600 transition-all"
                                                        >
                                                            <span className="material-symbols-outlined text-xl">visibility</span>
                                                        </button>
                                                    )}
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
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Tenure (Days)</label>
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            placeholder="e.g. 30"
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
