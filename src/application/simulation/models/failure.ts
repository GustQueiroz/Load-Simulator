import { clamp01 } from '@/lib/math';

export function overloadFailureRate(utilization: number): number {
  if (!Number.isFinite(utilization) || utilization <= 0.8) return 0;
  if (utilization <= 1) return (utilization - 0.8) * 0.25;
  return Math.min(0.99, 0.05 + (utilization - 1) * 0.45);
}

export function combineFailureRates(...rates: readonly number[]): number {
  let survival = 1;
  for (const rate of rates) survival *= 1 - clamp01(rate);
  return clamp01(1 - survival);
}

export function effectiveFailureRate(baseFailureRate: number, utilization: number): number {
  return combineFailureRates(baseFailureRate, overloadFailureRate(utilization));
}

export function totalFailedRps(softFailedRps: number, capacityRejectedRps: number): number {
  return Math.max(0, softFailedRps) + Math.max(0, capacityRejectedRps);
}
