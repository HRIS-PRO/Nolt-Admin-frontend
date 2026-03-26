import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StaffLayout from '../components/layouts/StaffLayout';
import axios from 'axios';
import { getStatusStyles } from '../utils/statusStyles';
import { formatDate } from '../utils/dateFormatter';

interface StaffInvestmentDetailsPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const StaffInvestmentDetailsPage: React.FC<StaffInvestmentDetailsPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [investment, setInvestment] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActioning, setIsActioning] = useState(false);

    const fetchInvestment = async () => {
        try {
            const response = await axios.get(`/api/staff/investments/${id}`, { withCredentials: true });
            setInvestment(response.data);
        } catch (error) {
            console.error("Failed to fetch investment details", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchInvestment();
    }, [id, navigate]);

    const handleAction = async (action: 'approve' | 'reject') => {
        if (!confirm(`Are you sure you want to ${action} this investment at the current stage?`)) return;
        setIsActioning(true);
        try {
            await axios.put(`/api/staff/investments/${id}/action`, { action }, { withCredentials: true });
            await fetchInvestment(); // Re-fetch to see updated stage
        } catch (error: any) {
            console.error(`Failed to ${action} investment`, error);
            alert(error.response?.data?.message || `Failed to ${action}`);
        } finally {
            setIsActioning(false);
        }
    };

    if (isLoading) {
        return (
            <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
                <div className="flex items-center justify-center h-[60vh] bg-slate-50 dark:bg-[#0f172a] rounded-[32px] border border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col items-center gap-6">
                        <div className="size-16 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-purple-600 animate-spin"></div>
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm animate-pulse">Loading Application...</p>
                    </div>
                </div>
            </StaffLayout>
        );
    }

    if (!investment) {
        return (
            <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
                <div className="flex flex-col items-center justify-center h-[60vh]">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Application Not Found</h2>
                    <button onClick={() => navigate('/staff/investments')} className="px-8 py-4 rounded-xl bg-purple-600 text-white font-bold">Back to Investments</button>
                </div>
            </StaffLayout>
        );
    }

    const CollapsibleGroup = ({ title, icon, children, defaultOpen = false }: any) => {
        const [isOpen, setIsOpen] = useState(defaultOpen);
        return (
            <div className="bg-white dark:bg-[#1e293b] rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-6">
                <div onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between p-6 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-2xl text-slate-400">{icon}</span>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{title}</h3>
                    </div>
                    <span className={`material-symbols-outlined transition-transform ${isOpen ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>
                </div>
                {isOpen && <div className="p-8 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8">{children}</div>}
            </div>
        );
    };

    const Field = ({ label, value, isLink = false, copy = false }: any) => (
        <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            {isLink && value ? (
                <a href={value} target="_blank" rel="noopener noreferrer" className="text-purple-600 font-bold underline truncate block max-w-full text-sm">View Document</a>
            ) : (
                <p className="font-bold text-slate-900 dark:text-white break-words">{value || 'Not provided'}</p>
            )}
        </div>
    );

    const MaskedField = ({ label, value }: { label: string, value: string }) => {
        const [isMasked, setIsMasked] = useState(true);
        if (!value) return <Field label={label} value="" />;
        const maskedValue = value.replace(/./g, '*');
        return (
            <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    {label}
                    <button 
                        onClick={() => setIsMasked(!isMasked)}
                        className="text-slate-500 hover:text-purple-500 transition-colors bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold"
                    >
                        {isMasked ? 'Reveal' : 'Hide'}
                    </button>
                </p>
                <p className="font-bold text-slate-900 dark:text-white break-words font-mono">
                    {isMasked ? maskedValue : value}
                </p>
            </div>
        );
    };

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/staff/investments')} className="size-12 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">INV-{investment.id}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                                investment.status === 'active' ? 'border-green-500/20 bg-green-500/10 text-green-500' :
                                investment.status === 'completed' ? 'border-blue-500/20 bg-blue-500/10 text-blue-500' :
                                investment.status === 'rejected' || investment.status === 'terminated' ? 'border-red-500/20 bg-red-500/10 text-red-500' :
                                'border-orange-500/20 bg-orange-500/10 text-orange-500'
                            }`}>
                                {investment.status || 'pending'}
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                            {investment.company_name || investment.rep_full_name || investment.customer_name || 'Individual Application'}
                        </h1>
                    </div>
                </div>
                {investment.gift_id && (
                    <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/20 animate-bounce">
                        <span className="material-symbols-outlined filled">featured_seasonal</span>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Gift Investment</span>
                            <span className="text-xs font-bold">Sent with Love 🎁</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Stage Tracker */}
            {(() => {
                const stages = [
                    { id: 'submitted', label: 'Customer Exp.', icon: 'support_agent' },
                    { id: 'compliance_review', label: 'Compliance', icon: 'policy' },
                    { id: 'finance_review', label: 'Finance', icon: 'payments' },
                    { id: 'active', label: 'Active', icon: 'check_circle' }
                ];

                const currentStageId = investment.stage || 'submitted';
                let currentStageIndex = stages.findIndex(s => s.id === currentStageId);
                const activeIndex = currentStageIndex === -1 ? 0 : currentStageIndex;

                return (
                    <div className="bg-white dark:bg-[#0f172a] rounded-[24px] p-8 mb-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                        <div className="flex justify-between items-center relative z-10 overflow-x-auto pb-4 px-4">
                            {stages.map((stage, idx) => {
                                const isCompleted = idx < activeIndex || investment.status === 'active';
                                const isRejected = investment.status === 'rejected' && idx === activeIndex;
                                const isActive = idx === activeIndex && !isRejected && investment.status !== 'active';
                                return (
                                    <div key={stage.id} className="flex flex-col items-center gap-3 min-w-[80px] flex-1">
                                        <div className={`size-10 rounded-full flex z-10 bg-white dark:bg-[#0f172a] items-center justify-center border-2 ${isActive ? 'border-purple-500 text-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : isCompleted ? 'border-green-500 text-green-500' : isRejected ? 'border-red-500 text-red-500' : 'border-slate-200 text-slate-300 dark:border-slate-700 dark:text-slate-600'}`}>
                                            <span className="material-symbols-outlined text-lg">{isCompleted ? 'check' : isRejected ? 'close' : stage.icon}</span>
                                        </div>
                                        <p className={`text-[10px] font-black uppercase text-center ${isActive ? 'text-purple-500' : isRejected ? 'text-red-500' : 'text-slate-400'}`}>{stage.label}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                <div className="xl:col-span-8 space-y-8">
                    {/* Summary Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-[24px] p-8 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start shadow-xl shadow-slate-200/20 dark:shadow-none">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Investment Plan</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white capitalize text-nowrap">{investment.investment_type?.replace(/_/g, ' ') || 'Investment'}</h3>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Principal Amount</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                                {investment.currency === 'USD' ? '$' : '₦'}{Number(investment.investment_amount).toLocaleString()}
                            </h3>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tenure</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{investment.tenure_days / 30} Months</h3>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-1">Interest Rate</p>
                            <h3 className="text-3xl font-black text-green-600 dark:text-green-400">{investment.interest_rate}% P.A</h3>
                        </div>
                    </div>

                    <CollapsibleGroup title="Personal & Contact Data" icon="person" defaultOpen={true}>
                        <Field label="Full Name" value={`${investment.title ? investment.title + ' ' : ''}${investment.rep_full_name || investment.customer_name || 'Individual'}`} />
                        <Field label="Gender" value={investment.gender} />
                        <Field label="Date of Birth" value={investment.dob ? formatDate(investment.dob) : ''} />
                        <Field label="Email Address" value={investment.customer_email} />
                        <Field label="Phone Number" value={investment.rep_phone_number || investment.customer_phone} />
                        <Field label="Mother's Maiden Name" value={investment.mother_maiden_name} />
                        <Field label="Religion" value={investment.religion} />
                        <Field label="Marital Status" value={investment.marital_status} />
                        
                        <Field label="State of Origin" value={investment.rep_state_of_origin} />
                        <Field label="State of Residence" value={investment.rep_state_of_residence} />
                        <Field label="Home Address" value={`${investment.rep_house_number ? investment.rep_house_number + ', ' : ''}${investment.rep_street_address || ''}`} />
                        
                        <MaskedField label="BVN" value={investment.rep_bvn || investment.bvn} />
                        <MaskedField label="NIN" value={investment.rep_nin || investment.nin} />
                    </CollapsibleGroup>

                    {investment.entity_type === 'CORPORATE' && (
                        <CollapsibleGroup title="Corporate Data" icon="domain" defaultOpen={true}>
                            <Field label="Company Name" value={investment.company_name} />
                            <Field label="Business Nature" value={investment.business_nature} />
                            <Field label="Business Address" value={investment.business_address} />
                            <Field label="RC Number" value={investment.rc_number} />
                            <Field label="TIN" value={investment.tin} />
                            <Field label="Date of Incorporation" value={investment.date_of_incorporation ? formatDate(investment.date_of_incorporation) : ''} />
                            
                            <div className="col-span-full border-t border-slate-100 dark:border-slate-800 pt-6">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Authorized Representative</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Field label="Is Authorized Rep?" value={investment.is_authorized_rep ? 'Yes' : 'No'} />
                                    <Field label="Rep Phone Number" value={investment.auth_rep_phone} />
                                </div>
                            </div>

                            {/* Directors Table */}
                            {investment.directors && (
                                <div className="col-span-full border-t border-slate-100 dark:border-slate-800 pt-6">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Board of Directors</p>
                                    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 dark:bg-slate-800/50 font-black uppercase text-slate-500">
                                                <tr>
                                                    <th className="p-3">Name</th>
                                                    <th className="p-3">Phone</th>
                                                    <th className="p-3">BVN/NIN</th>
                                                    <th className="p-3">PEP?</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                {(typeof investment.directors === 'string' ? JSON.parse(investment.directors) : investment.directors).map((d: any, i: number) => (
                                                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                        <td className="p-3 font-bold truncate max-w-[150px] capitalize">{`${d.firstName} ${d.surname}`}</td>
                                                        <td className="p-3 font-mono">{d.phone}</td>
                                                        <td className="p-3 font-mono text-slate-500">{d.bvn}</td>
                                                        <td className="p-3">
                                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${d.isPep ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                                                                {d.isPep ? 'YES' : 'NO'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </CollapsibleGroup>
                    )}

                    {investment.nok_name && (
                        <CollapsibleGroup title="Next of Kin Data" icon="family_history">
                            <Field label="Name" value={investment.nok_name} />
                            <Field label="Relationship" value={investment.nok_relationship} />
                            <Field label="Address" value={investment.nok_address} />
                        </CollapsibleGroup>
                    )}

                    {(investment.rep_id_url || investment.utility_bill_url || investment.cac_url || investment.secondary_id_url || investment.company_profile_url || investment.status_report_url || investment.memart_url || investment.annual_returns_url || investment.board_resolution_url || investment.signatures) && (
                        <CollapsibleGroup title="Secure Vault Documents" icon="folder_open">
                            <Field label="Passport / Government ID" value={investment.rep_id_url} isLink />
                            <Field label="Utility Bill" value={investment.utility_bill_url} isLink />
                            <Field label="Rep Selfie" value={investment.rep_selfie_url} isLink />
                            <Field label="Secondary / Director ID" value={investment.secondary_id_url} isLink />
                            
                            {investment.entity_type === 'CORPORATE' && (
                                <>
                                    <Field label="CAC Certificate" value={investment.cac_url} isLink />
                                    <Field label="Company Profile" value={investment.company_profile_url} isLink />
                                    <Field label="Status Report" value={investment.status_report_url} isLink />
                                    <Field label="MEMART" value={investment.memart_url} isLink />
                                    <Field label="Annual Returns" value={investment.annual_returns_url} isLink />
                                    <Field label="Board Resolution" value={investment.board_resolution_url} isLink />
                                </>
                            )}
                            
                            {investment.signatures && investment.signatures.length > 0 && <Field label="Signature" value={investment.signatures[0]} isLink />}
                        </CollapsibleGroup>
                    )}

                    {investment.gift_id && (
                        <CollapsibleGroup title="Gift Details" icon="featured_seasonal" defaultOpen={true}>
                            <div className="col-span-full p-6 rounded-2xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 flex flex-col md:flex-row items-center gap-6">
                                <div className="size-16 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0">
                                    <span className="material-symbols-outlined text-3xl">favorite</span>
                                </div>
                                <div className="space-y-4 flex-1">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Field label="From (Gifter)" value={investment.gifter_name} />
                                        <Field label="Gift Amount" value={`₦${Number(investment.gift_amount).toLocaleString()}`} />
                                    </div>
                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-rose-100 dark:border-rose-900/20 italic text-sm text-slate-600 dark:text-slate-300">
                                        "{investment.gift_message || 'No personal message provided.'}"
                                    </div>
                                </div>
                            </div>
                        </CollapsibleGroup>
                    )}

                    {investment.proof_of_payment_url && (
                        <CollapsibleGroup title="Payment Evidence" icon="receipt_long" defaultOpen={true}>
                            <Field label="Proof of Payment" value={investment.proof_of_payment_url} isLink />
                        </CollapsibleGroup>
                    )}
                </div>

                <div className="xl:col-span-4 space-y-6 sticky top-8">
                    {/* Action Card could go here if there are staff actions (e.g. approve investment) */}
                    <div className="bg-white dark:bg-[#1e293b] rounded-[32px] p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-purple-500">info</span>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Application Info</p>
                        </div>
                        <h3 className="text-2xl font-black mb-6 text-slate-900 dark:text-white">Status Tracking</h3>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-sm font-bold text-slate-500">Submission Date</span>
                                <span className="text-sm font-black text-slate-900 dark:text-white">{formatDate(investment.created_at)}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-sm font-bold text-slate-500">Current Stage</span>
                                <span className="text-sm font-black text-slate-900 dark:text-white uppercase">{investment.stage?.replace(/_/g, ' ') || 'Submitted'}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-sm font-bold text-slate-500">Start Date</span>
                                <span className="text-sm font-black text-slate-900 dark:text-white">{investment.start_date ? formatDate(investment.start_date) : '-'}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-sm font-bold text-slate-500">Maturity Date</span>
                                <span className="text-sm font-black text-slate-900 dark:text-white">{investment.maturity_date ? formatDate(investment.maturity_date) : '-'}</span>
                            </div>
                        </div>

                        {investment.status === 'pending' && (() => {
                            const userRole = user?.role;
                            const stage = investment.stage || 'submitted';
                            const canApprove = (
                                (stage === 'submitted' && (userRole === 'customer_experience' || userRole === 'super_admin')) ||
                                (stage === 'compliance_review' && (userRole === 'compliance' || userRole === 'super_admin')) ||
                                (stage === 'finance_review' && (userRole === 'finance' || userRole === 'super_admin'))
                            );

                            if (canApprove) {
                                return (
                                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <p className="text-xs font-bold text-slate-500 mb-4 text-center">You have the necessary permissions to review this stage.</p>
                                        <div className="flex gap-4">
                                            <button 
                                                onClick={() => handleAction('reject')}
                                                disabled={isActioning}
                                                className="flex-1 py-4 text-sm font-bold rounded-xl text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                            >
                                                Reject Application
                                            </button>
                                            <button 
                                                onClick={() => handleAction('approve')}
                                                disabled={isActioning}
                                                className="flex-1 py-4 text-sm font-bold rounded-xl text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/30 disabled:opacity-50 flex justify-center items-center"
                                            >
                                                {isActioning ? <span className="material-symbols-outlined animate-spin">autorenew</span> : 'Approve & Proceed'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            }
                            return (
                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                                    <p className="text-xs font-bold text-slate-500">Waiting for review from the appropriate department.</p>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>

        </StaffLayout>
    );
};

export default StaffInvestmentDetailsPage;
