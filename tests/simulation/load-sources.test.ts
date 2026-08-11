import { describe, expect, it } from 'vitest';

import { SimulationEngine } from '@/application/simulation/engine';
import { effectiveClientRps } from '@/application/simulation/models/load-profile';
import { detectSimulationEvents } from '@/application/simulation/event-log';
import { createEmptyMetrics } from '@/domain/simulation/metrics';

import { chain, makeNode } from '../support/graph-builder';
import { metricsOf, run } from '../support/run';

describe('client load profile', () => {
  it('holds a constant rate', () => {
    expect(
      effectiveClientRps(
        {
          label: 'c',
          enabled: true,
          baseLatencyMs: 0,
          baseFailureRate: 0,
          rps: 40,
          trafficMode: 'constant',
          rampStartRps: 0,
          rampDurationSeconds: 10,
          spikePeakRps: 400,
          spikeAtSeconds: 5,
          spikeWidthSeconds: 2,
        },
        7,
      ),
    ).toBe(40);
  });

  it('ramps linearly then holds', () => {
    const config = {
      label: 'c',
      enabled: true,
      baseLatencyMs: 0,
      baseFailureRate: 0,
      rps: 100,
      trafficMode: 'ramp' as const,
      rampStartRps: 0,
      rampDurationSeconds: 10,
      spikePeakRps: 500,
      spikeAtSeconds: 5,
      spikeWidthSeconds: 2,
    };
    expect(effectiveClientRps(config, 0)).toBeCloseTo(0, 5);
    expect(effectiveClientRps(config, 5)).toBeCloseTo(50, 5);
    expect(effectiveClientRps(config, 10)).toBeCloseTo(100, 5);
    expect(effectiveClientRps(config, 20)).toBeCloseTo(100, 5);
  });

  it('spikes for a window then returns to base', () => {
    const nodes = [
      makeNode('client', 'client', {
        rps: 10,
        trafficMode: 'spike',
        spikePeakRps: 200,
        spikeAtSeconds: 0.2,
        spikeWidthSeconds: 0.3,
      }),
      makeNode('server', 'server', { capacityRps: 1_000 }),
    ];
    const before = run(nodes, chain('client', 'server'), { ticks: 1 });
    expect(metricsOf(before, 'client').outgoingRps).toBeCloseTo(10, 5);

    const during = run(nodes, chain('client', 'server'), { ticks: 3 });
    expect(metricsOf(during, 'client').outgoingRps).toBeCloseTo(200, 5);

    const after = run(nodes, chain('client', 'server'), { ticks: 8 });
    expect(metricsOf(after, 'client').outgoingRps).toBeCloseTo(10, 5);
  });
});

describe('button', () => {
  it('emits one request as a single-tick pulse when pressed', () => {
    const engine = new SimulationEngine({ tickMs: 100 });
    const nodes = [
      makeNode('btn', 'button', { requestsPerClick: 1, automatorRps: 0, rateLimitRps: 0 }),
      makeNode('server', 'server', { capacityRps: 1_000 }),
    ];
    const edges = chain('btn', 'server');

    engine.pressButton('btn');
    const frame = engine.tick(nodes, edges);
    const button = frame.nodeMetrics.get('btn');
    const server = frame.nodeMetrics.get('server');

    expect(button?.outgoingRps).toBeCloseTo(10, 5);
    expect(server?.incomingRps).toBeCloseTo(10, 5);

    const quiet = engine.tick(nodes, edges);
    expect(quiet.nodeMetrics.get('btn')?.outgoingRps ?? 0).toBeCloseTo(0, 5);
  });

  it('respects cooldown between clicks', () => {
    const engine = new SimulationEngine({ tickMs: 100 });
    const nodes = [
      makeNode('btn', 'button', {
        requestsPerClick: 1,
        cooldownMs: 500,
        automatorRps: 0,
      }),
      makeNode('server', 'server', { capacityRps: 1_000 }),
    ];
    const edges = chain('btn', 'server');

    engine.pressButton('btn');
    const first = engine.tick(nodes, edges);
    expect(first.nodeMetrics.get('btn')?.outgoingRps).toBeGreaterThan(0);

    engine.pressButton('btn');
    const blocked = engine.tick(nodes, edges);
    expect(blocked.nodeMetrics.get('btn')?.outgoingRps ?? 0).toBeCloseTo(0, 5);
  });

  it('automator sustains a configured rate', () => {
    const frame = run(
      [
        makeNode('btn', 'button', { automatorRps: 25, requestsPerClick: 1 }),
        makeNode('server', 'server', { capacityRps: 1_000 }),
      ],
      chain('btn', 'server'),
      { ticks: 5 },
    );
    expect(metricsOf(frame, 'btn').outgoingRps).toBeCloseTo(25, 5);
  });

  it('rate-limits emission and parks the rest as pending', () => {
    const engine = new SimulationEngine({ tickMs: 100 });
    const nodes = [
      makeNode('btn', 'button', {
        requestsPerClick: 20,
        rateLimitRps: 50,
        maxPending: 1_000,
        automatorRps: 0,
      }),
      makeNode('server', 'server', { capacityRps: 1_000 }),
    ];
    const edges = chain('btn', 'server');

    engine.pressButton('btn');
    const frame = engine.tick(nodes, edges);

    expect(frame.nodeMetrics.get('btn')?.outgoingRps).toBeCloseTo(50, 5);
    expect(frame.nodeMetrics.get('btn')?.queueDepth).toBeCloseTo(15, 5);
  });
});

describe('event log', () => {
  it('records a status escalation once', () => {
    const node = makeNode('server', 'server', { capacityRps: 100 });
    const previous = new Map([['server', { ...createEmptyMetrics(), status: 'normal' as const, utilization: 0.5, incomingRps: 50 }]]);
    const current = new Map([
      [
        'server',
        {
          ...createEmptyMetrics(),
          status: 'critical' as const,
          utilization: 1.2,
          incomingRps: 120,
        },
      ],
    ]);

    const events = detectSimulationEvents({
      tick: 12,
      atSeconds: 1.2,
      previousSeconds: 1.1,
      nodes: [node],
      previous,
      current,
    });

    expect(events.map((event) => event.code)).toContain('status.critical');
  });
});
