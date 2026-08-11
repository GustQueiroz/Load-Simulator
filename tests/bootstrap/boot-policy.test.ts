import { describe, expect, it } from 'vitest';

import { resolveBootSource } from '@/application/bootstrap';

describe('resolveBootSource', () => {
  it('prefers a valid lesson URL over share and local project', () => {
    expect(
      resolveBootSource({
        lessonParam: '0.1',
        lessonValid: true,
        shareKind: 'diagram',
        hasLastProject: true,
      }),
    ).toEqual({ kind: 'lesson', lessonId: '0.1' });
  });

  it('ignores an unknown lesson id and falls through to share', () => {
    expect(
      resolveBootSource({
        lessonParam: '9.9',
        lessonValid: false,
        shareKind: 'preset',
        sharePresetId: 'single-server',
        hasLastProject: true,
      }),
    ).toEqual({ kind: 'share-preset', presetId: 'single-server' });
  });

  it('orders share diagram above last project', () => {
    expect(
      resolveBootSource({
        lessonParam: null,
        lessonValid: false,
        shareKind: 'diagram',
        hasLastProject: true,
      }),
    ).toEqual({ kind: 'share-diagram' });
  });

  it('uses last project when nothing is shared', () => {
    expect(
      resolveBootSource({
        lessonParam: null,
        lessonValid: false,
        shareKind: 'none',
        hasLastProject: true,
      }),
    ).toEqual({ kind: 'last-project' });
  });

  it('falls back to the default preset', () => {
    expect(
      resolveBootSource({
        lessonParam: null,
        lessonValid: false,
        shareKind: 'none',
        hasLastProject: false,
      }),
    ).toEqual({ kind: 'default-preset' });
  });
});
