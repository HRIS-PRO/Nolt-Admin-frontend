import React from 'react';
import { NavLink } from 'react-router-dom';
import { Theme } from '../../types';

interface StaffLayoutProps {
    children: React.ReactNode;
    user?: { name: string; email: string; avatar_url?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: Theme;
}

const StaffLayout: React.FC<StaffLayoutProps> = ({ children, user, onLogout }) => {
    const navItems = [
        { label: 'Overview', icon: 'dashboard', path: '/staff-dashboard' },
        { label: 'Applications', icon: 'description', path: '/staff/applications' },
        { label: 'Customers', icon: 'group', path: '/staff/customers' },
        { label: 'Settings', icon: 'settings', path: '/staff/settings' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex text-slate-900 dark:text-white font-sans">
            {/* Sidebar */}
            <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col fixed h-full z-20 transition-all duration-300">
                <div className="p-8">
                    <div className="flex items-center gap-2">
                        <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                            <span className="material-symbols-outlined text-white">token</span>
                        </div>
                        <span className="text-2xl font-black tracking-tight dark:text-white">NOLT<span className="text-primary">.</span></span>
                    </div>
                    <div className="mt-2 pl-12">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Staff Portal</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold ${isActive
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary'
                                }`}
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center gap-4 mb-4">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                            {user?.name?.[0] || 'S'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold truncate dark:text-white">{user?.name || 'Staff Member'}</p>
                            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 font-bold hover:bg-red-50 hover:border-red-100 hover:text-red-500 transition-all text-slate-500"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-72 p-8 lg:p-12 transition-all duration-300">
                <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default StaffLayout;
