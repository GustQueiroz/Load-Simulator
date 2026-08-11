const STORAGE_KEY = 'system-design-simulator:tour-seen';
const CHECKLIST_KEY = 'system-design-simulator:checklist-dismissed';

export function hasSeenTour(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

export function markTourSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function isChecklistDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(CHECKLIST_KEY) === '1';
  } catch {
    return false;
  }
}

export function markChecklistDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CHECKLIST_KEY, '1');
  } catch {
    /* ignore */
  }
}
