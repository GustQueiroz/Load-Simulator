import { describe, expect, it } from 'vitest';

import {
  buildShareUrl,
  decodeSharePayload,
  encodeSharePayload,
  readShareFromLocation,
  ShareUrlTooLongError,
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

  it('tags the payload so the reader never has to guess the encoding', async () => {
    const encoded = await encodeSharePayload('{"hello":"world"}');
    expect(encoded.startsWith('z') || encoded.startsWith('r')).toBe(true);
    expect(await decodeSharePayload(encoded)).toBe('{"hello":"world"}');
  });

  it('still reads an untagged link minted before the tag existed', async () => {
    const json = '{"legacy":true}';
    const bytes = new TextEncoder().encode(json);
    const stream = new Blob([bytes.buffer as ArrayBuffer])
      .stream()
      .pipeThrough(new CompressionStream('deflate-raw'));
    const deflated = new Uint8Array(await new Response(stream).arrayBuffer());

    let binary = '';
    for (const byte of deflated) binary += String.fromCharCode(byte);
    const legacy = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

    expect(await decodeSharePayload(legacy)).toBe(json);
  });

  it('refuses to mint a link past the length platforms tolerate', async () => {
    // Deflate is very good at repetitive JSON, so the labels are made
    // deliberately incompressible to exercise the ceiling rather than the
    // compressor.
    let seed = 1;
    const noisyLabel = () =>
      Array.from({ length: 40 }, () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return String.fromCharCode(97 + (seed % 26));
      }).join('');

    const nodes = Array.from({ length: 200 }, (_, index) => ({
      id: `server-${index}`,
      type: 'server' as const,
      position: { x: index * 40, y: index * 40 },
      data: {
        kind: 'server' as const,
        config: createDefaultConfig('server', noisyLabel()),
      },
    }));

    await expect(
      buildShareUrl(
        {
          name: 'Huge diagram',
          nodes,
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
          settings: { cloud: 'generic', tickMs: 100, presentationMode: false },
          createdAt: '2026-01-01T00:00:00.000Z',
          now: '2026-01-01T00:00:00.000Z',
        },
        'https://example.com/',
      ),
    ).rejects.toBeInstanceOf(ShareUrlTooLongError);
  });

  /** A stale `?preset=` outranks the hash on read, so it must not survive. */
  it('strips boot params from the link it builds', async () => {
    const url = await buildShareUrl(
      {
        name: 'Clean',
        nodes: [
          {
            id: 'c1',
            type: 'client',
            position: { x: 0, y: 0 },
            data: { kind: 'client', config: createDefaultConfig('client', 'Client 1') },
          },
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        settings: { cloud: 'generic', tickMs: 100, presentationMode: false },
        createdAt: '2026-01-01T00:00:00.000Z',
        now: '2026-01-01T00:00:00.000Z',
      },
      'https://example.com/?preset=single-server&lesson=1.1&tour=1',
    );

    expect(url).not.toContain('preset=');
    expect(url).not.toContain('lesson=');
    expect(url).not.toContain('tour=');
    expect(url).toContain('#d=');
  });

  it('reads preset and tour flags from the query string', async () => {
    const withTour = await readShareFromLocation('?preset=button-click-demo&tour=1', '');
    expect(withTour).toEqual({
      kind: 'preset',
      presetId: 'button-click-demo',
      tour: true,
    });

    const plain = await readShareFromLocation('?preset=single-server', '');
    expect(plain).toEqual({ kind: 'preset', presetId: 'single-server', tour: false });
  });
});
