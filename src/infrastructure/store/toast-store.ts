'use client';

import { create } from 'zustand';

import { nanoid } from 'nanoid';

export type ToastTone = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 5_000;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],

  push: (message, tone = 'info') => {
    const id = nanoid(8);
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export function notify(message: string, tone: ToastTone = 'info'): void {
  useToastStore.getState().push(message, tone);
}
