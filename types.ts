
export type InvestmentPlan = 'RISE' | 'SURGE' | 'VAULT';
export type PayoutFrequency = 'monthly' | 'quarterly' | 'maturity' | 'upfront';
export type Currency = 'NGN' | 'USD';

export type AppStep =
  | 'AUTH'
  | 'DASHBOARD'
  | 'PRODUCT_SELECT'
  | 'LOAN_TYPE'
  | 'INVESTMENT_FLOW'
  | 'IDENTITY_BASICS'
  | 'PERSONAL_DETAILS'
  | 'ADDRESS_DETAILS'
  | 'EMPLOYMENT_DETAILS'
  | 'FINANCIALS'
  | 'REFERENCES'
  | 'DOCUMENTS'
  | 'REVIEW'
  | 'SUCCESS'
  | 'APPLICATIONS_LIST'
  | 'CALCULATOR';

export type Theme = 'light' | 'dark';

export interface UserProfile {
  first_name: string;
  surname: string;
  middle_name: string;
  phone_number: string;
  personal_email: string;
  state_of_origin: string;
  state_of_residence: string;
  address: string;
  bvn: string;
  nin: string;
  date_of_birth: string;
  is_identity_verified: boolean;
  verification_ref?: string;
  updated_at?: string;
}

export interface UserState {
  email: string;
  name: string;
  isLoggedIn: boolean;
  avatar_url?: string;
  role?: string;
  new_comer?: boolean;
  full_name?: string;
  referral_code?: string;
  referral_code_used?: string;
  profile?: UserProfile;
}

export interface LoanState {
  type: string;
  amount: number; // Stored in USD base
  term: number;
  interestRate: number;
  monthlyPayment: number;
  status: 'DRAFT' | 'SUBMITTED';
}

export interface SavedDraft {
  id: string;
  type: 'LOAN' | 'INVESTMENT';
  updatedAt: number;
  subStep: number;
  label: string;
  data: any;
}
