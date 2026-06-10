import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import NewCustomerModal from './modals/NewCustomerModal';

interface NewInvestmentLookupFlowProps {
    isOpen: boolean;
    onClose: () => void;
    onCustomerConfirmed: (customer: any) => void;
    user?: any;
}

type FlowState = 'LOOKUP' | 'NOT_FOUND' | 'NEW_CUSTOMER' | 'CUSTOMER_CARD';

const NewInvestmentLookupFlow: React.FC<NewInvestmentLookupFlowProps> = ({
    isOpen,
    onClose,
    onCustomerConfirmed,
    user,
}) => {
    const [currentState, setCurrentState] = useState<FlowState>('LOOKUP');
    const [lookupType, setLookupType] = useState<'bvn' | 'casa'>('bvn');
    const [searchValue, setSearchValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [cbaLoading, setCbaLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [customerData, setCustomerData] = useState<any>(null);
    const [cbaInvestments, setCbaInvestments] = useState<any[]>([]);

    if (!isOpen) return null;

    const handleSearch = async (valueToSearch?: string) => {
        const val = valueToSearch || searchValue;
        if (!val) return;

        if (lookupType === 'bvn' && val.length !== 11) {
            setError('BVN must be 11 digits');
            return;
        }
        if (lookupType === 'casa' && val.length !== 10) {
            setError('CASA must be 10 digits');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const param = lookupType === 'bvn' ? `bvn=${val}` : `casa=${val}`;
            const response = await axios.get(`/api/staff/customers/lookup?${param}`);

            if (response.data.success) {
                const customer = response.data.customer;
                setCustomerData(customer);
                setCurrentState('CUSTOMER_CARD');

                // Fetch CBA fixed deposits in background
                if (customer.cba_customer_id) {
                    setCbaLoading(true);
                    try {
                        const invRes = await axios.get(
                            `/api/staff/investments/cba-fixed-deposits?customerId=${customer.cba_customer_id}`,
                            { withCredentials: true }
                        );
                        setCbaInvestments(invRes.data?.data || []);
                    } catch {
                        setCbaInvestments([]);
                    } finally {
                        setCbaLoading(false);
                    }
                }
            }
        } catch (err: any) {
            if (err.response?.status === 404) {
                setCurrentState('NOT_FOUND');
            } else {
                setError(err.response?.data?.message || 'Error looking up customer');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCustomerCreated = (bvn?: string) => {
        if (bvn) {
            setLookupType('bvn');
            setSearchValue(bvn);
            handleSearch(bvn);
        } else {
            setCurrentState('LOOKUP');
        }
    };

    const resetFlow = () => {
        setCurrentState('LOOKUP');
        setSearchValue('');
        setCustomerData(null);
        setCbaInvestments([]);
        setError(null);
        onClose();
    };

    // NEW_CUSTOMER: render full-screen customer creation modal
    if (currentState === 'NEW_CUSTOMER') {
        return (
            <NewCustomerModal
                isOpen={true}
                onClose={resetFlow}
                onSuccess={handleCustomerCreated}
                initialBvn={lookupType === 'bvn' ? searchValue : ''}
            />
        );
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden relative my-auto min-h-[400px] flex flex-col"
                    >
                        {/* ── LOOKUP ── */}
                        {currentState === 'LOOKUP' && (
                            <div className="p-8 flex-1 flex flex-col items-center justify-center">
                                <div className="absolute top-6 right-6">
                                    <button
                                        onClick={resetFlow}
                                        className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                                    >
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>

                                <div className="w-full max-w-sm space-y-8">
                                    <div className="text-center space-y-2">
                                        <div className="size-14 rounded-2xl bg-purple-600/10 text-purple-600 flex items-center justify-center mx-auto mb-4">
                                            <span className="material-symbols-outlined text-2xl filled">savings</span>
                                        </div>
                                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase">
                                            New Investment Application
                                        </h4>
                                        <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase">
                                            Enter BVN or existing CASA account to proceed.
                                        </p>
                                    </div>

                                    {/* BVN / CASA toggle */}
                                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                        <button
                                            onClick={() => { setLookupType('bvn'); setSearchValue(''); setError(null); }}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${lookupType === 'bvn' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-slate-400'}`}
                                        >
                                            BVN Lookup
                                        </button>
                                        <button
                                            onClick={() => { setLookupType('casa'); setSearchValue(''); setError(null); }}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${lookupType === 'casa' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-slate-400'}`}
                                        >
                                            CASA Search
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <input
                                            type="text"
                                            maxLength={lookupType === 'bvn' ? 11 : 10}
                                            value={searchValue}
                                            onChange={(e) => setSearchValue(e.target.value.replace(/\D/g, ''))}
                                            disabled={loading}
                                            placeholder={`ENTER ${lookupType === 'bvn' ? '11-DIGIT BVN' : '10-DIGIT CASA'}`}
                                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-center text-xl font-black tracking-[0.2em] focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50 placeholder:text-slate-300 dark:placeholder:text-slate-600 placeholder:text-sm placeholder:tracking-normal dark:text-white"
                                        />
                                        {error && <p className="text-red-500 text-xs text-center font-bold">{error}</p>}
                                        <button
                                            onClick={() => handleSearch()}
                                            disabled={loading || searchValue.length < 10}
                                            className="w-full py-4 bg-purple-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden"
                                        >
                                            {loading && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-purple-700">
                                                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                                </div>
                                            )}
                                            <span className={loading ? 'opacity-0' : 'opacity-100'}>
                                                Search Customer Reference
                                            </span>
                                        </button>
                                        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            {lookupType === 'bvn' ? 'BVN verification via CBS account details view via BVN' : 'CASA search via core banking system'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── NOT FOUND ── */}
                        {currentState === 'NOT_FOUND' && (
                            <div className="p-8 flex-1 flex flex-col items-center justify-center text-center space-y-6">
                                <div className="absolute top-6 right-6">
                                    <button onClick={resetFlow} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                                <div className="size-20 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-4xl text-slate-400">person_off</span>
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2 tracking-tight">Customer Not Found</h4>
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                        No customer found with {lookupType.toUpperCase()} {searchValue}.<br />
                                        Would you like to onboard them?
                                    </p>
                                </div>
                                <div className="flex gap-4 w-full max-w-sm mt-4">
                                    <button
                                        onClick={() => setCurrentState('LOOKUP')}
                                        className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Try Again
                                    </button>
                                    <button
                                        onClick={() => setCurrentState('NEW_CUSTOMER')}
                                        className="flex-1 py-4 bg-purple-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20"
                                    >
                                        Create Customer
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── CUSTOMER CARD ── */}
                        {currentState === 'CUSTOMER_CARD' && customerData && (
                            <div className="p-8 pb-6 flex flex-col h-full max-h-[85vh] overflow-y-auto">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-purple-800 text-white flex items-center justify-center text-xl font-black">
                                            {customerData.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'CU'}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight leading-none">
                                                {customerData.full_name}
                                            </h3>
                                            <p className="text-sm font-bold text-slate-500 mt-1 tracking-widest">
                                                {customerData.casa || customerData.bvn}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800/50">
                                        Existing Customer
                                    </div>
                                </div>

                                {/* Demographics */}
                                <div className="grid grid-cols-3 gap-y-8 gap-x-4 mb-10 pb-8 border-b border-slate-100 dark:border-slate-800">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Date of Birth</p>
                                        <p className="font-black text-slate-900 dark:text-white italic tracking-tight">
                                            {customerData.date_of_birth ? new Date(customerData.date_of_birth).toLocaleDateString('en-GB') : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Gender</p>
                                        <p className="font-black text-slate-900 dark:text-white italic tracking-tight uppercase">{customerData.gender || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">BVN</p>
                                        <p className="font-black text-slate-900 dark:text-white italic tracking-widest">
                                            {customerData.bvn ? `••••••••${customerData.bvn.slice(-3)}` : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">CASA Account</p>
                                        <p className="font-black text-purple-600 italic tracking-tight font-mono">
                                            {customerData.casa || '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Account Tier</p>
                                        <p className="font-black text-slate-900 dark:text-white italic tracking-tight uppercase">
                                            Tier {customerData.kyc_tier || 0}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">CBA Customer ID</p>
                                        <p className="font-black text-slate-500 italic tracking-tight font-mono text-sm">
                                            {customerData.cba_customer_id || '—'}
                                        </p>
                                    </div>
                                </div>

                                {/* CBA Fixed Deposits */}
                                <div className="mb-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-1 h-4 bg-purple-600 rounded-full"></div>
                                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                                            Existing Fixed Deposits on CBS
                                        </h4>
                                        {cbaLoading && (
                                            <span className="material-symbols-outlined animate-spin text-sm text-slate-400">progress_activity</span>
                                        )}
                                    </div>

                                    {cbaLoading ? (
                                        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 text-center">
                                            <p className="text-xs font-bold text-slate-400 italic">Fetching investments from core banking...</p>
                                        </div>
                                    ) : cbaInvestments.length > 0 ? (
                                        <div className="space-y-4">
                                            {cbaInvestments.map((inv: any, idx: number) => (
                                                <div key={idx} className="flex flex-col p-5 bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-transform group-hover:scale-150"></div>
                                                    
                                                    {/* Header */}
                                                    <div className="flex items-start justify-between mb-4 relative z-10">
                                                        <div className="flex gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
                                                                <span className="material-symbols-outlined text-2xl">account_balance</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-0.5">
                                                                    {inv.product || 'Fixed Term Investment'}
                                                                </p>
                                                                <p className="font-black text-lg text-slate-900 dark:text-white tracking-tight leading-none font-mono">
                                                                    {inv.tdAccountNo || inv.accountNumber || inv.fdAccountNo || 'FD Account'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                                            (inv.status || '').toLowerCase() === 'active' || !inv.status
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                                : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                                        }`}>
                                                            {inv.status || 'Active'}
                                                        </div>
                                                    </div>

                                                    {/* Grid Stats */}
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 relative z-10">
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Principal</p>
                                                            <p className="font-black text-slate-900 dark:text-white text-sm">
                                                                ₦{Number((inv.tdAmount || inv.principalAmount || inv.amount || '0').toString().replace(/,/g, '')).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration & Rate</p>
                                                            <p className="font-black text-slate-900 dark:text-white text-sm">
                                                                {inv.tdDuration || 'N/A'} <span className="text-purple-600">@{inv.interestrate || 0}%</span>
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Return</p>
                                                            <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                                                ₦{Number((inv.matureAmount || '0').toString().replace(/,/g, '')).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Maturity Date</p>
                                                            <p className="font-black text-slate-900 dark:text-white text-sm">
                                                                {inv.maturityDate ? new Date(inv.maturityDate).toLocaleDateString('en-GB') : 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Footer info */}
                                                    <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest relative z-10">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                                                            Settlement: <span className="text-slate-600 dark:text-slate-300 font-mono">{inv.settlementAcctNo || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                            Started: <span className="text-slate-600 dark:text-slate-300">{inv.startDate ? new Date(inv.startDate).toLocaleDateString('en-GB') : 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 text-center">
                                            <p className="text-xs font-bold text-slate-500 italic">No existing fixed deposits found on core banking.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer Actions */}
                                <div className="mt-auto pt-6 flex items-center justify-between gap-4">
                                    <button
                                        onClick={() => setCurrentState('LOOKUP')}
                                        className="px-6 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-lg">search</span>
                                        Wrong Customer? Search Again
                                    </button>
                                    <button
                                        onClick={() => onCustomerConfirmed(customerData)}
                                        disabled={!customerData.is_active}
                                        className="flex-1 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                                    >
                                        Confirm & Continue to Investment
                                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default NewInvestmentLookupFlow;
