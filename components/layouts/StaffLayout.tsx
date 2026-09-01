import React, { useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom';

type NavChild = { label: string; icon: string; path: string };
type NavItem = { label: string; icon: string; path: string; children?: NavChild[] };

interface StaffLayoutProps {
    children: React.ReactNode;
    user?: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const StaffLayout: React.FC<StaffLayoutProps> = ({ children, user, onLogout, toggleTheme, theme }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const searchQuery = searchParams.get('search') || '';
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    /** Collapsible nav groups — closed by default; toggled via caret. */
    const [expandedNav, setExpandedNav] = useState<Record<string, boolean>>({});

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

    const navGroups: { title: string; items: NavItem[] }[] = [
        {
            title: 'MANAGEMENT',
            items: [
                { label: 'Dashboard', icon: 'grid_view', path: '/staff-dashboard' },
                { label: 'Loans', icon: 'credit_card', path: '/staff/loans' },
                { label: 'Transfers', icon: 'swap_horiz', path: '/staff/transfers' },
                { label: 'Investments', icon: 'account_balance_wallet', path: '/staff/investments' },
                { label: 'Products', icon: 'inventory_2', path: '/staff/products' },
                {
                    label: 'Promotions',
                    icon: 'campaign',
                    path: '/staff/promotions',
                    children: [
                        {
                            label: 'Push Notifications',
                            icon: 'notifications_active',
                            path: '/staff/mobile-notifications',
                        },
                    ],
                },
                { label: 'Reports', icon: 'description', path: '/staff/reports' },
                { label: 'BI Dashboard', icon: 'timeline', path: '/staff/timeline' },
                { label: 'Calculator', icon: 'calculate', path: '/staff/calculator' },
            ]
        },
        {
            title: 'CORE SYSTEM',
            items: [
                { label: 'Settings', icon: 'settings', path: '/staff/settings' },
                { label: 'Users', icon: 'group', path: '/staff/users' },
                { label: 'Customers', icon: 'groups', path: '/staff/customers' },
                { label: 'Audit Trail', icon: 'verified_user', path: '/staff/audit' },
                { label: 'CBA Migration', icon: 'sync_alt', path: '/staff/cba-migration' },
            ]
        }
    ];

    const canSeeNavItem = useMemo(() => {
        const role = user?.role || '';
        const allowedBiAndReportsRoles = [
            'sales_manager', 'credit_manager', 'internal_audit', 'finance', 'compliance',
            'md', 'hr', 'super_admin', 'superadmin', 'admin', 'customer_experience',
        ];

        return (label: string): boolean => {
            if (label === 'Reports' || label === 'BI Dashboard') {
                return allowedBiAndReportsRoles.includes(role);
            }
            if (label === 'Products') {
                return role !== 'customer_experience';
            }
            if (label === 'Customers') {
                return role === 'super_admin' || role === 'customer_experience';
            }
            if (label === 'Users' || label === 'Audit Trail' || label === 'CBA Migration') {
                return role === 'super_admin';
            }
            if (label === 'Promotions') {
                return role === 'super_admin' || role === 'marketing';
            }
            if (label === 'Push Notifications' || label === 'Transfers') {
                return role === 'super_admin' || role === 'superadmin';
            }
            if (role === 'marketing') {
                return ['Dashboard', 'Loans', 'Investments', 'Promotions'].includes(label);
            }
            return true;
        };
    }, [user?.role]);

    const toggleNavGroup = (path: string) => {
        setExpandedNav((prev) => ({ ...prev, [path]: !prev[path] }));
    };

    const isNavGroupExpanded = (item: NavItem, childActive: boolean) => {
        if (item.path in expandedNav) return expandedNav[item.path];
        return childActive;
    };

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
                <div className="flex items-center justify-between pt-4 pl-8 pb-4">
                    <Link to="/" className="flex items-center gap-3 cursor-pointer">
                        <div className="w-50 h-10 rounded-xl flex items-center justify-center overflow-hidden">
                            <img
                                src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/logo%20updated%20white.png"
                                alt="NOLT Finance Logo"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </Link>

                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="lg:hidden p-2 text-slate-400 hover:text-white"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>


                <h1 className="text-sm pl-8 pb-10 font-black font-bold text-slate-900 text-white uppercase">
                    NOLT MANAGEMENT SYSTEM  
                </h1> 

                {/* Navigation */}
                <nav className="flex-1 px-4 flex flex-col gap-8 overflow-y-auto">
                    {navGroups.map((group, idx) => {
                        const filteredItems = group.items
                            .map((item) => {
                                const children = item.children?.filter((child) => canSeeNavItem(child.label));
                                if (!canSeeNavItem(item.label) && (!children || children.length === 0)) {
                                    return null;
                                }
                                return { ...item, children };
                            })
                            .filter(Boolean) as NavItem[];

                        if (filteredItems.length === 0) return null;

                        return (
                            <div key={idx} className="flex flex-col gap-2">
                                <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">{group.title}</h3>
                                {filteredItems.map((item) => {
                                    const childActive = item.children?.some((c) => location.pathname === c.path) ?? false;
                                    const parentActive = location.pathname === item.path;
                                    const hasChildren = Boolean(item.children?.length);
                                    const isExpanded = hasChildren
                                        ? isNavGroupExpanded(item, childActive)
                                        : false;

                                    if (!hasChildren) {
                                        return (
                                            <NavLink
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => setIsSidebarOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${
                                                        isActive
                                                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                                    }`
                                                }
                                            >
                                                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                                {item.label}
                                            </NavLink>
                                        );
                                    }

                                    return (
                                        <div key={item.path} className="flex flex-col gap-1">
                                            <div
                                                className={`flex items-center rounded-xl transition-all font-bold text-sm overflow-hidden ${
                                                    parentActive && !childActive
                                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                        : childActive
                                                          ? 'text-white bg-slate-800/80'
                                                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                                }`}
                                            >
                                                <NavLink
                                                    to={item.path}
                                                    onClick={() => setIsSidebarOpen(false)}
                                                    className="flex flex-1 items-center gap-4 px-4 py-3.5 min-w-0"
                                                >
                                                    <span className="material-symbols-outlined text-[20px] shrink-0">
                                                        {item.icon}
                                                    </span>
                                                    <span className="truncate">{item.label}</span>
                                                </NavLink>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleNavGroup(item.path)}
                                                    aria-expanded={isExpanded}
                                                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.label}`}
                                                    className={`shrink-0 px-3 py-3.5 transition-colors ${
                                                        parentActive && !childActive
                                                            ? 'text-white/80 hover:text-white'
                                                            : 'text-slate-500 hover:text-slate-200'
                                                    }`}
                                                >
                                                    <span
                                                        className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${
                                                            isExpanded ? 'rotate-180' : ''
                                                        }`}
                                                    >
                                                        expand_more
                                                    </span>
                                                </button>
                                            </div>
                                            {isExpanded
                                                ? item.children?.map((child) => (
                                                      <NavLink
                                                          key={child.path}
                                                          to={child.path}
                                                          onClick={() => setIsSidebarOpen(false)}
                                                          className={({ isActive }) =>
                                                              `flex items-center gap-3 ml-6 mr-2 pl-4 pr-3 py-2.5 rounded-lg transition-all text-xs font-bold border-l-2 ${
                                                                  isActive
                                                                      ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                                                                      : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-200 hover:bg-slate-800/60'
                                                              }`
                                                          }
                                                      >
                                                          <span className="material-symbols-outlined text-[18px]">
                                                              {child.icon}
                                                          </span>
                                                          {child.label}
                                                      </NavLink>
                                                  ))
                                                : null}
                                        </div>
                                    );
                                })}
                            </div>
                        );
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
