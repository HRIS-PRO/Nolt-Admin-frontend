
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
  }
};
