
import { SavedDraft } from '../types';

const API_BASE_URL = '/api'; // Assuming proxy is set up or relative path works

export const investmentService = {
    createInvestment: async (data: any) => {
        const response = await fetch(`${API_BASE_URL}/investments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('Failed to create investment');
        }

        return response.json();
    },

    createStaffInvestment: async (data: any) => {
        const response = await fetch(`${API_BASE_URL}/staff/investments/application`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to create staff investment');
        }

        return response.json();
    },

    uploadDocument: async (file: File, investmentId: number | string, docType: string) => {
        const formData = new FormData();
        formData.append('file', file);
        if (typeof investmentId === 'string' && investmentId.startsWith('I-')) {
            formData.append('investment_id', investmentId); // Actually draft_id logic in backend handles strings
        } else {
            formData.append('investment_id', String(investmentId));
        }
        formData.append('document_type', docType);

        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${errorText}`);
        }

        return response.json();
    },

    getRate: async (params: { plan: string, currency: string, amount: number, tenure: number }) => {
        const queryParams = new URLSearchParams({
            plan: params.plan,
            currency: params.currency,
            amount: params.amount.toString(),
            tenure: params.tenure.toString()
        });

        const response = await fetch(`${API_BASE_URL}/yield-rates/calculate?${queryParams}`, {
            method: 'GET',
        });

        if (!response.ok) {
            // 404 is handled as null rate in UI, but we'll throw for other errors
            if (response.status === 404) return null;
            throw new Error('Failed to fetch rate');
        }

        return response.json();
    },

    initializeGift: async (giftData: { amount: number, plan: string, tenure: number, recipientEmail: string, currency: string }) => {
        const response = await fetch(`${API_BASE_URL}/investments/initialize-gift`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(giftData),
        });

        if (!response.ok) throw new Error('Failed to initialize gift payment');
        return response.json();
    },

    verifyGift: async (reference: string) => {
        const response = await fetch(`${API_BASE_URL}/investments/verify-gift?reference=${reference}`, {
            method: 'GET',
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to verify gift payment');
        }
        return data;
    },

    getGiftDetails: async (token: string) => {
        const response = await fetch(`${API_BASE_URL}/investments/claim-gift/${token}`, {
            method: 'GET',
        });

        if (!response.ok) throw new Error('Gift not found or already claimed');
        return response.json();
    },

    getLatestInvestment: async () => {
        const response = await fetch(`${API_BASE_URL}/investments/latest`);
        if (!response.ok) return null;
        return response.json();
    }
};
