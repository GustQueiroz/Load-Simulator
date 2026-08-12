import type { CloudProvider } from '@/application/cost/types';
import { isPresetId, type PresetId } from '@/application/presets/presets';
import { exportDin, serializeDin } from '@/application/serialization/export-din';
import { importDin, type ImportResult } from '@/application/serialization/import-din';
import type { DiagramEdge, DiagramNode, DiagramViewport } from '@/domain/diagram/diagram';

const SHARE_PARAM = 'd';
const PRESET_PARAM = 'preset';
const TOUR_PARAM = 'tour';
const LESSON_PARAM = 'lesson';

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

/**
 * Practical ceiling for a link that has to survive being pasted around.
 * Browsers take far more, but chat clients and issue trackers start cutting
 * links around here — a truncated diagram is worse than an honest refusal.
 */
export const MAX_SHARE_URL_LENGTH = 8_000;

export class ShareUrlTooLongError extends Error {
  constructor(readonly length: number) {
    super(`Share URL is ${length} characters, over the ${MAX_SHARE_URL_LENGTH} limit`);
    this.name = 'ShareUrlTooLongError';
  }
}

export async function buildShareUrl(
  input: SharePayloadInput,
  base = window.location.href,
): Promise<string> {
  const file = exportDin(input);
  const encoded = await encodeSharePayload(serializeDin(file));
  const url = new URL(base);
  // A stale `?preset=` or `?lesson=` would win over the diagram we are about
  // to embed, so the link is built from a clean slate.
  url.searchParams.delete(SHARE_PARAM);
  url.searchParams.delete(PRESET_PARAM);
  url.searchParams.delete(TOUR_PARAM);
  url.searchParams.delete(LESSON_PARAM);
  url.hash = `${SHARE_PARAM}=${encoded}`;

  const result = url.toString();
  if (result.length > MAX_SHARE_URL_LENGTH) throw new ShareUrlTooLongError(result.length);
  return result;
}

export function buildPresetUrl(
  presetId: PresetId,
  options: { tour?: boolean; base?: string } = {},
): string {
  const url = new URL(options.base ?? window.location.href);
  url.hash = '';
  url.searchParams.set(PRESET_PARAM, presetId);
  if (options.tour) url.searchParams.set(TOUR_PARAM, '1');
  else url.searchParams.delete(TOUR_PARAM);
  return url.toString();
}

export type ShareBootstrap =
  | { kind: 'diagram'; result: ImportResult; tour: boolean }
  | { kind: 'preset'; presetId: PresetId; tour: boolean }
  | { kind: 'none'; tour: boolean };

export async function readShareFromLocation(
  search = window.location.search,
  hash = window.location.hash,
): Promise<ShareBootstrap> {
  const params = new URLSearchParams(search);
  const tour = params.get(TOUR_PARAM) === '1';

  const preset = params.get(PRESET_PARAM);
  if (preset && isPresetId(preset)) {
    return { kind: 'preset', presetId: preset, tour };
  }

  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const encoded = hashParams.get(SHARE_PARAM) ?? params.get(SHARE_PARAM);
  if (!encoded) return { kind: 'none', tour };

  try {
    const json = await decodeSharePayload(encoded);
    return { kind: 'diagram', result: importDin(json), tour };
  } catch {
    return { kind: 'diagram', result: { ok: false, error: { code: 'invalid' } }, tour };
  }
}

export function clearShareFromLocation(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(SHARE_PARAM);
  url.searchParams.delete(PRESET_PARAM);
  url.searchParams.delete(TOUR_PARAM);
  url.hash = '';
  window.history.replaceState(null, '', `${url.pathname}${url.search}`);
}

export async function encodeSharePayload(json: string): Promise<string> {
  const { bytes, prefix } = await deflate(new TextEncoder().encode(json));
  return prefix + bytesToBase64Url(bytes);
}

export async function decodeSharePayload(encoded: string): Promise<string> {
  const prefix = encoded.slice(0, 1);
  const body = encoded.slice(1);

  // Links minted before the tag existed are always deflate-raw.
  const payload =
    prefix === RAW_PREFIX || prefix === DEFLATE_PREFIX ? body : encoded;
  const compressed = base64UrlToBytes(payload);

  const bytes = prefix === RAW_PREFIX ? compressed : await inflate(compressed);
  return new TextDecoder().decode(bytes);
}

/**
 * Payloads are tagged so a reader always knows what it is holding.
 *
 * Without the marker, a link produced where `CompressionStream` is missing is
 * indistinguishable from a corrupt one, and the reader has to guess — which
 * used to surface as "invalid file" with no explanation.
 */
const RAW_PREFIX = 'r';
const DEFLATE_PREFIX = 'z';

async function deflate(bytes: Uint8Array): Promise<{ bytes: Uint8Array; prefix: string }> {
  if (typeof CompressionStream === 'undefined') return { bytes, prefix: RAW_PREFIX };
  const stream = new Blob([bytes.buffer as ArrayBuffer])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'));
  return {
    bytes: new Uint8Array(await new Response(stream).arrayBuffer()),
    prefix: DEFLATE_PREFIX,
  };
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot read compressed share links');
  }
  const stream = new Blob([bytes.buffer as ArrayBuffer])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
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
