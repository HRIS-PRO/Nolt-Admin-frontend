
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

interface RestrictedAccessPageProps {
    onLogout: () => void;
}

const RestrictedAccessPage: React.FC<RestrictedAccessPageProps> = ({ onLogout }) => {

    const navigate = useNavigate();

    const handleLogoutClick = () => {
        onLogout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-3xl">lock</span>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Access Restricted</h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        This dashboard is currently available only for customers. If you believe this is a mistake, please contact support.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleLogoutClick}
                        className="w-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold py-3 rounded-xl transition-colors"
                    >
                        Go Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RestrictedAccessPage;
