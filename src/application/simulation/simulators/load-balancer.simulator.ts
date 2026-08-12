import type { LoadBalancerConfig, LoadBalancingAlgorithm } from '@/domain/nodes/config';
import { statusFromUtilization } from '@/domain/simulation/status';
import { safeDivide } from '@/lib/math';

import { combineFailureRates, effectiveFailureRate, totalFailedRps } from '../models/failure';
import { capLatency, serviceLatencyMs, serviceTailLatencyMs } from '../models/latency';
import type { SimulationContext, SimulatorFor, TargetView } from '../types';

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

    const hasDestination = healthyTargets.length > 0 && totalWeight > 0;
    const outgoingRps = hasDestination ? distributableRps : 0;
    const droppedRps = overflowRps + (hasDestination ? 0 : distributableRps);

    const localLatencyMs = serviceLatencyMs(config.baseLatencyMs, utilization);
    const localP95Ms = serviceTailLatencyMs(config.baseLatencyMs, utilization);
    const totalLatencyMs = capLatency(input.weightedLatencyMs + localLatencyMs);
    const totalP95Ms = capLatency(input.p95LatencyMs + localP95Ms);

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
        localP95Ms: capLatency(localP95Ms),
        totalLatencyMs,
      },
      outputs: hasDestination
        ? [
            {
              rps: outgoingRps,
              latencyMs: totalLatencyMs,
              p95LatencyMs: totalP95Ms,
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

  leastLoad: (targets) => targets.map((target) => Math.max(0.05, 1 - target.previousUtilization)),

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
