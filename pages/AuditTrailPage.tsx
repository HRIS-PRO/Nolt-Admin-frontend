import React, { useEffect, useState } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { formatDateTime } from '../utils/dateFormatter';

interface AuditTrailPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const AuditTrailPage: React.FC<AuditTrailPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const searchQuery = searchParams.get('search') || '';
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<any | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('ALL');

    // Fetch all logs
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                let url = `/api/staff/audit-logs`;
                if (activeCategory !== 'ALL') {
                    url += `?event_category=${activeCategory}`;
                }
                const response = await axios.get(url, { withCredentials: true });
                setLogs(response.data.logs || []);
            } catch (error) {
                console.error("Failed to fetch audit logs", error);
            } finally {
                setIsLoading(false);
            }
        };
        setIsLoading(true);
        fetchLogs();
    }, [activeCategory]);

    // Filter Logic
    const filteredLogs = logs.filter(log => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            log.event_type?.toLowerCase().includes(query) ||
            log.ip_address?.toLowerCase().includes(query) ||
            log.target_entity_id?.toLowerCase().includes(query)
        );
    });

    if (user.role !== 'super_admin' && user.role !== 'superadmin') {
        return (
            <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <div className="size-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-4xl text-slate-400">lock</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Restricted Access</h2>
                    <p className="text-slate-500 max-w-md">You do not have permission to view the audit trail. This section is reserved for Super Administrators.</p>
                </div>
            </StaffLayout>
        );
    }

    const categories = ['ALL', 'AUTH', 'SECURITY', 'LOAN_ACTION', 'INVESTMENT_ACTION', 'ERROR'];

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    System Audit Trail
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                    Comprehensive security and action logs across the platform.
                </p>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${activeCategory === cat ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-[#1e293b] dark:border-slate-700 dark:text-slate-300'}`}
                    >
                        {cat.replace(/_/g, ' ')}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a]/50">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white">Recent Events</h3>
                    <p className="text-slate-500 text-xs font-medium">Select an event to view detailed JSON payload.</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-50/50 dark:bg-[#0f172a]/30 text-xs uppercase text-slate-500 font-black tracking-wider">
                            <tr>
                                <th className="p-4 w-4"></th>
                                <th className="p-4">Event Type</th>
                                <th className="p-4">Target / Actor</th>
                                <th className="p-4">IP Address</th>
                                <th className="p-4">Date</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                            {isLoading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading audit data...</td></tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No records found.</td></tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    const isSecurityAlert = log.event_type.includes('FAILED') || log.event_type.includes('EXCEEDED') || log.event_category === 'ERROR';
                                    const isSuccess = log.event_type.includes('SUCCESS') || log.event_type.includes('APPROVED');
                                    
                                    return (
                                        <tr
                                            key={log.id}
                                            onClick={() => setSelectedLog(log)}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                        >
                                            <td className="p-4">
                                                <div className={`size-3 rounded-full ${isSecurityAlert ? 'bg-red-500 animate-pulse' : isSuccess ? 'bg-green-500' : 'bg-blue-500'} ${log.event_category === 'ERROR' ? 'ring-2 ring-red-200 dark:ring-red-900/50' : ''}`}></div>
                                            </td>
                                            <td className="p-4 font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                                                {log.event_type.replace(/_/g, ' ')}
                                            </td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                                                {log.target_entity_id || `User ${log.actor_id}`}
                                            </td>
                                            <td className="p-4 font-mono text-xs text-slate-500">
                                                {log.ip_address}
                                            </td>
                                            <td className="p-4 text-xs text-slate-500 font-mono italic">
                                                {formatDateTime(log.created_at)}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button className="text-blue-500 hover:text-blue-600 text-xs font-bold uppercase tracking-wider flex items-center gap-1 ml-auto">
                                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Audit Log Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedLog(null)}>
                    <div
                        className="bg-white dark:bg-[#0f172a] w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#0f172a] z-10">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">Event Details</h2>
                                <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">Log ID: {selectedLog.id}</p>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="size-8 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                            >
                                <span className="material-symbols-outlined text-slate-400">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-[#0f172a]/50">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Event Category</p>
                                        <p className="font-bold text-slate-900 dark:text-white">{selectedLog.event_category}</p>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Target Entity</p>
                                        <p className="font-bold text-slate-900 dark:text-white">{selectedLog.target_entity_type} - {selectedLog.target_entity_id || 'N/A'}</p>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Endpoint</p>
                                        <p className="font-mono text-xs text-slate-900 dark:text-white overflow-x-auto">{selectedLog.endpoint}</p>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">IP Address</p>
                                        <p className="font-mono text-sm text-slate-900 dark:text-white">{selectedLog.ip_address}</p>
                                    </div>
                                </div>
                                {selectedLog.metadata?.location && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2 mt-4 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                                            User Location ({selectedLog.metadata.location.city}, {selectedLog.metadata.location.country})
                                        </p>
                                        <div className="bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden h-[200px] relative">
                                            <iframe 
                                                width="100%" 
                                                height="100%" 
                                                style={{ border: 0 }} 
                                                loading="lazy" 
                                                src={`https://maps.google.com/maps?q=${selectedLog.metadata.location.lat},${selectedLog.metadata.location.lng}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                                            ></iframe>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2 mt-4 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">code</span>
                                        Metadata Payload
                                    </p>
                                    <div className="p-4 bg-slate-900 rounded-xl overflow-x-auto text-green-400 font-mono text-xs shadow-inner">
                                        <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </StaffLayout>
    );
};

export default AuditTrailPage;
