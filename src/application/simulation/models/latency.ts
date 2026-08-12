import { clamp, safeDivide } from '@/lib/math';

export const MAX_LATENCY_MS = 120_000;

export function saturationMultiplier(utilization: number): number {
  const safe = clamp(utilization, 0, 0.98);
  return 1 + (0.35 * (safe * safe)) / (1 - safe);
}

export function serviceLatencyMs(baseLatencyMs: number, utilization: number): number {
  return Math.max(0, baseLatencyMs) * saturationMultiplier(utilization);
}

export function queueWaitMs(backlogCount: number, capacityRps: number): number {
  return safeDivide(Math.max(0, backlogCount), capacityRps) * 1000;
}

/**
 * Service time is modelled as exponential, so the 95th percentile sits at
 * `ln(1/0.05) ≈ 3` times the mean. Queue wait is *not* multiplied: a request
 * arriving behind a known backlog waits roughly that long, tail or not.
 */
export const SERVICE_TAIL_FACTOR = 3;

export function serviceTailLatencyMs(baseLatencyMs: number, utilization: number): number {
  return serviceLatencyMs(baseLatencyMs, utilization) * SERVICE_TAIL_FACTOR;
}

export function capLatency(valueMs: number): number {
  if (!Number.isFinite(valueMs) || valueMs < 0) return 0;
  return Math.min(valueMs, MAX_LATENCY_MS);
}
