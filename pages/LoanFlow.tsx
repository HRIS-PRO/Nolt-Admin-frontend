import React, { useState, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import { AppStep, SavedDraft, UserState } from '../types';
import { getFinancialAdvice } from '../services/geminiService';
import { storageService } from '../services/storageService';
import SuccessScreen from './SuccessScreen';
import { useNavigate } from 'react-router-dom';
import MdaTertiarySelect, { TERTIARY_LIST } from '../components/MdaTertiarySelect';

interface LoanFlowProps {
  initialStep: 'TYPE' | 'IDENTITY';
  onComplete: () => void;
  navigate: (step: AppStep) => void;
  formatMoney: (amount: number) => string;
  initialDraft?: SavedDraft | null;
  referralCodeUsed?: string;
  user: UserState;
}

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone: string) => /^\+?[0-9]{10,15}$/.test(phone.replace(/[^0-9+]/g, ''));
const isValidBVN = (bvn: string) => /^[0-9]{11}$/.test(bvn);
const isValidNIN = (nin: string) => /^[0-9]{11}$/.test(nin);

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River",
  "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna",
  "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

const isValidAccountNumber = (acc: string) => /^\d{10}$/.test(acc);

const LoanFlow: React.FC<LoanFlowProps> = ({ initialStep, onComplete, navigate, formatMoney, initialDraft, referralCodeUsed, user }) => {

  const [subStep, setSubStep] = useState(initialDraft?.subStep ?? (initialStep === 'TYPE' ? 0 : 1));
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [indemnityUrl, setIndemnityUrl] = useState<string | null>(null);

  // Form State
  const [draftId] = useState(initialDraft?.id ?? `L-${Math.floor(Math.random() * 9000) + 1000}`);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(initialDraft?.data?.selectedLoanId ?? null);

  // Signature & Acceptance State
  const [hasSigned, setHasSigned] = useState(initialDraft?.data?.hasSigned ?? false);
  const [acceptedIndemnity, setAcceptedIndemnity] = useState(initialDraft?.data?.acceptedIndemnity ?? false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Form Fields
  const [title, setTitle] = useState(initialDraft?.data?.title ?? 'Mr');
  const [surname, setSurname] = useState(initialDraft?.data?.surname ?? '');
  const [firstName, setFirstName] = useState(initialDraft?.data?.firstName ?? '');
  const [middleName, setMiddleName] = useState(initialDraft?.data?.middleName ?? '');
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
  const [residentialStatus, setResidentialStatus] = useState(initialDraft?.data?.residentialStatus ?? 'Rent');
  const [dependents, setDependents] = useState(initialDraft?.data?.dependents ?? 0);
  const [hasActiveLoans, setHasActiveLoans] = useState(initialDraft?.data?.hasActiveLoans ?? 'no');
  const [monthlyIncome, setMonthlyIncome] = useState(initialDraft?.data?.monthlyIncome ?? '5000');
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { name: string, size: string, url?: string } | null>>(
    initialDraft?.data?.uploadedDocs ?? {
      national_id: null,
      bank_statement: null,
      proof_address: null,
      selfie: null,
      work_id: null,
      payslip: null
    }
  );
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [references, setReferences] = useState(
    initialDraft?.data?.references ?? [
      { name: '', phone: '', relationship: '' }
    ]
  );
  const [desiredAmount, setDesiredAmount] = useState(initialDraft?.data?.desiredAmount ?? '100000');
  const [repaymentPeriod, setRepaymentPeriod] = useState(initialDraft?.data?.repaymentPeriod ?? 12);

  // New Fields
  const [mda, setMda] = useState(initialDraft?.data?.mda ?? '');
  const [customMda, setCustomMda] = useState(initialDraft?.data?.customMda ?? '');
  const [ippisNumber, setIppisNumber] = useState(initialDraft?.data?.ippisNumber ?? '');
  const [staffId, setStaffId] = useState(initialDraft?.data?.staffId ?? '');
  const [referralCode, setReferralCode] = useState(referralCodeUsed || initialDraft?.data?.referralCode || '');
  const [submitting, setSubmitting] = useState(false)

  // Bank Details
  const [bankDetails, setBankDetails] = useState(initialDraft?.data?.bankDetails ?? {
    bankName: '',
    accountNumber: '',
    accountName: ''
  });
  const [bankList, setBankList] = useState<{ name: string; code: string }[]>([]);
  const [isVerifyingBank, setIsVerifyingBank] = useState(false);
  const [bankVerificationResult, setBankVerificationResult] = useState<{
    account_name: string;
    isMatch: boolean;
    matchedNames: string[];
    reason: string;
  } | null>(null);
  const [bankVerificationError, setBankVerificationError] = useState<string | null>(null);


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
    //     {id: 'travel_loan', label: 'Travel Loan', icon: 'flight_takeoff', description: 'Finance your travel plans, vacations, or business trips.' },
    //     {id: 'annuitant_loan', label: 'Annuitant Loan', icon: 'elderly', description: 'Special financing options designed for retirees.' },
    //   ]
    // }
  ];

  const currentLoanLabel = categories.flatMap(c => c.loans).find(l => l.id === selectedLoanId)?.label || 'Personal Loan';
  const isTertiary = useMemo(() => TERTIARY_LIST.includes(mda), [mda]);

  const handleNext = async () => {
    console.log("Saving draft...");
    console.log(subStep)
    if (subStep < 13) { // Adjusted from 12 to 13 for new step
      setSubStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (subStep === 13) { // Adjusted from 12 to 13 for new step
      setLoading(true);
      await submitLoan();
      setLoading(false);
    }
  };

  const submitLoan = async () => {
    try {
      const canvas = canvasRef.current;
      const signatureUrl = canvas ? canvas.toDataURL() : '';
      setSubmitting(true)
      const payload = {
        applying_for_others: isOnBehalf,
        relationship_to_applicant: isOnBehalf ? representativeRelation : null,
        surname,
        first_name: firstName,
        middle_name: middleName,
        applicant_full_name: `${surname} ${firstName} ${middleName}`.trim(),
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
        work_id_url: uploadedDocs.work_id?.url || null,
        payslip_url: uploadedDocs.payslip?.url || null,

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
        referral_code: referralCode,

        // Bank Details
        bank_name: bankDetails.bankName,
        account_number: bankDetails.accountNumber,
        account_name: bankDetails.accountName,
        loan_type: currentLoanLabel
      };

      console.log("Submitting Loan Payload:", payload);

      const backendUrl = ''; // Use proxy
      const response = await axios.post(`${backendUrl}/api/loans`, payload, { withCredentials: true });

      if (response.data && response.data.indemnity_document_url) {
        setIndemnityUrl(response.data.indemnity_document_url);
      }

      storageService.deleteDraft(draftId);
      setIsSuccess(true);
      // onComplete();
    } catch (error: any) {
      console.error("Error submitting loan:", error);
      const serverMessage = error.response?.data?.message || "Failed to submit loan application. Please try again.";
      alert(serverMessage);
    } finally {
      setSubmitting(false)
    }
  };

  useEffect(() => {
    // Fetch banks
    const fetchBanks = async () => {
      try {
        const backendUrl = '';
        const response = await axios.get(`${backendUrl}/api/misc/banks`);
        if (response.data && response.data.data) {
          setBankList(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching banks:", error);
      }
    };
    fetchBanks();
  }, []);

  // Auto-verify bank account when bank + 10-digit account number are both filled
  useEffect(() => {
    const selectedBank = bankList.find(b => b.name === bankDetails.bankName);
    if (!selectedBank || !isValidAccountNumber(bankDetails.accountNumber)) {
      // Reset verification when inputs change and become invalid
      setBankVerificationResult(null);
      setBankVerificationError(null);
      setBankDetails(prev => ({ ...prev, accountName: '' }));
      return;
    }

    const verifyAccount = async () => {
      setIsVerifyingBank(true);
      setBankVerificationResult(null);
      setBankVerificationError(null);
      setBankDetails(prev => ({ ...prev, accountName: '' }));

      try {
        const backendUrl = '';
        const response = await axios.post(`${backendUrl}/api/misc/resolve-account`, {
          account_number: bankDetails.accountNumber,
          bank_code: selectedBank.code,
          first_name: firstName,
          surname: surname
        }, { withCredentials: true });

        if (response.data.success) {
          setBankVerificationResult(response.data.data);
          setBankDetails(prev => ({ ...prev, accountName: response.data.data.account_name }));
        } else {
          setBankVerificationError(response.data.message || 'Verification failed.');
        }
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Could not verify account. Please check the details.';
        setBankVerificationError(msg);
      } finally {
        setIsVerifyingBank(false);
      }
    };

    // Debounce to avoid rapid API calls while typing
    const timeout = setTimeout(verifyAccount, 500);
    return () => clearTimeout(timeout);
  }, [bankDetails.bankName, bankDetails.accountNumber, bankList]);

  // Auto-Prefill from Existing Data
  useEffect(() => {
    // If we are resuming a draft, don't stomp over it with old data
    if (initialDraft) {
      console.log("Resuming draft, skipping auto-prefill");
      return;
    }

    const prefillData = async () => {
      // 1. Prioritize Profile Data (Source of Truth)
      if (user.profile) {
        const p = user.profile;
        if (p.surname) setSurname(p.surname);
        if (p.first_name) setFirstName(p.first_name);
        if (p.middle_name) setMiddleName(p.middle_name);
        if (p.date_of_birth) setDob(new Date(p.date_of_birth).toISOString().split('T')[0]);
        if (p.gender) setGender(p.gender);
        if (p.phone_number) setMobileNumber(p.phone_number);
        if (p.personal_email) setContactEmail(p.personal_email);
        if (p.bvn) setBvn(p.bvn);
        if (p.nin) setNin(p.nin);
        if (p.state_of_origin) setStateOfOrigin(p.state_of_origin);
        if (p.state_of_residence) setStateOfResidence(p.state_of_residence);
        if (p.address) setHomeAddress(p.address);
        
        // Banking from Profile
        if (p.bank_name || p.account_number) {
          setBankDetails({
            bankName: p.bank_name || '',
            accountNumber: p.account_number || '',
            accountName: p.account_name || ''
          });
        }
      }

      // 2. Fetch Latest Loan for non-profile fields & documents
      try {
        const backendUrl = '';
        const response = await axios.get(`${backendUrl}/api/loans`, { withCredentials: true });

        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          const latestLoan = response.data[0];
          console.log("Hydrating from previous loan:", latestLoan);

          // Only fill if not already set by profile (profile is priority)
          if (!user.profile?.surname && latestLoan.surname) setSurname(latestLoan.surname);
          if (!user.profile?.first_name && latestLoan.first_name) setFirstName(latestLoan.first_name);
          if (!user.profile?.middle_name && latestLoan.middle_name) setMiddleName(latestLoan.middle_name);
          if (latestLoan.is_politically_exposed !== undefined) setIsPep(latestLoan.is_politically_exposed);
          if (!user.profile?.gender && latestLoan.gender) setGender(latestLoan.gender);
          if (!user.profile?.date_of_birth && latestLoan.date_of_birth) {
            setDob(new Date(latestLoan.date_of_birth).toISOString().split('T')[0]);
          }

          setTitle(latestLoan.title || 'Mr');
          setMaidenName(latestLoan.mothers_maiden_name || '');
          setMaritalStatus(latestLoan.marital_status || 'Single');
          setReligion(latestLoan.religion || 'Prefer not to say');

          // Contact
          if (!user.profile?.phone_number && latestLoan.mobile_number) setMobileNumber(latestLoan.mobile_number);
          if (!user.profile?.personal_email && latestLoan.personal_email) setContactEmail(latestLoan.personal_email);

          // IDs
          if (!user.profile?.bvn && latestLoan.bvn) setBvn(latestLoan.bvn);
          if (!user.profile?.nin && latestLoan.nin) setNin(latestLoan.nin);

          // Address
          if (!user.profile?.state_of_origin && latestLoan.state_of_origin) setStateOfOrigin(latestLoan.state_of_origin);
          if (!user.profile?.state_of_residence && latestLoan.state_of_residence) setStateOfResidence(latestLoan.state_of_residence);
          if (!user.profile?.address && latestLoan.primary_home_address) setHomeAddress(latestLoan.primary_home_address);
          setResidentialStatus(latestLoan.residential_status || 'Rent');

          // Financial
          setDependents(latestLoan.number_of_dependents || 0);
          setHasActiveLoans(latestLoan.has_active_loans ? 'yes' : 'no');
          setMonthlyIncome(latestLoan.average_monthly_income?.toString() || '0');

          // Work / MDA
          const dbMda = latestLoan.mda_tertiary;
          if (dbMda) {
            if (TERTIARY_LIST.includes(dbMda)) {
              setMda(dbMda);
            } else {
              setMda('Other');
              setCustomMda(dbMda);
            }
          }
          setIppisNumber(latestLoan.ippis_number || '');
          setStaffId(latestLoan.staff_id || '');

          // Banking - Fallback to latest loan if profile didn't have it
          if (!user.profile?.bank_name && !user.profile?.account_number) {
            setBankDetails({
              bankName: latestLoan.bank_name || '',
              accountNumber: latestLoan.account_number || '',
              accountName: latestLoan.account_name || ''
            });
          }

          // Uploaded Docs
          setUploadedDocs(prev => ({
            ...prev,
            national_id: latestLoan.govt_id_url ? { name: 'Previous Upload', size: 'Existing', url: latestLoan.govt_id_url } : null,
            work_id: latestLoan.work_id_url ? { name: 'Previous Upload', size: 'Existing', url: latestLoan.work_id_url } : null,
            payslip: latestLoan.payslip_url ? { name: 'Previous Upload', size: 'Existing', url: latestLoan.payslip_url } : null,
            bank_statement: latestLoan.statement_of_account_url ? { name: 'Previous Upload', size: 'Existing', url: latestLoan.statement_of_account_url } : null,
            proof_address: latestLoan.proof_of_residence_url ? { name: 'Previous Upload', size: 'Existing', url: latestLoan.proof_of_residence_url } : null,
            selfie: latestLoan.selfie_verification_url ? { name: 'Previous Upload', size: 'Existing', url: latestLoan.selfie_verification_url } : null,
          }));

          setIsOnBehalf(latestLoan.applying_for_others || false);
          setRepresentativeRelation(latestLoan.relationship_to_applicant || '');
          setReferralCode(latestLoan.referral_code || '');

          // References
          let refs = [];
          if (typeof latestLoan.references === 'string') {
            try { refs = JSON.parse(latestLoan.references); } catch (e) { }
          } else if (Array.isArray(latestLoan.references)) {
            refs = latestLoan.references;
          }

          if (Array.isArray(refs) && refs.length > 0) {
            setReferences(refs.map(r => ({
              name: r.fullName || r.name || '',
              phone: r.phoneNumber || r.phone || '',
              relationship: r.relationship || ''
            })));
          }
        }
      } catch (error) {
        console.error("Failed to load previous data", error);
      }
    };

    prefillData();
  }, [initialDraft, user.profile]);

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
        selectedLoanId, title, surname, firstName, middleName, isOnBehalf, representativeRelation, isPep, gender, dob, maidenName, maritalStatus, religion,
        countryCode, mobileNumber, contactEmail, bvn, nin, stateOfOrigin, stateOfResidence,
        homeAddress, residentialStatus, dependents, hasActiveLoans, monthlyIncome, uploadedDocs,
        references, desiredAmount, repaymentPeriod, hasSigned, acceptedIndemnity,
        mda, customMda, ippisNumber, staffId, referralCode,
        bankDetails // Added bank details to draft
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

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear before drawing
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate scaling to fit image nicely in canvas
      const hRatio = canvas.width / img.width;
      const vRatio = canvas.height / img.height;
      const ratio = Math.min(hRatio, vRatio);

      const centerShift_x = (canvas.width - img.width * ratio) / 2;
      const centerShift_y = (canvas.height - img.height * ratio) / 2;

      ctx.drawImage(img, 0, 0, img.width, img.height,
        centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);

      setHasSigned(true);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const uploadFile = async (id: string, file: File) => {
    // Optimistic UI Update
    setUploadProgress(prev => ({ ...prev, [id]: 10 }));

    // Determine document_type
    const docTypes: Record<string, string> = {
      'national_id': 'govt_id',
      'bank_statement': 'bank_statement',
      'proof_address': 'proof_of_residence',
      'selfie': 'selfie_verification',
      'work_id': 'work_id',
      'payslip': 'payslip'
    };

    const formData = new FormData();
    formData.append('file', file);
    formData.append('loan_id', draftId); // Using draftId as temporary loan_id or strictly the text
    formData.append('document_type', docTypes[id] || 'other');

    try {
      setUploadProgress(prev => ({ ...prev, [id]: 30 }));
      const backendUrl = ''; // Use proxy

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

  const addReference = () => {
    setReferences([...references, { name: '', phone: '', relationship: '' }]);
  };

  const removeReference = (index: number) => {
    if (references.length > 1) {
      setReferences(references.filter((_, i) => i !== index));
    }
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
        indemnityUrl={indemnityUrl}
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
              {['Identity', 'Financials', 'References', 'Disbursement', 'Review', 'Agreement'].map((lbl, idx) => { // Adjusted for new step
                const sRange = [1, 6, 10, 11, 12, 13][idx]; // Adjusted for new step
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
              <p className="text-slate-900 dark:text-white text-base font-black uppercase">Step {subStep + 1} of 14</p> {/* Adjusted from 13 to 14 */}
              <p className="text-primary text-sm font-bold">{Math.round(((subStep + 1) / 14) * 100)}% Completed</p> {/* Adjusted from 13 to 14 */}
            </div>
            <div className="rounded-full bg-slate-200 dark:bg-slate-800 h-2 w-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out" style={{ width: `${((subStep + 1) / 14) * 100}%` }}></div> {/* Adjusted from 13 to 14 */}
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
                {/* <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 gap-4">
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
                </div> */}

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
                  <label className="text-sm font-black text-slate-500 uppercase">{isOnBehalf ? 'Applicant Surname' : 'Your Surname'}</label>
                  <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none transition-all" value={surname} onChange={e => setSurname(e.target.value)} placeholder="Surname" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">{isOnBehalf ? 'Applicant First Name' : 'Your First Name'}</label>
                  <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none transition-all" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First Name" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">{isOnBehalf ? 'Applicant Middle Name' : 'Your Middle Name'} (Optional)</label>
                  <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none transition-all" value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Middle Name" />
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
              <NavActions isNextDisabled={!surname || !firstName || isPep === null || (isOnBehalf && !representativeRelation)} />
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
                  <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed" value={bvn} onChange={e => setBvn(e.target.value.replace(/[^0-9]/g, ''))} placeholder="11 digits" maxLength={11} disabled={!!user.profile?.bvn} title={user.profile?.bvn ? "Verified from profile" : ""} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">National Identity Number (NIN)</label>
                  <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed" value={nin} onChange={e => setNin(e.target.value.replace(/[^0-9]/g, ''))} placeholder="11 digits" maxLength={11} disabled={!!user.profile?.nin} title={user.profile?.nin ? "Verified from profile" : ""} />
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
                    <select
                      className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none appearance-none"
                      value={stateOfOrigin}
                      onChange={e => setStateOfOrigin(e.target.value)}
                    >
                      <option value="">Select State</option>
                      {NIGERIAN_STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase">State of Residence</label>
                    <select
                      className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none appearance-none"
                      value={stateOfResidence}
                      onChange={e => setStateOfResidence(e.target.value)}
                    >
                      <option value="">Select State</option>
                      {NIGERIAN_STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
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
                  <label className="text-sm font-black text-slate-500 uppercase">Average Monthly Income (NGN)</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">₦</span>
                    <input className="w-full h-16 pl-12 pr-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-lg font-bold dark:text-white focus:border-primary outline-none" value={monthlyIncome} onChange={e => setMonthlyIncome(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" />
                  </div>
                </div>
              </div>
              {selectedLoanId === 'public_sector' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 border-t border-slate-100 dark:border-slate-700 pt-8 mt-8">
                  <h3 className="text-xl font-black dark:text-white">Public Sector Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <MdaTertiarySelect
                        value={mda}
                        onChange={setMda}
                        label="MDA / Tertiary Institution"
                      />
                    </div>
                    {mda === 'Other' && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-sm font-black text-slate-500 uppercase">Specify MDA</label>
                        <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={customMda} onChange={e => setCustomMda(e.target.value)} placeholder="Enter MDA Name" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-sm font-black text-slate-500 uppercase">IPPIS Number {isTertiary ? '(Optional)' : ''}</label>
                      <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={ippisNumber} onChange={e => setIppisNumber(e.target.value.replace(/[^0-9]/g, ''))} placeholder="000000" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-black text-slate-500 uppercase">Staff ID {isTertiary ? '' : '(Optional)'}</label>
                      <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={staffId} onChange={e => setStaffId(e.target.value)} placeholder={isTertiary ? "Required" : "Optional"} />
                    </div>
                  </div>
                </div>
              )}
              <NavActions isNextDisabled={!monthlyIncome || (selectedLoanId === 'public_sector' && (!mda || (mda === 'Other' && !customMda) || (!isTertiary && !ippisNumber) || (isTertiary && !staffId)))} />
            </div>
          )}

          {/* Step 9: Secure Vault */}
          {subStep === 9 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-3xl font-black dark:text-white">Secure Vault</h2>
              <p className="text-slate-500 font-medium">Upload necessary documents to verify your identity and income.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { id: 'national_id', label: 'Government Issued ID', icon: 'badge', required: true },
                  { id: 'work_id', label: 'Work ID', icon: 'badge', required: true },
                  { id: 'payslip', label: 'Recent Payslip', icon: 'receipt', required: true },
                  { id: 'bank_statement', label: 'Last 3 Mo. Statements', icon: 'account_balance' },
                  { id: 'proof_address', label: 'Proof of Residence', icon: 'home_pin' },
                  { id: 'selfie', label: 'Selfie Verification', icon: 'add_a_photo' },
                ].map(doc => (
                  <div key={doc.id} onClick={() => handleFileSelect(doc.id)} className={`relative group p-6 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center gap-4 text-center ${uploadedDocs[doc.id] ? 'border-green-500 bg-green-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-primary'}`}>
                    {uploadedDocs[doc.id] ? (
                      <div className="size-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/20"><span className="material-symbols-outlined">check</span></div>
                    ) : (
                      <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-center"><span className="material-symbols-outlined">{doc.icon}</span></div>
                    )}
                    <div>
                      <p className="font-bold dark:text-white text-sm">
                        {doc.label}
                        {(doc.required || (doc.id === 'bank_statement' && (parseFloat(desiredAmount.replace(/[^0-9.]/g, '')) || 0) > 500000)) && <span className="text-red-500 ml-1">*</span>}
                      </p>
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
              <NavActions isNextDisabled={!uploadedDocs.national_id || !uploadedDocs.work_id || !uploadedDocs.payslip || ((parseFloat(desiredAmount.replace(/[^0-9.]/g, '')) || 0) > 500000 && !uploadedDocs.bank_statement)} />
            </div>
          )}

          {/* Step 10: Disbursement Details (New Step) */}
          {subStep === 10 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-3xl font-black dark:text-white">Disbursement Details</h2>
              <p className="text-slate-500 font-medium">Where should we send your funds? We'll verify the account matches your name.</p>
              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Bank Name</label>
                  <select
                    value={bankDetails.bankName}
                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value, accountName: '' })}
                    className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none"
                  >
                    <option value="">Select Bank</option>
                    {bankList.map((bank: { name: string; code: string }) => (
                      <option key={bank.code} value={bank.name}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Account Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={bankDetails.accountNumber}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) {
                          setBankDetails({ ...bankDetails, accountNumber: val, accountName: '' });
                        }
                      }}
                      className={`w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 px-6 pr-14 text-lg font-bold dark:text-white focus:border-primary outline-none transition-all ${
                        bankVerificationResult?.isMatch ? 'border-green-500' : bankVerificationResult && !bankVerificationResult.isMatch ? 'border-red-500' : bankVerificationError ? 'border-red-500' : 'border-slate-100 dark:border-slate-700'
                      }`}
                      placeholder="Enter 10-digit Account Number"
                      maxLength={10}
                    />
                    {isVerifyingBank && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    {!isVerifyingBank && bankVerificationResult?.isMatch && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <span className="material-symbols-outlined text-green-500 text-2xl filled">check_circle</span>
                      </div>
                    )}
                    {!isVerifyingBank && bankVerificationResult && !bankVerificationResult.isMatch && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <span className="material-symbols-outlined text-red-500 text-2xl filled">error</span>
                      </div>
                    )}
                  </div>
                  {!isValidAccountNumber(bankDetails.accountNumber) && bankDetails.accountNumber.length > 0 && (
                    <p className="text-red-500 text-sm font-bold mt-2 animate-in slide-in-from-top-1">
                      Account number must be 10 digits and numeric.
                    </p>
                  )}
                </div>

                {/* Resolved Account Name — Read Only */}
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Account Name (Auto-Verified)</label>
                  <input
                    type="text"
                    value={bankDetails.accountName}
                    readOnly
                    className={`w-full h-16 rounded-2xl border-2 px-6 text-lg font-bold outline-none transition-all cursor-not-allowed ${
                      bankVerificationResult?.isMatch
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-300'
                        : bankVerificationResult && !bankVerificationResult.isMatch
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-300'
                        : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                    }`}
                    placeholder={isVerifyingBank ? 'Verifying...' : 'Will auto-fill after verification'}
                  />
                </div>

                {/* Verification Status Messages */}
                {bankVerificationResult && (
                  <div className={`p-4 rounded-2xl border-2 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                    bankVerificationResult.isMatch
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <span className={`material-symbols-outlined text-xl mt-0.5 filled ${
                      bankVerificationResult.isMatch ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {bankVerificationResult.isMatch ? 'verified' : 'gpp_bad'}
                    </span>
                    <div>
                      <p className={`font-bold text-sm ${bankVerificationResult.isMatch ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                        {bankVerificationResult.isMatch ? 'Account Verified ✓' : 'Name Mismatch Detected'}
                      </p>
                      <p className={`text-xs mt-1 font-medium ${
                        bankVerificationResult.isMatch ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {bankVerificationResult.isMatch
                          ? `Resolved: "${bankVerificationResult.account_name}" — matches applicant name (${bankVerificationResult.matchedNames.join(', ')}).`
                          : `Resolved: "${bankVerificationResult.account_name}" — does not match "${firstName} ${surname}". At least the first name or surname must appear in the account name.`
                        }
                      </p>
                    </div>
                  </div>
                )}

                {bankVerificationError && (
                  <div className="p-4 rounded-2xl border-2 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <span className="material-symbols-outlined text-xl mt-0.5 text-amber-600 filled">warning</span>
                    <div>
                      <p className="font-bold text-sm text-amber-800 dark:text-amber-300">Verification Failed</p>
                      <p className="text-xs mt-1 font-medium text-amber-600 dark:text-amber-400">{bankVerificationError}</p>
                    </div>
                  </div>
                )}
              </div>
              <NavActions isNextDisabled={
                !bankDetails.bankName ||
                !isValidAccountNumber(bankDetails.accountNumber) ||
                !bankDetails.accountName ||
                isVerifyingBank ||
                (bankVerificationResult !== null && !bankVerificationResult.isMatch)
              } />
            </div>
          )}

          {/* Step 11: References (Adjusted from 10 to 11) */}
          {subStep === 11 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-3xl font-black dark:text-white">References / Next of kin</h2>
              <p className="text-slate-500 font-medium">Please provide 3 professional or personal contacts.</p>
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <button onClick={addReference} className="text-sm font-bold text-primary flex items-center gap-1 hover:text-primary/80 transition-colors">
                    <span className="material-symbols-outlined text-lg">add_circle</span>
                    Add Reference
                  </button>
                </div>
                {references.map((ref, idx) => (
                  <div key={idx} className="relative p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 space-y-4">
                    {references.length > 1 && (
                      <button onClick={() => removeReference(idx)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors">
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    )}
                    <h4 className="font-bold text-base text-slate-900 dark:text-white uppercase tracking-wider">Reference {idx === 0 && '(Required)'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase">Ref Name</label>
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
                  </div>
                ))}
              </div>
              <NavActions isNextDisabled={!references[0]?.name || !references[0]?.phone || !references[0]?.relationship} />
            </div>
          )}

          {/* Step 12: Review & Customize (Adjusted from 11 to 12) */}
          {subStep === 12 && (
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
                      {parseFloat(desiredAmount.replace(/[^0-9.]/g, '')) < 100000 && (
                        <p className="text-red-500 text-sm font-bold mt-2 animate-in slide-in-from-top-1">
                          Minimum loan amount is ₦100,000
                        </p>
                      )}
                      {(parseFloat(desiredAmount.replace(/[^0-9.]/g, '')) || 0) > 500000 && !uploadedDocs.bank_statement && (
                        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl flex gap-3 animate-in slide-in-from-top-2">
                          <span className="material-symbols-outlined text-amber-500 shrink-0">warning</span>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Bank Statement Required</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                              For loans above ₦500,000, a 3-month bank statement is required. Please go back to the
                              <button onClick={() => { setSubStep(9); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-primary hover:underline font-bold ml-1">
                                Secure Vault step
                              </button> to upload it.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center"><label className="text-lg font-black text-slate-900 dark:text-white">Term (Months)</label><span className="bg-primary text-white font-black px-6 py-2 rounded-full text-sm shadow-md shadow-primary/20">{repaymentPeriod} Months</span></div>
                    <input type="range" min="3" max="24" step="1" value={repaymentPeriod} onChange={(e) => setRepaymentPeriod(parseInt(e.target.value))} className="w-full h-3 bg-slate-100 dark:bg-slate-900 rounded-full appearance-none cursor-pointer accent-primary" />

                    {/* Additional Info */}
                    <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-black text-slate-500 uppercase">Referral Code</label>
                          <input className={`w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-4 font-bold dark:text-white focus:border-primary outline-none ${referralCodeUsed ? 'opacity-50 cursor-not-allowed' : ''}`} value={referralCode} onChange={e => setReferralCode(e.target.value)} placeholder="Optional" disabled={!!referralCodeUsed} title={referralCodeUsed ? "Referral code applied from signup" : ""} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <NavActions nextLabel="Submit Application" isNextDisabled={parseFloat(desiredAmount.replace(/[^0-9.]/g, '')) < 100000 || parseFloat(desiredAmount.replace(/[^0-9.]/g, '')) > 500000 && !uploadedDocs.bank_statement} />
                </div>
              </div>
            </div>
          )}

          {subStep === 13 && (
            <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
              <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-stretch">
                {/* Indemnity Card */}
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
                  <div className="p-6 md:p-8 border-b border-slate-50 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-2xl">description</span>
                      <h3 className="font-black text-xl text-slate-900 dark:text-white">Indemnity Agreement</h3>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 md:p-8 text-[11px] md:text-[12px] leading-relaxed text-slate-600 dark:text-slate-300 font-medium max-h-[400px] md:max-h-[600px]">
                    <div className="prose dark:prose-invert max-w-none space-y-3 md:space-y-4 text-justify">
                      <h4 className="text-base md:text-lg font-black uppercase text-primary text-center tracking-widest mb-3 md:mb-4 border-b border-primary/20 pb-4">Electronic Mail Indemnity</h4>
                      <p>
                        I/We, <span className="font-bold border-b border-slate-300 px-2">{surname} {firstName} {middleName}</span> (the "Customer") refer to the mandate between NOLT Finance Company Limited, (“the Company”) and the Customer governing the operation of the Customer’s account(s) and credit, investment or other transactions with the Company (the mandate).
                      </p>
                      <p>
                        I/We have requested the Company to consider and/or act on our instructions and/or other requests to the Company communicated from time to time via electronic mail (email) purportedly emanating from the email address(es) shown in the table below or such other email address that the Company may subsequently agree to act upon at the Customer's request (Email Instruction(s)). IN CONSIDERATION of the Company acting upon an Email Instruction, the Customer hereby formally, unreservedly, irrevocably, and unconditionally declares and covenants as follows:
                      </p>
                      <p>
                        1. That the Company is hereby authorized, in its sole discretion, to consider and/or act upon Email Instruction(s) without the necessity of any original signature(s) or conformity of the instruction with any other mandate or any inquiry on the Company's part as to the authority or identity of the person sending or purporting to send such instruction or the requirement of any other confirmation on the part of the Company.
                      </p>
                      <p>
                        2. The Company shall be entitled to treat any e-notice or e-communication described above as fully authorized by and binding upon the Customer and the Company shall be entitled (but not bound) to take such steps in connection with or in reliance upon such communication as the Company may in good faith consider appropriate, whether such communication includes instruction to pay money or credit any account, or relates to the disposition of any money or documents or purports to bind the Customer to any other type of transaction or arrangement whatsoever, regardless of the nature of the transaction or arrangement or the amount of money involved. Notwithstanding, the Company may at its discretion require that a scanned copy of email instructions be duly signed in accordance with the existing mandate.
                      </p>
                      <p>
                        3. In consideration of the Company acting in accordance with the term of this letter, the Customer undertakes to indemnify the Company and to keep the Company indemnified against all losses, claims, actions, proceedings, demands, costs and expenses incurred or sustained by the Company of whatever nature howsoever arising, out of or in connection with such notices, demands or other e-communication, provided that the Company acts in good faith.
                      </p>
                      <p>
                        4. The terms of this letter shall remain in full force and effect unless and until the Company receives a notice of termination from the Customer in writing (or signed by a duly authorized person), save that such termination will not release the Customer from any liability under this authority and indemnity in respect of any act performed by the Company in accordance with the terms of this letter prior to the expiry of such time.
                      </p>

                      <div className="mt-8 p-4 md:p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                        <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400">Email Address (This email address must be one that previously exists in the Company’s records)</p>
                        <div className="flex flex-col sm:grid sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                          <span className="font-bold text-slate-500 text-xs sm:text-sm uppercase tracking-tight">Primary email</span>
                          <div className="sm:col-span-2 h-10 border-b border-primary/30 flex items-center px-1 md:px-2 font-bold text-slate-800 dark:text-white text-sm md:text-base">
                            {contactEmail || '____________________'}
                          </div>
                        </div>
                        <div className="flex flex-col sm:grid sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                          <span className="font-bold text-slate-500 text-xs sm:text-sm uppercase tracking-tight">Alternate email</span>
                          <div className="sm:col-span-2 h-10 border-b border-slate-200 dark:border-slate-700 flex items-center px-1 md:px-2 text-slate-500 text-sm md:text-base">
                            ____________________
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-8 md:gap-12 mt-4 md:mt-6 p-2 md:p-6">
                        <div className="space-y-4 md:space-y-6 order-2 sm:order-1">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Date</p>
                            <div className="h-8 border-b border-slate-300 font-bold text-slate-800 dark:text-white">
                              {new Date().toLocaleDateString('en-GB')}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Customer Name</p>
                            <div className="h-8 border-b border-slate-300 font-bold text-slate-800 dark:text-white">
                              {surname} {firstName} {middleName}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2 flex flex-col justify-end order-1 sm:order-2">
                          <p className="text-xs font-bold text-slate-500 sm:text-right uppercase tracking-tight">Digital Signature Verified</p>
                          <div className="h-16 border-b border-slate-300 flex items-end sm:justify-end pb-2 opacity-80 transition-all">
                            {hasSigned ? (
                              <div className="flex items-center gap-2 text-green-500 font-black italic">
                                <span className="material-symbols-outlined filled">draw</span>
                                <span className="text-[10px] uppercase">Digitally Signed</span>
                              </div>
                            ) : <span className="text-[10px] text-slate-400 uppercase italic">Sign in the box to the right</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Signature Card */}
                <div className="w-full lg:w-[450px] bg-white dark:bg-slate-800 rounded-[2rem] md:rounded-[2.5rem] shadow-lg border border-slate-100 dark:border-slate-700 p-6 md:p-10 flex flex-col gap-6 md:gap-8">
                  <div>
                    <h3 className="font-black text-xl md:text-2xl text-slate-900 dark:text-white mb-1 tracking-tight">Digital Canvas</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Draw your signature in the box below</p>
                  </div>

                  <div className="relative group rounded-3xl overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-600 hover:border-primary transition-all bg-slate-50 shadow-inner">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={220}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseOut={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-56 cursor-crosshair touch-none"
                      style={{ touchAction: 'none' }}
                    />
                    {!hasSigned && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
                        <span className="material-symbols-outlined text-5xl mb-2">draw</span>
                        <span className="text-slate-400 text-xl font-black uppercase tracking-[0.25em]">Digital Sign</span>
                      </div>
                    )}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button onClick={() => signatureInputRef.current?.click()} className="text-[9px] font-black uppercase text-primary hover:text-white hover:bg-primary border border-primary/20 px-3 py-1 rounded-full transition-all bg-white/80 dark:bg-slate-800/80 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]">photo_camera</span>
                        Snap/Upload
                      </button>
                      <button
                        onClick={clearSignature}
                        className="text-[9px] font-black uppercase text-red-500 hover:text-white hover:bg-red-500 border border-red-500/20 px-3 py-1 rounded-full transition-all bg-white/80 dark:bg-slate-800/80"
                      >
                        Clear
                      </button>
                    </div>
                    <input type="file" ref={signatureInputRef} accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                  </div>

                  <div
                    className={`p-5 md:p-6 rounded-[2rem] border-2 transition-all cursor-pointer flex items-start gap-4 ${acceptedIndemnity ? 'border-primary bg-primary/5' : 'border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'}`}
                    onClick={() => setAcceptedIndemnity(!acceptedIndemnity)}
                  >
                    <div className="shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={acceptedIndemnity}
                        onChange={e => setAcceptedIndemnity(e.target.checked)}
                        className="size-6 rounded-lg accent-primary border-slate-300 cursor-pointer"
                      />
                    </div>
                    <label className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300 leading-snug cursor-pointer select-none">
                      I accept the terms of the Indemnity Agreement and confirm that the digital signature above is mine.
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 mt-6 md:mt-8 gap-6">
                <div className="flex gap-3 md:gap-4 w-full sm:w-auto">
                  <button onClick={() => setSubStep(12)} className="flex-1 sm:flex-none px-6 md:px-8 py-3 md:py-4 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-700 text-sm md:text-base">
                    <span className="material-symbols-outlined text-lg">arrow_back</span> Back
                  </button>
                </div>
                <button
                  onClick={submitLoan}
                  disabled={!acceptedIndemnity || !hasSigned || loading}
                  className={`w-full sm:w-auto px-10 md:px-12 py-3 md:py-4 rounded-full font-black text-base md:text-lg transition-all flex items-center justify-center gap-3 ${acceptedIndemnity && hasSigned && !loading ? 'bg-primary text-white shadow-xl shadow-primary/30 hover:-translate-y-1' : 'bg-slate-200 text-slate-400 cursor-not-allowed grayscale'}`}
                >
                  {submitting ? 'Processing...' : 'Complete Application'}
                  {!submitting && <span className="material-symbols-outlined">arrow_forward</span>}
                </button>
              </div>
            </div>
          )}
        </main>
      </div >
    </div >
  );
};

export default LoanFlow;