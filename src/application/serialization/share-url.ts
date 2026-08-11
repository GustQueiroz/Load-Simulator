import type { CloudProvider } from '@/application/cost/types';
import { isPresetId, type PresetId } from '@/application/presets/presets';
import { exportDin, serializeDin } from '@/application/serialization/export-din';
import { importDin, type ImportResult } from '@/application/serialization/import-din';
import type { DiagramEdge, DiagramNode, DiagramViewport } from '@/domain/diagram/diagram';

const SHARE_PARAM = 'd';
const PRESET_PARAM = 'preset';

export interface SharePayloadInput {
  name: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  viewport: DiagramViewport;
  settings: {
    cloud: CloudProvider;
    tickMs: number;
    presentationMode: boolean;
  };
  createdAt: string;
  now: string;
}

export async function buildShareUrl(
  input: SharePayloadInput,
  base = window.location.href,
): Promise<string> {
  const file = exportDin(input);
  const encoded = await encodeSharePayload(serializeDin(file));
  const url = new URL(base);
  url.searchParams.delete(SHARE_PARAM);
  url.hash = `${SHARE_PARAM}=${encoded}`;
  return url.toString();
}

export function buildPresetUrl(presetId: PresetId, base = window.location.href): string {
  const url = new URL(base);
  url.hash = '';
  url.searchParams.set(PRESET_PARAM, presetId);
  return url.toString();
}

export type ShareBootstrap =
  | { kind: 'diagram'; result: ImportResult }
  | { kind: 'preset'; presetId: PresetId }
  | { kind: 'none' };

export async function readShareFromLocation(
  search = window.location.search,
  hash = window.location.hash,
): Promise<ShareBootstrap> {
  const params = new URLSearchParams(search);
  const preset = params.get(PRESET_PARAM);
  if (preset && isPresetId(preset)) {
    return { kind: 'preset', presetId: preset };
  }

  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const encoded = hashParams.get(SHARE_PARAM) ?? params.get(SHARE_PARAM);
  if (!encoded) return { kind: 'none' };

  try {
    const json = await decodeSharePayload(encoded);
    return { kind: 'diagram', result: importDin(json) };
  } catch {
    return { kind: 'diagram', result: { ok: false, error: { code: 'invalid' } } };
  }
}

export function clearShareFromLocation(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(SHARE_PARAM);
  url.searchParams.delete(PRESET_PARAM);
  url.hash = '';
  window.history.replaceState(null, '', `${url.pathname}${url.search}`);
}

export async function encodeSharePayload(json: string): Promise<string> {
  const bytes = new TextEncoder().encode(json);
  const compressed = await deflate(bytes);
  return bytesToBase64Url(compressed);
}

export async function decodeSharePayload(encoded: string): Promise<string> {
  const compressed = base64UrlToBytes(encoded);
  const bytes = await inflate(compressed);
  return new TextDecoder().decode(bytes);
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') return bytes;
  const stream = new Blob([bytes.buffer as ArrayBuffer])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') return bytes;
  try {
    const stream = new Blob([bytes.buffer as ArrayBuffer])
      .stream()
      .pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {

    return bytes;
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
