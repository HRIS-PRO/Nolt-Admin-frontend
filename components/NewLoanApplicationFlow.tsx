import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import NewCustomerModal from './modals/NewCustomerModal';
import StaffLoanForm from './StaffLoanForm';

interface NewLoanApplicationFlowProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user?: any;
}

type FlowState = 'LOOKUP' | 'NEW_CUSTOMER' | 'CUSTOMER_CARD' | 'LOAN_FORM' | 'NOT_FOUND';

const NewLoanApplicationFlow: React.FC<NewLoanApplicationFlowProps> = ({ isOpen, onClose, onSuccess, user }) => {
    const [currentState, setCurrentState] = useState<FlowState>('LOOKUP');
    const [lookupType, setLookupType] = useState<'bvn' | 'casa'>('bvn');
    const [searchValue, setSearchValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [customerData, setCustomerData] = useState<any>(null);
    const [loanHistory, setLoanHistory] = useState<any[]>([]);
    const [cbaLoans, setCbaLoans] = useState<any[]>([]);
    const [selectedLoanType, setSelectedLoanType] = useState<string>('new');

    if (!isOpen) return null;

    const handleSearch = async (valueToSearch?: string) => {
        const val = valueToSearch || searchValue;
        if (!val) return;
        
        // Validation length
        if (lookupType === 'bvn' && val.length !== 11) {
            setError("BVN must be 11 digits");
            return;
        }
        if (lookupType === 'casa' && val.length !== 10) {
            setError("CASA must be 10 digits");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const param = lookupType === 'bvn' ? `bvn=${val}` : `casa=${val}`;
            const response = await axios.get(`/api/staff/customers/lookup?${param}`);
            
            if (response.data.success) {
                setCustomerData(response.data.customer);
                setLoanHistory(response.data.loans || []);
                setCbaLoans(response.data.cbaLoans || []);
                setCurrentState('CUSTOMER_CARD');
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
            // Fallback if no BVN returned
            setCurrentState('LOOKUP');
        }
    };

    const resetFlow = () => {
        setCurrentState('LOOKUP');
        setSearchValue('');
        setCustomerData(null);
        setLoanHistory([]);
        setCbaLoans([]);
        setError(null);
        onClose();
    };

    // When showing full modals like NEW_CUSTOMER or LOAN_FORM, we don't render the wrapper styling.
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

    if (currentState === 'LOAN_FORM') {
        const enrichedInitialData = { ...customerData, loan_type: selectedLoanType };
        return (
            <StaffLoanForm 
                onClose={resetFlow} 
                onSuccess={() => { onSuccess(); resetFlow(); }} 
                initialData={enrichedInitialData}
                user={user}
                isCustomerVerified={true}
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
                        {currentState === 'LOOKUP' && (
                            <div className="p-8 flex-1 flex flex-col items-center justify-center">
                                <div className="absolute top-6 right-6">
                                    <button onClick={resetFlow} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                                <div className="w-full max-w-sm space-y-8">
                                    <div className="text-center space-y-2">
                                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase">Customer Lookup</h4>
                                        <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase">
                                            Search by BVN or existing CASA account.
                                        </p>
                                    </div>
                                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                        <button 
                                            onClick={() => { setLookupType('bvn'); setSearchValue(''); setError(null); }}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${lookupType === 'bvn' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}
                                        >
                                            BVN
                                        </button>
                                        <button 
                                            onClick={() => { setLookupType('casa'); setSearchValue(''); setError(null); }}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${lookupType === 'casa' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}
                                        >
                                            CASA
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
                                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-center text-xl font-black tracking-[0.2em] focus:ring-2 focus:ring-primary transition-all disabled:opacity-50 placeholder:text-slate-300 dark:placeholder:text-slate-600 placeholder:text-sm placeholder:tracking-normal dark:text-white"
                                        />
                                        {error && <p className="text-red-500 text-xs text-center font-bold">{error}</p>}
                                        <button 
                                            onClick={() => handleSearch()}
                                            disabled={loading || searchValue.length < 10}
                                            className="w-full py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden group"
                                        >
                                            {loading && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-primary-700">
                                                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                                </div>
                                            )}
                                            <span className={loading ? 'opacity-0' : 'opacity-100'}>Search Customer</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                        No customer found with {lookupType.toUpperCase()} {searchValue}.<br/>Would you like to onboard them?
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
                                        className="flex-1 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all shadow-lg shadow-primary/20"
                                    >
                                        Create Customer
                                    </button>
                                </div>
                            </div>
                        )}

                        {currentState === 'CUSTOMER_CARD' && customerData && (
                            <div className="p-8 pb-6 flex flex-col h-full max-h-[85vh] overflow-y-auto">
                                {/* Header Info */}
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xl font-black">
                                            {customerData.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'CU'}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight leading-none">
                                                {customerData.full_name}
                                            </h3>
                                            <p className="text-sm font-bold text-slate-500 mt-1 tracking-widest">{customerData.casa || customerData.bvn}</p>
                                        </div>
                                    </div>
                                    <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800/50">
                                        Existing Customer
                                    </div>
                                </div>

                                {/* Demographics Grid */}
                                <div className="grid grid-cols-3 gap-y-8 gap-x-4 mb-10 pb-8 border-b border-slate-100 dark:border-slate-800">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Date of Birth</p>
                                        <p className="font-black text-slate-900 dark:text-white italic tracking-tight">
                                            {customerData.date_of_birth ? new Date(customerData.date_of_birth).toLocaleDateString('en-GB') : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Gender</p>
                                        <p className="font-black text-slate-900 dark:text-white italic tracking-tight uppercase">
                                            {customerData.gender || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">BVN</p>
                                        <p className="font-black text-slate-900 dark:text-white italic tracking-widest">
                                            {customerData.bvn ? `••••••••${customerData.bvn.slice(-3)}` : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Account Balance</p>
                                        <p className="font-black text-emerald-600 italic tracking-tight">
                                            ₦0.00
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Account Tier</p>
                                        <p className="font-black text-slate-900 dark:text-white italic tracking-tight uppercase">
                                            Tier {customerData.kyc_tier || 0}
                                        </p>
                                    </div>
                                </div>

                                {/* Loan History (CBA Live) */}
                                <div className="mb-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-1 h-4 bg-primary rounded-full"></div>
                                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Existing Loans on CBS</h4>
                                    </div>
                                    
                                    {cbaLoans.length > 0 ? (
                                        <div className="space-y-4">
                                            {cbaLoans.map((loan, idx) => {
                                                const isActive = loan.currentBalance < 0 && loan.nextTotalPayment !== 0;
                                                return (
                                                    <div key={idx} className="flex items-center justify-between p-5 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-400'}`}>
                                                                <span className="material-symbols-outlined text-xl">{isActive ? 'payments' : 'check_circle'}</span>
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-sm text-slate-900 dark:text-white tracking-tight">
                                                                    {loan.loanAccountNo} • {(loan.product || '').toUpperCase()}
                                                                </p>
                                                                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mt-1">
                                                                    Outstanding: <span className="text-rose-500">{isActive ? `₦${Math.abs(loan.currentBalance).toLocaleString()}` : 'NO'}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                                                            {isActive ? 'Active' : 'Closed'}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 text-center">
                                            <p className="text-xs font-bold text-slate-500 italic">No existing loans found on core banking.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Internal Nolt Loan History — only topup, re-app, add_on */}
                                {loanHistory.filter((l: any) => ['topup', 're-app', 'add_on'].includes(l.loan_type)).length > 0 && (
                                    <div className="mb-8">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-1 h-4 bg-violet-500 rounded-full"></div>
                                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Previous Applications (Nolt)</h4>
                                        </div>
                                        <div className="space-y-3">
                                            {loanHistory.filter((l: any) => ['topup', 're-app', 'add_on'].includes(l.loan_type)).map((loan: any, idx: number) => {
                                                const typeLabel: Record<string, string> = {
                                                    'new': 'New Loan',
                                                    'buy_over': 'Buy Over',
                                                    'topup': 'Top-Up',
                                                    're-app': 'Re-App',
                                                    'add_on': 'Add-On',
                                                };
                                                const typeColor: Record<string, string> = {
                                                    'topup': 'bg-blue-50 text-blue-600 border-blue-100',
                                                    're-app': 'bg-violet-50 text-violet-600 border-violet-100',
                                                    'add_on': 'bg-amber-50 text-amber-600 border-amber-100',
                                                    'buy_over': 'bg-orange-50 text-orange-600 border-orange-100',
                                                    'new': 'bg-emerald-50 text-emerald-600 border-emerald-100',
                                                };
                                                const statusColor: Record<string, string> = {
                                                    'disbursed': 'bg-emerald-50 text-emerald-600',
                                                    'pending': 'bg-amber-50 text-amber-600',
                                                    'rejected': 'bg-rose-50 text-rose-600',
                                                    'approved': 'bg-blue-50 text-blue-600',
                                                };
                                                const amount = loan.disbursement_amount || loan.topup_amount || loan.buy_over_amount || loan.requested_loan_amount || 0;
                                                const label = typeLabel[loan.loan_type] || loan.loan_type?.toUpperCase() || 'LOAN';
                                                const color = typeColor[loan.loan_type] || 'bg-slate-50 text-slate-600 border-slate-100';
                                                const sColor = statusColor[loan.status] || 'bg-slate-50 text-slate-500';

                                                return (
                                                    <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${color}`}>
                                                                {label}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-sm text-slate-900 dark:text-white">
                                                                    ₦{Number(amount).toLocaleString()}
                                                                </p>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                                                    {new Date(loan.created_at).toLocaleDateString('en-GB')} • Stage: {(loan.stage || '').replace(/_/g, ' ').toUpperCase()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${sColor}`}>
                                                            {loan.status}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}


                                {/* Active Loan Options Block */}
                                {(() => {
                                    const activeLoans = cbaLoans.filter(loan => loan.currentBalance < 0 && loan.nextTotalPayment !== 0);
                                    const hasActiveLoan = activeLoans.length > 0;
                                    const hasActiveIppisLoan = activeLoans.some(loan => loan.product === 'NOLT IPPIS');

                                    if (hasActiveLoan && hasActiveIppisLoan) {
                                        return (
                                            <div className="p-6 bg-purple-50/50 dark:bg-purple-900/10 rounded-3xl border border-purple-200 dark:border-purple-800 border-dashed mb-8">
                                                <h4 className="text-sm font-black text-purple-700 dark:text-purple-400 uppercase italic tracking-tight mb-1">Active IPPIS Loan Detected</h4>
                                                <p className="text-[10px] font-black text-purple-500/70 dark:text-purple-400/70 uppercase tracking-widest mb-6">This customer has an active IPPIS loan. Please select an action to proceed.</p>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <button 
                                                        onClick={() => setSelectedLoanType('topup')}
                                                        className={`p-4 rounded-lg border transition-all text-left ${selectedLoanType === 'topup' ? 'bg-white border-purple-400 shadow-md ring-2 ring-purple-100' : 'bg-white/60 border-purple-100 hover:bg-white'}`}
                                                    >
                                                        <p className="font-black text-slate-900 text-sm mb-1">TOP-UP</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">Add funds to the existing loan</p>
                                                    </button>
                                                    <button 
                                                        onClick={() => setSelectedLoanType('re-app')}
                                                        className={`p-4 rounded-lg border transition-all text-left ${selectedLoanType === 're-app' ? 'bg-white border-purple-400 shadow-md ring-2 ring-purple-100' : 'bg-white/60 border-purple-100 hover:bg-white'}`}
                                                    >
                                                        <p className="font-black text-slate-900 text-sm mb-1">RE-APP</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">Re-apply for a new loan term</p>
                                                    </button>
                                                    <button 
                                                        onClick={() => setSelectedLoanType('add_on')}
                                                        className={`p-4 rounded-lg border transition-all text-left ${selectedLoanType === 'add_on' ? 'bg-white border-purple-400 shadow-md ring-2 ring-purple-100' : 'bg-white/60 border-purple-100 hover:bg-white'}`}
                                                    >
                                                        <p className="font-black text-slate-900 text-sm mb-1">ADD-ON</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">Add additional product/funds</p>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    } else if (hasActiveLoan && !hasActiveIppisLoan) {
                                        return (
                                            <div className="p-6 bg-rose-50/50 dark:bg-rose-900/10 rounded-3xl border border-rose-200 dark:border-rose-800 border-dashed mb-8">
                                                <h4 className="text-sm font-black text-rose-700 dark:text-rose-400 uppercase italic tracking-tight mb-1">Active Loan Restriction</h4>
                                                <p className="text-[10px] font-black text-rose-500/70 dark:text-rose-400/70 uppercase tracking-widest mb-2">This customer currently has an active non-IPPIS loan. A new loan cannot be created until the existing loan is fully settled.</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

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
                                        onClick={() => setCurrentState('LOAN_FORM')}
                                        disabled={(() => {
                                            if (!customerData.is_active) return true;
                                            const activeLoans = cbaLoans.filter(loan => loan.currentBalance < 0 && loan.nextTotalPayment !== 0);
                                            const hasActiveLoan = activeLoans.length > 0;
                                            const hasActiveIppisLoan = activeLoans.some(loan => loan.product === 'NOLT IPPIS');
                                            
                                            if (hasActiveLoan) {
                                                if (!hasActiveIppisLoan) return true; // Disabled if active but not IPPIS
                                                if (!['topup', 're-app', 'add_on'].includes(selectedLoanType)) return true; // Disabled until they select an IPPIS option
                                            }
                                            return false;
                                        })()}
                                        className="flex-1 py-4 bg-[#0084FF] hover:bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                                    >
                                        Confirm & Continue
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

export default NewLoanApplicationFlow;
