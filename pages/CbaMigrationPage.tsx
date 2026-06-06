import React, { useEffect, useState } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import axios from 'axios';

interface CbaMigrationPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

interface MigrationStatus {
    currentCbaUrl: string;
    stats: {
        totalWithBvn: number;
        totalWithCasa: number;
        totalWithCbaId: number;
        totalWithBackup: number;
        missingCba: number;
        canRollback: boolean;
    };
    sampleBackups: any[];
}

interface MigrationResult {
    userId: number;
    fullName: string;
    bvn: string;
    oldCasa: string | null;
    oldCbaCustomerId: string | null;
    newCasa: string | null;
    newCbaCustomerId: string | null;
    status: 'success' | 'failed' | 'dry_run' | 'pending';
    message: string;
}

interface MigrationResponse {
    summary: {
        cbaBaseUrl: string;
        totalCustomers: number;
        successful: number;
        alreadyExisted: number;
        failed: number;
        skipped: number;
        dryRun: boolean;
        elapsedSeconds: string;
        timestamp: string;
    };
    results: MigrationResult[];
}

const CbaMigrationPage: React.FC<CbaMigrationPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const [status, setStatus] = useState<MigrationStatus | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);
    const [migrationResults, setMigrationResults] = useState<MigrationResponse | null>(null);
    const [rollbackResults, setRollbackResults] = useState<any>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [runningAction, setRunningAction] = useState<'migrate' | 'rollback' | 'dryrun' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [showConfirmModal, setShowConfirmModal] = useState<'migrate' | 'rollback' | null>(null);

    const fetchStatus = async () => {
        setIsLoadingStatus(true);
        try {
            const res = await axios.get('/api/staff/admin/cba-migration-status', { withCredentials: true });
            setStatus(res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch migration status');
        } finally {
            setIsLoadingStatus(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleDryRun = async () => {
        setIsRunning(true);
        setRunningAction('dryrun');
        setError(null);
        setMigrationResults(null);
        setRollbackResults(null);
        try {
            const res = await axios.post('/api/staff/admin/cba-migrate', { dryRun: true }, { withCredentials: true });
            setMigrationResults(res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Dry run failed');
        } finally {
            setIsRunning(false);
            setRunningAction(null);
        }
    };

    const handleMigrate = async () => {
        setShowConfirmModal(null);
        setIsRunning(true);
        setRunningAction('migrate');
        setError(null);
        setMigrationResults(null);
        setRollbackResults(null);
        try {
            const res = await axios.post('/api/staff/admin/cba-migrate', { dryRun: false }, { withCredentials: true });
            setMigrationResults(res.data);
            fetchStatus(); // Refresh status
        } catch (err: any) {
            setError(err.response?.data?.message || 'Migration failed');
        } finally {
            setIsRunning(false);
            setRunningAction(null);
        }
    };

    const handleRollback = async () => {
        setShowConfirmModal(null);
        setIsRunning(true);
        setRunningAction('rollback');
        setError(null);
        setMigrationResults(null);
        setRollbackResults(null);
        try {
            const res = await axios.post('/api/staff/admin/cba-rollback', {}, { withCredentials: true });
            setRollbackResults(res.data);
            fetchStatus(); // Refresh status
        } catch (err: any) {
            setError(err.response?.data?.message || 'Rollback failed');
        } finally {
            setIsRunning(false);
            setRunningAction(null);
        }
    };

    const filteredResults = migrationResults?.results?.filter(r => {
        if (filterStatus === 'all') return true;
        return r.status === filterStatus;
    }) || [];

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <span className="material-symbols-outlined text-3xl text-blue-500">sync_alt</span>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            CBA Migration
                        </h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Switch customer CASA & CBA IDs between test and production environments.
                    </p>
                </div>
            </div>

            {/* Current Environment Banner */}
            {status && (
                <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200 dark:border-blue-500/20">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="material-symbols-outlined text-blue-500">dns</span>
                        <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Current CBA Environment</span>
                    </div>
                    <p className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200 break-all">
                        {status.currentCbaUrl}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        All migration calls will be sent to this URL. Change <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400 font-bold">CBA_BASE_URL</code> in <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400 font-bold">.env</code> and restart backend to point to a different environment.
                    </p>
                </div>
            )}

            {/* Stats Cards */}
            {status && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    {[
                        { label: 'With BVN', value: status.stats.totalWithBvn, icon: 'fingerprint', color: 'blue' },
                        { label: 'With CASA', value: status.stats.totalWithCasa, icon: 'account_balance', color: 'emerald' },
                        { label: 'With CBA ID', value: status.stats.totalWithCbaId, icon: 'badge', color: 'indigo' },
                        { label: 'Missing CBA', value: status.stats.missingCba, icon: 'warning', color: status.stats.missingCba > 0 ? 'amber' : 'emerald' },
                        { label: 'Has Backup', value: status.stats.totalWithBackup, icon: 'backup', color: status.stats.totalWithBackup > 0 ? 'violet' : 'slate' },
                        { label: 'Can Rollback', value: status.stats.canRollback ? 'Yes' : 'No', icon: 'undo', color: status.stats.canRollback ? 'emerald' : 'slate' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`material-symbols-outlined text-${stat.color}-500 text-lg`}>{stat.icon}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</span>
                            </div>
                            <p className={`text-2xl font-black text-${stat.color}-600 dark:text-${stat.color}-400`}>
                                {stat.value}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-8">
                <button
                    onClick={handleDryRun}
                    disabled={isRunning}
                    className="px-6 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                >
                    {runningAction === 'dryrun' ? (
                        <div className="size-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <span className="material-symbols-outlined text-lg">visibility</span>
                    )}
                    {runningAction === 'dryrun' ? 'Running Preview...' : 'Dry Run (Preview)'}
                </button>

                <button
                    onClick={() => setShowConfirmModal('migrate')}
                    disabled={isRunning}
                    className="px-6 py-3.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                    {runningAction === 'migrate' ? (
                        <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <span className="material-symbols-outlined text-lg">rocket_launch</span>
                    )}
                    {runningAction === 'migrate' ? 'Migrating...' : 'Run Migration'}
                </button>

                <button
                    onClick={() => setShowConfirmModal('rollback')}
                    disabled={isRunning || !status?.stats.canRollback}
                    className="px-6 py-3.5 rounded-xl bg-amber-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                    {runningAction === 'rollback' ? (
                        <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <span className="material-symbols-outlined text-lg">undo</span>
                    )}
                    {runningAction === 'rollback' ? 'Rolling Back...' : 'Rollback to Previous'}
                </button>

                <button
                    onClick={fetchStatus}
                    disabled={isRunning}
                    className="px-4 py-3.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-lg">refresh</span>
                    Refresh
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-6 p-5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-start gap-3">
                    <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
                    <div>
                        <p className="font-bold text-red-700 dark:text-red-400 text-sm">Error</p>
                        <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
            )}

            {/* Running Overlay */}
            {isRunning && (
                <div className="mb-6 p-6 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                    <div className="flex items-center gap-4">
                        <div className="size-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <div>
                            <p className="font-bold text-blue-700 dark:text-blue-400 text-sm">
                                {runningAction === 'dryrun' ? 'Running preview...' :
                                 runningAction === 'migrate' ? 'Migrating customers to new CBA environment...' :
                                 'Rolling back to previous CBA values...'}
                            </p>
                            <p className="text-blue-600 dark:text-blue-300 text-xs mt-1">
                                This may take a while depending on the number of customers. Do not close this page.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Rollback Results */}
            {rollbackResults && (
                <div className="mb-6 p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="material-symbols-outlined text-emerald-500 text-2xl">check_circle</span>
                        <p className="font-bold text-emerald-700 dark:text-emerald-400">{rollbackResults.message}</p>
                    </div>
                    {rollbackResults.results?.length > 0 && (
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full text-left text-sm">
                                <thead className="text-[10px] uppercase text-slate-500 font-black tracking-widest bg-white/50 dark:bg-slate-900/50">
                                    <tr>
                                        <th className="p-3">Customer</th>
                                        <th className="p-3">Restored CASA</th>
                                        <th className="p-3">Restored CBA ID</th>
                                        <th className="p-3">Replaced CASA</th>
                                        <th className="p-3">Replaced CBA ID</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-emerald-100 dark:divide-emerald-500/10">
                                    {rollbackResults.results.map((r: any, i: number) => (
                                        <tr key={i}>
                                            <td className="p-3 font-bold text-slate-800 dark:text-white">{r.fullName}</td>
                                            <td className="p-3 font-mono text-xs text-emerald-600 dark:text-emerald-400">{r.restoredCasa || '—'}</td>
                                            <td className="p-3 font-mono text-xs text-emerald-600 dark:text-emerald-400">{r.restoredCbaCustomerId || '—'}</td>
                                            <td className="p-3 font-mono text-xs text-slate-400 line-through">{r.replacedCasa || '—'}</td>
                                            <td className="p-3 font-mono text-xs text-slate-400 line-through">{r.replacedCbaCustomerId || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Migration Results */}
            {migrationResults && (
                <div className="bg-white dark:bg-[#0f172a] rounded-[24px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
                    {/* Summary Header */}
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                                    {migrationResults.summary.dryRun ? '🔍 Dry Run Preview' : '✅ Migration Complete'}
                                </h2>
                                <p className="text-xs text-slate-500 font-medium">
                                    {migrationResults.summary.timestamp} · {migrationResults.summary.elapsedSeconds}s · Target: <code className="font-mono text-blue-500">{migrationResults.summary.cbaBaseUrl}</code>
                                </p>
                            </div>
                            <div className="flex gap-3">
                                {[
                                    { label: 'Total', value: migrationResults.summary.totalCustomers, color: 'slate' },
                                    { label: 'Success', value: migrationResults.summary.successful, color: 'emerald' },
                                    { label: 'Existed', value: migrationResults.summary.alreadyExisted, color: 'blue' },
                                    { label: 'Failed', value: migrationResults.summary.failed, color: 'red' },
                                ].map((s, i) => (
                                    <div key={i} className={`px-4 py-2 rounded-xl bg-${s.color}-50 dark:bg-${s.color}-500/10 border border-${s.color}-200 dark:border-${s.color}-500/20 text-center`}>
                                        <p className={`text-lg font-black text-${s.color}-600 dark:text-${s.color}-400`}>{s.value}</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Filter Row */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2">Filter:</span>
                        {['all', 'success', 'failed', 'dry_run'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilterStatus(f)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                    filterStatus === f
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                {f === 'all' ? `All (${migrationResults.results.length})` :
                                 f === 'success' ? `Success (${migrationResults.results.filter(r => r.status === 'success').length})` :
                                 f === 'failed' ? `Failed (${migrationResults.results.filter(r => r.status === 'failed').length})` :
                                 `Preview (${migrationResults.results.filter(r => r.status === 'dry_run').length})`}
                            </button>
                        ))}
                    </div>

                    {/* Results Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-[10px] uppercase text-slate-500 font-black tracking-widest bg-slate-50 dark:bg-slate-900/30">
                                <tr>
                                    <th className="p-4 pl-6">Customer</th>
                                    <th className="p-4">BVN</th>
                                    <th className="p-4">Old CASA</th>
                                    <th className="p-4">New CASA</th>
                                    <th className="p-4">Old CBA ID</th>
                                    <th className="p-4">New CBA ID</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 pr-6">Message</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredResults.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-slate-500">No results match filter.</td>
                                    </tr>
                                ) : filteredResults.map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 pl-6 font-bold text-slate-800 dark:text-white text-sm whitespace-nowrap">{r.fullName}</td>
                                        <td className="p-4 font-mono text-xs text-slate-500">{r.bvn}</td>
                                        <td className="p-4 font-mono text-xs text-slate-400">{r.oldCasa || '—'}</td>
                                        <td className="p-4 font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">{r.newCasa || '—'}</td>
                                        <td className="p-4 font-mono text-xs text-slate-400">{r.oldCbaCustomerId || '—'}</td>
                                        <td className="p-4 font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">{r.newCbaCustomerId || '—'}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                                r.status === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                                                r.status === 'failed' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                                                'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                            }`}>
                                                <span className="material-symbols-outlined text-xs">
                                                    {r.status === 'success' ? 'check_circle' : r.status === 'failed' ? 'cancel' : 'visibility'}
                                                </span>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="p-4 pr-6 text-xs text-slate-500 max-w-[200px] truncate" title={r.message}>{r.message}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoadingStatus && (
                <div className="flex items-center justify-center p-12">
                    <div className="size-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            {/* Empty State (no results yet) */}
            {!isLoadingStatus && !migrationResults && !rollbackResults && !error && (
                <div className="bg-white dark:bg-[#0f172a] rounded-[24px] border border-slate-200 dark:border-slate-800 p-12 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-4">sync_alt</span>
                    <h3 className="text-lg font-black text-slate-700 dark:text-slate-300 mb-2">Ready to Migrate</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                        Use <strong>Dry Run</strong> to preview what will happen, then <strong>Run Migration</strong> to execute.
                        You can always <strong>Rollback</strong> to restore previous values.
                    </p>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <span className={`material-symbols-outlined text-3xl ${showConfirmModal === 'migrate' ? 'text-blue-500' : 'text-amber-500'}`}>
                                {showConfirmModal === 'migrate' ? 'rocket_launch' : 'undo'}
                            </span>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                {showConfirmModal === 'migrate' ? 'Confirm Migration' : 'Confirm Rollback'}
                            </h2>
                        </div>

                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
                            {showConfirmModal === 'migrate'
                                ? 'This will re-register ALL customers with BVN on the current CBA environment and update their CASA & CBA Customer IDs.'
                                : 'This will restore ALL customers to their previous CASA & CBA Customer IDs from before the last migration.'}
                        </p>

                        {showConfirmModal === 'migrate' && status && (
                            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 my-4">
                                <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                                    Target: <code className="font-mono">{status.currentCbaUrl}</code>
                                </p>
                                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                                    {status.stats.totalWithBvn} customers will be processed.
                                </p>
                            </div>
                        )}

                        <div className="flex items-center gap-3 mt-6">
                            <button
                                onClick={() => setShowConfirmModal(null)}
                                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={showConfirmModal === 'migrate' ? handleMigrate : handleRollback}
                                className={`flex-1 px-4 py-3 rounded-xl text-white font-bold text-sm transition-all shadow-lg ${
                                    showConfirmModal === 'migrate'
                                        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                                        : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                                }`}
                            >
                                {showConfirmModal === 'migrate' ? 'Yes, Run Migration' : 'Yes, Rollback'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </StaffLayout>
    );
};

export default CbaMigrationPage;
