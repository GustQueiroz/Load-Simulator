'use client';

import { useEffect } from 'react';

import { useSimulatorStore } from '@/infrastructure/store/simulator-store';

import { useProjectFiles } from './useProjectFiles';

/**
 * Presenter shortcuts.
 *
 * Nothing fires while a field has focus — dragging a slider with the space bar
 * must never start and stop the simulation.
 */
export function useKeyboardShortcuts(): void {
  const { exportProject, importProject } = useProjectFiles();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditingField(event.target)) return;

      const state = useSimulatorStore.getState();
      const modifier = event.metaKey || event.ctrlKey;

      if (modifier && event.key.toLowerCase() === 's') {
        event.preventDefault();
        exportProject();
        return;
      }

      if (modifier && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        void importProject();
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
  }, [exportProject, importProject]);
}

function isEditingField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
