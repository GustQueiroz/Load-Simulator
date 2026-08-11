# Adding a component type

Worked example: a **CDN** that serves cached content at the edge and forwards
only what it misses to the origin.

The trick is that you do not need to hunt for the places to change. Add the
kind first and let `tsc --noEmit` list them — every registry is keyed by
`NodeKind`, so the compiler cannot let you half-register a component.

```bash
npm run typecheck    # your to-do list, generated
```

## 1. Declare the kind

`src/domain/simulation/node-kind.ts`

```ts
export const NODE_KINDS = [
  'client',
  // …
  'cdn',
] as const;
```

Everything below is now a compiler error until it is done.

## 2. Configuration

`src/domain/nodes/config.ts`

```ts
export interface CdnConfig extends BaseNodeConfig {
  capacityRps: number;
  hitRate: number;        // 0..1
  edgeLatencyMs: number;
}

export interface NodeConfigByKind {
  // …
  cdn: CdnConfig;
}
```

`BaseNodeConfig` already gives you `label`, `enabled`, `baseLatencyMs` and
`baseFailureRate`.

## 3. Defaults

`src/domain/nodes/defaults.ts` — pedagogical values, not benchmarks. Pick
numbers that make the lesson visible in one drag.

```ts
cdn: {
  enabled: true,
  baseLatencyMs: 0,
  baseFailureRate: 0,
  capacityRps: 100_000,
  hitRate: 0.85,
  edgeLatencyMs: 8,
},
```

## 4. Runtime state (only if it remembers something between ticks)

`src/domain/nodes/runtime.ts`. A CDN is stateless, so:

```ts
cdn: EmptyRuntime;
// …
cdn: () => ({}),
```

Anything with a backlog (server, queue, database) declares a `backlogCount`
here. **Never** put configuration in runtime, or a tick will overwrite what the
user set.

## 5. Advertised capacity

`src/domain/nodes/capacity.ts` — what the load balancer and the cost model ask
for when they need one number.

```ts
case 'cdn':
  return node.config.capacityRps;
```

## 6. The simulator

`src/application/simulation/simulators/cdn.simulator.ts`. Pure function: same
inputs, same outputs, no clock, no DOM.

```ts
export const cdnSimulator: SimulatorFor<'cdn'> = {
  simulate(config, _runtime, input) {
    const capacityRps = Math.max(0, config.capacityRps);
    const incomingRps = Math.max(0, input.incomingRps);

    const processedRps = Math.min(incomingRps, capacityRps);
    const rejectedRps = incomingRps - processedRps;

    const hitRate = clamp01(config.hitRate);
    const hitsRps = processedRps * hitRate;
    const missesRps = processedRps - hitsRps;

    const utilization = safeDivide(incomingRps, capacityRps);
    const failureRate = effectiveFailureRate(config.baseFailureRate, utilization);
    const softFailedRps = processedRps * failureRate;

    const localLatencyMs =
      Math.max(0, config.edgeLatencyMs) * saturationMultiplier(utilization);

    return {
      metrics: {
        incomingRps,
        processedRps,
        outgoingRps: missesRps * (1 - failureRate),
        failedRps: totalFailedRps(softFailedRps, rejectedRps),
        droppedRps: rejectedRps,
        hitsRps,
        missesRps,
        utilization,
        status: statusFromUtilization(utilization),
        localLatencyMs,
        totalLatencyMs: capLatency(input.weightedLatencyMs + localLatencyMs),
      },
      // Only misses continue to the origin.
      outputs: [
        {
          rps: missesRps * (1 - failureRate),
          latencyMs: capLatency(input.weightedLatencyMs + localLatencyMs),
          failureRate: combineFailureRates(input.inheritedFailureRate, failureRate),
          routing: BROADCAST,
        },
      ],
    };
  },
};
```

Reuse the shared models — `effectiveFailureRate`, `saturationMultiplier`,
`stepWorkQueue`, `totalFailedRps` — so the new component fails and slows down
like every other one.

## 7. Register it

`src/application/simulation/registry.ts`

```ts
export const SIMULATORS: { [K in NodeKind]: SimulatorFor<K> } = {
  // …
  cdn: cdnSimulator,
};
```

## 8. Test the lesson, not the arithmetic

`tests/simulation/components.test.ts`

```ts
it('serves most traffic at the edge and only forwards misses', () => {
  const nodes = [
    makeNode('client', 'client', { rps: 10_000 }),
    makeNode('cdn', 'cdn', { hitRate: 0.9 }),
    makeNode('origin', 'server', { capacityRps: 2_000 }),
  ];
  const frame = run(nodes, chain('client', 'cdn', 'origin'));

  expect(metricsOf(frame, 'origin').incomingRps).toBeCloseTo(1_000, 0);
  expect(metricsOf(frame, 'origin').status).toBe('normal');
});
```

At this point the engine is complete and green. The rest is presentation.

## 9. Identity: icon, colour, palette

`src/features/diagram/nodes/node-theme.ts`

```ts
cdn: {
  accent: '#22d3ee',
  icon: Globe,
  labelKey: 'kind.cdn',
  blurbKey: 'kind.cdn.blurb',
},
```

Add it to `PALETTE_ORDER` where it belongs in the mental model — the CDN sits
next to the cache.

## 10. Controls

`src/features/diagram/nodes/field-specs.ts`. Mark two to four as `primary`
(they render on the card); the rest appear only in the details panel.

```ts
cdn: [
  { type: 'percent', key: 'hitRate', labelKey: 'field.hitRate', hintKey: 'hint.hitRate', primary: true },
  { type: 'slider', key: 'capacityRps', labelKey: 'field.capacity', hintKey: 'hint.capacity',
    min: 1_000, max: 1_000_000, step: 1_000, format: rps, primary: true },
],
```

A test asserts every `key` here exists on the matching config, so a typo fails
the build instead of producing a dead slider.

## 11. The card

`src/features/diagram/nodes/CdnNode.tsx` — usually ~20 lines, because
`ComponentNode` already does identity, metrics, controls and the load bar.

```tsx
const rows: MetricRowsBuilder = (metrics, t) => [
  { label: t('metric.incoming'), value: formatRps(metrics.incomingRps) },
  { label: t('metric.hits'), value: formatRps(metrics.hitsRps ?? 0), tone: 'ok' },
  { label: t('metric.misses'), value: formatRps(metrics.missesRps ?? 0), tone: 'warn' },
];

export const CdnNode = memo(function CdnNode({ id, data, selected }: NodeProps<FlowNodeOf<'cdn'>>) {
  return <ComponentNode id={id} kind="cdn" config={data.config} selected={selected} rows={rows} />;
});
```

Register it in `src/features/diagram/nodes/index.ts`.

## 12. Cost

`src/application/cost/profiles.ts` — one entry per provider. Illustrative
orders of magnitude only.

## 13. Strings

`src/i18n/messages/pt-BR.ts` **and** `en.ts`. The English file is typed against
the Portuguese one, so a missing key is a build error.

## 14. Serialization

`src/application/serialization/din.schema.ts` — add the Zod variant to the
discriminated union. Ranges here are the real guard rails: sliders can be
bypassed by a hand-edited file.

```ts
const cdnNode = z.object({
  kind: z.literal('cdn'),
  config: baseConfig.extend({
    capacityRps,
    hitRate: ratio,
    edgeLatencyMs: latencyMs,
  }),
});
```

Adding a **field to an existing** component instead? That is a format change:
bump `DIN_CURRENT_VERSION` and add a migration in
`application/serialization/migrations.ts`, so diagrams saved for last quarter's
presentation still open.

## Done

```bash
npm run verify
```

Typecheck, lint, tests and build. If it passes, the component works in the
canvas, in the details panel, in the cost estimate and in exported files.
