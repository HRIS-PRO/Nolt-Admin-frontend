import React, { useState, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useSearchParams, useLocation } from 'react-router-dom';
import { AppStep, SavedDraft, Currency, InvestmentPlan, PayoutFrequency, UserState } from '../types';
import { storageService } from '../services/storageService';
import { investmentService } from '../services/investmentService';
import { productService, InvestmentProduct } from '../services/productService';
import GiftInvestmentFlow from './investment/GiftInvestmentFlow';
import { PaymentModal } from '../components/PaymentModal';
import CameraCapture from '../components/CameraCapture';
import { AnimatePresence } from 'motion/react';

interface InvestmentFlowProps {
  navigate: (step: AppStep) => void;
  onComplete: () => void;
  formatMoney: (amount: number, curr?: string) => string;
  initialDraft?: SavedDraft | null;
  user: UserState;
  creatorRole?: 'customer' | 'staff';
}

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

// ─── Countdown auto-redirect for Top-Up success modal ────────────────────────
const TopUpCountdown: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [seconds, setSeconds] = React.useState(3);
  React.useEffect(() => {
    if (seconds <= 0) { onDone(); return; }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, onDone]);
  const pct = ((3 - seconds) / 3) * 100;
  const r = 22; const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-14 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-100 dark:text-slate-700" />
          <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeWidth="3"
            strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
            className="text-primary transition-all duration-1000" strokeLinecap="round" />
        </svg>
        <span className="font-black text-xl text-primary">{seconds}</span>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Redirecting to dashboard…</p>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const InvestmentFlow: React.FC<InvestmentFlowProps> = ({ navigate, onComplete, formatMoney, initialDraft, user, creatorRole }) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const incomingDraft = initialDraft || location.state?.draft;
  const giftTokenFromUrl = searchParams.get('gift_token') || localStorage.getItem('pending_gift_token') || sessionStorage.getItem('pending_gift_token');

  const [subStep, setSubStep] = useState(incomingDraft?.subStep ?? 0);
  const [loading, setLoading] = useState(false);

  // Live investment products from DB
  const [investmentProducts, setInvestmentProducts] = useState<InvestmentProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    productService.getInvestmentProducts()
      .then(res => { if (res.success) setInvestmentProducts(res.products); })
      .catch(() => {})
      .finally(() => setProductsLoading(false));
  }, []);
  const [isSaving, setIsSaving] = useState(false);
  const [isClaimingGift, setIsClaimingGift] = useState(false);
  const [giftToken, setGiftToken] = useState<string | null>(giftTokenFromUrl);
  const [jointToken, setJointToken] = useState<string | null>(searchParams.get('joint_token'));

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
  const [selectedCbaCode, setSelectedCbaCode] = useState<string>(initialDraft?.data?.selectedCbaCode ?? '');
  const [currency, setCurrency] = useState<Currency>(initialDraft?.data?.currency ?? 'NGN');
  const [amount, setAmount] = useState<string>(initialDraft?.data?.amount ?? '100000');
  const [tenure, setTenure] = useState<number>(initialDraft?.data?.tenure ?? 365);
  const [rollover, setRollover] = useState(initialDraft?.data?.rollover ?? 'principal_interest');
  const [targetAmount, setTargetAmount] = useState<string>(initialDraft?.data?.targetAmount ?? '');
  const [payoutFrequency, setPayoutFrequency] = useState<PayoutFrequency>(initialDraft?.data?.payoutFrequency ?? 'maturity');

  // Entity & Identity
  const [entityType, setEntityType] = useState<'INDIVIDUAL' | 'CORPORATE' | 'JOINT'>(initialDraft?.data?.entityType ?? 'INDIVIDUAL');
  const [partnerEmail, setPartnerEmail] = useState(initialDraft?.data?.partnerEmail ?? '');
  const [title, setTitle] = useState(initialDraft?.data?.title ?? 'Mr');
  const [fullName, setFullName] = useState(initialDraft?.data?.fullName ?? '');
  const [isOnBehalf, setIsOnBehalf] = useState(initialDraft?.data?.isOnBehalf ?? false);
  const [representativeRelation, setRepresentativeRelation] = useState(initialDraft?.data?.representativeRelation ?? '');
  const [isPep, setIsPep] = useState<boolean | null>(initialDraft?.data?.isPep ?? null);

  // Personal Details
  const [gender, setGender] = useState(initialDraft?.data?.gender || user.profile?.gender || '');
  const [dob, setDob] = useState(initialDraft?.data?.dob || (user.profile?.date_of_birth ? new Date(user.profile.date_of_birth).toISOString().split('T')[0] : ''));
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
  const [tinNumber, setTinNumber] = useState(initialDraft?.data?.tinNumber ?? '');
  const [directorCount, setDirectorCount] = useState<number>(initialDraft?.data?.directorCount ?? 1);
  const [directors, setDirectors] = useState<any[]>(initialDraft?.data?.directors ?? [{
    surname: '', firstName: '', middleName: '', phone: '', gender: '', dob: '', bvn: '', nin: '', tin: '', address: '', isPep: false, photo: null, id_card: null
  }]);
  const [companyName, setCompanyName] = useState(initialDraft?.data?.companyName ?? '');

  // Name split for Individual (Requested refinement)
  const nameParts = (user.name || '').trim().split(/\s+/);
  const defSurname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  const defFirstName = nameParts[0] || '';
  const defMiddleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

  const [surname, setSurname] = useState(initialDraft?.data?.surname || user.profile?.surname || defSurname);
  const [firstName, setFirstName] = useState(initialDraft?.data?.firstName || user.profile?.first_name || defFirstName);
  const [middleName, setMiddleName] = useState(initialDraft?.data?.middleName || user.profile?.middle_name || defMiddleName);

  useEffect(() => {
    if (entityType === 'INDIVIDUAL' || entityType === 'JOINT') {
      setFullName(`${surname} ${firstName} ${middleName}`.replace(/\s+/g, ' ').trim());
    }
  }, [surname, firstName, middleName, entityType]);


  // Contact & Verification
  const [countryCode, setCountryCode] = useState(initialDraft?.data?.countryCode ?? '+234');
  const [mobileNumber, setMobileNumber] = useState(initialDraft?.data?.mobileNumber || user.profile?.phone_number || '');
  const [contactEmail, setContactEmail] = useState(initialDraft?.data?.contactEmail || user.profile?.personal_email || user.email || '');
  const [bvn, setBvn] = useState(initialDraft?.data?.bvn || user.profile?.bvn || '');
  const [nin, setNin] = useState(initialDraft?.data?.nin || user.profile?.nin || '');

  // Address
  const [stateOfOrigin, setStateOfOrigin] = useState(initialDraft?.data?.stateOfOrigin ?? user.profile?.state_of_origin ?? 'Abia');
  const [stateOfResidence, setStateOfResidence] = useState(initialDraft?.data?.stateOfResidence ?? user.profile?.state_of_residence ?? 'Abia');
  const [homeAddress, setHomeAddress] = useState(initialDraft?.data?.homeAddress ?? user.profile?.address ?? '');

  // Next of Kin
  const [nokName, setNokName] = useState(initialDraft?.data?.nokName ?? '');
  const [nokRelationship, setNokRelationship] = useState(initialDraft?.data?.nokRelationship ?? '');
  const [nokAddress, setNokAddress] = useState(initialDraft?.data?.nokAddress ?? '');
  const [nokPhoneNumber, setNokPhoneNumber] = useState(initialDraft?.data?.nokPhoneNumber ?? '');
  const [nokCountryCode, setNokCountryCode] = useState(initialDraft?.data?.nokCountryCode ?? '+234');
  const [isNokSameAddress, setIsNokSameAddress] = useState(false);

  // Sync fullName for Individuals
  useEffect(() => {
    if (entityType === 'INDIVIDUAL' || entityType === 'JOINT') {
      const parts = [firstName, middleName, surname].filter(Boolean);
      setFullName(parts.join(' '));
    }
  }, [firstName, middleName, surname, entityType]);

  useEffect(() => {
    if (isNokSameAddress) setNokAddress(homeAddress);
  }, [isNokSameAddress, homeAddress]);

  useEffect(() => {
    if (selectedPlan === 'SURGE') {
      setTenure(365);
      setIsInfinityTenure(false);
    }
  }, [selectedPlan]);



  // Top-Up
  const [isTopUp, setIsTopUp] = useState(incomingDraft?.data?.isTopUp ?? false);
  const [casaNumber, setCasaNumber] = useState(incomingDraft?.data?.casa_account_number ?? user.profile?.casa ?? '');
  const [originalInvestmentId, setOriginalInvestmentId] = useState(incomingDraft?.data?.originalInvestmentId ?? null);
  const [isValidatingCasa, setIsValidatingCasa] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [casaBalance, setCasaBalance] = useState<number | null>(null);
  const [casaBalanceLoading, setCasaBalanceLoading] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState<{ message: string; data: any } | null>(null);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState(initialDraft?.data?.referralCode ?? user.referral_code_used ?? '');
  const [createdInvestment, setCreatedInvestment] = useState<any>(null);
  const tdAccount = incomingDraft?.data?.cba_td_account_number ?? null;

  // Fetch CASA balance when entering top-up mode
  React.useEffect(() => {
    if (!isTopUp) return;
    const casa = incomingDraft?.data?.casa_account_number ?? user.profile?.casa;
    if (!casa) return;
    setCasaBalanceLoading(true);
    axios.get(`${import.meta.env.VITE_API_URL || ''}/api/profile/balance`, { withCredentials: true })
      .then(res => {
        if (res.data?.success && res.data?.balance !== null) {
          setCasaBalance(res.data.balance);
        }
      })
      .catch(() => {})
      .finally(() => setCasaBalanceLoading(false));
  }, [isTopUp]);

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
    { id: 'utility_bill', label: 'Utility Bill (Last 3 Months)', icon: 'description', required: true },
    { id: 'selfie', label: 'Selfie', icon: 'add_a_photo', required: true },
    { id: 'secondary_id', label: 'Secondary Government ID/Doc', icon: 'assignment_ind', required: false }
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
      { id: 'cac_cert', label: 'CAC Certificate', icon: 'verified', required: true },
      { id: 'status_report', label: 'Status Report', icon: 'analytics', required: true },
      { id: 'memart', label: 'Memorandum & Articles of Association', icon: 'menu_book', required: true },
      { id: 'board_resolution', label: 'Board Resolution of Authority to Transact with NOLT Finance', icon: 'gavel', required: true },
      { id: 'annual_returns', label: 'Evidence of Filing of Annual Returns', icon: 'history_edu', required: false },
      { id: 'utility_bill', label: 'Utility Bill (Last 3 Months)', icon: 'home_work', required: true }
    );
    return docs;
  }, [directors]);

  const [showCamera, setShowCamera] = useState(false);
  const [isVerifyingIdentity, setIsVerifyingIdentity] = useState(false);

  const isIdentityVerifiedWithin6Months = useMemo(() => {
    if (!user.profile?.is_identity_verified || !user.profile?.last_selfie_verified_at) return false;
    const lastVerified = new Date(user.profile.last_selfie_verified_at).getTime();
    const sixMonthsAgo = new Date().getTime() - (180 * 24 * 60 * 60 * 1000);
    return lastVerified > sixMonthsAgo;
  }, [user.profile]);

  const currentDocs = useMemo(() => entityType === 'CORPORATE' ? corporateDocs : individualDocs, [entityType, corporateDocs, individualDocs]);

  const isSecureVaultComplete = useMemo(() => {
    return currentDocs.filter(d => d.required).every(d => {
      if (d.id === 'selfie' && isIdentityVerifiedWithin6Months) return true;
      return !!uploadedDocs[d.id];
    });
  }, [currentDocs, uploadedDocs, isIdentityVerifiedWithin6Months]);

  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [receiptProgress, setReceiptProgress] = useState(0);
  const [receiptFile, setReceiptFile] = useState<{ name: string; size: string, url?: string } | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [showProductInfo, setShowProductInfo] = useState(false);
  const [showRolloverInfo, setShowRolloverInfo] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const [draftId] = useState(`I-` + Date.now());
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});

  // Rate & Payout State
  const [dynamicInterestRate, setDynamicInterestRate] = useState<number | null>(initialDraft?.data?.interestRate ?? null);
  const [rateLoading, setRateLoading] = useState(false);
  const [serverMinAmount, setServerMinAmount] = useState<number>(initialDraft?.data?.serverMinAmount ?? 0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [hasSigned, setHasSigned] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [acceptedIndemnity, setAcceptedIndemnity] = useState(false);
  const [isGuardianConfirmed, setIsGuardianConfirmed] = useState(false);

  const isMinor = useMemo(() => {
    if (!dob) return false;
    const birthDate = new Date(dob);
    const age = (new Date().getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age < 18;
  }, [dob]);

  // Handle Gift Claim on Load
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Always use dark ink for the signature to ensure it shows clearly on the PDF document
    ctx.strokeStyle = '#0F172A';

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => setIsDrawing(false);

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

      ctx.clearRect(0, 0, canvas.width, canvas.height);

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

  useEffect(() => {
    if (giftToken) {
      const fetchGift = async () => {
        try {
          const gift = await investmentService.getGiftDetails(giftToken);
          if (gift) {
            if (gift.status === 'claimed') {
              console.log("Gift already claimed, clearing storage and redirecting.");
              localStorage.removeItem('pending_gift_token');
              sessionStorage.removeItem('pending_gift_token');
              window.location.href = `/claim-gift?token=${giftToken}`;
              return;
            }
            setIsClaimingGift(true);
            setSelectedPlan(gift.plan_name);
            setAmount(gift.amount.toString());
            setTenure(gift.tenure_months);
            setCurrency(gift.currency);
            setSubStep(2); // Start at Identity Basics
          }
        } catch (err) {
          console.error("Gift claim error:", err);
          localStorage.removeItem('pending_gift_token');
          sessionStorage.removeItem('pending_gift_token');
        }
      };
      fetchGift();
    }
  }, [giftToken]);

  useEffect(() => {
    if (jointToken) {
      const fetchJointInvitation = async () => {
        try {
            const response = await axios.get(`/api/investments/joint/validate/${jointToken}`);
            const invitation = response.data;
            if (invitation) {
                setEntityType('JOINT');
                setAmount(invitation.investment_amount.toString());
                setSelectedPlan(invitation.investment_type);
                // Skip directly to Identity Basics (Step 2)
                setSubStep(2);
            }
        } catch (err) {
            console.error("Joint invitation error:", err);
            setJointToken(null);
        }
      };
      fetchJointInvitation();
    }
  }, [jointToken]);

  const isStaff = creatorRole === 'staff';

  // Auto-Prefill from Existing Investment
  useEffect(() => {
    // If we are resuming a draft, don't stomp over it with old investment data
    if (initialDraft) {
      console.log("Resuming draft, skipping auto-prefill from latest investment");
      return;
    }

    const prefillData = async () => {
      // 0. DO NOT pre-fill staff data if acting as staff
      if (isStaff) return;

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
      }

      try {
        const latestInfo = await investmentService.getLatestInvestment();
        if (latestInfo) {
          // 2. Only fill non-profile fields from legacy if profile is empty for those fields
          if (!user.profile?.surname) setFullName(latestInfo.rep_full_name || '');
          if (!user.profile?.phone_number) setMobileNumber(latestInfo.rep_phone_number || '');
          if (!user.profile?.bvn) setBvn(latestInfo.rep_bvn || '');
          if (!user.profile?.nin) setNin(latestInfo.rep_nin || '');
          if (!user.profile?.state_of_origin) setStateOfOrigin(latestInfo.rep_state_of_origin || '');
          if (!user.profile?.state_of_residence) setStateOfResidence(latestInfo.rep_state_of_residence || '');
          if (!user.profile?.address) setHomeAddress(latestInfo.rep_street_address || '');

          setIsPep(latestInfo.is_pep ?? null);
          setTitle(latestInfo.title || 'Mr');
          if (!user.profile?.gender) setGender(latestInfo.gender || '');
          if (!user.profile?.date_of_birth) setDob(latestInfo.dob ? new Date(latestInfo.dob).toISOString().split('T')[0] : '');

          setMaidenName(latestInfo.mother_maiden_name || '');
          setReligion(latestInfo.religion || 'Prefer not to say');
          setMaritalStatus(latestInfo.marital_status || 'Single');
          if (!user.profile?.personal_email) setContactEmail(latestInfo.customer_email || '');

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
            setTinNumber(latestInfo.tin_number || '');
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

  // Rate Calculation (Dynamic from CBA, with local yield-rate fallback)
  useEffect(() => {
    const fetchRate = async () => {
      const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
      if (!numericAmount || !selectedPlan || !currency) {
        setDynamicInterestRate(null);
        return;
      }

      setRateLoading(true);
      try {
        const tenureToFetch = selectedPlan === 'SURGE' ? 365 : tenure;

        // ── Primary: CBA live rate ────────────────────────────────────────
        if (selectedCbaCode) {
          try {
            const cbaRes = await fetch(
              `/api/investments/fixed-deposit-rate?productCode=${encodeURIComponent(selectedCbaCode)}&amount=${numericAmount}&duration=${tenureToFetch}`,
              { credentials: 'include' }
            );
            if (cbaRes.ok) {
              const cbaData = await cbaRes.json();
              if (cbaData.success && cbaData.interestRate !== null && cbaData.interestRate !== undefined) {
                setDynamicInterestRate(cbaData.interestRate);
                setServerMinAmount(0); // CBA doesn't return min amount
                return;
              }
            }
          } catch (cbaErr) {
            console.warn('[CBA Rate] Failed, falling back to yield rates:', cbaErr);
          }
        }

        // ── Fallback: local yield-rates table ────────────────────────────
        const payload: any = {
          plan: selectedPlan,
          currency,
          amount: numericAmount,
          tenure: tenureToFetch
        };
        if (selectedPlan === 'VAULT') {
          payload.payout_frequency = payoutFrequency;
        }
        const data = await investmentService.getRate(payload);
        if (data) {
          setDynamicInterestRate(data.interest_rate);
          setServerMinAmount(data.min_amount);
        } else {
          setDynamicInterestRate(null);
          setServerMinAmount(0);
        }
      } catch (err) {
        console.error('Error fetching rate:', err);
        setDynamicInterestRate(null);
      } finally {
        setRateLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchRate, 500);
    return () => clearTimeout(debounceTimer);
  }, [amount, tenure, selectedPlan, selectedCbaCode, currency, payoutFrequency]);

  const interestRate = dynamicInterestRate ?? 0;

  const returns = useMemo(() => {
    const principal = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
    const rateToUse = interestRate;
    const tenureToUse = selectedPlan === 'SURGE' ? 365 : tenure;
    const interestEarned = (principal * rateToUse * (tenureToUse / 365)) / 100;
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
        selectedPlan, selectedCbaCode, currency, amount, tenure, rollover, targetAmount, payoutFrequency,
        entityType, title, fullName, surname, firstName, middleName, isOnBehalf, representativeRelation, isPep,
        gender, dob, maidenName, religion, maritalStatus, countryCode, mobileNumber, contactEmail, bvn, nin,
        stateOfOrigin, stateOfResidence, homeAddress, nokName, nokRelationship, nokAddress, nokPhoneNumber, nokCountryCode,
        companyName, businessAddress, incorpDate, rcNumber, businessNature, directors,
        isAuthorizedRep, authRepPhone, tin, tinNumber, uploadedDocs, isTopUp, casaNumber, giftToken, isClaimingGift, originalInvestmentId
      }
    } as any);
  };

  const handleNext = () => {
    // Age Logic
    if (subStep === 3 && (entityType === 'INDIVIDUAL' || entityType === 'JOINT') && dob) {
      if (isMinor && !isGuardianConfirmed) {
        alert("Please confirm that you are the legal guardian of the beneficiary.");
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
        preSubmitCheck();
        return;
      }
    } else {
      if (subStep === 11) {
        preSubmitCheck();
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
    console.log(`DEBUG: Starting upload for ${id}: ${file.name} (${file.size} bytes)`);
    setIsUploading(prev => ({ ...prev, [id]: true }));
    setUploadProgress(prev => ({ ...prev, [id]: 10 }));

    try {
      const result = await investmentService.uploadDocument(file, draftId, id);
      console.log(`DEBUG: Upload success result:`, result);
      const url = result.document.file_url;
      setUploadedDocs(prev => ({ ...prev, [id]: { name: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, url } }));

      // Update signature/etc for directors
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
    } catch (err: any) {
      console.error("Upload process failed:", err);
      alert(`Upload failed: ${err.message || 'Check connection'}`);
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

  const [preSubmitReference, setPreSubmitReference] = useState<string>('');

  const preSubmitCheck = async () => {
    if (!contactEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return alert("Please enter a valid email address.");
    if (mobileNumber.length < 10) return alert("Please enter a valid mobile number.");

    if (isClaimingGift || giftToken) {
      finalizeInvestment(`G_CLAIM_${giftToken || Date.now()}`);
      return;
    }

    setPreSubmitReference(`INV_${Date.now()}`);
    setShowPaymentModal(true);
  };

  const handlePayOnline = () => {
    setLoading(true);
    try {
      // @ts-ignore
      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: contactEmail,
        amount: Math.round(parseFloat(amount) * 100),
        currency: 'NGN',
        ref: preSubmitReference,
        callback: (response: any) => {
          finalizeInvestment(response.reference);
        },
        onClose: () => {
          alert('Transaction was not completed, window closed.');
          setLoading(false);
        }
      });
      handler.openIframe();
    } catch (err: any) {
      console.error("Submission error:", err);
      alert(err.message || "An error occurred during submission.");
      setLoading(false);
    }
  };

  const handleUploadReceipt = async (file: File): Promise<string> => {
    try {
      const result = await investmentService.uploadDocument(file, draftId, 'payment_receipt');
      return result.document.file_url;
    } catch (err) {
      console.error("Receipt upload failed:", err);
      // We explicitly throw the error so the Modal catches it and resets state
      throw new Error("Failed to upload the receipt. Please try again.");
    }
  };

  const handleBankTransferSubmit = async (receiptUrl: string) => {
    setShowPaymentModal(false);
    // Call finalize with the uploaded receipt URL
    finalizeInvestment(preSubmitReference, receiptUrl);
  };

  const finalizeInvestment = async (reference: string, receiptUrl?: string) => {
    setLoading(true);
    try {
      // Step 2: Create Investment
      const payload = {
        investment_type: `NOLT_${selectedPlan}`,
        investment_amount: parseFloat(amount),
        tenure_days: tenure,
        currency,
        giftToken, // For linking if claim
        payment_reference: reference, // reference is already handled by caller (G_CLAIM_... or Paystack ref)
        payment_receipt_url: receiptUrl,

        // Corporate Fields
        entity_type: entityType,
        partner_email: entityType === 'JOINT' ? partnerEmail : null,
        company_name: entityType === 'CORPORATE' ? companyName : null,
        rc_number: entityType === 'CORPORATE' ? rcNumber : null,
        incorp_date: entityType === 'CORPORATE' ? incorpDate : null,
        tin: entityType === 'CORPORATE' ? tin : null,
        tin_number: (entityType === 'INDIVIDUAL' || entityType === 'JOINT') ? tinNumber : null,
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
        nok_name: nokName, nok_relationship: nokRelationship, nok_address: nokAddress, nok_phone_number: `${nokCountryCode}${nokPhoneNumber}`,
        target_amount: targetAmount, rollover_option: rollover, 
        ...(selectedPlan === 'VAULT' ? { payout_frequency: payoutFrequency } : {}),
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
        cac_url: uploadedDocs.cac_cert?.url || null,
        company_profile_url: uploadedDocs.company_profile?.url || null,
        status_report_url: uploadedDocs.status_report?.url || null,
        memart_url: uploadedDocs.memart?.url || null,
        board_resolution_url: uploadedDocs.board_resolution?.url || null,
        annual_returns_url: uploadedDocs.annual_returns?.url || null,
        is_minor_beneficiary: isMinor,
        guardian_confirmed: isGuardianConfirmed,
        signatures: [canvasRef.current?.toDataURL() || ""],
        is_top_up: isTopUp,
        original_investment_id: originalInvestmentId,
        casa_account_number: casaNumber,
        referral_code: referralCode
      };

      let result;
      if (jointToken) {
        const acceptResponse = await axios.post('/api/investments/joint/accept', {
          ...payload,
          token: jointToken
        }, { withCredentials: true });
        result = acceptResponse.data;
      } else if (isStaff) {
        result = await investmentService.createStaffInvestment({
          ...payload,
          entity_type: entityType,
          email: contactEmail,
          phone: mobileNumber,
          fullName: fullName,
        });
      } else {
        result = await investmentService.createInvestment(payload);
      }

      setCreatedInvestment(result);
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

  const totalSteps = isTopUp ? 4 : (selectedPlan === 'RISE' ? 14 : (selectedPlan === 'VAULT' ? 13 : 13));
  const currentStep = isTopUp ? (subStep === 0 ? 1 : subStep === 10 ? 2 : subStep === 11 ? 3 : 4) : subStep + 1;

  // Render Logic - Profile Guard
  if ((!user.profile?.is_identity_verified || !user.profile?.bank_verified) && !isGift && !isStaff) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center space-y-8 animate-in fade-in duration-700">
        <div className="size-24 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-500 mx-auto border-2 border-amber-500/20 shadow-xl shadow-amber-500/5">
          <span className="material-symbols-outlined text-5xl font-black">gpp_maybe</span>
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Profile Setup Incomplete</h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-lg mx-auto leading-relaxed">
            For your security and compliance, you must complete your profile verification (Identity & Bank KYC) before accessing investment products.
          </p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => window.location.href = '/profile'}
            className="px-10 py-5 bg-primary text-white font-black text-lg rounded-2xl shadow-2xl shadow-primary/25 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3"
          >
            Go to My Profile
            <span className="material-symbols-outlined">fingerprint</span>
          </button>
          <button onClick={() => navigate('DASHBOARD')} className="text-slate-400 font-black uppercase tracking-widest text-xs hover:text-slate-600 transition-colors">Back to Dashboard</button>
        </div>
      </div>
    );
  }

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

      {/* ─── TOP-UP SUCCESS MODAL ──────────────────────────────── */}
      {topUpSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-500">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />

          {/* Card */}
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-emerald-500/20 p-10 flex flex-col items-center text-center gap-6 animate-in zoom-in-95 duration-500">
            {/* Glow ring */}
            <div className="absolute -inset-1 rounded-[3.2rem] bg-gradient-to-br from-emerald-400/20 to-transparent blur-xl pointer-events-none" />

            {/* Animated check */}
            <div className="relative size-28">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
              <div className="relative size-28 rounded-full bg-emerald-500/15 border-4 border-emerald-500/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-emerald-500 filled">check_circle</span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Top-Up Successful!</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed">{topUpSuccess.message}</p>
            </div>

            {/* Receipt summary */}
            {topUpSuccess.data && (
              <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 space-y-3 text-left">
                {topUpSuccess.data.TDAccount && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TD Account</span>
                    <span className="font-black text-slate-900 dark:text-white font-mono">{topUpSuccess.data.TDAccount}</span>
                  </div>
                )}
                {topUpSuccess.data.TopUpAmount && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Added</span>
                    <span className="font-black text-emerald-600 text-lg">₦{Number(topUpSuccess.data.TopUpAmount).toLocaleString()}</span>
                  </div>
                )}
                {topUpSuccess.data.SettlementAcct && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Settlement Acct</span>
                    <span className="font-black text-slate-900 dark:text-white font-mono">{topUpSuccess.data.SettlementAcct}</span>
                  </div>
                )}
              </div>
            )}

            {/* Auto-redirect countdown */}
            <TopUpCountdown onDone={() => navigate('DASHBOARD')} />

            <button
              onClick={() => navigate('DASHBOARD')}
              className="w-full py-5 bg-primary text-white font-black text-base rounded-2xl shadow-xl shadow-primary/30 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <span className="material-symbols-outlined">home</span>
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Product Pill */}
      <div className="absolute top-6 right-6 z-50">
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-lg border border-slate-100 dark:border-slate-700">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">NOLT {selectedPlan}</span>
          <button onClick={() => setShowProductInfo(!showProductInfo)} className="size-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-primary hover:text-white transition-all">
            <span className="material-symbols-outlined text-xs">info</span>
          </button>
        </div>
      </div>

      {subStep < 12 && !isTopUp && (
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

      {/* Step 0: Plan Selection / Top-Up Entry */}
      {subStep === 0 && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {isTopUp ? (
            <div className="max-w-xl mx-auto text-center space-y-8 py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="size-24 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center text-emerald-500 mx-auto border-2 border-emerald-500/20 shadow-xl shadow-emerald-500/5">
                <span className="material-symbols-outlined text-5xl font-black">add_circle</span>
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Investment Top-Up</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Adding funds to your <span className="text-primary font-black">NOLT {selectedPlan}</span> portfolio.
                </p>
              </div>

              {/* CASA balance display */}
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 text-left flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Settlement Account (CASA)</p>
                  <p className="font-black text-slate-900 dark:text-white font-mono tracking-wide">{casaNumber || '—'}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Balance</p>
                  {casaBalanceLoading ? (
                    <div className="h-5 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  ) : (
                    <p className="font-black text-emerald-600 dark:text-emerald-400">
                      {casaBalance !== null ? `₦${casaBalance.toLocaleString()}` : '—'}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 text-left">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Top-Up Amount (₦)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">₦</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter amount..."
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="w-full h-20 pl-14 pr-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-2xl font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-300"
                  />
                </div>
                {/* Warning: amount exceeds balance */}
                {topUpAmount && casaBalance !== null && Number(topUpAmount) > casaBalance && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                    <span className="material-symbols-outlined text-amber-500 text-sm">warning</span>
                    <p className="text-xs font-black text-amber-600 dark:text-amber-400">
                      Amount exceeds your available CASA balance of ₦{casaBalance.toLocaleString()}. Please enter a lower amount.
                    </p>
                  </div>
                )}
              </div>

              {/* Inline error */}
              {topUpError && (
                <div className="flex items-start gap-3 px-5 py-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
                  <span className="material-symbols-outlined text-red-500 text-base mt-0.5 shrink-0">error</span>
                  <p className="text-sm font-bold text-red-600 dark:text-red-400 leading-relaxed">{topUpError}</p>
                </div>
              )}

              <button
                disabled={topUpLoading || !topUpAmount || Number(topUpAmount) <= 0 || (casaBalance !== null && Number(topUpAmount) > casaBalance) || !casaNumber}
                onClick={async () => {
                  setTopUpError(null);
                  if (!casaNumber) {
                    setTopUpError('Your CASA account is not linked to your profile. Please contact support.');
                    return;
                  }
                  setTopUpLoading(true);
                  try {
                    const res = await axios.post(
                      `${import.meta.env.VITE_API_URL || ''}/api/investments/cba-topup`,
                      { tdAccount: tdAccount || '', topUpAmount: Number(topUpAmount), settlementAcct: casaNumber },
                      { withCredentials: true }
                    );
                    console.log('[TopUp] CBA Response:', res.data);
                    // Show modal — even if data is sparse
                    setTopUpSuccess({
                      message: res.data.message || 'Top-up posted successfully.',
                      data: res.data.data || res.data
                    });
                  } catch (err: any) {
                    const msg = err?.response?.data?.message || 'Top-up failed. Please try again.';
                    console.error('[TopUp] Error:', err?.response?.data);
                    setTopUpError(msg);
                  } finally {
                    setTopUpLoading(false);
                  }
                }}
                className={`w-full py-6 bg-primary text-white font-black text-xl rounded-3xl shadow-2xl shadow-primary/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${topUpLoading ? 'animate-pulse' : ''}`}
              >
                {topUpLoading ? 'Processing...' : 'Top Up Now'}
                {!topUpLoading && <span className="material-symbols-outlined">arrow_forward</span>}
              </button>
              <button onClick={handleBack} className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-slate-600 transition-colors">Cancel Top-Up</button>
            </div>
          ) : (
            <>
              <div className="text-center md:text-left space-y-3">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Investment Plan</h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-2xl">Choose a growth strategy that aligns with your financial horizon.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {productsLoading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 bg-white/50 animate-pulse flex flex-col gap-5">
                      <div className="size-14 rounded-2xl bg-slate-200 dark:bg-slate-700" />
                      <div className="space-y-2">
                        <div className="h-6 w-32 rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-700" />
                      </div>
                    </div>
                  ))
                ) : investmentProducts.length > 0 ? (
                  investmentProducts.map((product, i) => {
                    // Derive plan key from cba_product_code (e.g. 'FD001' → 'RISE')
                    const planKey = product.cba_product_code?.includes('RISE') || i === 0 ? 'RISE'
                      : product.cba_product_code?.includes('SURGE') || i === 1 ? 'SURGE'
                      : 'VAULT';
                    const icons = ['rocket_launch', 'bolt', 'lock'];
                    const isSelected = selectedPlan === planKey;
                    return (
                      <button
                        key={product.id}
                        onClick={() => {
                          setSelectedPlan(planKey as InvestmentPlan);
                          setSelectedCbaCode(product.cba_product_code || '');
                          handleNext();
                        }}
                        className={`group p-8 rounded-[2.5rem] border-2 transition-all text-left flex flex-col gap-5 shadow-xl ${
                          isSelected ? 'border-primary bg-white dark:bg-slate-800' : 'border-slate-100 dark:border-slate-800 bg-white/50 hover:border-primary/50'
                        }`}
                      >
                        <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                          <span className="material-symbols-outlined text-3xl filled">{icons[i % icons.length]}</span>
                        </div>
                        <div>
                          <h3 className="text-2xl font-black mb-2 uppercase tracking-tight dark:text-white">{product.custom_name}</h3>
                          <p className="text-slate-500 font-bold leading-relaxed text-sm">
                            {product.interest_rate != null ? `${product.interest_rate}% p.a.` : 'Competitive returns'}
                            {product.min_amount ? ` · Min ₦${product.min_amount.toLocaleString()}` : ''}
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-3 py-12 text-center text-slate-400 dark:text-slate-500 font-bold">
                    No investment plans available at this time. Please check back soon.
                  </div>
                )}
              </div>
            </>
          )}
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
            {/* <button onClick={() => { setEntityType('JOINT'); handleNext(); }} className={`group p-10 rounded-[3rem] border-2 transition-all text-left flex items-center gap-8 ${entityType === 'JOINT' ? 'border-primary bg-white dark:bg-slate-800 shadow-xl' : 'border-slate-100 dark:border-slate-800 bg-white/50 hover:border-primary/50'}`}>
              <div className="size-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all"><span className="material-symbols-outlined text-4xl filled">group</span></div>
              <div className="flex-1"><h3 className="text-2xl font-black uppercase tracking-tight dark:text-white">Joint</h3><p className="text-slate-500 font-bold text-sm">Invest together with a partner.</p></div>
            </button> */}
          </div>
          <button onClick={handleBack} className="flex items-center gap-2 text-slate-400 font-black uppercase tracking-widest text-sm hover:text-primary transition-colors"><span className="material-symbols-outlined">arrow_back</span> Back</button>
        </div>
      )}

      {/* Step 2: Identity Basics */}
      {subStep === 2 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <h2 className="text-3xl font-black dark:text-white">Identity Basics</h2>

          {(entityType === 'INDIVIDUAL' || entityType === 'JOINT') ? (
            <div className="grid gap-8">
              <div className="space-y-4">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest">Who are you investing for?</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setIsOnBehalf(false);
                      // Reset to profile data when switching to 'Self'
                      if (user.profile) {
                        const p = user.profile;
                        setSurname(p.surname || '');
                        setFirstName(p.first_name || '');
                        setMiddleName(p.middle_name || '');
                        setDob(p.date_of_birth ? new Date(p.date_of_birth).toISOString().split('T')[0] : '');
                        setMobileNumber(p.phone_number || '');
                        setBvn(p.bvn || '');
                        setNin(p.nin || '');
                        setStateOfOrigin(p.state_of_origin || '');
                        setStateOfResidence(p.state_of_residence || '');
                        setHomeAddress(p.address || '');
                      }
                    }}
                    className={`flex-1 h-14 rounded-xl border-2 font-black transition-all flex items-center justify-center gap-3 ${!isOnBehalf ? 'bg-primary border-primary text-white shadow-lg' : 'border-slate-100 dark:border-slate-700 dark:text-white'}`}
                  >
                    <span className="material-symbols-outlined text-sm">person</span>
                    Myself
                  </button>
                  <button
                    onClick={() => setIsOnBehalf(true)}
                    className={`flex-1 h-14 rounded-xl border-2 font-black transition-all flex items-center justify-center gap-3 ${isOnBehalf ? 'bg-primary border-primary text-white shadow-lg' : 'border-slate-100 dark:border-slate-700 dark:text-white'}`}
                  >
                    <span className="material-symbols-outlined text-sm">family_history</span>
                    Someone else
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Surname</label>
                  <input disabled={!isOnBehalf && !!user.profile?.surname} className={`w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none ${!isOnBehalf && !!user.profile?.surname ? 'opacity-70 cursor-not-allowed select-none' : ''}`} value={surname} onChange={e => setSurname(e.target.value)} placeholder="e.g. Obinali" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">First Name</label>
                  <input disabled={!isOnBehalf && !!user.profile?.first_name} className={`w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none ${!isOnBehalf && !!user.profile?.first_name ? 'opacity-70 cursor-not-allowed select-none' : ''}`} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. Divine" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Middle Name (Optional)</label>
                  <input disabled={!isOnBehalf && !!user.profile?.middle_name} className={`w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none ${!isOnBehalf && !!user.profile?.middle_name ? 'opacity-70 cursor-not-allowed select-none' : ''}`} value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="e.g. Chinedu" />
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
              {entityType === 'JOINT' && !jointToken && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-sm font-black text-slate-500 uppercase">Partner's Email Address</label>
                  <input type="email" className={`w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none`} value={partnerEmail} onChange={e => setPartnerEmail(e.target.value)} placeholder="partner@example.com" />
                  <p className="text-xs font-bold text-slate-400 mt-2">We will send them an invitation link to complete their own KYC form and join this investment.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase">Name of Company</label>
                <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Nolt Finance Ltd" />
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
                    <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none" value={authRepPhone} onChange={e => setAuthRepPhone(e.target.value)} placeholder="e.g. 080..." />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">RC Number</label>
                  <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none" value={rcNumber} onChange={e => setRcNumber(e.target.value)} placeholder="e.g. RC123456" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Date of Incorporation</label>
                  <input type="date" className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none" value={incorpDate} onChange={e => setIncorpDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase">Business Address</label>
                <textarea rows={2} className="w-full p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder="e.g. 123 Finance Street, Lagos" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Nature of Business</label>
                  <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none" value={businessNature} onChange={e => setBusinessNature(e.target.value)} placeholder="e.g. Finance, Tech" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Tax Identification Number (TIN)</label>
                  <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none" value={tin} onChange={e => setTin(e.target.value)} placeholder="e.g. 1234567-0001" />
                </div>
              </div>
            </div>
          )}
          <NavActions isNextDisabled={(entityType === 'INDIVIDUAL' || entityType === 'JOINT') ? (!fullName || isPep === null || (entityType === 'JOINT' && !jointToken && (!partnerEmail || !partnerEmail.includes('@')))) : (!companyName || !rcNumber || !incorpDate || !businessAddress)} />
        </div>
      )}

      {/* Step 3: Personal Details */}
      {subStep === 3 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          {(entityType === 'INDIVIDUAL' || entityType === 'JOINT') ? (
            <>
              <h2 className="text-3xl font-black dark:text-white">Personal Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase">Gender</label>
                  <select
                    disabled={!isOnBehalf && !!user.profile?.gender}
                    className={`w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none ${!isOnBehalf && user.profile?.gender ? 'opacity-70 cursor-not-allowed' : ''}`}
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-500 uppercase">Date of Birth</label>
                  <input disabled={!isOnBehalf && !!user.profile?.date_of_birth} type="date" className={`w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none ${!isOnBehalf && !!user.profile?.date_of_birth ? 'opacity-70 cursor-not-allowed' : ''}`} value={dob} onChange={e => setDob(e.target.value)} />

                  {isMinor && (
                    <div className="p-6 rounded-2xl bg-primary/5 border-2 border-primary/20 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-start gap-4">
                        <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-xl">gavel</span>
                        </div>
                        <div>
                          <h4 className="font-black text-primary text-xs uppercase tracking-widest mb-1">Minor Beneficiary Detected</h4>
                          <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-tight">Investment for minors requires confirmation of legal guardianship.</p>
                        </div>
                      </div>

                      <label className="flex items-center gap-3 cursor-pointer group bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:border-primary/30">
                        <input
                          type="checkbox"
                          checked={isGuardianConfirmed}
                          onChange={e => setIsGuardianConfirmed(e.target.checked)}
                          className="size-5 rounded border-2 border-slate-300 text-primary focus:ring-primary shadow-sm"
                        />
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight group-hover:text-primary transition-colors">
                          I confirm that I am the legal guardian of the beneficiary
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
              <NavActions isNextDisabled={!gender || !dob || (isMinor && !isGuardianConfirmed)} />
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
                    className="h-14 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-4 font-bold dark:text-white outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10"
                    value={directorCount}
                    onChange={e => {
                      const count = parseInt(e.target.value);
                      setDirectorCount(count);
                      const newDirectors = [...directors];
                      if (count > newDirectors.length) {
                        for (let i = newDirectors.length; i < count; i++) {
                          newDirectors.push({
                            surname: '', firstName: '', middleName: '', phone: '', gender: '', dob: '', bvn: '', nin: '', tin: '', address: '', isPep: false
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
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Surname</label>
                        <input className="w-full h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all" value={director.surname} onChange={e => { const newD = [...directors]; newD[index].surname = e.target.value; setDirectors(newD); }} placeholder="e.g. Obinali" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">First Name</label>
                        <input className="w-full h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all" value={director.firstName} onChange={e => { const newD = [...directors]; newD[index].firstName = e.target.value; setDirectors(newD); }} placeholder="e.g. Divine" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Middle Name (Optional)</label>
                        <input className="w-full h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all" value={director.middleName} onChange={e => { const newD = [...directors]; newD[index].middleName = e.target.value; setDirectors(newD); }} placeholder="e.g. Chinedu" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                        <input className="w-full h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all" value={director.phone} onChange={e => { const newD = [...directors]; newD[index].phone = e.target.value; setDirectors(newD); }} placeholder="e.g. 08031234567" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Gender</label>
                        <select className="w-full h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all" value={director.gender} onChange={e => { const newD = [...directors]; newD[index].gender = e.target.value; setDirectors(newD); }}>
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Date of Birth</label>
                        <input type="date" className="w-full h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all" value={director.dob} onChange={e => { const newD = [...directors]; newD[index].dob = e.target.value; setDirectors(newD); }} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">BVN</label>
                        <input className="w-full h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all" value={director.bvn} onChange={e => { const newD = [...directors]; newD[index].bvn = e.target.value; setDirectors(newD); }} maxLength={11} placeholder="e.g. 12345678901" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">NIN</label>
                        <input className="w-full h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all" value={director.nin} onChange={e => { const newD = [...directors]; newD[index].nin = e.target.value; setDirectors(newD); }} maxLength={11} placeholder="e.g. 12345678901" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">TIN (Tax Identification Number)</label>
                        <input className="w-full h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all" value={director.tin} onChange={e => { const newD = [...directors]; newD[index].tin = e.target.value; setDirectors(newD); }} placeholder="e.g. 12345678-0001" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Residential Address</label>
                        <input className="w-full h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-5 text-base font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none transition-all" value={director.address} onChange={e => { const newD = [...directors]; newD[index].address = e.target.value; setDirectors(newD); }} placeholder="Enter full residential address" />
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
              <NavActions isNextDisabled={directors.some(d => !d.surname || !d.firstName || !d.phone || !d.gender || !d.dob || !d.tin || !d.address || d.bvn.length < 11 || d.nin.length < 11)} />
            </>
          )}
        </div>
      )}

      {/* Step 4: Further Details */}
      {subStep === 4 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <h2 className="text-3xl font-black dark:text-white">Further Details</h2>
          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-500 uppercase tracking-widest px-1">Mother's Maiden Name</label>
              <input className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-xl focus:shadow-primary/10 outline-none transition-all" value={maidenName} onChange={e => setMaidenName(e.target.value)} placeholder="e.g. Adeyemi" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest px-1">Religion</label>
                <select className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-xl focus:shadow-primary/10 outline-none transition-all" value={religion} onChange={e => setReligion(e.target.value)}>
                  <option value="Prefer not to say">Prefer not to say</option>
                  <option value="Christianity">Christianity</option>
                  <option value="Islam">Islam</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest px-1">Marital Status</label>
                <select className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-xl focus:shadow-primary/10 outline-none transition-all" value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)}>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                </select>
              </div>
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
              <label className="text-sm font-black text-slate-500 uppercase tracking-widest px-1">Mobile Number</label>
              <input
                type="tel"
                disabled={!isStaff && !isOnBehalf && !!user.profile?.phone_number}
                className={`w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-xl focus:shadow-primary/10 outline-none transition-all ${(!isStaff && !isOnBehalf && user.profile?.phone_number) ? 'opacity-70 cursor-not-allowed' : ''}`}
                value={mobileNumber}
                onChange={e => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 08012345678"
                maxLength={11}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-500 uppercase tracking-widest px-1">Email Address</label>
              <input
                type="email"
                disabled={!isStaff && !isOnBehalf && (entityType === 'INDIVIDUAL' || entityType === 'JOINT')}
                className={`w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-xl focus:shadow-primary/10 outline-none transition-all ${(!isStaff && !isOnBehalf && (entityType === 'INDIVIDUAL' || entityType === 'JOINT')) ? 'opacity-70 cursor-not-allowed' : ''}`}
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
              <label className="text-sm font-black text-slate-500 uppercase tracking-widest px-1">BVN</label>
              <input
                disabled={!isStaff && !isOnBehalf && !!bvn}
                className={`w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-xl focus:shadow-primary/10 outline-none transition-all ${(!isStaff && !isOnBehalf && bvn) ? 'opacity-70 cursor-not-allowed' : ''}`}
                value={bvn}
                onChange={e => setBvn(e.target.value.replace(/\D/g, ''))}
                maxLength={11}
                placeholder="11-digit BVN e.g. 22233344455"
                title={bvn ? "BVN cannot be changed" : ""}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-500 uppercase tracking-widest px-1">NIN</label>
              <input
                className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-xl focus:shadow-primary/10 outline-none transition-all"
                value={nin}
                onChange={e => setNin(e.target.value.replace(/\D/g, ''))}
                maxLength={11}
                placeholder="11-digit NIN e.g. 11122233344"
              />
            </div>
            {(entityType === 'INDIVIDUAL' || entityType === 'JOINT') && (
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest px-1">TIN Number</label>
                <input
                  disabled={!isOnBehalf && !!user.profile?.tin_number}
                  className={`w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-xl focus:shadow-primary/10 outline-none transition-all ${(!isOnBehalf && user.profile?.tin_number) ? 'opacity-70 cursor-not-allowed' : ''}`}
                  value={tinNumber}
                  onChange={e => setTinNumber(e.target.value)}
                  placeholder="e.g. 12345678-0001"
                />
              </div>
            )}
          </div>
          <NavActions isNextDisabled={bvn.length < 11 || nin.length < 11 || ((entityType === 'INDIVIDUAL' || entityType === 'JOINT') && !tinNumber)} />
        </div>
      )}

      {/* Step 7: Address */}
      {subStep === 7 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <h2 className="text-3xl font-black dark:text-white">Address Details</h2>
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest px-1">State of Origin</label>
                <select
                  disabled={!isOnBehalf && !!user.profile?.state_of_origin}
                  className={`w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-xl focus:shadow-primary/10 outline-none transition-all ${(!isOnBehalf && user.profile?.state_of_origin) ? 'opacity-70 cursor-not-allowed' : ''}`}
                  value={stateOfOrigin}
                  onChange={e => setStateOfOrigin(e.target.value)}
                >
                  <option value="">Select State</option>
                  {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest px-1">State of Residence</label>
                <select
                  disabled={!isOnBehalf && !!user.profile?.state_of_residence}
                  className={`w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-xl focus:shadow-primary/10 outline-none transition-all ${(!isOnBehalf && user.profile?.state_of_residence) ? 'opacity-70 cursor-not-allowed' : ''}`}
                  value={stateOfResidence}
                  onChange={e => setStateOfResidence(e.target.value)}
                >
                  <option value="">Select State</option>
                  {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-500 uppercase tracking-widest px-1">Full Home Address</label>
              <textarea
                rows={3}
                className="w-full p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-xl focus:shadow-primary/10 outline-none transition-all leading-relaxed"
                value={homeAddress}
                onChange={e => setHomeAddress(e.target.value)}
                placeholder="e.g. 15, Admiralty Way, Lekki Phase 1, Lagos"
              />
            </div>
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
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest px-1">Full Name</label>
                <input
                  className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-xl focus:shadow-primary/10 outline-none transition-all"
                  value={nokName}
                  onChange={e => setNokName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest px-1">Relationship</label>
                <select
                  className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-xl focus:shadow-primary/10 outline-none transition-all"
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
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest px-1">Phone Number</label>
                <div className="flex gap-2">
                  <input
                    className="w-24 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-4 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                    value={nokCountryCode}
                    onChange={e => setNokCountryCode(e.target.value)}
                    placeholder="+234"
                  />
                  <input
                    className="flex-1 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                    value={nokPhoneNumber}
                    onChange={e => setNokPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 08012345678"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center group">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest">Contact Address</label>
                <div
                  className={`flex items-center gap-3 cursor-pointer py-2 px-4 rounded-xl transition-all border-2 ${isNokSameAddress ? 'bg-primary/5 border-primary/20 text-primary shadow-sm' : 'border-slate-100 dark:border-slate-800'}`}
                  onClick={() => setIsNokSameAddress(!isNokSameAddress)}
                >
                  <div className={`size-5 rounded-lg border-2 flex items-center justify-center transition-all ${isNokSameAddress ? 'bg-primary border-primary text-white scale-110' : 'border-slate-300'}`}>
                    {isNokSameAddress && <span className="material-symbols-outlined text-xs font-black">check</span>}
                  </div>
                  <span className={`text-xs font-black uppercase tracking-tight select-none ${isNokSameAddress ? 'text-primary' : 'text-slate-400'}`}>
                    Same address as me
                  </span>
                </div>
              </div>
              <div className="relative">
                <textarea
                  rows={2}
                  disabled={isNokSameAddress}
                  className={`w-full p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-lg font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-xl focus:shadow-primary/10 outline-none transition-all ${isNokSameAddress ? 'opacity-70 cursor-not-allowed border-primary/20 bg-primary/5' : ''}`}
                  value={nokAddress}
                  onChange={e => { setNokAddress(e.target.value); if (isNokSameAddress) setIsNokSameAddress(false); }}
                  placeholder="e.g. 15, Admiralty Way, Lekki Phase 1, Lagos"
                />
                {isNokSameAddress && (
                  <div className="absolute top-4 right-6 pointer-events-none text-primary/40 animate-in fade-in zoom-in duration-300">
                    <span className="material-symbols-outlined filled">verified</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <NavActions isNextDisabled={!nokName || !nokRelationship || !nokPhoneNumber || !nokAddress} />
        </div>
      )}

      {/* Step 9: Docs */}
      {subStep === 9 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
          <h2 className="text-3xl font-black dark:text-white">Secure Vault</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {currentDocs.map(doc => {
              const inputId = `upload-${doc.id}`;
              const isSelfie = doc.id === 'selfie';

              if (isSelfie && isIdentityVerifiedWithin6Months) {
                return (
                  <div key={doc.id} className="p-10 rounded-[2.5rem] border-2 border-green-500 bg-green-500/5 flex flex-col items-center gap-5 justify-center relative overflow-hidden">
                    <div className="size-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/20">
                      <span className="material-symbols-outlined text-3xl">verified</span>
                    </div>
                    <div className="text-center space-y-2">
                       <h4 className="font-black text-sm uppercase tracking-tight dark:text-white">Identity Verified</h4>
                       <p className="text-[10px] text-green-600 dark:text-green-400 font-black uppercase tracking-widest">Valid for 6 Months</p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={doc.id} className="relative group">
                  <input
                    type="file"
                    id={inputId}
                    className="hidden"
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        console.log(`[FILE] Selected ${e.target.files[0].name} for ${doc.id}`);
                        handleFileUpload(doc.id, e.target.files[0]);
                      }
                    }}
                  />
                  <div
                    onClick={() => {
                        if (isSelfie) {
                            if (!bvn) return alert("Please provide your BVN in the identity section before verification.");
                            setShowCamera(true);
                        } else {
                            document.getElementById(inputId)?.click();
                        }
                    }}
                    className={`p-10 rounded-[2.5rem] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center gap-5 w-full min-h-[200px] justify-center ${uploadedDocs[doc.id] ? 'border-green-500 bg-green-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 shadow-sm hover:shadow-xl'}`}
                  >
                    {uploadedDocs[doc.id] ? (
                      <div className="size-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/20 animate-in zoom-in"><span className="material-symbols-outlined text-3xl">task_alt</span></div>
                    ) : (isUploading[doc.id] || (isSelfie && isVerifyingIdentity)) ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-primary animate-pulse">{isVerifyingIdentity ? 'VERIFYING FACE...' : 'UPDATING VAULT...'}</p>
                      </div>
                    ) : (
                      <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all transform group-hover:scale-110"><span className="material-symbols-outlined text-3xl">{isSelfie ? 'face' : doc.icon}</span></div>
                    )}
                    <div className="text-center space-y-2">
                      <h4 className="font-black text-sm uppercase tracking-tight dark:text-white">{isSelfie ? 'Real-Time Identity Verify' : doc.label}</h4>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{isSelfie ? 'Bvn Face Match' : (doc.required ? 'Required Document' : 'Optional Support')}</p>
                      {uploadedDocs[doc.id] && <p className="text-[10px] text-primary font-black truncate max-w-[150px] mx-auto bg-primary/10 px-3 py-1 rounded-full">{uploadedDocs[doc.id]?.name}</p>}
                    </div>
                    {uploadProgress[doc.id] > 0 && uploadProgress[doc.id] < 100 && (
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2 shadow-inner">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress[doc.id]}%` }}></div>
                      </div>
                    )}
                    {uploadedDocs[doc.id] && !isSelfie && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDoc(doc.id);
                          const input = document.getElementById(inputId) as HTMLInputElement;
                          if (input) input.value = '';
                        }}
                        className="absolute top-6 right-6 p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-all hover:rotate-90"
                      >
                        <span className="material-symbols-outlined text-lg">cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <NavActions isNextDisabled={!isSecureVaultComplete && !isIdentityVerifiedWithin6Months} />
        </div>
      )}

      {/* Camera Modal */}
      <AnimatePresence>
        {showCamera && (
            <CameraCapture 
                onCapture={async (file) => {
                    setShowCamera(false);
                    setIsVerifyingIdentity(true);
                    try {
                        // 1. Upload the selfie
                        const uploadRes = await investmentService.uploadDocument(file, draftId, 'selfie');
                        const selfieUrl = uploadRes.document.file_url;
                        
                        // 2. Perform Face Match with Zeeh Africa via Backend
                        const verifyRes = await investmentService.verifyIdentity(bvn, selfieUrl);
                        
                        if (verifyRes.success) {
                            setUploadedDocs(prev => ({ 
                                ...prev, 
                                selfie: { name: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, url: selfieUrl } 
                            }));
                            
                            // Update local user state immediately so memo recalculates
                            if (user.profile) {
                                user.profile.is_identity_verified = true;
                                user.profile.last_selfie_verified_at = new Date().toISOString();
                            }
                            
                            alert("Identity Verified! Face match successful.");
                        }
                    } catch (err: any) {
                        alert(err.message || "Face Verification Failed. Please try again.");
                    } finally {
                        setIsVerifyingIdentity(false);
                    }
                }}
                onClose={() => setShowCamera(false)}
            />
        )}
      </AnimatePresence>

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
                <div className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400 group-focus-within:text-primary transition-colors">{currency === 'NGN' ? '₦' : '$'}</span>
                  <input
                    disabled={isClaimingGift}
                    className="w-full h-20 pl-14 pr-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-3xl font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 focus:shadow-2xl focus:shadow-primary/10 outline-none transition-all"
                    value={amount}
                    onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 500,000"
                  />
                </div>
                {currency === 'USD' && selectedPlan !== 'VAULT' ? (
                  <p className="text-xs font-bold text-red-500 mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    USD is only available for NOLT VAULT. Please switch to NGN.
                  </p>
                ) : (parseFloat(amount) < minAmount && amount) ? (
                  <p className="text-xs font-bold text-red-500 mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    Minimum investment for NOLT {selectedPlan} is {formatMoney(minAmount, currency)}
                  </p>
                ) : (!dynamicInterestRate && !rateLoading && parseFloat(amount) > 0) ? (
                  <p className="text-xs font-bold text-red-500 mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    No valid interest rate found for this amount and tenure.
                  </p>
                ) : null}
              </div>
              {selectedPlan === 'RISE' && (
                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-widest">Target Amount (Optional)</label>
                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400 group-focus-within:text-primary transition-colors">{currency === 'NGN' ? '₦' : '$'}</span>
                    <input
                      disabled={isClaimingGift}
                      className="w-full h-16 pl-12 pr-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-xl font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-xl focus:shadow-primary/10 outline-none transition-all"
                      value={targetAmount}
                      onChange={e => setTargetAmount(e.target.value)}
                      placeholder="What is your savings goal?"
                    />
                  </div>
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

              {selectedPlan !== 'SURGE' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-widest">Tenure (Days)</label>
                    <div className="flex items-center gap-4">
                    <span className="bg-primary text-white font-black px-6 py-2 rounded-full text-sm">
                      {isInfinityTenure ? '∞' : `${tenure} Days`}
                    </span>
                  </div>
                </div>
                {!isInfinityTenure && !isClaimingGift ? (
                  <div className="relative pt-4">
                    <input
                      type="range"
                      min="0"
                      max={[30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 365].length - 1}
                      step="1"
                      value={[30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 365].indexOf(tenure)}
                      onChange={(e) => setTenure([30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 365][parseInt(e.target.value)])}
                      className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between mt-2 px-1">
                      <span className="text-[9px] font-bold text-slate-400">30D</span>
                      <span className="text-[9px] font-bold text-slate-400">180D</span>
                      <span className="text-[9px] font-bold text-slate-400">365D</span>
                    </div>
                  </div>
                ) : !isInfinityTenure && (
                  <input
                    disabled
                    type="text"
                    value={`${tenure} Days`}
                    className="w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-lg font-bold dark:text-white opacity-70"
                  />
                )}
                </div>
            )}
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
                <select disabled={isClaimingGift} className="w-full h-16 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 px-6 text-xl font-bold dark:text-white focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 outline-none" value={rollover} onChange={e => setRollover(e.target.value)}>
                  <option value="principal_interest">Rollover Principal & Interest</option>
                  <option value="principal_only">Rollover Principal Only</option>
                  <option value="none">Payout at Maturity</option>
                </select>
              </div>
              <NavActions isNextDisabled={parseFloat(amount) < minAmount || rateLoading || !dynamicInterestRate || (currency === 'USD' && selectedPlan !== 'VAULT')} />
            </div>
            <div className="lg:col-span-5">
              <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 size-48 bg-primary/20 rounded-full blur-3xl -mr-24 -mt-24"></div>
                <h3 className="text-xl font-black uppercase tracking-widest">Returns Estimate</h3>
                <div className="bg-white/5 p-8 rounded-3xl border border-white/10 ring-2 ring-primary/20">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Expected Maturity Value</p>
                  <span className="text-5xl font-black text-primary">{formatMoney(returns.total, currency)} <span className='text-sm'>Est</span></span>
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

                {/* Referral Code Field */}
                {/* {!isTopUp && (
                  <div className="pt-6 border-t border-white/10 space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Referral / Sales Officer Code</label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-lg group-focus-within:text-primary transition-colors">loyalty</span>
                      <input
                        type="text"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        placeholder="Enter Code (Optional)"
                        className="w-full h-14 pl-12 pr-4 bg-white/5 border-2 border-white/10 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-lg focus:shadow-primary/10 focus:bg-white/10 outline-none transition-all placeholder:text-slate-600"
                      />
                    </div>
                    <p className="text-[9px] text-slate-500 font-medium italic">Assign this investment to a specific sales representative.</p>
                  </div>
                )} */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 11: Signature */}
      {subStep === 11 && (
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
                    I/We, <span className="font-bold border-b border-slate-300 px-2">{fullName || '____________________'}</span> (the "Customer") refer to the mandate between NOLT Finance Company Limited, (“the Company”) and the Customer governing the operation of the Customer’s account(s) and credit, investment or other transactions with the Company (the mandate).
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
                          {fullName || '____________________'}
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
              <button onClick={handleBack} className="flex-1 sm:flex-none px-6 md:px-8 py-3 md:py-4 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-700 text-sm md:text-base">
                <span className="material-symbols-outlined text-lg">arrow_back</span> Back
              </button>
              <button onClick={handleSaveAndExit} className="flex-1 sm:flex-none px-6 md:px-8 py-3 md:py-4 text-primary font-bold hover:bg-primary/5 rounded-full transition-all flex items-center justify-center gap-2 text-sm md:text-base">
                <span className="material-symbols-outlined text-lg">save_as</span> Save & Exit
              </button>
            </div>
            <button
              onClick={preSubmitCheck}
              disabled={!acceptedIndemnity || !hasSigned || loading}
              className={`w-full sm:w-auto px-10 md:px-12 py-3 md:py-4 rounded-full font-black text-base md:text-lg transition-all flex items-center justify-center gap-3 ${acceptedIndemnity && hasSigned && !loading ? 'bg-primary text-white shadow-xl shadow-primary/30 hover:-translate-y-1' : 'bg-slate-200 text-slate-400 cursor-not-allowed grayscale'}`}
            >
              {loading ? 'Processing...' : 'Finish Investment'}
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
          className="text-center space-y-8 md:space-y-10 py-10 md:py-20 animate-in fade-in zoom-in duration-700 px-4 md:px-0"
        >
          <div className="relative inline-block">
            <div className="size-24 md:size-32 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mx-auto shadow-xl ring-8 ring-green-500/5">
              <span className="material-symbols-outlined text-4xl md:text-6xl filled">check_circle</span>
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -inset-4 bg-green-500/20 rounded-full -z-10 blur-xl"
            />
          </div>

          <div className="space-y-3 md:space-y-4">
            <h2 className="text-3xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight px-2">
              {giftToken ? 'Gift Claimed!' : 'Investment Successful!'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-lg font-medium max-w-lg mx-auto leading-relaxed">
              {giftToken
                ? "Your gifted investment has been activated. You can track your returns on the dashboard."
                : "Your investment has been successfully processed. Welcome to the future of wealth management."}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 md:gap-6">
            {/* <button
              onClick={() => { onComplete(); navigate('DASHBOARD'); }}
              className="w-full sm:w-auto px-8 md:px-12 py-4 md:py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-lg md:text-xl rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 ring-4 ring-slate-900/5 dark:ring-white/10"
            >
              Back to Dashboard
              <span className="material-symbols-outlined">dashboard</span>
            </button> */}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full max-w-sm mx-auto p-8 bg-emerald-50/30 dark:bg-emerald-500/10 border-2 border-dashed border-emerald-500/20 rounded-[2.5rem] space-y-5 shadow-inner"
            >
              {createdInvestment?.indemnity_document_url ? (
                <>
                  <div className="flex items-center gap-3 justify-center text-emerald-600 dark:text-emerald-400">
                    <span className="material-symbols-outlined filled text-3xl">description</span>
                    <span className="text-xs font-black uppercase tracking-widest">Legal Document Prepared</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-300 font-medium leading-relaxed">
                    Your signed indemnity agreement is ready. Please download and keep a copy for your records.
                  </p>
                  <a
                    href={createdInvestment.indemnity_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-4 bg-emerald-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/30 hover:scale-105 transition-all group"
                  >
                    <span className="material-symbols-outlined text-xl group-hover:animate-bounce">download</span>
                    Download Indemnity
                  </a>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-400 py-4 opacity-70">
                  <span className="material-symbols-outlined text-4xl animate-spin duration-3000">progress_activity</span>
                  <p className="text-[10px] font-black uppercase tracking-widest">Finalizing Paperwork...</p>
                </div>
              )}
            </motion.div>

            <button
              onClick={() => { onComplete(); navigate('DASHBOARD'); }}
              className="w-full sm:w-auto px-8 md:px-12 py-4 md:py-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black text-lg md:text-xl rounded-2xl border-2 border-slate-100 dark:border-slate-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 group"
            >
              Back to Dashboard
              <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">dashboard</span>
            </button>
          </div>
        </motion.div>
      )}

      <CBNLogo />
      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={parseFloat(amount)}
        currency={currency}
        onPayOnline={() => {
          setShowPaymentModal(false);
          handlePayOnline();
        }}
        onUploadReceipt={handleUploadReceipt}
        onBankTransferComplete={handleBankTransferSubmit}
      />
    </div>
  );
};

export default InvestmentFlow;