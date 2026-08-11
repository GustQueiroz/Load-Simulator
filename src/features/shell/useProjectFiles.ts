'use client';

import { useCallback } from 'react';

import type { ImportFailure } from '@/application/serialization/import-error';
import { exportDin, serializeDin } from '@/application/serialization/export-din';
import { importDin } from '@/application/serialization/import-din';
import { useT, type Translate } from '@/i18n/I18nProvider';
import { downloadTextFile, pickTextFile, toFileName } from '@/infrastructure/file/file-io';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { notify } from '@/infrastructure/store/toast-store';

/** Export / import of `.din` files. Everything stays on the machine. */
export function useProjectFiles() {
  const t = useT();

  const exportProject = useCallback(() => {
    const state = useSimulatorStore.getState();
    if (state.nodes.length === 0) {
      notify(t('toast.nothingToExport'), 'info');
      return;
    }

    const file = exportDin({
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

    downloadTextFile(toFileName(state.name, 'din'), serializeDin(file));
    state.markSaved();
    notify(t('toast.exported'), 'success');
  }, [t]);

  const importProject = useCallback(async () => {
    const picked = await pickTextFile('.din,application/json');
    if (!picked) return;

    const result = importDin(picked.content);
    if (!result.ok) {
      notify(importFailureMessage(result.error, t), 'error');
      return;
    }

    const state = useSimulatorStore.getState();
    // Only now — after the whole document validated — is the project replaced.
    state.reset();
    state.loadSnapshot(
      {
        nodes: result.diagram.nodes,
        edges: result.diagram.edges,
        viewport: result.diagram.viewport,
      },
      result.diagram.name,
      result.diagram.createdAt,
    );
    state.setCloud(result.diagram.settings.cloud);
    state.setTickMs(result.diagram.settings.tickMs);
    state.requestFitView();
    notify(t('toast.imported', { name: result.diagram.name }), 'success');
  }, [t]);

  return { exportProject, importProject };
}

/** Exhaustive by construction: a new failure code will not compile until phrased. */
export function importFailureMessage(failure: ImportFailure, t: Translate): string {
  switch (failure.code) {
    case 'invalid-json':
      return t('error.import.invalidJson');
    case 'newer-version':
      return t('error.import.newerVersion');
    case 'schema':
      return failure.path
        ? t('error.import.schema', { path: failure.path, detail: failure.detail })
        : t('error.import.schemaNoPath', { detail: failure.detail });
    case 'unknown-kind':
      return t('error.import.unknownKind', { kind: failure.kind });
    case 'no-migration':
      return t('error.import.noMigration', { from: failure.from, to: failure.to });
    case 'invalid':
      return t('error.import.invalid');
  }
}
