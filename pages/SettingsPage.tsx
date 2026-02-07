import React, { useState } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import axios from 'axios';

interface SettingsPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const [form, setForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (form.newPassword !== form.confirmNewPassword) {
            setMessage({ type: 'error', text: "New passwords do not match." });
            return;
        }

        if (form.newPassword.length < 6) {
            setMessage({ type: 'error', text: "New password must be at least 6 characters." });
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

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        Account Settings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Manage your account security and preferences.
                    </p>
                </div>

                <div className="bg-white dark:bg-[#0f172a] rounded-[24px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl p-8">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">lock</span>
                        Change Password
                    </h2>

                    {message && (
                        <div className={`p-4 rounded-xl mb-6 text-sm font-bold ${message.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' : 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Current Password</label>
                            <input
                                type="password"
                                required
                                value={form.oldPassword}
                                onChange={e => setForm({ ...form, oldPassword: e.target.value })}
                                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 ring-primary/20 transition-all"
                                placeholder="Enter current password"
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={form.newPassword}
                                    onChange={e => setForm({ ...form, newPassword: e.target.value })}
                                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 ring-primary/20 transition-all"
                                    placeholder="Min. 6 characters"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Confirm New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={form.confirmNewPassword}
                                    onChange={e => setForm({ ...form, confirmNewPassword: e.target.value })}
                                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 ring-primary/20 transition-all"
                                    placeholder="Re-enter new password"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-8 py-4 rounded-xl bg-primary text-white font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-primary/30 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                                        Updating...
                                    </>
                                ) : (
                                    "Update Password"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </StaffLayout>
    );
};

export default SettingsPage;
