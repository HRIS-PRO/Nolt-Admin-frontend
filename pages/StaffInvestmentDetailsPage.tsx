import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StaffLayout from '../components/layouts/StaffLayout';
import ActivityTimeline from '../components/ActivityTimeline';
import axios from 'axios';
import { getStatusStyles } from '../utils/statusStyles';
import { formatDate } from '../utils/dateFormatter';
import { maskValue } from '../utils/maskHelper';

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
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [customInterest, setCustomInterest] = useState<string>('');
    const [isProcessingIndemnity, setIsProcessingIndemnity] = useState(false);
    const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
    const [directIndemnityUrl, setDirectIndemnityUrl] = useState<string | null>(null);
    const [officers, setOfficers] = useState<any[]>([]);
    const [draftCASA, setDraftCASA] = useState<string>('');
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnTargetStage, setReturnTargetStage] = useState<string>('');
    const [reason, setReason] = useState('');


    const fetchInvestment = async () => {
        try {
            const response = await axios.get(`/api/staff/investments/${id}`, { withCredentials: true });
            setInvestment(response.data);
            setDraftCASA(response.data.casa_account_number || '');
            const rawInt = response.data.interest_amount;
            setCustomInterest(rawInt && Number(rawInt) > 0 ? String(Number(rawInt)) : '');
        } catch (error) {
            console.error("Failed to fetch investment details", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchOfficers = async () => {
        if (['sales_manager', 'admin', 'super_admin', 'superadmin', 'customer_experience', 'marketing'].includes(user.role || '')) {
            try {
                const response = await axios.get(`/api/staff/users?role=sales_officer&limit=200`, { withCredentials: true });
                setOfficers(response.data.users.filter((u: any) => u.is_active));
            } catch (error) {
                console.error("Failed to fetch officers", error);
            }
        }
    };

    const handleAssignOfficer = async (officerId: string) => {
        if (!confirm("Are you sure you want to reassign this investment?")) return;
        try {
            await axios.patch(`/api/staff/investments/${id}/assign`, {
                sales_officer_id: officerId
            }, { withCredentials: true });
            await fetchInvestment();
            alert("Investment reassigned successfully");
        } catch (error: any) {
            alert(error.response?.data?.message || "Reassignment failed");
        }
    };

    useEffect(() => {
        if (id) {
            fetchInvestment();
            fetchOfficers();
        }
    }, [id, navigate]);

    const handleAction = async (action: 'approve' | 'reject' | 'return', targetStage?: string) => {
        if (action !== 'return') {
            if (!confirm(`Are you sure you want to ${action} this investment at the current stage?`)) return;
        }
        setIsActioning(true);
        try {
            const payload: any = { action };
            if (action === 'return') {
                payload.target_stage = targetStage;
                payload.reason = reason;
            }
            await axios.put(`/api/staff/investments/${id}/action`, payload, { withCredentials: true });
            await fetchInvestment(); // Re-fetch to see updated stage
        } catch (error: any) {
            console.error(`Failed to ${action} investment`, error);
            alert(error.response?.data?.message || `Failed to ${action}`);
        } finally {
            setIsActioning(false);
        }
    };

    const handleLiquidationAction = async (action: 'APPROVE' | 'REJECT') => {
        if (!confirm(`Are you sure you want to ${action} this liquidation request?`)) return;
        setIsActioning(true);
        try {
            await axios.post(`/api/staff/investments/${id}/liquidate-action`, { action }, { withCredentials: true });
            await fetchInvestment();
        } catch (error: any) {
            console.error(`Failed to ${action} liquidation`, error);
            alert(error.response?.data?.message || `Failed to ${action}`);
        } finally {
            setIsActioning(false);
        }
    };

    const handleFinanceUpdate = async (interest_amount: string) => {
        setIsActioning(true);
        try {
            await axios.put(`/api/staff/investments/${id}/finance-fields`, { interest_amount }, { withCredentials: true });
            await fetchInvestment();
            alert("Finance fields updated successfully.");
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to update finance fields");
        } finally {
            setIsActioning(false);
        }
    };

    const handleCASAUpdate = async (casa_account_number: string) => {
        setIsActioning(true);
        try {
            await axios.put(`/api/staff/investments/${id}/casa`, { casa_account_number }, { withCredentials: true });
            await fetchInvestment();
            alert("CASA Account Number updated and customer notified.");
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to update CASA account");
        } finally {
            setIsActioning(false);
        }
    };

    const handleProcessIndemnity = async () => {
        if (!signatureBase64 && !directIndemnityUrl) {
            alert("Please provide a signature or a document URL.");
            return;
        }
        setIsProcessingIndemnity(true);
        try {
            const payload: any = {};
            if (signatureBase64) payload.signature_base64 = signatureBase64;
            if (directIndemnityUrl) payload.indemnity_document_url = directIndemnityUrl;

            await axios.post(`/api/staff/investments/${id}/indemnity`, payload, { withCredentials: true });
            await fetchInvestment();
            setSignatureBase64(null);
            setDirectIndemnityUrl(null);
            alert("Indemnity Agreement updated successfully.");
        } catch (error: any) {
            console.error("Failed to process indemnity", error);
            alert(error.response?.data?.message || "Failed to process indemnity");
        } finally {
            setIsProcessingIndemnity(false);
        }
    };

    const handleFileUpload = async (file: File, type: 'signature' | 'indemnity') => {
        if (type === 'signature') {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSignatureBase64(reader.result as string);
                setDirectIndemnityUrl(null); // Clear direct upload if signature is provided
            };
            reader.readAsDataURL(file);
        } else {
            setIsProcessingIndemnity(true);
            try {
                const uploadData = new FormData();
                uploadData.append('file', file);
                uploadData.append('investment_id', String(id));
                uploadData.append('document_type', 'indemnity_agreement');

                const res = await axios.post('/api/upload', uploadData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    withCredentials: true
                });
                // The upload API returns { document: { file_url: ... } }
                setDirectIndemnityUrl(res.data.document.file_url);
                setSignatureBase64(null); // Clear signature if direct upload is provided
            } catch (err) {
                console.error("Upload failed", err);
                alert("Failed to upload document");
            } finally {
                setIsProcessingIndemnity(false);
            }
        }
    };

    const handleTopUp = () => {
        const plan = investment.investment_type?.includes('VAULT') ? 'VAULT' : investment.investment_type?.includes('SURGE') ? 'SURGE' : 'RISE';
        const draft = {
            id: `T-${Math.floor(Math.random() * 9000) + 1000}`,
            type: 'INVESTMENT',
            subStep: 0,
            label: investment.investment_type || 'NOLT Investment',
            data: {
                isTopUp: true,
                selectedPlan: plan,
                originalInvestmentId: investment.id,
                currency: investment.currency
            },
            updatedAt: Date.now()
        };

        navigate('/investment', { state: { draft } });
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

    const MaskedField = ({ label, value, verified = false }: { label: string, value: string, verified?: boolean }) => {
        const [isMasked, setIsMasked] = useState(true);
        if (!value) return <Field label={label} value="" />;
        const maskedValueDisplay = verified ? maskValue(value) : value.replace(/./g, '*');
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                    <div className="flex items-center gap-2">
                        {verified && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 rounded text-[8px] font-black uppercase tracking-tighter border border-green-500/20">
                                <span className="material-symbols-outlined text-[10px]">verified</span>
                                Verified
                            </span>
                        )}
                        <button
                            onClick={() => setIsMasked(!isMasked)}
                            className="text-slate-500 hover:text-purple-500 transition-colors bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold"
                        >
                            {isMasked ? 'Reveal' : 'Hide'}
                        </button>
                    </div>
                </div>
                <p className="font-bold text-slate-900 dark:text-white break-words font-mono">
                    {isMasked ? maskedValueDisplay : value}
                </p>
            </div>
        );
    };

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            {/* Critical Alert for Missing CASA */}
            {investment && investment.status === 'active' && !investment.casa_account_number && (
                <div className="mb-8 p-6 rounded-[32px] bg-orange-50 dark:bg-orange-600/10 border-2 border-orange-200 dark:border-orange-500/20 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-orange-500/10 animate-in zoom-in-95 duration-500">
                    <div className="flex items-center gap-5">
                        <div className="size-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
                            <span className="material-symbols-outlined text-3xl">warning</span>
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-orange-900 dark:text-orange-200 uppercase tracking-tight">CASA Account Missing</h4>
                            <p className="text-sm font-bold text-orange-800 dark:text-orange-300/80 leading-relaxed">
                                This investment is <span className="underline decoration-2 underline-offset-4">ACTIVE</span> but lacks a CASA number. Certificate dispatch is currently <span className="font-black italic">BLOCKED</span>.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            const input = document.getElementById('casa-input');
                            if (input) {
                                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                input.focus();
                            }
                        }}
                        className="px-8 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/20 whitespace-nowrap"
                    >
                        Resolve Now
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/staff/investments')} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all font-black text-xs uppercase tracking-widest shadow-sm">
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                        Back to List
                    </button>
                    {(investment.status === 'active' || investment.status === 'completed') && (user?.role?.toLowerCase() === 'finance' || user?.role?.toLowerCase() === 'superadmin' || user?.role?.toLowerCase() === 'super_admin') && (
                        <div className="relative inline-block text-left">
                            {/* <button 
                                onClick={() => setOpenDropdownId(openDropdownId === id ? null : (id || null))}
                                className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl ${openDropdownId === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-purple-600 text-white shadow-purple-500/20 hover:bg-purple-700 hover:-translate-y-0.5'}`}
                            >
                                Actions
                                <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${openDropdownId === id ? 'rotate-180' : ''}`}>expand_more</span>
                            </button> */}

                            {openDropdownId === id && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-2 mb-1 border-b border-slate-50 dark:border-slate-700/50">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Management</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setOpenDropdownId(null);
                                            handleTopUp();
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-500 transition-all uppercase tracking-widest group"
                                    >
                                        <div className="size-7 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors text-emerald-500">
                                            <span className="material-symbols-outlined text-base">add_circle</span>
                                        </div>
                                        Top-Up
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">INV-{investment.id}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${investment.status === 'active' ? 'border-green-500/20 bg-green-500/10 text-green-500' :
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
                        {investment.promotion_source && (
                            <p className="mt-2 text-xs font-black uppercase tracking-wider text-red-500">
                                Promotions: {investment.promotion_source}
                            </p>
                        )}
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
                {investment.original_investment_id && (
                    <button
                        onClick={() => navigate(`/staff/investments/${investment.original_investment_id}`)}
                        className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-500/20 hover:bg-purple-700 transition-all group"
                    >
                        <span className="material-symbols-outlined group-hover:scale-110 transition-transform">link</span>
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Top-Up Investment</span>
                            <span className="text-xs font-bold">View Original #INV-{investment.original_investment_id}</span>
                        </div>
                    </button>
                )}
            </div>
            
            {/* System Priority Warnings */}
            <div className="space-y-4 mb-8">
                {!investment.casa_account_number && investment.status === 'active' && (
                    <div className="p-6 rounded-[24px] bg-orange-50 dark:bg-orange-500/10 border-2 border-orange-200 dark:border-orange-500/20 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="size-12 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
                            <span className="material-symbols-outlined">warning</span>
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-black text-orange-900 dark:text-orange-400 uppercase text-xs tracking-widest">Missing Account Information</h4>
                            <p className="text-sm font-bold text-orange-800/80 dark:text-orange-400/80 leading-relaxed">
                                This investment is <b>ACTIVE</b> but is missing a CASA account number. The investment certificate cannot be dispatched to the client until this information is provided in the account settings below.
                            </p>
                        </div>
                    </div>
                )}

                {investment.has_failed_selfie && (
                    <div className="p-6 rounded-[24px] bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/20 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="size-12 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-500/20">
                            <span className="material-symbols-outlined">gpp_maybe</span>
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-black text-red-900 dark:text-red-400 uppercase text-xs tracking-widest">Manual KYC Verification Required</h4>
                            <p className="text-sm font-bold text-red-800/80 dark:text-red-400/80 leading-relaxed">
                                The customer failed automated selfie verification and bypassed the check on their second attempt. <b>Please manually inspect the verification image</b> in the profile section to ensure identity authenticity before final approval.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Stage Tracker */}
            {(() => {
                const isLiq = investment.is_liquidating || investment.liquidation_stage === 'completed' || investment.status === 'liquidated';

                const stages = isLiq ? [
                    { id: 'customer_experience', label: 'CX Review', icon: 'support_agent' },
                    { id: 'internal_audit', label: 'Audit', icon: 'fact_check' },
                    { id: 'md', label: 'MD Appr.', icon: 'verified_user' },
                    { id: 'finance', label: 'Finance', icon: 'payments' },
                    { id: 'completed', label: 'Payout', icon: 'account_balance_wallet' }
                ] : [
                    { id: 'submitted', label: 'Customer Exp.', icon: 'support_agent' },
                    { id: 'compliance_review', label: 'Compliance', icon: 'policy' },
                    { id: 'finance_review', label: 'Finance', icon: 'payments' },
                    { id: 'active', label: 'Active', icon: 'check_circle' }
                ];

                const currentStageId = isLiq
                    ? (investment.liquidation_stage || 'customer_experience')
                    : (investment.stage || 'submitted');

                let currentStageIndex = stages.findIndex(s => s.id === currentStageId);
                const activeIndex = currentStageIndex === -1 ? 0 : currentStageIndex;

                return (
                    <div className="bg-white dark:bg-[#0f172a] rounded-[24px] p-8 mb-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                        <div className="flex justify-between items-center relative z-10 overflow-x-auto pb-4 px-4">
                            {stages.map((stage, idx) => {
                                let isCompleted = false;
                                let isRejected = false;
                                let isActive = false;

                                if (isLiq) {
                                    isCompleted = idx < activeIndex || investment.liquidation_stage === 'completed' || investment.status === 'liquidated';
                                    isActive = idx === activeIndex && !isCompleted;
                                } else {
                                    isCompleted = idx < activeIndex || investment.status === 'active';
                                    isRejected = investment.status === 'rejected' && idx === activeIndex;
                                    isActive = idx === activeIndex && !isRejected && investment.status !== 'active';
                                }

                                return (
                                    <div key={stage.id} className="flex flex-col items-center gap-3 min-w-[80px] flex-1 relative">
                                        <div className={`size-10 rounded-full flex z-10 bg-white dark:bg-[#0f172a] items-center justify-center border-2 ${isActive ? (isLiq ? 'border-orange-500 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'border-purple-500 text-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]') : isCompleted ? (isLiq ? 'border-orange-500 text-orange-500' : 'border-green-500 text-green-500') : isRejected ? 'border-red-500 text-red-500' : 'border-slate-200 text-slate-300 dark:border-slate-700 dark:text-slate-600'}`}>
                                            <span className="material-symbols-outlined text-lg">{isCompleted ? 'check' : isRejected ? 'close' : stage.icon}</span>
                                        </div>
                                        <p className={`text-[10px] font-black uppercase text-center ${isActive ? (isLiq ? 'text-orange-500' : 'text-purple-500') : isRejected ? 'text-red-500' : 'text-slate-400'}`}>{stage.label}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* Top Stats Row (Full Width) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-[#1e293b] rounded-[24px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Investment Plan</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white capitalize text-nowrap truncate">{investment.investment_type?.replace(/_/g, ' ') || 'Investment'}</h3>
                </div>
                <div className="bg-white dark:bg-[#1e293b] rounded-[24px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Principal Amount</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white truncate">
                        {investment.currency === 'USD' ? '$' : '₦'}{Number(investment.investment_amount).toLocaleString()}
                    </h3>
                </div>
                <div className="bg-white dark:bg-[#1e293b] rounded-[24px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tenure</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white truncate">{investment.tenure_days} Days</h3>
                </div>
                <div className="bg-white dark:bg-[#1e293b] rounded-[24px] p-6 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)] flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Interest Rate</p>
                    <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">{investment.interest_rate}% P.A</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-6">
                    <CollapsibleGroup title="Personal & Contact Data" icon="person" defaultOpen={true}>
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-8">
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

                                <MaskedField label="BVN" value={investment.rep_bvn || investment.bvn} verified={investment.is_identity_verified} />
                                <MaskedField label="NIN" value={investment.rep_nin || investment.nin} />
                                {investment.entity_type === 'INDIVIDUAL' && investment.tin_number && <MaskedField label="TIN Number" value={investment.tin_number} />}
                            </div>

                            {investment.rep_selfie_url && (
                                <div className="flex flex-col items-center justify-start pt-4">
                                    <div className="relative group">
                                        <div className="absolute -inset-4 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 rounded-[40px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                        <div className="relative">
                                            <img
                                                src={investment.rep_selfie_url}
                                                alt="Captured Face"
                                                className="w-64 h-80 object-cover rounded-[32px] border-4 border-white dark:border-slate-800 shadow-2xl relative z-0"
                                            />
                                            <div className="absolute top-4 right-4 z-10">
                                                <span className="flex items-center gap-1 px-3 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-lg rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                                                    <span className="material-symbols-outlined text-[14px] text-purple-500">face</span>
                                                    Live Image
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Identity Verification Image</p>
                                </div>
                            )}
                        </div>
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
                                                    <th className="p-3">TIN</th>
                                                    <th className="p-3">Address</th>
                                                    <th className="p-3">PEP?</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                {(investment.directors ? (typeof investment.directors === 'string' ? JSON.parse(investment.directors) : investment.directors) : []).map((d: any, i: number) => (
                                                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                        <td className="p-3 font-bold truncate max-w-[150px] capitalize">{`${d.firstName} ${d.surname}`}</td>
                                                        <td className="p-3 font-mono">{d.phone}</td>
                                                        <td className="p-3 font-mono text-slate-500 text-[10px]">{d.bvn}<br/>{d.nin}</td>
                                                        <td className="p-3 font-mono text-slate-500 text-[10px]">{d.tin || '-'}</td>
                                                        <td className="p-3 text-slate-500 text-[10px] max-w-[150px] truncate" title={d.address}>{d.address || '-'}</td>
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

                    {(investment.bank_name || investment.account_number) && (
                        <CollapsibleGroup title="Payout Bank Details" icon="account_balance" defaultOpen={true}>
                            <Field label="Bank Name" value={investment.bank_name} />
                            <Field label="Account Number" value={investment.account_number} />
                            <Field label="Account Name" value={investment.account_name} />
                        </CollapsibleGroup>
                    )}

                    <CollapsibleGroup title="Indemnity Agreement" icon="gavel" defaultOpen={!investment.indemnity_document_url}>
                        <div className="col-span-full">
                            {investment.indemnity_document_url ? (
                                <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="size-12 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                                            <span className="material-symbols-outlined">verified</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest">Agreement Signed</p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">The indemnity document is active and verified.</p>
                                        </div>
                                    </div>
                                    <a href={investment.indemnity_document_url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-emerald-600 font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm">
                                        View Document
                                    </a>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                                        <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-widest mb-2">Action Required</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white mb-4">The indemnity agreement is currently missing for this investment.</p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase text-slate-500 block">Option 1: Upload Signature Image</label>
                                                <div className="relative group">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'signature')}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    <div className={`p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 ${signatureBase64 ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500/50'}`}>
                                                        <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-purple-500 transition-colors">{signatureBase64 ? 'check_circle' : 'draw'}</span>
                                                        <p className="text-xs font-bold text-slate-500">{signatureBase64 ? 'Signature Selected' : 'Drop signature image here'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase text-slate-500 block">Option 2: Direct Document Upload</label>
                                                <div className="relative group">
                                                    <input
                                                        type="file"
                                                        accept="application/pdf"
                                                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'indemnity')}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    <div className={`p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 ${directIndemnityUrl ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500/50'}`}>
                                                        <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-purple-500 transition-colors">{directIndemnityUrl ? 'check_circle' : 'upload_file'}</span>
                                                        <p className="text-xs font-bold text-slate-500">{directIndemnityUrl ? 'Document Uploaded' : 'Upload signed PDF'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleProcessIndemnity}
                                        disabled={isProcessingIndemnity || (!signatureBase64 && !directIndemnityUrl)}
                                        className="w-full py-4 rounded-2xl bg-purple-600 text-white font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-3"
                                    >
                                        {isProcessingIndemnity ? (
                                            <span className="material-symbols-outlined animate-spin">autorenew</span>
                                        ) : (
                                            <span className="material-symbols-outlined">task_alt</span>
                                        )}
                                        {isProcessingIndemnity ? 'Processing Agreement...' : 'Finalize Indemnity Agreement'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </CollapsibleGroup>
                    {(investment.promotion_source || investment.hear_about_us) && (
                        <CollapsibleGroup title="Marketing Data" icon="campaign">
                            {investment.promotion_source && (
                                <>
                                    <Field label="Promotion Source" value={investment.promotion_source} />
                                    <Field label="Promotion Medium" value={investment.promotion_medium} />
                                    <Field label="Promotion Campaign" value={investment.promotion_campaign} />
                                </>
                            )}
                            <Field label="Hear About Us" value={investment.hear_about_us} />
                            {/* <Field label="Referral Code" value={investment.marketing_referral} /> */}
                            <Field label="Attributed Officer" value={investment.marketing_officer} />
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

                    {(investment.payment_receipt_url || investment.payment_reference) && (
                        <CollapsibleGroup title="Payment Evidence" icon="receipt_long" defaultOpen={true}>
                            {!investment.payment_receipt_url && investment.payment_reference && (
                                <div className="col-span-full p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex flex-col items-start gap-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Payment Gateway</p>
                                    <p className="font-bold text-sm text-blue-900 dark:text-blue-300">Paystack (Automated)</p>
                                    <p className="text-[10px] font-mono mt-1 text-slate-500">Ref: {investment.payment_reference}</p>
                                </div>
                            )}

                            {investment.payment_receipt_url && (
                                <>
                                    <div className="col-span-full p-4 rounded-xl mb-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex flex-col items-start gap-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Payment Method</p>
                                        <p className="font-bold text-sm text-emerald-900 dark:text-emerald-300">Manual Bank Transfer</p>
                                    </div>
                                    <Field label="Uploaded Receipt" value={investment.payment_receipt_url} isLink />
                                </>
                            )}
                        </CollapsibleGroup>
                    )}
                </div>

                <div className="lg:col-span-4 space-y-6 sticky top-8">
                    {/* CASA Setting Card */}
                    <div className="bg-white dark:bg-[#1e293b] rounded-[32px] p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none mb-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="size-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
                                <span className="material-symbols-outlined text-xl">account_balance</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Account Management</p>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">CASA Setting</h3>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block px-1">CASA Account Number</label>
                            <div className="relative flex items-center gap-3">
                                <input 
                                    id="casa-input"
                                    type="text" 
                                    value={draftCASA}
                                    onChange={(e) => setDraftCASA(e.target.value)}
                                    placeholder="Enter CASA Number..."
                                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-slate-400"
                                />
                                <button
                                    onClick={() => handleCASAUpdate(draftCASA)}
                                    disabled={isActioning}
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-lg shadow-purple-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center"
                                >
                                    {isActioning ? <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'SAVE'}
                                </button>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 px-1 italic leading-relaxed">
                                Clicking "Save" will automatically email the client their certificate if active.
                            </p>
                        </div>
                    </div>

                    {/* Liquidation Action Card */}
                    {investment.is_liquidating && (
                        <div className="bg-orange-50 dark:bg-orange-950/20 rounded-[32px] p-8 border-2 border-orange-200 dark:border-orange-500/20 shadow-xl shadow-orange-500/10 mb-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>

                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className="size-10 rounded-xl bg-orange-500 text-white flex items-center justify-center animate-pulse">
                                    <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Liquidation</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">
                                        Stage: {investment.liquidation_stage?.replace(/_/g, ' ') || 'Unknown'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6 bg-white dark:bg-slate-900/50 p-5 rounded-2xl border border-orange-100 dark:border-orange-900/40 relative z-10">
                                <div className="flex justify-between items-center pb-2 border-b border-orange-50 dark:border-orange-900/20">
                                    <span className="text-[10px] font-black uppercase text-slate-500">Requested</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white">
                                        ₦{Number(investment.liquidation_requested_amount || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-orange-50 dark:border-orange-900/20">
                                    <span className="text-[10px] font-black uppercase text-slate-500">Penalty Fee</span>
                                    <span className="text-sm font-black text-red-500">
                                        ₦{Number(investment.liquidation_penalty_amount || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-[10px] font-black uppercase text-slate-500">Net Payout</span>
                                    <span className="text-lg font-black text-green-500">
                                        ₦{Math.max(0, Number(investment.liquidation_requested_amount || 0) - Number(investment.liquidation_penalty_amount || 0)).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {(() => {
                                const userRole = user?.role?.toLowerCase();
                                const stage = investment.liquidation_stage;
                                const canApproveLiq = (
                                    userRole === 'super_admin' || userRole === 'superadmin' ||
                                    (stage === 'customer_experience' && userRole === 'customer_experience') ||
                                    (stage === 'internal_audit' && userRole === 'internal_audit') ||
                                    (stage === 'md' && userRole === 'md') ||
                                    (stage === 'finance' && userRole === 'finance')
                                );

                                if (canApproveLiq) {
                                    return (
                                        <div className="flex gap-3 relative z-10">
                                            <button
                                                onClick={() => handleLiquidationAction('REJECT')}
                                                disabled={isActioning}
                                                className="flex-1 py-4 text-[10px] uppercase tracking-widest font-black rounded-xl text-red-600 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 hover:bg-red-50 transition-colors disabled:opacity-50"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleLiquidationAction('APPROVE')}
                                                disabled={isActioning}
                                                className="flex-[2] py-4 text-[10px] uppercase tracking-widest font-black rounded-xl text-white bg-orange-500 hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-50"
                                            >
                                                {isActioning ? 'Processing...' : 'Approve & Pass'}
                                            </button>
                                        </div>
                                    );
                                }
                                return (
                                    <p className="text-[10px] font-black text-orange-500/60 uppercase text-center relative z-10">
                                        Waiting for {stage?.replace(/_/g, ' ')} department validation.
                                    </p>
                                );
                            })()}
                        </div>
                    )}
                    {/* Assignment Control Card */}
                    {['sales_manager', 'admin', 'super_admin', 'superadmin', 'customer_experience'].includes(user.role?.toLowerCase() || '') && (
                        <div className="bg-white dark:bg-[#1e293b] rounded-[32px] p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-blue-500">person_add</span>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Account Assignment</p>
                            </div>
                            <h3 className="text-2xl font-black mb-6 text-slate-900 dark:text-white">Sales Officer</h3>

                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-black">
                                            {investment.officer_name ? investment.officer_name[0] : 'U'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">
                                                {investment.officer_name || 'Unassigned'}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight text-nowrap truncate max-w-[150px]">
                                                {investment.officer_email || 'Promotion / Marketing'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative">
                                    <select
                                        value={investment.sales_officer_id || ''}
                                        onChange={(e) => handleAssignOfficer(e.target.value)}
                                        className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-sm font-black text-slate-900 dark:text-white appearance-none cursor-pointer focus:border-blue-500 transition-all outline-none"
                                    >
                                        <option value="">Select Officer to Reassign</option>
                                        {officers.map(off => (
                                            <option key={off.id} value={off.id}>{off.full_name}</option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                                </div>
                            </div>
                        </div>
                    )}

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

                            {investment.referral_code && (
                                <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-sm font-bold text-slate-500">Referral Code</span>
                                    <span className="px-2 py-1 bg-purple-500/10 text-purple-600 rounded text-[10px] font-black uppercase tracking-widest border border-purple-500/20">{investment.referral_code}</span>
                                </div>
                            )}
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
                                        <div className="flex gap-4 mb-4">
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

                                        {stage !== 'submitted' && (
                                            <button
                                                onClick={() => {
                                                    setReason('');
                                                    setReturnTargetStage('');
                                                    setShowReturnModal(true);
                                                }}
                                                disabled={isActioning}
                                                className="w-full py-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider hover:bg-amber-100 transition-all border border-amber-200"
                                            >
                                                Return
                                            </button>
                                        )}
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

                    {/* Finance Overrides Card */}
                    {(user?.role?.toLowerCase() === 'finance' || user?.role?.toLowerCase() === 'super_admin' || user?.role?.toLowerCase() === 'superadmin') && (
                        <div className="bg-white dark:bg-[#1e293b] rounded-[32px] p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-green-500">payments</span>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Finance Control</p>
                            </div>
                            <h3 className="text-2xl font-black mb-6 text-slate-900 dark:text-white">Finance Overrides</h3>

                            <div className="space-y-6">
                                {(() => {
                                    const principal = Number(investment.investment_amount) || 0;
                                    const rate = Number(investment.interest_rate) || 0;
                                    const tenureDays = Number(investment.tenure_days) || 0;
                                    const type = investment.investment_type || '';

                                    let projected = 0;
                                    const isSurge = type.includes('SURGE');
                                    const isRiseOrVault = type.includes('RISE') || type.includes('VAULT');

                                    if (isSurge) {
                                        let balance = principal;
                                        let daysRemaining = tenureDays;
                                        let totalGrossInterest = 0;
                                        while (daysRemaining >= 30) {
                                            const periodInterest = balance * (rate / 100) * (30 / 365);
                                            const periodWht = periodInterest * 0.10;
                                            totalGrossInterest += periodInterest;
                                            balance += (periodInterest - periodWht);
                                            daysRemaining -= 30;
                                        }
                                        if (daysRemaining > 0) {
                                            const periodInterest = balance * (rate / 100) * (daysRemaining / 365);
                                            const periodWht = periodInterest * 0.10;
                                            totalGrossInterest += periodInterest;
                                            balance += (periodInterest - periodWht);
                                        }
                                        projected = totalGrossInterest;
                                    } else if (isRiseOrVault) {
                                        projected = principal * (rate / 100) * (tenureDays / 365);
                                    }

                                    projected = Math.round(projected * 100) / 100;

                                    const hasValidStoredInterest = investment.interest_amount && Number(investment.interest_amount) > 0;
                                    const activeInterest = customInterest !== '' ? Number(customInterest) : (hasValidStoredInterest ? Number(investment.interest_amount) : projected);
                                    const activeWht = Math.round(activeInterest * 0.10 * 100) / 100;
                                    const netMaturity = principal + activeInterest - activeWht;

                                    return (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500">Interest Amount (₦)</label>
                                                <div className="flex flex-col 2xl:flex-row gap-2">
                                                    <input
                                                        type="number"
                                                        value={customInterest === '' && !hasValidStoredInterest ? projected : customInterest}
                                                        onChange={(e) => setCustomInterest(e.target.value)}
                                                        className="flex-1 w-full min-w-0 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white"
                                                    />
                                                    <button
                                                        onClick={() => handleFinanceUpdate(customInterest || String(projected))}
                                                        disabled={isActioning}
                                                        className="px-6 py-3 w-full 2xl:w-auto shrink-0 bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-purple-700 transition-colors disabled:opacity-50"
                                                    >
                                                        Update
                                                    </button>
                                                </div>
                                                {customInterest === '' && !hasValidStoredInterest && (
                                                    <p className="text-[10px] italic text-slate-400">Value is implicitly calculated. Type to override.</p>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Derived WHT (10%)</p>
                                                    <p className="text-lg font-black text-red-500">₦{activeWht.toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Net Maturity Value</p>
                                                    <p className="text-lg font-black text-green-500">₦{netMaturity.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* CASA Account Input Card */}
                    <div className="bg-white dark:bg-[#1e293b] rounded-[32px] p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-blue-500">account_balance</span>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Account Management</p>
                        </div>
                        <h3 className="text-2xl font-black mb-6 text-slate-900 dark:text-white">CASA Setting</h3>

                        <div className="space-y-4">
                            {['sales_manager', 'admin', 'super_admin', 'superadmin', 'finance'].includes(user?.role?.toLowerCase() || '') ? (
                                <>
                                    {!investment.casa_account_number && investment.status === 'active' && (
                                        <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl flex items-start gap-3">
                                            <span className="material-symbols-outlined text-orange-500 mt-0.5">warning</span>
                                            <p className="text-xs font-bold text-orange-800 dark:text-orange-400 leading-relaxed">
                                                This investment is ACTIVE but missing a CASA number. Certificate cannot be dispatched until provided.
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase text-slate-500">CASA Account Number</label>

                                        {!investment.casa_account_number && investment.suggested_casa_number && (
                                            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <p className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">Previous Account Found</p>
                                                    <p className="text-sm font-bold text-blue-900 dark:text-blue-300 tracking-wider font-mono">{investment.suggested_casa_number}</p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const el = document.getElementById('casa_input') as HTMLInputElement;
                                                        if (el) el.value = investment.suggested_casa_number;
                                                    }}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition"
                                                >
                                                    Use This
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex flex-col 2xl:flex-row gap-2">
                                            <input
                                                type="text"
                                                placeholder="Enter CASA Number..."
                                                defaultValue={investment.casa_account_number || ''}
                                                id="casa_number_input"
                                                className="flex-1 w-full min-w-0 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
                                            />
                                            <button
                                                onClick={() => {
                                                    const val = (document.getElementById('casa_number_input') as HTMLInputElement).value;
                                                    handleCASAUpdate(val);
                                                }}
                                                disabled={isActioning}
                                                className="px-6 py-3 w-full 2xl:w-auto shrink-0 bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-purple-700 transition-colors disabled:opacity-50"
                                            >
                                                Save
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 italic">Clicking "Save" will automatically email the client their certificate if active.</p>
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-sm font-bold text-slate-500 text-nowrap">Assigned CASA Number</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase">{investment.casa_account_number || 'Pending'}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#1e293b] rounded-[24px] overflow-hidden border border-slate-200 dark:border-slate-800">
                        <ActivityTimeline investmentId={id} />
                    </div>

                    {/* Return Application Modal */}
                    {showReturnModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Return Application</h3>
                                        <p className="text-sm text-slate-500">Select where to return this application to.</p>
                                    </div>
                                    <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Return To Stage</label>
                                        <select
                                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold appearance-none outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                                            value={returnTargetStage}
                                            onChange={(e) => setReturnTargetStage(e.target.value)}
                                        >
                                            <option value="">Select Stage...</option>
                                            {(() => {
                                                const allStages = [
                                                    { id: 'submitted', label: 'Customer Exp.' },
                                                    { id: 'compliance_review', label: 'Compliance' },
                                                    { id: 'finance_review', label: 'Finance' }
                                                ];
                                                const currentIdx = allStages.findIndex(s => s.id === investment.stage);
                                                return allStages.filter((_, idx) => idx < currentIdx).map(s => (
                                                    <option key={s.id} value={s.id}>{s.label}</option>
                                                ));
                                            })()}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
                                            Reason for Return <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-400"
                                            placeholder="Please explain why you are returning this application..."
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setShowReturnModal(false)}
                                        className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!returnTargetStage) {
                                                alert("Please select a target stage.");
                                                return;
                                            }
                                            if (!reason.trim()) {
                                                alert("Please provide a reason.");
                                                return;
                                            }
                                            handleAction('return', returnTargetStage);
                                            setShowReturnModal(false);
                                        }}
                                        disabled={isActioning || !returnTargetStage || !reason.trim()}
                                        className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold shadow-lg shadow-amber-500/20 hover:bg-amber-600 hover:shadow-amber-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                                    >
                                        {isActioning ? 'Processing...' : 'Confirm Return'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </StaffLayout>
    );
};

export default StaffInvestmentDetailsPage;
