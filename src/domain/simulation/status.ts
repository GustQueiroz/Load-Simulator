

export type LoadStatus = 'idle' | 'normal' | 'warning' | 'critical';

export const LOAD_STATUS_THRESHOLDS = {
  warning: 0.6,
  critical: 0.8,
} as const;

export function statusFromUtilization(utilization: number): LoadStatus {
  if (!Number.isFinite(utilization) || utilization <= 0) return 'idle';
  if (utilization < LOAD_STATUS_THRESHOLDS.warning) return 'normal';
  if (utilization < LOAD_STATUS_THRESHOLDS.critical) return 'warning';
  return 'critical';
}

const SEVERITY: Record<LoadStatus, number> = {
  idle: 0,
  normal: 1,
  warning: 2,
  critical: 3,
};

export function worstStatus(statuses: readonly LoadStatus[]): LoadStatus {
  return statuses.reduce<LoadStatus>(
    (worst, current) => (SEVERITY[current] > SEVERITY[worst] ? current : worst),
    'idle',
  );
}

