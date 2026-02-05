import React, { useState, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import { AppStep, SavedDraft } from '../types';
import { getFinancialAdvice } from '../services/geminiService';
import { storageService } from '../services/storageService';
import SuccessScreen from './SuccessScreen';

interface LoanFlowProps {
  initialStep: 'TYPE' | 'IDENTITY';
  onComplete: () => void;
  navigate: (step: AppStep) => void;
  formatMoney: (amount: number) => string;
  initialDraft?: SavedDraft | null;
}

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone: string) => /^\+?[0-9]{10,15}$/.test(phone.replace(/[^0-9+]/g, ''));
const isValidBVN = (bvn: string) => /^[0-9]{11}$/.test(bvn);
const isValidNIN = (nin: string) => /^[0-9]{11}$/.test(nin);

const LoanFlow: React.FC<LoanFlowProps> = ({ initialStep, onComplete, navigate, formatMoney, initialDraft }) => {
  const [subStep, setSubStep] = useState(initialDraft?.subStep ?? (initialStep === 'TYPE' ? 0 : 1));
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form State
  const [draftId] = useState(initialDraft?.id ?? `L-${Math.floor(Math.random() * 9000) + 1000}`);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(initialDraft?.data?.selectedLoanId ?? null);

  // Signature & Acceptance State
  const [hasSigned, setHasSigned] = useState(initialDraft?.data?.hasSigned ?? false);
  const [acceptedIndemnity, setAcceptedIndemnity] = useState(initialDraft?.data?.acceptedIndemnity ?? false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Form Fields
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
  const [countryCode, setCountryCode] = useState(initialDraft?.data?.countryCode ?? '+1');
  const [mobileNumber, setMobileNumber] = useState(initialDraft?.data?.mobileNumber ?? '');
  const [contactEmail, setContactEmail] = useState(initialDraft?.data?.contactEmail ?? '');
  const [bvn, setBvn] = useState(initialDraft?.data?.bvn ?? '');
  const [nin, setNin] = useState(initialDraft?.data?.nin ?? '');
  const [stateOfOrigin, setStateOfOrigin] = useState(initialDraft?.data?.stateOfOrigin ?? '');
  const [stateOfResidence, setStateOfResidence] = useState(initialDraft?.data?.stateOfResidence ?? '');
  const [homeAddress, setHomeAddress] = useState(initialDraft?.data?.homeAddress ?? '');
  const [residentialStatus, setResidentialStatus] = useState(initialDraft?.data?.residentialStatus ?? 'Rent');
  const [dependents, setDependents] = useState(initialDraft?.data?.dependents ?? 0);
  const [hasActiveLoans, setHasActiveLoans] = useState(initialDraft?.data?.hasActiveLoans ?? 'no');
  const [monthlyIncome, setMonthlyIncome] = useState(initialDraft?.data?.monthlyIncome ?? '5000');
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { name: string, size: string } | null>>(
    initialDraft?.data?.uploadedDocs ?? {
      national_id: null,
      bank_statement: null,
      proof_address: null,
      selfie: null
    }
  );
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [references, setReferences] = useState(
    initialDraft?.data?.references ?? [
      { name: '', phone: '', relationship: '' },
      { name: '', phone: '', relationship: '' },
      { name: '', phone: '', relationship: '' },
    ]
  );
  const [desiredAmount, setDesiredAmount] = useState(initialDraft?.data?.desiredAmount ?? '25000');
  const [repaymentPeriod, setRepaymentPeriod] = useState(initialDraft?.data?.repaymentPeriod ?? 24);

  // New Fields
  const [mda, setMda] = useState(initialDraft?.data?.mda ?? '');
  const [customMda, setCustomMda] = useState(initialDraft?.data?.customMda ?? '');
  const [ippisNumber, setIppisNumber] = useState(initialDraft?.data?.ippisNumber ?? '');
  const [staffId, setStaffId] = useState(initialDraft?.data?.staffId ?? '');
  const [referralCode, setReferralCode] = useState(initialDraft?.data?.referralCode ?? '');

  const categories = [
    // {
    //   title: 'Business',
    //   loans: [
    //     { id: 'working_capital', label: 'Working Capital', icon: 'storefront', description: 'Expand your business operations with growth capital.' },
    //     { id: 'asset_finance', label: 'Asset Financing', icon: 'inventory_2', description: 'Finance equipment, machinery, or company vehicles.' },
    //     { id: 'lpo_financing', label: 'LPO/Invoice Financing', icon: 'receipt_long', description: 'Get capital against outstanding invoices or purchase orders.' },
    //   ]
    // },
    {
      title: 'Employees',
      loans: [
        // { id: 'salary_advance', label: 'Salary Advance', icon: 'payments', description: 'Access a portion of your earned wages before payday.' },
        // { id: 'automobile_loan', label: 'Automobile Loan', icon: 'directions_car', description: 'Purchase a new or used vehicle for personal or business use.' },
        { id: 'public_sector', label: 'Public Sector Loan (IPPIS)', icon: 'account_balance', description: 'Loans for federal government employees on IPPIS platform.' },
      ]
    },
    // {
    //   title: 'Niche',
    //   loans: [
    //     { id: 'travel_loan', label: 'Travel Loan', icon: 'flight_takeoff', description: 'Finance your travel plans, vacations, or business trips.' },
    //     { id: 'annuitant_loan', label: 'Annuitant Loan', icon: 'elderly', description: 'Special financing options designed for retirees.' },
    //   ]
    // }
  ];

  const currentLoanLabel = categories.flatMap(c => c.loans).find(l => l.id === selectedLoanId)?.label || 'Personal Loan';

  const handleNext = async () => {
    console.log("Saving draft...");
    console.log(subStep)
    if (subStep < 12) {
      setSubStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (subStep === 12) {
      setLoading(true);
      await submitLoan();
      setLoading(false);
    }
  };

  const submitLoan = async () => {
    try {
      const canvas = canvasRef.current;
      const signatureUrl = canvas ? canvas.toDataURL() : '';

      const payload = {
        applying_for_others: isOnBehalf,
        relationship_to_applicant: isOnBehalf ? representativeRelation : null,
        applicant_full_name: fullName,
        title,
        is_politically_exposed: isPep,
        gender,
        date_of_birth: dob,
        religion,
        marital_status: maritalStatus,
        mothers_maiden_name: maidenName,
        mobile_number: mobileNumber,
        personal_email: contactEmail,
        bvn,
        nin,
        state_of_origin: stateOfOrigin,
        state_of_residence: stateOfResidence,
        primary_home_address: homeAddress,
        residential_status: residentialStatus,
        number_of_dependents: dependents,
        has_active_loans: hasActiveLoans === 'yes',
        average_monthly_income: parseFloat(monthlyIncome.replace(/[^0-9.]/g, '')) || 0,

        // Docs (Using real URLs from Supabase)
        govt_id_url: uploadedDocs.national_id?.url || null,
        statement_of_account_url: uploadedDocs.bank_statement?.url || null,
        proof_of_residence_url: uploadedDocs.proof_address?.url || null,
        selfie_verification_url: uploadedDocs.selfie?.url || null,

        references: references
          .filter(r => r.name && r.phone) // Only include valid references
          .map(r => ({
            fullName: r.name,
            phoneNumber: r.phone,
            relationship: r.relationship
          })),

        requested_loan_amount: parseFloat(desiredAmount.replace(/[^0-9.]/g, '')) || 0,
        loan_tenure_months: repaymentPeriod,
        signatures: [signatureUrl], // Array format

        mda_tertiary: mda === 'Other' ? customMda : mda,
        ippis_number: ippisNumber,
        staff_id: staffId,
        referral_code: referralCode
      };

      console.log("Submitting Loan Payload:", payload);

      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      await axios.post(`${backendUrl}/api/loans`, payload, { withCredentials: true });

      storageService.deleteDraft(draftId);
      setIsSuccess(true);
      // onComplete();
    } catch (error) {
      console.error("Error submitting loan:", error);
      alert("Failed to submit loan application. Please try again.");
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

  const handleSelectLoanType = (id: string) => {
    setSelectedLoanId(id);
    setSubStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveDraft = () => {
    setIsSaving(true);
    console.log("Saving draft...");
    const draft: SavedDraft = {
      id: draftId,
      type: 'LOAN',
      updatedAt: Date.now(),
      subStep,
      label: currentLoanLabel,
      data: {
        selectedLoanId, title, fullName, isOnBehalf, representativeRelation, isPep, gender, dob, maidenName, maritalStatus, religion,
        countryCode, mobileNumber, contactEmail, bvn, nin, stateOfOrigin, stateOfResidence,
        homeAddress, residentialStatus, dependents, hasActiveLoans, monthlyIncome, uploadedDocs,
        references, desiredAmount, repaymentPeriod, hasSigned, acceptedIndemnity,
        mda, customMda, ippisNumber, staffId, referralCode
      }
    };
    storageService.saveDraft(draft);
    return draft;
  };

  const handleSaveAndExit = () => {
    saveDraft();
    navigate('DASHBOARD');
  };

  useEffect(() => {
    if (subStep > 0 && (subStep % 2 === 0)) {
      saveDraft();
    }
  }, [subStep]);

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

  const uploadFile = async (id: string, file: File) => {
    // Optimistic UI Update
    setUploadProgress(prev => ({ ...prev, [id]: 10 }));

    // Determine document_type
    const docTypes: Record<string, string> = {
      'national_id': 'govt_id',
      'bank_statement': 'bank_statement',
      'proof_address': 'proof_of_residence',
      'selfie': 'selfie_verification'
    };

    const formData = new FormData();
    formData.append('file', file);
    formData.append('loan_id', draftId); // Using draftId as temporary loan_id or strictly the text
    formData.append('document_type', docTypes[id] || 'other');

    try {
      setUploadProgress(prev => ({ ...prev, [id]: 30 }));
      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      const response = await axios.post(`${backendUrl}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          setUploadProgress(prev => ({ ...prev, [id]: percentCompleted }));
        }
      });

      setUploadedDocs(prev => ({
        ...prev,
        [id]: {
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          url: response.data.document.file_url
        }
      }));

    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed. Please try again.");
      setUploadProgress(prev => { const next = { ...prev }; delete next[id]; return next; });
    }
  };

  const handleFileSelect = (id: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) uploadFile(id, file);
    };
    input.click();
  };

  const removeDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedDocs(prev => ({ ...prev, [id]: null }));
    setUploadProgress(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const updateRef = (index: number, field: string, value: string) => {
    const newRefs = [...references];
    newRefs[index] = { ...newRefs[index], [field]: value };
    setReferences(newRefs);
  };

  const calculation = useMemo(() => {
    const principal = parseFloat(desiredAmount.replace(/[^0-9.]/g, '')) || 0;
    const rate = 5.2;
    const monthlyRate = rate / 100 / 12;
    const months = repaymentPeriod;
    if (principal === 0) return { monthly: 0, totalInterest: 0, total: 0, rate };
    const monthly = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    const total = monthly * months;
    const totalInterest = total - principal;
    return { monthly, totalInterest, total, rate };
  }, [desiredAmount, repaymentPeriod]);

  const NavActions = ({ nextLabel = "Continue", onNext = handleNext, isNextDisabled = false }: { nextLabel?: string, onNext?: () => void, isNextDisabled?: boolean }) => (
    <div className="pt-8 flex flex-wrap items-center justify-between border-t border-slate-100 dark:border-slate-700 gap-4 mt-8">
      {subStep > 0 ? (
        <button onClick={handleBack} className="px-8 py-4 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-bold flex items-center gap-2">
          <span className="material-symbols-outlined">arrow_back</span>
          Back
        </button>
      ) : (
        <button onClick={() => navigate('PRODUCT_SELECT')} className="px-8 py-4 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-bold flex items-center gap-2">
          Cancel
        </button>
      )}

      <div className="flex items-center gap-4">
        {subStep > 0 && (
          <button onClick={handleSaveAndExit} className="px-6 py-4 rounded-full text-primary hover:bg-primary/5 transition-all font-black text-sm uppercase tracking-widest hidden md:block">
            Save & Exit
          </button>
        )}
        <button onClick={onNext} disabled={isNextDisabled || loading} className={`px-12 py-4 bg-primary text-white font-black text-lg rounded-full shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all flex items-center gap-2 ${isNextDisabled || loading ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>
          {loading ? 'Processing...' : nextLabel}
          {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
        </button>
      </div>
    </div>
  );

  if (isSuccess) {
    return (
      <SuccessScreen
        onDashboard={() => {
          onComplete();
          navigate('DASHBOARD');
        }}
        loan={{
          type: currentLoanLabel,
          amount: parseFloat(desiredAmount.replace(/[^0-9.]/g, '')) || 0,
          term: repaymentPeriod,
          interestRate: calculation.rate,
          monthlyPayment: calculation.monthly,
          status: 'SUBMITTED'
        }}
        formatMoney={formatMoney}
        productType="LOAN"
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 md:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Sidebar Progress */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-32">
          <div className="flex flex-col gap-8 p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Application</p>
              <h3 className="text-2xl font-black dark:text-white leading-tight">{currentLoanLabel}</h3>
            </div>
            <nav className="relative pl-4 flex flex-col gap-8 border-l-2 border-slate-100 dark:border-slate-700">
              {['Identity', 'Financials', 'References', 'Review', 'Agreement'].map((lbl, idx) => {
                const sRange = [1, 6, 10, 11, 12][idx];
                const isActive = subStep >= sRange;
                return (
                  <div key={lbl} className="relative pl-8">
                    <div className={`absolute -left-[9px] top-1 size-4 rounded-full shadow-[0_0_0_4px_white] dark:shadow-[0_0_0_4px_#1e293b] transition-colors ${isActive ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'}`}></div>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-black uppercase tracking-wide ${subStep === sRange ? 'text-primary' : 'text-slate-400'}`}>{lbl}</p>
                      {subStep > sRange && <span className="material-symbols-outlined text-primary text-sm filled">check_circle</span>}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="lg:col-span-8 flex flex-col gap-10">
          <div className="lg:hidden flex flex-col gap-3">
            <div className="flex justify-between items-end">
              <p className="text-slate-900 dark:text-white text-base font-black uppercase">Step {subStep + 1} of 13</p>
              <p className="text-primary text-sm font-bold">{Math.round(((subStep + 1) / 13) * 100)}% Completed</p>
            </div>
            <div className="rounded-full bg-slate-200 dark:bg-slate-800 h-2 w-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out" style={{ width: `${((subStep + 1) / 13) * 100}%` }}></div>
            </div>
          </div>

          {/* Step 0: Type */}
          {subStep === 0 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center md:text-left">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Which loan fits you?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                {categories.flatMap(c => c.loans).map(loan => (
                  <button key={loan.id} onClick={() => handleSelectLoanType(loan.id)} className="group p-6 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl transition-all text-left flex flex-col gap-4 shadow-sm hover:border-primary active:scale-[0.98]">
                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all"><span className="material-symbols-outlined text-2xl">{loan.icon}</span></div>
                    <div><h4 className="font-bold text-lg dark:text-white leading-tight mb-2">{loan.label}</h4><p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{loan.description}</p></div>
                  </button>
                ))}
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
                  <label className="text-sm font-black text-slate-500 uppercase">{isOnBehalf ? 'Applicant Full Name' : 'Your Full Legal Name'}</label>
                  <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none transition-all" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter full name" />
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
                  <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={maidenName} onChange={e => setMaidenName(e.target.value)} placeholder="Used for security verification" />
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
                    <input type="tel" className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={mobileNumber} onChange={e => setMobileNumber(e.target.value.replace(/[^0-9]/g, ''))} placeholder="08000000000" maxLength={11} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Personal Email Address</label>
                  <input type="email" className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="name@example.com" />
                </div>
              </div>
              <NavActions isNextDisabled={!isValidPhone(mobileNumber) || !isValidEmail(contactEmail)} />
            </div>
          )}

          {/* Step 5: Verification */}
          {subStep === 5 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-3xl font-black dark:text-white">Verification</h2>
              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Bank Verification Number (BVN)</label>
                  <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={bvn} onChange={e => setBvn(e.target.value.replace(/[^0-9]/g, ''))} placeholder="11 digits" maxLength={11} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">National Identity Number (NIN)</label>
                  <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={nin} onChange={e => setNin(e.target.value.replace(/[^0-9]/g, ''))} placeholder="11 digits" maxLength={11} />
                </div>
              </div>
              <NavActions isNextDisabled={!isValidBVN(bvn) || !isValidNIN(nin)} />
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
                  <label className="text-sm font-black text-slate-500 uppercase">Primary Home Address</label>
                  <textarea rows={3} className="w-full p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-lg font-bold dark:text-white focus:border-primary outline-none" value={homeAddress} onChange={e => setHomeAddress(e.target.value)} placeholder="Street, Building, Unit Number" />
                </div>
              </div>
              <NavActions isNextDisabled={!homeAddress || !stateOfResidence} />
            </div>
          )}

          {/* Step 7: Living Situation */}
          {subStep === 7 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-3xl font-black dark:text-white">Living Situation</h2>
              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Residential Status</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {['Rent', 'Mortgage', 'Own Outright', 'With Parents'].map(s => (
                      <button key={s} onClick={() => setResidentialStatus(s)} className={`px-4 py-4 rounded-xl border-2 font-bold transition-all text-sm ${residentialStatus === s ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'border-slate-100 dark:border-slate-700 dark:text-white hover:border-primary/50'}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Number of Dependents</label>
                  <div className="flex items-center gap-6">
                    <button onClick={() => setDependents(Math.max(0, dependents - 1))} className="size-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-2xl dark:text-white hover:bg-primary hover:text-white transition-all">-</button>
                    <span className="text-4xl font-black dark:text-white w-12 text-center">{dependents}</span>
                    <button onClick={() => setDependents(dependents + 1)} className="size-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-2xl dark:text-white hover:bg-primary hover:text-white transition-all">+</button>
                  </div>
                </div>
              </div>
              <NavActions />
            </div>
          )}

          {/* Step 8: Financial Health */}
          {subStep === 8 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-3xl font-black dark:text-white">Financial Health</h2>
              <div className="grid gap-6">
                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-500 uppercase">Do you have other active loans?</label>
                  <div className="flex gap-4">
                    {['no', 'yes'].map(opt => (
                      <button key={opt} onClick={() => setHasActiveLoans(opt)} className={`flex-1 py-4 rounded-xl border-2 font-black uppercase tracking-widest transition-all ${hasActiveLoans === opt ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'border-slate-100 dark:border-slate-700 dark:text-white'}`}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Average Monthly Income (USD)</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">₦</span>
                    <input className="w-full h-16 pl-12 pr-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-lg font-bold dark:text-white focus:border-primary outline-none" value={monthlyIncome} onChange={e => setMonthlyIncome(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" />
                  </div>
                </div>
              </div>
              <NavActions isNextDisabled={!monthlyIncome || (selectedLoanId === 'public_sector' && (!mda || !ippisNumber || (mda === 'Other' && !customMda)))} />
            </div>
          )}

          {/* Step 8b: Public Sector Details (Conditional) */}
          {selectedLoanId === 'public_sector' && subStep === 8 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 border-t border-slate-100 dark:border-slate-700 pt-8 mt-8">
              <h3 className="text-xl font-black dark:text-white">Public Sector Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">MDA (Ministry/Dept/Agency)</label>
                  <select className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={mda} onChange={e => setMda(e.target.value)}>
                    <option value="">Select MDA</option>
                    <option value="Education">Education</option>
                    <option value="Health">Health</option>
                    <option value="Defense">Defense</option>
                    <option value="Agriculture">Agriculture</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {mda === 'Other' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-sm font-black text-slate-500 uppercase">Specify MDA</label>
                    <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={customMda} onChange={e => setCustomMda(e.target.value)} placeholder="Enter MDA Name" />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">IPPIS Number</label>
                  <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={ippisNumber} onChange={e => setIppisNumber(e.target.value.replace(/[^0-9]/g, ''))} placeholder="000000" />
                </div>
              </div>
            </div>
          )}

          {/* Step 9: Secure Vault */}
          {subStep === 9 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-3xl font-black dark:text-white">Secure Vault</h2>
              <p className="text-slate-500 font-medium">Upload necessary documents to verify your identity and income.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { id: 'national_id', label: 'Government Issued ID', icon: 'badge' },
                  { id: 'bank_statement', label: 'Last 3 Mo. Statements', icon: 'account_balance' },
                  { id: 'proof_address', label: 'Proof of Residence', icon: 'home_pin' },
                  { id: 'selfie', label: 'Selfie Verification', icon: 'add_a_photo' }
                ].map(doc => (
                  <div key={doc.id} onClick={() => handleFileSelect(doc.id)} className={`relative group p-6 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center gap-4 text-center ${uploadedDocs[doc.id] ? 'border-green-500 bg-green-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-primary'}`}>
                    {uploadedDocs[doc.id] ? (
                      <div className="size-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/20"><span className="material-symbols-outlined">check</span></div>
                    ) : (
                      <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-center"><span className="material-symbols-outlined">{doc.icon}</span></div>
                    )}
                    <div>
                      <p className="font-bold dark:text-white text-sm">{doc.label}</p>
                      {uploadedDocs[doc.id] ? <p className="text-[10px] text-green-500 font-black uppercase tracking-widest mt-1">Uploaded</p> : <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Click to upload</p>}
                    </div>
                    {uploadProgress[doc.id] > 0 && uploadProgress[doc.id] < 100 && (
                      <div className="absolute bottom-4 left-6 right-6 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress[doc.id]}%` }}></div>
                      </div>
                    )}
                    {uploadedDocs[doc.id] && (
                      <button onClick={(e) => removeDoc(doc.id, e)} className="absolute top-4 right-4 text-red-500 hover:bg-red-500/10 rounded-full p-1 transition-all"><span className="material-symbols-outlined text-sm">cancel</span></button>
                    )}
                  </div>
                ))}
              </div>
              <NavActions isNextDisabled={!uploadedDocs.national_id || !uploadedDocs.bank_statement} />
            </div>
          )}

          {/* Step 10: References */}
          {subStep === 10 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-3xl font-black dark:text-white">References</h2>
              <p className="text-slate-500 font-medium">Please provide 3 professional or personal contacts.</p>
              <div className="space-y-6">
                {references.map((ref, idx) => (
                  <div key={idx} className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">Ref {idx + 1} Name</label>
                      <input className="w-full h-12 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-4 font-bold dark:text-white outline-none focus:border-primary" value={ref.name} onChange={e => updateRef(idx, 'name', e.target.value)} placeholder="Full Name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">Phone Number</label>
                      <input className="w-full h-12 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-4 font-bold dark:text-white outline-none focus:border-primary" value={ref.phone} onChange={e => updateRef(idx, 'phone', e.target.value)} placeholder="000-000-0000" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">Relationship</label>
                      <select className="w-full h-12 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-4 font-bold dark:text-white outline-none focus:border-primary" value={ref.relationship} onChange={e => updateRef(idx, 'relationship', e.target.value)}>
                        <option value="">Select Relation</option>
                        <option value="Family">Family</option>
                        <option value="Colleague">Colleague</option>
                        <option value="Friend">Friend</option>
                        <option value="Manager">Manager</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <NavActions isNextDisabled={false} />
            </div>
          )}

          {/* Step 11: Review & Customize */}
          {subStep === 11 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Review & Customize</h1>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-7 flex flex-col gap-8">
                  <div className="bg-white dark:bg-slate-800 p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-700 flex flex-col gap-10">
                    <div className="space-y-4">
                      <label className="text-lg font-black text-slate-900 dark:text-white ml-1">Requested Amount</label>
                      <div className="relative group">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-400">₦</span>
                        <input className="w-full h-20 pl-12 pr-16 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-3xl font-black text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-all" value={desiredAmount} onChange={(e) => setDesiredAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="flex justify-between items-center"><label className="text-lg font-black text-slate-900 dark:text-white">Term (Months)</label><span className="bg-primary text-white font-black px-6 py-2 rounded-full text-sm shadow-md shadow-primary/20">{repaymentPeriod} Months</span></div>
                      <input type="range" min="6" max="60" step="6" value={repaymentPeriod} onChange={(e) => setRepaymentPeriod(parseInt(e.target.value))} className="w-full h-3 bg-slate-100 dark:bg-slate-900 rounded-full appearance-none cursor-pointer accent-primary" />
                    </div>

                    {/* Additional Info */}
                    <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-black text-slate-500 uppercase">Staff ID / Officer Code</label>
                          <input className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-4 font-bold dark:text-white focus:border-primary outline-none" value={staffId} onChange={e => setStaffId(e.target.value)} placeholder="Required" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-black text-slate-500 uppercase">Referral Code</label>
                          <input className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-4 font-bold dark:text-white focus:border-primary outline-none" value={referralCode} onChange={e => setReferralCode(e.target.value)} placeholder="Optional" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <NavActions nextLabel="Submit Application" isNextDisabled={!staffId} />
                </div>
                <div className="lg:col-span-5"><div className="bg-slate-900 text-white rounded-[2.5rem] p-10 flex flex-col gap-8 shadow-2xl overflow-hidden relative"><div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div><h3 className="text-xl font-black text-white/90 uppercase tracking-widest">Summary</h3><div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10"><p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-3">Est. Monthly Payment</p><span className="text-5xl font-black text-primary tracking-tighter">{formatMoney(calculation.monthly)}</span></div><div className="space-y-4 pt-4 text-sm font-bold"><div className="flex justify-between py-4 border-b border-white/10"><span className="text-slate-400 uppercase tracking-widest">Rate (APR)</span><span className="text-primary">{calculation.rate}%</span></div><div className="flex justify-between pt-6"><span className="text-white uppercase tracking-widest">Total Repayment</span><span className="text-2xl text-primary">{formatMoney(calculation.total)}</span></div></div></div></div>
              </div>
            </div>
          )}

          {/* Step 12: Indemnity & Signature */}
          {subStep === 12 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
              <div className="flex flex-col gap-2">
                <h1 className="text-text-main dark:text-white text-3xl md:text-5xl font-black leading-tight tracking-tight">
                  Indemnity & Signature
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                  Please review the indemnity agreement carefully and sign below to proceed.
                </p>
              </div>

              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col h-[600px] lg:h-auto">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">description</span>
                      Indemnity Agreement
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                    <div className="prose dark:prose-invert max-w-none space-y-8">
                      <div>
                        <h4 className="text-lg font-bold mb-4 uppercase text-slate-900 dark:text-white">1. Indemnity</h4>
                        <p>I/We hereby agree to indemnify and hold harmless NOLT Finance from any and all claims, damages, liabilities, costs, and expenses arising out of any breach of representations made by me/us in this application.</p>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold mb-4 uppercase text-slate-900 dark:text-white">2. Electronic Signature Consent</h4>
                        <p>By signing this document electronically, I/we acknowledge that my electronic signature is the legal equivalent of my handwritten signature.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-[420px] flex flex-col gap-6">
                  <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 p-8 flex flex-col gap-8 sticky top-32">
                    <div>
                      <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1">Sign Here</h3>
                      <p className="text-xs text-slate-500 uppercase tracking-widest font-black">Draw your signature in the box below</p>
                    </div>

                    <div className="relative group">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={200}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseOut={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-48 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary transition-colors cursor-crosshair relative overflow-hidden"
                      />
                      {!hasSigned && <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20"><span className="text-slate-400 text-2xl font-black uppercase tracking-widest">Sign Here</span></div>}
                      <button onClick={clearSignature} className="absolute top-4 right-4 text-[10px] font-black uppercase text-red-500 hover:text-red-600 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm transition-all">Clear</button>
                    </div>

                    <div className="flex items-start gap-4 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 group cursor-pointer" onClick={() => setAcceptedIndemnity(!acceptedIndemnity)}>
                      <input className="peer size-6 appearance-none rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 cursor-pointer transition-all" type="checkbox" checked={acceptedIndemnity} onChange={(e) => setAcceptedIndemnity(e.target.checked)} />
                      <label className="text-sm font-bold text-slate-600 dark:text-slate-400 cursor-pointer leading-snug">I accept the terms of the Indemnity Agreement and confirm that the digital signature above is mine.</label>
                    </div>
                  </div>
                </div>
              </div>
              <NavActions nextLabel="Complete Application" isNextDisabled={!hasSigned || !acceptedIndemnity} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default LoanFlow;