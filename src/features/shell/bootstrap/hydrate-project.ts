import { resolveBootSource } from '@/application/bootstrap/boot-policy';
import { isLessonId, lessonById } from '@/application/lessons';
import { PRESETS, presetById } from '@/application/presets/presets';
import {
  clearShareFromLocation,
  type ShareBootstrap,
} from '@/application/serialization/share-url';
import { useLessonSessionStore } from '@/features/lessons/lesson-session-store';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';
import type { MessageKey, Translate } from '@/i18n/I18nProvider';
import { presetNameKey, presetVocabulary } from '@/i18n/keys';
import { loadLastProject } from '@/infrastructure/persistence/local-storage';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { notify } from '@/infrastructure/store/toast-store';

import { importFailureMessage } from '../useProjectFiles';

export async function hydrateProjectFromBoot(
  shared: ShareBootstrap,
  translate: Translate,
): Promise<void> {
  const state = useSimulatorStore.getState();
  const onboarding = useOnboardingStore.getState();
  const lessons = useLessonSessionStore.getState();
  onboarding.hydrate();
  lessons.hydrate();

  const url = new URL(window.location.href);
  const lessonParam = url.searchParams.get('lesson');
  const last = loadLastProject();

  const source = resolveBootSource({
    lessonParam,
    lessonValid: Boolean(lessonParam && isLessonId(lessonParam)),
    shareKind: shared.kind === 'none' ? 'none' : shared.kind === 'diagram' ? 'diagram' : 'preset',
    sharePresetId: shared.kind === 'preset' ? shared.presetId : undefined,
    hasLastProject: Boolean(last && last.nodes.length > 0),
  });

  let clearedShare = false;

  switch (source.kind) {
    case 'lesson': {
      if (bootLesson(source.lessonId, translate)) {
        url.searchParams.delete('lesson');
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      }
      break;
    }
    case 'share-diagram': {
      if (shared.kind !== 'diagram') break;
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
      break;
    }
    case 'share-preset': {
      const preset = presetById(source.presetId);
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
      break;
    }
    case 'last-project': {
      if (!last) break;
      state.loadSnapshot(
        { nodes: last.nodes, edges: last.edges, viewport: last.viewport },
        last.name,
        last.createdAt,
      );
      state.setCloud(last.settings.cloud);
      state.setTickMs(last.settings.tickMs);
      state.requestFitView();
      break;
    }
    case 'default-preset': {
      const preset = PRESETS[0];
      state.loadSnapshot(
        preset.build(presetVocabulary(translate)),
        translate(presetNameKey(preset.id)),
      );
      state.requestFitView();
      break;
    }
  }

  useSimulatorStore.getState().clearHistory();

  if (shared.tour) {
    onboarding.openTour();
    if (!clearedShare) clearShareFromLocation();
    else {
      const next = new URL(window.location.href);
      next.searchParams.delete('tour');
      window.history.replaceState(null, '', `${next.pathname}${next.search}${next.hash}`);
    }
  }
}

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
