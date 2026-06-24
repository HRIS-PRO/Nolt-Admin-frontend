import React, { useState, useEffect } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import axios from 'axios';

interface Product {
    id: number;
    category: 'loan' | 'investment';
    custom_name: string;
    note: string | null;
    cba_product_code: string;
    cba_product_name: string;
    interest_rate: number;
    is_active: boolean;
    created_at: string;
}

interface CBAProduct {
    productCode: string;
    productName: string;
    interestRate: number;
    minimumTerm?: number;
    maximumTerm?: number;
    minimumAmount?: number;
    maximumAmount?: number;
}

const API_BASE = '/api';

const ProductsPage: React.FC<any> = ({ user, onLogout, toggleTheme, theme }) => {
    const [activeTab, setActiveTab] = useState<'loan' | 'investment'>('loan');
    const [showCreateWizard, setShowCreateWizard] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [products, setProducts] = useState<Product[]>([]);
    const [cachedCbaInvestments, setCachedCbaInvestments] = useState<CBAProduct[]>([]);
    const [cachedCbaLoans, setCachedCbaLoans] = useState<CBAProduct[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingCBA, setIsFetchingCBA] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [processingId, setProcessingId] = useState<number | string | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form State
    const [selectedCbaCode, setSelectedCbaCode] = useState('');
    const [customName, setCustomName] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        fetchOurProducts();
        fetchAllCBAData();
    }, []);

    const fetchOurProducts = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/products`, { withCredentials: true });
            setProducts(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Error fetching products:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAllCBAData = async () => {
        setIsFetchingCBA(true);
        try {
            const [invRes, loanRes] = await Promise.all([
                axios.get(`${API_BASE}/products/cba/investments`, { withCredentials: true }),
                axios.get(`${API_BASE}/products/cba/loans`, { withCredentials: true })
            ]);
            
            if (invRes.data && (invRes.data.response || invRes.data.Response)) {
                setCachedCbaInvestments(invRes.data.response || invRes.data.Response);
            }
            if (loanRes.data && (loanRes.data.response || loanRes.data.Response || loanRes.data.data)) {
                setCachedCbaLoans(loanRes.data.response || loanRes.data.Response || loanRes.data.data);
            }
        } catch (err) {
            console.error("Error fetching CBA data:", err);
        } finally {
            setIsFetchingCBA(false);
        }
    };

    const handleOpenWizard = () => {
        setEditingProduct(null);
        setWizardStep(1);
        setShowCreateWizard(true);
        setSelectedCbaCode('');
        setCustomName('');
        setNote('');
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setSelectedCbaCode(product.cba_product_code);
        setCustomName(product.custom_name);
        setNote(product.note || '');
        setWizardStep(2);
        setShowCreateWizard(true);
    };

    const handleToggleStatus = async (product: Product) => {
        setProcessingId(product.id);
        try {
            await axios.patch(`${API_BASE}/products/${product.id}/status`, {
                is_active: !product.is_active
            }, { withCredentials: true });
            await fetchOurProducts();
        } catch (err) {
            alert("Failed to update status");
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeleteProduct = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this product wrapper?")) return;
        setProcessingId(`delete-${id}`);
        try {
            await axios.delete(`${API_BASE}/products/${id}`, { withCredentials: true });
            await fetchOurProducts();
        } catch (err) {
            alert("Failed to delete product");
        } finally {
            setProcessingId(null);
        }
    };

    const handleCreateOrUpdateProduct = async () => {
        const cbaList = activeTab === 'investment' ? cachedCbaInvestments : cachedCbaLoans;
        const selectedCBA = cbaList.find(p => p.productCode.trim() === selectedCbaCode.trim());
        
        if (!customName) return;

        try {
            setIsSaving(true);
            if (editingProduct) {
                await axios.put(`${API_BASE}/products/${editingProduct.id}`, {
                    custom_name: customName,
                    note: note || null,
                    is_active: editingProduct.is_active
                }, { withCredentials: true });
            } else {
                if (!selectedCBA) return;
                await axios.post(`${API_BASE}/products`, {
                    category: activeTab,
                    custom_name: customName,
                    note: note || null,
                    cba_product_code: selectedCBA.productCode.trim(),
                    cba_product_name: selectedCBA.productName,
                    interest_rate: selectedCBA.interestRate,
                    min_term: selectedCBA.minimumTerm,
                    max_term: selectedCBA.maximumTerm,
                    min_amount: selectedCBA.minimumAmount,
                    max_amount: selectedCBA.maximumAmount
                }, { withCredentials: true });
            }
            
            setShowCreateWizard(false);
            await fetchOurProducts();
        } catch (err) {
            console.error("Error saving product:", err);
            alert("Failed to save product");
        } finally {
            setIsSaving(false);
        }
    };

    const currentCbaProducts = activeTab === 'investment' ? cachedCbaInvestments : cachedCbaLoans;
    
    const availableCbaProducts = currentCbaProducts.filter(cba => 
        !products.some(p => p.cba_product_code.trim() === cba.productCode.trim() && p.category === activeTab)
    );

    const stats = {
        total: products.length,
        loans: products.filter(p => p.category === 'loan').length,
        investments: products.filter(p => p.category === 'investment').length,
        active: products.filter(p => p.is_active).length
    };

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <header className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-10">
                <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        Product Catalogue Manager
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Configure and brand core banking products for customer-facing interfaces.
                    </p>
                </div>
                <div className="flex gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
                    <button 
                        onClick={handleOpenWizard}
                        className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-sm font-black">add</span>
                        New Product Wrapper
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {[
                    { label: 'Total Products', value: stats.total, icon: 'inventory_2', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Loan Wrappers', value: stats.loans, icon: 'payments', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
                    { label: 'Investment Wrappers', value: stats.investments, icon: 'account_balance_wallet', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                    { label: 'Active in System', value: stats.active, icon: 'verified', color: 'text-green-500', bg: 'bg-green-500/10' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`size-10 rounded-xl ${stat.bg} flex items-center justify-center border border-slate-100 dark:border-slate-700 ${stat.color}`}>
                                <span className="material-symbols-outlined">{stat.icon}</span>
                            </div>
                        </div>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">{stat.label}</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</h3>
                    </div>
                ))}
            </div>

            <div className="bg-white dark:bg-[#1e293b] rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/10">
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit border border-slate-200 dark:border-slate-700 shadow-inner">
                        <button
                            onClick={() => setActiveTab('loan')}
                            className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'loan' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xl' : 'text-slate-500'}`}
                        >Loans
                        </button>
                        <button
                            onClick={() => setActiveTab('investment')}
                            className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'investment' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xl' : 'text-slate-500'}`}
                        >Investments</button>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        <span className="size-2 rounded-full bg-blue-500 animate-pulse"></span>
                        Live Connection to CBA
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 dark:bg-[#0f172a]/30 text-[10px] uppercase text-slate-500 font-black tracking-widest">
                            <tr>
                                <th className="p-8">Marketing Identity</th>
                                <th className="p-8">Infrastructure Link</th>
                                <th className="p-8 text-center">Interest Yield</th>
                                <th className="p-8">System Status</th>
                                <th className="p-8 text-right">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800/50">
                            {isLoading && products.length === 0 ? (
                                <tr><td colSpan={5} className="p-24 text-center">
                                    <div className="flex flex-col items-center gap-4 animate-pulse">
                                        <div className="size-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Syncing Catalogue...</p>
                                    </div>
                                </td></tr>
                            ) : products.filter(p => p.category === activeTab).length === 0 ? (
                                <tr><td colSpan={5} className="p-24 text-center">
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="size-24 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                                            <span className="material-symbols-outlined text-4xl text-slate-300">inventory</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-slate-500 font-black uppercase tracking-widest text-sm">Inventory is Empty</p>
                                            <p className="text-slate-400 text-xs font-medium">Create your first {activeTab} wrapper using the button above.</p>
                                        </div>
                                    </div>
                                </td></tr>
                            ) : (
                                products.filter(p => p.category === activeTab).map(product => (
                                    <tr key={product.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                                        <td className="p-8">
                                            <div className="flex items-center gap-5">
                                                <div className={`size-12 rounded-[1rem] flex items-center justify-center text-white font-black shadow-xl transform group-hover:scale-110 transition-all ${product.category === 'loan' ? 'bg-gradient-to-br from-cyan-500 to-blue-500 shadow-cyan-500/20' : 'bg-gradient-to-br from-indigo-600 to-blue-700 shadow-indigo-500/20'}`}>
                                                    {product.custom_name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 dark:text-white text-base mb-0.5">{product.custom_name}</p>
                                                    {product.note && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xs leading-tight mt-0.5 line-clamp-2">{product.note}</p>
                                                    )}
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Added {new Date(product.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-8">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-500/20">CBA #{product.cba_product_code}</span>
                                                </div>
                                                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-tight truncate max-w-xs">{product.cba_product_name}</p>
                                            </div>
                                        </td>
                                        <td className="p-8 text-center">
                                            <div className="inline-block p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                                                <p className="text-xl font-black text-slate-900 dark:text-white">
                                                    {product.interest_rate}%
                                                    <span className="text-[10px] text-slate-400 ml-1">{product.category === 'loan' ? 'P.M' : 'P.A'}</span>
                                                </p>
                                            </div>
                                        </td>
                                        <td className="p-8">
                                            <button 
                                                disabled={processingId === product.id}
                                                onClick={() => handleToggleStatus(product)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${product.is_active ? 'border-green-500/20 bg-green-500/5 text-green-600 hover:bg-green-500/10' : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'} disabled:opacity-50`}
                                            >
                                                {processingId === product.id ? (
                                                    <div className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    <div className={`size-2 rounded-full ${product.is_active ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse' : 'bg-slate-300'}`}></div>
                                                )}
                                                <span className="text-[10px] font-black uppercase tracking-widest">{product.is_active ? 'Online' : 'Offline'}</span>
                                            </button>
                                        </td>
                                        <td className="p-8 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    disabled={processingId === `delete-${product.id}`}
                                                    onClick={() => handleEditProduct(product)}
                                                    className="size-10 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center group/btn"
                                                >
                                                    <span className="material-symbols-outlined text-xl group-hover/btn:rotate-12 transition-transform">edit_note</span>
                                                </button>
                                                <button 
                                                    disabled={processingId === `delete-${product.id}`}
                                                    onClick={() => handleDeleteProduct(product.id)}
                                                    className="size-10 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center group/btn disabled:opacity-50"
                                                >
                                                    {processingId === `delete-${product.id}` ? (
                                                        <div className="size-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <span className="material-symbols-outlined text-xl group-hover/btn:scale-110 transition-transform">delete_sweep</span>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Product Creation/Edit Wizard */}
            {showCreateWizard && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowCreateWizard(false)} />
                    <div className="relative w-full max-w-2xl bg-white dark:bg-[#1e293b] rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                        
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                            <div className="flex items-center gap-5">
                                <div className="size-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <span className="material-symbols-outlined text-3xl filled">{editingProduct ? 'edit_square' : 'factory'}</span>
                                </div>
                                <div>
                                    <h2 className="font-black text-2xl text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-1">
                                        {editingProduct ? 'Refine Product' : 'Product Factory'}
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            {editingProduct ? 'UPDATE MODE' : `Step ${wizardStep} of 2`}
                                        </span>
                                        {!editingProduct && (
                                            <div className="flex gap-1">
                                                {[1, 2].map(s => (
                                                    <div key={s} className={`h-1.5 w-5 rounded-full transition-all duration-500 ${s <= wizardStep ? 'bg-blue-600 w-10' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setShowCreateWizard(false)} className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 transition-all hover:rotate-90 flex items-center justify-center">
                                <span className="material-symbols-outlined font-black">close</span>
                            </button>
                        </div>

                        <div className="p-12 space-y-10 min-h-[420px]">
                            {wizardStep === 1 ? (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Select Core Infrastructure</label>
                                            {isFetchingCBA && <span className="text-[9px] font-black text-blue-500 animate-pulse">SYNCING DATA...</span>}
                                        </div>
                                        <div className="relative group">
                                            <select 
                                                value={selectedCbaCode}
                                                onChange={(e) => setSelectedCbaCode(e.target.value)}
                                                disabled={isFetchingCBA}
                                                className="w-full h-18 px-8 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/50 outline-none font-black text-sm appearance-none cursor-pointer transition-all shadow-inner"
                                            >
                                                <option value="">{isFetchingCBA ? 'Reaching CBA Service...' : '-- Select Product Base --'}</option>
                                                {availableCbaProducts.map(p => (
                                                    <option key={p.productCode} value={p.productCode}>
                                                        #{p.productCode.trim()} — {p.productName}
                                                    </option>
                                                ))}
                                            </select>
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 material-symbols-outlined pointer-events-none text-slate-400 group-hover:text-blue-500 transition-all">expand_more</span>
                                        </div>
                                        {availableCbaProducts.length === 0 && !isFetchingCBA && (
                                            <p className="text-[10px] text-amber-500 font-bold px-1 italic">All discovered CBA products have already been wrapped.</p>
                                        )}
                                    </div>

                                    {selectedCbaCode && (
                                        <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-blue-600/5 to-indigo-600/5 border border-blue-500/10 space-y-6 animate-in fade-in zoom-in-95 duration-500">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                                                        <span className="material-symbols-outlined text-base">analytics</span>
                                                    </div>
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Technical Extraction</h4>
                                                </div>
                                                <span className="px-3 py-1 rounded-full bg-blue-600/10 text-blue-600 text-[10px] font-black">VERIFIED</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-10">
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Base Rate</p>
                                                    <p className="text-3xl font-black text-slate-900 dark:text-white">
                                                        {currentCbaProducts.find(p => p.productCode.trim() === selectedCbaCode.trim())?.interestRate}% 
                                                        <span className="text-xs text-slate-400 ml-1">{activeTab === 'loan' ? 'P.M' : 'P.A'}</span>
                                                    </p>
                                                </div>
                                                <div className="space-y-1 border-l border-slate-100 dark:border-slate-800 pl-8">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Term Logic</p>
                                                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                                                        {currentCbaProducts.find(p => p.productCode.trim() === selectedCbaCode.trim())?.minimumTerm || 0}D - {currentCbaProducts.find(p => p.productCode.trim() === selectedCbaCode.trim())?.maximumTerm || 365}D
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Assign Marketing Name</label>
                                        <input 
                                            type="text" 
                                            value={customName}
                                            onChange={(e) => setCustomName(e.target.value)}
                                            placeholder="e.g. Nolt Surge Pro" 
                                            className="w-full h-18 px-8 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/50 outline-none font-black text-base shadow-inner transition-all" 
                                        />
                                        <p className="text-[10px] text-slate-400 font-medium px-1">This name will be the primary identifier for customers.</p>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Product Note / Description <span className="text-slate-300 dark:text-slate-600 normal-case font-medium">(optional)</span></label>
                                        <textarea
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            placeholder="e.g. Best suited for long-term savers looking for competitive returns with flexible exit options."
                                            rows={3}
                                            className="w-full px-8 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/50 outline-none font-medium text-sm shadow-inner transition-all resize-none"
                                        />
                                        <p className="text-[10px] text-slate-400 font-medium px-1">This note will be visible to customers when they browse investment products.</p>
                                    </div>

                                    <div className="p-10 rounded-[2.5rem] bg-slate-900 text-white relative overflow-hidden group shadow-2xl">
                                        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <span className="material-symbols-outlined text-8xl">identity_platform</span>
                                        </div>
                                        <div className="relative z-10 space-y-8">
                                            <div className="flex justify-between items-start">
                                                <div className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[9px] font-black uppercase tracking-[0.2em] text-blue-400 border border-white/10">
                                                    Mobile App Preview
                                                </div>
                                                <div className="size-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
                                            </div>
                                            
                                            <div>
                                                <h4 className="text-4xl font-black tracking-tighter leading-tight mb-2 truncate">
                                                    {customName || 'Product Name'}
                                                </h4>
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-sm text-blue-500">verified</span>
                                                    <p className="text-xs font-bold text-slate-400">Backed by Core Banking Application (CBA)</p>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-white/5 flex gap-10">
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Base Return Rate</p>
                                                    <p className="text-lg font-black">
                                                        {currentCbaProducts.find(p => p.productCode.trim() === selectedCbaCode.trim())?.interestRate || 0}%
                                                        <span className="text-[10px] ml-1 text-slate-500">{activeTab === 'loan' ? 'P.M' : 'P.A'}</span>
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Product Origin</p>
                                                    <p className="text-xs font-black text-blue-400 uppercase">#{selectedCbaCode}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-10 bg-slate-50 dark:bg-slate-800/50 flex justify-between gap-5 border-t border-slate-100 dark:border-slate-800">
                            {(wizardStep === 2 && !editingProduct) && (
                                <button 
                                    onClick={() => setWizardStep(1)}
                                    className="px-10 py-5 rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-all flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                                    REVISE INFRA
                                </button>
                            )}
                            <button 
                                onClick={wizardStep === 1 ? () => setWizardStep(2) : handleCreateOrUpdateProduct}
                                disabled={wizardStep === 1 ? !selectedCbaCode || isSaving : !customName || isSaving}
                                className="flex-1 cursor-pointer p-4 h-18 rounded-2xl bg-slate-900 dark:bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 flex items-center justify-center gap-3 relative overflow-hidden group/btn"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                                {isSaving ? (
                                    <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <span className="material-symbols-outlined text-xl">{wizardStep === 1 ? 'branding_watermark' : (editingProduct ? 'published_with_changes' : 'rocket_launch')}</span>
                                )}
                                {isSaving ? 'Processing...' : (wizardStep === 1 ? 'PROCEED TO BRANDING' : (editingProduct ? 'UPDATE WRAPPER' : 'ACTIVATE PRODUCT'))}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </StaffLayout>
    );
};

export default ProductsPage;
