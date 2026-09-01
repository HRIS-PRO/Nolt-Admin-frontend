import React, { useState } from 'react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  currency: 'NGN' | 'USD';
  onPayOnline: () => void;
  onUploadReceipt: (file: File) => Promise<string>;
  onBankTransferComplete: (receiptUrl: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  currency,
  onPayOnline,
  onUploadReceipt,
  onBankTransferComplete,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'ONLINE' | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptProgress, setReceiptProgress] = useState(0);

  if (!isOpen) return null;

  const formatMoney = (val: number, cur: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: cur === 'NGN' ? 'NGN' : 'USD',
      minimumFractionDigits: 0
    }).format(val);
  };

  const handleFileChange = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setReceiptFile(file);
    setReceiptProgress(30);
    
    try {
      const url = await onUploadReceipt(file);
      setReceiptUrl(url);
      setReceiptProgress(100);
    } catch (err) {
      setReceiptFile(null);
      setReceiptProgress(0);
    }
  };

  const simulateReceiptUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf';
    input.onchange = handleFileChange;
    input.click();
  };

  const handleBack = () => {
    setPaymentMethod(null);
    setReceiptFile(null);
    setReceiptUrl(null);
    setReceiptProgress(0);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative bg-white dark:bg-slate-800 w-full max-w-[560px] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 border border-white/20 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button removed to ensure completion */}

        {!paymentMethod ? (
          <div className="pt-8 md:pt-10 pb-10 md:pb-12 px-6 md:px-12 flex flex-col items-center">
            <div className="text-center mb-8 md:mb-10">
              <div className="size-16 md:size-20 bg-primary/10 rounded-2xl md:rounded-3xl flex items-center justify-center text-primary mx-auto mb-4 md:mb-6 transform -rotate-6 hover:rotate-0 transition-all shadow-inner">
                <span className="material-symbols-outlined text-3xl md:text-4xl filled">payments</span>
              </div>
              <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white mb-2 md:mb-3 tracking-tight">Payment Options</h2>
              <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                Select how you'd like to fund the investment of <span className="text-primary font-black">{formatMoney(amount, currency)}</span>
              </p>
            </div>
 
            <div className="grid gap-3 md:gap-4 w-full">
              <button 
                onClick={() => setPaymentMethod('TRANSFER')}
                className="group relative flex items-center gap-4 md:gap-6 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-700 hover:border-primary hover:bg-primary/5 transition-all text-left active:scale-[0.98]"
              >
                <div className="size-12 md:size-16 rounded-xl md:rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors shrink-0">
                  <span className="material-symbols-outlined text-2xl md:text-3xl">account_balance</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-lg md:text-xl text-slate-900 dark:text-white uppercase tracking-tight truncate">Bank Transfer</h4>
                  <p className="text-[10px] md:text-xs text-slate-500 font-bold mt-0.5 md:mt-1 uppercase tracking-widest truncate">24-48hrs Confirmation</p>
                </div>
                <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
              </button>
 
              <button 
                onClick={() => {
                  setPaymentMethod('ONLINE');
                  onPayOnline();
                }}
                className="group relative flex items-center gap-4 md:gap-6 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-700 hover:border-primary hover:bg-primary/5 transition-all text-left active:scale-[0.98]"
              >
                <div className="size-12 md:size-16 rounded-xl md:rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors shrink-0">
                  <span className="material-symbols-outlined text-2xl md:text-3xl">language</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-lg md:text-xl text-slate-900 dark:text-white uppercase tracking-tight truncate">Pay Online</h4>
                  <p className="text-[10px] md:text-xs text-primary font-bold mt-0.5 md:mt-1 uppercase tracking-widest truncate">Instant Confirmation</p>
                </div>
                <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
              </button>
            </div>
          </div>
        ) : paymentMethod === 'TRANSFER' ? (
          <div className="pt-8 md:pt-10 pb-8 px-6 md:px-12 flex flex-col items-center text-center relative">
            
            <button 
              onClick={handleBack}
              className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1 text-[10px] md:text-xs font-black uppercase tracking-widest"
            >
              <span className="material-symbols-outlined max-w-none text-base">arrow_back</span>
              Back
            </button>
 
            <div className="relative mb-4 md:mb-6 mt-6 md:mt-8">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-30 scale-125 md:scale-150"></div>
              <div className="relative size-16 md:size-24 bg-primary/10 rounded-full flex items-center justify-center text-primary shadow-inner">
                <span className="material-symbols-outlined text-3xl md:text-[48px] filled">account_balance</span>
              </div>
            </div>
            
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Final Step!</h2>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed mb-6 md:mb-8">
              Transfer <span className="text-primary font-black">{formatMoney(amount, currency)}</span> to activate the plan:
            </p>
            
            <div 
              className="w-full bg-slate-50 dark:bg-slate-900 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-2 border-primary/20 shadow-sm mb-6 md:mb-8 group cursor-copy active:scale-[0.98] transition-all relative overflow-hidden"
              onClick={() => {
                navigator.clipboard.writeText('5401329231');
              }}
            >
              <div className="absolute top-0 right-0 p-3 md:p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-primary text-sm">content_copy</span>
              </div>
              <p className="text-primary font-black text-2xl md:text-3xl tracking-tight leading-snug">5401329231</p>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 md:mt-2">Providus Bank</p>
            </div>
 
            {/* Receipt Upload Area */}
            <div className="w-full mb-6 md:mb-8">
              <button 
                onClick={simulateReceiptUpload}
                disabled={receiptProgress > 0 && receiptProgress < 100}
                className={`w-full group p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 border-dashed transition-all flex items-center justify-center gap-3 md:gap-4 ${receiptUrl ? 'bg-green-500/10 border-green-500' : 'bg-primary/5 border-primary/30 hover:border-primary hover:bg-primary/10 shadow-sm'}`}
              >
                {receiptUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="size-8 md:size-10 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-sm md:text-base">check</span>
                    </div>
                    <div className="text-left overflow-hidden">
                      <p className="text-xs md:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Receipt Uploaded!</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest truncate">{receiptFile?.name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 md:gap-2">
                      <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform text-2xl md:text-3xl">cloud_upload</span>
                      <span className="text-[10px] md:text-sm font-black text-primary uppercase tracking-widest">
                        {receiptProgress > 0 ? 'Uploading...' : 'Upload Receipt'}
                      </span>
                  </div>
                )}
              </button>
              {receiptProgress > 0 && receiptProgress < 100 && (
                <div className="mt-4 w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden relative">
                  <div className="h-full bg-primary transition-all duration-300 absolute left-0 top-0" style={{ width: `${receiptProgress}%` }}></div>
                </div>
              )}
            </div>
            
            <div className="w-full flex flex-col gap-3 md:gap-4">
              <button 
                onClick={() => receiptUrl && onBankTransferComplete(receiptUrl)}
                disabled={!receiptUrl || (receiptProgress > 0 && receiptProgress < 100)}
                className={`w-full text-white font-black text-lg md:text-xl py-4 md:py-5 rounded-[1.2rem] md:rounded-[1.5rem] shadow-xl transition-all flex items-center justify-center gap-2 md:gap-3 active:scale-95 hover:-translate-y-1 bg-primary shadow-primary/30 ${(!receiptUrl || (receiptProgress > 0 && receiptProgress < 100)) ? 'opacity-50 grayscale cursor-not-allowed hover:translate-y-0 active:scale-100' : ''}`}
              >
                  {receiptUrl ? 'Confirm & Finish' : "I've sent the funds"}
                  <span className="material-symbols-outlined text-lg md:text-xl">task_alt</span>
              </button>
              <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] py-2 md:py-4">
                Confirmation takes within 24-48hrs
              </p>
            </div>
          </div>
        ) : (
          <div className="pt-10 pb-12 px-8 flex flex-col items-center text-center relative">
              <button 
                onClick={handleBack}
                className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1 text-sm font-black uppercase tracking-widest"
              >
                <span className="material-symbols-outlined max-w-none text-lg">arrow_back</span>
                Back
              </button>

             <div className="size-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-8 mt-6">
                <span className="material-symbols-outlined text-[48px] filled">language</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Online Payment Initiated</h2>
              <p className="text-slate-500 mb-6">Please complete the payment securely in the popup window.</p>
          </div>
        )}
      </div>
    </div>
  );
};
