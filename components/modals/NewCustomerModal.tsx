
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (bvn?: string) => void;
  initialBvn?: string;
}

type Step = 0 | 1 | 2;

const STEPS = [
  'BVN Lookup',
  'Personal Details',
  'Tier 3 Verification'
];

const NewCustomerModal: React.FC<NewCustomerModalProps> = ({ isOpen, onClose, onSuccess, initialBvn }) => {
  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [bvn, setBvn] = useState(initialBvn || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingProgress, setOnboardingProgress] = useState(false);
  const [customerOnboarded, setCustomerOnboarded] = useState(false);
  const [onboardedData, setOnboardedData] = useState<any>(null);
  const [cbaBalance, setCbaBalance] = useState<number | null>(null);
  const [fetchingBalance, setFetchingBalance] = useState(false);

  // Form state pre-filled from BVN
  const [formData, setFormData] = useState({
    title: '',
    firstName: '',
    lastName: '',
    middleName: '',
    preferred_first_name: '',
    preferred_surname: '',
    preferred_middle_name: '',
    email: '',
    phone: '',
    nin: '',
    address: '',
    stateOfResidence: '',
    stateOfOrigin: '',
    dob: '',
    gender: '',
    maritalStatus: '',
    utility_bill_url: '',
    avatar_url: ''
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (initialBvn && isOpen && initialBvn.length === 11) {
      handleLookupBVN(initialBvn);
    }
  }, [initialBvn, isOpen]);

  if (!isOpen) return null;

  const handleLookupBVN = async (bvnToLookup?: string) => {
    const lookupVal = typeof bvnToLookup === 'string' ? bvnToLookup : bvn;
    if (lookupVal.length !== 11) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/staff/kyc/lookup-bvn?bvn=${lookupVal}`);
      if (response.data.success) {
        if (response.data.already_exists) {
          const custData = response.data.customer;
          setOnboardedData(custData);
          setCustomerOnboarded(true);

          if (custData.casa) {
            setFetchingBalance(true);
            try {
              const balRes = await axios.get(`/api/staff/kyc/cba-balance/${custData.casa}`);
              if (balRes.data.success) {
                setCbaBalance(balRes.data.data.AvailableBalance ?? balRes.data.data.availableBalance);
              }
            } catch (e) { }
            setFetchingBalance(false);
          }
          setLoading(false);
          return;
        }

        const data = response.data.data;
        // Convert YYYY-MM-DD or DD-MM-YYYY to YYYY-MM-DD for date input
        let dob = data.dob || '';
        if (dob.includes('-')) {
          const parts = dob.split('-');
          if (parts[0].length === 2) dob = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        setFormData(prev => {
          const fName = data.firstName || '';
          const lName = data.lastName || '';
          const mName = data.middleName || '';
          
          // Helper to convert string to Proper Case
          const toProperCase = (str: string) =>
            str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

          return {
            ...prev,
            firstName: fName,
            lastName: lName,
            middleName: mName,
            preferred_first_name: toProperCase(fName),
            preferred_surname: toProperCase(lName),
            preferred_middle_name: toProperCase(mName),
            email: data.email || '',
            phone: data.phone || '',
            dob: dob,
            gender: data.gender || '',
            avatar_url: data.avatar_url || ''
          };
        });
        setCurrentStep(1);
      } else {
        setError(response.data.message || 'BVN lookup failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error connecting to verification service');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('document_type', 'utility_bill');

    try {
      const response = await axios.post('/api/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, utility_bill_url: response.data.document.file_url }));
      setError(null);
    } catch (err) {
      alert('Failed to upload utility bill');
    } finally {
      setUploading(false);
    }
  };

  const handleContinueToStep2 = () => {
    if (!formData.title || !formData.firstName || !formData.lastName || !formData.nin || !formData.phone || !formData.email || !formData.gender || !formData.dob || !formData.maritalStatus) {
      setError("Please fill in all required personal details (including NIN) before proceeding.");
      return;
    }
    if (formData.nin.length !== 11) {
      setError("NIN must be exactly 11 digits.");
      return;
    }
    setError(null);
    setCurrentStep(2);
  };

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingProgress(true);
    setError(null);

    if (!formData.utility_bill_url) {
      setError("Please upload a utility bill for Tier 3 verification.");
      setOnboardingProgress(false);
      return;
    }

    const payload = {
      ...formData,
      full_name: `${formData.preferred_first_name || formData.firstName} ${formData.preferred_surname || formData.lastName}`.trim(),
      bvn
    };

    try {
      const response = await axios.post('/api/staff/kyc/onboard-customer', payload);
      if (response.data.success) {
        setCustomerOnboarded(true);
        const custData = response.data.customer;
        setOnboardedData(custData);
        if (custData.casa) {
          setFetchingBalance(true);
          try {
            const balRes = await axios.get(`/api/staff/kyc/cba-balance/${custData.casa}`);
            if (balRes.data.success) {
              setCbaBalance(balRes.data.data.AvailableBalance ?? balRes.data.data.availableBalance);
            }
          } catch (e) { }
          setFetchingBalance(false);
        }
        if (onSuccess) onSuccess(bvn);
      } else {
        setError(response.data.message || 'Onboarding failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error during onboarding process');
    } finally {
      setOnboardingProgress(false);
    }
  };

  const resetModal = () => {
    setCurrentStep(0);
    setBvn('');
    setLoading(false);
    setError(null);
    setOnboardingProgress(false);
    setCustomerOnboarded(false);
    setOnboardedData(null);
    setCbaBalance(null);
    setFetchingBalance(false);
    setFormData({
      title: '',
      firstName: '',
      lastName: '',
      middleName: '',
      preferred_first_name: '',
      preferred_surname: '',
      preferred_middle_name: '',
      email: '',
      phone: '',
      nin: '',
      address: '',
      stateOfResidence: '',
      stateOfOrigin: '',
      dob: '',
      gender: '',
      maritalStatus: '',
      utility_bill_url: '',
      avatar_url: ''
    });
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-12 mb-8">
      {STEPS.map((step, idx) => (
        <div key={idx} className="flex flex-col items-center gap-2 relative">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-black transition-all ${currentStep === idx
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-110'
              : currentStep > idx
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}>
            {currentStep > idx ? <span className="material-symbols-outlined text-sm font-black">check</span> : idx + 1}
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${currentStep === idx ? 'text-blue-600' : 'text-slate-400'
            }`}>{step}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-[#1e293b] rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden relative my-auto border border-slate-100 dark:border-slate-800"
      >
        <div className="p-10">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Onboard New Customer</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Automated KYC Tiering & Provisioning</p>
            </div>
            <button
              onClick={() => { resetModal(); onClose(); }}
              className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              <span className="material-symbols-outlined font-black">close</span>
            </button>
          </div>

          {!customerOnboarded && renderStepIndicator()}

          <div className="min-h-[400px]">
            {customerOnboarded ? (
              <div className="flex flex-col items-center justify-center py-6 animate-in fade-in zoom-in duration-500 w-full">
                <div className="w-full bg-white dark:bg-[#1e293b] rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden mb-6">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 px-6 py-3 flex items-center justify-end">
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                      {onboardedData?.already_exists ? 'CORE BANKING RECORD FOUND' : 'CUSTOMER PROFILE CREATED'}
                    </span>
                  </div>

                  <div className="p-8">
                    <div className="flex items-center gap-6 mb-8">
                      {onboardedData?.avatar_url ? (
                        <div className="w-20 h-20 rounded-full shadow-lg shadow-slate-900/10 overflow-hidden border-2 border-white dark:border-slate-800">
                          <img src={onboardedData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-slate-900 dark:bg-emerald-600 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-emerald-600/30">
                          {onboardedData?.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                          {onboardedData?.full_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-bold text-slate-500 tracking-[0.2em]">
                            {onboardedData?.casa || 'PENDING CASA'}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest italic">Active Profile</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-y-8 gap-x-4 mb-8">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DOB / GENDER</p>
                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase">
                          {onboardedData?.date_of_birth ? new Date(onboardedData.date_of_birth).toLocaleDateString() : 'N/A'} • {onboardedData?.gender || 'N/A'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">VERIFICATION (BVN)</p>
                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">
                          •••• •••• {onboardedData?.bvn?.slice(-3) || 'XXX'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CURRENT WALLET BALANCE</p>
                        {fetchingBalance ? (
                          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                        ) : (
                          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                            {cbaBalance !== null ? `₦${cbaBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'N/A'}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">KYC TIER</p>
                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase italic">
                          TIER {onboardedData?.kyc_tier || 1}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ACCOUNT TYPE</p>
                        <p className="text-xs font-black text-blue-600 uppercase italic">INDIVIDUAL</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CONTACT INFO</p>
                        <p className="text-[10px] font-bold text-slate-900 dark:text-white uppercase">
                          {onboardedData?.phone_number}<br />
                          {onboardedData?.email}
                        </p>
                      </div>
                    </div>

                    {/* <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-700">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                           <span className="material-symbols-outlined text-sm font-black">verified_user</span>
                         </div>
                         <div>
                           <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">ONBOARDING COMPLETE</p>
                           <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">PROFILE SYNCED ACROSS NOLT ECOSYSTEM</p>
                         </div>
                       </div>
                       <button className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all">
                         VIEW DEEP PROFILE
                       </button>
                    </div> */}
                  </div>
                </div>

                <div className="flex gap-4 w-full">
                  <button
                    onClick={resetModal}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    NEW ONBOARDING
                  </button>
                  <button
                    onClick={() => { resetModal(); onClose(); }}
                    className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    CLOSE & FINISH
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {currentStep === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 min-h-[400px]">
                    <div className="w-full max-w-md space-y-10">
                      <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-blue-600/10 rounded-3xl flex items-center justify-center text-blue-600 mx-auto mb-6">
                          <span className="material-symbols-outlined text-3xl font-black">badge</span>
                        </div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Identity Verification</h4>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-wide">
                          Enter the customer's 11-digit BVN to fetch verified identity data from Dojah.
                        </p>
                      </div>

                      <div className="space-y-6">
                        <div className="relative group">
                          <div className="absolute -top-3 left-6 bg-white dark:bg-[#1e293b] px-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] z-10">Bank Verification Number</div>
                          <input
                            type="text"
                            maxLength={11}
                            value={bvn}
                            onChange={(e) => setBvn(e.target.value.replace(/\D/g, ''))}
                            disabled={loading}
                            placeholder="01234567890"
                            className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl text-center text-2xl font-black tracking-[0.3em] dark:text-white focus:border-blue-600 outline-none transition-all disabled:opacity-50"
                          />
                        </div>

                        {error && (
                          <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800 rounded-2xl text-center">
                            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{error}</p>
                          </div>
                        )}

                        <button
                          onClick={handleLookupBVN}
                          disabled={bvn.length !== 11 || loading}
                          className="w-full py-5 bg-slate-900 dark:bg-blue-600 text-white rounded-3xl font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:bg-blue-700 transition-all disabled:opacity-20 flex items-center justify-center gap-4"
                        >
                          {loading && <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />}
                          Verify & Continue
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {(currentStep === 1 || currentStep === 2) && (
                  <form onSubmit={handleOnboard} className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
                    {currentStep === 1 ? (
                      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Title</p>
                          <select required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input-field-onboarding">
                            <option value="">Select...</option>
                            <option value="Mr.">Mr.</option>
                            <option value="Mrs">Mrs</option>
                            <option value="Master">Master</option>
                            <option value="Miss">Miss</option>
                            <option value="Ms">Ms</option>
                          </select>
                        </div>
                        {/* 🔒 BVN Verified Name (Read-Only) */}
                        <div className="col-span-full p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                          <div className="flex items-center gap-2 text-slate-500">
                            <span className="material-symbols-outlined text-sm font-black">lock</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">BVN Verified Name (Read-Only)</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">First Name</p>
                              <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{formData.firstName || '—'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Last Name</p>
                              <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{formData.lastName || '—'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Middle Name</p>
                              <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{formData.middleName || '—'}</p>
                            </div>
                          </div>
                        </div>

                        {/* ✏️ Preferred Name (Editable) */}
                        <div className="col-span-full border-t border-slate-100 dark:border-slate-800 pt-4 mt-2 grid grid-cols-3 gap-4">
                          <div className="col-span-full flex items-center gap-2 mb-1 text-blue-600 dark:text-blue-400">
                            <span className="material-symbols-outlined text-sm font-black">edit</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Preferred Name (Editable - prefilled from BVN)</span>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preferred First Name</p>
                            <input 
                              required 
                              type="text" 
                              value={formData.preferred_first_name} 
                              onChange={(e) => setFormData({ ...formData, preferred_first_name: e.target.value })} 
                              onBlur={(e) => {
                                const formatted = e.target.value.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
                                setFormData(prev => ({ ...prev, preferred_first_name: formatted }));
                              }}
                              className="input-field-onboarding" 
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preferred Surname</p>
                            <input 
                              required 
                              type="text" 
                              value={formData.preferred_surname} 
                              onChange={(e) => setFormData({ ...formData, preferred_surname: e.target.value })} 
                              onBlur={(e) => {
                                const formatted = e.target.value.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
                                setFormData(prev => ({ ...prev, preferred_surname: formatted }));
                              }}
                              className="input-field-onboarding" 
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preferred Middle Name</p>
                            <input 
                              type="text" 
                              value={formData.preferred_middle_name} 
                              onChange={(e) => setFormData({ ...formData, preferred_middle_name: e.target.value })} 
                              onBlur={(e) => {
                                const formatted = e.target.value.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
                                setFormData(prev => ({ ...prev, preferred_middle_name: formatted }));
                              }}
                              className="input-field-onboarding" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">NIN</p>
                          <input required type="text" maxLength={11} value={formData.nin} onChange={(e) => setFormData({ ...formData, nin: e.target.value.replace(/\D/g, '') })} className="input-field-onboarding" placeholder="11-digit NIN" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mobile Number</p>
                          <input required type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input-field-onboarding" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</p>
                          <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-field-onboarding" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Gender</p>
                          <select required value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="input-field-onboarding">
                            <option value="">Select...</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Date of Birth</p>
                          <input required type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} className="input-field-onboarding" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Marital Status</p>
                          <select required value={formData.maritalStatus} onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })} className="input-field-onboarding">
                            <option value="">Select...</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                          </select>
                        </div>

                        <div className="col-span-full pt-6 flex gap-4">
                          <button type="button" onClick={() => setCurrentStep(0)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest">Back</button>
                          <button type="button" onClick={handleContinueToStep2} className="flex-[2] py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">Continue to Tier 3</button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">State of Residence</p>
                            <select required value={formData.stateOfResidence} onChange={(e) => setFormData({ ...formData, stateOfResidence: e.target.value })} className="input-field-onboarding">
                              <option value="">Select State...</option>
                              {["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT"].map(state => (
                                <option key={state} value={state}>{state}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">State of Origin</p>
                            <select required value={formData.stateOfOrigin} onChange={(e) => setFormData({ ...formData, stateOfOrigin: e.target.value })} className="input-field-onboarding">
                              <option value="">Select State...</option>
                              {["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT"].map(state => (
                                <option key={state} value={state}>{state}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-full space-y-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Residential Address</p>
                            <textarea required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input-field-onboarding min-h-[60px] pt-3" placeholder="Enter full residential address" />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Utility Bill (Required for Tier 3)</p>
                          <div className="relative group h-32 rounded-[24px] border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center transition-all hover:border-blue-500 overflow-hidden">
                            {formData.utility_bill_url ? (
                              <div className="flex flex-col items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-500 text-3xl font-black">check_circle</span>
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Document Uploaded</span>
                                <button type="button" onClick={() => setFormData({ ...formData, utility_bill_url: '' })} className="text-[9px] font-black text-rose-500 uppercase underline mt-1">Remove</button>
                              </div>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-500 text-3xl mb-2">cloud_upload</span>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Click to upload bill</p>
                                <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,application/pdf" />
                              </>
                            )}
                            {uploading && <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center"><span className="w-6 h-6 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" /></div>}
                          </div>
                        </div>

                        <div className="pt-6 flex gap-4">
                          <button type="button" onClick={() => setCurrentStep(1)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest">Back</button>
                          <button type="submit" disabled={onboardingProgress} className="flex-[2] py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-4 disabled:opacity-50">
                            {onboardingProgress && <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />}
                            Submit Tier 3 Application
                          </button>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800 rounded-2xl text-center mt-4">
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{error}</p>
                      </div>
                    )}
                  </form>
                )}
              </>
            )}
          </div>
        </div>

        {/* CSS for custom onboarding inputs to match design */}
        <style dangerouslySetInnerHTML={{
          __html: `
          .input-field-onboarding {
            width: 100%;
            padding: 0.875rem 1.25rem;
            background: rgb(248 250 252);
            border-width: 2px;
            border-style: solid;
            border-color: rgb(241 245 249);
            border-radius: 1rem;
            font-size: 0.75rem;
            font-weight: 900;
            text-transform: uppercase;
            outline: none;
            transition: all 0.2s;
          }
          .dark .input-field-onboarding {
            background: rgb(30 41 59);
            border-color: rgb(51 65 85);
            color: white;
          }
          .input-field-onboarding:focus {
            border-color: rgb(37 99 235);
          }
        ` }} />
      </motion.div>
    </div>
  );
};

export default NewCustomerModal;
