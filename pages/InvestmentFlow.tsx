import React, { useState, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { AppStep, SavedDraft, Currency, InvestmentPlan, PayoutFrequency, UserState } from '../types';
import { storageService } from '../services/storageService';
import { investmentService } from '../services/investmentService';
import GiftInvestmentFlow from './investment/GiftInvestmentFlow';

interface InvestmentFlowProps {
  navigate: (step: AppStep) => void;
  onComplete: () => void;
  formatMoney: (amount: number, curr?: string) => string;
  initialDraft?: SavedDraft | null;
  user: UserState;
}

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

const InvestmentFlow: React.FC<InvestmentFlowProps> = ({ navigate, onComplete, formatMoney, initialDraft, user }) => {
  const [searchParams] = useSearchParams();
  const giftTokenFromUrl = searchParams.get('gift_token') || sessionStorage.getItem('pending_gift_token');

  const [subStep, setSubStep] = useState(initialDraft?.subStep ?? 0);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClaimingGift, setIsClaimingGift] = useState(false);
  const [giftToken, setGiftToken] = useState<string | null>(giftTokenFromUrl);

  // Gifting State
  const [isGift, setIsGift] = useState<boolean>(initialDraft?.data?.isGift ?? false);
  const [recipientName, setRecipientName] = useState(initialDraft?.data?.recipientName ?? '');
  const [recipientEmail, setRecipientEmail] = useState(initialDraft?.data?.recipientEmail ?? '');
  const [recipientPhone, setRecipientPhone] = useState(initialDraft?.data?.recipientPhone ?? '');
  const [giftMessage, setGiftMessage] = useState(initialDraft?.data?.giftMessage ?? '');
  const [giftLink, setGiftLink] = useState(initialDraft?.data?.giftLink ?? '');
  const [showGiftPaymentModal, setShowGiftPaymentModal] = useState(false);
  const [isInfinityTenure, setIsInfinityTenure] = useState(initialDraft?.data?.isInfinityTenure ?? false);

  // Core State
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan>(initialDraft?.data?.selectedPlan ?? 'RISE');
  const [currency, setCurrency] = useState<Currency>(initialDraft?.data?.currency ?? 'NGN');
  const [amount, setAmount] = useState<string>(initialDraft?.data?.amount ?? '10000');
  const [tenure, setTenure] = useState<number>(initialDraft?.data?.tenure ?? 12);
  const [rollover, setRollover] = useState(initialDraft?.data?.rollover ?? 'principal_interest');
  const [targetAmount, setTargetAmount] = useState<string>(initialDraft?.data?.targetAmount ?? '');
  const [payoutFrequency, setPayoutFrequency] = useState<PayoutFrequency>(initialDraft?.data?.payoutFrequency ?? 'maturity');
  const [contributionFrequency, setContributionFrequency] = useState<'daily' | 'weekly' | 'monthly'>(initialDraft?.data?.contributionFrequency ?? 'monthly');

  // Entity & Identity
  const [entityType, setEntityType] = useState<'INDIVIDUAL' | 'CORPORATE'>(initialDraft?.data?.entityType ?? 'INDIVIDUAL');
  const [title, setTitle] = useState(initialDraft?.data?.title ?? 'Mr');
  const [fullName, setFullName] = useState(initialDraft?.data?.fullName ?? '');
  const [isOnBehalf, setIsOnBehalf] = useState(initialDraft?.data?.isOnBehalf ?? false);
  const [representativeRelation, setRepresentativeRelation] = useState(initialDraft?.data?.representativeRelation ?? '');
  const [isPep, setIsPep] = useState<boolean | null>(initialDraft?.data?.isPep ?? null);

  // Personal Details
  const [gender, setGender] = useState(initialDraft?.data?.gender ?? '');
  const [dob, setDob] = useState(initialDraft?.data?.dob ?? '');
  const [maidenName, setMaidenName] = useState(initialDraft?.data?.maidenName ?? '');
  const [religion, setReligion] = useState(initialDraft?.data?.religion ?? 'Prefer not to say');
  const [maritalStatus, setMaritalStatus] = useState(initialDraft?.data?.maritalStatus ?? 'Single');
  // Corporate specific fields (from LMS)
  const [isAuthorizedRep, setIsAuthorizedRep] = useState(initialDraft?.data?.isAuthorizedRep ?? false);
  const [authRepPhone, setAuthRepPhone] = useState(initialDraft?.data?.authRepPhone ?? '');
  const [rcNumber, setRcNumber] = useState(initialDraft?.data?.rcNumber ?? '');
  const [incorpDate, setIncorpDate] = useState(initialDraft?.data?.incorpDate ?? '');
  const [businessAddress, setBusinessAddress] = useState(initialDraft?.data?.businessAddress ?? '');
  const [businessNature, setBusinessNature] = useState(initialDraft?.data?.businessNature ?? '');
  const [tin, setTin] = useState(initialDraft?.data?.tin ?? '');
  const [directorCount, setDirectorCount] = useState<number>(initialDraft?.data?.directorCount ?? 1);
  const [directors, setDirectors] = useState<any[]>(initialDraft?.data?.directors ?? [{
      surname: '', firstName: '', middleName: '', phone: '', gender: '', dob: '', bvn: '', nin: '', isPep: false, photo: null, id_card: null
  }]);
  const [companyName, setCompanyName] = useState(initialDraft?.data?.companyName ?? '');
  
  // Name split for Individual (Requested refinement)
  const nameParts = (user.name || '').trim().split(/\s+/);
  const defSurname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  const defFirstName = nameParts[0] || '';
  const defMiddleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

  const [surname, setSurname] = useState(initialDraft?.data?.surname || defSurname);
  const [firstName, setFirstName] = useState(initialDraft?.data?.firstName || defFirstName);
  const [middleName, setMiddleName] = useState(initialDraft?.data?.middleName || defMiddleName);
  
  useEffect(() => {
    if (entityType === 'INDIVIDUAL') {
      setFullName(`${surname} ${firstName} ${middleName}`.replace(/\s+/g, ' ').trim());
    }
  }, [surname, firstName, middleName, entityType]);


  // Contact & Verification
  const [countryCode, setCountryCode] = useState(initialDraft?.data?.countryCode ?? '+234');
  const [mobileNumber, setMobileNumber] = useState(initialDraft?.data?.mobileNumber ?? '');
  const [contactEmail, setContactEmail] = useState(initialDraft?.data?.contactEmail || user.email || '');
  const [bvn, setBvn] = useState(initialDraft?.data?.bvn ?? '');
  const [nin, setNin] = useState(initialDraft?.data?.nin ?? '');

  // Address
  const [stateOfOrigin, setStateOfOrigin] = useState(initialDraft?.data?.stateOfOrigin ?? 'Abia');
  const [stateOfResidence, setStateOfResidence] = useState(initialDraft?.data?.stateOfResidence ?? 'Abia');
  const [homeAddress, setHomeAddress] = useState(initialDraft?.data?.homeAddress ?? '');

  // Next of Kin
  const [nokName, setNokName] = useState(initialDraft?.data?.nokName ?? '');
  const [nokRelationship, setNokRelationship] = useState(initialDraft?.data?.nokRelationship ?? '');
  const [nokAddress, setNokAddress] = useState(initialDraft?.data?.nokAddress ?? '');



  // Top-Up
  const [isTopUp, setIsTopUp] = useState(initialDraft?.data?.isTopUp ?? false);
  const [casaNumber, setCasaNumber] = useState(initialDraft?.data?.casaNumber ?? '');

  // Documents & Progress
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { name: string, size: string, url?: string } | null>>(
    initialDraft?.data?.uploadedDocs ?? {
      gov_id: null,
      utility_bill: null,
      selfie: null,
      secondary_id: null,
      cac_cert: null,
      memart: null,
      board_res: null
    }
  );

  const individualDocs = useMemo(() => [
    { id: 'gov_id', label: 'Government ID', icon: 'badge', required: true },
    { id: 'utility_bill', label: 'Utility Bill', icon: 'description', required: true },
    { id: 'selfie', label: 'Selfie', icon: 'add_a_photo', required: true },
    { id: 'secondary_id', label: 'Secondary Government ID/Doc', icon: 'assignment_ind', required: true }
  ], []);

  const corporateDocs = useMemo(() => {
    const docs: any[] = [];
    directors.forEach((director, index) => {
      const name = director.firstName && director.surname ? `${director.firstName} ${director.surname}` : `Director ${index + 1}`;
      docs.push({
        id: `director_photo_${index}`,
        label: `Photo of Director ${index + 1} (${name})`,
        icon: 'account_circle',
        required: true
      });
      docs.push({
        id: `director_id_${index}`,
        label: `ID Card of Director ${index + 1} (${name})`,
        icon: 'badge',
        required: true
      });
    });
    docs.push(
      { id: 'company_profile', label: 'Company Profile', icon: 'business', required: true },
      { id: 'status_report', label: 'Status Report', icon: 'analytics', required: true },
      { id: 'memart', label: 'Memorandum & Articles of Association', icon: 'menu_book', required: true },
      { id: 'board_resolution', label: 'Board Resolution of Authority to Transact with NOLT Finance', icon: 'gavel', required: true },
      { id: 'annual_returns', label: 'Evidence of Filing of Annual Returns', icon: 'history_edu', required: true },
      { id: 'utility_bill', label: 'Utility Bill', icon: 'home_work', required: true }
    );
    return docs;
  }, [directors]);

  const currentDocs = useMemo(() => entityType === 'CORPORATE' ? corporateDocs : individualDocs, [entityType, corporateDocs, individualDocs]);

  const isSecureVaultComplete = useMemo(() => {
    return currentDocs.filter(d => d.required).every(d => !!uploadedDocs[d.id]);
  }, [currentDocs, uploadedDocs]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [receiptProgress, setReceiptProgress] = useState(0);
  const [receiptFile, setReceiptFile] = useState<{ name: string; size: string, url?: string } | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [showProductInfo, setShowProductInfo] = useState(false);
  const [showRolloverInfo, setShowRolloverInfo] = useState(false);

  // Real Upload State
  const [draftId] = useState(`I-` + Date.now());
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});

  // Rate & Payout State
  const [dynamicInterestRate, setDynamicInterestRate] = useState<number | null>(initialDraft?.data?.interestRate ?? null);
  const [rateLoading, setRateLoading] = useState(false);
  const [serverMinAmount, setServerMinAmount] = useState<number>(initialDraft?.data?.serverMinAmount ?? 0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasSigned, setHasSigned] = useState(false);
  const [acceptedIndemnity, setAcceptedIndemnity] = useState(false);

  // Handle Gift Claim on Load
  useEffect(() => {
    if (giftToken) {
      const fetchGift = async () => {
        try {
          const gift = await investmentService.getGiftDetails(giftToken);
          if (gift) {
            setIsClaimingGift(true);
            setSelectedPlan(gift.plan_name);
            setAmount(gift.amount.toString());
            setTenure(gift.tenure_months);
            setCurrency(gift.currency);
            setSubStep(2); // Start at Identity Basics
          }
        } catch (err) {
          console.error("Gift claim error:", err);
          sessionStorage.removeItem('pending_gift_token');
        }
      };
      fetchGift();
    }
  }, [giftToken]);

  // Auto-Prefill from Existing Investment
  useEffect(() => {
    // If we are resuming a draft, don't stomp over it with old investment data
    if (initialDraft) {
      console.log("Resuming draft, skipping auto-prefill from latest investment");
      return;
    }

    const prefillData = async () => {
      try {
        const latestInfo = await investmentService.getLatestInvestment();
        if (latestInfo) {
          setFullName(latestInfo.rep_full_name || '');
          setMobileNumber(latestInfo.rep_phone_number || '');
          setBvn(latestInfo.rep_bvn || '');
          setNin(latestInfo.rep_nin || '');
          setStateOfOrigin(latestInfo.rep_state_of_origin || '');
          setStateOfResidence(latestInfo.rep_state_of_residence || '');
          setHomeAddress(latestInfo.rep_street_address || '');
          
          setIsPep(latestInfo.is_pep ?? null);
          setTitle(latestInfo.title || 'Mr');
          setGender(latestInfo.gender || '');
          setDob(latestInfo.dob ? new Date(latestInfo.dob).toISOString().split('T')[0] : '');
          setMaidenName(latestInfo.mother_maiden_name || '');
          setReligion(latestInfo.religion || 'Prefer not to say');
          setMaritalStatus(latestInfo.marital_status || 'Single');
          setContactEmail(latestInfo.customer_email || '');
          
          setNokName(latestInfo.nok_name || '');
          setNokRelationship(latestInfo.nok_relationship || '');
          setNokAddress(latestInfo.nok_address || '');
          
          setUploadedDocs(prev => {
            const updated = { ...prev };
            // Basic Docs
            if (latestInfo.rep_id_url) updated.gov_id = { name: 'Previous Gov ID', size: 'Pre-filled', url: latestInfo.rep_id_url };
            if (latestInfo.utility_bill_url) updated.utility_bill = { name: 'Previous Utility Bill', size: 'Pre-filled', url: latestInfo.utility_bill_url };
            if (latestInfo.rep_selfie_url) updated.selfie = { name: 'Previous Selfie', size: 'Pre-filled', url: latestInfo.rep_selfie_url };
            if (latestInfo.secondary_id_url) updated.secondary_id = { name: 'Previous Secondary ID', size: 'Pre-filled', url: latestInfo.secondary_id_url };
            
            // Corporate Docs (Mapping DB columns to UI IDs)
            if (latestInfo.company_profile_url) updated.company_profile = { name: 'Previous Corporate Doc', size: 'Pre-filled', url: latestInfo.company_profile_url };
            if (latestInfo.status_report_url) updated.status_report = { name: 'Previous Status Report', size: 'Pre-filled', url: latestInfo.status_report_url };
            if (latestInfo.memart_url) updated.memart = { name: 'Previous MeMart', size: 'Pre-filled', url: latestInfo.memart_url };
            if (latestInfo.board_resolution_url) updated.board_resolution = { name: 'Previous Board Resolution', size: 'Pre-filled', url: latestInfo.board_resolution_url };
            if (latestInfo.annual_returns_url) updated.annual_returns = { name: 'Previous Annual Returns', size: 'Pre-filled', url: latestInfo.annual_returns_url };
            
            return updated;
          });

          if (latestInfo.entity_type === 'CORPORATE') {
            setEntityType('CORPORATE');
            setCompanyName(latestInfo.company_name || '');
            setRcNumber(latestInfo.rc_number || '');
            setIncorpDate(latestInfo.date_of_incorporation ? new Date(latestInfo.date_of_incorporation).toISOString().split('T')[0] : '');
            setBusinessAddress(latestInfo.business_address || '');
            setBusinessNature(latestInfo.business_nature || '');
            setTin(latestInfo.tin || '');
            setIsAuthorizedRep(latestInfo.is_authorized_rep || false);
            setAuthRepPhone(latestInfo.auth_rep_phone || '');
            if (latestInfo.directors) {
                try {
                    const parsedDirectors = typeof latestInfo.directors === 'string' ? JSON.parse(latestInfo.directors) : latestInfo.directors;
                    setDirectors(parsedDirectors);
                    setDirectorCount(parsedDirectors.length);
                    
                    // Inject director documents from array into uploadedDocs
                    setUploadedDocs(prev => {
                      const updated = { ...prev };
                      parsedDirectors.forEach((dir: any, idx: number) => {
                        if (dir.photo) updated[`director_photo_${idx}`] = { name: 'Previous Photo', size: 'Pre-filled', url: dir.photo };
                        if (dir.id_card) updated[`director_id_${idx}`] = { name: 'Previous ID Card', size: 'Pre-filled', url: dir.id_card };
                      });
                      return updated;
                    });
                } catch (e) { console.error("Error parsing directors:", e); }
            }
          }
        }
      } catch (err) {
        console.error("Error pre-filling data:", err);
      }
    };
    prefillData();
  }, [initialDraft]); // Combined with draft check

  // Rate Calculation (Dynamic from Backend)
  useEffect(() => {
    const fetchRate = async () => {
      const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
      if (!numericAmount || !selectedPlan || !currency) {
        setDynamicInterestRate(null);
        return;
      }

      setRateLoading(true);
      try {
        const data = await investmentService.getRate({
          plan: selectedPlan,
          currency,
          amount: numericAmount,
          tenure
        });

        if (data) {
          setDynamicInterestRate(data.interest_rate);
          setServerMinAmount(data.min_amount);
        } else {
          setDynamicInterestRate(null);
          setServerMinAmount(0);
        }
      } catch (err) {
        console.error("Error fetching rate:", err);
        setDynamicInterestRate(null);
      } finally {
        setRateLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchRate, 500);
    return () => clearTimeout(debounceTimer);
  }, [amount, tenure, selectedPlan, currency]);

  const interestRate = dynamicInterestRate ?? 0;

  const returns = useMemo(() => {
    const principal = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
    const rateToUse = interestRate;
    const interestEarned = (principal * rateToUse * (tenure / 12)) / 100;
    return { principal, interestEarned, total: principal + interestEarned };
  }, [amount, tenure, interestRate]);

  const minAmount = useMemo(() => {
    if (serverMinAmount > 0) return serverMinAmount;
    if (selectedPlan === 'VAULT') return currency === 'NGN' ? 100000 : 10000;
    return 10000;
  }, [selectedPlan, currency, serverMinAmount]);

  // Navigation Logic
const handleSaveDraft = (nextStep: number) => {
    storageService.saveDraft({
      id: draftId,
      progress: Math.floor((nextStep / 12) * 100),
      lastSaved: new Date().toLocaleString(),
      type: selectedPlan,
      amount: parseFloat(amount.replace(/[^0-9.]/g, '') || '0'),
      subStep: nextStep,
      data: {
        selectedPlan, currency, amount, tenure, rollover, targetAmount, payoutFrequency, contributionFrequency,
        entityType, title, fullName, surname, firstName, middleName, isOnBehalf, representativeRelation, isPep,
        gender, dob, maidenName, religion, maritalStatus, countryCode, mobileNumber, contactEmail, bvn, nin,
        stateOfOrigin, stateOfResidence, homeAddress, nokName, nokRelationship, nokAddress,
        companyName, businessAddress, incorpDate, rcNumber, businessNature, directors, 
        isAuthorizedRep, authRepPhone, tin, uploadedDocs, isTopUp, casaNumber, giftToken, isClaimingGift
      }
    } as any);
  };

  const handleNext = () => {
    // Age Validation
    if (subStep === 3 && entityType === 'INDIVIDUAL' && dob) {
      const birthDate = new Date(dob);
      const age = (new Date().getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 18) {
        alert("Applicant must be at least 18 years old to proceed.");
        return;
      }
    }

    if (isGift) {
      if (subStep === 3) {
        handleGiftSubmit();
        return;
      }
      handleSaveDraft(subStep + 1);
      setSubStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (isClaimingGift) {
      if (subStep === 9) { 
        handleSaveDraft(11);
        setSubStep(11); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (subStep === 11) {
        handleSubmit(); 
        return;
      }
    } else {
      if (subStep === 11) {
        handleSubmit(); 
        return;
      }
    }

    let nextStep = subStep + 1;
    if (entityType === 'CORPORATE' && subStep === 3) {
      nextStep = 9; // Skip Individual flow steps
    }

    handleSaveDraft(nextStep);
    setSubStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

const handleBack = () => {
    if (isGift) {
      if (subStep === 0) navigate('PRODUCT_SELECT');
      else setSubStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (subStep > 0) {
      let prevStep = subStep - 1;
      if (entityType === 'CORPORATE' && subStep === 9) {
        prevStep = 3;
      }
      setSubStep(prevStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('PRODUCT_SELECT');
    }
  };

  const handleSaveAndExit = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      navigate('DASHBOARD');
    }, 1000);
  };

  const handleFileUpload = async (id: string, file: File) => {
    setIsUploading(prev => ({ ...prev, [id]: true }));
    setUploadProgress(prev => ({ ...prev, [id]: 10 }));
    try {
      const result = await investmentService.uploadDocument(file, draftId, id);
      const url = result.document.file_url;
      setUploadedDocs(prev => ({ ...prev, [id]: { name: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, url } }));
      
      // Sync with directors array if it's a director document
      if (id.startsWith('director_')) {
        const parts = id.split('_');
        const type = parts[1]; // photo or id
        const index = parseInt(parts[2]);
        if (!isNaN(index)) {
          setDirectors(prev => {
            const next = [...prev];
            if (next[index]) {
              if (type === 'photo') next[index].photo = url;
              if (type === 'id') next[index].id_card = url;
            }
            return next;
          });
        }
      }

      setUploadProgress(prev => ({ ...prev, [id]: 100 }));
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Please try again.");
      setUploadProgress(prev => ({ ...prev, [id]: 0 }));
    } finally {
      setIsUploading(prev => ({ ...prev, [id]: false }));
    }
  };

  const simulateReceiptUpload = () => {
    setReceiptProgress(10);
    let prog = 10;
    const interval = setInterval(() => {
      prog += 20;
      setReceiptProgress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        setReceiptFile({ name: 'payment_receipt.png', size: '450 KB', url: '#' });
      }
    }, 200);
  };

  const removeDoc = (id: string) => {
    setUploadedDocs(prev => ({ ...prev, [id]: null }));
    setUploadProgress(prev => ({ ...prev, [id]: 0 }));
  };

  const handleGiftSubmit = () => {
    if (!recipientEmail.includes('@')) return alert("Enter a valid recipient email");
    // @ts-ignore
    const handler = window.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email: contactEmail || recipientEmail,
      amount: Math.round(parseFloat(amount) * 100),
      currency: 'NGN',
      ref: `GIFT_${Date.now()}`,
      metadata: {
        type: 'GIFT_INVESTMENT',
        plan: selectedPlan,
        tenure: tenure,
        recipientEmail,
        recipientName,
        giftMessage,
        currency
      },
      callback: (response: any) => {
        window.location.href = `/investment/verify-payment?reference=${response.reference}`;
      },
      onClose: () => {
        alert('Payment cancelled');
      }
    });
    handler.openIframe();
  };

  const handleSubmit = async () => {
    if (isClaimingGift || giftToken) {
      finalizeInvestment(`G_CLAIM_${giftToken || Date.now()}`);
      return;
    }

    if (!contactEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return alert("Please enter a valid email address.");
    if (mobileNumber.length < 10) return alert("Please enter a valid mobile number.");

    // @ts-ignore
    const handler = window.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email: contactEmail,
      amount: Math.round(parseFloat(amount) * 100),
      currency: 'NGN',
      ref: `INV_${Date.now()}`,
      callback: (response: any) => {
        finalizeInvestment(response.reference);
      },
      onClose: () => {
        alert('Transaction was not completed, window closed.');
      }
    });
    handler.openIframe();
  };

  const finalizeInvestment = async (reference: string) => {
    setLoading(true);
    try {
      // Step 1: BVN Validation (Zeeh API)
      // For individuals or authorized representatives in corporate
      const bvnToCheck = bvn; 
      
      console.log("[BVN Validation] Starting verification for:", bvnToCheck);
      try {
        const kycResponse = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/kyc/verify-bvn`, {
            bvn: bvnToCheck,
            firstName,
            dob,
            mobileNumber
        }, { withCredentials: true });

        console.log("[BVN Validation] Success:", kycResponse.data);
      } catch (kycErr: any) {
        console.error("[BVN Validation] Failed:", kycErr.response?.data);
        const errorData = kycErr.response?.data;
        
        let errorMessage = errorData?.message || "BVN verification failed. Please check your details.";
        
        // If it's a mismatch error, provide more detail
        if (errorData?.matches) {
            const missing = [];
            if (!errorData.matches.firstName) missing.push("First Name");
            if (!errorData.matches.dob) missing.push("Date of Birth");
            if (!errorData.matches.phone) missing.push("Phone Number");
            errorMessage = `Identity Verification Failed: The details on your BVN do not match your input for: ${missing.join(', ')}. At least 2 matches are required to continue.`;
        }

        alert(errorMessage);
        setLoading(false);
        return; // STOP submission
      }

      // Step 2: Create Investment
      const payload = {
        investment_type: `NOLT_${selectedPlan}`,
        investment_amount: parseFloat(amount),
        tenure_days: tenure * 30, // Months to days approx
        currency,
        giftToken, // For linking if claim
        payment_reference: reference, // reference is already handled by caller (G_CLAIM_... or Paystack ref)
        
        // Corporate Fields
        entity_type: entityType,
        company_name: entityType === 'CORPORATE' ? companyName : null,
        rc_number: entityType === 'CORPORATE' ? rcNumber : null,
        incorp_date: entityType === 'CORPORATE' ? incorpDate : null,
        tin: entityType === 'CORPORATE' ? tin : null,
        business_nature: entityType === 'CORPORATE' ? businessNature : null,
        business_address: entityType === 'CORPORATE' ? businessAddress : null,
        is_authorized_rep: entityType === 'CORPORATE' ? isAuthorizedRep : false,
        auth_rep_phone: entityType === 'CORPORATE' ? authRepPhone : null,
        directors: entityType === 'CORPORATE' ? directors : [],

        // ... bio data ...
        rep_full_name: fullName,
        rep_phone_number: mobileNumber,
        rep_bvn: bvn,
        rep_nin: nin,
        rep_state_of_origin: stateOfOrigin,
        rep_state_of_residence: stateOfResidence,
        rep_street_address: homeAddress,
        title, gender, dob, mother_maiden_name: maidenName, religion, marital_status: maritalStatus,
        is_pep: isPep,
        directors_are_pep: isPep, // Corporate PEP flag
        nok_name: nokName, nok_relationship: nokRelationship, nok_address: nokAddress,
        target_amount: targetAmount, rollover_option: rollover, contribution_frequency: contributionFrequency,
        interest_rate: dynamicInterestRate,
        custom_email: contactEmail, // For record keeping
        rep_house_number: '', // Add if needed, using empty for now
        draft_id: draftId,
        // Map URLs from uploadedDocs
        rep_selfie_url: uploadedDocs.selfie?.url || null,
        rep_id_url: uploadedDocs.gov_id?.url || null,
        secondary_id_url: uploadedDocs.secondary_id?.url || null,
        utility_bill_url: uploadedDocs.utility_bill?.url || null,
        // Corporate Document Mappings
        cac_url: uploadedDocs.company_profile?.url || null,
        company_profile_url: uploadedDocs.company_profile?.url || null,
        status_report_url: uploadedDocs.status_report?.url || null,
        memart_url: uploadedDocs.memart?.url || null,
        board_resolution_url: uploadedDocs.board_resolution?.url || null,
        annual_returns_url: uploadedDocs.annual_returns?.url || null,
        signatures: [canvasRef.current?.toDataURL() || ""]
      };

      await investmentService.createInvestment(payload);
      if (giftToken) localStorage.removeItem('pending_gift_token');
      setSubStep(12); // Go to success page
    } catch (err) {
      console.error("Submission error:", err);
      alert("Something went wrong with recording your investment. Please contact support with reference: " + reference);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = () => {
    setIsVerifyingPayment(true);
    setTimeout(() => {
      setIsVerifyingPayment(false);
      setPaymentVerified(true);
      setTimeout(() => {
        onComplete();
        navigate('DASHBOARD');
      }, 1500);
    }, 2000);
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

  const CBNLogo = () => (
    <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-700 flex flex-col items-center gap-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Regulated & Secured</p>
      <img src="https://noltfinance.s3.us-east-1.amazonaws.com/Licensed+by+CBN.png" alt="Licensed by CBN" className="h-10 md:h-12 w-auto opacity-80 grayscale hover:grayscale-0 transition-all" />
    </div>
  );

  const totalSteps = selectedPlan === 'RISE' ? 14 : (selectedPlan === 'VAULT' ? 13 : 13);
  const currentStep = subStep + 1;

  // Render Logic
  if (isGift) {
    return (
      <GiftInvestmentFlow
        subStep={subStep}
        setSubStep={setSubStep}
        selectedPlan={selectedPlan}
        setSelectedPlan={setSelectedPlan}
        recipientName={recipientName}
        setRecipientName={setRecipientName}
        recipientEmail={recipientEmail}
        setRecipientEmail={setRecipientEmail}
        recipientPhone={recipientPhone}
        setRecipientPhone={setRecipientPhone}
        giftMessage={giftMessage}
        setGiftMessage={setGiftMessage}
        amount={amount}
        setAmount={setAmount}
        currency={currency}
        setCurrency={setCurrency}
        tenure={tenure}
        setTenure={setTenure}
        isInfinityTenure={isInfinityTenure}
        setIsInfinityTenure={setIsInfinityTenure}
        payoutFrequency={payoutFrequency}
        setPayoutFrequency={setPayoutFrequency}
        rollover={rollover}
        setRollover={setRollover}
        targetAmount={targetAmount}
        setTargetAmount={setTargetAmount}
        interestRate={dynamicInterestRate}
        returns={returns}
        dynamicInterestRate={dynamicInterestRate}
        formatMoney={formatMoney}
        handleNext={handleNext}
        handleBack={handleBack}
        handleGiftSubmit={handleGiftSubmit}
        showProductInfo={showProductInfo}
        setShowProductInfo={setShowProductInfo}
        showRolloverInfo={showRolloverInfo}
        setShowRolloverInfo={setShowRolloverInfo}
        minAmount={minAmount}
        rateLoading={rateLoading}
      />
    );
  }

  // Render Logic
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 relative">
      {/* Product Pill */}
      <div className="absolute top-6 right-6 z-50">
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-lg border border-slate-100 dark:border-slate-700">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">NOLT {selectedPlan}</span>
          <button onClick={() => setShowProductInfo(!showProductInfo)} className="size-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-primary hover:text-white transition-all">
            <span className="material-symbols-outlined text-xs">info</span>
          </button>
        </div>
      </div>

      {subStep < 12 && (
        <div className="flex flex-col gap-3 mb-12 animate-in fade-in duration-700">
          <div className="flex gap-6 justify-between items-end">
            <p className="text-slate-900 dark:text-white text-base font-black uppercase tracking-widest">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
          <div className="rounded-full bg-slate-200 dark:bg-slate-800 h-2.5 w-full overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-700 ease-out" style={{ width: `${(currentStep / totalSteps) * 100}%` }}></div>
          </div>
        </div>
      )}

      {/* Step 0: Plan Selection */}
      {subStep === 0 && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center md:text-left space-y-3">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Investment Plan</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-2xl">Choose a growth strategy that aligns with your financial horizon.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['RISE', 'SURGE', 'VAULT'].map((plan) => (
              <button key={plan} onClick={() => { setSelectedPlan(plan as InvestmentPlan); handleNext(); }} className={`group p-8 rounded-[2.5rem] border-2 transition-all text-left flex flex-col gap-5 shadow-xl ${selectedPlan === plan ? 'border-primary bg-white dark:bg-slate-800' : 'border-slate-100 dark:border-slate-800 bg-white/50 hover:border-primary/50'}`}>
                <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-3xl filled">{plan === 'RISE' ? 'rocket_launch' : plan === 'SURGE' ? 'bolt' : 'lock'}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black mb-2 uppercase tracking-tight dark:text-white">NOLT {plan}</h3>
                  <p className="text-slate-500 font-bold leading-relaxed text-sm">{plan === 'RISE' ? 'Recurring savings for long-term growth.' : plan === 'SURGE' ? 'High yield, flexible liquidity.' : 'Fixed term, guaranteed returns.'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Entity Profile */}
      {subStep === 1 && (
        <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Identity Profile</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <button onClick={() => { setEntityType('INDIVIDUAL'); handleNext(); }} className={`group p-10 rounded-[3rem] border-2 transition-all text-left flex items-center gap-8 ${entityType === 'INDIVIDUAL' ? 'border-primary bg-white dark:bg-slate-800 shadow-xl' : 'border-slate-100 dark:border-slate-800 bg-white/50 hover:border-primary/50'}`}>
              <div className="size-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all"><span className="material-symbols-outlined text-4xl filled">person</span></div>
              <div className="flex-1"><h3 className="text-2xl font-black uppercase tracking-tight dark:text-white">Individual</h3><p className="text-slate-500 font-bold text-sm">Personal savings or child education.</p></div>
            </button>
            <button onClick={() => { setEntityType('CORPORATE'); handleNext(); }} className={`group p-10 rounded-[3rem] border-2 transition-all text-left flex items-center gap-8 ${entityType === 'CORPORATE' ? 'border-primary bg-white dark:bg-slate-800 shadow-xl' : 'border-slate-100 dark:border-slate-800 bg-white/50 hover:border-primary/50'}`}>
              <div className="size-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all"><span className="material-symbols-outlined text-4xl filled">business</span></div>
              <div className="flex-1"><h3 className="text-2xl font-black uppercase tracking-tight dark:text-white">Corporate</h3><p className="text-slate-500 font-bold text-sm">Business reserves or treasury.</p></div>
            </button>
          </div>
          <button onClick={handleBack} className="flex items-center gap-2 text-slate-400 font-black uppercase tracking-widest text-sm hover:text-primary transition-colors"><span className="material-symbols-outlined">arrow_back</span> Back</button>
        </div>
      )}

      {/* Step 2: Identity Basics */}
            {subStep === 2 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <h2 className="text-3xl font-black dark:text-white">Identity Basics</h2>
          
          {entityType === 'INDIVIDUAL' ? (
            <div className="grid gap-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Surname</label>
                  <input  className={`w-full h-16 rounded-2xl b g-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none ${entityType === 'INDIVIDUAL' ? 'opacity-70 cursor-not-allowed select-none' : ''}`} value={surname} onChange={e => setSurname(e.target.value)} placeholder="Surname" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">First Name</label>
                  <input  className={`w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none ${entityType === 'INDIVIDUAL' ? 'opacity-70 cursor-not-allowed select-none' : ''}`} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First Name" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Middle Name (Optional)</label>
                  <input  className={`w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none ${entityType === 'INDIVIDUAL' ? 'opacity-70 cursor-not-allowed select-none' : ''}`} value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Middle Name" />
                </div>
              </div>
              <div className="space-y-2"><label className="text-sm font-black text-slate-500 uppercase">Title</label><div className="flex gap-2">{['Mr', 'Mrs', 'Ms', 'Dr'].map(t => <button key={t} onClick={() => setTitle(t)} className={`px-6 py-3 rounded-xl border-2 font-bold transition-all ${title === t ? 'bg-primary border-primary text-white' : 'border-slate-100 dark:border-slate-700 dark:text-white'}`}>{t}</button>)}</div></div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase leading-snug">Are you a Politically Exposed Person (PEP)?</label>
                <div className="flex gap-4">
                  <button onClick={() => setIsPep(true)} className={`flex-1 h-14 rounded-xl border-2 font-black transition-all ${isPep === true ? 'bg-primary border-primary text-white' : 'border-slate-100 dark:border-slate-700 dark:text-white'}`}>Yes</button>
                  <button onClick={() => setIsPep(false)} className={`flex-1 h-14 rounded-xl border-2 font-black transition-all ${isPep === false ? 'bg-primary border-primary text-white' : 'border-slate-100 dark:border-slate-700 dark:text-white'}`}>No</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase">Name of Company</label>
                <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Enter company name" />
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      checked={isAuthorizedRep} 
                      onChange={e => setIsAuthorizedRep(e.target.checked)}
                      className="peer size-6 appearance-none rounded-lg border-2 border-slate-200 dark:border-slate-700 checked:bg-primary checked:border-primary transition-all cursor-pointer"
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none">
                      <span className="material-symbols-outlined text-sm font-bold">check</span>
                    </span>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">I am an Authorized Representative</span>
                </label>
                {isAuthorizedRep && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-sm font-black text-slate-500 uppercase">Representative Phone Number</label>
                    <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={authRepPhone} onChange={e => setAuthRepPhone(e.target.value)} placeholder="080..." />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">RC Number</label>
                  <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={rcNumber} onChange={e => setRcNumber(e.target.value)} placeholder="RC123456" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Date of Incorporation</label>
                  <input type="date" className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={incorpDate} onChange={e => setIncorpDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase">Business Address</label>
                <textarea rows={2} className="w-full p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-lg font-bold dark:text-white focus:border-primary outline-none" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder="Full company address" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Nature of Business</label>
                  <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={businessNature} onChange={e => setBusinessNature(e.target.value)} placeholder="e.g. Finance, Tech" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Tax Identification Number (TIN)</label>
                  <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={tin} onChange={e => setTin(e.target.value)} placeholder="1234567-0001" />
                </div>
              </div>
            </div>
          )}
          <NavActions isNextDisabled={entityType === 'INDIVIDUAL' ? (!fullName || isPep === null) : (!companyName || !rcNumber || !incorpDate || !businessAddress)} />
        </div>
      )}

      {/* Step 3: Personal Details */}
            {subStep === 3 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {entityType === 'INDIVIDUAL' ? (
              <>
                <h2 className="text-3xl font-black dark:text-white">Personal Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase">Gender</label>
                    <select className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={gender} onChange={e => setGender(e.target.value)}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase">Date of Birth</label>
                    <input type="date" className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={dob} onChange={e => setDob(e.target.value)} />
                  </div>
                </div>
                <NavActions isNextDisabled={!gender || !dob} />
              </>
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black dark:text-white">Director Details</h2>
                    <p className="text-slate-500 font-medium">Please provide information for at least one director.</p>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Number of Directors</label>
                    <select 
                      className="h-14 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-4 font-bold dark:text-white outline-none focus:border-primary"
                      value={directorCount}
                      onChange={e => {
                        const count = parseInt(e.target.value);
                        setDirectorCount(count);
                        const newDirectors = [...directors];
                        if (count > newDirectors.length) {
                          for (let i = newDirectors.length; i < count; i++) {
                            newDirectors.push({
                              surname: '', firstName: '', middleName: '', phone: '', gender: '', dob: '', bvn: '', nin: '', isPep: false
                            });
                          }
                        } else {
                          newDirectors.splice(count);
                        }
                        setDirectors(newDirectors);
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-12">
                  {directors.map((director, index) => (
                    <div key={index} className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xl space-y-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-2 h-full bg-primary"></div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-primary uppercase tracking-widest">Director {index + 1}</h3>
                        {directors.length > 1 && (
                          <button onClick={() => {
                              const newDirectors = directors.filter((_, i) => i !== index);
                              setDirectors(newDirectors);
                              setDirectorCount(newDirectors.length);
                            }} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-all" title="Remove Director"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Surname</label>
                          <input className="w-full h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-5 text-base font-bold dark:text-white focus:border-primary outline-none" value={director.surname} onChange={e => { const newD = [...directors]; newD[index].surname = e.target.value; setDirectors(newD); }} placeholder="Surname" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">First Name</label>
                          <input className="w-full h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-5 text-base font-bold dark:text-white focus:border-primary outline-none" value={director.firstName} onChange={e => { const newD = [...directors]; newD[index].firstName = e.target.value; setDirectors(newD); }} placeholder="First Name" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Middle Name (Optional)</label>
                          <input className="w-full h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-5 text-base font-bold dark:text-white focus:border-primary outline-none" value={director.middleName} onChange={e => { const newD = [...directors]; newD[index].middleName = e.target.value; setDirectors(newD); }} placeholder="Middle Name" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                          <input className="w-full h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-5 text-base font-bold dark:text-white focus:border-primary outline-none" value={director.phone} onChange={e => { const newD = [...directors]; newD[index].phone = e.target.value; setDirectors(newD); }} placeholder="080..." />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Gender</label>
                          <select className="w-full h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-5 text-base font-bold dark:text-white focus:border-primary outline-none" value={director.gender} onChange={e => { const newD = [...directors]; newD[index].gender = e.target.value; setDirectors(newD); }}>
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Date of Birth</label>
                          <input type="date" className="w-full h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-5 text-base font-bold dark:text-white focus:border-primary outline-none" value={director.dob} onChange={e => { const newD = [...directors]; newD[index].dob = e.target.value; setDirectors(newD); }} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">BVN</label>
                          <input className="w-full h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-5 text-base font-bold dark:text-white focus:border-primary outline-none" value={director.bvn} onChange={e => { const newD = [...directors]; newD[index].bvn = e.target.value; setDirectors(newD); }} maxLength={11} placeholder="11 digits" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">NIN</label>
                          <input className="w-full h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-5 text-base font-bold dark:text-white focus:border-primary outline-none" value={director.nin} onChange={e => { const newD = [...directors]; newD[index].nin = e.target.value; setDirectors(newD); }} maxLength={11} placeholder="11 digits" />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-sm font-black text-slate-500 uppercase">Is your Director a Politically Exposed Person (PEP)?</label>
                        <div className="flex gap-4 max-w-xs">
                          <button onClick={() => { const newD = [...directors]; newD[index].isPep = true; setDirectors(newD); }} className={`flex-1 h-12 rounded-xl border-2 font-black transition-all ${director.isPep === true ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'border-slate-100 dark:border-slate-700 dark:text-white'}`}>Yes</button>
                          <button onClick={() => { const newD = [...directors]; newD[index].isPep = false; setDirectors(newD); }} className={`flex-1 h-12 rounded-xl border-2 font-black transition-all ${director.isPep === false ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'border-slate-100 dark:border-slate-700 dark:text-white'}`}>No</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <NavActions isNextDisabled={directors.some(d => !d.surname || !d.firstName || !d.phone || !d.gender || !d.dob || d.bvn.length < 11 || d.nin.length < 11)} />
              </>
            )}
        </div>
      )}

      {/* Step 4: Further Details */}
      {subStep === 4 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <h2 className="text-3xl font-black dark:text-white">Further Details</h2>
          <div className="grid gap-6">
            <div className="space-y-2"><label className="text-sm font-black text-slate-500 uppercase">Mother's Maiden Name</label><input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={maidenName} onChange={e => setMaidenName(e.target.value)} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2"><label className="text-sm font-black text-slate-500 uppercase">Religion</label><select className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={religion} onChange={e => setReligion(e.target.value)}><option value="Christianity">Christianity</option><option value="Islam">Islam</option></select></div>
              <div className="space-y-2"><label className="text-sm font-black text-slate-500 uppercase">Marital Status</label><select className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)}><option value="Single">Single</option><option value="Married">Married</option></select></div>
            </div>
          </div>
          <NavActions isNextDisabled={!maidenName} />
        </div>
      )}

      {/* Step 5: Contact Info */}
      {subStep === 5 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <h2 className="text-3xl font-black dark:text-white">Contact Information</h2>
          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-500 uppercase">Mobile Number</label>
              <input
                type="tel"
                className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none"
                value={mobileNumber}
                onChange={e => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 08012345678"
                maxLength={11}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-500 uppercase">Email Address</label>
              <input
                type="email"
                readOnly={entityType === 'INDIVIDUAL'}
                className={`w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none ${entityType === 'INDIVIDUAL' ? 'opacity-70 cursor-not-allowed select-none' : ''}`}
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="e.g. name@example.com"
              />
            </div>
          </div>
          <NavActions isNextDisabled={mobileNumber.length < 10 || !contactEmail.includes('@')} />
        </div>
      )}

      {/* Step 6: Verification */}
      {subStep === 6 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <h2 className="text-3xl font-black dark:text-white">Verification</h2>
          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-500 uppercase">BVN</label>
              <input
                className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none"
                value={bvn}
                onChange={e => setBvn(e.target.value.replace(/\D/g, ''))}
                maxLength={11}
                placeholder="11-digit BVN"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-500 uppercase">NIN</label>
              <input
                className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none"
                value={nin}
                onChange={e => setNin(e.target.value.replace(/\D/g, ''))}
                maxLength={11}
                placeholder="11-digit NIN"
              />
            </div>
          </div>
          <NavActions isNextDisabled={bvn.length < 11 || nin.length < 11} />
        </div>
      )}

      {/* Step 7: Address */}
      {subStep === 7 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <h2 className="text-3xl font-black dark:text-white">Address Details</h2>
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2"><label className="text-sm font-black text-slate-500 uppercase">State of Origin</label><select className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={stateOfOrigin} onChange={e => setStateOfOrigin(e.target.value)}>{NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div className="space-y-2"><label className="text-sm font-black text-slate-500 uppercase">State of Residence</label><select className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={stateOfResidence} onChange={e => setStateOfResidence(e.target.value)}>{NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
            <div className="space-y-2"><label className="text-sm font-black text-slate-500 uppercase">Full Home Address</label><textarea rows={3} className="w-full p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-lg font-bold dark:text-white focus:border-primary outline-none" value={homeAddress} onChange={e => setHomeAddress(e.target.value)} /></div>
          </div>
          <NavActions isNextDisabled={!homeAddress} />
        </div>
      )}

      {/* Step 8: NOK */}
      {subStep === 8 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <h2 className="text-3xl font-black dark:text-white">Next of Kin</h2>
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2"><label className="text-sm font-black text-slate-500 uppercase">Full Name</label><input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none" value={nokName} onChange={e => setNokName(e.target.value)} placeholder="Full Name" /></div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase">Relationship</label>
                <select
                  className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:border-primary outline-none"
                  value={nokRelationship}
                  onChange={e => setNokRelationship(e.target.value)}
                >
                  <option value="">Select Relationship</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Child">Child</option>
                  <option value="Relative">Relative</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="space-y-2"><label className="text-sm font-black text-slate-500 uppercase">Contact Address</label><textarea rows={2} className="w-full p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-lg font-bold dark:text-white focus:border-primary outline-none" value={nokAddress} onChange={e => setNokAddress(e.target.value)} placeholder="Address" /></div>
          </div>
          <NavActions isNextDisabled={!nokName || !nokRelationship} />
        </div>
      )}

      {/* Step 9: Docs */}
      {subStep === 9 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
          <h2 className="text-3xl font-black dark:text-white">Secure Vault</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {currentDocs.map(doc => (
              <div key={doc.id} className="relative">
                <input
                  type="file"
                  id={`upload-${doc.id}`}
                  className="hidden"
                  onChange={e => e.target.files && handleFileUpload(doc.id, e.target.files[0])}
                />
                <label
                  htmlFor={`upload-${doc.id}`}
                  className={`p-10 rounded-[2.5rem] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center gap-5 w-full min-h-[200px] justify-center ${uploadedDocs[doc.id] ? 'border-green-500 bg-green-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5'}`}
                >
                  {uploadedDocs[doc.id] ? (
                    <div className="size-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/20"><span className="material-symbols-outlined text-3xl">task_alt</span></div>
                  ) : isUploading[doc.id] ? (
                    <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  ) : (
                    <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all"><span className="material-symbols-outlined text-3xl">{doc.icon}</span></div>
                  )}
                  <div className="text-center space-y-2">
                    <h4 className="font-black text-sm uppercase tracking-tight dark:text-white">{doc.label}</h4>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{doc.required ? 'Required' : 'Optional'}</p>
                    {uploadedDocs[doc.id] && <p className="text-[10px] text-primary font-black truncate max-w-[150px] mx-auto bg-primary/10 px-3 py-1 rounded-full">{uploadedDocs[doc.id]?.name}</p>}
                  </div>
                  {uploadProgress[doc.id] > 0 && uploadProgress[doc.id] < 100 && (
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2 shadow-inner">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress[doc.id]}%` }}></div>
                    </div>
                  )}
                  {uploadedDocs[doc.id] && (
                    <button onClick={(e) => { e.preventDefault(); removeDoc(doc.id); }} className="absolute top-6 right-6 p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-all">
                      <span className="material-symbols-outlined text-lg">cancel</span>
                    </button>
                  )}
                </label>
              </div>
            ))}
          </div>
          <NavActions isNextDisabled={!isSecureVaultComplete} />
        </div>
      )}

      {/* Step 10: Config */}
      {subStep === 10 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-start">
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Investment Configuration</h1>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-7 flex flex-col gap-10">
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <label className="text-sm font-black text-slate-500 uppercase tracking-widest">Investment Amount</label>
                          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                            <button disabled={isClaimingGift} onClick={() => setCurrency('NGN')} className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${currency === 'NGN' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}>NGN</button>
                            {(selectedPlan === 'VAULT') && (
                              <button disabled={isClaimingGift} onClick={() => setCurrency('USD')} className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${currency === 'USD' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}>USD</button>
                            )}
                          </div>
                        </div>
                        <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">{currency === 'NGN' ? '₦' : '$'}</span>
                            <input disabled={isClaimingGift} className="w-full h-20 pl-14 pr-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-3xl font-black text-slate-900 dark:text-white focus:border-primary outline-none transition-all" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))} />
                        </div>
                        {(!dynamicInterestRate && !rateLoading && parseFloat(amount) > 0) && (
                          <p className="text-xs font-bold text-red-500 mt-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">warning</span>
                            No valid interest rate found for this amount and tenure.
                          </p>
                        )}
                        {(parseFloat(amount) < minAmount && amount) && (
                          <p className="text-xs font-bold text-red-500 mt-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">warning</span>
                            Minimum investment for NOLT {selectedPlan} is {formatMoney(minAmount, currency)}
                          </p>
                        )}
                    </div>
                    {selectedPlan === 'RISE' && (
                        <div className="space-y-4">
                            <label className="text-sm font-black text-slate-500 uppercase tracking-widest">Target Amount (Optional)</label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">{currency === 'NGN' ? '₦' : '$'}</span>
                                <input disabled={isClaimingGift} className="w-full h-16 pl-12 pr-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-xl font-bold dark:text-white focus:border-primary outline-none" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="What's your goal?" />
                            </div>
                        </div>
                    )}

                    {selectedPlan === 'RISE' && (
                        <div className="space-y-4">
                            <label className="text-sm font-black text-slate-500 uppercase tracking-widest">Contribution Frequency</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'daily', label: 'Daily' },
                                    { id: 'weekly', label: 'Weekly' },
                                    { id: 'monthly', label: 'Monthly' }
                                ].map(freq => (
                                    <button 
                                        key={freq.id}
                                        disabled={isClaimingGift}
                                        onClick={() => setContributionFrequency(freq.id as any)}
                                        className={`py-4 rounded-2xl border-2 font-bold transition-all ${contributionFrequency === freq.id ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}
                                    >
                                        {freq.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Automated contributions to promote disciplined wealth building.</p>
                        </div>
                    )}

                    {selectedPlan === 'VAULT' && currency === 'NGN' && (
                        <div className="space-y-4">
                            <label className="text-sm font-black text-slate-500 uppercase tracking-widest">Payout Frequency</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { id: 'upfront', label: 'Upfront' },
                                    { id: 'monthly', label: 'Monthly' },
                                    { id: 'quarterly', label: 'Quarterly' },
                                    { id: 'maturity', label: 'At Maturity' }
                                ].map(freq => (
                                    <button 
                                        key={freq.id}
                                        disabled={isClaimingGift}
                                        onClick={() => setPayoutFrequency(freq.id as any)}
                                        className={`py-4 rounded-2xl border-2 font-bold transition-all ${payoutFrequency === freq.id ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}
                                    >
                                        {freq.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-black text-slate-500 uppercase tracking-widest">Tenure (Months)</label>
                            <div className="flex items-center gap-4">
                                {selectedPlan === 'SURGE' && (
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input 
                                                disabled={isClaimingGift}
                                                type="checkbox" 
                                                checked={isInfinityTenure} 
                                                onChange={e => setIsInfinityTenure(e.target.checked)}
                                                className="peer size-5 appearance-none rounded border-2 border-slate-300 dark:border-slate-700 checked:bg-primary checked:border-primary transition-all cursor-pointer"
                                            />
                                            <span className="absolute inset-0 flex items-center justify-center text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none">
                                                <span className="material-symbols-outlined text-sm font-bold">all_inclusive</span>
                                            </span>
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">Infinity</span>
                                    </label>
                                )}
                                <span className="bg-primary text-white font-black px-6 py-2 rounded-full text-sm">
                                    {isInfinityTenure ? '∞' : `${tenure} Mo.`}
                                </span>
                            </div>
                        </div>
                        {!isInfinityTenure && (
                            <input 
                                disabled={isClaimingGift}
                                type="range" 
                                min={(selectedPlan === 'VAULT' && currency === 'NGN') || selectedPlan === 'SURGE' ? "1" : "3"} 
                                max={selectedPlan === 'SURGE' ? "60" : "24"} 
                                step={(selectedPlan === 'VAULT' && currency === 'NGN') || selectedPlan === 'SURGE' ? "1" : "3"} 
                                value={tenure} 
                                onChange={e => setTenure(parseInt(e.target.value))} 
                                className="w-full h-3 bg-slate-100 dark:bg-slate-900 rounded-full appearance-none cursor-pointer accent-primary" 
                            />
                        )}
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            <span>{(selectedPlan === 'VAULT' && currency === 'NGN') || selectedPlan === 'SURGE' ? (selectedPlan === 'SURGE' ? 'Flexible' : '30 Days') : '3 Months'}</span>
                            <span>{selectedPlan === 'SURGE' ? '5 Years' : '2 Year'}</span>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-black text-slate-500 uppercase tracking-widest">Rollover Instruction</label>
                          <button onClick={() => setShowRolloverInfo(!showRolloverInfo)} className="text-slate-400 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-sm">info</span>
                          </button>
                        </div>
                        {showRolloverInfo && (
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-1 duration-200">
                            <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                              How would you like to manage your funds upon the completion of your investment term?
                            </p>
                          </div>
                        )}
                        <select disabled={isClaimingGift} className="w-full h-16 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-xl font-bold dark:text-white focus:border-primary outline-none" value={rollover} onChange={e => setRollover(e.target.value)}>
                            <option value="principal_interest">Rollover Principal & Interest</option>
                            <option value="principal_only">Rollover Principal Only</option>
                            <option value="none">Payout at Maturity</option>
                        </select>
                    </div>
                    <NavActions isNextDisabled={parseFloat(amount) < minAmount || rateLoading || !dynamicInterestRate} />
                </div>
                <div className="lg:col-span-5">
                    <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 size-48 bg-primary/20 rounded-full blur-3xl -mr-24 -mt-24"></div>
                        <h3 className="text-xl font-black uppercase tracking-widest">Returns Estimate</h3>
                        <div className="bg-white/5 p-8 rounded-3xl border border-white/10 ring-2 ring-primary/20">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Expected Maturity Value</p>
                            <span className="text-5xl font-black text-primary">{formatMoney(returns.total, currency)}</span>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-white/10">
                            <div className="flex justify-between text-sm font-bold">
                              <span className="text-slate-500 uppercase">Interest Rate</span>
                              <div className="text-right">
                                <span className="font-black text-primary">
                                  {interestRate}% p.a.
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between text-sm font-bold"><span className="text-slate-500 uppercase">Total Interest</span><span>{formatMoney(returns.interestEarned, currency)}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Step 11: Signature */}
      {subStep === 11 && (
        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
          <div className="flex flex-col lg:flex-row gap-8 items-stretch">
            {/* Indemnity Card */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-50 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-2xl">description</span>
                  <h3 className="font-black text-xl text-slate-900 dark:text-white">Indemnity Agreement</h3>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-primary hover:text-white transition-all">
                  <span className="material-symbols-outlined text-sm">download</span>
                  Download PDF
                </button>
              </div>
              <div className="p-10 text-sm leading-relaxed text-slate-600 dark:text-slate-300 space-y-8 overflow-y-auto max-h-[500px]">
                <div className="space-y-4">
                  <h4 className="font-black text-slate-900 dark:text-white">1. INDEMNITY</h4>
                  <p className="font-medium">I/We hereby agree to indemnify and hold harmless NOLT Finance from any and all claims, damages, liabilities, and expenses arising out of this investment.</p>
                </div>
                <div className="space-y-4">
                  <h4 className="font-black text-slate-900 dark:text-white">2. ELECTRONIC CONSENT</h4>
                  <p className="font-medium">By signing this document electronically, I/we acknowledge that my electronic signature is the legal equivalent of my manual signature on this Agreement.</p>
                </div>
                <div className="space-y-4">
                  <h4 className="font-black text-slate-900 dark:text-white">3. RISK ACKNOWLEDGEMENT</h4>
                  <p className="font-medium">I acknowledge that all financial products carry a level of risk and I have read and understood the terms and conditions associated with the NOLT {selectedPlan} plan.</p>
                </div>
              </div>
            </div>

            {/* Signature Card */}
            <div className="w-full lg:w-[450px] bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-lg border border-slate-100 dark:border-slate-700 p-10 flex flex-col gap-8">
              <div>
                <h3 className="font-black text-2xl text-slate-900 dark:text-white mb-1">Sign Here</h3>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Draw your signature in the box below</p>
              </div>

              <div className="relative group rounded-3xl overflow-hidden border-2 border-dashed border-slate-100 dark:border-slate-700 hover:border-primary transition-all bg-slate-50 dark:bg-slate-900/50">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={220}
                  className="w-full h-56 cursor-crosshair touch-none"
                  style={{ touchAction: 'none' }}
                  onMouseDown={(e) => {
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const ctx = canvasRef.current?.getContext('2d');
                    if (!ctx) return;
                    ctx.strokeStyle = '#0F172A';
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                    const drawFn = (ev: MouseEvent) => {
                      ctx.lineTo(ev.clientX - rect.left, ev.clientY - rect.top);
                      ctx.stroke();
                      setHasSigned(true);
                    };
                    window.addEventListener('mousemove', drawFn);
                    window.addEventListener('mouseup', () => window.removeEventListener('mousemove', drawFn), { once: true });
                  }}
                />
                {!hasSigned && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <span className="text-slate-400 text-3xl font-black uppercase tracking-widest">Digital Sign</span>
                  </div>
                )}
                <button
                  onClick={() => { canvasRef.current?.getContext('2d')?.clearRect(0, 0, 400, 220); setHasSigned(false); }}
                  className="absolute top-4 right-4 text-[9px] font-black uppercase text-red-500 hover:text-white hover:bg-red-500 border border-red-500/20 px-3 py-1 rounded-full transition-all bg-white/80 dark:bg-slate-800/80"
                >
                  Clear
                </button>
              </div>

              <div
                className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex items-start gap-4 ${acceptedIndemnity ? 'border-primary bg-primary/5' : 'border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'}`}
                onClick={() => setAcceptedIndemnity(!acceptedIndemnity)}
              >
                <input
                  type="checkbox"
                  checked={acceptedIndemnity}
                  onChange={e => setAcceptedIndemnity(e.target.checked)}
                  className="size-6 rounded-lg accent-primary border-slate-300 mt-1 cursor-pointer"
                />
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-snug cursor-pointer select-none">
                  I accept the terms of the Indemnity Agreement and confirm that the digital signature above is mine.
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 mt-8">
            <div className="flex gap-4">
              <button onClick={handleBack} className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all flex items-center gap-2 border border-slate-100 dark:border-slate-700">
                <span className="material-symbols-outlined text-lg">arrow_back</span> Back
              </button>
              <button onClick={handleSaveAndExit} className="px-8 py-4 text-primary font-bold hover:bg-primary/5 rounded-full transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">save_as</span> Save & Exit
              </button>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!acceptedIndemnity || !hasSigned || loading}
              className={`px-12 py-4 rounded-full font-black text-lg transition-all flex items-center gap-3 ${acceptedIndemnity && hasSigned && !loading ? 'bg-primary text-white shadow-xl shadow-primary/30 hover:-translate-y-1' : 'bg-slate-200 text-slate-400 cursor-not-allowed grayscale'}`}
            >
              {loading ? 'Processing...' : 'Finish'}
              {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
            </button>
          </div>
        </div>
      )}

      {/* Step 12: Success Page */}
      {subStep === 12 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-10 py-12 md:py-20 animate-in fade-in zoom-in duration-700"
        >
          <div className="relative inline-block">
            <div className="size-32 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mx-auto shadow-xl ring-8 ring-green-500/5">
              <span className="material-symbols-outlined text-6xl filled">check_circle</span>
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -inset-4 bg-green-500/20 rounded-full -z-10 blur-xl"
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {giftToken ? 'Gift Claimed!' : 'Investment Successful!'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium max-w-lg mx-auto leading-relaxed">
              {giftToken
                ? "Your gifted investment has been activated. You can track your returns on the dashboard."
                : "Your investment has been successfully processed. Welcome to the future of wealth management."}
            </p>
          </div>

          <div className="flex flex-col items-center gap-6">
            <button
              onClick={() => { onComplete(); navigate('DASHBOARD'); }}
              className="px-12 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xl rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 ring-4 ring-slate-900/5 dark:ring-white/10"
            >
              Back to Dashboard
              <span className="material-symbols-outlined">dashboard</span>
            </button>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Redirecting you in a moment...</p>
          </div>

          {/* Confetti effect simulation via CSS or simple motion divs if needed */}
        </motion.div>
      )}

      <CBNLogo />
    </div>
  );
};

export default InvestmentFlow;