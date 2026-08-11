import { describe, expect, it } from 'vitest';

import {
  decodeSharePayload,
  encodeSharePayload,
} from '@/application/serialization/share-url';
import { exportDin, serializeDin } from '@/application/serialization/export-din';
import { importDin } from '@/application/serialization/import-din';
import { createDefaultConfig } from '@/domain/nodes/defaults';

describe('share URL payload', () => {
  it('round-trips a diagram through deflate + base64url', async () => {
    const file = exportDin({
      name: 'Shared demo',
      nodes: [
        {
          id: 'c1',
          type: 'client',
          position: { x: 0, y: 0 },
          data: { kind: 'client', config: createDefaultConfig('client', 'Client 1') },
        },
        {
          id: 's1',
          type: 'server',
          position: { x: 0, y: 200 },
          data: { kind: 'server', config: createDefaultConfig('server', 'Server 1') },
        },
      ],
      edges: [{ id: 'e1', source: 'c1', target: 's1', data: { enabled: true } }],
      viewport: { x: 0, y: 0, zoom: 1 },
      settings: { cloud: 'generic', tickMs: 100, presentationMode: false },
      createdAt: '2026-01-01T00:00:00.000Z',
      now: '2026-01-01T00:00:00.000Z',
    });

    const encoded = await encodeSharePayload(serializeDin(file));
    expect(encoded.length).toBeGreaterThan(10);
    expect(encoded).not.toMatch(/[+/=]/);

    const decoded = await decodeSharePayload(encoded);
    const result = importDin(decoded);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diagram.name).toBe('Shared demo');
    expect(result.diagram.nodes).toHaveLength(2);
  });
});
