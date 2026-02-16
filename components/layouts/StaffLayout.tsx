import React, { useState } from 'react';
import { Link, NavLink, useSearchParams } from 'react-router-dom';
import { Theme } from '../../types';

interface StaffLayoutProps {
    children: React.ReactNode;
    user?: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const StaffLayout: React.FC<StaffLayoutProps> = ({ children, user, onLogout, toggleTheme, theme }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const searchQuery = searchParams.get('search') || '';
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value) {
            setSearchParams({ ...Object.fromEntries(searchParams), search: value });
        } else {
            const newParams = Object.fromEntries(searchParams);
            delete newParams.search;
            setSearchParams(newParams);
        }
    };

    const navGroups = [
        {
            title: 'MANAGEMENT',
            items: [
                { label: 'Dashboard', icon: 'grid_view', path: '/staff-dashboard' },
                { label: 'Loans', icon: 'credit_card', path: '/staff/loans' },
                { label: 'Reports', icon: 'description', path: '/staff/reports' },
            ]
        },
        {
            title: 'CORE SYSTEM',
            items: [
                { label: 'Settings', icon: 'settings', path: '/staff/settings' },
                { label: 'Users', icon: 'group', path: '/staff/users' },
                { label: 'Customers', icon: 'groups', path: '/staff/customers' },
                { label: 'Audit Trail', icon: 'verified_user', path: '/staff/audit' },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex text-slate-900 dark:text-white font-sans relative">

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:sticky top-0 h-screen w-72 bg-[#0f172a] text-white flex flex-col z-40 transition-transform duration-300 border-r border-[#1e293b]
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Brand */}
                <div className="flex items-center justify-between p-8">
                    <Link to="/" className="flex items-center gap-3 cursor-pointer">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
                            <img
                                src="https://isswlcllytiltgjbysjv.supabase.co/storage/v1/object/public/template-images/logo%20file-02%20(1).png"
                                alt="NOLT Finance Logo"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <h1 className="text-xl font-black tracking-tighter text-slate-900 text-white uppercase">
                            NOLT Finance
                        </h1>
                    </Link>
                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="lg:hidden p-2 text-slate-400 hover:text-white"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 flex flex-col gap-8 overflow-y-auto">
                    {navGroups.map((group, idx) => {
                        // Filter items based on role
                        const filteredItems = group.items.filter(item => {
                            if (item.label === 'Customers') {
                                return user?.role === 'super_admin' || user?.role === 'customer_experience';
                            }
                            if (item.label === 'Users' || item.label === 'Audit Trail') {
                                return user?.role === 'super_admin';
                            }
                            return true;
                        });

                        // Don't render group if no items
                        if (filteredItems.length === 0) return null;

                        return (
                            <div key={idx} className="flex flex-col gap-2">
                                <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">{group.title}</h3>
                                {filteredItems.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setIsSidebarOpen(false)} // Close sidebar on mobile nav
                                        className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${isActive
                                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                        {item.label}
                                    </NavLink>
                                ))}
                            </div>
                        )
                    })}
                </nav>

                {/* Footer / User Profile */}
                <div className="p-4 border-t border-[#1e293b] mt-auto">
                    {/* Preview Role Mockup (Visual only as per image request) */}
                    <div className="mb-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-1">Current Role</p>
                        <div className="bg-[#1e293b] rounded-lg p-3 flex justify-between items-center text-xs font-bold text-slate-300">
                            <span>{(user?.role || 'Staff').toUpperCase()}</span>
                            <span className="material-symbols-outlined text-sm">verified</span>
                        </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#1e293b]/50 border border-[#1e293b] flex items-center gap-3 group hover:border-[#334155] transition-colors cursor-pointer" onClick={onLogout}>
                        <div className="size-10 rounded-full bg-slate-700 overflow-hidden shrink-0">
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold bg-slate-800">
                                    {user?.name?.[0] || 'U'}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-white truncate">{user?.name || 'Staff Member'}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user?.role || 'Staff'}</p>
                        </div>
                        <span className="material-symbols-outlined text-slate-500 group-hover:text-white transition-colors">logout</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 w-full min-w-0 p-4 md:p-8 transition-all duration-300">
                <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Top Bar */}
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">

                        {/* Mobile Menu Toggle & Search Container */}
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-400"
                            >
                                <span className="material-symbols-outlined text-2xl">menu</span>
                            </button>

                            {/* Search */}
                            <div className="relative flex-1 md:w-96 group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                                <input
                                    type="text"
                                    placeholder="Search transactions..."
                                    value={searchQuery}
                                    onChange={handleSearch}
                                    className="w-full h-12 pl-12 pr-4 rounded-xl bg-slate-200 dark:bg-[#1e293b] border-none outline-none font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-500 text-sm"
                                />
                            </div>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center justify-end gap-3 md:gap-4">
                            {/* Theme Toggle */}
                            <button onClick={toggleTheme} className="size-10 rounded-full bg-slate-200 dark:bg-[#1e293b] flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all">
                                <span className="material-symbols-outlined text-xl">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
                            </button>

                            {/* Notifications */}
                            <button className="size-10 rounded-full bg-slate-200 dark:bg-[#1e293b] flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all relative">
                                <span className="material-symbols-outlined text-xl">notifications</span>
                                <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border border-[#1e293b]"></span>
                            </button>

                            {/* Help */}
                            <button className="size-10 rounded-full bg-slate-200 dark:bg-[#1e293b] flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all">
                                <span className="material-symbols-outlined text-xl">help</span>
                            </button>
                        </div>
                    </div>

                    {children}
                </div>
            </main>
        </div>
    );
};

export default StaffLayout;
