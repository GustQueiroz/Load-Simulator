'use client';

import { useEffect, useRef } from 'react';

import { isLessonId, lessonById } from '@/application/lessons';
import { PRESETS, presetById } from '@/application/presets/presets';
import {
  clearShareFromLocation,
  readShareFromLocation,
} from '@/application/serialization/share-url';
import { useLessonSessionStore } from '@/features/lessons/lesson-session-store';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';
import { useI18n, type MessageKey, type Translate } from '@/i18n/I18nProvider';
import { presetNameKey, presetVocabulary } from '@/i18n/keys';
import { loadLastProject, saveLastProject } from '@/infrastructure/persistence/local-storage';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { notify } from '@/infrastructure/store/toast-store';

import { importFailureMessage } from './useProjectFiles';

const AUTOSAVE_DEBOUNCE_MS = 800;

function bootLesson(id: string, translate: Translate): boolean {
  if (!isLessonId(id)) return false;
  const lesson = lessonById(id);
  if (!lesson) return false;

  const state = useSimulatorStore.getState();
  const titleKey = `lesson.${id}.title` as MessageKey;
  state.reset();
  state.loadSnapshot(lesson.build(presetVocabulary(translate)), translate(titleKey));
  state.clearHistory();
  if (lesson.focusNodeId) state.selectNode(lesson.focusNodeId);
  state.requestFitView();
  useLessonSessionStore.getState().beginLesson(id);
  if (lesson.autoStart) {
    state.start();
    useLessonSessionStore.getState().setFlag('started');
  }
  notify(translate('lesson.started', { name: translate(titleKey) }), 'info');
  return true;
}

export function useProjectBootstrap(): void {
  const { t, resolved } = useI18n();
  const bootstrapped = useRef(false);
  const tRef = useRef(t);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    if (!resolved || bootstrapped.current) return;
    bootstrapped.current = true;
    const translate = tRef.current;

    void (async () => {
      const state = useSimulatorStore.getState();
      const onboarding = useOnboardingStore.getState();
      const lessons = useLessonSessionStore.getState();
      onboarding.hydrate();
      lessons.hydrate();

      const url = new URL(window.location.href);
      const lessonParam = url.searchParams.get('lesson');

      const shared = await readShareFromLocation();
      let clearedShare = false;

      if (lessonParam && bootLesson(lessonParam, translate)) {
        url.searchParams.delete('lesson');
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      } else if (shared.kind === 'diagram') {
        if (!shared.result.ok) {
          notify(importFailureMessage(shared.result.error, translate), 'error');
        } else {
          const diagram = shared.result.diagram;
          state.reset();
          state.loadSnapshot(
            { nodes: diagram.nodes, edges: diagram.edges, viewport: diagram.viewport },
            diagram.name,
            diagram.createdAt,
          );
          state.setCloud(diagram.settings.cloud);
          state.setTickMs(diagram.settings.tickMs);
          state.requestFitView();
          clearShareFromLocation();
          clearedShare = true;
          notify(translate('toast.sharedOpened', { name: diagram.name }), 'success');
        }
      } else if (shared.kind === 'preset') {
        const preset = presetById(shared.presetId);
        if (preset) {
          state.reset();
          state.loadSnapshot(
            preset.build(presetVocabulary(translate)),
            translate(presetNameKey(preset.id)),
          );
          state.requestFitView();
          clearShareFromLocation();
          clearedShare = true;
          notify(
            translate('toast.presetOpened', { name: translate(presetNameKey(preset.id)) }),
            'success',
          );
        }
      } else {
        const last = loadLastProject();
        if (last && last.nodes.length > 0) {
          state.loadSnapshot(
            { nodes: last.nodes, edges: last.edges, viewport: last.viewport },
            last.name,
            last.createdAt,
          );
          state.setCloud(last.settings.cloud);
          state.setTickMs(last.settings.tickMs);
        } else {
          const preset = PRESETS[0];
          state.loadSnapshot(
            preset.build(presetVocabulary(translate)),
            translate(presetNameKey(preset.id)),
          );
        }
        state.requestFitView();
      }

      useSimulatorStore.getState().clearHistory();

      if (shared.tour) {
        onboarding.openTour();
        if (!clearedShare) clearShareFromLocation();
        else {
          const url = new URL(window.location.href);
          url.searchParams.delete('tour');
          window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
        }
      }
    })();
  }, [resolved]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = useSimulatorStore.subscribe(
      (state) => [state.nodes, state.edges, state.name, state.cloud, state.viewport] as const,
      () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          const state = useSimulatorStore.getState();
          saveLastProject({
            name: state.name,
            nodes: state.nodes,
            edges: state.edges,
            viewport: state.viewport,
            settings: {
              cloud: state.cloud,
              tickMs: state.tickMs,
              presentationMode: state.presentationMode,
            },
            createdAt: state.createdAt,
            now: new Date().toISOString(),
          });
        }, AUTOSAVE_DEBOUNCE_MS);
      },
      { equalityFn: shallowArrayEquals },
    );

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}

function shallowArrayEquals(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
