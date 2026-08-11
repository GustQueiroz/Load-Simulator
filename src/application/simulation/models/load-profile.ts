import type { ClientConfig } from '@/domain/nodes/config';
import { clamp01 } from '@/lib/math';

export function effectiveClientRps(config: ClientConfig, elapsedSeconds: number): number {
  const base = Math.max(0, config.rps);

  switch (config.trafficMode) {
    case 'constant':
      return base;

    case 'ramp': {
      const duration = Math.max(0.001, config.rampDurationSeconds);
      const start = Math.max(0, config.rampStartRps);
      const progress = clamp01(elapsedSeconds / duration);
      return start + (base - start) * progress;
    }

    case 'spike': {
      const at = Math.max(0, config.spikeAtSeconds);
      const width = Math.max(0, config.spikeWidthSeconds);
      const peak = Math.max(0, config.spikePeakRps);
      if (width <= 0) return base;
      const inSpike = elapsedSeconds >= at && elapsedSeconds < at + width;
      return inSpike ? peak : base;
    }
  }
}
