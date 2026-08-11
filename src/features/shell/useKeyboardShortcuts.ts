'use client';

import { useEffect } from 'react';

import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { notify } from '@/infrastructure/store/toast-store';
import { useT } from '@/i18n/I18nProvider';

import { useProjectFiles } from './useProjectFiles';

export function useKeyboardShortcuts(): void {
  const t = useT();
  const { exportProject, importProject } = useProjectFiles();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditingField(event.target)) return;

      const state = useSimulatorStore.getState();
      const modifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (modifier && key === 's') {
        event.preventDefault();
        exportProject();
        return;
      }

      if (modifier && key === 'o') {
        event.preventDefault();
        void importProject();
        return;
      }

      if (modifier && key === 'z' && !event.altKey) {
        event.preventDefault();
        if (event.shiftKey) {
          if (!state.redo()) notify(t('toast.nothingToRedo'), 'info');
        } else if (!state.undo()) {
          notify(t('toast.nothingToUndo'), 'info');
        }
        return;
      }

      if (modifier && key === 'y') {
        event.preventDefault();
        if (!state.redo()) notify(t('toast.nothingToRedo'), 'info');
        return;
      }

      if (modifier) return;

      switch (event.key) {
        case ' ':
        case 'Enter':
          event.preventDefault();
          state.toggleRunning();
          break;
        case 'r':
        case 'R':
          state.reset();
          break;
        case 'f':
        case 'F':
          state.requestFitView();
          break;
        case 'p':
        case 'P':
          state.togglePresentationMode();
          break;
        case 'Escape':
          if (state.focusedNodeId) state.setFocusedNode(null);
          else if (state.presentationMode) state.setPresentationMode(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [exportProject, importProject, t]);
}

function isEditingField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
