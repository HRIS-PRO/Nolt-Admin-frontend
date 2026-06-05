import React, { useState, useEffect } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

interface GLAccount {
    id: number;
    code: string;
    name: string;
    balance: string | number;
    status: string;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const userRole = user?.role?.toLowerCase();
    const isGLAuthorized = ['finance', 'super_admin', 'superadmin', 'admin'].includes(userRole || '');
    
    // Tabs state
    const tabs = isGLAuthorized 
        ? ['CHANGE PASSWORD', 'GL WRAPPER', 'INTEGRATIONS', 'API & WEBHOOKS'] 
        : ['CHANGE PASSWORD', 'INTEGRATIONS', 'API & WEBHOOKS'];
    const [activeTab, setActiveTab] = useState<string>('CHANGE PASSWORD');

    // Password fields states
    const [form, setForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // GL Accounts state
    const [glAccounts, setGlAccounts] = useState<GLAccount[]>([]);
    const [glLoading, setGlLoading] = useState(false);

    useEffect(() => {
        if (isGLAuthorized) {
            fetchGLAccounts();
        }
    }, [isGLAuthorized]);

    const fetchGLAccounts = async () => {
        setGlLoading(true);
        try {
            const res = await axios.get('/api/gl-accounts', { withCredentials: true });
            if (res.data.success) {
                setGlAccounts(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch GL accounts:', error);
        } finally {
            setGlLoading(false);
        }
    };

    // GL Account add/edit states
    const [showAddGLAccount, setShowAddGLAccount] = useState(false);
    const [newGLCode, setNewGLCode] = useState('');
    const [newGLName, setNewGLName] = useState('');
    const [newGLBalance, setNewGLBalance] = useState('₦0.00');
    const [isCreatingGL, setIsCreatingGL] = useState(false);

    const [editingGLCode, setEditingGLCode] = useState<string | null>(null);
    const [editGLCodeVal, setEditGLCodeVal] = useState('');
    const [editGLNameVal, setEditGLNameVal] = useState('');
    const [editGLBalanceVal, setEditGLBalanceVal] = useState('');
    const [editGLStatusVal, setEditGLStatusVal] = useState('Active');



    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (form.newPassword !== form.confirmNewPassword) {
            setMessage({ type: 'error', text: "New passwords do not match." });
            return;
        }

        if (form.newPassword.length < 8) {
            setMessage({ type: 'error', text: "New password must be at least 8 characters." });
            return;
        }

        setIsLoading(true);

        try {
            await axios.post('/api/staff/change-password', {
                oldPassword: form.oldPassword,
                newPassword: form.newPassword
            }, { withCredentials: true });

            setMessage({ type: 'success', text: "Password updated successfully." });
            setForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || "Failed to update password."
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearPasswordFields = () => {
        setForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
        setMessage(null);
    };

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className="max-w-[1600px] mx-auto space-y-8 pb-20">
                
                {/* Header */}
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                        SYSTEM SETTINGS
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold mt-1">
                        Manage external connections, security credentials, and system parameters.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-8 py-5 text-xs font-black uppercase tracking-[0.15em] transition-all relative whitespace-nowrap ${
                                activeTab === tab 
                                    ? 'text-blue-500 dark:text-blue-400 font-extrabold' 
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <motion.div 
                                    layoutId="settingsActiveTabIndicator" 
                                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-500 dark:bg-blue-400 rounded-full" 
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content Panel */}
                <div className="mt-8">
                    <AnimatePresence mode="wait">
                        {activeTab === 'CHANGE PASSWORD' && (
                            <motion.div
                                key="password"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3 }}
                                className="max-w-3xl bg-white dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 shadow-xl space-y-8"
                            >
                                <div className="flex items-start gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                        <span className="material-symbols-outlined text-2xl">lock</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">CHANGE PASSWORD</h3>
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                            Maintain credential integrity by periodically updating your account security password.
                                        </p>
                                    </div>
                                </div>

                                {message && (
                                    <div className={`p-4 rounded-xl text-xs font-bold border ${
                                        message.type === 'success' 
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                                            : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                                    }`}>
                                        {message.text}
                                    </div>
                                )}

                                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500">CURRENT PASSWORD</label>
                                        <div className="relative group">
                                            <input
                                                type={showOldPassword ? 'text' : 'password'}
                                                required
                                                value={form.oldPassword}
                                                onChange={e => setForm({ ...form, oldPassword: e.target.value })}
                                                className="w-full p-4 pr-12 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 ring-blue-500/25 transition-all text-sm"
                                                placeholder="Enter your old password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowOldPassword(!showOldPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">
                                                    {showOldPassword ? 'visibility_off' : 'visibility'}
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500">NEW PASSWORD</label>
                                            <div className="relative group">
                                                <input
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    required
                                                    value={form.newPassword}
                                                    onChange={e => setForm({ ...form, newPassword: e.target.value })}
                                                    className="w-full p-4 pr-12 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 ring-blue-500/25 transition-all text-sm"
                                                    placeholder="Minimum 8 characters"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">
                                                        {showNewPassword ? 'visibility_off' : 'visibility'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500">CONFIRM NEW PASSWORD</label>
                                            <div className="relative group">
                                                <input
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    required
                                                    value={form.confirmNewPassword}
                                                    onChange={e => setForm({ ...form, confirmNewPassword: e.target.value })}
                                                    className="w-full p-4 pr-12 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 ring-blue-500/25 transition-all text-sm"
                                                    placeholder="Re-enter new password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">
                                                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <button 
                                            type="submit"
                                            disabled={isLoading}
                                            className="px-8 py-4 bg-blue-600 text-white font-black uppercase tracking-[0.15em] text-xs rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isLoading ? 'Saving Password...' : 'SAVE NEW PASSWORD'}
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={handleClearPasswordFields}
                                            className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                        >
                                            CLEAR FIELDS
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {activeTab === 'GL WRAPPER' && isGLAuthorized && (
                            <motion.div
                                key="gl-wrapper"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-8"
                            >
                                {/* Info Banner */}
                                <div className="p-6 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-[2rem] border border-emerald-500/20 flex items-start gap-4 shadow-sm">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                                        <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">General Ledger Mappings (GL Wrapper)</h4>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                                            Configure double-entry accounting wrappers. Mappings bind business activities (Disbursements, Payments, Interest) directly to underlying cash or clearing ledger charts for automated downstream ledger posting.
                                        </p>
                                    </div>
                                </div>

                                {/* GL Accounts card */}
                                <div className="bg-white dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 shadow-xl space-y-6">
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-blue-500 text-xl">lists</span>
                                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">GL Chart Registry</h3>
                                        </div>
                                        <button 
                                            onClick={() => setShowAddGLAccount(!showAddGLAccount)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">
                                                {showAddGLAccount ? 'close' : 'add'}
                                            </span>
                                            {showAddGLAccount ? 'Close Form' : 'Add Ledger'}
                                        </button>
                                    </div>

                                    {/* Add GL Account Form */}
                                    {showAddGLAccount && (
                                        <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Register New GL Account</p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase">GL Code</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. 102005" 
                                                        value={newGLCode}
                                                        onChange={(e) => setNewGLCode(e.target.value)}
                                                        className="w-full bg-white dark:bg-slate-850 border border-slate-250 dark:border-slate-700 rounded-lg p-2.5 text-xs font-bold"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase">GL Account Name</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. Sterling Escrow GL" 
                                                        value={newGLName}
                                                        onChange={(e) => setNewGLName(e.target.value)}
                                                        className="w-full bg-white dark:bg-slate-850 border border-slate-250 dark:border-slate-700 rounded-lg p-2.5 text-xs font-bold"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase">Initial Balance</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. ₦0.00" 
                                                        value={newGLBalance}
                                                        onChange={(e) => setNewGLBalance(e.target.value)}
                                                        className="w-full bg-white dark:bg-slate-850 border border-slate-250 dark:border-slate-700 rounded-lg p-2.5 text-xs font-bold"
                                                    />
                                                </div>
                                            </div>
                                            <button 
                                                disabled={isCreatingGL}
                                                onClick={async () => {
                                                    if (!newGLCode || !newGLName) {
                                                        alert('Please fill out Code and Name.');
                                                        return;
                                                    }
                                                    setIsCreatingGL(true);
                                                    try {
                                                        const res = await axios.post('/api/gl-accounts', {
                                                            code: newGLCode,
                                                            name: newGLName,
                                                            balance: newGLBalance ? Number(String(newGLBalance).replace(/[^0-9.-]+/g, "")) : 0,
                                                            status: 'Active'
                                                        }, { withCredentials: true });
                                                        if (res.data.success) {
                                                            setGlAccounts([...glAccounts, res.data.data]);
                                                            setNewGLCode('');
                                                            setNewGLName('');
                                                            setNewGLBalance('₦0.00');
                                                            setShowAddGLAccount(false);
                                                        }
                                                    } catch (err: any) {
                                                        alert(err.response?.data?.message || 'Failed to add GL account');
                                                    } finally {
                                                        setIsCreatingGL(false);
                                                    }
                                                }}
                                                className={`w-full py-2.5 text-white font-black uppercase tracking-widest text-[10px] rounded-lg transition-colors flex justify-center items-center gap-2 ${isCreatingGL ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                            >
                                                {isCreatingGL ? (
                                                    <>
                                                        <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                                                        CREATING...
                                                    </>
                                                ) : (
                                                    'Add to Chart of Accounts'
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                    <th className="pb-3 w-[20%]">Code</th>
                                                    <th className="pb-3 w-[40%]">Account Name</th>
                                                    <th className="pb-3 w-[20%] text-right">Balance</th>
                                                    <th className="pb-3 w-[10%] text-center">Status</th>
                                                    <th className="pb-3 w-[10%] text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                {glAccounts.map((account) => {
                                                    const isEditing = editingGLCode === account.code;
                                                    return (
                                                        <tr key={account.code} className="group text-xs text-slate-700 dark:text-slate-350 font-bold hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                                            {isEditing ? (
                                                                <>
                                                                    <td className="py-4">
                                                                        <input 
                                                                            type="text"
                                                                            value={editGLCodeVal}
                                                                            onChange={(e) => setEditGLCodeVal(e.target.value)}
                                                                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-255 dark:border-slate-700 rounded-lg text-xs font-mono font-black"
                                                                        />
                                                                    </td>
                                                                    <td className="py-4">
                                                                        <input 
                                                                            type="text"
                                                                            value={editGLNameVal}
                                                                            onChange={(e) => setEditGLNameVal(e.target.value)}
                                                                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-255 dark:border-slate-700 rounded-lg text-xs"
                                                                        />
                                                                    </td>
                                                                    <td className="py-4">
                                                                        <input 
                                                                            type="text"
                                                                            value={editGLBalanceVal}
                                                                            onChange={(e) => setEditGLBalanceVal(e.target.value)}
                                                                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-255 dark:border-slate-700 rounded-lg text-xs font-mono font-black text-right"
                                                                        />
                                                                    </td>
                                                                    <td className="py-4 text-center">
                                                                        <select 
                                                                            value={editGLStatusVal}
                                                                            onChange={(e) => setEditGLStatusVal(e.target.value)}
                                                                            className="p-2 bg-white dark:bg-slate-900 border border-slate-255 dark:border-slate-700 rounded-lg text-xs font-black uppercase text-center cursor-pointer"
                                                                        >
                                                                            <option value="Active">Active</option>
                                                                            <option value="Inactive">Inactive</option>
                                                                        </select>
                                                                    </td>
                                                                    <td className="py-4 text-center">
                                                                        <div className="flex items-center justify-center gap-1">
                                                                            <button 
                                                                                onClick={async () => {
                                                                                    if (!editGLCodeVal || !editGLNameVal) {
                                                                                        alert('Please provide a valid GL Code and Account Name.');
                                                                                        return;
                                                                                    }
                                                                                    try {
                                                                                        const res = await axios.put(`/api/gl-accounts/${account.id}`, {
                                                                                            code: editGLCodeVal,
                                                                                            name: editGLNameVal,
                                                                                            balance: editGLBalanceVal ? Number(String(editGLBalanceVal).replace(/[^0-9.-]+/g, "")) : 0,
                                                                                            status: editGLStatusVal
                                                                                        }, { withCredentials: true });
                                                                                        if (res.data.success) {
                                                                                            setGlAccounts(glAccounts.map((ac) => ac.id === account.id ? res.data.data : ac));
                                                                                            setEditingGLCode(null);
                                                                                        }
                                                                                    } catch (err: any) {
                                                                                        alert(err.response?.data?.message || 'Failed to update GL account');
                                                                                    }
                                                                                }}
                                                                                className="w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all"
                                                                                title="Save"
                                                                            >
                                                                                <span className="material-symbols-outlined text-[16px]">check</span>
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => setEditingGLCode(null)}
                                                                                className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-all"
                                                                                title="Cancel"
                                                                            >
                                                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td className="py-4 font-mono font-black text-blue-500">{account.code}</td>
                                                                    <td className="py-4 text-slate-800 dark:text-slate-200">{account.name}</td>
                                                                    <td className="py-4 text-right font-mono font-black text-slate-800 dark:text-slate-200">{account.balance}</td>
                                                                    <td className="py-4 text-center">
                                                                        <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-widest ${
                                                                            account.status === 'Active' 
                                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                                        }`}>
                                                                            {account.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-4 text-center">
                                                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                                            <button 
                                                                                onClick={() => {
                                                                                    setEditingGLCode(account.code);
                                                                                    setEditGLCodeVal(account.code);
                                                                                    setEditGLNameVal(account.name);
                                                                                    setEditGLBalanceVal(account.balance);
                                                                                    setEditGLStatusVal(account.status);
                                                                                }}
                                                                                className="w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 flex items-center justify-center transition-all"
                                                                                title="Edit GL Account"
                                                                            >
                                                                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                                                            </button>
                                                                            <button 
                                                                                onClick={async () => {
                                                                                    if (confirm(`Do you really wish to delete GL account ${account.code} (${account.name})?`)) {
                                                                                        try {
                                                                                            const res = await axios.delete(`/api/gl-accounts/${account.id}`, { withCredentials: true });
                                                                                            if (res.data.success) {
                                                                                                setGlAccounts(glAccounts.filter((ac) => ac.id !== account.id));
                                                                                            }
                                                                                        } catch (err: any) {
                                                                                            alert(err.response?.data?.message || 'Failed to delete GL account');
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-all"
                                                                                title="Delete GL Account"
                                                                            >
                                                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'INTEGRATIONS' && (
                            <motion.div
                                key="integrations"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-8"
                            >
                                {/* Info Banner */}
                                <div className="p-6 bg-blue-500/5 dark:bg-blue-500/10 rounded-[2rem] border border-blue-500/20 flex items-start gap-4 shadow-sm">
                                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                        <span className="material-symbols-outlined text-2xl">extension</span>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Third-Party Service Integrations</h4>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                                            Connect and manage external APIs, payment gateways, communication channels, and identity verification services.
                                        </p>
                                    </div>
                                </div>

                                {/* Integration Grid */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Paystack Card */}
                                    <div className="bg-white dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-xl flex flex-col justify-between space-y-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-500 shrink-0 font-bold text-lg">P</div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Paystack Checkout</h4>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Payment Gateway</p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                Connected
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                                            Process customer card payments, direct bank transfers, and generate payment links for repayments.
                                        </p>
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <button 
                                                onClick={() => alert("Paystack Integration config is handled automatically via environment settings.")}
                                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                                            >
                                                Configure
                                            </button>
                                            <span className="text-[10px] text-slate-400 font-bold">API Mode: Live</span>
                                        </div>
                                    </div>

                                    {/* Mono Card */}
                                    <div className="bg-white dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-xl flex flex-col justify-between space-y-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0 font-bold text-lg">M</div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Mono Statement</h4>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Financial Data API</p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                Connected
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                                            Securely retrieve customer bank statements, verify balances, and fetch transaction history during underwriting.
                                        </p>
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <button 
                                                onClick={() => alert("Mono Portal config dashboard can be updated inside the developer tab.")}
                                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                                            >
                                                Configure
                                            </button>
                                            <span className="text-[10px] text-slate-400 font-bold">Sync Frequency: 12h</span>
                                        </div>
                                    </div>

                                    {/* ZeptoMail Card */}
                                    <div className="bg-white dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-xl flex flex-col justify-between space-y-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0 font-bold text-lg">Z</div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">ZeptoMail</h4>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Transactional Email</p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                Connected
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                                            Send automated transactional emails, loan receipts, investment certificates, and OTP verification codes.
                                        </p>
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <button 
                                                onClick={() => alert("ZeptoMail mail agent properties are managed in the server settings.")}
                                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-355 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                                            >
                                                Configure
                                            </button>
                                            <span className="text-[10px] text-slate-400 font-bold">Delivered: 99.8%</span>
                                        </div>
                                    </div>

                                    {/* Twilio Card */}
                                    <div className="bg-white dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-xl flex flex-col justify-between space-y-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 shrink-0 font-bold text-lg">T</div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Twilio SMS</h4>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Communication Gateway</p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                Disabled
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                                            Send real-time SMS notifications, authentication codes, payment alerts, and dynamic customer outreach messages.
                                        </p>
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <button 
                                                onClick={() => alert("Twilio SMS integration cannot be enabled without a valid Twilio SID/Auth Token in backend env configuration.")}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                                            >
                                                Enable
                                            </button>
                                            <span className="text-[10px] text-slate-400 font-bold">N/A</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'API & WEBHOOKS' && (
                            <motion.div
                                key="api-webhooks"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-8"
                            >
                                {/* API Keys Card */}
                                <div className="bg-white dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 shadow-xl space-y-6">
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-blue-500 text-xl">key</span>
                                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Developer API Keys</h3>
                                        </div>
                                        <button 
                                            onClick={() => alert("API key generation requires master administrator permissions.")}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1 transition-all"
                                        >
                                            Generate New Key
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Live Secret Key</span>
                                                    <span className="px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Active</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold font-mono">sk_live_51Nv92J8...U9h8s3</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText("REDACTED_LIVE_KEY");
                                                        alert("Live Secret Key copied to clipboard!");
                                                    }}
                                                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-355 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                                                >
                                                    Copy Key
                                                </button>
                                                <button 
                                                    onClick={() => alert("Revocation request is sent to the developer security dashboard.")}
                                                    className="px-3 py-2 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                                                >
                                                    Revoke
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Test Secret Key</span>
                                                    <span className="px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Active</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold font-mono">sk_test_51Nv92J8...T5y2r1</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText("REDACTED_TEST_KEY");
                                                        alert("Test Secret Key copied to clipboard!");
                                                    }}
                                                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-355 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                                                >
                                                    Copy Key
                                                </button>
                                                <button 
                                                    onClick={() => alert("Revocation request is sent to the developer security dashboard.")}
                                                    className="px-3 py-2 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                                                >
                                                    Revoke
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Webhooks Card */}
                                <div className="bg-white dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 shadow-xl space-y-6">
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-blue-500 text-xl">webhook</span>
                                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Webhook Configuration</h3>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Payload Destination URL</label>
                                            <input 
                                                type="url" 
                                                defaultValue="https://api.yourdomain.com/webhooks/nolt"
                                                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 ring-blue-500/25 transition-all text-sm"
                                                placeholder="https://your-domain.com/webhook-endpoint"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Signing Secret</label>
                                            <div className="relative">
                                                <input 
                                                    type="password" 
                                                    readOnly 
                                                    value="whsec_83jhs8d9hs8h2g7d8y28hd8has"
                                                    className="w-full p-4 pr-12 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 ring-blue-500/25 transition-all text-sm font-mono"
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => alert("Signing secret: whsec_83jhs8d9hs8h2g7d8y28hd8has")}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Subscribed Events</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                                                {[
                                                    { name: 'loan.created', desc: 'Loan application created' },
                                                    { name: 'loan.disbursed', desc: 'Loan disbursed' },
                                                    { name: 'loan.repaid', desc: 'Repayment received' },
                                                    { name: 'investment.created', desc: 'New investment' },
                                                    { name: 'customer.created', desc: 'New customer profile' },
                                                    { name: 'customer.kyc_updated', desc: 'KYC verified' },
                                                ].map((evt) => (
                                                    <label key={evt.name} className="flex items-start gap-2 cursor-pointer group">
                                                        <input type="checkbox" defaultChecked className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                        <div className="space-y-0.5">
                                                            <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">{evt.name}</span>
                                                            <p className="text-[9px] text-slate-400 font-bold">{evt.desc}</p>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 pt-4">
                                            <button 
                                                onClick={() => alert("Webhook integration settings updated successfully!")}
                                                className="px-6 py-3 bg-blue-600 text-white font-black uppercase tracking-[0.15em] text-xs rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
                                            >
                                                Update Webhook Settings
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </StaffLayout>
    );
};

export default SettingsPage;
