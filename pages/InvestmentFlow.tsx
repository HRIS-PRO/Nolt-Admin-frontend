import React, { useState, useMemo, useRef } from 'react';
import { AppStep, SavedDraft } from '../types';
import { storageService } from '../services/storageService';

interface InvestmentFlowProps {
  navigate: (step: AppStep) => void;
  onComplete: () => void;
  formatMoney: (amount: number) => string;
  initialDraft?: SavedDraft | null;
}

const InvestmentFlow: React.FC<InvestmentFlowProps> = ({ navigate, onComplete, formatMoney, initialDraft }) => {
  const [subStep, setSubStep] = useState(initialDraft?.subStep ?? 0);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [draftId] = useState(initialDraft?.id ?? `I-${Math.floor(Math.random() * 9000) + 1000}`);
  const [selectedPlan, setSelectedPlan] = useState<'RISE' | 'VAULT'>(initialDraft?.data?.selectedPlan ?? 'RISE');
  
  // Signature & Acceptance State
  const [hasSigned, setHasSigned] = useState(initialDraft?.data?.hasSigned ?? false);
  const [acceptedIndemnity, setAcceptedIndemnity] = useState(initialDraft?.data?.acceptedIndemnity ?? false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Form Fields
  const [amount, setAmount] = useState<string>(initialDraft?.data?.amount ?? '10000');
  const [targetAmount, setTargetAmount] = useState<string>(initialDraft?.data?.targetAmount ?? '');
  const [tenure, setTenure] = useState<number>(initialDraft?.data?.tenure ?? 12); 
  const [rollover, setRollover] = useState(initialDraft?.data?.rollover ?? 'principal_interest');
  const [title, setTitle] = useState(initialDraft?.data?.title ?? 'Mr');
  const [fullName, setFullName] = useState(initialDraft?.data?.fullName ?? '');
  const [isOnBehalf, setIsOnBehalf] = useState<boolean>(initialDraft?.data?.isOnBehalf ?? false);
  const [representativeRelation, setRepresentativeRelation] = useState(initialDraft?.data?.representativeRelation ?? '');
  const [isPep, setIsPep] = useState<boolean | null>(initialDraft?.data?.isPep ?? null);
  const [gender, setGender] = useState<string>(initialDraft?.data?.gender ?? '');
  const [dob, setDob] = useState(initialDraft?.data?.dob ?? '');
  const [maidenName, setMaidenName] = useState(initialDraft?.data?.maidenName ?? '');
  const [maritalStatus, setMaritalStatus] = useState(initialDraft?.data?.maritalStatus ?? 'Single');
  const [religion, setReligion] = useState(initialDraft?.data?.religion ?? 'Prefer not to say');
  const [countryCode, setCountryCode] = useState(initialDraft?.data?.countryCode ?? '+234');
  const [mobileNumber, setMobileNumber] = useState(initialDraft?.data?.mobileNumber ?? '');
  const [contactEmail, setContactEmail] = useState(initialDraft?.data?.contactEmail ?? '');
  const [bvn, setBvn] = useState(initialDraft?.data?.bvn ?? '');
  const [nin, setNin] = useState(initialDraft?.data?.nin ?? '');
  const [stateOfOrigin, setStateOfOrigin] = useState(initialDraft?.data?.stateOfOrigin ?? '');
  const [stateOfResidence, setStateOfResidence] = useState(initialDraft?.data?.stateOfResidence ?? '');
  const [homeAddress, setHomeAddress] = useState(initialDraft?.data?.homeAddress ?? '');
  const [nokName, setNokName] = useState(initialDraft?.data?.nokName ?? '');
  const [nokRelationship, setNokRelationship] = useState(initialDraft?.data?.nokRelationship ?? '');
  const [nokAddress, setNokAddress] = useState(initialDraft?.data?.nokAddress ?? '');
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { name: string, size: string } | null>>(
    initialDraft?.data?.uploadedDocs ?? { 
        gov_id: null,
        proof_res: null,
        bank_statement: null,
        selfie: null
    }
  );
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [receiptProgress, setReceiptProgress] = useState(0);
  const [receiptFile, setReceiptFile] = useState<{ name: string; size: string } | null>(null);

  const interestRate = selectedPlan === 'RISE' ? 12.5 : 18.0;

  const returns = useMemo(() => {
    const principal = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
    const interestEarned = (principal * interestRate * (tenure / 12)) / 100;
    return { principal, interestEarned, total: principal + interestEarned };
  }, [amount, tenure, interestRate, selectedPlan]);

  const handlePlanSelect = (plan: 'RISE' | 'VAULT') => {
    setSelectedPlan(plan);
    setSubStep(1); 
  };

  const handleNext = () => {
    if (subStep < 11) {
      setSubStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      storageService.deleteDraft(draftId);
      onComplete();
    }
  };

  const handleBack = () => {
    if (subStep > 0) {
      setSubStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('PRODUCT_SELECT');
    }
  };

  const handleSaveAndExit = () => {
    setIsSaving(true);
    const draft: SavedDraft = {
      id: draftId,
      type: 'INVESTMENT',
      updatedAt: Date.now(),
      subStep,
      label: `NOLT ${selectedPlan}`,
      data: {
        selectedPlan, amount, targetAmount, tenure, rollover, title, fullName, isOnBehalf, representativeRelation, isPep, gender, dob, 
        maidenName, maritalStatus, religion, countryCode, mobileNumber, contactEmail, bvn, nin, 
        stateOfOrigin, stateOfResidence, homeAddress, nokName, nokRelationship, nokAddress, uploadedDocs,
        hasSigned, acceptedIndemnity, receiptFile
      }
    };
    storageService.saveDraft(draft);
    setTimeout(() => { setIsSaving(false); navigate('DASHBOARD'); }, 800);
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#028FF5';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const simulateUpload = (id: string) => {
    if (uploadedDocs[id]) return; 
    setUploadProgress(prev => ({ ...prev, [id]: 1 }));
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        setUploadProgress(prev => ({ ...prev, [id]: 100 }));
        setUploadedDocs(prev => ({ 
          ...prev, 
          [id]: { name: `${id}_document_${Math.floor(Math.random() * 1000)}.pdf`, size: `${(Math.random() * 2 + 0.5).toFixed(1)} MB` } 
        }));
        clearInterval(interval);
      } else {
        setUploadProgress(prev => ({ ...prev, [id]: progress }));
      }
    }, 300);
  };

  const simulateReceiptUpload = () => {
    if (receiptFile) return;
    setReceiptProgress(1);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25;
      if (progress >= 100) {
        progress = 100;
        setReceiptProgress(100);
        setReceiptFile({ name: `Transfer_Receipt_${Date.now()}.png`, size: '1.4 MB' });
        clearInterval(interval);
      } else {
        setReceiptProgress(progress);
      }
    }, 200);
  };

  const removeDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedDocs(prev => ({ ...prev, [id]: null }));
    setUploadProgress(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const NavActions = ({ nextLabel = "Continue", onNext = handleNext, isNextDisabled = false }: { nextLabel?: string, onNext?: () => void, isNextDisabled?: boolean }) => (
    <div className="pt-8 flex flex-wrap items-center justify-between border-t border-slate-100 dark:border-slate-700 gap-4 mt-8">
      <div className="flex gap-2">
        <button onClick={handleBack} className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-900 rounded-full transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">arrow_back</span> Back
        </button>
        <button onClick={handleSaveAndExit} disabled={isSaving} className="px-6 py-4 text-primary font-bold hover:bg-primary/5 rounded-full transition-all flex items-center gap-2">
          {isSaving ? <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> : <span className="material-symbols-outlined text-lg">save_as</span>}
          {isSaving ? 'Saving...' : 'Save & Exit'}
        </button>
      </div>
      <button onClick={onNext} disabled={isNextDisabled || loading} className={`px-12 py-4 bg-primary text-white font-black text-lg rounded-full shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all flex items-center gap-2 ${isNextDisabled || loading ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>
        {loading ? 'Processing...' : nextLabel}
        {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
      </button>
    </div>
  );

  const getStepLabel = () => {
    const steps = ['Plan', 'Identity', 'Personal', 'Further', 'Contact', 'Verification', 'Address', 'NOK', 'Docs', 'Config', 'Signature', 'Payment'];
    return steps[subStep] || 'Processing';
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 relative">
      <div className="flex flex-col gap-3 mb-12 animate-in fade-in duration-700">
        <div className="flex gap-6 justify-between items-end">
          <p className="text-slate-900 dark:text-white text-base font-black uppercase tracking-widest">Step {subStep + 1} of 12</p>
          <p className="text-primary text-sm font-bold uppercase tracking-wider">{getStepLabel()} {Math.round(((subStep + 1) / 12) * 100)}% Completed</p>
        </div>
        <div className="rounded-full bg-slate-200 dark:bg-slate-800 h-2.5 w-full overflow-hidden shadow-inner">
          <div className="h-full rounded-full bg-primary transition-all duration-700 ease-out shadow-[0_0_10px_rgba(2,143,245,0.5)]" style={{ width: `${((subStep + 1) / 12) * 100}%` }}></div>
        </div>
      </div>

      {/* Step 0: Plan Selection */}
      {subStep === 0 && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Grow Your Wealth</h1>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div onClick={() => handlePlanSelect('RISE')} className={`p-10 rounded-[2.5rem] border-2 transition-all cursor-pointer ${selectedPlan === 'RISE' ? 'border-primary bg-white dark:bg-slate-800' : 'border-slate-100 dark:border-slate-800 bg-white/50'}`}>
                <h3 className="text-2xl font-black mb-4 uppercase">NOLT Rise</h3>
                <p className="text-slate-500 font-medium leading-relaxed">High growth fund for the active investor. Flexible contributions with strong returns.</p>
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center"><span className="text-3xl font-black text-primary">12.5% p.a.</span></div>
              </div>
              <div onClick={() => handlePlanSelect('VAULT')} className={`p-10 rounded-[2.5rem] border-2 transition-all cursor-pointer ${selectedPlan === 'VAULT' ? 'border-primary bg-white dark:bg-slate-800' : 'border-slate-100 dark:border-slate-800 bg-white/50'}`}>
                <h3 className="text-2xl font-black mb-4 uppercase">NOLT Vault</h3>
                <p className="text-slate-500 font-medium leading-relaxed">The ultimate safe haven for your capital. Locked-in rates with guaranteed security.</p>
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center"><span className="text-3xl font-black text-primary">18.0% p.a.</span></div>
              </div>
           </div>
        </div>
      )}

      {/* Step 1: Identity Basics */}
      {subStep === 1 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black dark:text-white">Identity Basics</h2>
            <div className="grid gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 gap-4">
                  <div className="space-y-1">
                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Applying for someone else?</p>
                    <p className="text-xs text-slate-500 font-bold">Enable this if you are filling this form as a representative.</p>
                  </div>
                  <button 
                    onClick={() => setIsOnBehalf(!isOnBehalf)}
                    className={`relative w-16 h-8 rounded-full transition-all duration-300 ${isOnBehalf ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 size-6 bg-white rounded-full transition-all duration-300 shadow-md ${isOnBehalf ? 'left-9' : 'left-1'}`}></div>
                  </button>
                </div>

                {isOnBehalf && (
                  <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
                      <label className="text-sm font-black text-slate-500 uppercase">Your Relationship to Applicant</label>
                      <select className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={representativeRelation} onChange={e => setRepresentativeRelation(e.target.value)}>
                          <option value="">Select Relationship</option>
                          <option value="Parent">Parent</option>
                          <option value="Guardian">Guardian</option>
                          <option value="Power of Attorney">Power of Attorney</option>
                          <option value="Corporate Representative">Corporate Representative</option>
                          <option value="Other">Other</option>
                      </select>
                  </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase">{isOnBehalf ? 'Applicant Full Name' : 'Your Full Name'}</label>
                    <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Alex Morgan" />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase">Title</label>
                    <div className="flex gap-2">
                        {['Mr', 'Mrs', 'Ms', 'Dr'].map(t => (
                            <button key={t} onClick={() => setTitle(t)} className={`px-6 py-3 rounded-xl border-2 font-bold transition-all ${title === t ? 'bg-primary border-primary text-white' : 'border-slate-100 dark:border-slate-700 dark:text-white hover:border-primary/50'}`}>{t}</button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase">Are you a Politically Exposed Person (PEP)?</label>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setIsPep(true)} 
                            className={`flex-1 h-14 rounded-xl border-2 font-black transition-all ${isPep === true ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'border-slate-100 dark:border-slate-700 dark:text-white'}`}
                        >
                            Yes
                        </button>
                        <button 
                            onClick={() => setIsPep(false)} 
                            className={`flex-1 h-14 rounded-xl border-2 font-black transition-all ${isPep === false ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'border-slate-100 dark:border-slate-700 dark:text-white'}`}
                        >
                            No
                        </button>
                    </div>
                </div>
            </div>
            <NavActions isNextDisabled={!fullName || isPep === null || (isOnBehalf && !representativeRelation)} />
        </div>
      )}

      {/* Step 2: Personal Details */}
      {subStep === 2 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black dark:text-white">Personal Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase">Gender</label>
                    <select className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={gender} onChange={e => setGender(e.target.value)}>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase">Date of Birth</label>
                    <input type="date" className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={dob} onChange={e => setDob(e.target.value)} />
                </div>
            </div>
            <NavActions isNextDisabled={!gender || !dob} />
        </div>
      )}

      {/* Step 3: Further Details */}
      {subStep === 3 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black dark:text-white">Further Details</h2>
            <div className="grid gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase">Mother's Maiden Name</label>
                    <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={maidenName} onChange={e => setMaidenName(e.target.value)} placeholder="Security Question" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-black text-slate-500 uppercase">Religion</label>
                        <select className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={religion} onChange={e => setReligion(e.target.value)}>
                            <option value="Prefer not to say">Prefer not to say</option>
                            <option value="Christianity">Christianity</option>
                            <option value="Islam">Islam</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-black text-slate-500 uppercase">Marital Status</label>
                        <select className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)}>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                        </select>
                    </div>
                </div>
            </div>
            <NavActions isNextDisabled={!maidenName} />
        </div>
      )}

      {/* Step 4: Contact Info */}
      {subStep === 4 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black dark:text-white">Contact Information</h2>
            <div className="grid gap-6">
                <div className="flex gap-4">
                    <div className="w-32 space-y-2">
                        <label className="text-sm font-black text-slate-500 uppercase">Code</label>
                        <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-4 text-lg font-bold dark:text-white focus:border-primary outline-none" value={countryCode} onChange={e => setCountryCode(e.target.value)} />
                    </div>
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-black text-slate-500 uppercase">Mobile Number</label>
                        <input type="tel" className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase">Email Address</label>
                    <input type="email" className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                </div>
            </div>
            <NavActions isNextDisabled={!mobileNumber || !contactEmail} />
        </div>
      )}

      {/* Step 5: Verification */}
      {subStep === 5 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black dark:text-white">Verification</h2>
            <div className="grid gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase">BVN (Bank Verification Number)</label>
                    <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={bvn} onChange={e => setBvn(e.target.value)} maxLength={11} placeholder="11 digits" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase">NIN (National Identity Number)</label>
                    <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={nin} onChange={e => setNin(e.target.value)} maxLength={11} placeholder="11 digits" />
                </div>
            </div>
            <NavActions isNextDisabled={bvn.length < 11 || nin.length < 11} />
        </div>
      )}

      {/* Step 6: Address Details */}
      {subStep === 6 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black dark:text-white">Address Details</h2>
            <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-black text-slate-500 uppercase">State of Origin</label>
                        <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={stateOfOrigin} onChange={e => setStateOfOrigin(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-black text-slate-500 uppercase">State of Residence</label>
                        <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={stateOfResidence} onChange={e => setStateOfResidence(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase">Residential Address</label>
                    <textarea rows={3} className="w-full p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-lg font-bold dark:text-white focus:border-primary outline-none" value={homeAddress} onChange={e => setHomeAddress(e.target.value)} />
                </div>
            </div>
            <NavActions isNextDisabled={!homeAddress || !stateOfResidence} />
        </div>
      )}

      {/* Step 7: Next of Kin */}
      {subStep === 7 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black dark:text-white">Next of Kin</h2>
            <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-black text-slate-500 uppercase">Full Name</label>
                        <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={nokName} onChange={e => setNokName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-black text-slate-500 uppercase">Relationship</label>
                        <select className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={nokRelationship} onChange={e => setNokRelationship(e.target.value)}>
                            <option value="">Select Relation</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Parent">Parent</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase">Contact Address</label>
                    <textarea rows={2} className="w-full p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-lg font-bold dark:text-white focus:border-primary outline-none" value={nokAddress} onChange={e => setNokAddress(e.target.value)} />
                </div>
            </div>
            <NavActions isNextDisabled={!nokName || !nokRelationship} />
        </div>
      )}

      {/* Step 8: Secure Vault */}
      {subStep === 8 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black dark:text-white">Secure Vault</h2>
            <p className="text-slate-500 font-medium">Please upload necessary identity and financial documents.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                    { id: 'gov_id', label: 'Government ID', icon: 'badge', required: true },
                    { id: 'proof_res', label: 'Proof of Residence', icon: 'home_pin', required: true },
                    { id: 'bank_statement', label: '3-Month Bank Statements', icon: 'account_balance', required: true },
                    { id: 'selfie', label: 'Selfie-upload (Optional)', icon: 'add_a_photo', required: false }
                ].map(doc => (
                    <div key={doc.id} onClick={() => simulateUpload(doc.id)} className={`relative group p-8 rounded-[2rem] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center gap-4 text-center ${uploadedDocs[doc.id] ? 'border-green-500 bg-green-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-primary'}`}>
                        {uploadedDocs[doc.id] ? (
                            <div className="size-14 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/20"><span className="material-symbols-outlined text-3xl">task_alt</span></div>
                        ) : (
                            <div className="size-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-center"><span className="material-symbols-outlined text-3xl">{doc.icon}</span></div>
                        )}
                        <div>
                            <h4 className="font-bold dark:text-white uppercase tracking-tight">{doc.label}</h4>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{doc.required ? 'Required' : 'Optional'}</p>
                        </div>
                        {uploadProgress[doc.id] > 0 && uploadProgress[doc.id] < 100 && (
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress[doc.id]}%` }}></div></div>
                        )}
                        {uploadedDocs[doc.id] && (
                            <button onClick={(e) => removeDoc(doc.id, e)} className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-all"><span className="material-symbols-outlined text-lg">cancel</span></button>
                        )}
                    </div>
                ))}
            </div>
            <NavActions isNextDisabled={!uploadedDocs.gov_id || !uploadedDocs.proof_res || !uploadedDocs.bank_statement} />
        </div>
      )}

      {/* Step 9: Investment Configuration */}
      {subStep === 9 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Investment Configuration</h1>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-7 flex flex-col gap-10">
                    <div className="space-y-4">
                        <label className="text-sm font-black text-slate-500 uppercase tracking-widest">Investment Amount</label>
                        <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">$</span>
                            <input className="w-full h-20 pl-14 pr-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-3xl font-black text-slate-900 dark:text-white focus:border-primary outline-none transition-all" value={amount} onChange={e => setAmount(e.target.value)} />
                        </div>
                    </div>
                    {selectedPlan === 'RISE' && (
                        <div className="space-y-4">
                            <label className="text-sm font-black text-slate-500 uppercase tracking-widest">Target Amount (Optional)</label>
                            <input className="w-full h-16 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-xl font-bold dark:text-white focus:border-primary outline-none" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="What's your goal?" />
                        </div>
                    )}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center"><label className="text-sm font-black text-slate-500 uppercase tracking-widest">Tenure (Months)</label><span className="bg-primary text-white font-black px-6 py-2 rounded-full text-sm">{tenure} Mo.</span></div>
                        <input type="range" min="6" max="48" step="6" value={tenure} onChange={e => setTenure(parseInt(e.target.value))} className="w-full h-3 bg-slate-100 dark:bg-slate-900 rounded-full appearance-none cursor-pointer accent-primary" />
                    </div>
                    <div className="space-y-4">
                        <label className="text-sm font-black text-slate-500 uppercase tracking-widest">Rollover Instruction</label>
                        <select className="w-full h-16 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-xl font-bold dark:text-white focus:border-primary outline-none" value={rollover} onChange={e => setRollover(e.target.value)}>
                            <option value="principal_interest">Rollover Principal & Interest</option>
                            <option value="principal_only">Rollover Principal Only</option>
                            <option value="none">Payout at Maturity</option>
                        </select>
                    </div>
                    <NavActions />
                </div>
                <div className="lg:col-span-5">
                    <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 size-48 bg-primary/20 rounded-full blur-3xl -mr-24 -mt-24"></div>
                        <h3 className="text-xl font-black uppercase tracking-widest">Returns Estimate</h3>
                        <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Expected Maturity Value</p>
                            <span className="text-5xl font-black text-primary">{formatMoney(returns.total)}</span>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-white/10">
                            <div className="flex justify-between text-sm font-bold"><span className="text-slate-500 uppercase">Interest Rate</span><span className="text-primary">{interestRate}% p.a.</span></div>
                            <div className="flex justify-between text-sm font-bold"><span className="text-slate-500 uppercase">Total Interest</span><span>{formatMoney(returns.interestEarned)}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Step 10: Signature */}
      {subStep === 10 && (
        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500 pb-24">
          <div className="flex flex-col gap-2">
            <h1 className="text-slate-900 dark:text-white text-3xl md:text-5xl font-black leading-tight tracking-tight">
              Indemnity & Signature
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
              Please review the indemnity agreement carefully and sign below to proceed.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 h-full">
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col h-[600px] lg:h-auto">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">description</span>
                  Indemnity Agreement
                </h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-xs font-black uppercase tracking-widest rounded-full hover:bg-primary hover:text-white transition-all">
                  <span className="material-symbols-outlined text-sm">download</span>
                  Download PDF
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                <div className="prose dark:prose-invert max-w-none space-y-6">
                  <h4 className="text-lg font-bold uppercase text-slate-900 dark:text-white">1. Indemnity</h4>
                  <p>I/We hereby agree to indemnify and hold harmless NOLT Finance from any and all claims, damages, liabilities, and expenses arising out of this investment.</p>
                  <h4 className="text-lg font-bold uppercase text-slate-900 dark:text-white mt-8">2. Electronic Consent</h4>
                  <p>By signing this document electronically, I/we acknowledge that my electronic signature is the legal equivalent of my manual signature on this Agreement.</p>
                  <h4 className="text-lg font-bold uppercase text-slate-900 dark:text-white mt-8">3. Risk Acknowledgement</h4>
                  <p>I acknowledge that all financial products carry a level of risk and I have read and understood the terms and conditions associated with the NOLT {selectedPlan} plan.</p>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-[420px] flex flex-col gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 p-8 flex flex-col gap-8 sticky top-32">
                <div>
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1">Sign Here</h3>
                  <p className="text-xs text-slate-500 uppercase font-black tracking-widest">Draw your signature in the box below</p>
                </div>
                <div className="relative group">
                  <canvas ref={canvasRef} width={400} height={200} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="w-full h-48 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary transition-colors cursor-crosshair" />
                  {!hasSigned && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20"><span className="text-slate-400 font-display text-2xl font-black uppercase tracking-widest">Digital Sign</span></div>}
                  <button onClick={clearSignature} className="absolute top-4 right-4 text-[10px] font-black uppercase text-red-500 hover:text-red-600 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm transition-all">Clear</button>
                </div>
                <div className="flex items-start gap-4 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 group cursor-pointer" onClick={() => setAcceptedIndemnity(!acceptedIndemnity)}>
                    <input className="peer size-6 appearance-none rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 cursor-pointer transition-all" type="checkbox" checked={acceptedIndemnity} onChange={(e) => setAcceptedIndemnity(e.target.checked)} />
                  <label className="text-sm font-bold text-slate-600 dark:text-slate-400 cursor-pointer select-none leading-snug">I accept the terms of the Indemnity Agreement and confirm that the digital signature above is mine.</label>
                </div>
              </div>
            </div>
          </div>
          <NavActions nextLabel="Next Step" isNextDisabled={!hasSigned || !acceptedIndemnity} />
        </div>
      )}

      {/* Step 11: Final Step - Transfer Notice & Receipt Upload */}
      {subStep === 11 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-md">
          <div className="absolute inset-0 bg-slate-900/80" onClick={handleBack}></div>
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-[560px] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-500 border border-white/20 dark:border-slate-700">
            <div className="pt-10 pb-8 px-8 md:px-12 flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-30 scale-150"></div>
                <div className="relative size-24 bg-primary/10 rounded-full flex items-center justify-center text-primary shadow-inner">
                  <span className="material-symbols-outlined text-[48px] filled">account_balance</span>
                </div>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Final Step!</h2>
              <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mb-8">Transfer <span className="text-primary font-black">{formatMoney(parseFloat(amount))}</span> to activate your plan:</p>
              
              <div className="w-full bg-slate-50 dark:bg-slate-900 p-8 rounded-[2rem] border-2 border-primary/20 shadow-sm mb-8 group cursor-copy active:scale-[0.98] transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                   <span className="material-symbols-outlined text-primary">content_copy</span>
                </div>
                <p className="text-primary font-black text-3xl tracking-tight leading-snug">0123456789</p>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-2">NOLT Finance • Access Bank</p>
              </div>

              {/* Receipt Upload Area */}
              <div className="w-full mb-8">
                <button 
                  onClick={simulateReceiptUpload}
                  disabled={receiptProgress > 0 && receiptProgress < 100}
                  className={`w-full group p-6 rounded-3xl border-2 border-dashed transition-all flex items-center justify-center gap-4 ${receiptFile ? 'bg-green-500/10 border-green-500' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:border-primary'}`}
                >
                  {receiptFile ? (
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-green-500 text-white flex items-center justify-center"><span className="material-symbols-outlined">check</span></div>
                      <div className="text-left">
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Receipt Uploaded!</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{receiptFile.name}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                       <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-3xl">cloud_upload</span>
                       <span className="text-sm font-black text-slate-500 group-hover:text-primary transition-colors uppercase tracking-widest">Upload Transfer Receipt</span>
                    </div>
                  )}
                </button>
                {receiptProgress > 0 && receiptProgress < 100 && (
                  <div className="mt-4 w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${receiptProgress}%` }}></div>
                  </div>
                )}
              </div>
              
              <div className="w-full flex flex-col gap-4">
                <button 
                  onClick={onComplete} 
                  className="w-full bg-primary text-white font-black text-xl py-5 rounded-[1.5rem] shadow-xl shadow-primary/30 transition-all flex items-center justify-center gap-3 active:scale-95 hover:-translate-y-1"
                >
                  {receiptFile ? 'Confirm & Finish' : "I've sent the funds"}
                  <span className="material-symbols-outlined">task_alt</span>
                </button>
                
                <button 
                  onClick={onComplete}
                  className="w-full py-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-black uppercase tracking-widest transition-colors"
                >
                  Skip and add receipt later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentFlow;