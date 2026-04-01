const fs = require('fs');
const path = './pages/ApplicationsList.tsx';

let content = fs.readFileSync(path, 'utf-8');

// 1. Add new state and functions
if (!content.includes('setOpenDropdownId')) {
    const statesToAdd = `
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showLiquidationModal, setShowLiquidationModal] = useState(false);
  const [liquidationType, setLiquidationType] = useState<'FULL' | 'CUSTOM'>('FULL');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLiquidate = (app: any) => {
    setSelectedApp(app);
    setLiquidationType('FULL');
    setCustomAmount('');
    setShowLiquidationModal(true);
  };

  const validateLiquidation = () => {
    if (!selectedApp) return;
    
    const amountToLiquidate = liquidationType === 'FULL' ? selectedApp.amount : parseFloat(customAmount);
    
    if (isNaN(amountToLiquidate) || amountToLiquidate <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    
    if (amountToLiquidate > selectedApp.amount) {
      alert('Amount exceeds available investment balance.');
      return;
    }

    const maturityDate = selectedApp.data?.maturity_date ? new Date(selectedApp.data.maturity_date) : null;
    const today = new Date();
    
    if (maturityDate && today < maturityDate) {
      setShowWarningModal(true);
    } else {
      processLiquidation();
    }
  };

  const processLiquidation = () => {
    setShowWarningModal(false);
    setShowLiquidationModal(false);
    setIsProcessing(true);
    
    setTimeout(() => {
      setIsProcessing(false);
      setProcessingMessage(\`Your liquidation request for \${selectedApp?.id} is being processed. Funds will be credited to your linked account within 24-48 hours.\`);
      setTimeout(() => setProcessingMessage(null), 8000);
    }, 2000);
  };
`;
    // Insert after "const [showModal, setShowModal] = useState(false);"
    content = content.replace('const [showModal, setShowModal] = useState(false);', 'const [showModal, setShowModal] = useState(false);\n' + statesToAdd);
}

// 2. Replace the completedApps.map(...) inner card item
// First, find the card container start up to the Details button

// Let's replace the whole completedApps.map section from LMS-Customer
// Since Nolt-Admin uses 'item.data?.isOnBehalf', we must inject that back into the LMS-Customer card layout.

content = content.replace(/className="bg-slate-900 dark:bg-slate-950 text-white rounded-\[2\.5rem\] p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden"/g, 
  "className={`bg-slate-900 dark:bg-slate-950 text-white rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl relative transition-all duration-300 ${openDropdownId === item.id ? 'z-50 ring-2 ring-primary/20' : 'z-10'}`}"
);

// We need to replace the flex gap-3 relative block
const buttonBlockStart = '<div className="flex flex-col sm:flex-row gap-3 relative z-10">';
const buttonBlockEnd = '</div>\n            </div>\n          ))\n        )}';

const newButtonBlock = `              <div className="relative z-30">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                  }}
                  className={\`flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl \${openDropdownId === item.id ? 'bg-white text-primary shadow-white/10' : 'bg-primary text-white shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5'}\`}
                >
                  Actions
                  <span className={\`material-symbols-outlined text-sm transition-transform duration-300 \${openDropdownId === item.id ? 'rotate-180' : ''}\`}>expand_more</span>
                </button>

                {openDropdownId === item.id && (
                  <div 
                    className="absolute right-0 mt-4 w-72 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-700 py-4 animate-in fade-in slide-in-from-top-4 duration-300 z-[100] opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Dropdown Arrow */}
                    <div className="absolute -top-2 right-8 size-4 bg-white dark:bg-slate-800 rotate-45 border-l border-t border-slate-100 dark:border-slate-700"></div>

                    <div className="px-6 py-2 mb-2 border-b border-slate-50 dark:border-slate-700/50 relative z-10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Application Management</p>
                    </div>
                    <div className="relative z-10">
                      {item.type.toLowerCase().includes('investment') && (
                        <>
                          {item.status !== 'PENDING_PAYMENT' && (
                          <button 
                            onClick={() => {
                              setOpenDropdownId(null);
                              navigate('INVESTMENT_FLOW', { id: \`T-\${Math.floor(Math.random() * 9000) + 1000}\`, type: 'INVESTMENT', subStep: 0, label: item.type, data: { isTopUp: true, selectedPlan: item.type.includes('Vault') ? 'VAULT' : item.type.includes('Surge') ? 'SURGE' : 'RISE' }, updatedAt: Date.now() });
                            }}
                            className="w-full flex items-center gap-4 px-6 py-4 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-500 transition-all uppercase tracking-widest group"
                          >
                            <div className="size-8 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                              <span className="material-symbols-outlined text-lg">add_circle</span>
                            </div>
                            Top-Up
                          </button>
                          )}
                          <button 
                            onClick={() => {
                              setOpenDropdownId(null);
                              handleLiquidate(item);
                            }}
                            className="w-full flex items-center gap-4 px-6 py-4 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-red-500/10 hover:text-red-500 transition-all uppercase tracking-widest group"
                          >
                            <div className="size-8 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
                              <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                            </div>
                            Liquidate
                          </button>
                        </>
                      )}

                      {item.status === 'PENDING_PAYMENT' && !uploadedReceipts[item.id] && (
                        <button 
                          onClick={() => {
                            setOpenDropdownId(null);
                            handleUploadReceipt(item.id);
                          }}
                          disabled={uploadingReceiptId === item.id}
                          className="w-full flex items-center gap-4 px-6 py-4 text-xs font-black text-primary hover:bg-primary/10 transition-all uppercase tracking-widest disabled:opacity-50 group"
                        >
                          <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-lg">payments</span>
                          </div>
                          {uploadingReceiptId === item.id ? 'Verifying...' : 'Complete Payment'}
                        </button>
                      )}
                      {uploadedReceipts[item.id] && (
                        <div className="w-full flex items-center gap-4 px-6 py-4 text-xs font-black text-green-500 bg-green-500/5 transition-all uppercase tracking-widest disabled:opacity-50 group">
                          <div className="size-8 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                          </div>
                          Receipt Uploaded
                        </div>
                      )}

                      <button 
                        onClick={() => {
                          setOpenDropdownId(null);
                          handleShowDetails(item);
                        }}
                        className="w-full flex items-center gap-4 px-6 py-4 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-all uppercase tracking-widest group"
                      >
                        <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                          <span className="material-symbols-outlined text-lg">verified</span>
                        </div>
                        Details
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}`;

const startIndex = content.indexOf(buttonBlockStart);
if (startIndex !== -1) {
    const endIndex = content.indexOf('</div>\n            </div>\n          ))\n        )}', startIndex) + '</div>\n            </div>\n          ))\n        )}'.length;
    // Replace the block
    content = content.substring(0, startIndex) + newButtonBlock + content.substring(endIndex);
}

// 3. Modals Injection
const modalsCode = `
      {processingMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] w-full max-w-md px-6 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl border border-white/10 flex items-start gap-4">
            <div className="size-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined filled">check_circle</span>
            </div>
            <div className="space-y-1">
              <p className="font-black uppercase tracking-tight text-sm">Request Processing</p>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">{processingMessage}</p>
            </div>
            <button onClick={() => setProcessingMessage(null)} className="text-slate-500 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-sm bg-slate-900/20">
          <div className="bg-white dark:bg-slate-800 p-12 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in duration-300">
            <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Processing Request...</p>
          </div>
        </div>
      )}

      {/* Liquidation Form Modal */}
      {showLiquidationModal && selectedApp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-md">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setShowLiquidationModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-lg rounded-[3rem] shadow-2xl p-8 md:p-12 animate-in zoom-in duration-500 border border-white/20 dark:border-slate-700">
            <div className="text-center space-y-4 mb-10">
              <div className="size-20 rounded-[2rem] bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-4xl filled">account_balance_wallet</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Liquidate Investment</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Available Balance: <span className="text-slate-900 dark:text-white font-black">{formatMoney(selectedApp.amount)}</span></p>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setLiquidationType('FULL')}
                  className={\`p-6 rounded-3xl border-2 transition-all text-left space-y-2 \${liquidationType === 'FULL' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'}\`}
                >
                  <div className={\`size-6 rounded-full border-2 flex items-center justify-center \${liquidationType === 'FULL' ? 'border-primary' : 'border-slate-300'}\`}>
                    {liquidationType === 'FULL' && <div className="size-3 bg-primary rounded-full"></div>}
                  </div>
                  <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Full Amount</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatMoney(selectedApp.amount)}</p>
                </button>
                <button 
                  onClick={() => setLiquidationType('CUSTOM')}
                  className={\`p-6 rounded-3xl border-2 transition-all text-left space-y-2 \${liquidationType === 'CUSTOM' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'}\`}
                >
                  <div className={\`size-6 rounded-full border-2 flex items-center justify-center \${liquidationType === 'CUSTOM' ? 'border-primary' : 'border-slate-300'}\`}>
                    {liquidationType === 'CUSTOM' && <div className="size-3 bg-primary rounded-full"></div>}
                  </div>
                  <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Custom Amount</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Specify Value</p>
                </button>
              </div>

              {liquidationType === 'CUSTOM' && (
                <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Enter Amount</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                    <input 
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 pl-10 pr-6 font-black text-xl text-slate-900 dark:text-white focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowLiquidationModal(false)}
                  className="flex-1 py-5 rounded-full font-black text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-xs"
                >
                  Cancel
                </button>
                <button 
                  onClick={validateLiquidation}
                  className="flex-[2] py-5 bg-red-500 text-white font-black rounded-full shadow-xl shadow-red-500/20 hover:-translate-y-1 transition-all uppercase tracking-widest text-xs active:scale-95"
                >
                  Confirm Liquidation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal for Early Liquidation */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-md">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setShowWarningModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-md rounded-[3rem] shadow-2xl p-8 md:p-12 animate-in zoom-in duration-500 border border-red-100 dark:border-red-900/30">
            <div className="text-center space-y-6">
              <div className="size-20 rounded-[2rem] bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto animate-bounce">
                <span className="material-symbols-outlined text-4xl filled">warning</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Early Liquidation Warning</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Your investment has not reached its maturity date. 
                  Liquidating now will attract a <span className="text-red-500 font-black">10% early termination fee</span> on the principal amount.
                </p>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 text-left">
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-400 uppercase tracking-widest">Estimated Fine</span>
                  <span className="text-red-500">{formatMoney((liquidationType === 'FULL' ? (selectedApp?.amount || 0) : parseFloat(customAmount || '0')) * 0.1)}</span>
                </div>
                <div className="flex justify-between text-xs font-black">
                  <span className="text-slate-900 dark:text-white uppercase tracking-widest">Net Payout</span>
                  <span className="text-emerald-500">{formatMoney((liquidationType === 'FULL' ? (selectedApp?.amount || 0) : parseFloat(customAmount || '0')) * 0.9)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={processLiquidation}
                  className="w-full py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black rounded-full shadow-xl hover:-translate-y-1 transition-all uppercase tracking-widest text-xs active:scale-95"
                >
                  I Consent, Proceed
                </button>
                <button 
                  onClick={() => setShowWarningModal(false)}
                  className="w-full py-5 rounded-full font-black text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-xs"
                >
                  Wait for Maturity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
`;

if (!content.includes('Liquidation Form Modal')) {
    content = content.replace('{/* Agreement Modal */}', modalsCode + '\n      {/* Agreement Modal */}');
}

fs.writeFileSync(path, content);
console.log('Patched Successfully!');
