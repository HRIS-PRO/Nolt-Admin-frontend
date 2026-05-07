import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import StaffLayout from '../components/layouts/StaffLayout';
import { UserState, Theme } from '../types';
import { formatDate } from '../utils/dateFormatter';

interface CustomerDetailsPageProps {
  user: UserState;
  onLogout: () => void;
  toggleTheme: () => void;
  theme: Theme;
}

const CustomerDetailsPage: React.FC<CustomerDetailsPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'IDENTITY & KYC' | 'LOAN' | 'INVESTMENT' | 'BILL PAYMENTS' | 'AUDIT LOG'>('IDENTITY & KYC');
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  const fetchCustomerData = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL || ''}/api/staff/customers/${id}`, { withCredentials: true });
      setProfile(res.data.profile);
      
      // Fetch balance if casa exists
      if (res.data.profile?.casa) {
        fetchBalance(res.data.profile.casa);
      }
    } catch (err) {
      console.error("Failed to fetch customer", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBalance = async (casaAccount: string) => {
    try {
      const balRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL || ''}/api/staff/kyc/cba-balance/${casaAccount}`, { withCredentials: true });
      if (balRes.data.success) {
        setBalance(balRes.data.data.AvailableBalance ?? balRes.data.data.availableBalance);
      }
    } catch (err) {
      console.error("Failed to fetch balance", err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Optional: show toast
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount).replace('NGN', '₦'); // Adjust symbol to match image precisely if needed
  };

  if (isLoading) {
    return (
      <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme} activePath="/staff/customers">
        <div className="p-8 flex justify-center"><div className="animate-spin size-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>
      </StaffLayout>
    );
  }

  if (!profile) {
    return (
      <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme} activePath="/staff/customers">
        <div className="p-8 text-center text-slate-500">Customer not found</div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme} activePath="/staff/customers">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <button 
            onClick={() => navigate('/staff/customers')}
            className="flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white uppercase tracking-wider transition-colors"
          >
            <svg className="mr-2 size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> BACK TO DIRECTORY
          </button>
          
          <div className="flex items-center gap-3">
            <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            </button>
            <button className="px-6 py-2 bg-blue-500 text-white text-xs font-bold uppercase rounded-lg hover:bg-blue-600 transition-colors shadow-sm shadow-blue-500/20">
              EXPORT SUMMARY
            </button>
          </div>
        </div>

        {/* Top Banner Profile Card */}
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
                  <svg className="size-6 text-blue-500 fill-blue-500/10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                  {profile.full_name}
                </h1>
                {profile.is_identity_verified && <svg className="size-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase rounded-full tracking-wider">
                  TIER {profile.kyc_tier || 1}
                </span>
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase rounded-full tracking-wider">
                  {profile.is_corporate_account ? 'CORPORATE' : 'INDIVIDUAL'}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                USER ID: NOLT-{String(profile.id).padStart(4, '0')}-990
              </div>
            </div>
          </div>

          <div className="mt-6 md:mt-0 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 min-w-[300px]">
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">AVAILABLE BALANCE</div>
             <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
                {balance !== null ? formatMoney(balance) : '₦0.00'}
             </div>
             
             {profile.casa && (
               <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                 <div className="flex items-center gap-3">
                   <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500">
                     <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                     </svg>
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
             )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-8 border-b border-slate-200 dark:border-slate-800 overflow-x-auto hide-scrollbar">
          {(['IDENTITY & KYC', 'LOAN', 'INVESTMENT', 'BILL PAYMENTS', 'AUDIT LOG'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap relative
                ${activeTab === tab ? 'text-blue-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <div className="flex items-center gap-2">
                {tab === 'IDENTITY & KYC' && <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                {tab === 'LOAN' && <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                {tab === 'INVESTMENT' && <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                {tab === 'BILL PAYMENTS' && <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                {tab === 'AUDIT LOG' && <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                {tab}
              </div>
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {activeTab === 'IDENTITY & KYC' && (
              <>
                {/* Tier 1 Box */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/50 relative shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-blue-500"></div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">TIER 1: IDENTITY, CONTACT & DOCUMENTS</h3>
                    </div>
                    <button className="text-blue-500 hover:text-blue-600 p-2">
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                  </div>

                  <div className="space-y-8">
                    {/* Personal Information */}
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800/50 pb-2">PERSONAL INFORMATION</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">FULL LEGAL NAME</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">{profile.title ? profile.title + ' ' : ''}{profile.full_name || '-'}</div>
                        </div>
                        <div></div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">DATE OF BIRTH</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                            {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">GENDER</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">{profile.gender || '-'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">MARITAL STATUS</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">{profile.marital_status || '-'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">STATE OF ORIGIN</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">{profile.state_of_origin || '-'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">BVN</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                            {profile.bvn ? `${profile.bvn.substring(0, 3)}****${profile.bvn.substring(profile.bvn.length - 4)}` : '-'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">NIN</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                             {profile.nin ? `${profile.nin.substring(0, 3)}****${profile.nin.substring(profile.nin.length - 4)}` : '-'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800/50 pb-2">CONTACT DETAILS</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">EMAIL ADDRESS</div>
                          <div className="flex items-center gap-2">
                             <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">{profile.email || profile.personal_email || '-'}</div>
                             <svg className="size-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">PHONE NUMBER</div>
                          <div className="flex items-center gap-2">
                             <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">{profile.phone_number || profile.mobile_number || '-'}</div>
                             <svg className="size-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">REGISTERED ADDRESS</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                            {profile.address || profile.primary_home_address || '-'} 
                            {profile.state_of_residence ? `, ${profile.state_of_residence}` : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tier 2 Box */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/50 relative shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-blue-500"></div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">TIER 2: FAMILY & NEXT OF KIN</h3>
                    </div>
                    <button className="text-blue-500 hover:text-blue-600 p-2">
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">FULL NAME</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">{profile.nok_name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">RELATIONSHIP</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">{profile.nok_relationship || '-'}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">PHONE NUMBER</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">{profile.nok_phone_number || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Tier 3 Box */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/50 relative shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-blue-500"></div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">TIER 3: FINANCIAL DETAILS & DOCUMENTS</h3>
                    </div>
                    <button className="text-blue-500 hover:text-blue-600 p-2">
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                  </div>
                  
                  <div className="space-y-8">
                    {/* Bank Details */}
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800/50 pb-2">SETTLEMENT BANK ACCOUNT</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">BANK NAME</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">{profile.bank_name || '-'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ACCOUNT NAME</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">{profile.account_name || '-'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ACCOUNT NUMBER</div>
                          <div className="flex items-center gap-2">
                             <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">{profile.account_number || '-'}</div>
                             {profile.bank_verified && <svg className="size-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">VERIFICATION STATUS</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">{profile.bank_verified ? 'VERIFIED' : 'UNVERIFIED'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Documents */}
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800/50 pb-2">UPLOADED DOCUMENTS</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">UTILITY BILL</div>
                          {profile.tier_3_utility_bill_url ? (
                             <a href={profile.tier_3_utility_bill_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-500 hover:underline uppercase flex items-center gap-1">
                                VIEW DOCUMENT <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                             </a>
                          ) : (
                             <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">NOT PROVIDED</div>
                          )}
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">BANK STATEMENT</div>
                          {profile.bank_statement_url ? (
                             <a href={profile.bank_statement_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-500 hover:underline uppercase flex items-center gap-1">
                                VIEW DOCUMENT <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                             </a>
                          ) : (
                             <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">NOT PROVIDED</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab !== 'IDENTITY & KYC' && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/50 relative shadow-sm text-center py-20">
                <p className="text-slate-500 uppercase tracking-wider text-sm font-bold">Content for {activeTab} is currently being implemented.</p>
              </div>
            )}
            
          </div>

          {/* Right Sidebar (1 col) */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/50 shadow-sm">
              <h3 className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">QUICK ACTIONS</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-sm shadow-blue-500/20">
                  <span className="text-xs font-bold uppercase tracking-wider">FREEZE ACCOUNT</span>
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4m13.657-5.657l-11.314 11.314m0-11.314l11.314 11.314"/></svg>
                </button>
                <button className="w-full flex items-center justify-between px-4 py-3 border border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <span className="text-xs font-bold uppercase tracking-wider">SEND MESSAGE</span>
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </button>
                <button className="w-full flex items-center justify-between px-4 py-3 border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                  <span className="text-xs font-bold uppercase tracking-wider">FLAG PROFILE</span>
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </StaffLayout>
  );
};

export default CustomerDetailsPage;
