import { clamp01 } from '@/lib/math';

import { BROADCAST, type SimulatorFor } from '../types';
import { effectiveClientRps } from '../models/load-profile';

export const clientSimulator: SimulatorFor<'client'> = {
  simulate(config, _runtime, _input, context) {
    const elapsedSeconds = context.nowMs / 1000;
    const generatedRps = effectiveClientRps(config, elapsedSeconds);
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
