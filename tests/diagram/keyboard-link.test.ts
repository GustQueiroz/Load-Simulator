import { describe, expect, it } from 'vitest';

import { nextLinkAction, type FocusedNode } from '@/features/diagram/hooks/keyboard-link';

const source: FocusedNode = { id: 'server-1', label: 'Server 1', kind: 'server' };
const target: FocusedNode = { id: 'db-1', label: 'Database 1', kind: 'database' };

describe('keyboard connect gesture', () => {
  it('arms on the focused node', () => {
    expect(nextLinkAction(null, source)).toEqual({
      type: 'arm',
      link: { sourceId: 'server-1', sourceLabel: 'Server 1' },
    });
  });

  it('connects the armed source to the next focused node', () => {
    const armed = { sourceId: 'server-1', sourceLabel: 'Server 1' };
    expect(nextLinkAction(armed, target)).toEqual({
      type: 'connect',
      sourceId: 'server-1',
      targetId: 'db-1',
    });
  });

  it('cancels when the key is pressed again on the armed node', () => {
    const armed = { sourceId: 'server-1', sourceLabel: 'Server 1' };
    expect(nextLinkAction(armed, source)).toEqual({ type: 'same-node' });
  });

  it('cancels when the key is pressed away from any node', () => {
    const armed = { sourceId: 'server-1', sourceLabel: 'Server 1' };
    expect(nextLinkAction(armed, null)).toEqual({ type: 'cancel' });
  });

  it('does nothing off a node with nothing armed', () => {
    expect(nextLinkAction(null, null)).toEqual({ type: 'idle' });
  });
});
