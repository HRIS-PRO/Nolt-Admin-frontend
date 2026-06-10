import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import StaffLayout from '../components/layouts/StaffLayout';
import { UserState, Theme } from '../types';

interface CustomerDetailsPageProps {
  user: UserState;
  onLogout: () => void;
  toggleTheme: () => void;
  theme: Theme;
}

const API = (path: string) => `${import.meta.env.VITE_BACKEND_URL || ''}${path}`;

const CustomerDetailsPage: React.FC<CustomerDetailsPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'IDENTITY & KYC' | 'LOAN' | 'INVESTMENT' | 'BILL PAYMENTS' | 'AUDIT LOG'>('IDENTITY & KYC');
  const [balance, setBalance] = useState<number | null>(null);
  const [isTogglingFreeze, setIsTogglingFreeze] = useState(false);
  const [loans, setLoans] = useState<any[]>([]);
  const [cbaLoans, setCbaLoans] = useState<any[]>([]);
  const [isCbaLoading, setIsCbaLoading] = useState(false);
  const [cbaError, setCbaError] = useState<string | null>(null);
  const [hasFetchedCba, setHasFetchedCba] = useState(false);

  // CBA Investments state
  const [cbaInvestments, setCbaInvestments] = useState<any[]>([]);
  const [cbaInvestmentTotal, setCbaInvestmentTotal] = useState<any>(null);
  const [isCbaInvestmentsLoading, setIsCbaInvestmentsLoading] = useState(false);
  const [cbaInvestmentsError, setCbaInvestmentsError] = useState<string | null>(null);
  const [hasFetchedCbaInvestments, setHasFetchedCbaInvestments] = useState(false);
  const [selectedCbaInvestment, setSelectedCbaInvestment] = useState<any>(null);
  const [selectedCbaLoan, setSelectedCbaLoan] = useState<any>(null);

  // Edit state
  const [editingTier, setEditingTier] = useState<1 | 2 | 3 | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingUtilityBill, setUploadingUtilityBill] = useState(false);
  const [isSendingPassword, setIsSendingPassword] = useState(false);

  // CBA Registration retry state
  const [cbaRetrying, setCbaRetrying] = useState(false);
  const [cbaRetryStep, setCbaRetryStep] = useState(0);
  const [cbaRetryTimedOut, setCbaRetryTimedOut] = useState(false);
  const [cbaRetryError, setCbaRetryError] = useState<string | null>(null);

  useEffect(() => { fetchCustomerData(); }, [id]);
  useEffect(() => {
    if (activeTab === 'LOAN' && id && !hasFetchedCba) fetchCbaLoans(id);
    if (activeTab === 'INVESTMENT' && id && !hasFetchedCbaInvestments) fetchCbaInvestments(id);
  }, [activeTab, id]);

  const handleUtilityBillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadingUtilityBill(true);
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('document_type', 'utility_bill');

    try {
      const response = await axios.post('/api/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      setEditForm((prev: any) => ({ ...prev, utility_bill_url: response.data.document.file_url }));
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload utility bill');
    } finally {
      setUploadingUtilityBill(false);
    }
  };

  const fetchCbaLoans = async (customerId: string) => {
    setIsCbaLoading(true);
    setCbaError(null);
    try {
      const res = await axios.get(API(`/api/staff/customers/${customerId}/cba-loans`), { withCredentials: true });
      if (res.data.success) {
        setCbaLoans(res.data.response || []);
      } else {
        setCbaError(res.data.message || 'Failed to load CBA loan data.');
      }
    } catch (e: any) {
      console.error('CBA loans', e);
      const msg = e?.response?.data?.message || e?.message || 'Could not reach the CBA service.';
      setCbaError(msg);
    } finally {
      setIsCbaLoading(false);
      setHasFetchedCba(true);
    }
  };

  const fetchCbaInvestments = async (customerId: string) => {
    setIsCbaInvestmentsLoading(true);
    setCbaInvestmentsError(null);
    try {
      const res = await axios.get(API(`/api/staff/customers/${customerId}/cba-investments`), { withCredentials: true });
      if (res.data.success) {
        setCbaInvestments(res.data.investments || []);
        setCbaInvestmentTotal(res.data.total);
      } else {
        setCbaInvestmentsError(res.data.message || 'Failed to load CBA investment data.');
      }
    } catch (e: any) {
      console.error('CBA investments', e);
      const msg = e?.response?.data?.message || e?.message || 'Could not reach the CBA service.';
      setCbaInvestmentsError(msg);
    } finally {
      setIsCbaInvestmentsLoading(false);
      setHasFetchedCbaInvestments(true);
    }
  };

  const handleSendPassword = async () => {
    if (!window.confirm(`Are you sure you want to generate and send a new password to ${profile.email}?`)) return;
    
    setIsSendingPassword(true);
    try {
      const res = await axios.post(API(`/api/staff/customers/${id}/send-password`), {}, { withCredentials: true });
      alert(res.data.message);
      await fetchCustomerData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to send password.');
    } finally {
      setIsSendingPassword(false);
    }
  };

  const CBA_TIMEOUT_MS = 60000;

  const handleRetryCbaRegistration = async () => {
    if (!id) return;
    setCbaRetryError(null);
    setCbaRetrying(true);
    setCbaRetryStep(0);
    setCbaRetryTimedOut(false);

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
      setCbaRetryTimedOut(true);
    }, CBA_TIMEOUT_MS);

    // Animate progress steps
    const stepInterval = setInterval(() => {
      setCbaRetryStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 3000);

    try {
      const response = await axios.post(
        API('/api/staff/kyc/retry-cba-registration'),
        { userId: id },
        { withCredentials: true, timeout: CBA_TIMEOUT_MS, signal: controller.signal }
      );

      clearTimeout(timeoutId);
      clearInterval(stepInterval);
      if (controller.signal.aborted) return;

      if (response.data.success) {
        setCbaRetrying(false);
        // Refresh the entire profile to get updated CASA and balance
        await fetchCustomerData();
      } else {
        setCbaRetrying(false);
        setCbaRetryError(response.data.message || 'CBA registration failed');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      clearInterval(stepInterval);
      if (axios.isCancel(err) || err.code === 'ECONNABORTED' || err.name === 'AbortError' || err.message?.includes('timeout')) {
        setCbaRetryTimedOut(true);
      } else {
        setCbaRetrying(false);
        setCbaRetryError(err.response?.data?.message || 'Error connecting to Core Banking Application');
      }
    }
  };

  const fetchCustomerData = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(API(`/api/staff/customers/${id}`), { withCredentials: true });
      setProfile(res.data.profile);
      setLoans(res.data.loans || []);
      if (res.data.profile?.casa) fetchBalance(res.data.profile.casa);
    } catch (e) { console.error('fetch customer', e); }
    finally { setIsLoading(false); }
  };

  const fetchBalance = async (casa: string) => {
    try {
      const r = await axios.get(API(`/api/staff/kyc/cba-balance/${casa}`), { withCredentials: true });
      if (r.data.success) setBalance(r.data.data.AvailableBalance ?? r.data.data.availableBalance);
    } catch {}
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);
  const formatMoney = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n).replace('NGN', '₦');

  const openEdit = (tier: 1 | 2 | 3) => {
    setSaveMsg(null);
    if (tier === 1) {
      setEditForm({
        full_name: profile.full_name || '',
        personal_email: profile.personal_email || profile.email || '',
        phone_number: profile.phone_number || profile.mobile_number || '',
        date_of_birth: profile.date_of_birth ? profile.date_of_birth.split('T')[0] : '',
        gender: profile.gender || '',
        marital_status: profile.marital_status || '',
        state_of_origin: profile.state_of_origin || '',
        state_of_residence: profile.state_of_residence || '',
        primary_home_address: profile.primary_home_address || profile.address || '',
        bvn: profile.bvn || '',
        nin: profile.nin || '',
        employer: profile.employer || '',
        ippis_number: profile.ippis_number || '',
        staff_id: profile.staff_id || '',
        average_monthly_income: profile.average_monthly_income || '',
        preferred_first_name: profile.preferred_first_name || profile.bvn_first_name || '',
        preferred_surname: profile.preferred_surname || profile.bvn_surname || '',
        preferred_middle_name: profile.preferred_middle_name || profile.bvn_middle_name || '',
      });
    } else if (tier === 2) {
      setEditForm({
        next_of_kin_name: profile.nok_name || profile.next_of_kin_name || '',
        next_of_kin_relationship: profile.nok_relationship || profile.next_of_kin_relationship || '',
        next_of_kin_phone: profile.nok_phone_number || profile.next_of_kin_phone || '',
      });
    } else {
      setEditForm({
        is_identity_verified: profile.is_identity_verified ?? false,
        utility_bill_url: profile.tier_3_utility_bill_url || profile.utility_bill_url || '',
      });
    }
    setEditingTier(tier);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const payload: any = {};
      Object.entries(editForm).forEach(([k, v]) => {
        if (typeof v === 'boolean') { payload[k] = v; return; }
        if (k === 'utility_bill_url' && v === '') { payload[k] = ''; return; }
        if (v !== '' && v !== null && v !== undefined) payload[k] = v;
      });
      await axios.put(API(`/api/staff/customers/${id}/profile`), payload, { withCredentials: true });
      setSaveMsg({ type: 'success', text: 'Saved successfully.' });
      await fetchCustomerData();
      setTimeout(() => { setEditingTier(null); setSaveMsg(null); }, 1400);
    } catch (e: any) {
      setSaveMsg({ type: 'error', text: e.response?.data?.message || 'Save failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Reusable subcomponents ────────────────────────────────────────────
  const Field = ({
    label, name, type = 'text', options,
  }: { label: string; name: string; type?: string; options?: string[] }) => (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
      {options ? (
        <select
          value={editForm[name] ?? ''}
          onChange={e => setEditForm((f: any) => ({ ...f, [name]: e.target.value }))}
          className="w-full px-3 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
        >
          <option value="">— Select —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={editForm[name] ?? ''}
          onChange={e => setEditForm((f: any) => ({ ...f, [name]: e.target.value }))}
          className="w-full px-3 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
        />
      )}
    </div>
  );

  const EditBar = () => (
    <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
      {saveMsg && (
        <span className={`text-xs font-bold ${saveMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>
          {saveMsg.type === 'success' ? '✓ ' : '✗ '}{saveMsg.text}
        </span>
      )}
      <div className="ml-auto flex gap-3">
        <button
          onClick={() => { setEditingTier(null); setSaveMsg(null); }}
          className="px-5 py-2 text-xs font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 text-xs font-bold uppercase tracking-wider bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors shadow-sm shadow-blue-500/20 disabled:opacity-60 flex items-center gap-2"
        >
          {isSaving && <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  const EditPencil = ({ tier }: { tier: 1 | 2 | 3 }) => (
    <button
      onClick={() => editingTier === tier ? setEditingTier(null) : openEdit(tier)}
      title={editingTier === tier ? 'Cancel edit' : 'Edit'}
      className={`p-2 rounded-lg transition-colors ${editingTier === tier ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
    >
      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </button>
  );

  const DV = ({ label, value, verified }: { label: string; value?: string; verified?: boolean }) => (
    <div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">{value || '-'}</div>
        {verified && (
          <svg className="size-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
    </div>
  );
  // ──────────────────────────────────────────────────────────────────────

  if (isLoading) return (
    <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme} activePath="/staff/customers">
      <div className="p-8 flex justify-center"><div className="animate-spin size-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>
    </StaffLayout>
  );

  if (!profile) return (
    <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme} activePath="/staff/customers">
      <div className="p-8 text-center text-slate-500">Customer not found</div>
    </StaffLayout>
  );

  return (
    <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme} activePath="/staff/customers">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <button onClick={() => navigate('/staff/customers')} className="flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white uppercase tracking-wider transition-colors">
            <svg className="mr-2 size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            BACK TO DIRECTORY
          </button>
          <div className="flex items-center gap-3">
            <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            </button>
            <button className="px-6 py-2 bg-blue-500 text-white text-xs font-bold uppercase rounded-lg hover:bg-blue-600 transition-colors shadow-sm shadow-blue-500/20">EXPORT SUMMARY</button>
          </div>
        </div>

        {/* Profile Banner */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm border border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-6">
            <div className="relative">
              {profile.avatar_url ? (
                <div className="size-24 rounded-[32px] overflow-hidden bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-800 shadow-md">
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="size-24 rounded-[32px] bg-blue-500 flex items-center justify-center text-white text-3xl font-black border-4 border-white dark:border-slate-800 shadow-md">
                  {profile.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
              )}
              {profile.is_identity_verified && (
                <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-900 rounded-full p-1 shadow-sm">
                  <svg className="size-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">{profile.full_name}</h1>
                {profile.is_identity_verified && <svg className="size-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              </div>
              <div className="flex items-center flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase rounded-full tracking-wider">TIER {profile.kyc_tier || 1}</span>
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase rounded-full tracking-wider">{profile.is_corporate_account ? 'CORPORATE' : 'INDIVIDUAL'}</span>
                {profile.is_identity_verified
                  ? <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase rounded-full tracking-wider border border-emerald-100 dark:border-emerald-800">✓ VERIFIED</span>
                  : <span className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 text-[10px] font-bold uppercase rounded-full tracking-wider border border-rose-100 dark:border-rose-800">UNVERIFIED</span>
                }
              </div>
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">USER ID: NOLT-{String(profile.id).padStart(4, '0')}-990</div>
            </div>
          </div>

          <div className="mt-6 md:mt-0 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 min-w-[300px]">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">AVAILABLE BALANCE</div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4">{balance !== null ? formatMoney(balance) : '₦0.00'}</div>
            {profile.casa ? (
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{profile.casa}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">CASA (NAIRA)</div>
                  </div>
                </div>
                <button onClick={() => copyToClipboard(profile.casa)} className="text-slate-400 hover:text-blue-500 transition-colors p-2">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
            ) : profile.bvn ? (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="size-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Missing CBA Registration</span>
                  </div>
                  <p className="text-[10px] font-bold text-amber-600/80 dark:text-amber-400/70 leading-relaxed mb-3">
                    This customer has no CASA account. They need to be registered on the Core Banking Application.
                  </p>
                  {cbaRetryError && (
                    <div className="p-2 bg-rose-50 dark:bg-rose-900/10 rounded-lg border border-rose-200 dark:border-rose-800 mb-3">
                      <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">{cbaRetryError}</p>
                    </div>
                  )}
                  <button
                    onClick={handleRetryCbaRegistration}
                    disabled={cbaRetrying}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    Register on CBA
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">No CASA — BVN required first</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-8 border-b border-slate-200 dark:border-slate-800 overflow-x-auto hide-scrollbar">
          {(['IDENTITY & KYC', 'LOAN', 'INVESTMENT', 'BILL PAYMENTS', 'AUDIT LOG'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-4 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap relative ${activeTab === tab ? 'text-blue-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              <div className="flex items-center gap-2">
                {tab === 'IDENTITY & KYC' && <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                {tab === 'LOAN' && <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                {tab === 'INVESTMENT' && <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                {tab === 'BILL PAYMENTS' && <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                {tab === 'AUDIT LOG' && <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                {tab}
              </div>
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* ══════════════ IDENTITY & KYC TAB ══════════════ */}
            {activeTab === 'IDENTITY & KYC' && (
              <>
                {/* TIER 1 */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/50 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-blue-500" />
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">TIER 1: IDENTITY, CONTACT & DOCUMENTS</h3>
                    </div>
                    <EditPencil tier={1} />
                  </div>

                  {editingTier === 1 ? (
                    <>
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">PERSONAL INFORMATION</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">🔒 BVN Verified Name (Read-Only)</span>
                              <span className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase">
                                {`${profile.bvn_first_name || ''} ${profile.bvn_surname || ''} ${profile.bvn_middle_name || ''}`.trim() || '—'}
                              </span>
                            </div>
                            
                            <div className="md:col-span-2 grid grid-cols-3 gap-4 border border-blue-500/20 bg-blue-500/5 p-4 rounded-2xl">
                              <div className="col-span-full">
                                <span className="block text-[8px] font-bold text-blue-500 uppercase tracking-widest">✏️ Preferred Name (Editable)</span>
                              </div>
                              <Field label="Preferred First Name" name="preferred_first_name" />
                              <Field label="Preferred Surname" name="preferred_surname" />
                              <Field label="Preferred Middle Name" name="preferred_middle_name" />
                            </div>

                            <Field label="Email Address" name="personal_email" type="email" />
                            <Field label="Phone Number" name="phone_number" />
                            <Field label="Date of Birth" name="date_of_birth" type="date" />
                            <Field label="Gender" name="gender" options={['Male', 'Female']} />
                            <Field label="Marital Status" name="marital_status" options={['Single', 'Married', 'Divorced', 'Widowed']} />
                            <Field label="State of Origin" name="state_of_origin" />
                            <Field label="State of Residence" name="state_of_residence" />
                            <div className="md:col-span-2"><Field label="Registered Address" name="primary_home_address" /></div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">IDENTITY NUMBERS</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="BVN" name="bvn" />
                            <Field label="NIN" name="nin" />
                          </div>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">EMPLOYMENT</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Employer / MDA" name="employer" />
                            <Field label="IPPIS Number" name="ippis_number" />
                            <Field label="Staff ID" name="staff_id" />
                            <Field label="Monthly Income (₦)" name="average_monthly_income" type="number" />
                          </div>
                        </div>
                      </div>
                      <EditBar />
                    </>
                  ) : (
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800/50 pb-2">PERSONAL INFORMATION</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <DV label="BVN VERIFIED NAME (READ-ONLY)" value={`${profile.bvn_first_name || ''} ${profile.bvn_surname || ''} ${profile.bvn_middle_name || ''}`.trim() || '-'} />
                          <DV label="PREFERRED NAME (USED FOR BANKING)" value={`${profile.preferred_first_name || ''} ${profile.preferred_surname || ''} ${profile.preferred_middle_name || ''}`.trim() || '-'} />
                          <DV label="DATE OF BIRTH" value={profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'} />
                          <DV label="GENDER" value={profile.gender} />
                          <DV label="MARITAL STATUS" value={profile.marital_status} />
                          <DV label="STATE OF ORIGIN" value={profile.state_of_origin} />
                          <DV label="BVN" value={profile.bvn ? `${profile.bvn.substring(0, 3)}****${profile.bvn.slice(-4)}` : '-'} />
                          <DV label="NIN" value={profile.nin ? `${profile.nin.substring(0, 3)}****${profile.nin.slice(-4)}` : '-'} />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800/50 pb-2">CONTACT DETAILS</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <DV label="EMAIL ADDRESS" value={profile.email || profile.personal_email} verified />
                            {!profile.has_password && (
                              <button 
                                onClick={handleSendPassword} 
                                disabled={isSendingPassword}
                                className="mt-2 text-[10px] font-black uppercase text-blue-500 hover:text-blue-600 tracking-wider flex items-center gap-1 transition-colors"
                              >
                                <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                {isSendingPassword ? 'Sending...' : 'Send Password Setup Email'}
                              </button>
                            )}
                            {profile.has_password && (
                              <button 
                                onClick={handleSendPassword} 
                                disabled={isSendingPassword}
                                className="mt-2 text-[10px] font-black uppercase text-slate-400 hover:text-rose-500 tracking-wider flex items-center gap-1 transition-colors"
                              >
                                <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                {isSendingPassword ? 'Sending...' : 'Reset & Resend Password'}
                              </button>
                            )}
                          </div>
                          <DV label="PHONE NUMBER" value={profile.phone_number || profile.mobile_number} verified />
                          <div className="md:col-span-2">
                            <DV label="REGISTERED ADDRESS" value={`${profile.address || profile.primary_home_address || '-'}${profile.state_of_residence ? `, ${profile.state_of_residence}` : ''}`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* TIER 2 */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/50 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-blue-500" />
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">TIER 2: FAMILY & NEXT OF KIN</h3>
                    </div>
                    <EditPencil tier={2} />
                  </div>

                  {editingTier === 2 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Full Name" name="next_of_kin_name" />
                        <Field label="Relationship" name="next_of_kin_relationship" options={['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Other']} />
                        <div className="md:col-span-2"><Field label="Phone Number" name="next_of_kin_phone" /></div>
                      </div>
                      <EditBar />
                    </>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <DV label="FULL NAME" value={profile.nok_name || profile.next_of_kin_name} />
                      <DV label="RELATIONSHIP" value={profile.nok_relationship || profile.next_of_kin_relationship} />
                      <div className="md:col-span-2"><DV label="PHONE NUMBER" value={profile.nok_phone_number || profile.next_of_kin_phone} /></div>
                    </div>
                  )}
                </div>

                {/* TIER 3 */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/50 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-blue-500" />
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">TIER 3: FINANCIAL DETAILS & DOCUMENTS</h3>
                    </div>
                    <EditPencil tier={3} />
                  </div>

                  {editingTier === 3 ? (
                    <>
                      <div className="space-y-5">
                        {/* Identity verified toggle */}
                        <div className="p-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl">
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">⚠ Identity Verification Status</p>
                          <p className="text-[11px] text-amber-600/70 dark:text-amber-400/60 mb-4">Setting this to Verified will automatically promote the customer to Tier 3.</p>
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() => setEditForm((f: any) => ({ ...f, is_identity_verified: !f.is_identity_verified }))}
                              className={`relative w-12 h-6 rounded-full transition-colors ${editForm.is_identity_verified ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                              <div className={`absolute top-1 size-4 rounded-full bg-white shadow transition-transform ${editForm.is_identity_verified ? 'translate-x-7' : 'translate-x-1'}`} />
                            </button>
                            <span className={`text-sm font-bold ${editForm.is_identity_verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                              {editForm.is_identity_verified ? 'Verified' : 'Unverified'}
                            </span>
                          </div>
                        </div>

                        {/* Utility bill Upload */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Utility Bill Document</label>
                          <p className="text-[11px] text-slate-400 mb-2">Upload the customer's utility bill (PDF or image).</p>
                          
                          <div className="relative h-24 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group overflow-hidden">
                            {uploadingUtilityBill ? (
                                <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center">
                                    <span className="w-6 h-6 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                                </div>
                            ) : editForm.utility_bill_url ? (
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Document Uploaded</span>
                                    <a href={editForm.utility_bill_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-500 hover:underline mt-1">Preview File</a>
                                    <button type="button" onClick={() => setEditForm((prev: any) => ({ ...prev, utility_bill_url: '' }))} className="text-[9px] font-black text-rose-500 uppercase underline mt-1">Remove</button>
                                </div>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-500 text-3xl mb-2">cloud_upload</span>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Click to upload bill</p>
                                    <input type="file" onChange={handleUtilityBillUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,application/pdf" />
                                </>
                            )}
                          </div>
                        </div>
                      </div>
                      <EditBar />
                    </>
                  ) : (
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800/50 pb-2">SETTLEMENT BANK ACCOUNT</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <DV label="BANK NAME" value={profile.bank_name} />
                          <DV label="ACCOUNT NAME" value={profile.account_name} />
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ACCOUNT NUMBER</div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">{profile.account_number || '-'}</div>
                              {profile.bank_verified && <svg className="size-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">VERIFICATION STATUS</div>
                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${profile.is_identity_verified ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                              {profile.is_identity_verified ? 'VERIFIED' : 'UNVERIFIED'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800/50 pb-2">UPLOADED DOCUMENTS</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">UTILITY BILL</div>
                            {profile.tier_3_utility_bill_url ? (
                              <a href={profile.tier_3_utility_bill_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-500 hover:underline uppercase flex items-center gap-1">
                                VIEW DOCUMENT <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>
                            ) : <div className="text-sm font-bold text-slate-400 uppercase">NOT PROVIDED</div>}
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">BANK STATEMENT</div>
                            {profile.bank_statement_url ? (
                              <a href={profile.bank_statement_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-500 hover:underline uppercase flex items-center gap-1">
                                VIEW DOCUMENT <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>
                            ) : <div className="text-sm font-bold text-slate-400 uppercase">NOT PROVIDED</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ══════════════ LOAN TAB ══════════════ */}
            {activeTab === 'LOAN' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {isCbaLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <span className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Fetching loan data from CBA…</p>
                  </div>
                ) : cbaError ? (
                  <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-3xl p-10 flex flex-col items-center gap-4 text-center animate-in zoom-in-95">
                    <div className="size-14 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                      <svg className="size-7 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-1">CBA Fetch Failed</p>
                      <p className="text-xs text-rose-500 dark:text-rose-400/70 font-medium max-w-xs">{cbaError}</p>
                    </div>
                    <button
                      onClick={() => { setHasFetchedCba(false); setCbaError(null); if (id) fetchCbaLoans(id); }}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Loan Stats Dashboard */}
                    {(cbaLoans.length > 0 || loans.length > 0) && (() => {
                      const activeCbaLoans = cbaLoans.filter(l => l.currentBalance < 0 && l.nextTotalPayment !== 0);
                      const totalPrincipal = activeCbaLoans.reduce((s, l) => s + (l.loanAmount || 0), 0);
                      const totalOutstanding = activeCbaLoans.reduce((s, l) => s + Math.abs(l.currentBalance || 0), 0);
                      
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-500/15">
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">Total Active Principal</span>
                              <span className="material-symbols-outlined text-blue-200">payments</span>
                            </div>
                            <h4 className="text-3xl font-black tracking-tight">{formatMoney(totalPrincipal)}</h4>
                            <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mt-2">
                              {activeCbaLoans.length} active loan{activeCbaLoans.length !== 1 ? 's' : ''} in CBA
                            </p>
                          </div>
                          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Outstanding Balance</span>
                              <span className="material-symbols-outlined text-rose-500">account_balance</span>
                            </div>
                            <h4 className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{formatMoney(totalOutstanding)}</h4>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-2">Current aggregate debt</p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Active CBA Loans Table */}
                    {cbaLoans.filter(l => l.currentBalance < 0 && l.nextTotalPayment !== 0).length > 0 && (() => {
                      const activeCbaLoans = cbaLoans.filter(l => l.currentBalance < 0 && l.nextTotalPayment !== 0);
                      return (
                        <div className="space-y-4 animate-in fade-in">
                          <div className="flex items-center gap-2">
                            <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Active CBA Loans</h3>
                          </div>
                          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                                  {['Loan Ref', 'Product', 'Principal', 'Outstanding', 'Rate', 'Maturity', ''].map(h => (
                                    <th key={h} className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {activeCbaLoans.map(loan => (
                                  <tr key={loan.loanAccountNo} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="px-5 py-4 text-[11px] font-bold text-slate-900 dark:text-white font-mono whitespace-nowrap">
                                      #{loan.loanAccountNo}
                                    </td>
                                    <td className="px-5 py-4 text-[11px] font-bold text-slate-500 truncate max-w-[150px]" title={loan.product}>
                                      {loan.product}
                                    </td>
                                    <td className="px-5 py-4 text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">
                                      {formatMoney(loan.loanAmount || 0)}
                                    </td>
                                    <td className="px-5 py-4 text-sm font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                      {formatMoney(Math.abs(loan.currentBalance || 0))}
                                    </td>
                                    <td className="px-5 py-4 text-[11px] font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                      {loan.interestrate}%
                                    </td>
                                    <td className="px-5 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                                      {loan.maturityDate || '—'}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-right">
                                      <button
                                        onClick={() => setSelectedCbaLoan(loan)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider rounded-lg border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
                                      >
                                        <span className="material-symbols-outlined text-[13px]">info</span>
                                        Details
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Settled CBA Loans Table */}
                    {cbaLoans.filter(l => l.currentBalance >= 0 || l.nextTotalPayment === 0).length > 0 && (() => {
                      const settledCbaLoans = cbaLoans.filter(l => l.currentBalance >= 0 || l.nextTotalPayment === 0);
                      return (
                        <div className="space-y-4 animate-in fade-in">
                          <div className="flex items-center gap-2">
                            <div className="size-2.5 rounded-full bg-slate-400" />
                            <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Settled CBA Loans</h3>
                          </div>
                          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                                  {['Loan Ref', 'Product', 'Principal', 'Start Date', 'Maturity Date', 'Status', ''].map(h => (
                                    <th key={h} className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {settledCbaLoans.map(loan => (
                                  <tr key={loan.loanAccountNo} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="px-5 py-4 text-[11px] font-bold text-slate-400 font-mono whitespace-nowrap">#{loan.loanAccountNo}</td>
                                    <td className="px-5 py-4 text-[11px] font-bold text-slate-500 truncate max-w-[150px]">{loan.product}</td>
                                    <td className="px-5 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                      {formatMoney(loan.loanAmount || 0)}
                                    </td>
                                    <td className="px-5 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">{loan.startDate || '—'}</td>
                                    <td className="px-5 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">{loan.maturityDate || '—'}</td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest">SETTLED</span>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-right">
                                      <button
                                        onClick={() => setSelectedCbaLoan(loan)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                      >
                                        <span className="material-symbols-outlined text-[13px]">info</span>
                                        Details
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Internal Nolt Loans Table */}
                    {loans.filter(l => ['topup', 're-app', 'add_on', 'top_up', 're_app', 'add-on'].includes((l.loan_type || '').toLowerCase())).length > 0 && (
                      <div className="space-y-4 animate-in fade-in">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className="size-2.5 rounded-full bg-purple-500" />
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Internal Nolt Loans</h3>
                          </div>
                          <div className="flex gap-1.5 flex-wrap">
                            {['TOP-UP', 'RE-APP', 'ADD-ON'].map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-[9px] font-black uppercase tracking-wider rounded-full border border-purple-100 dark:border-purple-800">{tag}</span>
                            ))}
                          </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                                {['Date', 'Type', 'Amount Requested', 'Tenor', 'Status', ''].map(h => (
                                  <th key={h} className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {loans.filter(l => ['topup', 're-app', 'add_on', 'top_up', 're_app', 'add-on'].includes((l.loan_type || '').toLowerCase())).map(loan => (
                                <tr key={loan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                  <td className="px-5 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                                    {new Date(loan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                                  </td>
                                  <td className="px-5 py-4 whitespace-nowrap">
                                    <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-[9px] font-black uppercase tracking-widest rounded-full">
                                      {(loan.loan_type || '').replace(/_/g, '-').toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4 text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">
                                    {formatMoney(Number(loan.requested_loan_amount))}
                                  </td>
                                  <td className="px-5 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                                    {loan.loan_tenure_months || loan.loan_tenure ? `${loan.loan_tenure_months || loan.loan_tenure} months` : '—'}
                                  </td>
                                  <td className="px-5 py-4 whitespace-nowrap">
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                      loan.status === 'disbursed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                      loan.status === 'active'   ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                      loan.status === 'pending'  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                      'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                    }`}>{loan.status}</span>
                                  </td>
                                  <td className="px-5 py-4 whitespace-nowrap text-right">
                                    <button
                                      onClick={() => navigate(`/staff/loans/${loan.id}`)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider rounded-lg border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-[13px]">visibility</span>
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Pending Applications Table */}
                    {loans.filter(l => !['topup', 're-app', 'add_on', 'top_up', 're_app', 'add-on'].includes((l.loan_type || '').toLowerCase()) && l.status !== 'disbursed').length > 0 && (
                      <div className="space-y-4 animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <div className="size-2.5 rounded-full bg-amber-400" />
                          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Pending Applications</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                                {['Applied On', 'Type', 'Amount Requested', 'Status', ''].map(h => (
                                  <th key={h} className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {loans.filter(l => !['topup', 're-app', 'add_on', 'top_up', 're_app', 'add-on'].includes((l.loan_type || '').toLowerCase()) && l.status !== 'disbursed').map(loan => (
                                <tr key={loan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                  <td className="px-5 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                                    {new Date(loan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                                  </td>
                                  <td className="px-5 py-4 text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">{loan.loan_type}</td>
                                  <td className="px-5 py-4 text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">
                                    {formatMoney(Number(loan.requested_loan_amount))}
                                  </td>
                                  <td className="px-5 py-4 whitespace-nowrap">
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                      loan.status === 'active'  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-emerald-400' :
                                      loan.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                      'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                    }`}>{loan.status}</span>
                                  </td>
                                  <td className="px-5 py-4 whitespace-nowrap text-right">
                                    <button
                                      onClick={() => navigate(`/staff/loans/${loan.id}`)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider rounded-lg border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-[13px]">visibility</span>
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {cbaLoans.length === 0 && loans.length === 0 && (
                      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/50 shadow-sm animate-in fade-in">
                        <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                          <span className="material-symbols-outlined text-2xl">credit_card_off</span>
                        </div>
                        <p className="text-[11px] uppercase tracking-widest text-slate-500 font-black">No loan history available</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ══════════════ INVESTMENT TAB ══════════════ */}
            {activeTab === 'INVESTMENT' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {isCbaInvestmentsLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <span className="w-10 h-10 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Fetching investment data from CBA…</p>
                  </div>
                ) : cbaInvestmentsError ? (
                  <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-3xl p-10 flex flex-col items-center gap-4 text-center animate-in zoom-in-95">
                    <div className="size-14 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                      <svg className="size-7 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-1">CBA Fetch Failed</p>
                      <p className="text-xs text-rose-500 dark:text-rose-400/70 font-medium max-w-xs">{cbaInvestmentsError}</p>
                    </div>
                    <button
                      onClick={() => { setHasFetchedCbaInvestments(false); setCbaInvestmentsError(null); if (id) fetchCbaInvestments(id); }}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Investment Stats Dashboard */}
                    {cbaInvestmentTotal && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-purple-500/15">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-100">Total Investment Principal</span>
                            <span className="material-symbols-outlined text-purple-200">account_balance_wallet</span>
                          </div>
                          <h4 className="text-3xl font-black tracking-tight">{formatMoney(cbaInvestmentTotal.investmentTotal || 0)}</h4>
                          <p className="text-[10px] text-purple-200 font-bold uppercase tracking-wider mt-2">Active fixed deposits in CBA</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Deposit Accounts</span>
                            <span className="material-symbols-outlined text-purple-500">receipt_long</span>
                          </div>
                          <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{cbaInvestmentTotal.investmentCount || 0}</h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-2">Active portfolios</p>
                        </div>
                      </div>
                    )}

                    {/* Fixed Deposit Portfolios Table */}
                    {cbaInvestments.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="size-2.5 rounded-full bg-purple-500 animate-pulse" />
                          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">CBA Fixed Deposits</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                                {['TD Account No', 'Product', 'Principal', 'Rate', 'Duration', 'Maturity Date', ''].map(h => (
                                  <th key={h} className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {cbaInvestments.map(inv => (
                                <tr key={inv.tdAccountNo} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                  <td className="px-5 py-4 text-[11px] font-bold text-slate-900 dark:text-white font-mono whitespace-nowrap">
                                    {inv.tdAccountNo}
                                  </td>
                                  <td className="px-5 py-4 text-[11px] font-bold text-slate-500 truncate max-w-[150px]" title={inv.product}>
                                    {inv.product}
                                  </td>
                                  <td className="px-5 py-4 text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">
                                    ₦{Number(String(inv.tdAmount).replace(/,/g, '')).toLocaleString()}
                                  </td>
                                  <td className="px-5 py-4 text-[11px] font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                    {inv.interestrate}%
                                  </td>
                                  <td className="px-5 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                                    {inv.tdDuration}
                                  </td>
                                  <td className="px-5 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                                    {inv.maturityDate}
                                  </td>
                                  <td className="px-5 py-4 whitespace-nowrap text-right">
                                    <button
                                      onClick={() => setSelectedCbaInvestment(inv)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-wider rounded-lg border border-purple-100 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-[13px]">info</span>
                                      Details
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/50 shadow-sm animate-in fade-in">
                        <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                          <span className="material-symbols-outlined text-2xl">receipt_long</span>
                        </div>
                        <p className="text-[11px] uppercase tracking-widest text-slate-500 font-black">No active fixed deposits found</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab !== 'IDENTITY & KYC' && activeTab !== 'LOAN' && activeTab !== 'INVESTMENT' && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/50 shadow-sm text-center py-20">
                <p className="text-slate-500 uppercase tracking-wider text-sm font-bold">Content for {activeTab} is currently being implemented.</p>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/50 shadow-sm">
              <h3 className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">QUICK ACTIONS</h3>
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    if (!window.confirm(`Are you sure you want to ${profile.is_active !== false ? 'freeze' : 'unfreeze'} this account?`)) return;
                    setIsTogglingFreeze(true);
                    try {
                      const endpoint = profile.is_active !== false ? '/api/staff/revoke-access' : '/api/staff/unrevoke-access';
                      await axios.post(API(endpoint), { userId: id }, { withCredentials: true });
                      await fetchCustomerData();
                    } catch { alert('Failed to toggle account status.'); }
                    finally { setIsTogglingFreeze(false); }
                  }}
                  disabled={isTogglingFreeze}
                  className={`w-full flex items-center justify-between px-4 py-3 text-white rounded-xl transition-colors shadow-sm disabled:opacity-70 ${profile.is_active !== false ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'}`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isTogglingFreeze ? (profile.is_active !== false ? 'FREEZING...' : 'UNFREEZING...') : (profile.is_active !== false ? 'FREEZE ACCOUNT' : 'UNFREEZE ACCOUNT')}
                  </span>
                  {isTogglingFreeze
                    ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4m13.657-5.657l-11.314 11.314m0-11.314l11.314 11.314" /></svg>}
                </button>
                <button className="w-full flex items-center justify-between px-4 py-3 border border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <span className="text-xs font-bold uppercase tracking-wider">SEND MESSAGE</span>
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CBA Processing Overlay */}
      {cbaRetrying && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-[#1e293b] rounded-[32px] p-10 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800">
            {!cbaRetryTimedOut ? (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 mx-auto relative">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800" />
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                  <div className="absolute inset-3 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <svg className="size-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
                    Registering on CBA
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Do not close this page
                  </p>
                </div>

                <div className="space-y-3 text-left">
                  {['Connecting to Core Banking...', 'Creating account...', 'Syncing customer data...', 'Finalizing registration...'].map((step, i) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500 ${
                      cbaRetryStep > i
                        ? 'bg-emerald-50 dark:bg-emerald-900/10'
                        : cbaRetryStep === i
                        ? 'bg-blue-50 dark:bg-blue-900/10'
                        : 'bg-slate-50 dark:bg-slate-800/30'
                    }`}>
                      {cbaRetryStep > i ? (
                        <svg className="size-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      ) : cbaRetryStep === i ? (
                        <div className="size-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : (
                        <div className="size-4 rounded-full border-2 border-slate-200 dark:border-slate-700 shrink-0" />
                      )}
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        cbaRetryStep > i ? 'text-emerald-600' : cbaRetryStep === i ? 'text-blue-600' : 'text-slate-300 dark:text-slate-600'
                      }`}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 mx-auto bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                  <svg className="size-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
                    Request Timed Out
                  </h3>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed">
                    The CBA service didn't respond in time. The registration may still be processing in the background.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setCbaRetrying(false); setCbaRetryTimedOut(false); }}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => { setCbaRetrying(false); setCbaRetryTimedOut(false); fetchCustomerData(); }}
                    className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] shadow-lg hover:bg-blue-700 transition-all"
                  >
                    Refresh Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedCbaInvestment && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedCbaInvestment(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-800 p-8 space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Background Accent Gradient */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500" />
            
            <div className="flex justify-between items-start">
              <div>
                <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-[9px] font-black uppercase tracking-wider rounded-full border border-purple-100 dark:border-purple-800">
                  Fixed Deposit Portfolio
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-2">
                  Account Details
                </h3>
              </div>
              <button 
                onClick={() => setSelectedCbaInvestment(null)} 
                className="size-8 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-5 divide-y divide-slate-100 dark:divide-slate-800/50 [&>div]:pt-3 first:pt-0 overflow-y-auto max-h-[60vh] pr-2">
              <div className="col-span-2">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Product Name</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white leading-normal">{selectedCbaInvestment.product}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">TD Account Number</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{selectedCbaInvestment.tdAccountNo}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Settlement Account</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{selectedCbaInvestment.settlementAcctNo}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Principal Amount</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">₦{Number(String(selectedCbaInvestment.tdAmount).replace(/,/g, '')).toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Maturity Amount</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">₦{Number(String(selectedCbaInvestment.matureAmount).replace(/,/g, '')).toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Interest Rate</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedCbaInvestment.interestrate}% p.a.</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Duration / Tenor</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedCbaInvestment.tdDuration}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Start Date</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{selectedCbaInvestment.startDate}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Maturity Date</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{selectedCbaInvestment.maturityDate}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Interest</span>
                <span className="text-xs font-black text-purple-600 dark:text-purple-400">₦{Number(String(selectedCbaInvestment.totalInterest).replace(/,/g, '')).toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">WHT Tax Deducted</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">₦{Number(String(selectedCbaInvestment.taxAmount).replace(/,/g, '')).toLocaleString()}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Investment Purpose</span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{selectedCbaInvestment.tdPurpose || '—'}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Branch / Node</span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{selectedCbaInvestment.branch || '—'}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedCbaInvestment(null)}
                className="w-full py-3.5 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCbaLoan && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedCbaLoan(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-800 p-8 space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Background Accent Gradient */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
            
            <div className="flex justify-between items-start">
              <div>
                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase tracking-wider rounded-full border border-blue-100 dark:border-blue-800">
                  CBA Loan Account
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-2">
                  Loan Details
                </h3>
              </div>
              <button 
                onClick={() => setSelectedCbaLoan(null)} 
                className="size-8 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-5 divide-y divide-slate-100 dark:divide-slate-800/50 [&>div]:pt-3 first:pt-0 overflow-y-auto max-h-[60vh] pr-2">
              <div className="col-span-2">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Product Name</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white leading-normal">{selectedCbaLoan.product}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Loan Account Number</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{selectedCbaLoan.loanAccountNo}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Principal Amount</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">{formatMoney(selectedCbaLoan.loanAmount || 0)}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Outstanding Balance</span>
                <span className="text-sm font-black text-rose-600 dark:text-rose-400">{formatMoney(Math.abs(selectedCbaLoan.currentBalance || 0))}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Interest Rate</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedCbaLoan.interestrate}% p.a.</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Duration / Tenor</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedCbaLoan.loanDuration || selectedCbaLoan.tdDuration || '—'}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Start Date</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{selectedCbaLoan.startDate || '—'}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Maturity Date</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{selectedCbaLoan.maturityDate || '—'}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Next Payment Date</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">{selectedCbaLoan.nextPaymentDate || '—'}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Next Repayment Amount</span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{formatMoney(selectedCbaLoan.nextTotalPayment || selectedCbaLoan.nextPrincipalPayment || 0)}</span>
              </div>
              {selectedCbaLoan.settlementAcctNo && (
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Settlement Account</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{selectedCbaLoan.settlementAcctNo}</span>
                </div>
              )}
              {selectedCbaLoan.branch && (
                <div className="col-span-2">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Branch / Node</span>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{selectedCbaLoan.branch}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedCbaLoan(null)}
                className="w-full py-3.5 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </StaffLayout>
  );
};

export default CustomerDetailsPage;
