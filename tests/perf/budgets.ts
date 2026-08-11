export const PERF_BUDGETS = {
  tickP95MsClassroom: 4,
  tickP95MsStress: 16,
  commitFrameP95Ms: 8,
  staticJsMiB: 8,
  uiFpsMin: 45,
  uiFrameGapP95Ms: 40,
  uiPlayLatencyP95Ms: 250,
} as const;

export function percentile(sortedAsc: readonly number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const index = Math.min(sortedAsc.length - 1, Math.ceil((p / 100) * sortedAsc.length) - 1);
  return sortedAsc[Math.max(0, index)]!;
}

export function measureMs(iterations: number, runOnce: () => void): number[] {
  const samples: number[] = [];
  for (let i = 0; i < Math.min(5, iterations); i += 1) runOnce();
  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    runOnce();
    samples.push(performance.now() - start);
  }
  return samples.sort((a, b) => a - b);
}
