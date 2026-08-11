'use client';

import { useCallback } from 'react';

import { isLessonUnlocked, lessonById, type LessonId } from '@/application/lessons';
import { useT, type MessageKey } from '@/i18n/I18nProvider';
import { presetVocabulary } from '@/i18n/keys';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { notify } from '@/infrastructure/store/toast-store';

import { useLessonSessionStore } from './lesson-session-store';

function lessonTitleKey(id: LessonId): MessageKey {
  return `lesson.${id}.title` as MessageKey;
}

export function useStartLesson() {
  const t = useT();

  return useCallback(
    (id: LessonId) => {
      const lesson = lessonById(id);
      if (!lesson) return;

      const progress = useLessonSessionStore.getState().progress;
      if (!isLessonUnlocked(id, progress)) {
        notify(t('lesson.locked'), 'info');
        return;
      }

      const state = useSimulatorStore.getState();
      state.reset();
      state.loadSnapshot(lesson.build(presetVocabulary(t)), t(lessonTitleKey(id)));
      state.clearHistory();
      if (lesson.focusNodeId) state.selectNode(lesson.focusNodeId);
      state.requestFitView();

      useLessonSessionStore.getState().beginLesson(id);

      if (lesson.autoStart) {
        state.start();
        useLessonSessionStore.getState().setFlag('started');
      }

      notify(t('lesson.started', { name: t(lessonTitleKey(id)) }), 'info');
    },
    [t],
  );
}
