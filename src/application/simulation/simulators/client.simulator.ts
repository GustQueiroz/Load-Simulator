import { clamp01 } from '@/lib/math';

import { BROADCAST, type SimulatorFor } from '../types';

/**
 * Traffic source. A client has no inbound edges, so its input is ignored:
 * it simply injects the configured rate into the graph every tick.
 *
 * Its own failure rate models requests that never left the client (DNS,
 * connection refused, client-side validation).
 */
export const clientSimulator: SimulatorFor<'client'> = {
  simulate(config) {
    const generatedRps = Math.max(0, config.rps);
    const failureRate = clamp01(config.baseFailureRate);
    const failedRps = generatedRps * failureRate;
    const sentRps = generatedRps - failedRps;
    const localLatencyMs = Math.max(0, config.baseLatencyMs);

    return {
      metrics: {
        incomingRps: generatedRps,
        processedRps: generatedRps,
        outgoingRps: sentRps,
        failedRps,
        droppedRps: 0,
        // A source is never "loaded": it defines the load.
        utilization: 0,
        status: sentRps > 0 ? 'normal' : 'idle',
        localLatencyMs,
        totalLatencyMs: localLatencyMs,
      },
      outputs: [
        {
          rps: sentRps,
          latencyMs: localLatencyMs,
          failureRate,
          routing: BROADCAST,
        },
      ],
    };
  },
};
