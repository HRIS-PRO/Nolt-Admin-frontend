import React, { useState, useMemo, useRef } from 'react';
import { AppStep, SavedDraft } from '../types';
import { storageService } from '../services/storageService';
import { investmentService } from '../services/investmentService';

interface InvestmentFlowProps {
  navigate: (step: AppStep) => void;
  onComplete: () => void;
  formatMoney: (amount: number) => string;
  initialDraft?: SavedDraft | null;
}

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

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
  const [currency, setCurrency] = useState<'NGN' | 'USD'>(initialDraft?.data?.currency ?? 'NGN');
  const [tenure, setTenure] = useState<number>(initialDraft?.data?.tenure ?? 12);
  const [fullName, setFullName] = useState(initialDraft?.data?.fullName ?? '');
  const [accountType, setAccountType] = useState<'INDIVIDUAL' | 'CORPORATE'>('INDIVIDUAL');
  const [mobileNumber, setMobileNumber] = useState(initialDraft?.data?.mobileNumber ?? '');
  const [bvn, setBvn] = useState(initialDraft?.data?.bvn ?? '');
  const [nin, setNin] = useState(initialDraft?.data?.nin ?? '');
  const [stateOfOrigin, setStateOfOrigin] = useState(initialDraft?.data?.stateOfOrigin ?? '');
  const [stateOfResidence, setStateOfResidence] = useState(initialDraft?.data?.stateOfResidence ?? '');
  const [houseNumber, setHouseNumber] = useState(initialDraft?.data?.houseNumber ?? '');
  const [homeAddress, setHomeAddress] = useState(initialDraft?.data?.homeAddress ?? '');

  // Corporate Fields
  const [companyName, setCompanyName] = useState(initialDraft?.data?.companyName ?? '');
  const [companyAddress, setCompanyAddress] = useState(initialDraft?.data?.companyAddress ?? '');
  const [dateOfIncorporation, setDateOfIncorporation] = useState(initialDraft?.data?.dateOfIncorporation ?? '');
  const [directorsArePep, setDirectorsArePep] = useState<boolean | null>(initialDraft?.data?.directorsArePep ?? null);

  // Bank Details (for Payout) - REMOVED as per schema alignment


  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { name: string, size: string, url?: string } | null>>(
    initialDraft?.data?.uploadedDocs ?? {
      gov_id: null,
      proof_res: null,
      bank_statement: null,
      cac_cert: null,
      memart: null,
      board_res: null,
      director_1_id: null,
      director_2_id: null,
      annual_returns: null,
      aml_cft: null,
      rep_id: null,
      selfie: null
    }
  );
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [receiptProgress, setReceiptProgress] = useState(0);
  const [receiptFile, setReceiptFile] = useState<{ name: string; size: string, url: string } | null>(null);

  const isCorporate = accountType === 'CORPORATE';

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

  const handleNext = async () => {

    const maxSteps = 7; // Index 7 is Payment

    if (subStep < maxSteps) {
      let nextStep = subStep + 1;

      // Skip Step 2 (Representative) if Individual
      // Step 0: Plan
      // Step 1: Personal (Ind) OR Company (Corp)
      // Step 2: Rep (Corp Only) -> Skip if Ind
      // Step 3: Address
      if (nextStep === 2 && !isCorporate) {
        nextStep = 3;
      }

      setSubStep(nextStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Submission
      setLoading(true);
      try {
        const payload = {
          investment_type: selectedPlan === 'RISE' ? 'NOLT_RISE' : 'NOLT_VAULT',
          investment_amount: parseFloat(amount.replace(/[^0-9.]/g, '')),
          tenure_days: tenure * 30,
          currency,

          // Corporate Fields
          company_name: isCorporate ? companyName : null,
          company_address: isCorporate ? companyAddress : null, // Home address is for Rep/Ind
          date_of_incorporation: isCorporate ? dateOfIncorporation : null,
          directors_are_pep: isCorporate ? (directorsArePep || false) : false,

          // Representative / Individual Bio-Data
          rep_full_name: fullName,
          rep_phone_number: mobileNumber,
          rep_bvn: bvn,
          rep_nin: nin,
          rep_state_of_origin: stateOfOrigin,
          rep_state_of_residence: stateOfResidence,
          rep_house_number: houseNumber,
          rep_street_address: homeAddress,

          // Shared
          signatures: [canvasRef.current?.toDataURL() || ""],
          payment_receipt_url: receiptFile?.url || "",

          documents: {
            certificate_of_incorporation: uploadedDocs.cac_cert?.url || "",
            memart: uploadedDocs.memart?.url || "",
            board_resolution: uploadedDocs.board_res?.url || "",
            valid_id: uploadedDocs.rep_id?.url || "",
            director_1_id_url: uploadedDocs.director_1_id?.url || "",
            director_2_id_url: uploadedDocs.director_2_id?.url || "",
            annual_returns_url: uploadedDocs.annual_returns?.url || "",
            aml_cft_url: uploadedDocs.aml_cft?.url || "",
            rep_selfie_url: uploadedDocs.selfie?.url || "",
            rep_id_url: uploadedDocs.rep_id?.url || ""
          },

          cac_url: uploadedDocs.cac_cert?.url || "",
          director_1_id_url: uploadedDocs.director_1_id?.url || "",
          director_2_id_url: uploadedDocs.director_2_id?.url || "",
          rep_selfie_url: uploadedDocs.selfie?.url || "",
          rep_id_url: uploadedDocs.rep_id?.url || "",
          memart_url: uploadedDocs.memart?.url || "",
          annual_returns_url: uploadedDocs.annual_returns?.url || "",
          board_resolution_url: uploadedDocs.board_res?.url || "",
          aml_cft_url: uploadedDocs.aml_cft?.url || ""
        };

        const response = await investmentService.createInvestment(payload);
        console.log("Investment Created:", response);

        storageService.deleteDraft(draftId);
        onComplete();
        navigate('DASHBOARD');
      } catch (error) {
        console.error("Submission failed:", error);
        alert("Failed to submit application. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (subStep > 0) {
      setSubStep(prev => {
        // Skip Step 2 if Individual (Back from 3 -> 1)
        if (prev === 3 && !isCorporate) return 1;
        return prev - 1;
      });
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
        selectedPlan, amount, currency, tenure, fullName, accountType, mobileNumber, bvn, nin,
        stateOfOrigin, stateOfResidence, houseNumber, homeAddress, uploadedDocs,
        hasSigned, acceptedIndemnity, receiptFile,
        companyName, companyAddress, dateOfIncorporation, directorsArePep
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

  const simulateUpload = async (id: string, file: File) => {
    if (uploadedDocs[id] || !file) return;
    setUploadProgress(prev => ({ ...prev, [id]: 10 }));

    try {
      setUploadProgress(prev => ({ ...prev, [id]: 50 }));
      const result = await investmentService.uploadDocument(file, draftId, id);

      setUploadProgress(prev => ({ ...prev, [id]: 100 }));
      setUploadedDocs(prev => ({
        ...prev,
        [id]: { name: file.name, size: `${(file.size / 1024 / 1024).toFixed(2)} MB`, url: result.document?.file_url }
      }));
    } catch (error) {
      console.error("Upload failed", error);
      setUploadProgress(prev => ({ ...prev, [id]: 0 }));
      alert("Upload failed, please try again.");
    }
  };

  const handleReceiptUpload = async (file: File) => {
    if (receiptFile || !file) return;
    setReceiptProgress(10);
    try {
      setReceiptProgress(50);
      const result = await investmentService.uploadDocument(file, draftId, 'payment_receipt');
      setReceiptProgress(100);
      setReceiptFile({
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        url: result.document?.file_url
      });
    } catch (error) {
      console.error("Receipt upload failed", error);
      setReceiptProgress(0);
      alert("Receipt upload failed. Please try again.");
    }
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
    // Corporate Flow: Plan -> Company -> Bio -> Address -> Invest -> Docs -> Sign -> Pay
    // Individual Flow: Plan -> Bio -> Address -> Invest -> Docs -> Sign -> Pay
    const corpSteps = ['Plan', 'Company Info', 'Representative', 'Address', 'Investment', 'Documents', 'Signature', 'Payment'];
    const indSteps = ['Plan', 'Bio-Data', 'Address', 'Investment', 'Documents', 'Signature', 'Payment'];

    return isCorporate ? (corpSteps[subStep] || 'Processing') : (indSteps[subStep] || 'Processing');
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 relative">
      <div className="flex flex-col gap-3 mb-12 animate-in fade-in duration-700">
        <div className="flex gap-6 justify-between items-end">
          <p className="text-slate-900 dark:text-white text-base font-black uppercase tracking-widest">Step {subStep + 1} of {isCorporate ? 8 : 7}</p>
          <p className="text-primary text-sm font-bold uppercase tracking-wider">{getStepLabel()} {Math.round(((subStep + 1) / (isCorporate ? 8 : 7)) * 100)}% Completed</p>
        </div>
        <div className="rounded-full bg-slate-200 dark:bg-slate-800 h-2.5 w-full overflow-hidden shadow-inner">
          <div className="h-full rounded-full bg-primary transition-all duration-700 ease-out shadow-[0_0_10px_rgba(2,143,245,0.5)]" style={{ width: `${((subStep + 1) / (isCorporate ? 8 : 7)) * 100}%` }}></div>
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
      {/* Step 1: Corporate (Company) OR Individual (Bio) */}
      {subStep === 1 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-black dark:text-white">{isCorporate ? 'Company Details' : 'Personal Details'}</h2>
            {/* Account Type Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button onClick={() => setAccountType('INDIVIDUAL')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${accountType === 'INDIVIDUAL' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}>Individual</button>
              <button onClick={() => setAccountType('CORPORATE')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${accountType === 'CORPORATE' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}>Corporate</button>
            </div>
          </div>

          {isCorporate ? (
            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase">Company Name</label>
                <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Corp Ltd" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase">Company Address</label>
                <textarea className="w-full p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-lg font-bold dark:text-white focus:border-primary outline-none" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase">Date of Incorporation</label>
                <input type="date" className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={dateOfIncorporation} onChange={e => setDateOfIncorporation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase">Are any of the Company’s Directors a PEP?</label>
                <div className="flex gap-4">
                  <button onClick={() => setDirectorsArePep(true)} className={`flex-1 h-14 rounded-xl border-2 font-black transition-all ${directorsArePep === true ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'border-slate-100 dark:border-slate-700 dark:text-white'}`}>Yes</button>
                  <button onClick={() => setDirectorsArePep(false)} className={`flex-1 h-14 rounded-xl border-2 font-black transition-all ${directorsArePep === false ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'border-slate-100 dark:border-slate-700 dark:text-white'}`}>No</button>
                </div>
              </div>
              <NavActions isNextDisabled={!companyName || !companyAddress || !dateOfIncorporation || directorsArePep === null} />
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase">Your Full Name</label>
                <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Alex Morgan" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase">Mobile Number</label>
                <input type="tel" className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={mobileNumber} onChange={e => setMobileNumber(e.target.value.replace(/\D/g, ''))} maxLength={11} placeholder="080..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">BVN</label>
                  <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={bvn} onChange={e => setBvn(e.target.value.replace(/\D/g, ''))} maxLength={11} placeholder="11 digits" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">NIN</label>
                  <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={nin} onChange={e => setNin(e.target.value.replace(/\D/g, ''))} maxLength={11} placeholder="11 digits" />
                </div>
              </div>
              <NavActions isNextDisabled={!fullName || !mobileNumber || bvn.length < 11 || nin.length < 11} />
            </div>
          )}
        </div>
      )}

      {/* Step 2: Representative Bio-Data (Corporate Only) */}
      {subStep === 2 && isCorporate && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <h2 className="text-3xl font-black dark:text-white">Representative Details</h2>
          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-500 uppercase">Rep Full Name</label>
              <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-500 uppercase">Rep Mobile Number</label>
              <input type="tel" className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={mobileNumber} onChange={e => setMobileNumber(e.target.value.replace(/\D/g, ''))} maxLength={11} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase">Rep BVN</label>
                <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={bvn} onChange={e => setBvn(e.target.value.replace(/\D/g, ''))} maxLength={11} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase">Rep NIN</label>
                <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={nin} onChange={e => setNin(e.target.value.replace(/\D/g, ''))} maxLength={11} />
              </div>
            </div>
          </div>
          <NavActions isNextDisabled={!fullName || !mobileNumber || bvn.length < 11 || nin.length < 11} />
        </div>
      )}



      {/* Ensure skipped steps are not rendered */}


      {/* Step 3: Address */}
      {subStep === 3 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <h2 className="text-3xl font-black dark:text-white">Address Details</h2>
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase">State of Origin</label>
                <select className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={stateOfOrigin} onChange={e => setStateOfOrigin(e.target.value)}>
                  <option value="">Select State</option>
                  {NIGERIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase">State of Residence</label>
                <select className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={stateOfResidence} onChange={e => setStateOfResidence(e.target.value)}>
                  <option value="">Select State</option>
                  {NIGERIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-500 uppercase">House Number</label>
              <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={houseNumber} onChange={e => setHouseNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-500 uppercase">Street Address</label>
              <textarea className="w-full p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-lg font-bold dark:text-white focus:border-primary outline-none" value={homeAddress} onChange={e => setHomeAddress(e.target.value)} />
            </div>
          </div>
          <NavActions isNextDisabled={!stateOfOrigin || !stateOfResidence || !houseNumber || !homeAddress} />
        </div>
      )}

      {/* Step 5: Secure Vault (Uploads) */}
      {
        subStep === 5 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black dark:text-white">Secure Vault</h2>
            <p className="text-slate-500 font-medium">Please upload necessary identity and financial documents.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                ...(isCorporate ? [
                  { id: 'cac_cert', label: '1. Certificate of Incorporation (CAC)', icon: 'verified', required: true },
                  { id: 'director_1_id', label: '2. 1st Director’s Govt ID', icon: 'badge', required: true },
                  { id: 'director_2_id', label: '3. 2nd Director’s Govt ID', icon: 'badge', required: true },
                  { id: 'selfie', label: '4. Applicant’s Selfie', icon: 'account_circle', required: true },
                  { id: 'rep_id', label: '5. Applicant’s ID', icon: 'badge', required: true },
                  { id: 'memart', label: '6. MEMART', icon: 'gavel', required: true },
                  { id: 'annual_returns', label: '7. Annual Returns', icon: 'receipt_long', required: true },
                  { id: 'board_res', label: '8. Board Resolution', icon: 'history_edu', required: true },
                  { id: 'aml_cft', label: '9. AML/CFT Doc', icon: 'security', required: true }
                ] : [
                  { id: 'rep_id', label: 'Government ID', icon: 'badge', required: true },
                  { id: 'selfie', label: 'Selfie', icon: 'account_circle', required: true }
                ])
              ].map(doc => (
                <div key={doc.id} onClick={() => document.getElementById(`file-${doc.id}`)?.click()} className={`relative group p-8 rounded-[2rem] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center gap-4 text-center ${uploadedDocs[doc.id] ? 'border-green-500 bg-green-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-primary'}`}>
                  <input
                    type="file"
                    id={`file-${doc.id}`}
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) simulateUpload(doc.id, file);
                    }}
                  />
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
            <NavActions isNextDisabled={isCorporate ? (!uploadedDocs.cac_cert || !uploadedDocs.memart || !uploadedDocs.board_res || !uploadedDocs.director_1_id || !uploadedDocs.director_2_id || !uploadedDocs.selfie || !uploadedDocs.rep_id || !uploadedDocs.annual_returns || !uploadedDocs.aml_cft) : (!uploadedDocs.rep_id || !uploadedDocs.selfie)} />
          </div>
        )
      }

      {/* Step 4: Investment Configuration */}
      {
        subStep === 4 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Investment Configuration</h1>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-7 flex flex-col gap-10">
                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-widest">Investment Amount</label>
                  <div className="relative flex gap-4">
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value as 'NGN' | 'USD')}
                      className="h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent px-6 font-black text-xl outline-none focus:border-primary"
                    >
                      <option value="NGN">NGN</option>
                      <option value="USD">USD</option>
                    </select>
                    <div className="relative flex-1">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">{currency === 'NGN' ? '₦' : '$'}</span>
                      <input className="w-full h-20 pl-14 pr-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-3xl font-black text-slate-900 dark:text-white focus:border-primary outline-none transition-all" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center"><label className="text-sm font-black text-slate-500 uppercase tracking-widest">Tenure (Months)</label><span className="bg-primary text-white font-black px-6 py-2 rounded-full text-sm">{tenure} Mo.</span></div>
                  <input type="range" min="6" max="48" step="6" value={tenure} onChange={e => setTenure(parseInt(e.target.value))} className="w-full h-3 bg-slate-100 dark:bg-slate-900 rounded-full appearance-none cursor-pointer accent-primary" />
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
        )
      }

      {/* Step 6: Signature */}
      {
        subStep === 6 && (
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
        )
      }

      {/* Step 7: Payment */}
      {
        subStep === 7 && (
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
                  <p className="text-primary font-black text-3xl tracking-tight leading-snug">5401329231</p>
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-2">{selectedPlan === 'RISE' ? 'NOLT RISE FUND' : 'NOLT VAULT FUND'} • Providus Bank • NOLT Finance Company Limited</p>
                </div>

                {/* Receipt Upload Area */}
                <div className="w-full mb-8">
                  <div className={`w-full group p-6 rounded-3xl border-2 border-dashed transition-all flex items-center justify-center gap-4 ${receiptFile ? 'bg-green-500/10 border-green-500' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:border-primary'}`}>
                    <input
                      type="file"
                      id="receipt-upload"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleReceiptUpload(file);
                      }}
                    />
                    <div className="w-full h-full flex items-center justify-center cursor-pointer" onClick={() => document.getElementById('receipt-upload')?.click()}>
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
                    </div>
                  </div>
                  {receiptProgress > 0 && receiptProgress < 100 && (
                    <div className="mt-4 w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${receiptProgress}%` }}></div>
                    </div>
                  )}
                </div>

                <div className="w-full flex flex-col gap-4">
                  <button
                    onClick={handleNext}
                    disabled={!receiptFile}
                    className={`w-full bg-primary text-white font-black text-xl py-5 rounded-[1.5rem] shadow-xl shadow-primary/30 transition-all flex items-center justify-center gap-3 active:scale-95 hover:-translate-y-1 ${!receiptFile ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                  >
                    {receiptFile ? 'Confirm & Finish' : "Upload Receipt to Finish"}
                    <span className="material-symbols-outlined">task_alt</span>
                  </button>

                  <button
                    onClick={handleNext}
                    className="w-full py-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-black uppercase tracking-widest transition-colors"
                  >
                    Skip and add receipt later
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default InvestmentFlow;