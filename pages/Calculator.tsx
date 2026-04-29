
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { AppStep } from '../types';
import axios from 'axios';

interface CalculatorProps {
  navigate: (step: AppStep) => void;
  formatMoney: (amount: number, currency?: string) => string;
}

type PayoutFrequency = 'monthly' | 'quarterly' | 'maturity';

const TENURE_VALUES = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 365];

const InfoTooltip: React.FC<{ content: string }> = ({ content }) => (
  <div className="group relative inline-block ml-2 cursor-help align-middle">
    <span className="material-symbols-outlined text-primary text-base">info</span>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-slate-900 text-white text-xs font-medium rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pointer-events-none border border-primary/20">
      <div className="relative">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mb-2 w-3 h-3 bg-slate-900 rotate-45 border-r border-b border-primary/20"></div>
      </div>
    </div>
  </div>
);

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

const Calculator: React.FC<CalculatorProps> = ({ navigate, formatMoney }) => {
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

  // Fetch real rate from backend for investments
  const fetchRate = useCallback(async (plan: string, cur: string, amount: number, tenure: number, payout?: PayoutFrequency) => {
    if (calcType !== 'INVESTMENT') return;
    if (amount < 1000 || tenure < 1) return;

    setFetchingRate(true);
    setRateError(null);
    try {
      const planName = plan === 'rise' ? 'NOLT_RISE' : plan === 'surge' ? 'NOLT_SURGE' : 'NOLT_VAULT';
      const params: Record<string, string> = {
        plan: planName,
        currency: cur,
        amount: amount.toString(),
        tenure: tenure.toString(),
      };
      if (plan === 'vault' && payout) {
        params.payout_frequency = payout;
      }
      const { data } = await axios.get('/api/yield-rates/calculate', { params, withCredentials: true });
      if (data?.interest_rate !== undefined) {
        setRate(Number(data.interest_rate));
      } else {
        setRateError('No rate found for this configuration');
      }
    } catch (err: any) {
      console.error('Failed to fetch rate:', err);
      const msg = err.response?.data?.message || 'Could not fetch rate';
      setRateError(msg);
    } finally {
      setFetchingRate(false);
    }
  }, [calcType]);

  // Debounced rate fetch when inputs change
  useEffect(() => {
    if (calcType !== 'INVESTMENT') return;
    
    // Enforce minimums
    let effectivePrincipal = principal;
    let effectiveTerm = term;
    if (principal < minAmount) effectivePrincipal = minAmount;
    if (term < minTerm) effectiveTerm = minTerm;

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
      setRate(0); // Will be fetched
    }
  };

  const results = useMemo(() => {
    if (calcType === 'LOAN') {
      const monthlyRate = (rate / 100) / 12;
      if (monthlyRate === 0 || term === 0) return { mainValue: 0, label: 'Monthly Repayment', totalLabel: 'Total Repayment', totalValue: 0, interestLabel: 'Interest Payable', interestValue: 0 };
      const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
      const totalRepayment = monthlyPayment * term;
      const totalInterest = totalRepayment - principal;
      return { mainValue: monthlyPayment, label: 'Monthly Repayment', totalLabel: 'Total Repayment', totalValue: totalRepayment, interestLabel: 'Interest Payable', interestValue: totalInterest };
    } else {
      const totalInterest = (principal * (rate / 100) * (term / 365));
      const maturityValue = principal + totalInterest;
      return { mainValue: maturityValue, label: 'Maturity Amount', totalLabel: 'Initial Principal', totalValue: principal, interestLabel: 'Total Returns', interestValue: totalInterest };
    }
  }, [calcType, principal, rate, term]);

  const handleApply = () => {
    if (calcType === 'LOAN') {
      navigate('LOAN_TYPE');
    } else {
      navigate('INVESTMENT_FLOW');
    }
  };

  const tooltips = {
    loanTenure: "How long you'll take to pay back. A longer term means smaller monthly payments but more interest paid over time.",
    loanRate: "The annual cost of borrowing. A lower rate directly reduces your monthly payment and total cost.",
    invTenure: "The duration your money works for you. Longer periods mean your capital earns more total interest.",
    invRate: "This rate is fetched from our live rate engine based on your selected plan, amount, tenure, currency, and payout preference."
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
        <div className="space-y-2">
          <button onClick={() => navigate('DASHBOARD')} className="flex items-center gap-2 text-sm font-black text-slate-400 hover:text-primary transition-colors mb-4 uppercase tracking-widest">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Dashboard
          </button>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight">Financial <span className="text-primary">Wizard</span></h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Plan your financial moves with precision and flair.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl flex gap-1 shadow-inner">
            <button onClick={() => handleCalcTypeChange('LOAN')}
              className={`px-8 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${calcType === 'LOAN' ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              <span className="material-symbols-outlined text-xl">payments</span>Loan
            </button>
            <button onClick={() => handleCalcTypeChange('INVESTMENT')}
              className={`px-8 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${calcType === 'INVESTMENT' ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              <span className="material-symbols-outlined text-xl">trending_up</span>Investment
            </button>
          </div>

          {calcType === 'INVESTMENT' && (
            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl flex gap-1 shadow-inner animate-in fade-in slide-in-from-right-4 duration-300">
              <button onClick={() => setCurrency('NGN')}
                className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${currency === 'NGN' ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'text-slate-500 hover:text-slate-700'}`}>NGN</button>
              <button onClick={() => setCurrency('USD')}
                className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${currency === 'USD' ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'text-slate-500 hover:text-slate-700'}`}>USD</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Input Section */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 md:p-12 border border-slate-100 dark:border-slate-700 shadow-2xl flex flex-col gap-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Select Product</label>
              <div className="relative">
                <select value={selectedProductId} onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full h-16 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary rounded-2xl px-6 text-lg font-black dark:text-white outline-none transition-all appearance-none">
                  {(calcType === 'LOAN' ? LOAN_PRODUCTS : INVESTMENT_PRODUCTS).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <span className="absolute right-6 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none">expand_more</span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                {calcType === 'LOAN' ? 'Loan Amount' : 'Investment Principal'}
              </label>
              <div className="relative">
                <input type="number" value={principal} onChange={(e) => setPrincipal(parseInt(e.target.value) || 0)}
                  className={`w-full h-16 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl px-14 text-xl font-black dark:text-white outline-none transition-all ${principal < minAmount ? 'border-red-500' : 'border-transparent focus:border-primary'}`} />
                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-primary text-xl">{currency === 'NGN' ? '₦' : '$'}</span>
              </div>
              {principal < minAmount && (
                <p className="text-xs font-bold text-red-500 mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  Minimum amount is {formatMoney(minAmount, currency)}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center">
                <label className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Tenure ({calcType === 'LOAN' ? 'Months' : 'Days'})</label>
                <InfoTooltip content={calcType === 'LOAN' ? tooltips.loanTenure : tooltips.invTenure} />
              </div>
              {calcType === 'INVESTMENT' ? (
                <div className="relative pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-black dark:text-white">{term} Days</span>
                  </div>
                  <input type="range" min="0" max={TENURE_VALUES.length - 1} step="1"
                    value={TENURE_VALUES.indexOf(term) !== -1 ? TENURE_VALUES.indexOf(term) : 0}
                    onChange={(e) => setTerm(TENURE_VALUES[parseInt(e.target.value)])}
                    className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary" />
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] font-bold text-slate-400">30D</span>
                    <span className="text-[10px] font-bold text-slate-400">180D</span>
                    <span className="text-[10px] font-bold text-slate-400">365D</span>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <input type="number" value={term} min={minTerm} max={maxTerm}
                    onChange={(e) => setTerm(Math.min(maxTerm, Math.max(0, parseInt(e.target.value) || 0)))}
                    className={`w-full h-16 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl px-6 text-xl font-black dark:text-white outline-none transition-all ${term < minTerm ? 'border-red-500' : 'border-transparent focus:border-primary'}`} />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-400">Mo</span>
                </div>
              )}
              {term < minTerm && (
                <p className="text-xs font-bold text-red-500 mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  Minimum tenure is {minTerm} {calcType === 'LOAN' ? 'months' : 'days'}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <label className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Interest Rate (% p.a.)</label>
                <InfoTooltip content={calcType === 'LOAN' ? tooltips.loanRate : tooltips.invRate} />
              </div>
              <div className="relative">
                <input type="number" value={rate} step="0.1" readOnly={calcType === 'INVESTMENT'}
                  onChange={(e) => { if (calcType === 'LOAN') setRate(parseFloat(e.target.value) || 0); }}
                  className={`w-full h-16 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary rounded-2xl px-6 text-xl font-black dark:text-white outline-none transition-all ${calcType === 'INVESTMENT' ? 'opacity-70 cursor-not-allowed' : ''}`} />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                {fetchingRate && (
                  <div className="absolute right-14 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
              {calcType === 'INVESTMENT' && !rateError && (
                <p className="text-[10px] font-bold text-primary/60 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">auto_fix_high</span>
                  Live rate from rate engine
                </p>
              )}
              {rateError && (
                <p className="text-[10px] font-bold text-amber-500 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">info</span>
                  {rateError}
                </p>
              )}
            </div>
          </div>

          {/* Payout Frequency — Vault only */}
          {isVault && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full"></div>
                <label className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Payout Frequency</label>
                <InfoTooltip content="How often you receive interest payouts. Different frequencies may offer different rates." />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {PAYOUT_FREQUENCIES.map(freq => (
                  <button key={freq.value} onClick={() => setPayoutFrequency(freq.value)}
                    className={`p-4 rounded-2xl border-2 text-center transition-all font-bold text-sm ${
                      payoutFrequency === freq.value
                        ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10'
                        : 'border-slate-100 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                    }`}>
                    <span className="material-symbols-outlined text-xl block mb-1">
                      {freq.value === 'monthly' ? 'calendar_month' : freq.value === 'quarterly' ? 'date_range' : 'event_available'}
                    </span>
                    {freq.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-8 border-t border-slate-100 dark:border-slate-700">
             <button onClick={handleApply}
                className="w-full py-6 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black rounded-2xl shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:scale-95">
                {calcType === 'LOAN' ? 'Apply for this Loan' : 'Secure this Investment'}
                <span className="material-symbols-outlined">rocket_launch</span>
             </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-primary text-white rounded-[2.5rem] p-10 flex flex-col gap-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>
            
            <div className="relative z-10 space-y-2">
              <h3 className="text-sm font-black text-white/70 uppercase tracking-widest">{results.label}</h3>
              <p className="text-5xl md:text-6xl font-black tracking-tighter leading-none">
                {fetchingRate ? '...' : formatMoney(results.mainValue, currency)}
              </p>
            </div>

            <div className="relative z-10 space-y-6 pt-6 border-t border-white/20">
              <div className="flex justify-between items-center">
                <span className="text-white/60 font-bold uppercase tracking-widest text-xs">{results.interestLabel}</span>
                <span className="text-xl font-black">+{formatMoney(results.interestValue, currency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 font-bold uppercase tracking-widest text-xs">{results.totalLabel}</span>
                <span className="text-xl font-black">{formatMoney(results.totalValue, currency)}</span>
              </div>
            </div>

            <div className="relative z-10 flex gap-4 pt-4">
              <div className="flex-1 bg-white/10 rounded-2xl p-4 flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  {calcType === 'LOAN' ? 'Monthly Rate' : 'Daily Rate'}
                </span>
                <span className="text-sm font-bold">
                  {calcType === 'LOAN' ? (rate / 12).toFixed(2) : (rate / 365).toFixed(3)}%
                </span>
              </div>
              <div className="flex-1 bg-white/10 rounded-2xl p-4 flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  {calcType === 'LOAN' ? 'Loan Term' : isVault ? 'Payout' : 'APY'}
                </span>
                <span className="text-sm font-bold">
                  {calcType === 'LOAN' ? `${term} Months`
                    : isVault ? PAYOUT_FREQUENCIES.find(f => f.value === payoutFrequency)?.label || 'Maturity'
                    : `${(Math.pow(1 + (rate/100)/12, 12) - 1).toFixed(2)}%`}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2rem] p-8 flex items-center gap-6 shadow-xl border border-slate-800">
             <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-3xl filled">
                  {calcType === 'LOAN' ? 'account_balance' : selectedProductId === 'rise' ? 'trending_up' : selectedProductId === 'surge' ? 'bolt' : 'savings'}
                </span>
             </div>
             <div>
                <h4 className="text-white font-black uppercase tracking-tight text-sm">
                  {calcType === 'LOAN' ? 'IPPIS Loan' : INVESTMENT_PRODUCTS.find(p => p.id === selectedProductId)?.name || 'Investment'}
                </h4>
                <p className="text-slate-400 text-xs font-medium leading-relaxed mt-1">
                  {calcType === 'LOAN'
                    ? 'Public sector salary-backed loan with competitive rates. Calculations are estimates.'
                    : selectedProductId === 'rise' ? 'Fixed-return plan ideal for medium-term growth. Rate scales with amount and tenure.'
                    : selectedProductId === 'surge' ? 'Quick-access savings with competitive rates. Perfect for short-term goals.'
                    : 'Premium high-yield plan with flexible payout options. Best for larger portfolios.'}
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
