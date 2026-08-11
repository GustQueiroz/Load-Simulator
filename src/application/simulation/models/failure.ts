import { clamp01 } from '@/lib/math';

/**
 * Errors caused purely by pressure on traffic the component *accepted*.
 *
 * `baseFailureRate = 0` does **not** mean "never fails": overload still
 * produces errors here, and capacity refusals (shed / throttle / full queue)
 * are counted separately as failures by each simulator.
 *
 * Below 80% nothing soft-fails. Between 80% and 100% the curve climbs to 5%.
 * Past capacity it rises quickly and saturates at 99% — a saturated box still
 * answers a tiny fraction so the diagram never goes fully dark.
 */
export function overloadFailureRate(utilization: number): number {
  if (!Number.isFinite(utilization) || utilization <= 0.8) return 0;
  if (utilization <= 1) return (utilization - 0.8) * 0.25;
  return Math.min(0.99, 0.05 + (utilization - 1) * 0.45);
}

/**
 * Probabilities never add up — two independent 50% failure sources leave 25%
 * of requests intact, not 0%.
 */
export function combineFailureRates(...rates: readonly number[]): number {
  let survival = 1;
  for (const rate of rates) survival *= 1 - clamp01(rate);
  return clamp01(1 - survival);
}

export function effectiveFailureRate(baseFailureRate: number, utilization: number): number {
  return combineFailureRates(baseFailureRate, overloadFailureRate(utilization));
}

/**
 * From the caller's point of view a refused request is a failure (503 / 429 /
 * timeout), whether the component "processed" it or shed it at the door.
 */
export function totalFailedRps(softFailedRps: number, capacityRejectedRps: number): number {
  return Math.max(0, softFailedRps) + Math.max(0, capacityRejectedRps);
}
