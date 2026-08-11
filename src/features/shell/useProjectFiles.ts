'use client';

import { useCallback } from 'react';

import type { ImportFailure } from '@/application/serialization/import-error';
import { exportDin, serializeDin } from '@/application/serialization/export-din';
import { importDin } from '@/application/serialization/import-din';
import { useT, type Translate } from '@/i18n/I18nProvider';
import { downloadTextFile, pickTextFile, toFileName } from '@/infrastructure/file/file-io';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { notify } from '@/infrastructure/store/toast-store';

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
    applyDinContent(picked.content, t);
  }, [t]);

  const importDinFile = useCallback(
    async (file: File) => {
      if (!isDinLikeFile(file)) {
        notify(t('toast.dropUnsupported'), 'error');
        return false;
      }
      try {
        const content = await file.text();
        return applyDinContent(content, t);
      } catch {
        notify(t('error.import.invalid'), 'error');
        return false;
      }
    },
    [t],
  );

  return { exportProject, importProject, importDinFile };
}

export function applyDinContent(content: string, t: Translate): boolean {
  const result = importDin(content);
  if (!result.ok) {
    notify(importFailureMessage(result.error, t), 'error');
    return false;
  }

  const state = useSimulatorStore.getState();
  state.pushHistory();
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
  return true;
}

export function isDinLikeFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.din') || name.endsWith('.json') || file.type.includes('json');
}

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
