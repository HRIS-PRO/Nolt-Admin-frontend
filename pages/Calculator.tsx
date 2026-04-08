
import React, { useState, useMemo, useEffect } from 'react';
import { AppStep } from '../types';
import { calculateInvestmentRate, InvestmentPlan } from '../utils/rates';

interface CalculatorProps {
  navigate: (step: AppStep) => void;
  formatMoney: (amount: number, currency?: string) => string;
}

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
  { id: 'business', name: 'Business Loan', rate: 12 },
  { id: 'salary', name: 'Salary Advance', rate: 15 },
];

const INVESTMENT_PRODUCTS = [
  { id: 'rise', name: 'NOLT Rise', rate: 12.5 },
  { id: 'surge', name: 'NOLT Surge', rate: 15.0 },
  { id: 'vault', name: 'NOLT Vault', rate: 18.0 },
];

const Calculator: React.FC<CalculatorProps> = ({ navigate, formatMoney }) => {
  const [calcType, setCalcType] = useState<'LOAN' | 'INVESTMENT'>('LOAN');
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [selectedProductId, setSelectedProductId] = useState<string>(calcType === 'LOAN' ? LOAN_PRODUCTS[0].id : INVESTMENT_PRODUCTS[0].id);
  
  // States
  const [principal, setPrincipal] = useState<number>(10000);
  const [rate, setRate] = useState<number>(calcType === 'LOAN' ? LOAN_PRODUCTS[0].rate : INVESTMENT_PRODUCTS[0].rate);
  const [term, setTerm] = useState<number>(365); // Default to 365 days for investment, 12 months for loan handled in toggle

  const minAmount = useMemo(() => {
    if (calcType === 'LOAN') return 1000;
    const plan = selectedProductId.toUpperCase();
    if (plan === 'VAULT') {
      return currency === 'NGN' ? 100000 : 10000;
    }
    return 10000;
  }, [calcType, selectedProductId, currency]);

  const minTerm = useMemo(() => {
    if (calcType === 'LOAN') return 1;
    const plan = selectedProductId.toUpperCase();
    if (plan === 'SURGE') return 30;
    if (plan === 'VAULT' && currency === 'NGN') return 30;
    return 90; // Vault USD and Rise
  }, [calcType, selectedProductId, currency]);

  // Sync rate for investments
  useEffect(() => {
    if (calcType === 'INVESTMENT') {
      const plan = selectedProductId.toUpperCase() as InvestmentPlan;
      const newRate = calculateInvestmentRate({
        amount: principal,
        tenureDays: term,
        plan,
        currency
      });
      setRate(newRate);
      
      // Enforce minimum amount on product/currency change
      if (principal < minAmount) {
        setPrincipal(minAmount);
      }
      
      // Enforce minimum term
      if (term < minTerm) {
        setTerm(minTerm);
      }
    }
  }, [calcType, currency, selectedProductId, minAmount, minTerm]);

  useEffect(() => {
    if (calcType === 'INVESTMENT') {
      const plan = selectedProductId.toUpperCase() as InvestmentPlan;
      const newRate = calculateInvestmentRate({
        amount: principal,
        tenureDays: term,
        plan,
        currency
      });
      setRate(newRate);
    }
  }, [principal, term]);

  const handleCalcTypeChange = (type: 'LOAN' | 'INVESTMENT') => {
    setCalcType(type);
    const products = type === 'LOAN' ? LOAN_PRODUCTS : INVESTMENT_PRODUCTS;
    setSelectedProductId(products[0].id);
    setRate(products[0].rate);
    setTerm(type === 'LOAN' ? 12 : 365);
  };

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const products = calcType === 'LOAN' ? LOAN_PRODUCTS : INVESTMENT_PRODUCTS;
    const product = products.find(p => p.id === productId);
    if (product) {
      setRate(product.rate);
    }
  };

  const results = useMemo(() => {
    if (calcType === 'LOAN') {
      const monthlyRate = (rate / 100) / 12;
      const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
      const totalRepayment = monthlyPayment * term;
      const totalInterest = totalRepayment - principal;
      return {
        mainValue: monthlyPayment,
        label: 'Monthly Payment',
        totalLabel: 'Total Repayment',
        totalValue: totalRepayment,
        interestLabel: 'Interest Payable',
        interestValue: totalInterest
      };
    } else {
      const totalInterest = (principal * (rate / 100) * (term / 365));
      const maturityValue = principal + totalInterest;
      return {
        mainValue: maturityValue,
        label: 'Maturity Amount',
        totalLabel: 'Initial Principal',
        totalValue: principal,
        interestLabel: 'Total Returns',
        interestValue: totalInterest
      };
    }
  }, [calcType, principal, rate, term]);

  const tooltips = {
    loanTenure: "How long you'll take to pay back. A longer term means smaller monthly payments but more interest paid over time.",
    loanRate: "The annual cost of borrowing. A lower rate directly reduces your monthly payment and total cost.",
    invTenure: "The duration your money works for you. Longer periods mean your capital earns more total interest.",
    invRate: "Your annual percentage yield. This determines how quickly your money grows year over year."
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
        <div className="space-y-2">
          <button 
            onClick={() => navigate('DASHBOARD')}
            className="flex items-center gap-2 text-sm font-black text-slate-400 hover:text-primary transition-colors mb-4 uppercase tracking-widest"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Dashboard
          </button>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight">Financial <span className="text-primary">Wizard</span></h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Plan your financial moves with precision and flair.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl flex gap-1 shadow-inner">
            <button 
              onClick={() => handleCalcTypeChange('LOAN')}
              className={`px-8 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${calcType === 'LOAN' ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <span className="material-symbols-outlined text-xl">payments</span>
              Loan
            </button>
            <button 
              onClick={() => handleCalcTypeChange('INVESTMENT')}
              className={`px-8 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${calcType === 'INVESTMENT' ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <span className="material-symbols-outlined text-xl">trending_up</span>
              Investment
            </button>
          </div>

          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl flex gap-1 shadow-inner">
            <button 
              onClick={() => setCurrency('NGN')}
              className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${currency === 'NGN' ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              NGN
            </button>
            <button 
              onClick={() => setCurrency('USD')}
              className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${currency === 'USD' ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              USD
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Input Section */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 md:p-12 border border-slate-100 dark:border-slate-700 shadow-2xl flex flex-col gap-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Select Product</label>
              <div className="relative">
                <select 
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full h-16 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary rounded-2xl px-6 text-lg font-black dark:text-white outline-none transition-all appearance-none"
                >
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
                <input 
                  type="number" 
                  value={principal}
                  onChange={(e) => setPrincipal(parseInt(e.target.value) || 0)}
                  className={`w-full h-16 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl px-14 text-xl font-black dark:text-white outline-none transition-all ${principal < minAmount ? 'border-red-500' : 'border-transparent focus:border-primary'}`}
                />
                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-primary text-xl">{currency === 'NGN' ? '₦' : '$'}</span>
              </div>
              {principal < minAmount && (
                <p className="text-xs font-bold text-red-500 mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  Minimum amount is {formatMoney(minAmount)}
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
                  <input 
                    type="range" 
                    min="0"
                    max={TENURE_VALUES.length - 1}
                    step="1"
                    value={TENURE_VALUES.indexOf(term) !== -1 ? TENURE_VALUES.indexOf(term) : 0}
                    onChange={(e) => setTerm(TENURE_VALUES[parseInt(e.target.value)])}
                    className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] font-bold text-slate-400">30D</span>
                    <span className="text-[10px] font-bold text-slate-400">180D</span>
                    <span className="text-[10px] font-bold text-slate-400">365D</span>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <input 
                    type="number" 
                    value={term}
                    onChange={(e) => setTerm(parseInt(e.target.value) || 0)}
                    className={`w-full h-16 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl px-6 text-xl font-black dark:text-white outline-none transition-all ${term < minTerm ? 'border-red-500' : 'border-transparent focus:border-primary'}`}
                  />
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
                <input 
                  type="number" 
                  value={rate}
                  step="0.1"
                  readOnly={calcType === 'INVESTMENT'}
                  onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                  className={`w-full h-16 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary rounded-2xl px-6 text-xl font-black dark:text-white outline-none transition-all ${calcType === 'INVESTMENT' ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 dark:border-slate-700">
             <button 
                onClick={() => navigate('PRODUCT_SELECT')}
                className="w-full py-6 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:scale-95"
             >
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
              <p className="text-6xl font-black tracking-tighter leading-none">
                {formatMoney(results.mainValue, currency)}
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
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Daily Rate</span>
                <span className="text-sm font-bold">{(rate / 365).toFixed(3)}%</span>
              </div>
              <div className="flex-1 bg-white/10 rounded-2xl p-4 flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">APY</span>
                <span className="text-sm font-bold">{(Math.pow(1 + (rate/100)/12, 12) - 1 * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2rem] p-8 flex items-center gap-6 shadow-xl border border-slate-800">
             <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-3xl filled">verified</span>
             </div>
             <div>
                <h4 className="text-white font-black uppercase tracking-tight text-sm">NOLT Guarantee</h4>
                <p className="text-slate-400 text-xs font-medium leading-relaxed mt-1 font-semibold">
                   All our financial products are regulated and secure. Calculations are estimates based on your chosen inputs.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
