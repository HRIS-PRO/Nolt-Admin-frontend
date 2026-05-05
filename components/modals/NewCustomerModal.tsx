
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 0 | 1;

const STEPS = [
  'BVN Lookup',
  'Customer Profile'
];

const mockExistingCustomer = {
  firstName: "Adewale",
  lastName: "Okafor",
  middleName: "Emeka",
  bvn: "22387654210",
  casaAccountNo: "0087654321",
  balance: 184500.00,
  accountTier: "Tier 2",
  accountType: "Individual",
  dob: "12/04/1988",
  gender: "Male",
  maritalStatus: "Married",
  email: "adewale.okafor@example.com",
  phone: "08034567890",
  address: "12, Admiralty Way, Lekki Phase 1, Lagos"
};

const mockNewCustomer = {
  firstName: "Blessing",
  lastName: "Nwosu",
  middleName: "",
  bvn: "22198765430",
  casaAccountNo: "0094321876",
  balance: 0,
  accountTier: "Tier 1",
  accountType: "Individual",
  dob: "03/09/1995",
  gender: "Female",
  maritalStatus: "Single",
  email: "",
  phone: "",
  address: ""
};

const NewCustomerModal: React.FC<NewCustomerModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [bvn, setBvn] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulateCASAFound, setSimulateCASAFound] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerCreated, setCustomerCreated] = useState(false);
  const [customerData, setCustomerData] = useState<any>(null);

  // New customer form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    mobile: '',
    email: '',
    address: '',
    stateOfResidence: '',
    dob: '',
    gender: '',
    maritalStatus: '',
    accountType: 'Individual'
  });

  if (!isOpen) return null;

  const handleSearchCustomer = () => {
    if (bvn.length !== 11) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (simulateCASAFound) {
        setCustomerData(mockExistingCustomer);
        setCurrentStep(1);
      } else {
        setShowCreateForm(true);
      }
    }, 1500);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCustomer(true);
    setTimeout(() => {
      setCreatingCustomer(false);
      setCustomerCreated(true);
      setCustomerData({
        ...mockNewCustomer,
        firstName: formData.firstName || mockNewCustomer.firstName,
        lastName: formData.lastName || mockNewCustomer.lastName,
        middleName: formData.middleName,
        phone: formData.mobile,
        email: formData.email,
        address: formData.address,
        stateOfResidence: formData.stateOfResidence,
        accountTier: formData.accountType, // Using accountType for tier display in summary for now
      });
      setTimeout(() => {
        setCurrentStep(1);
      }, 1500);
    }, 1500);
  };

  const resetModal = () => {
    setCurrentStep(0);
    setBvn('');
    setLoading(false);
    setShowCreateForm(false);
    setCreatingCustomer(false);
    setCustomerCreated(false);
    setCustomerData(null);
    setFormData({
      firstName: '',
      lastName: '',
      middleName: '',
      mobile: '',
      email: '',
      address: '',
      stateOfResidence: '',
      dob: '',
      gender: '',
      maritalStatus: '',
      accountType: 'Individual'
    });
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-12 mb-8">
      {STEPS.map((step, idx) => (
        <div key={idx} className="flex flex-col items-center gap-2 relative">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-black transition-all ${
            currentStep === idx 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-110' 
              : currentStep > idx 
                ? 'bg-emerald-500 text-white' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            {currentStep > idx ? <span className="material-symbols-outlined text-sm font-black">check</span> : idx + 1}
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${
            currentStep === idx ? 'text-blue-600' : 'text-slate-400'
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
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">CASA Generation & BVN verification</p>
            </div>
            <button 
              onClick={() => { resetModal(); onClose(); }}
              className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              <span className="material-symbols-outlined font-black">close</span>
            </button>
          </div>

          {renderStepIndicator()}

          <div className="min-h-[400px]">
            {currentStep === 0 && (
              <div className="flex flex-col items-center justify-center py-6 min-h-[400px] animate-in fade-in zoom-in duration-500">
                <div className="w-full max-w-md space-y-10">
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-blue-600/10 rounded-3xl flex items-center justify-center text-blue-600 mx-auto mb-6">
                       <span className="material-symbols-outlined text-3xl font-black">badge</span>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Identity Verification</h4>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-wide">
                      Enter the customer's 11-digit BVN to check the core banking system for an existing CASA account.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="relative group">
                      <div className="absolute -top-3 left-6 bg-white dark:bg-[#1e293b] px-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] z-10 transition-colors group-focus-within:text-blue-600">Bank Verification Number</div>
                      <input 
                        type="text" 
                        maxLength={11}
                        value={bvn}
                        onChange={(e) => setBvn(e.target.value.replace(/\D/g, ''))}
                        disabled={loading || showCreateForm}
                        placeholder="01234567890"
                        className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl text-center text-2xl font-black tracking-[0.3em] dark:text-white focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all disabled:opacity-50"
                      />
                    </div>
                    
                    {loading && (
                      <div className="flex items-center justify-center gap-4 py-2 animate-pulse">
                        <span className="w-5 h-5 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                        <span className="text-[11px] font-black text-blue-600 uppercase tracking-[0.15em]">Retrieving CBS Account Data…</span>
                      </div>
                    )}

                    {!showCreateForm && !loading && (
                      <button 
                        onClick={handleSearchCustomer}
                        disabled={bvn.length !== 11}
                        className="w-full py-5 bg-slate-900 dark:bg-blue-600 text-white rounded-3xl font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:bg-blue-600 dark:hover:bg-blue-700 transition-all disabled:opacity-20 disabled:grayscale"
                      >
                        Verify Identity
                      </button>
                    )}

                    <div className="flex items-center justify-center gap-2 pt-2 opacity-50">
                       <span className="material-symbols-outlined text-xs dark:text-slate-400">encrypted</span>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                         SECURE DATA FETCH VIA ACCOUNTDETAILSVIEWVIABVN
                       </p>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showCreateForm && !customerCreated && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="space-y-8 pt-10 border-t border-slate-100 dark:border-slate-800"
                      >
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-6 rounded-[24px] flex gap-4 items-start">
                          <div className="w-10 h-10 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-400 flex items-center justify-center flex-shrink-0 animate-bounce">
                             <span className="material-symbols-outlined text-xl font-black">warning</span>
                          </div>
                          <div>
                            <span className="text-[12px] font-black text-amber-900 dark:text-amber-200 uppercase tracking-tight block mb-1">Unregistered Identity</span>
                            <p className="text-[10px] font-bold text-amber-700/80 dark:text-amber-400/80 uppercase leading-relaxed tracking-wide">
                              This BVN is not linked to any existing CASA on CBS. Please complete the registration to onboard this customer.
                            </p>
                          </div>
                        </div>

                        <form onSubmit={handleCreateCustomer} className="grid grid-cols-2 gap-x-6 gap-y-5">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">First Name</p>
                            <input required type="text" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-black uppercase dark:text-white focus:border-blue-600 outline-none transition-all" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Last Name</p>
                            <input required type="text" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-black uppercase dark:text-white focus:border-blue-600 outline-none transition-all" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-slate-300 dark:text-slate-600">Middle Name (Optional)</p>
                            <input type="text" value={formData.middleName} onChange={(e) => setFormData({...formData, middleName: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-black uppercase dark:text-white focus:border-blue-600 outline-none transition-all" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mobile Number</p>
                            <input required type="tel" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} placeholder="08012345678" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-black dark:text-white focus:border-blue-600 outline-none transition-all" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</p>
                            <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-black dark:text-white focus:border-blue-600 outline-none transition-all" />
                          </div>
                          <div className="space-y-2 col-span-full">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Residential Address</p>
                            <textarea required value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-black dark:text-white focus:border-blue-600 outline-none transition-all min-h-[100px]" />
                          </div>
                          <div className="space-y-2 col-span-full">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">State of Residence</p>
                            <select required value={formData.stateOfResidence} onChange={(e) => setFormData({...formData, stateOfResidence: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-black uppercase dark:text-white focus:border-blue-600 outline-none transition-all">
                              <option value="">Select State...</option>
                              {["Lagos", "Abuja", "Rivers", "Oyo", "Kano", "Cross River", "Edo", "Enugu"].map(state => (
                                <option key={state} value={state}>{state}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Date of Birth</p>
                            <input required type="date" value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-black dark:text-white focus:border-blue-600 outline-none transition-all" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Gender</p>
                            <select required value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-black uppercase dark:text-white focus:border-blue-600 outline-none transition-all">
                              <option value="">Select...</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Marital Status</p>
                            <select required value={formData.maritalStatus} onChange={(e) => setFormData({...formData, maritalStatus: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-black uppercase dark:text-white focus:border-blue-600 outline-none transition-all">
                              <option value="">Select...</option>
                              <option value="Single">Single</option>
                              <option value="Married">Married</option>
                              <option value="Divorced">Divorced</option>
                              <option value="Widowed">Widowed</option>
                            </select>
                          </div>
                          <div className="space-y-2 col-span-full">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Account Type</p>
                            <select required value={formData.accountType} onChange={(e) => setFormData({...formData, accountType: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-black uppercase dark:text-white focus:border-blue-600 outline-none transition-all">
                              <option value="Individual">Individual</option>
                              <option value="Joint">Joint</option>
                              <option value="Corporate">Corporate</option>
                            </select>
                          </div>
                          <button 
                            type="submit"
                            disabled={creatingCustomer}
                            className="col-span-full py-5 bg-blue-600 text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                          >
                            {creatingCustomer && <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />}
                            {creatingCustomer ? 'Initializing CASA on CBS...' : 'Provision Account & Onboard'}
                          </button>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {customerCreated && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-100 dark:border-emerald-800 p-10 rounded-[40px] flex flex-col items-center text-center space-y-6"
                    >
                      <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                        <span className="material-symbols-outlined text-4xl font-black">check</span>
                      </div>
                      <div>
                        <p className="text-[14px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-[0.2em] mb-2">CASA Generated Successfully</p>
                        <p className="text-4xl font-black text-emerald-900 dark:text-emerald-200 tracking-[0.1em] italic">0123456789</p>
                        <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mt-4 italic">Customer has been added to the master directory</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 1 && customerData && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 min-h-[400px]">
                {/* Customer Profiler Card */}
                <div className="bg-white dark:bg-[#1e293b] border-2 border-slate-100 dark:border-slate-800 rounded-[48px] overflow-hidden shadow-sm relative">
                  <div className={`absolute top-0 right-0 px-8 py-3 rounded-bl-[32px] text-[10px] font-black uppercase tracking-widest border-l-2 border-b-2 ${simulateCASAFound ? 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800' : 'text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800'}`}>
                    {simulateCASAFound ? 'CORE BANKING RECORD FOUND' : 'FRESHLY PROVISIONED ACCOUNT'}
                  </div>

                  <div className="p-12">
                    <div className="flex items-center gap-8 mb-12">
                       <div className={`w-28 h-28 rounded-[40px] flex items-center justify-center text-4xl font-black text-white shadow-2xl ${simulateCASAFound ? 'bg-[#0F6E56]' : 'bg-[#B45309]'}`}>
                         {customerData.firstName[0]}{customerData.lastName[0]}
                       </div>
                       <div className="space-y-2">
                          <h4 className="text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">{customerData.firstName} {customerData.lastName}</h4>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-mono font-black text-slate-400 tracking-[0.15em]">{customerData.casaAccountNo}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-600/5 px-3 py-1 rounded-lg italic">Active Profile</span>
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-12 pb-12 border-b border-dashed border-slate-200 dark:border-slate-700">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">DOB / Gender</p>
                        <p className="text-base font-black text-slate-900 dark:text-white uppercase">{customerData.dob} • {customerData.gender}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Verification (BVN)</p>
                        <p className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest">••••••••{customerData.bvn.slice(-3)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Liquidity</p>
                        <p className="text-base font-black text-[#0F6E56] uppercase tracking-tight">₦{customerData.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Registry Tier</p>
                        <p className="text-base font-black text-slate-900 dark:text-white uppercase italic">{customerData.accountTier}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Account Type</p>
                        <p className="text-base font-black text-blue-600 uppercase italic">{customerData.accountType}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contact Info</p>
                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase leading-relaxed">{customerData.phone}<br/>{customerData.email}</p>
                      </div>
                    </div>

                    <div className="pt-12 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                             <span className="material-symbols-outlined font-black">verified_user</span>
                          </div>
                          <div>
                             <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase italic">Onboarding Complete</p>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Profile synced across Nolt Ecosystem</p>
                          </div>
                       </div>
                       <button className="px-8 py-3 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-blue-700 transition-all shadow-xl">
                          View Deep Profile
                       </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => { resetModal(); setCurrentStep(0); }}
                    className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-4 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                  >
                    <span className="material-symbols-outlined text-[24px] font-black">person_search</span>
                    New Onboarding
                  </button>
                  <button 
                    onClick={() => { resetModal(); onClose(); }}
                    className="flex-1 py-5 bg-blue-600 text-white rounded-[24px] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-4 group"
                  >
                    Close & Finish
                    <span className="material-symbols-outlined text-[24px] font-black group-hover:translate-x-1 transition-transform">task_alt</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Developer Simulation Control */}
        <div className="bg-slate-900 px-10 py-4 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-500 text-lg">science</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Core Banking Simulation (CBS)</span>
           </div>
           <div className="flex items-center gap-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                 <input 
                  type="radio" 
                  checked={simulateCASAFound} 
                  onChange={() => setSimulateCASAFound(true)} 
                  className="w-4 h-4 text-blue-600 focus:ring-blue-600 border-slate-700 bg-slate-800"
                />
                 <span className="text-[10px] font-black text-slate-500 uppercase group-hover:text-white transition-colors">Existing Identity Found</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                 <input 
                  type="radio" 
                  checked={!simulateCASAFound} 
                  onChange={() => setSimulateCASAFound(false)} 
                  className="w-4 h-4 text-blue-600 focus:ring-blue-600 border-slate-700 bg-slate-800"
                />
                 <span className="text-[10px] font-black text-slate-500 uppercase group-hover:text-white transition-colors">Simulate Registration Flow</span>
              </label>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NewCustomerModal;
