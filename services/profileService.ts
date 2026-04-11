
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface UserProfile {
  id?: string;
  user_id?: string;
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
  
  // Bank Details
  bank_name?: string;
  bank_code?: string;
  account_number?: string;
  account_name?: string;
  bank_statement_url?: string;
  is_corporate_account?: boolean;
  bank_verified?: boolean;
}

export const profileService = {
  getProfile: async (): Promise<{ success: boolean; profile: UserProfile | null; source: string }> => {
    const response = await axios.get(`${API_URL}/api/profile`, { withCredentials: true });
    return response.data;
  },

  updateProfile: async (profile: Partial<UserProfile>): Promise<{ success: boolean; message: string; profile: UserProfile }> => {
    const response = await axios.put(`${API_URL}/api/profile`, profile, { withCredentials: true });
    return response.data;
  },

  verifyBVN: async (bvn: string): Promise<{ success: boolean; message?: string; data?: any }> => {
    const response = await axios.post(`${API_URL}/api/profile/verify-bvn`, { bvn }, { withCredentials: true });
    return response.data;
  },

  getBanks: async (forceRefresh: boolean = false): Promise<{ success: boolean; data: { name: string; code: string }[] }> => {
    const CACHED_BANKS_KEY = 'nolt_banks_cache';
    const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours
    
    if (!forceRefresh) {
      const cached = localStorage.getItem(CACHED_BANKS_KEY);
      if (cached) {
        try {
          const { timestamp, data } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            console.log("[ProfileService] Returning cached banks");
            return { success: true, data };
          }
        } catch (e) {
          console.error("[ProfileService] Failed to parse cached banks", e);
        }
      }
    }

    console.log("[ProfileService] Fetching fresh banks from API");
    const response = await axios.get(`${API_URL}/api/profile/banks`, { withCredentials: true });
    
    if (response.data.success && response.data.data) {
      // Deduplicate banks by code
      const uniqueBanksMap = new Map();
      response.data.data.forEach((bank: { name: string; code: string }) => {
        if (!uniqueBanksMap.has(bank.code)) {
          uniqueBanksMap.set(bank.code, bank);
        }
      });
      const uniqueBanks = Array.from(uniqueBanksMap.values());
      
      localStorage.setItem(CACHED_BANKS_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: uniqueBanks
      }));
      
      return { success: true, data: uniqueBanks };
    }
    
    return response.data;
  },

  verifyBank: async (data: { account_number: string; bank_code: string; bvn_name: string; is_corporate?: boolean }): Promise<{ success: boolean; message?: string; data?: any }> => {
    const response = await axios.post(`${API_URL}/api/profile/verify-bank`, data, { withCredentials: true });
    return response.data;
  }
};
