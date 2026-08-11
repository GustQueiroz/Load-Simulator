import type { LoadBalancerConfig, LoadBalancingAlgorithm } from '@/domain/nodes/config';
import { statusFromUtilization } from '@/domain/simulation/status';
import { safeDivide } from '@/lib/math';

import { combineFailureRates, effectiveFailureRate, totalFailedRps } from '../models/failure';
import { capLatency, serviceLatencyMs } from '../models/latency';
import type { SimulationContext, SimulatorFor, TargetView } from '../types';

/**
 * Distributes traffic across healthy targets.
 *
 * In the fluid model we never alternate individual requests: an algorithm is
 * just a way to produce weights, and the flow is split accordingly. Round
 * robin over 3 targets is exactly "one third each".
 */
export const loadBalancerSimulator: SimulatorFor<'loadBalancer'> = {
  simulate(config, _runtime, input, context) {
    const capacityRps = Math.max(0, config.capacityRps);
    const incomingRps = Math.max(0, input.incomingRps);

    const processedRps = Math.min(incomingRps, capacityRps);
    const overflowRps = incomingRps - processedRps;

    const utilization = safeDivide(incomingRps, capacityRps);
    const failureRate = effectiveFailureRate(config.baseFailureRate, utilization);
    const softFailedRps = processedRps * failureRate;
    const distributableRps = processedRps - softFailedRps;

    const healthyTargets = context.targets.filter((target) => target.enabled);
    const weights = distributionWeights(config, healthyTargets, context);
    const totalWeight = Object.values(weights).reduce((total, weight) => total + weight, 0);

    // With nowhere to send it, everything the balancer accepted is discarded.
    const hasDestination = healthyTargets.length > 0 && totalWeight > 0;
    const outgoingRps = hasDestination ? distributableRps : 0;
    const droppedRps = overflowRps + (hasDestination ? 0 : distributableRps);

    const localLatencyMs = serviceLatencyMs(config.baseLatencyMs, utilization);
    const totalLatencyMs = capLatency(input.weightedLatencyMs + localLatencyMs);

    return {
      metrics: {
        incomingRps,
        processedRps,
        outgoingRps,
        failedRps: totalFailedRps(softFailedRps, droppedRps),
        droppedRps,
        utilization,
        status: statusFromUtilization(utilization),
        localLatencyMs,
        totalLatencyMs,
      },
      outputs: hasDestination
        ? [
            {
              rps: outgoingRps,
              latencyMs: totalLatencyMs,
              failureRate: combineFailureRates(input.inheritedFailureRate, failureRate),
              routing: { mode: 'split', weights },
            },
          ]
        : [],
    };
  },
};

type WeightStrategy = (
  targets: readonly TargetView[],
  config: LoadBalancerConfig,
  context: SimulationContext,
) => number[];

const STRATEGIES: Record<LoadBalancingAlgorithm, WeightStrategy> = {
  roundRobin: (targets) => targets.map(() => 1),

  weightedRoundRobin: (targets, config) =>
    targets.map((target) => Math.max(0, config.weights[target.nodeId] ?? 1)),

  // Uses the utilization measured on the previous tick — the balancer reacts
  // to what it observed, exactly like a real least-connections implementation.
  leastLoad: (targets) => targets.map((target) => Math.max(0.05, 1 - target.previousUtilization)),

  // Seeded per node and tick by the engine, so a demo replays identically.
  random: (targets, _config, context) => targets.map(() => 0.25 + context.random()),
};

function distributionWeights(
  config: LoadBalancerConfig,
  targets: readonly TargetView[],
  context: SimulationContext,
): Record<string, number> {
  const raw = STRATEGIES[config.algorithm](targets, config, context);
  const weights: Record<string, number> = {};
  targets.forEach((target, index) => {
    weights[target.nodeId] = Math.max(0, raw[index] ?? 0);
  });
  return weights;
}
