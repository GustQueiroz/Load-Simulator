import type { NodeKind } from '@/domain/simulation/node-kind';

/**
 * The connection currently being drawn with the keyboard.
 *
 * Mouse users draw an edge by dragging from one handle to another; there is no
 * equivalent gesture on a keyboard, so connecting is a two-step selection:
 * arm a source, then pick a target.
 */
export interface KeyboardLink {
  sourceId: string;
  sourceLabel: string;
}

export type KeyboardLinkAction =
  | { type: 'idle' }
  | { type: 'arm'; link: KeyboardLink }
  | { type: 'connect'; sourceId: string; targetId: string }
  | { type: 'cancel' }
  | { type: 'same-node' };

export interface FocusedNode {
  id: string;
  label: string;
  kind: NodeKind;
}

/**
 * Decides what the link key does next. Pure, so the two-step gesture can be
 * tested without a DOM: the caller applies the action.
 */
export function nextLinkAction(
  pending: KeyboardLink | null,
  focused: FocusedNode | null,
): KeyboardLinkAction {
  if (!focused) return pending ? { type: 'cancel' } : { type: 'idle' };

  if (!pending) {
    return { type: 'arm', link: { sourceId: focused.id, sourceLabel: focused.label } };
  }

  // Pressing the key again on the armed node cancels, so the gesture is
  // reversible without reaching for Escape.
  if (pending.sourceId === focused.id) return { type: 'same-node' };

  return { type: 'connect', sourceId: pending.sourceId, targetId: focused.id };
}

/** Reads which node card the keyboard focus is inside, if any. */
export function focusedNodeIdFrom(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const wrapper = target.closest('.react-flow__node');
  if (!(wrapper instanceof HTMLElement)) return null;
  return wrapper.dataset.id ?? null;
}
