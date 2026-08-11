import axios from 'axios';

import { apiBase } from '@/lib/api-config';

const API_URL = apiBase();

export interface InvestmentProduct {
  id: number;
  custom_name: string;
  note?: string | null;
  cba_product_name: string;
  cba_product_code: string;
  interest_rate?: number;
  min_amount?: number;
  max_amount?: number;
  min_term?: number;
  max_term?: number;
  currency?: string;
  is_active: boolean;
  category: 'investment' | 'loan';
}

export const productService = {
  /**
   * Fetch all active investment products from the products table.
   * Requires the user to be authenticated (any role).
   */
  getInvestmentProducts: async (): Promise<{ success: boolean; products: InvestmentProduct[] }> => {
    const response = await axios.get(`${API_URL}/api/products/investments`, { withCredentials: true });
    return response.data;
  },
};
