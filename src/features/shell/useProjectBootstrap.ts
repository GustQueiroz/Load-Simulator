'use client';

import { useEffect, useRef } from 'react';

import { PRESETS } from '@/application/presets/presets';
import { useI18n } from '@/i18n/I18nProvider';
import { presetNameKey, presetVocabulary } from '@/i18n/keys';
import { loadLastProject, saveLastProject } from '@/infrastructure/persistence/local-storage';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';

const AUTOSAVE_DEBOUNCE_MS = 800;

/**
 * Restores the last session (or opens a preset) and keeps autosaving.
 *
 * Runs after mount only: the server renders an empty canvas, so there is
 * nothing to mismatch during hydration.
 */
export function useProjectBootstrap(): void {
  const { t, resolved } = useI18n();
  const bootstrapped = useRef(false);

  useEffect(() => {
    // Preset node labels are persisted data, so they must be written in the
    // visitor's language — not in the default the static HTML was built with.
    if (!resolved || bootstrapped.current) return;
    bootstrapped.current = true;

    const state = useSimulatorStore.getState();
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
      state.loadSnapshot(preset.build(presetVocabulary(t)), t(presetNameKey(preset.id)));
    }

    state.requestFitView();
    // `t` is intentionally not a dependency: a language switch must not
    // re-seed the canvas and throw away whatever the user has built.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
