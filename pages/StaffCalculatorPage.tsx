
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import axios from 'axios';

interface StaffCalculatorPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
    formatMoney: (amount: number, currency?: string) => string;
}

type PayoutFrequency = 'monthly' | 'quarterly' | 'maturity';

const TENURE_VALUES = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 365];

const LOAN_PRODUCTS = [
    { id: 'ippis', name: 'IPPIS Loan', rate: 24 },
];

const INVESTMENT_PRODUCTS = [
    { id: 'rise', name: 'NOLT Rise' },
    { id: 'surge', name: 'NOLT Surge' },
    { id: 'vault', name: 'NOLT Vault' },
];

const PAYOUT_FREQUENCIES: { value: PayoutFrequency; label: string }[] = [
    { value: 'maturity', label: 'At Maturity' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
];

const StaffCalculatorPage: React.FC<StaffCalculatorPageProps> = ({ user, onLogout, toggleTheme, theme, formatMoney }) => {
    const [calcType, setCalcType] = useState<'LOAN' | 'INVESTMENT'>('LOAN');
    const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
    const [selectedProductId, setSelectedProductId] = useState<string>('ippis');
    const [payoutFrequency, setPayoutFrequency] = useState<PayoutFrequency>('maturity');

    const [principal, setPrincipal] = useState<number>(500000);
    const [rate, setRate] = useState<number>(24);
    const [term, setTerm] = useState<number>(12);
    const [fetchingRate, setFetchingRate] = useState(false);
    const [rateError, setRateError] = useState<string | null>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const isVault = calcType === 'INVESTMENT' && selectedProductId === 'vault';

    const minAmount = useMemo(() => {
        if (calcType === 'LOAN') return 100000;
        const plan = selectedProductId.toUpperCase();
        if (plan === 'VAULT') return currency === 'NGN' ? 100000 : 10000;
        return 10000;
    }, [calcType, selectedProductId, currency]);

    const minTerm = useMemo(() => {
        if (calcType === 'LOAN') return 3;
        const plan = selectedProductId.toUpperCase();
        if (plan === 'SURGE') return 30;
        if (plan === 'VAULT' && currency === 'NGN') return 30;
        return 90;
    }, [calcType, selectedProductId, currency]);

    const maxTerm = useMemo(() => calcType === 'LOAN' ? 24 : 365, [calcType]);

    // Fetch real rate from backend
    const fetchRate = useCallback(async (plan: string, cur: string, amount: number, tenure: number, payout?: PayoutFrequency) => {
        if (calcType !== 'INVESTMENT') return;
        if (amount < 1000 || tenure < 1) return;

        setFetchingRate(true);
        setRateError(null);
        try {
            const planName = plan === 'rise' ? 'NOLT_RISE' : plan === 'surge' ? 'NOLT_SURGE' : 'NOLT_VAULT';
            const params: Record<string, string> = {
                plan: planName, currency: cur, amount: amount.toString(), tenure: tenure.toString(),
            };
            if (plan === 'vault' && payout) params.payout_frequency = payout;
            const { data } = await axios.get('/api/yield-rates/calculate', { params, withCredentials: true });
            if (data?.interest_rate !== undefined) {
                setRate(Number(data.interest_rate));
            } else {
                setRateError('No rate found');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Could not fetch rate';
            setRateError(msg);
        } finally {
            setFetchingRate(false);
        }
    }, [calcType]);

    useEffect(() => {
        if (calcType !== 'INVESTMENT') return;
        let effectivePrincipal = principal < minAmount ? minAmount : principal;
        let effectiveTerm = term < minTerm ? minTerm : term;

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchRate(selectedProductId, currency, effectivePrincipal, effectiveTerm, isVault ? payoutFrequency : undefined);
        }, 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [calcType, selectedProductId, currency, principal, term, payoutFrequency, minAmount, minTerm, fetchRate, isVault]);

    const handleCalcTypeChange = (type: 'LOAN' | 'INVESTMENT') => {
        setCalcType(type);
        setRateError(null);
        if (type === 'LOAN') {
            setSelectedProductId('ippis'); setRate(24); setTerm(12); setPrincipal(500000); setCurrency('NGN');
        } else {
            setSelectedProductId('rise'); setTerm(365); setPrincipal(100000); setPayoutFrequency('maturity'); setRate(0);
        }
    };

    const handleProductChange = (productId: string) => {
        setSelectedProductId(productId);
        setRateError(null);
        if (productId === 'vault') setPayoutFrequency('maturity');
        if (calcType === 'LOAN') {
            const product = LOAN_PRODUCTS.find(p => p.id === productId);
            if (product) setRate(product.rate);
        } else {
            setRate(0);
        }
    };

    const results = useMemo(() => {
        if (calcType === 'LOAN') {
            const monthlyRate = (rate / 100) / 12;
            if (monthlyRate === 0 || term === 0) return { mainValue: 0, label: 'Monthly Repayment', totalLabel: 'Total Repayment', totalValue: 0, interestLabel: 'Interest Payable', interestValue: 0 };
            const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
            const totalRepayment = monthlyPayment * term;
            return { mainValue: monthlyPayment, label: 'Monthly Repayment', totalLabel: 'Total Repayment', totalValue: totalRepayment, interestLabel: 'Interest Payable', interestValue: totalRepayment - principal };
        } else {
            const totalInterest = (principal * (rate / 100) * (term / 365));
            return { mainValue: principal + totalInterest, label: 'Maturity Amount', totalLabel: 'Initial Principal', totalValue: principal, interestLabel: 'Total Returns', interestValue: totalInterest };
        }
    }, [calcType, principal, rate, term]);

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className="max-w-6xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Financial <span className="text-primary">Calculator</span></h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Estimate loan repayments and investment returns for customers.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex gap-1 shadow-inner">
                            <button onClick={() => handleCalcTypeChange('LOAN')}
                                className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${calcType === 'LOAN' ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'text-slate-500 hover:text-slate-700'}`}>
                                <span className="material-symbols-outlined text-lg">payments</span>Loan
                            </button>
                            <button onClick={() => handleCalcTypeChange('INVESTMENT')}
                                className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${calcType === 'INVESTMENT' ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'text-slate-500 hover:text-slate-700'}`}>
                                <span className="material-symbols-outlined text-lg">trending_up</span>Investment
                            </button>
                        </div>
                        {calcType === 'INVESTMENT' && (
                            <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex gap-1 shadow-inner animate-in fade-in duration-300">
                                <button onClick={() => setCurrency('NGN')} className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${currency === 'NGN' ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'text-slate-500'}`}>NGN</button>
                                <button onClick={() => setCurrency('USD')} className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${currency === 'USD' ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'text-slate-500'}`}>USD</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Input Section */}
                    <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-xl flex flex-col gap-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Select Product</label>
                                <div className="relative">
                                    <select value={selectedProductId} onChange={(e) => handleProductChange(e.target.value)}
                                        className="w-full h-14 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary rounded-2xl px-5 text-base font-black dark:text-white outline-none transition-all appearance-none">
                                        {(calcType === 'LOAN' ? LOAN_PRODUCTS : INVESTMENT_PRODUCTS).map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none">expand_more</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{calcType === 'LOAN' ? 'Loan Amount' : 'Principal'}</label>
                                <div className="relative">
                                    <input type="number" value={principal} onChange={(e) => setPrincipal(parseInt(e.target.value) || 0)}
                                        className={`w-full h-14 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl px-12 text-lg font-black dark:text-white outline-none transition-all ${principal < minAmount ? 'border-red-500' : 'border-transparent focus:border-primary'}`} />
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-primary text-lg">{currency === 'NGN' ? '₦' : '$'}</span>
                                </div>
                                {principal < minAmount && <p className="text-[10px] font-bold text-red-500 flex items-center gap-1"><span className="material-symbols-outlined text-xs">warning</span>Min: {formatMoney(minAmount, currency)}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Tenure ({calcType === 'LOAN' ? 'Months' : 'Days'})</label>
                                {calcType === 'INVESTMENT' ? (
                                    <div className="pt-2">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-lg font-black dark:text-white">{term} Days</span>
                                        </div>
                                        <input type="range" min="0" max={TENURE_VALUES.length - 1} step="1"
                                            value={TENURE_VALUES.indexOf(term) !== -1 ? TENURE_VALUES.indexOf(term) : 0}
                                            onChange={(e) => setTerm(TENURE_VALUES[parseInt(e.target.value)])}
                                            className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary" />
                                        <div className="flex justify-between mt-1.5">
                                            <span className="text-[9px] font-bold text-slate-400">30D</span>
                                            <span className="text-[9px] font-bold text-slate-400">180D</span>
                                            <span className="text-[9px] font-bold text-slate-400">365D</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <input type="number" value={term} min={minTerm} max={maxTerm}
                                            onChange={(e) => setTerm(Math.min(maxTerm, Math.max(0, parseInt(e.target.value) || 0)))}
                                            className={`w-full h-14 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl px-5 text-lg font-black dark:text-white outline-none transition-all ${term < minTerm ? 'border-red-500' : 'border-transparent focus:border-primary'}`} />
                                        <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">Months</span>
                                    </div>
                                )}
                                {term < minTerm && <p className="text-[10px] font-bold text-red-500 flex items-center gap-1"><span className="material-symbols-outlined text-xs">warning</span>Min: {minTerm} {calcType === 'LOAN' ? 'months' : 'days'}</p>}
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Interest Rate (% p.a.)</label>
                                <div className="relative">
                                    <input type="number" value={rate} step="0.1" readOnly={calcType === 'INVESTMENT'}
                                        onChange={(e) => { if (calcType === 'LOAN') setRate(parseFloat(e.target.value) || 0); }}
                                        className={`w-full h-14 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary rounded-2xl px-5 text-lg font-black dark:text-white outline-none transition-all ${calcType === 'INVESTMENT' ? 'opacity-70 cursor-not-allowed' : ''}`} />
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                                    {fetchingRate && (
                                        <div className="absolute right-12 top-1/2 -translate-y-1/2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                        </div>
                                    )}
                                </div>
                                {calcType === 'INVESTMENT' && !rateError && <p className="text-[9px] font-bold text-primary/60 flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">auto_fix_high</span>Live rate from rate engine</p>}
                                {rateError && <p className="text-[9px] font-bold text-amber-500 flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">info</span>{rateError}</p>}
                            </div>
                        </div>

                        {/* Vault Payout Frequency */}
                        {isVault && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-3 bg-primary rounded-full"></div>
                                    <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Payout Frequency</label>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {PAYOUT_FREQUENCIES.map(freq => (
                                        <button key={freq.value} onClick={() => setPayoutFrequency(freq.value)}
                                            className={`p-3 rounded-xl border-2 text-center transition-all font-bold text-xs ${payoutFrequency === freq.value ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10' : 'border-slate-100 dark:border-slate-700 text-slate-500 hover:border-slate-300'}`}>
                                            <span className="material-symbols-outlined text-lg block mb-0.5">
                                                {freq.value === 'monthly' ? 'calendar_month' : freq.value === 'quarterly' ? 'date_range' : 'event_available'}
                                            </span>
                                            {freq.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Results Section */}
                    <div className="lg:col-span-5 space-y-5">
                        <div className="bg-primary text-white rounded-3xl p-8 flex flex-col gap-8 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>
                            <div className="relative z-10 space-y-2">
                                <h3 className="text-xs font-black text-white/70 uppercase tracking-widest">{results.label}</h3>
                                <p className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
                                    {fetchingRate ? '...' : formatMoney(results.mainValue, currency)}
                                </p>
                            </div>
                            <div className="relative z-10 space-y-4 pt-4 border-t border-white/20">
                                <div className="flex justify-between items-center">
                                    <span className="text-white/60 font-bold uppercase tracking-widest text-[10px]">{results.interestLabel}</span>
                                    <span className="text-lg font-black">+{formatMoney(results.interestValue, currency)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-white/60 font-bold uppercase tracking-widest text-[10px]">{results.totalLabel}</span>
                                    <span className="text-lg font-black">{formatMoney(results.totalValue, currency)}</span>
                                </div>
                            </div>
                            <div className="relative z-10 flex gap-3 pt-2">
                                <div className="flex-1 bg-white/10 rounded-xl p-3 flex flex-col gap-0.5">
                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{calcType === 'LOAN' ? 'Monthly Rate' : 'Daily Rate'}</span>
                                    <span className="text-sm font-bold">{calcType === 'LOAN' ? (rate / 12).toFixed(2) : (rate / 365).toFixed(3)}%</span>
                                </div>
                                <div className="flex-1 bg-white/10 rounded-xl p-3 flex flex-col gap-0.5">
                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{calcType === 'LOAN' ? 'Term' : isVault ? 'Payout' : 'Tenure'}</span>
                                    <span className="text-sm font-bold">
                                        {calcType === 'LOAN' ? `${term} Mo` : isVault ? PAYOUT_FREQUENCIES.find(f => f.value === payoutFrequency)?.label : `${term} Days`}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <span className="material-symbols-outlined text-2xl filled">
                                    {calcType === 'LOAN' ? 'account_balance' : selectedProductId === 'rise' ? 'trending_up' : selectedProductId === 'surge' ? 'bolt' : 'savings'}
                                </span>
                            </div>
                            <div>
                                <h4 className="text-slate-900 dark:text-white font-black text-sm">
                                    {calcType === 'LOAN' ? 'IPPIS Loan' : INVESTMENT_PRODUCTS.find(p => p.id === selectedProductId)?.name}
                                </h4>
                                <p className="text-slate-400 text-[10px] font-medium leading-relaxed mt-0.5">
                                    Calculations use live rates. Final terms may vary based on eligibility.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </StaffLayout>
    );
};

export default StaffCalculatorPage;
