import axios from 'axios';

import { apiBase } from '@/lib/api-config';

const API_URL = apiBase();

export type SelfieVerificationResponse = {
  success: boolean;
  message: string;
  confidence?: number;
  selfie_url?: string;
  last_selfie_verified_at?: string;
  stage?: 'liveness' | 'bvn_face' | 'complete';
  liveness_passed?: boolean;
};

export const selfieVerificationService = {
  verifySelfie: async (
    bvn: string,
    selfieImage: string,
    context: 'profile' | 'vault' = 'vault',
  ): Promise<SelfieVerificationResponse> => {
    try {
      const response = await axios.post(
        `${API_URL}/api/customer/verify-selfie`,
        { bvn, selfie_image: selfieImage, context },
        { withCredentials: true },
      );
      return response.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data) {
        return err.response.data as SelfieVerificationResponse;
      }
      throw err;
    }
  },
};
