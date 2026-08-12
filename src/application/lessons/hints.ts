import type { LessonId } from './types';

/**
 * Every lesson offers the same ladder: a nudge that names what to look at, and
 * then the move itself. Two steps, so asking for help never skips the thinking
 * entirely — and never leaves anyone stuck either.
 */
export const HINT_LEVELS = 2;

/** The catalog key for a hint. Copy lives in the message catalogs. */
export function hintKey(lessonId: LessonId, level: number): string {
  return `lesson.${lessonId}.hint${Math.min(Math.max(level, 1), HINT_LEVELS)}`;
}
