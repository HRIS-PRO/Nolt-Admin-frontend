import React from 'react';
import StaffLayout from '../components/layouts/StaffLayout';

interface StaffPlaceholderPageProps {
    title: string;
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const StaffPlaceholderPage: React.FC<StaffPlaceholderPageProps> = ({ title, user, onLogout, toggleTheme, theme }) => {
    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="size-32 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner">
                    <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600">construction</span>
                </div>
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h1>
                    <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        We're currently working on this feature. Check back soon for updates!
                    </p>
                </div>
                <button
                    onClick={() => window.history.back()}
                    className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:opacity-90 transition-opacity"
                >
                    Go Back
                </button>
            </div>
        </StaffLayout>
    );
};

export default StaffPlaceholderPage;
