import { describe, expect, it } from 'vitest';

import type { LessonProgressMap } from '@/application/lessons';
import {
  mergeProgress,
  parseProgress,
  PROGRESS_FILE_KIND,
  serializeProgress,
} from '@/application/progress/progress-file';

const NOW = '2026-08-12T12:00:00.000Z';

const progress: LessonProgressMap = {
  '0.1': { stars: 3, completedAt: '2026-08-01T10:00:00.000Z' },
  '1.3': { stars: 2, completedAt: '2026-08-05T10:00:00.000Z' },
};

describe('progress file', () => {
  it('round-trips', () => {
    const result = parseProgress(serializeProgress(progress, NOW));
    expect(result).toEqual({ ok: true, progress });
  });

  it('rejects a file that is not progress', () => {
    const other = JSON.stringify({ kind: 'something-else', version: 1 });
    expect(parseProgress(other)).toEqual({
      ok: false,
      failure: { code: 'unknown-kind', kind: 'something-else' },
    });
  });

  it('rejects malformed json', () => {
    expect(parseProgress('{oops')).toEqual({ ok: false, failure: { code: 'invalid-json' } });
  });

  it('refuses a file written by a newer version', () => {
    const future = JSON.stringify({
      kind: PROGRESS_FILE_KIND,
      version: 99,
      exportedAt: NOW,
      progress: {},
    });
    expect(parseProgress(future)).toEqual({ ok: false, failure: { code: 'newer-version' } });
  });

  it('rejects entries with an impossible star count', () => {
    const bad = JSON.stringify({
      kind: PROGRESS_FILE_KIND,
      version: 1,
      exportedAt: NOW,
      progress: { '0.1': { stars: 7, completedAt: NOW } },
    });
    const result = parseProgress(bad);
    expect(result.ok).toBe(false);
  });

  it('ignores lesson ids that are not in the curriculum', () => {
    const bad = JSON.stringify({
      kind: PROGRESS_FILE_KIND,
      version: 1,
      exportedAt: NOW,
      progress: { '9.9': { stars: 3, completedAt: NOW } },
    });
    const result = parseProgress(bad);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.progress).toEqual({});
  });
});

describe('mergeProgress', () => {
  it('keeps the better star count', () => {
    const merged = mergeProgress(
      { '0.1': { stars: 1, completedAt: NOW } },
      { '0.1': { stars: 3, completedAt: NOW } },
    );
    expect(merged['0.1']?.stars).toBe(3);
  });

  it('never loses a local result the file does not have', () => {
    const merged = mergeProgress(
      { '0.1': { stars: 2, completedAt: NOW } },
      { '1.3': { stars: 1, completedAt: NOW } },
    );
    expect(Object.keys(merged).sort()).toEqual(['0.1', '1.3']);
  });

  it('keeps the earliest completion date', () => {
    const merged = mergeProgress(
      { '0.1': { stars: 1, completedAt: '2026-08-10T00:00:00.000Z' } },
      { '0.1': { stars: 1, completedAt: '2026-07-01T00:00:00.000Z' } },
    );
    expect(merged['0.1']?.completedAt).toBe('2026-07-01T00:00:00.000Z');
  });

  it('does not downgrade on an unparseable date', () => {
    const merged = mergeProgress(
      { '0.1': { stars: 2, completedAt: 'not a date' } },
      { '0.1': { stars: 1, completedAt: NOW } },
    );
    expect(merged['0.1']).toEqual({ stars: 2, completedAt: NOW });
  });
});
