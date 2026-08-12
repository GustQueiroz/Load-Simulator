'use client';

import type { Connection } from '@xyflow/react';
import { useCallback, useState, type KeyboardEvent } from 'react';

import { useT } from '@/i18n/I18nProvider';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { notify } from '@/infrastructure/store/toast-store';

import { focusedNodeIdFrom, nextLinkAction, type KeyboardLink } from './keyboard-link';

/** Arms and completes a connection. Chosen to be reachable one-handed. */
const LINK_KEY = 'c';

export interface CanvasKeyboard {
  /** Attach to the canvas wrapper. */
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  /** The armed source, or null when nothing is being connected. */
  link: KeyboardLink | null;
  cancelLink: () => void;
}

/**
 * The keyboard half of the canvas.
 *
 * React Flow already handles focus (Tab), selection (Enter), movement (arrows)
 * and deletion. It has no way to *connect* two nodes without a pointer, which
 * is the one gesture the whole product depends on — so that is what this adds.
 */
export function useCanvasKeyboard(
  onConnect: (connection: Connection) => void,
  enabled = true,
): CanvasKeyboard {
  const t = useT();
  const [link, setLink] = useState<KeyboardLink | null>(null);

  const cancelLink = useCallback(() => setLink(null), []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (!enabled) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'Escape' && link) {
        event.preventDefault();
        event.stopPropagation();
        setLink(null);
        notify(t('toast.linkCancelled'), 'info');
        return;
      }

      if (event.key.toLowerCase() !== LINK_KEY) return;

      const focusedId = focusedNodeIdFrom(event.target);
      const nodes = useSimulatorStore.getState().nodes;
      const focusedNode = focusedId ? nodes.find((node) => node.id === focusedId) : undefined;

      const action = nextLinkAction(
        link,
        focusedNode
          ? {
              id: focusedNode.id,
              label: focusedNode.data.config.label,
              kind: focusedNode.data.kind,
            }
          : null,
      );

      if (action.type === 'idle') return;
      event.preventDefault();

      switch (action.type) {
        case 'arm':
          setLink(action.link);
          break;
        case 'same-node':
        case 'cancel':
          setLink(null);
          notify(t('toast.linkCancelled'), 'info');
          break;
        case 'connect':
          setLink(null);
          onConnect({
            source: action.sourceId,
            target: action.targetId,
            sourceHandle: null,
            targetHandle: null,
          });
          break;
      }
    },
    [enabled, link, onConnect, t],
  );

  return { onKeyDown, link, cancelLink };
}
