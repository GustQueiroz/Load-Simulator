'use client';

import { create } from 'zustand';

import {
  EMPTY_HOLD,
  type BalloonAnchor,
  type HoldTracker,
  type LessonFlag,
  type LessonId,
  type LessonProgressMap,
  lessonById,
} from '@/application/lessons';
import {
  loadLessonProgress,
  markLessonComplete,
} from '@/infrastructure/persistence/lesson-progress';

interface LessonSessionState {
  ready: boolean;
  mapOpen: boolean;
  briefOpen: boolean;
  activeLessonId: LessonId | null;
  balloonIndex: number;
  flags: Record<LessonFlag, boolean>;
  hold: HoldTracker;
  completedOpen: boolean;
  justCompletedId: LessonId | null;
  justCompletedStars: 1 | 2 | 3;
  progress: LessonProgressMap;

  hydrate: () => void;
  openMap: () => void;
  closeMap: () => void;
  openBrief: () => void;
  closeBrief: () => void;
  beginLesson: (id: LessonId) => void;
  exitLesson: () => void;
  setBalloonIndex: (index: number) => void;
  advanceBalloon: () => void;
  setFlag: (flag: LessonFlag, value?: boolean) => void;
  setHold: (hold: HoldTracker) => void;
  completeActiveLesson: (stars?: 1 | 2 | 3) => void;
  dismissComplete: () => void;
}

const EMPTY_FLAGS: Record<LessonFlag, boolean> = {
  started: false,
  paused: false,
  sawQueueDepth: false,
};

export const useLessonSessionStore = create<LessonSessionState>((set, get) => ({
  ready: false,
  mapOpen: false,
  briefOpen: false,
  activeLessonId: null,
  balloonIndex: 0,
  flags: { ...EMPTY_FLAGS },
  hold: EMPTY_HOLD,
  completedOpen: false,
  justCompletedId: null,
  justCompletedStars: 1,
  progress: {},

  hydrate: () => {
    set({ ready: true, progress: loadLessonProgress() });
  },

  openMap: () => {
    document.body.classList.add('world-map-open');
    set({ mapOpen: true, completedOpen: false });
  },

  closeMap: () => {
    document.body.classList.remove('world-map-open');
    set({ mapOpen: false });
  },

  openBrief: () => set({ briefOpen: true }),

  closeBrief: () => set({ briefOpen: false }),

  beginLesson: (id) => {
    const lesson = lessonById(id);
    if (!lesson) return;
    document.body.classList.remove('world-map-open');
    set({
      activeLessonId: id,
      balloonIndex: 0,
      flags: { ...EMPTY_FLAGS },
      hold: EMPTY_HOLD,
      mapOpen: false,
      completedOpen: false,
      justCompletedId: null,
      justCompletedStars: 1,
      briefOpen: lesson.mode === 'mission',
    });
  },

  exitLesson: () =>
    set({
      activeLessonId: null,
      balloonIndex: 0,
      flags: { ...EMPTY_FLAGS },
      hold: EMPTY_HOLD,
      completedOpen: false,
      justCompletedId: null,
      justCompletedStars: 1,
      briefOpen: false,
    }),

  setBalloonIndex: (index) => set({ balloonIndex: Math.max(0, index) }),

  advanceBalloon: () => {
    const { activeLessonId, balloonIndex } = get();
    const lesson = activeLessonId ? lessonById(activeLessonId) : undefined;
    if (!lesson) return;
    const next = Math.min(balloonIndex + 1, lesson.balloons.length);
    set({ balloonIndex: next });
  },

  setFlag: (flag, value = true) =>
    set((state) => ({ flags: { ...state.flags, [flag]: value } })),

  setHold: (hold) => set({ hold }),

  completeActiveLesson: (stars = 1) => {
    const { activeLessonId, progress } = get();
    if (!activeLessonId) return;
    const next = markLessonComplete(progress, activeLessonId, stars);
    set({
      progress: next,
      completedOpen: true,
      justCompletedId: activeLessonId,
      justCompletedStars: stars,
      briefOpen: false,
    });
  },

  dismissComplete: () => set({ completedOpen: false }),
}));

export function useLessonHighlight(): BalloonAnchor | null {
  return useLessonSessionStore((state) => {
    if (!state.activeLessonId) return null;
    const lesson = lessonById(state.activeLessonId);
    if (!lesson || lesson.mode !== 'guided') return null;
    const balloon = lesson.balloons[state.balloonIndex];
    return balloon?.anchor ?? null;
  });
}

export function useActiveLesson() {
  return useLessonSessionStore((state) =>
    state.activeLessonId ? lessonById(state.activeLessonId) : undefined,
  );
}
