import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import StaffLayout from '../components/layouts/StaffLayout';
import ActivityTimeline from '../components/ActivityTimeline';
import axios from 'axios';
import { getStatusStyles } from '../utils/statusStyles';
import { formatDate } from '../utils/dateFormatter';
import { maskValue } from '../utils/maskHelper';

interface StaffInvestmentDetailsPageProps {
    user: { id?: string | number; name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const CollapsibleGroup = ({ title, icon, children, defaultOpen = false, actionButton }: any) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="bg-white dark:bg-[#1e293b] rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-6">
            <div className="flex items-center justify-between p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setIsOpen(!isOpen)}>
                    <span className="material-symbols-outlined text-2xl text-slate-400">{icon}</span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{title}</h3>
                </div>
                <div className="flex items-center gap-4">
                    {actionButton && <div onClick={(e) => e.stopPropagation()}>{actionButton}</div>}
                    <span onClick={() => setIsOpen(!isOpen)} className={`material-symbols-outlined cursor-pointer transition-transform ${isOpen ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>
                </div>
            </div>
            {isOpen && <div className="p-8 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8">{children}</div>}
        </div>
    );
};

const Field = ({ label, value, isLink = false, copy = false, docId = undefined, onRemove = undefined }: any) => (
    <div className="space-y-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        {isLink && value ? (
            <div className="flex items-center gap-3">
                <a href={value} target="_blank" rel="noopener noreferrer" className="text-purple-600 font-bold underline truncate max-w-full text-sm">View Document</a>
                {onRemove && docId && (
                    <button 
                        onClick={() => onRemove(docId)} 
                        className="text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 p-1 rounded transition-colors flex items-center justify-center shadow-sm"
                        title="Delete Document"
                    >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                )}
            </div>
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

const StaffInvestmentDetailsPage: React.FC<StaffInvestmentDetailsPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [investment, setInvestment] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActioning, setIsActioning] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadLoading, setUploadLoading] = useState(false);
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
    const [activePanel, setActivePanel] = useState<'overview' | 'manage' | 'activity'>('overview');

    const [showBioEditModal, setShowBioEditModal] = useState(false);
    const [bioEditData, setBioEditData] = useState<any>({});
    const [isSavingBio, setIsSavingBio] = useState(false);

    const openBioEditModal = () => {
        setBioEditData({
            title: investment.title || '',
            rep_full_name: investment.rep_full_name || '',
            company_name: investment.company_name || '',
            gender: investment.gender || '',
            dob: investment.dob ? new Date(investment.dob).toISOString().split('T')[0] : '',
            customer_email: investment.customer_email || '',
            rep_phone_number: investment.rep_phone_number || investment.customer_phone || '',
            mother_maiden_name: investment.mother_maiden_name || '',
            religion: investment.religion || '',
            marital_status: investment.marital_status || '',
            rep_state_of_origin: investment.rep_state_of_origin || '',
            rep_state_of_residence: investment.rep_state_of_residence || '',
            rep_house_number: investment.rep_house_number || '',
            rep_street_address: investment.rep_street_address || '',
            rep_bvn: investment.rep_bvn || '',
            rep_nin: investment.rep_nin || '',
            tin_number: investment.tin_number || '',
            nok_name: investment.nok_name || '',
            nok_relationship: investment.nok_relationship || '',
            nok_address: investment.nok_address || ''
        });
        setShowBioEditModal(true);
    };

    const handleSaveBioData = async () => {
        setIsSavingBio(true);
        try {
            await axios.put(`/api/staff/investments/${id}/bio`, bioEditData, { withCredentials: true });
            alert("Bio data updated successfully");
            setShowBioEditModal(false);
            fetchInvestment();
        } catch (error: any) {
            console.error("Error updating bio data:", error);
            alert(error.response?.data?.message || "Failed to update bio data");
        } finally {
            setIsSavingBio(false);
        }
    };

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

    const handleStaffUpload = async () => {
        if (!uploadFile || !id) return;
        setUploadLoading(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('investment_id', id);
        formData.append('document_type', 'staff_supporting_doc');

        try {
            await axios.post(`/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            });
            setUploadFile(null);
            const fileInput = document.getElementById('staff-upload-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            await fetchInvestment();
            alert("Document uploaded successfully");
        } catch (error: any) {
            console.error("Upload failed", error);
            alert(error.response?.data?.message || "Upload failed");
        } finally {
            setUploadLoading(false);
        }
    };

    const handleDeleteDocument = async (docId: string | number) => {
        if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) return;
        setIsActioning(true);
        try {
            await axios.delete(`/api/upload/${docId}`, {
                data: { investment_id: id },
                withCredentials: true
            });
            await fetchInvestment();
            alert("Document deleted successfully");
        } catch (error: any) {
            console.error("Delete failed", error);
            alert(error.response?.data?.message || "Failed to delete document");
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
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none flex items-center gap-3">
                            {investment.company_name || investment.rep_full_name || investment.customer_name || 'Individual Application'}
                            {investment.is_minor_beneficiary && (
                                <span className="px-2 py-1 rounded-lg border border-teal-500/20 bg-teal-500/10 text-[10px] font-black uppercase tracking-widest leading-none text-teal-600 dark:text-teal-400">
                                    For Minor
                                </span>
                            )}
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
                    <CollapsibleGroup 
                        title="Personal & Contact Data" 
                        icon="person" 
                        defaultOpen={true}
                        actionButton={
                            (user?.role === 'customer_experience' || user?.role === 'super_admin' || user?.role === 'superadmin') &&
                            (investment.stage === 'customer_experience' || investment.stage === 'submitted') ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); openBioEditModal(); }}
                                    className="px-4 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                    Edit Bio Data
                                </button>
                            ) : undefined
                        }
                    >
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

                    {investment.entity_type === 'JOINT' && investment.partner_details && (
                        <CollapsibleGroup title="Co-Investor Data" icon="group" defaultOpen={true}>
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-8">
                                    <Field label="Full Name" value={`${investment.partner_details.title ? investment.partner_details.title + ' ' : ''}${investment.partner_details.rep_full_name || investment.partner_details.customer_name || 'Individual'}`} />
                                    <Field label="Gender" value={investment.partner_details.gender} />
                                    <Field label="Date of Birth" value={investment.partner_details.dob ? formatDate(investment.partner_details.dob) : ''} />
                                    <Field label="Email Address" value={investment.partner_details.customer_email} />
                                    <Field label="Phone Number" value={investment.partner_details.rep_phone_number || investment.partner_details.customer_phone} />
                                    <Field label="Mother's Maiden Name" value={investment.partner_details.mother_maiden_name} />
                                    <Field label="Religion" value={investment.partner_details.religion} />
                                    <Field label="Marital Status" value={investment.partner_details.marital_status} />

                                    <Field label="State of Origin" value={investment.partner_details.rep_state_of_origin} />
                                    <Field label="State of Residence" value={investment.partner_details.rep_state_of_residence} />
                                    <Field label="Home Address" value={`${investment.partner_details.rep_house_number ? investment.partner_details.rep_house_number + ', ' : ''}${investment.partner_details.rep_street_address || ''}`} />

                                    <MaskedField label="BVN" value={investment.partner_details.rep_bvn || investment.partner_details.bvn} verified={investment.partner_details.is_identity_verified} />
                                    <MaskedField label="NIN" value={investment.partner_details.rep_nin || investment.partner_details.nin} />
                                </div>

                                {investment.partner_details.rep_selfie_url && (
                                    <div className="flex flex-col items-center justify-start pt-4">
                                        <div className="relative group">
                                            <div className="absolute -inset-4 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 rounded-[40px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                            <div className="relative">
                                                <img
                                                    src={investment.partner_details.rep_selfie_url}
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
                    )}

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

                    {(investment.rep_id_url || investment.utility_bill_url || investment.cac_url || investment.secondary_id_url || investment.company_profile_url || investment.status_report_url || investment.memart_url || investment.annual_returns_url || investment.board_resolution_url || investment.signatures || (investment.documents && investment.documents.length > 0)) && (
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

                            {/* Additional Documents from Staff or Post-Submission */}
                            {(() => {
                                const explicitDocTypes = ['selfie', 'rep_selfie', 'payment_receipt', 'indemnity_agreement', 'passport', 'id_card', 'utility_bill', 'cac_document', 'board_resolution', 'memart'];
                                const filteredDocs = (investment.documents || []).filter((doc: any) => 
                                    !explicitDocTypes.includes(doc.document_type?.toLowerCase())
                                );
                                
                                const uniqueDocs: any[] = [];
                                const seenUrls = new Set();
                                filteredDocs.forEach((doc: any) => {
                                    if (doc.file_url && !seenUrls.has(doc.file_url)) {
                                        seenUrls.add(doc.file_url);
                                        uniqueDocs.push(doc);
                                    }
                                });

                                if (uniqueDocs.length === 0) return null;

                                return (
                                    <div className="col-span-full mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Additional Documents</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {uniqueDocs.map((doc: any) => (
                                                <Field 
                                                    key={doc.id} 
                                                    label={doc.document_type?.replace(/_/g, ' ') || 'Document'} 
                                                    value={doc.file_url} 
                                                    isLink 
                                                    docId={doc.id}
                                                    onRemove={handleDeleteDocument}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Staff Upload Section */}
                            {(() => {
                                const userRole = user.role?.toLowerCase();
                                const isAssigned = investment.sales_officer_id === user.id;
                                const isCX = userRole === 'customer_experience' || userRole === 'cx';
                                const isAdmin = ['admin', 'super_admin', 'superadmin'].includes(userRole || '');
                                
                                if (isAssigned || isCX || isAdmin) {
                                    return (
                                        <div className="col-span-full mt-8 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800">
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="material-symbols-outlined text-purple-500">add_circle</span>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Staff Upload Control</p>
                                            </div>
                                            
                                            <div className="flex flex-col md:flex-row gap-4 items-center">
                                                <input 
                                                    id="staff-upload-input"
                                                    type="file" 
                                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                                    className="flex-1 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/40 dark:file:text-purple-300"
                                                />
                                                <button
                                                    onClick={handleStaffUpload}
                                                    disabled={!uploadFile || uploadLoading}
                                                    className="bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest px-8 py-3 rounded-xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center min-w-[140px]"
                                                >
                                                    {uploadLoading ? <span className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span> : 'UPLOAD DOC'}
                                                </button>
                                            </div>
                                            <p className="mt-2 text-[10px] text-slate-400 italic">Visible to all authorized staff. Use for missing documentation.</p>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
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

                                <div className="lg:col-span-4 space-y-6 sticky top-8 lg:top-24">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-2 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-1">
                        <button 
                            onClick={() => setActivePanel('overview')} 
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activePanel === 'overview' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                        >
                            <span className="material-symbols-outlined text-[16px]">page_info</span>
                            Status
                        </button>
                        {['sales_manager', 'admin', 'super_admin', 'superadmin', 'finance', 'customer_experience'].includes(user?.role?.toLowerCase() || '') && (
                            <button 
                                onClick={() => setActivePanel('manage')} 
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activePanel === 'manage' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                            >
                                <span className="material-symbols-outlined text-[16px]">tune</span>
                                Manage
                            </button>
                        )}
                        <button 
                            onClick={() => setActivePanel('activity')} 
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activePanel === 'activity' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                        >
                            <span className="material-symbols-outlined text-[16px]">history</span>
                            Activity
                        </button>
                    </div>

                    {activePanel === 'overview' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Liquidation Action Card */}
                                                {investment.is_liquidating && (
                                                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 border border-orange-200 dark:border-orange-500/30 shadow-sm relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                            
                                                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-orange-100 dark:border-orange-900/20 relative z-10">
                                                            <div className="flex items-center justify-center size-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 animate-pulse">
                                                                <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                                                            </div>
                                                            <div>
                                                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Liquidation</h3>
                                                                <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                                                                    Stage: {investment.liquidation_stage?.replace(/_/g, ' ') || 'Unknown'}
                                                                </p>
                                                            </div>
                                                        </div>
                            
                                                        <div className="space-y-1 mb-6 bg-orange-50/50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-500/20 relative z-10">
                                                            <div className="flex justify-between items-center py-1.5">
                                                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Requested</span>
                                                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                                                    ₦{Number(investment.liquidation_requested_amount || 0).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-1.5">
                                                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Penalty Fee</span>
                                                                <span className="text-sm font-semibold text-red-500">
                                                                    ₦{Number(investment.liquidation_penalty_amount || 0).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-2 mt-2 border-t border-orange-100 dark:border-orange-500/20">
                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Net Payout</span>
                                                                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
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
                                                                            className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-red-600 bg-white dark:bg-[#1e293b] border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                                                        >
                                                                            Reject
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleLiquidationAction('APPROVE')}
                                                                            disabled={isActioning}
                                                                            className="flex-[2] py-2.5 text-sm font-semibold rounded-xl text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50"
                                                                        >
                                                                            {isActioning ? 'Processing...' : 'Approve & Pass'}
                                                                        </button>
                                                                    </div>
                                                                );
                                                            }
                                                            return (
                                                                <div className="relative z-10 text-center bg-slate-50 dark:bg-slate-800/50 py-2 px-3 rounded-lg">
                                                                    <p className="text-xs text-slate-500">
                                                                        Waiting for {stage?.replace(/_/g, ' ')} department validation.
                                                                    </p>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                )}

                            <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                                                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                                                        <div className="flex items-center justify-center size-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                                            <span className="material-symbols-outlined text-[20px]">info</span>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Status Tracking</h3>
                                                            <p className="text-xs font-medium text-slate-500">Application Info</p>
                                                        </div>
                                                    </div>
                            
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between items-center py-2">
                                                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Submission Date</span>
                                                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatDate(investment.created_at)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-2">
                                                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Current Stage</span>
                                                            <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{investment.stage?.replace(/_/g, ' ') || 'Submitted'}</span>
                                                        </div>
                            
                                                        {investment.referral_code && (
                                                            <div className="flex justify-between items-center py-2">
                                                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Referral Code</span>
                                                                <span className="px-2 py-1 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-md text-[11px] font-bold uppercase tracking-wider border border-purple-100 dark:border-purple-500/20">{investment.referral_code}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between items-center py-2">
                                                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Start Date</span>
                                                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{investment.start_date ? formatDate(investment.start_date) : '-'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-2">
                                                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Maturity Date</span>
                                                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{investment.maturity_date ? formatDate(investment.maturity_date) : '-'}</span>
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
                                                            if (investment.is_pending_partner) {
                                                                return (
                                                                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/60 text-center">
                                                                        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-xl flex flex-col items-center">
                                                                            <span className="material-symbols-outlined text-2xl mb-2">hourglass_empty</span>
                                                                            <p className="text-sm font-bold">Waiting for Joint Partner Validation</p>
                                                                            <p className="text-xs mt-1 opacity-80">This application cannot be processed until the co-investor completes their KYC and accepts the invitation.</p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                            return (
                                                                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/60">
                                                                    <p className="text-xs text-slate-500 mb-4 text-center">You have the necessary permissions to review this stage.</p>
                                                                    <div className="flex flex-col gap-3">
                                                                        <button
                                                                            onClick={() => handleAction('approve')}
                                                                            disabled={isActioning}
                                                                            className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
                                                                        >
                                                                            {isActioning ? <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span> : null}
                                                                            Approve & Proceed
                                                                        </button>
                                                                        
                                                                        <div className="flex gap-3">
                                                                            <button
                                                                                onClick={() => handleAction('reject')}
                                                                                disabled={isActioning}
                                                                                className="flex-1 py-2.5 bg-white dark:bg-[#1e293b] border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                                                            >
                                                                                Reject
                                                                            </button>
                                                                            {stage !== 'submitted' && (
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setReason('');
                                                                                        setReturnTargetStage('');
                                                                                        setShowReturnModal(true);
                                                                                    }}
                                                                                    disabled={isActioning}
                                                                                    className="flex-1 py-2.5 bg-white dark:bg-[#1e293b] border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 text-sm font-semibold rounded-xl hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                                                                                >
                                                                                    Return
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/60 text-center">
                                                                <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 py-2 px-3 rounded-lg inline-block">Waiting for appropriate department review</p>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                        </div>
                    )}

                    {activePanel === 'manage' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Assignment Control Card */}
                                                {['sales_manager', 'admin', 'super_admin', 'superadmin', 'customer_experience'].includes(user.role?.toLowerCase() || '') && (
                                                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                                                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                                                            <div className="flex items-center justify-center size-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                                <span className="material-symbols-outlined text-[20px]">person_add</span>
                                                            </div>
                                                            <div>
                                                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Account Assignment</h3>
                                                                <p className="text-xs font-medium text-slate-500">Manage sales officer</p>
                                                            </div>
                                                        </div>
                            
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                                                <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm tracking-tighter shrink-0">
                                                                    {investment.officer_name ? investment.officer_name[0] : 'U'}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                                        {investment.officer_name || 'Unassigned'}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500 truncate mt-0.5">
                                                                        {investment.officer_email || 'General Marketing'}
                                                                    </p>
                                                                </div>
                                                            </div>
                            
                                                            <div className="relative">
                                                                <select
                                                                    value={investment.sales_officer_id || ''}
                                                                    onChange={(e) => handleAssignOfficer(e.target.value)}
                                                                    className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-white"
                                                                >
                                                                    <option value="">Select Officer to Reassign</option>
                                                                    {officers.map(off => (
                                                                        <option key={off.id} value={off.id}>{off.full_name}</option>
                                                                    ))}
                                                                </select>
                                                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                                                    <span className="material-symbols-outlined text-[18px]">expand_more</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                            {/* Finance Overrides Card */}
                                                {(user?.role?.toLowerCase() === 'finance' || user?.role?.toLowerCase() === 'super_admin' || user?.role?.toLowerCase() === 'superadmin') && (
                                                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                                                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                                                            <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                                <span className="material-symbols-outlined text-[20px]">payments</span>
                                                            </div>
                                                            <div>
                                                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Finance Overrides</h3>
                                                                <p className="text-xs font-medium text-slate-500">Finance Control</p>
                                                            </div>
                                                        </div>
                            
                                                        <div className="space-y-5">
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
                                                                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Interest Amount (₦)</label>
                                                                            <div className="flex flex-col 2xl:flex-row gap-3">
                                                                                <input
                                                                                    type="number"
                                                                                    value={customInterest === '' && !hasValidStoredInterest ? projected : customInterest}
                                                                                    onChange={(e) => setCustomInterest(e.target.value)}
                                                                                    className="flex-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                                                                                />
                                                                                <button
                                                                                    onClick={() => handleFinanceUpdate(customInterest || String(projected))}
                                                                                    disabled={isActioning}
                                                                                    className="px-5 py-2.5 w-full 2xl:w-auto shrink-0 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50 shadow-sm"
                                                                                >
                                                                                    Update
                                                                                </button>
                                                                            </div>
                                                                            {customInterest === '' && !hasValidStoredInterest && (
                                                                                <p className="text-[11px] text-slate-500">Value is implicitly calculated. Type to override.</p>
                                                                            )}
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                                                                            <div>
                                                                                <p className="text-xs font-medium text-slate-500 mb-1">Derived WHT (10%)</p>
                                                                                <p className="text-base font-bold text-red-500">₦{activeWht.toLocaleString()}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-xs font-medium text-slate-500 mb-1">Net Maturity Value</p>
                                                                                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">₦{netMaturity.toLocaleString()}</p>
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}

                            {/* CASA Account Input Card */}
                                                <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                                                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                                                        <div className="flex items-center justify-center size-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                                            <span className="material-symbols-outlined text-[20px]">account_balance</span>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-base font-bold text-slate-900 dark:text-white">CASA Setting</h3>
                                                            <p className="text-xs font-medium text-slate-500">Account Management</p>
                                                        </div>
                                                    </div>
                            
                                                    <div className="space-y-4">
                                                        {['sales_manager', 'admin', 'super_admin', 'superadmin', 'finance'].includes(user?.role?.toLowerCase() || '') ? (
                                                            <>
                                                                {!investment.casa_account_number && investment.status === 'active' && (
                                                                    <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-start gap-2 mb-2">
                                                                        <span className="material-symbols-outlined text-amber-500 text-[18px] mt-0.5">warning</span>
                                                                        <p className="text-xs font-medium text-amber-800 dark:text-amber-400 leading-relaxed">
                                                                            This investment is ACTIVE but missing a CASA number. Certificate cannot be dispatched until provided.
                                                                        </p>
                                                                    </div>
                                                                )}
                            
                                                                <div className="space-y-3">
                                                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">CASA Account Number</label>
                            
                                                                    {!investment.casa_account_number && investment.suggested_casa_number && (
                                                                        <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-center justify-between">
                                                                            <div>
                                                                                <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 mb-0.5">Previous Account Found</p>
                                                                                <p className="text-sm font-bold text-blue-900 dark:text-blue-300 font-mono">{investment.suggested_casa_number}</p>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => {
                                                                                    const el = document.getElementById('casa_number_input') as HTMLInputElement;
                                                                                    if (el) el.value = investment.suggested_casa_number;
                                                                                }}
                                                                                className="px-3 py-1.5 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-lg text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shadow-sm"
                                                                            >
                                                                                Use This
                                                                            </button>
                                                                        </div>
                                                                    )}
                            
                                                                    <div className="flex flex-col 2xl:flex-row gap-3 mt-2">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Enter CASA Number..."
                                                                            defaultValue={investment.casa_account_number || ''}
                                                                            id="casa_number_input"
                                                                            className="flex-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                                                        />
                                                                        <button
                                                                            onClick={() => {
                                                                                const val = (document.getElementById('casa_number_input') as HTMLInputElement).value;
                                                                                handleCASAUpdate(val);
                                                                            }}
                                                                            disabled={isActioning}
                                                                            className="px-5 py-2.5 w-full 2xl:w-auto shrink-0 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50 shadow-sm"
                                                                        >
                                                                            Save Settings
                                                                        </button>
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-500 mt-1">Clicking "Save Settings" will automatically email the client their certificate if active.</p>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                                                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Assigned Number</span>
                                                                <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono">{investment.casa_account_number || 'Pending'}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                        </div>
                    )}

                    {activePanel === 'activity' && (
                        <div className="bg-white dark:bg-[#1e293b] rounded-[24px] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm max-h-[75vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <ActivityTimeline investmentId={id} />
                        </div>
                    )}
                    
{/* Return Application Modal */}
                    {showReturnModal && createPortal(
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
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
                        </div>,
                    document.body)}

                    {showBioEditModal && createPortal(
                        <div className="fixed  inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-[#0f172a] rounded-[24px] w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-8 border border-slate-200 dark:border-slate-800">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Edit Bio Data</h2>
                                    <button onClick={() => setShowBioEditModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                        <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">close</span>
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {investment.entity_type === 'CORPORATE' ? (
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Company Name</label>
                                            <input type="text" value={bioEditData.company_name} onChange={(e) => setBioEditData({...bioEditData, company_name: e.target.value})} className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
                                        </div>
                                    ) : null}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Title</label>
                                        <input type="text" value={bioEditData.title} onChange={(e) => setBioEditData({...bioEditData, title: e.target.value})} className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                                        <input type="text" value={bioEditData.rep_full_name} onChange={(e) => setBioEditData({...bioEditData, rep_full_name: e.target.value})} className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Gender</label>
                                        <select value={bioEditData.gender} onChange={(e) => setBioEditData({...bioEditData, gender: e.target.value})} className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white">
                                            <option value="">Select</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Date of Birth</label>
                                        <input type="date" value={bioEditData.dob} onChange={(e) => setBioEditData({...bioEditData, dob: e.target.value})} className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                                        <input type="text" value={bioEditData.rep_phone_number} onChange={(e) => setBioEditData({...bioEditData, rep_phone_number: e.target.value})} className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Mother's Maiden Name</label>
                                        <input type="text" value={bioEditData.mother_maiden_name} onChange={(e) => setBioEditData({...bioEditData, mother_maiden_name: e.target.value})} className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Marital Status</label>
                                        <select value={bioEditData.marital_status} onChange={(e) => setBioEditData({...bioEditData, marital_status: e.target.value})} className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white">
                                            <option value="">Select</option>
                                            <option value="Single">Single</option>
                                            <option value="Married">Married</option>
                                            <option value="Divorced">Divorced</option>
                                            <option value="Widowed">Widowed</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">State of Origin</label>
                                        <input type="text" value={bioEditData.rep_state_of_origin} onChange={(e) => setBioEditData({...bioEditData, rep_state_of_origin: e.target.value})} className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">State of Residence</label>
                                        <input type="text" value={bioEditData.rep_state_of_residence} onChange={(e) => setBioEditData({...bioEditData, rep_state_of_residence: e.target.value})} className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">House Number</label>
                                        <input type="text" value={bioEditData.rep_house_number} onChange={(e) => setBioEditData({...bioEditData, rep_house_number: e.target.value})} className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Street Address</label>
                                        <input type="text" value={bioEditData.rep_street_address} onChange={(e) => setBioEditData({...bioEditData, rep_street_address: e.target.value})} className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">BVN</label>
                                        <input type="text" value={bioEditData.rep_bvn} onChange={(e) => setBioEditData({...bioEditData, rep_bvn: e.target.value})} className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">NIN</label>
                                        <input type="text" value={bioEditData.rep_nin} onChange={(e) => setBioEditData({...bioEditData, rep_nin: e.target.value})} className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
                                    </div>

                                    {/* Next of Kin Section */}
                                    <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                                        <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Next of Kin Details</h3>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">NOK Name</label>
                                        <input type="text" value={bioEditData.nok_name} onChange={(e) => setBioEditData({...bioEditData, nok_name: e.target.value})} className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">NOK Relationship</label>
                                        <input type="text" value={bioEditData.nok_relationship} onChange={(e) => setBioEditData({...bioEditData, nok_relationship: e.target.value})} className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">NOK Address</label>
                                        <textarea value={bioEditData.nok_address} onChange={(e) => setBioEditData({...bioEditData, nok_address: e.target.value})} rows={2} className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end gap-4">
                                    <button onClick={() => setShowBioEditModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                                    <button onClick={handleSaveBioData} disabled={isSavingBio} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                                        {isSavingBio ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </div>,
                    document.body)}
                </div>
            </div>
        </StaffLayout>
    );
};

export default StaffInvestmentDetailsPage;
