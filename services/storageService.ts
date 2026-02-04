
import { SavedDraft } from '../types';

const STORAGE_KEY = 'nolt_finance_drafts';

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
  }
};
