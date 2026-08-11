import type { LessonId, LessonProgressEntry, LessonProgressMap } from '@/application/lessons';
import { isLessonId } from '@/application/lessons';

const STORAGE_KEY = 'system-design-simulator:lesson-progress';

export function loadLessonProgress(): LessonProgressMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LessonProgressMap;
    const cleaned: LessonProgressMap = {};
    for (const [id, entry] of Object.entries(parsed)) {
      if (!isLessonId(id) || !entry || typeof entry !== 'object') continue;
      const stars = entry.stars;
      if (stars !== 1 && stars !== 2 && stars !== 3) continue;
      if (typeof entry.completedAt !== 'string') continue;
      cleaned[id] = { stars, completedAt: entry.completedAt };
    }
    return cleaned;
  } catch {
    return {};
  }
}

export function saveLessonProgress(progress: LessonProgressMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

export function markLessonComplete(
  progress: LessonProgressMap,
  id: LessonId,
  stars: 1 | 2 | 3 = 1,
): LessonProgressMap {
  const existing = progress[id];
  const entry: LessonProgressEntry = {
    stars: existing ? (Math.max(existing.stars, stars) as 1 | 2 | 3) : stars,
    completedAt: existing?.completedAt ?? new Date().toISOString(),
  };
  const next = { ...progress, [id]: entry };
  saveLessonProgress(next);
  return next;
}
