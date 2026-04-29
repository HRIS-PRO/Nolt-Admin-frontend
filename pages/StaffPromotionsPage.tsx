import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StaffLayout from '../components/layouts/StaffLayout';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Promotion {
    id: number;
    utm_campaign: string;
    target_product: string;
    utm_source: string | null;
    utm_medium: string | null;
    benefit_value: number | null;
    expiry_date: string | null;
    max_redemptions: number | null;
    current_redemptions: number;
    clicks: number;
    unique_code: string;
    created_at: string;
}

interface PromoUser {
    customer_id: number;
    full_name: string;
    email: string;
    phone_number: string;
    avatar_url: string | null;
    registered_at: string;
    used_code: string;
    hear_about_us: string;
    marketing_created_at: string;
    investments: { investment_id: number; product_type: string; amount: number; status: string; investment_date: string }[];
    loans: { loan_id: number; amount: number; status: string; loan_date: string }[];
}

interface StaffPromotionsPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const StaffPromotionsPage: React.FC<StaffPromotionsPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);
    const [promoUsers, setPromoUsers] = useState<PromoUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [showUsersDrawer, setShowUsersDrawer] = useState(false);

    // Form data
    const [formData, setFormData] = useState({
        utm_campaign: '',
        target_product: 'ALL_PRODUCTS',
        utm_source: 'nolt_marketing',
        utm_medium: 'link',
        custom_source: '',
        custom_medium: '',
        max_redemptions: '',
        isInfinityExpiry: true,
        expiry_date: ''
    });

    const fetchPromotions = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/promotions', { withCredentials: true });
            setPromotions(response.data);
        } catch (error) {
            console.error('Error fetching promotions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPromotions();

        // Setup socket listener for real-time clicks
        const socketPath = ''; // Use proxy
        const socket = io(socketPath, { 
            withCredentials: true,
            transports: ['websocket', 'polling']
        });

        socket.on('promotion_click', (data: { utm_campaign: string, clicks: number, current_redemptions: number }) => {
            setPromotions(prev => prev.map(p => 
                p.utm_campaign === data.utm_campaign 
                    ? { ...p, clicks: data.clicks, current_redemptions: data.current_redemptions } 
                    : p
            ));
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const handleSavePromotion = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                utm_campaign: formData.utm_campaign,
                target_product: formData.target_product,
                utm_source: formData.utm_source === 'others' ? formData.custom_source : formData.utm_source,
                utm_medium: formData.utm_medium === 'others' ? formData.custom_medium : formData.utm_medium,
                benefit_value: null,
                expiry_date: formData.isInfinityExpiry ? null : formData.expiry_date,
                max_redemptions: formData.max_redemptions ? parseInt(formData.max_redemptions) : null
            };

            if (editingPromo) {
                await axios.put(`/api/promotions/${editingPromo.id}`, payload, { withCredentials: true });
            } else {
                await axios.post('/api/promotions', payload, { withCredentials: true });
            }
            
            setShowCreateModal(false);
            setEditingPromo(null);
            fetchPromotions();
            setFormData({
                utm_campaign: '',
                target_product: 'ALL_PRODUCTS',
                utm_source: 'nolt_marketing',
                utm_medium: 'link',
                custom_source: '',
                custom_medium: '',
                max_redemptions: '',
                isInfinityExpiry: true,
                expiry_date: ''
            });
        } catch (error: any) {
            console.error('Error saving promotion:', error);
            alert(error.response?.data?.message || 'Failed to save promotion');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (promo: Promotion) => {
        const standardSources = ['nolt_marketing', 'social_media', 'partner', 'direct', 'referral_link'];
        const standardMediums = ['email', 'sms', 'link', 'social', 'referral_link'];
        
        const sourceIsOther = promo.utm_source && !standardSources.includes(promo.utm_source);
        const mediumIsOther = promo.utm_medium && !standardMediums.includes(promo.utm_medium);

        setEditingPromo(promo);
        setFormData({
            utm_campaign: promo.utm_campaign,
            target_product: promo.target_product,
            utm_source: sourceIsOther ? 'others' : (promo.utm_source || 'nolt_marketing'),
            utm_medium: mediumIsOther ? 'others' : (promo.utm_medium || 'link'),
            custom_source: sourceIsOther ? promo.utm_source! : '',
            custom_medium: mediumIsOther ? promo.utm_medium! : '',
            max_redemptions: promo.max_redemptions?.toString() || '',
            isInfinityExpiry: !promo.expiry_date,
            expiry_date: promo.expiry_date ? new Date(promo.expiry_date).toISOString().split('T')[0] : ''
        });
        setShowCreateModal(true);
    };

    const openCreateModal = () => {
        setEditingPromo(null);
        setFormData({
            utm_campaign: '',
            target_product: 'ALL_PRODUCTS',
            utm_source: 'nolt_marketing',
            utm_medium: 'link',
            custom_source: '',
            custom_medium: '',
            max_redemptions: '',
            isInfinityExpiry: true,
            expiry_date: ''
        });
        setShowCreateModal(true);
    };

    const handleDeletePromotion = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this promotion? This action cannot be undone.')) return;
        try {
            await axios.delete(`/api/promotions/${id}`, { withCredentials: true });
            fetchPromotions();
        } catch (error: any) {
            console.error('Error deleting promotion:', error);
            alert(error.response?.data?.message || "Failed to delete promotion");
        }
    };

    const copyLink = (promo: Promotion) => {
        const link = `${window.location.origin}/register?utm_campaign=${encodeURIComponent(promo.utm_campaign)}&utm_medium=${encodeURIComponent(promo.utm_medium || '')}&utm_source=${encodeURIComponent(promo.utm_source || '')}&target_product=${encodeURIComponent(promo.target_product)}&ref=${encodeURIComponent(promo.unique_code || '')}`;
        navigator.clipboard.writeText(link);
        alert('Copied to clipboard!');
    };

    const fetchPromoUsers = async (promo: Promotion) => {
        setSelectedPromo(promo);
        setShowUsersDrawer(true);
        setLoadingUsers(true);
        setPromoUsers([]);
        try {
            const response = await axios.get(`/api/promotions/${promo.id}/users`, { withCredentials: true });
            setPromoUsers(response.data.users || []);
        } catch (error) {
            console.error('Error fetching promo users:', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const closeUsersDrawer = () => {
        setShowUsersDrawer(false);
        setTimeout(() => { setSelectedPromo(null); setPromoUsers([]); }, 300);
    };

    const exportUsersCSV = (promo: Promotion, users: PromoUser[]) => {
        if (users.length === 0) return;
        const headers = ['Name', 'Email', 'Phone', 'Code Used', 'Registered', 'Source', 'Investments', 'Loans'];
        const rows = users.map(u => [
            u.full_name || '',
            u.email || '',
            u.phone_number || '',
            u.used_code || '',
            u.registered_at ? new Date(u.registered_at).toLocaleDateString() : '',
            u.hear_about_us || '',
            u.investments.length.toString(),
            u.loans.length.toString()
        ]);
        const csvContent = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${promo.utm_campaign}_users_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Campaign Promotions</h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Track marketing links and conversions</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={openCreateModal}
                        className="h-12 px-6 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        New Promotion Link
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {/* Active Campaigns */}
                    <div className="bg-white dark:bg-[#1e293b] rounded-[24px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
                        <div className="size-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <span className="material-symbols-outlined text-3xl">campaign</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Campaigns</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                                {promotions.filter(p => !p.expiry_date || new Date(p.expiry_date) >= new Date()).length}
                            </h3>
                        </div>
                    </div>

                    {/* Total Redemptions (Clicks) */}
                    <div className="bg-white dark:bg-[#1e293b] rounded-[24px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
                        <div className="size-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <span className="material-symbols-outlined text-3xl">ads_click</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Redemptions</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                                {promotions.reduce((sum, p) => sum + (p.clicks || 0), 0).toLocaleString()}
                            </h3>
                        </div>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="bg-white dark:bg-[#1e293b] rounded-[32px] p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                ) : promotions.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="size-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <span className="material-symbols-outlined text-4xl">campaign</span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">No Promotions</h3>
                        <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto mt-2">
                            You haven't created any marketing promotions yet.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-widest">Campaign & Code</th>
                                    <th className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-widest">UTM Source</th>
                                    <th className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-widest">UTM Medium</th>
                                    <th className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-widest">Benefit</th>
                                    <th className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-widest">Product Target</th>
                                    <th className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-widest">Redemptions</th>
                                    <th className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-widest">Expiry</th>
                                    <th className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                                    <th className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {promotions.map((promo) => {
                                    const isExpired = promo.expiry_date && new Date(promo.expiry_date) < new Date();
                                    const progress = promo.max_redemptions ? (promo.current_redemptions / promo.max_redemptions) * 100 : 0;
                                    
                                    return (
                                        <tr key={promo.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-4 py-4 border-b border-slate-50 dark:border-slate-800/50">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 dark:text-white">{promo.utm_campaign}</span>
                                                    <span className="text-xs font-mono text-purple-600 dark:text-purple-400 font-bold tracking-wider">{promo.unique_code}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-5 border-b border-slate-100 dark:border-slate-800">
                                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                    {promo.utm_source || 'Organic'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-5 border-b border-slate-100 dark:border-slate-800">
                                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                    {promo.utm_medium || 'Organic'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-5 border-b border-slate-100 dark:border-slate-800">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${promo.benefit_value ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-slate-50 text-slate-400 dark:bg-slate-800'}`}>
                                                    {promo.benefit_value ? `+${promo.benefit_value}%` : 'None'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-5 border-b border-slate-100 dark:border-slate-800">
                                                <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase">
                                                    {promo.target_product.replace('NOLT_', '').replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-5 border-b border-slate-100 dark:border-slate-800">
                                                <div className="flex flex-col gap-1.5 min-w-[140px]">
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                                        <span className="text-slate-400">{promo.clicks} Used</span>
                                                        <span className="text-slate-500">{promo.max_redemptions ? `${promo.max_redemptions} Limit` : '∞ Limit'}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-500 rounded-full ${isExpired ? 'bg-slate-400' : 'bg-blue-500'}`}
                                                            style={{ width: `${Math.min(100, progress || (promo.max_redemptions ? 0 : 100))}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-5 border-b border-slate-100 dark:border-slate-800">
                                                <span className="text-xs text-slate-500 font-black tracking-tight">
                                                    {promo.expiry_date ? new Date(promo.expiry_date).toLocaleDateString('sv-SE') : '∞ INDEFINITE'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-5 border-b border-slate-100 dark:border-slate-800">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${isExpired ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'}`}>
                                                    {isExpired ? 'EXPIRED' : 'ACTIVE'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-5 border-b border-slate-100 dark:border-slate-800 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => fetchPromoUsers(promo)}
                                                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-600 hover:shadow-md transition-all inline-flex items-center"
                                                        title="View Users"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">group</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => copyLink(promo)}
                                                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-purple-600 hover:shadow-md transition-all inline-flex items-center"
                                                        title="Copy Tracking Link"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => openEditModal(promo)}
                                                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-500 hover:shadow-md transition-all inline-flex items-center"
                                                        title="Edit Promotion"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </button>
                                                    {user?.role === 'super_admin' && (
                                                        <button 
                                                            onClick={() => handleDeletePromotion(promo.id)}
                                                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:shadow-md transition-all inline-flex items-center"
                                                            title="Delete Promotion"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
                    <div className="relative w-full max-w-2xl bg-[#1e293b] rounded-[32px] shadow-2xl p-8 border border-slate-700/50 animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
                        
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">{editingPromo ? 'Edit Promotion' : 'Create Promotion'}</h2>
                                <p className="text-xs text-slate-400 mt-1 font-medium">{editingPromo ? 'Modify the campaign parameters and limits.' : 'Define the code behavior and application constraints.'}</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSavePromotion} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                            
                            {/* CAMPAIGN IDENTITY */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
                                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Campaign Identity</h3>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase text-slate-400">UTM Campaign (Code)</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="E.G. FLASH50"
                                            value={formData.utm_campaign}
                                            onChange={e => setFormData({ ...formData, utm_campaign: e.target.value.replace(/\s+/g, '_').toUpperCase() })}
                                            className="w-full h-12 px-4 rounded-xl bg-slate-800/80 border border-slate-700/50 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-bold text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase text-slate-400">Target Product</label>
                                        <div className="relative">
                                            <select
                                                value={formData.target_product}
                                                onChange={e => setFormData({ ...formData, target_product: e.target.value })}
                                                className="w-full h-12 px-4 rounded-xl bg-slate-800/80 border border-slate-700/50 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-bold text-xs appearance-none"
                                            >
                                                <option value="ALL_PRODUCTS">All Products</option>
                                                <option value="IPPIS">IPPIS</option>
                                                <option value="NOLT_RISE">NOLT Rise</option>
                                                <option value="NOLT_VAULT">NOLT Vault</option>
                                                <option value="NOLT_SURGE">NOLT Surge</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-3.5 text-slate-400 pointer-events-none text-lg">expand_more</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ATTRIBUTION (UTM) */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-3 bg-emerald-500 rounded-full"></div>
                                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Attribution (UTM)</h3>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase text-slate-400">UTM Source</label>
                                        <div className="relative">
                                            <select
                                                value={formData.utm_source}
                                                onChange={e => setFormData({ ...formData, utm_source: e.target.value })}
                                                className="w-full h-12 px-4 rounded-xl bg-slate-800/80 border border-slate-700/50 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-bold text-xs appearance-none"
                                            >
                                                <option value="nolt_marketing">NEWSLETTER</option>
                                                <option value="social_media">SOCIAL MEDIA</option>
                                                <option value="partner">PARTNER</option>
                                                <option value="direct">DIRECT</option>
                                                <option value="referral_link">REFERRAL LINK</option>
                                                <option value="others">OTHERS</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-3.5 text-slate-400 pointer-events-none text-lg">expand_more</span>
                                        </div>
                                        {formData.utm_source === 'others' && (
                                            <div className="mt-2 animate-in slide-in-from-top-2 duration-200">
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Enter custom source..."
                                                    value={formData.custom_source}
                                                    onChange={e => setFormData({ ...formData, custom_source: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                                    className="w-full h-10 px-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-bold text-xs"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase text-slate-400">UTM Medium</label>
                                        <div className="relative">
                                            <select
                                                value={formData.utm_medium}
                                                onChange={e => setFormData({ ...formData, utm_medium: e.target.value })}
                                                className="w-full h-12 px-4 rounded-xl bg-slate-800/80 border border-slate-700/50 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-bold text-xs appearance-none"
                                            >
                                                <option value="email">EMAIL</option>
                                                <option value="sms">SMS</option>
                                                <option value="link">LINK</option>
                                                <option value="social">SOCIAL</option>
                                                <option value="referral_link">REFERRAL LINK</option>
                                                <option value="others">OTHERS</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-3.5 text-slate-400 pointer-events-none text-lg">expand_more</span>
                                        </div>
                                        {formData.utm_medium === 'others' && (
                                            <div className="mt-2 animate-in slide-in-from-top-2 duration-200">
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Enter custom medium..."
                                                    value={formData.custom_medium}
                                                    onChange={e => setFormData({ ...formData, custom_medium: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                                    className="w-full h-10 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-bold text-xs"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* RULES & CONSTRAINTS */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-3 bg-amber-500 rounded-full"></div>
                                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Rules & Constraints</h3>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 opacity-50 pointer-events-none">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[9px] font-black uppercase text-slate-400">Benefit Value</label>
                                            <div className="flex items-center gap-1.5">
                                                <input type="checkbox" checked={true} readOnly className="size-3 rounded-sm border-slate-600 bg-slate-700 text-slate-500 focus:ring-0" />
                                                <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Null</span>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            disabled
                                            value="-0.5% or ₦0.00"
                                            className="w-full h-12 px-4 rounded-xl bg-slate-800/50 border border-slate-700/30 text-slate-400 font-bold text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[9px] font-black uppercase text-slate-400">Expiry Date</label>
                                            <div className="flex items-center gap-1.5">
                                                <input 
                                                    type="checkbox" 
                                                    checked={formData.isInfinityExpiry}
                                                    onChange={(e) => setFormData({...formData, isInfinityExpiry: e.target.checked})}
                                                    className="size-3 rounded-sm border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900" 
                                                />
                                                <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Infinity</span>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                disabled={formData.isInfinityExpiry}
                                                required={!formData.isInfinityExpiry}
                                                value={formData.expiry_date}
                                                onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                                                className={`w-full h-12 px-4 rounded-xl border transition-all font-bold text-xs ${formData.isInfinityExpiry ? 'bg-slate-800/50 border-slate-700/30 text-slate-500' : 'bg-slate-800/80 border-slate-700/50 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500'} appearance-none`}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[9px] font-black uppercase text-slate-400">Max Redemptions</label>
                                            <div className="flex items-center gap-1.5">
                                                <input 
                                                    type="checkbox" 
                                                    checked={formData.max_redemptions === ''}
                                                    onChange={(e) => setFormData({...formData, max_redemptions: e.target.checked ? '' : '1000'})}
                                                    className="size-3 rounded-sm border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900" 
                                                />
                                                <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Infinity</span>
                                            </div>
                                        </div>
                                        <input
                                            type="number"
                                            disabled={formData.max_redemptions === ''}
                                            value={formData.max_redemptions}
                                            onChange={e => setFormData({ ...formData, max_redemptions: e.target.value })}
                                            className={`w-full h-12 px-4 rounded-xl border transition-all font-bold text-xs ${formData.max_redemptions === '' ? 'bg-slate-800/50 border-slate-700/30 text-slate-500' : 'bg-slate-800/80 border-slate-700/50 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500'} appearance-none`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* DOCUMENTATION */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-3 bg-slate-500 rounded-full"></div>
                                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Documentation</h3>
                                </div>
                                
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase text-slate-400">Campaign Description</label>
                                    <textarea
                                        placeholder="Explain the purpose of this code for audit logs..."
                                        className="w-full h-24 p-4 rounded-xl bg-slate-800/80 border border-slate-700/50 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-xs resize-none"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="pt-6 flex justify-end items-center gap-4 border-t border-slate-800/60">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-xs font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors px-4 py-2"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="h-12 px-8 rounded-xl bg-blue-500 text-white font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                >
                                    {isSubmitting ? (editingPromo ? 'Updating...' : 'Deploying...') : (editingPromo ? 'Update Campaign' : 'Deploy Campaign')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Users Drawer */}
            {selectedPromo && (
                <div className={`fixed inset-0 z-50 flex justify-end transition-all duration-300 ${showUsersDrawer ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeUsersDrawer} />
                    <div className={`relative w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-transform duration-300 ${showUsersDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
                        {/* Drawer Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-white dark:bg-slate-900 shrink-0">
                            <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-purple-500 text-xl">campaign</span>
                                    <p className="text-xs font-black text-purple-500 uppercase tracking-widest">Campaign Users</p>
                                </div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white truncate">{selectedPromo.utm_campaign}</h2>
                                <p className="text-xs text-slate-400 font-mono font-bold">{selectedPromo.unique_code}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {promoUsers.length > 0 && (
                                    <button
                                        onClick={() => exportUsersCSV(selectedPromo, promoUsers)}
                                        className="h-9 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all flex items-center gap-1.5"
                                    >
                                        <span className="material-symbols-outlined text-sm">download</span>
                                        Export CSV
                                    </button>
                                )}
                                <button onClick={closeUsersDrawer} className="size-9 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-all">
                                    <span className="material-symbols-outlined text-slate-400 hover:text-slate-900 dark:hover:text-white">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Drawer Stats */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">{promoUsers.length}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Users</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-black text-blue-500">{selectedPromo.clicks}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Clicks</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-black text-emerald-500">{selectedPromo.current_redemptions}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Redemptions</p>
                                </div>
                            </div>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingUsers ? (
                                <div className="py-16 flex flex-col items-center justify-center gap-3">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading users...</p>
                                </div>
                            ) : promoUsers.length === 0 ? (
                                <div className="py-16 text-center">
                                    <div className="size-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                        <span className="material-symbols-outlined text-3xl">person_off</span>
                                    </div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">No Users Yet</h3>
                                    <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto mt-2">
                                        No one has registered using this promotion link yet. Share the link to start tracking.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {promoUsers.map((pu, idx) => (
                                        <div key={pu.customer_id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all">
                                            <div className="flex items-start gap-3">
                                                {/* Avatar */}
                                                <div className="size-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-lg shadow-purple-500/20">
                                                    {pu.full_name ? pu.full_name.charAt(0).toUpperCase() : '?'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{pu.full_name || 'Unknown'}</p>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider shrink-0">
                                                            #{idx + 1}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-xs">mail</span>
                                                            {pu.email || 'N/A'}
                                                        </span>
                                                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-xs">call</span>
                                                            {pu.phone_number || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                                                            Code: {pu.used_code}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-slate-400">
                                                            Joined {new Date(pu.registered_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    {/* Investments & Loans */}
                                                    {(pu.investments.length > 0 || pu.loans.length > 0) && (
                                                        <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-700 space-y-1.5">
                                                            {pu.investments.map(inv => (
                                                                <div key={inv.investment_id} className="flex items-center justify-between text-[10px]">
                                                                    <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                                        <span className="material-symbols-outlined text-xs">trending_up</span>
                                                                        {inv.product_type?.replace('NOLT_', '').replace('_', ' ')}
                                                                    </span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-black text-slate-700 dark:text-slate-300">₦{Number(inv.amount).toLocaleString()}</span>
                                                                        <span className={`px-1.5 py-0.5 rounded font-black uppercase ${
                                                                            inv.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' :
                                                                            inv.status === 'pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' :
                                                                            'bg-slate-50 text-slate-400 dark:bg-slate-800'
                                                                        }`}>{inv.status}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {pu.loans.map(loan => (
                                                                <div key={loan.loan_id} className="flex items-center justify-between text-[10px]">
                                                                    <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                                        <span className="material-symbols-outlined text-xs">account_balance</span>
                                                                        Loan
                                                                    </span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-black text-slate-700 dark:text-slate-300">₦{Number(loan.amount).toLocaleString()}</span>
                                                                        <span className={`px-1.5 py-0.5 rounded font-black uppercase ${
                                                                            loan.status === 'approved' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' :
                                                                            loan.status === 'pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' :
                                                                            'bg-slate-50 text-slate-400 dark:bg-slate-800'
                                                                        }`}>{loan.status}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </StaffLayout>
    );
};

export default StaffPromotionsPage;
