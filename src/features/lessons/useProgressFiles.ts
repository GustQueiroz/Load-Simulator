'use client';

import { useCallback } from 'react';

import { mergeProgress, parseProgress, serializeProgress } from '@/application/progress/progress-file';
import { useT } from '@/i18n/I18nProvider';
import { downloadTextFile, pickTextFile } from '@/infrastructure/file/file-io';
import { notify } from '@/infrastructure/store/toast-store';

import { useLessonSessionStore } from './lesson-session-store';

const PROGRESS_FILE_NAME = 'system-design-progress.json';

/**
 * Course progress as a file.
 *
 * Everything else in this product is client-side and portable; progress living
 * only in `localStorage` made it the one thing a learner could lose by
 * switching browsers or clearing site data.
 */
export function useProgressFiles() {
  const t = useT();
  const replaceProgress = useLessonSessionStore((state) => state.replaceProgress);

  const exportProgress = useCallback(() => {
    const { progress } = useLessonSessionStore.getState();
    if (Object.keys(progress).length === 0) {
      notify(t('toast.progressEmpty'), 'info');
      return;
    }

    downloadTextFile(PROGRESS_FILE_NAME, serializeProgress(progress, new Date().toISOString()));
    notify(t('toast.progressExported'), 'success');
  }, [t]);

  const importProgress = useCallback(async () => {
    const picked = await pickTextFile('.json,application/json');
    if (!picked) return;

    const result = parseProgress(picked.content);
    if (!result.ok) {
      notify(t('toast.progressInvalid'), 'error');
      return;
    }

    const current = useLessonSessionStore.getState().progress;
    const merged = mergeProgress(current, result.progress);
    replaceProgress(merged);
    notify(t('toast.progressImported', { count: Object.keys(result.progress).length }), 'success');
  }, [replaceProgress, t]);

  return { exportProgress, importProgress };
}
