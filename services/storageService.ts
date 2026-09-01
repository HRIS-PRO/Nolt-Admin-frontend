
import { SavedDraft, StaffLoanDraft } from '../types';

const STORAGE_KEY = 'nolt_finance_drafts';
const STAFF_DRAFTS_KEY = 'nolt_staff_loan_drafts';

export const storageService = {
  saveDraft: (draft: SavedDraft) => {
    const drafts = storageService.getDrafts();
    const index = drafts.findIndex(d => d.id === draft.id);
    
    if (index > -1) {
      drafts[index] = { ...draft, updatedAt: Date.now() };
    } else {
      drafts.push({ ...draft, updatedAt: Date.now() });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  },

  getDrafts: (): SavedDraft[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  deleteDraft: (id: string) => {
    const drafts = storageService.getDrafts().filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  },

  clearDrafts: () => {
    localStorage.removeItem(STORAGE_KEY);
  },

  // --- Staff Loan Drafts ---
  getStaffDraftsStorageKey: (officerEmail?: string) => {
    const emailKey = officerEmail ? officerEmail.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') : 'default';
    return `${STAFF_DRAFTS_KEY}_${emailKey}`;
  },

  saveStaffDraft: (draft: StaffLoanDraft, officerEmail?: string) => {
    const key = storageService.getStaffDraftsStorageKey(officerEmail || draft.officerEmail);
    const drafts = storageService.getStaffDrafts(officerEmail || draft.officerEmail);
    const index = drafts.findIndex(d => d.id === draft.id || (d.customerBvn && d.customerBvn === draft.customerBvn) || (d.customerCasa && d.customerCasa === draft.customerCasa));
    
    const updatedDraft = { ...draft, updatedAt: Date.now(), officerEmail: officerEmail || draft.officerEmail };

    if (index > -1) {
      drafts[index] = updatedDraft;
    } else {
      drafts.push(updatedDraft);
    }
    
    localStorage.setItem(key, JSON.stringify(drafts));
    return updatedDraft;
  },

  getStaffDrafts: (officerEmail?: string): StaffLoanDraft[] => {
    const key = storageService.getStaffDraftsStorageKey(officerEmail);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  },

  getStaffDraftByBvnOrCasa: (identifier: string, officerEmail?: string): StaffLoanDraft | undefined => {
    if (!identifier) return undefined;
    const drafts = storageService.getStaffDrafts(officerEmail);
    return drafts.find(d => d.customerBvn === identifier || d.customerCasa === identifier || d.id === identifier);
  },

  deleteStaffDraft: (id: string, officerEmail?: string) => {
    const key = storageService.getStaffDraftsStorageKey(officerEmail);
    const drafts = storageService.getStaffDrafts(officerEmail).filter(d => d.id !== id && d.customerBvn !== id && d.customerCasa !== id);
    localStorage.setItem(key, JSON.stringify(drafts));
  }
};

