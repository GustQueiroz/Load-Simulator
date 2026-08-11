import { clamp01 } from '@/lib/math';
import { statusFromUtilization } from '@/domain/simulation/status';

import { BROADCAST, type SimulatorFor } from '../types';

export const buttonSimulator: SimulatorFor<'button'> = {
  simulate(config, runtime, _input, context) {
    const dt = Math.max(context.dtSeconds, 1e-6);
    const tickMs = dt * 1000;
    const failureRate = clamp01(config.baseFailureRate);
    const localLatencyMs = Math.max(0, config.baseLatencyMs);

    let pending = Math.max(0, runtime.pendingCount);
    let cooldown = Math.max(0, runtime.cooldownRemainingMs);
    let queuedClicks = Math.max(0, runtime.queuedClicks);
    let rejectedClicks = 0;

    while (queuedClicks > 0) {
      if (cooldown > 0) {
        rejectedClicks += queuedClicks;
        queuedClicks = 0;
        break;
      }
      pending += Math.max(0, config.requestsPerClick);
      cooldown = Math.max(0, config.cooldownMs);
      queuedClicks -= 1;
    }

    if (config.automatorRps > 0) {
      pending += config.automatorRps * dt;
    }

    const maxPending = Math.max(0, config.maxPending);
    let shedCount = 0;
    if (pending > maxPending) {
      shedCount = pending - maxPending;
      pending = maxPending;
    }

    const rateCap =
      config.rateLimitRps > 0 ? config.rateLimitRps * dt : Number.POSITIVE_INFINITY;
    const emitCount = Math.min(pending, rateCap);
    pending -= emitCount;

    const generatedRps = emitCount / dt;
    const throttledRps = shedCount / dt;
    const failedRps = generatedRps * failureRate + throttledRps;
    const sentRps = generatedRps - generatedRps * failureRate;
    const droppedRps = throttledRps;

    cooldown = Math.max(0, cooldown - tickMs);

    const utilization =
      config.rateLimitRps > 0 ? generatedRps / Math.max(config.rateLimitRps, 1e-6) : 0;

    return {
      metrics: {
        incomingRps: generatedRps,
        processedRps: generatedRps,
        outgoingRps: sentRps,
        failedRps,
        droppedRps,
        throttledRps: throttledRps + rejectedClicks / dt,
        utilization,
        status:
          sentRps > 0
            ? config.rateLimitRps > 0
              ? statusFromUtilization(utilization)
              : 'normal'
            : cooldown > 0
              ? 'warning'
              : 'idle',
        localLatencyMs,
        totalLatencyMs: localLatencyMs,
        queueDepth: pending,
        cooldownRemainingMs: cooldown,
        pendingCount: pending,
      },
      outputs: [
        {
          rps: sentRps,
          latencyMs: localLatencyMs,
          failureRate,
          routing: BROADCAST,
        },
      ],
      runtimePatch: {
        pendingCount: pending,
        cooldownRemainingMs: cooldown,
        queuedClicks: 0,
      },
    };
  },
};
