import React from 'react';
import { InvestmentPlan, Currency, PayoutFrequency } from '../../types';
import { InvestmentProduct } from '../../services/productService';

interface GiftInvestmentFlowProps {
    subStep: number;
    setSubStep: (step: number) => void;
    selectedPlan: InvestmentPlan;
    setSelectedPlan: (plan: InvestmentPlan) => void;
    setSelectedCbaCode: (code: string) => void;
    recipientName: string;
    setRecipientName: (name: string) => void;
    recipientEmail: string;
    setRecipientEmail: (email: string) => void;
    recipientPhone: string;
    setRecipientPhone: (phone: string) => void;
    giftMessage: string;
    setGiftMessage: (msg: string) => void;
    amount: string;
    setAmount: (amt: string) => void;
    currency: Currency;
    setCurrency: (curr: Currency) => void;
    tenure: number;
    setTenure: (tenure: number) => void;
    isInfinityTenure: boolean;
    setIsInfinityTenure: (val: boolean) => void;
    payoutFrequency: PayoutFrequency;
    setPayoutFrequency: (freq: PayoutFrequency) => void;
    rollover: string;
    setRollover: (r: string) => void;
    targetAmount: string;
    setTargetAmount: (amt: string) => void;
    interestRate: number | null;
    returns: { total: number; interestEarned: number };
    dynamicInterestRate: number | null;
    formatMoney: (amount: number, curr?: string) => string;
    handleNext: () => void;
    handleBack: () => void;
    handleGiftSubmit: () => void;
    showProductInfo: boolean;
    setShowProductInfo: (val: boolean) => void;
    showRolloverInfo: boolean;
    setShowRolloverInfo: (val: boolean) => void;
    minAmount: number;
    rateLoading: boolean;
    investmentProducts: InvestmentProduct[];
    productsLoading: boolean;
}

const GiftInvestmentFlow: React.FC<GiftInvestmentFlowProps> = (props) => {
    const {
        subStep, setSubStep,
        selectedPlan, setSelectedPlan, setSelectedCbaCode,
        recipientName, setRecipientName,
        recipientEmail, setRecipientEmail,
        recipientPhone, setRecipientPhone,
        giftMessage, setGiftMessage,
        amount, setAmount,
        currency, setCurrency,
        tenure, setTenure,
        isInfinityTenure, setIsInfinityTenure,
        payoutFrequency, setPayoutFrequency,
        rollover, setRollover,
        targetAmount, setTargetAmount,
        interestRate, returns,
        dynamicInterestRate,
        formatMoney, handleNext, handleBack, handleGiftSubmit,
        showProductInfo, setShowProductInfo,
        showRolloverInfo, setShowRolloverInfo,
        minAmount, rateLoading,
        investmentProducts, productsLoading
    } = props;

    const NavActions = ({ nextLabel = "Continue", onNext = handleNext, isNextDisabled = false }: { nextLabel?: string, onNext?: () => void, isNextDisabled?: boolean }) => (
        <div className="flex flex-col md:flex-row gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
            <button
                onClick={handleBack}
                className="flex-1 py-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-slate-500 font-black text-xs uppercase tracking-widest hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
            >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back
            </button>
            <button
                onClick={onNext}
                disabled={isNextDisabled}
                className={`flex-[2] py-5 rounded-2xl font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-3 ${isNextDisabled ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-rose-500/30 hover:scale-[1.02] active:scale-95'}`}
            >
                {nextLabel}
                <span className="material-symbols-outlined">arrow_forward</span>
            </button>
        </div>
    );

    const CBNLogo = () => (
        <div className="flex justify-center mt-12 py-8 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-1000">
            <img src="https://nolt-finance.vercel.app/cbn-logo.png" alt="Licensed by CBN" className="h-10 md:h-12 w-auto opacity-80 grayscale hover:grayscale-0 transition-all" />
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 relative">
            {/* Product Pill */}
            <div className="absolute top-6 right-6 z-50">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-lg border border-slate-100 dark:border-slate-700">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">NOLT {selectedPlan}</span>
                    <button
                        onClick={() => setShowProductInfo(!showProductInfo)}
                        className="size-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-primary hover:text-white transition-all"
                    >
                        <span className="material-symbols-outlined text-xs">info</span>
                    </button>
                </div>
                {showProductInfo && (
                    <div className="absolute top-full right-0 mt-2 w-64 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                            {selectedPlan === 'RISE' ? 'Recurring investment designed for disciplined wealth building through automated contributions.' :
                                selectedPlan === 'SURGE' ? 'Flexible, compounding investment designed to maximize returns through automatic reinvestment.' :
                                    'Fixed-term investment where you place a lump sum for a predetermined period.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Progress Bar for Gift */}
            <div className="flex flex-col gap-3 mb-12 animate-in fade-in duration-700">
                <div className="flex gap-6 justify-between items-end">
                    <p className="text-slate-900 dark:text-white text-base font-black uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-rose-500">redeem</span>
                        Gift Step {subStep === 100 ? 5 : subStep + 1} of 5
                    </p>
                </div>
                <div className="rounded-full bg-slate-200 dark:bg-slate-800 h-3 w-full overflow-hidden shadow-inner p-0.5">
                    <div className="h-full rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(244,63,94,0.4)]" style={{ width: `${((subStep === 100 ? 5 : subStep + 1) / 5) * 100}%` }}></div>
                </div>
            </div>

            {/* Gift Step 0: Recipient Details */}
            {subStep === 0 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="relative p-10 rounded-[3rem] bg-gradient-to-br from-rose-50 to-indigo-50 dark:from-rose-500/5 dark:to-indigo-500/5 border border-rose-100 dark:border-rose-500/20 overflow-hidden">
                        <div className="absolute -top-10 -right-10 size-40 bg-rose-500/10 rounded-full blur-3xl"></div>
                        <div className="absolute -bottom-10 -left-10 size-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
                        <div className="relative space-y-3 text-center max-w-2xl mx-auto">
                            <div className="size-20 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl flex items-center justify-center text-rose-500 mx-auto mb-6 transform -rotate-6 hover:rotate-0 transition-transform duration-500 ring-4 ring-rose-50 dark:ring-rose-500/10">
                                <span className="material-symbols-outlined text-5xl">card_giftcard</span>
                            </div>
                            <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Spread the Wealth! 🎁</h2>
                            <p className="text-xl text-slate-500 dark:text-slate-400 font-medium">Who's the lucky person getting this investment gift?</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Recipient's Full Name</label>
                                <input className="w-full h-20 rounded-[2rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 px-8 text-xl font-bold dark:text-white focus:border-rose-500 outline-none shadow-sm transition-all" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Enter full name" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Recipient's Email</label>
                                <input className={`w-full h-20 rounded-[2rem] bg-white dark:bg-slate-900 border-2 ${recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail) ? 'border-red-500 focus:border-red-500' : 'border-slate-100 dark:border-slate-800 focus:border-rose-500'} px-8 text-xl font-bold dark:text-white outline-none shadow-sm transition-all`} value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} type="email" placeholder="email@example.com" />
                                {recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail) && (
                                    <p className="text-red-500 text-xs font-bold ml-2">Please enter a valid email address.</p>
                                )}
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Recipient's Phone (Optional)</label>
                                <input className="w-full h-20 rounded-[2rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 px-8 text-xl font-bold dark:text-white focus:border-rose-500 outline-none shadow-sm transition-all" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="+234 ..." />
                            </div>
                            <div className="space-y-3 md:col-span-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Add a Gift Message</label>
                                <textarea className="w-full h-40 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 p-8 text-xl font-bold dark:text-white focus:border-rose-500 outline-none resize-none shadow-sm transition-all" value={giftMessage} onChange={e => setGiftMessage(e.target.value)} placeholder="Write a sweet note..." />
                            </div>
                        </div>

                        {/* Gift Preview Card */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-8 p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl space-y-6 overflow-hidden border border-white/5">
                                <div className="absolute top-0 right-0 size-32 bg-rose-500/20 rounded-full blur-2xl -mr-16 -mt-16"></div>
                                <div className="relative flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-rose-500 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-sm">visibility</span>
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest text-rose-400">Gift Preview</span>
                                </div>
                                <div className="space-y-4 pt-4">
                                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="size-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center font-black text-lg">
                                                {recipientName ? recipientName.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">To</p>
                                                <p className="font-bold text-lg truncate max-w-[150px]">{recipientName || 'Recipient Name'}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Message</p>
                                            <p className="text-sm text-slate-300 italic line-clamp-3">"{giftMessage || 'Your message will appear here...'}"</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest justify-center">
                                        Powered by NOLT Finance
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6">
                        <button
                            onClick={handleNext}
                            disabled={!recipientName || !recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)}
                            className={`px-12 py-5 rounded-2xl font-black text-xl flex items-center gap-3 transition-all ${(!recipientName || !recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xl shadow-rose-500/30 hover:scale-[1.02] active:scale-95'}`}
                        >
                            Choose a Plan
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Gift Step 1: Plan Selection */}
            {subStep === 1 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-full border border-rose-100 dark:border-rose-500/20 text-rose-600 font-black text-[10px] uppercase tracking-widest mb-2">
                        Step 2: Choose the Magic
                    </div>
                    <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">Select a Gift Plan</h2>
                    <p className="text-xl text-slate-500 dark:text-slate-400 font-medium">Choose the perfect investment product for {recipientName}.</p>

                    {productsLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 p-10 space-y-6 animate-pulse">
                                    <div className="size-16 rounded-2xl bg-slate-200 dark:bg-slate-700" />
                                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-xl w-2/3" />
                                    <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-xl w-full" />
                                    <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-xl w-5/6" />
                                    <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded-xl mt-6" />
                                </div>
                            ))}
                        </div>
                    ) : investmentProducts.length === 0 ? (
                        <div className="flex flex-col items-center gap-4 py-20 text-slate-400">
                            <span className="material-symbols-outlined text-5xl">inventory_2</span>
                            <p className="font-bold">No investment products available right now.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 text-left">
                            {investmentProducts.map((product) => {
                                // cba_product_name holds the plan key e.g. "RISE", "SURGE", "VAULT"
                                const planKey = product.cba_product_name?.toUpperCase() || '';
                                const isSelected = selectedPlan === planKey;
                                const iconMap: Record<string, string> = {
                                    RISE: 'rocket_launch', SURGE: 'bolt', VAULT: 'lock'
                                };
                                const colorMap: Record<string, string> = {
                                    RISE: 'bg-emerald-500', SURGE: 'bg-amber-500', VAULT: 'bg-blue-600'
                                };
                                const icon = iconMap[planKey] || 'savings';
                                const color = colorMap[planKey] || 'bg-primary';

                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => {
                                            setSelectedPlan(planKey as InvestmentPlan);
                                            setSelectedCbaCode(product.cba_product_code || '');
                                            handleNext();
                                        }}
                                        className={`group relative p-10 rounded-[3rem] border-2 transition-all overflow-hidden text-left ${
                                            isSelected
                                                ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-500/10 scale-[1.02]'
                                                : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-rose-300'
                                        }`}
                                    >
                                        {/* Glow on hover */}
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-500/5 dark:to-pink-500/5 rounded-[3rem]" />

                                        <div className={`relative size-16 rounded-2xl flex items-center justify-center mb-8 text-white shadow-lg ${color}`}>
                                            <span className="material-symbols-outlined text-3xl">{icon}</span>
                                        </div>

                                        <h3 className="relative font-black text-2xl dark:text-white">{product.custom_name || `NOLT ${planKey}`}</h3>
                                        <p className="relative text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">{product.cba_product_name}</p>

                                        <div className="relative mt-6 space-y-2">
                                            {product.min_amount !== undefined && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400 font-bold uppercase tracking-widest">Min. Amount</span>
                                                    <span className="font-black text-slate-700 dark:text-slate-300">
                                                        {product.currency === 'USD' ? '$' : '₦'}{Number(product.min_amount).toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                            {product.min_term !== undefined && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400 font-bold uppercase tracking-widest">Min. Tenure</span>
                                                    <span className="font-black text-slate-700 dark:text-slate-300">{product.min_term} days</span>
                                                </div>
                                            )}
                                            {product.interest_rate !== undefined && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400 font-bold uppercase tracking-widest">Base Rate</span>
                                                    <span className="font-black text-emerald-600">{product.interest_rate}% p.a.</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="relative mt-8 pt-8 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Gift this plan</span>
                                            <span className="material-symbols-outlined text-rose-500">arrow_forward</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                    )}

                    <div className="flex justify-start pt-6">
                        <button onClick={() => setSubStep(0)} className="flex items-center gap-2 text-slate-500 font-black uppercase tracking-widest hover:text-slate-900 transition-colors">
                            <span className="material-symbols-outlined">arrow_back</span>
                            Back to Recipient
                        </button>
                    </div>
                </div>
            )}

            {/* Gift Step 2: Configuration */}
            {subStep === 2 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                    <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">Customize the Surprise 🎈</h1>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        <div className="lg:col-span-12 flex flex-col gap-12">
                            <div className="space-y-6">
                                <div className="flex justify-between items-end">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Investment Amount</label>
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl gap-1">
                                        <button onClick={() => setCurrency('NGN')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${currency === 'NGN' ? 'bg-white dark:bg-slate-700 text-rose-500 shadow-md' : 'text-slate-400'}`}>NGN</button>
                                        <button onClick={() => setCurrency('USD')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${currency === 'USD' ? 'bg-white dark:bg-slate-700 text-rose-500 shadow-md' : 'text-slate-400'}`}>USD</button>
                                    </div>
                                </div>
                                <div className="relative group">
                                    <span className="absolute left-8 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-300 group-focus-within:text-rose-500 transition-colors uppercase">{currency === 'NGN' ? '₦' : '$'}</span>
                                    <input className="w-full h-24 pl-16 pr-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-4xl font-black text-slate-900 dark:text-white focus:border-rose-500 outline-none transition-all shadow-sm" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" />
                                </div>
                                {dynamicInterestRate === null && amount !== "" && !rateLoading && (
                                    <p className="text-sm font-bold text-red-500 mt-3 flex items-center gap-2 ml-2">
                                        <span className="material-symbols-outlined text-lg">error</span>
                                        No active interest rate found for this amount and tenure configuration.
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-black text-slate-500 uppercase tracking-widest">Tenure (Days)</label>
                                    </div>
                                    <div className="relative pt-4 px-2">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-xl font-black dark:text-white">{tenure} Days</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max={[30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 365].length - 1}
                                            step="1"
                                            value={[30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 365].indexOf(tenure)}
                                            onChange={(e) => setTenure([30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 365][parseInt(e.target.value)])}
                                            className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                                        />
                                        <div className="flex justify-between mt-2 px-1">
                                            <span className="text-[9px] font-bold text-slate-400">30D</span>
                                            <span className="text-[9px] font-bold text-slate-400">180D</span>
                                            <span className="text-[9px] font-bold text-slate-400">365D</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl space-y-8 relative overflow-hidden border border-white/5 flex flex-col justify-center">
                                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-rose-400">Gift Summary</h3>
                                    <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 ring-1 ring-white/5">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Maturity Value</p>
                                        <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-300">
                                            {dynamicInterestRate !== null ? formatMoney(returns.total, currency) : '--'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-4">
                                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Interest Rate</span>
                                        <span className="text-xl font-black text-rose-400">
                                            {dynamicInterestRate !== null ? `${interestRate}% p.a.` : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-8">
                        <button onClick={() => setSubStep(1)} className="flex items-center gap-2 text-slate-500 font-black uppercase tracking-widest hover:text-slate-900 transition-colors">
                            <span className="material-symbols-outlined">arrow_back</span>
                            Back to Plans
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={!amount || tenure <= 0 || rateLoading || dynamicInterestRate === null}
                            className={`px-12 py-5 rounded-2xl font-black text-xl flex items-center gap-3 transition-all ${!amount || tenure <= 0 || rateLoading || dynamicInterestRate === null ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xl shadow-rose-500/30 hover:scale-105 active:scale-95'}`}
                        >
                            {rateLoading ? 'Verifying...' : 'Review Gift'}
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Gift Step 3: Review & Pay */}
            {subStep === 3 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-full border border-rose-100 dark:border-rose-500/20 text-rose-600 font-black text-[10px] uppercase tracking-widest mb-2">
                            Final Step: Secure the Gift
                        </div>
                        <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">Finalize Your Gift 🎁</h2>
                        <p className="text-xl text-slate-500 dark:text-slate-400 font-medium text-center max-w-lg mx-auto">Review the gift details and complete the payment.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mt-12">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-indigo-600 rounded-[3rem] blur-2xl opacity-20 transition-opacity"></div>
                            <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden shadow-rose-500/10">
                                <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 p-12 text-white relative overflow-hidden">
                                    <div className="relative z-10 space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div className="size-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30">
                                                <span className="material-symbols-outlined text-4xl">card_giftcard</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Investment Gift</p>
                                                <p className="text-2xl font-black">NOLT {selectedPlan}</p>
                                            </div>
                                        </div>
                                        <div className="pt-4">
                                            <p className="text-sm font-black uppercase tracking-widest opacity-70 mb-1">For</p>
                                            <p className="text-4xl font-black tracking-tight">{recipientName}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-12 space-y-8 bg-white dark:bg-slate-900">
                                    <div className="space-y-2">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Personal Message</p>
                                        <p className="text-lg text-slate-600 dark:text-slate-300 italic font-medium">"{giftMessage || 'No message provided.'}"</p>
                                    </div>
                                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gift Value</p>
                                            <p className="text-4xl font-black text-rose-500">{formatMoney(parseFloat(amount) || 0, currency)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tenure</p>
                                            <p className="text-xl font-black dark:text-white">{isInfinityTenure ? 'Infinity' : `${tenure} Days`}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="p-10 bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] border-2 border-slate-100 dark:border-slate-700 space-y-8">
                                <h3 className="text-2xl font-black dark:text-white">How it works</h3>
                                <div className="space-y-6">
                                    {['Complete payment.', 'Gift link generated.', 'They claim and grow!'].map((text, i) => (
                                        <div key={i} className="flex gap-5">
                                            <div className="size-10 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 shrink-0 font-black">{i + 1}</div>
                                            <p className="text-slate-600 dark:text-slate-400 font-medium">{text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={handleGiftSubmit}
                                    className="w-full py-6 rounded-[2rem] bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white font-black text-2xl shadow-2xl shadow-rose-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
                                >
                                    Pay & Generate Link
                                    <span className="material-symbols-outlined text-3xl">payments</span>
                                </button>
                                <button onClick={() => setSubStep(2)} className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-slate-600 transition-colors">
                                    Go back and edit details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <CBNLogo />
        </div>
    );
};

export default GiftInvestmentFlow;
