import React, { useEffect, useState } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import axios from 'axios';

interface UsersPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const UsersPage: React.FC<UsersPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Actions State
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteForm, setInviteForm] = useState({ full_name: '', email: '', role: 'staff', password: '' });
    const [recruiting, setRecruiting] = useState(false);
    const [editingRoleId, setEditingRoleId] = useState<number | null>(null);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${''}/api/staff/users`, { withCredentials: true });
            // Filter out customers
            const staffUsers = response.data.filter((u: any) => u.role !== 'customer');
            setUsers(staffUsers);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setRecruiting(true);
        try {
            await axios.post(`${''}/api/staff/invite`, inviteForm, { withCredentials: true });
            alert("Invitation sent successfully!");
            setShowInviteModal(false);
            setInviteForm({ email: '', full_name: '', role: 'staff', password: '' });
            fetchUsers();
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to invite user");
        } finally {
            setRecruiting(false);
        }
    };

    const handleRevoke = async (userId: number) => {
        if (!confirm("Are you sure you want to revoke access? They will no longer be able to log in.")) return;
        try {
            await axios.post(`${''}/api/staff/revoke-access`, { userId }, { withCredentials: true });
            setUsers(users.map(u => u.id === userId ? { ...u, is_active: false } : u));
        } catch (error) {
            alert("Failed to revoke access");
        }
    };

    const handleGenerateReferral = async (userId: number) => {
        try {
            const res = await axios.post(`${''}/api/staff/referral-code`, { userId }, { withCredentials: true });
            setUsers(users.map(u => u.id === userId ? { ...u, referral_code: res.data.referral_code } : u));
        } catch (error) {
            alert("Failed to generate code");
        }
    };

    const handleRoleUpdate = async (userId: number, newRole: string) => {
        try {
            await axios.put(`${''}/api/staff/users/${userId}/role`, { role: newRole }, { withCredentials: true });
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            setEditingRoleId(null);
        } catch (error) {
            alert("Failed to update role");
        }
    };

    const getRoleBadge = (role: string) => {
        const styles: Record<string, string> = {
            super_admin: "text-blue-600 bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
            credit_manager: "text-indigo-600 bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20",
            credit_officer: "text-indigo-600 bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20",
            sales_officer: "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
            customer_experience: "text-sky-600 bg-sky-100 dark:bg-sky-500/10 dark:text-sky-400 border-sky-200 dark:border-sky-500/20",
            default: "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
        };
        const style = styles[role] || styles.default;

        return (
            <span className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider w-fit ${style}`}>
                <span className="material-symbols-outlined text-sm">verified_user</span>
                {role.replace(/_/g, ' ')}
            </span>
        );
    };

    const filteredUsers = users.filter(u =>
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.referral_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        Core Team
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Manage permissions and view all system administrators.
                    </p>
                </div>
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Invite Member
                </button>
            </div>

            <div className="bg-white dark:bg-[#0f172a] rounded-[24px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
                {/* Table Header Filter (Search) */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <span className="material-symbols-outlined text-slate-400">search</span>
                    <input
                        type="text"
                        placeholder="Search by name, email or referral code..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="bg-transparent text-slate-700 dark:text-white text-sm font-medium placeholder:text-slate-400 outline-none w-full"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-[10px] uppercase text-slate-500 font-black tracking-widest bg-slate-50 dark:bg-slate-900/30">
                            <tr>
                                <th className="p-6 pl-8">Administrator</th>
                                <th className="p-6 py-4">Role & Permissions</th>

                                <th className="p-6 py-4">Referral Code</th>
                                <th className="p-6 py-4 text-center">Account Status</th>
                                <th className="p-6 py-4 pr-8 text-right">Descriptive Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">Loading users...</td>
                                </tr>
                            ) : filteredUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                                    <td className="p-6 pl-8">
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                {u.avatar_url ? <img src={u.avatar_url} className="size-full object-cover" /> : u.full_name[0]}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white text-sm">{u.full_name}</p>
                                                <p className="text-xs text-slate-500 font-medium">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6 py-4">
                                        {editingRoleId === u.id ? (
                                            <select
                                                autoFocus
                                                value={u.role}
                                                onChange={(e) => handleRoleUpdate(u.id, e.target.value)}
                                                onBlur={() => setEditingRoleId(null)}
                                                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 dark:text-white outline-none"
                                            >
                                                <option value="super_admin">Super Admin</option>
                                                <option value="credit_manager">Credit Manager</option>
                                                <option value="credit_officer">Credit Officer</option>
                                                <option value="sales_officer">Sales Officer</option>
                                                <option value="sales_manager">Sales Manager</option>
                                                <option value="customer_experience">Customer Experience</option>
                                                <option value="internal_audit">Internal Audit</option>
                                                <option value="finance">Finance</option>
                                            </select>
                                        ) : (
                                            <div onClick={() => setEditingRoleId(u.id)} className="cursor-pointer hover:opacity-80">
                                                {getRoleBadge(u.role)}
                                            </div>
                                        )}
                                    </td>

                                    <td className="p-6 py-4">
                                        {u.referral_code ? (
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded border border-blue-200 dark:border-blue-500/20">{u.referral_code}</span>
                                                <button
                                                    onClick={() => {
                                                        const url = `${window.location.origin}/register?ref=${u.referral_code}`;
                                                        navigator.clipboard.writeText(url);
                                                        alert("Referral link copied!");
                                                    }}
                                                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors"
                                                    title="Copy Code"
                                                >
                                                    <span className="material-symbols-outlined text-sm">content_copy</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleGenerateReferral(u.id)}
                                                className="flex items-center gap-1 text-slate-400 hover:text-blue-500 transition-colors text-xs font-bold"
                                            >
                                                <span className="material-symbols-outlined text-sm">autorenew</span>
                                                Generate
                                            </button>
                                        )}
                                    </td>
                                    <td className="p-6 py-4 text-center">
                                        {u.is_active ? (
                                            <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-block px-3 py-1 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 border border-red-200 dark:border-red-500/20 text-[10px] font-black uppercase tracking-wider">
                                                Revoked
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-6 py-4 pr-8 text-right">
                                        {u.is_active && (
                                            <button
                                                onClick={() => handleRevoke(u.id)}
                                                className="px-4 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 border border-red-200 dark:border-red-500/20 text-[10px] font-black uppercase tracking-wider hover:bg-red-100 dark:hover:bg-red-500 hover:text-red-700 dark:hover:text-white transition-all flex items-center gap-2 ml-auto"
                                            >
                                                <span className="material-symbols-outlined text-sm">block</span>
                                                Revoke
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-in fade-in zoom-in duration-300">
                        <button onClick={() => setShowInviteModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Invite Team Member</h2>
                        <p className="text-slate-500 text-sm mb-6">They will receive an email with their credentials.</p>

                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Full Name</label>
                                <input required type="text" value={inviteForm.full_name} onChange={e => setInviteForm({ ...inviteForm, full_name: e.target.value })} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400" placeholder="e.g. Alex Morgan" />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Email Address</label>
                                <input required type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400" placeholder="alex@nolt.finance" />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Password (Optional)</label>
                                <input type="text" value={inviteForm.password} onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400" placeholder="Auto-generated if empty" />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Role</label>
                                <select value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-slate-900 dark:text-white cursor-pointer">
                                    <option value="customer_experience">Customer Experience</option>
                                    <option value="sales_officer">Sales Officer</option>
                                    <option value="sales_manager">Sales Manager</option>
                                    <option value="credit_manager">Credit Manager</option>
                                    <option value="credit_officer">Credit Officer</option>
                                    <option value="internal_audit">Internal Audit</option>
                                    <option value="finance">Finance</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                            </div>
                            <button disabled={recruiting} className="w-full py-4 rounded-xl bg-blue-600 text-white font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 mt-4">
                                {recruiting ? "Sending Invite..." : "Send Invitation"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </StaffLayout>
    );
};

export default UsersPage;
