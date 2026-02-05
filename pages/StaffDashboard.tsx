import React from 'react';
import StaffLayout from '../components/layouts/StaffLayout';

interface StaffDashboardProps {
    user: { name: string; email: string; avatar_url?: string };
    onLogout: () => void;
}

const StaffDashboard: React.FC<StaffDashboardProps> = ({ user, onLogout }) => {
    return (
        <StaffLayout user={user} onLogout={onLogout}>
            <header className="flex flex-col gap-2 mb-8">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    Welcome back, {user.name.split(' ')[0]} 👋
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    Here's what's happening in the system today.
                </p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {[
                    { label: 'Total Applications', value: '1,248', change: '+12%', icon: 'description', color: 'bg-blue-500' },
                    { label: 'Pending Review', value: '45', change: '-5%', icon: 'hourglass_empty', color: 'bg-amber-500' },
                    { label: 'Active Customers', value: '892', change: '+8%', icon: 'group', color: 'bg-emerald-500' },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
                        <div className={`size-16 rounded-2xl ${stat.color} bg-opacity-10 flex items-center justify-center text-${stat.color.split('-')[1]}-500 group-hover:bg-opacity-20 transition-all`}>
                            <span className="material-symbols-outlined text-3xl">{stat.icon}</span>
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-widest mb-1">{stat.label}</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</h3>
                            <p className="text-xs font-bold text-green-500 mt-1">{stat.change} <span className="text-slate-400 font-normal">from last month</span></p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Activity Placeholder */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-black text-xl text-slate-900 dark:text-white">Recent Applications</h3>
                    <button className="text-primary font-bold text-sm hover:underline">View All</button>
                </div>
                <div className="p-8">
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                                        <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                                    </div>
                                </div>
                                <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </StaffLayout>
    );
};

export default StaffDashboard;
