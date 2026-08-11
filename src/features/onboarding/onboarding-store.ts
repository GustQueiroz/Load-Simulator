'use client';

import { create } from 'zustand';

import {
  hasSeenTour,
  isChecklistDismissed,
  markChecklistDismissed,
  markTourSeen,
} from '@/infrastructure/persistence/tour-storage';

const CHECKLIST_KEY = 'system-design-simulator:checklist-dismissed';

interface OnboardingState {
  tourOpen: boolean;
  checklistVisible: boolean;
  ready: boolean;
  hydrate: () => void;
  openTour: () => void;
  closeTour: () => void;
  dismissChecklist: () => void;
  showChecklist: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  tourOpen: false,
  checklistVisible: false,
  ready: false,

  hydrate: () => {
    const seen = hasSeenTour();
    const checklistGone = isChecklistDismissed();
    set({
      ready: true,
      tourOpen: !seen,
      checklistVisible: !checklistGone,
    });
  },

  openTour: () => set({ tourOpen: true }),

  closeTour: () => {
    markTourSeen();
    set({ tourOpen: false, checklistVisible: true });
  },

  dismissChecklist: () => {
    markChecklistDismissed();
    set({ checklistVisible: false });
  },

  showChecklist: () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(CHECKLIST_KEY);
      } catch {
        /* ignore */
      }
    }
    set({ checklistVisible: true });
  },
}));
