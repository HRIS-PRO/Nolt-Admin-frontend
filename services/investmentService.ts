
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
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${errorText}`);
        }

        return response.json();
    }
};
