import { clamp, safeDivide } from '@/lib/math';

/** Anything above this is displayed as ">120 s" instead of a number. */
export const MAX_LATENCY_MS = 120_000;

/**
 * Pedagogical saturation curve: latency starts climbing well before 100%
 * utilization and blows up near saturation, the way real queueing systems
 * behave. It is a teaching approximation, not Erlang-C.
 */
export function saturationMultiplier(utilization: number): number {
  const safe = clamp(utilization, 0, 0.98);
  return 1 + (0.35 * (safe * safe)) / (1 - safe);
}

export function serviceLatencyMs(baseLatencyMs: number, utilization: number): number {
  return Math.max(0, baseLatencyMs) * saturationMultiplier(utilization);
}

/** How long a request arriving now waits behind `backlogCount` items. */
export function queueWaitMs(backlogCount: number, capacityRps: number): number {
  return safeDivide(Math.max(0, backlogCount), capacityRps) * 1000;
}

export function capLatency(valueMs: number): number {
  if (!Number.isFinite(valueMs) || valueMs < 0) return 0;
  return Math.min(valueMs, MAX_LATENCY_MS);
}
