import { z } from 'zod';

import { LESSON_IDS, type LessonId, type LessonProgressMap } from '@/application/lessons';
import type { ImportFailure } from '@/application/serialization/import-error';

export const PROGRESS_FILE_KIND = 'system-design-load-simulator/progress';
export const PROGRESS_FILE_VERSION = 1;

const entrySchema = z.object({
  stars: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  completedAt: z.string(),
});

const progressFileSchema = z.object({
  kind: z.literal(PROGRESS_FILE_KIND),
  version: z.number().int().positive(),
  exportedAt: z.string(),
  progress: z.partialRecord(z.enum(LESSON_IDS), entrySchema),
});

export type ProgressFile = z.infer<typeof progressFileSchema>;

export type ProgressImport =
  | { ok: true; progress: LessonProgressMap }
  | { ok: false; failure: ImportFailure };

export function serializeProgress(progress: LessonProgressMap, now: string): string {
  const file: ProgressFile = {
    kind: PROGRESS_FILE_KIND,
    version: PROGRESS_FILE_VERSION,
    exportedAt: now,
    progress,
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

export function parseProgress(text: string): ProgressImport {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, failure: { code: 'invalid-json' } };
  }

  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, failure: { code: 'invalid' } };
  }

  const kind = (raw as { kind?: unknown }).kind;
  if (kind !== PROGRESS_FILE_KIND) {
    return { ok: false, failure: { code: 'unknown-kind', kind: String(kind ?? '') } };
  }

  const version = (raw as { version?: unknown }).version;
  if (typeof version === 'number' && version > PROGRESS_FILE_VERSION) {
    return { ok: false, failure: { code: 'newer-version' } };
  }

  // A file written by a later version may carry lessons this build does not
  // have yet. Dropping those is better than rejecting the whole file and
  // losing the progress that *is* recognisable.
  const parsed = progressFileSchema.safeParse({
    ...raw,
    progress: onlyKnownLessons((raw as { progress?: unknown }).progress),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      failure: { code: 'schema', path: issue?.path.join('.'), detail: issue?.message ?? '' },
    };
  }

  return { ok: true, progress: parsed.data.progress };
}

function onlyKnownLessons(progress: unknown): Record<string, unknown> {
  if (typeof progress !== 'object' || progress === null) return {};
  const known = new Set<string>(LESSON_IDS);
  return Object.fromEntries(
    Object.entries(progress as Record<string, unknown>).filter(([id]) => known.has(id)),
  );
}

/**
 * Combines two progress maps, keeping the best result for each lesson.
 *
 * Importing is a merge and not a replace on purpose: someone carrying progress
 * from another browser should gain what that file has without losing what they
 * earned here. The earliest completion is kept as the date, since that is when
 * the lesson was actually first cleared.
 */
export function mergeProgress(base: LessonProgressMap, incoming: LessonProgressMap): LessonProgressMap {
  const merged: LessonProgressMap = { ...base };

  for (const id of LESSON_IDS as readonly LessonId[]) {
    const mine = base[id];
    const theirs = incoming[id];
    if (!theirs) continue;
    if (!mine) {
      merged[id] = theirs;
      continue;
    }

    merged[id] = {
      stars: Math.max(mine.stars, theirs.stars) as 1 | 2 | 3,
      completedAt: earliest(mine.completedAt, theirs.completedAt),
    };
  }

  return merged;
}

function earliest(a: string, b: string): string {
  const timeA = Date.parse(a);
  const timeB = Date.parse(b);
  if (Number.isNaN(timeA)) return b;
  if (Number.isNaN(timeB)) return a;
  return timeA <= timeB ? a : b;
}
