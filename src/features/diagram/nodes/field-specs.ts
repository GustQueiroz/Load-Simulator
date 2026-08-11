import { CLIENT_TRAFFIC_MODES, LOAD_BALANCING_ALGORITHMS } from '@/domain/nodes/config';
import type { NodeKind } from '@/domain/simulation/node-kind';
import type { MessageKey } from '@/i18n/messages/pt-BR';
import { formatCompact, formatLatency } from '@/lib/format';

interface BaseFieldSpec {

  key: string;
  labelKey: MessageKey;
  hintKey?: MessageKey;

  primary?: boolean;
}

export interface SliderSpec extends BaseFieldSpec {
  type: 'slider';
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string;
}

export interface PercentSpec extends BaseFieldSpec {
  type: 'percent';
}

export interface SelectSpec extends BaseFieldSpec {
  type: 'select';
  options: readonly { value: string; label: string }[];
}

export interface ToggleSpec extends BaseFieldSpec {
  type: 'toggle';
}

export type FieldSpec = SliderSpec | PercentSpec | SelectSpec | ToggleSpec;

const rps = (value: number) => `${formatCompact(value)} req/s`;
const ms = (value: number) => formatLatency(value);

export const TRAFFIC_MODE_LABELS: Record<string, string> = {
  constant: 'Constant',
  ramp: 'Ramp',
  spike: 'Spike',
};

export const ALGORITHM_LABELS: Record<string, string> = {
  roundRobin: 'Round Robin',
  weightedRoundRobin: 'Weighted Round Robin',
  leastLoad: 'Least Load',
  random: 'Random',
};

const FAILURE: PercentSpec = {
  type: 'percent',
  key: 'baseFailureRate',
  labelKey: 'field.injectedFailure',
  hintKey: 'hint.failure',
};

export const FIELD_SPECS: Record<NodeKind, readonly FieldSpec[]> = {
  client: [
    {
      type: 'select',
      key: 'trafficMode',
      labelKey: 'field.trafficMode',
      hintKey: 'hint.trafficMode',
      options: CLIENT_TRAFFIC_MODES.map((value) => ({
        value,
        label: TRAFFIC_MODE_LABELS[value],
      })),
      primary: true,
    },
    {
      type: 'slider',
      key: 'rps',
      labelKey: 'field.throughput',
      hintKey: 'hint.clientRps',
      min: 0,
      max: 10_000,
      step: 10,
      format: rps,
      primary: true,
    },
    {
      type: 'slider',
      key: 'rampStartRps',
      labelKey: 'field.rampStart',
      hintKey: 'hint.rampStart',
      min: 0,
      max: 10_000,
      step: 10,
      format: rps,
    },
    {
      type: 'slider',
      key: 'rampDurationSeconds',
      labelKey: 'field.rampDuration',
      hintKey: 'hint.rampDuration',
      min: 1,
      max: 120,
      step: 1,
      format: (value) => `${value}s`,
    },
    {
      type: 'slider',
      key: 'spikePeakRps',
      labelKey: 'field.spikePeak',
      hintKey: 'hint.spikePeak',
      min: 0,
      max: 50_000,
      step: 10,
      format: rps,
    },
    {
      type: 'slider',
      key: 'spikeAtSeconds',
      labelKey: 'field.spikeAt',
      hintKey: 'hint.spikeAt',
      min: 0,
      max: 120,
      step: 1,
      format: (value) => `${value}s`,
    },
    {
      type: 'slider',
      key: 'spikeWidthSeconds',
      labelKey: 'field.spikeWidth',
      hintKey: 'hint.spikeWidth',
      min: 0.5,
      max: 60,
      step: 0.5,
      format: (value) => `${value}s`,
    },
    { ...FAILURE, primary: true },
    {
      type: 'slider',
      key: 'baseLatencyMs',
      labelKey: 'field.baseLatency',
      hintKey: 'hint.latency',
      min: 0,
      max: 2_000,
      step: 1,
      format: ms,
    },
  ],

  button: [
    {
      type: 'slider',
      key: 'requestsPerClick',
      labelKey: 'field.requestsPerClick',
      hintKey: 'hint.requestsPerClick',
      min: 1,
      max: 100,
      step: 1,
      format: formatCompact,
      primary: true,
    },
    {
      type: 'slider',
      key: 'automatorRps',
      labelKey: 'field.automator',
      hintKey: 'hint.automator',
      min: 0,
      max: 100,
      step: 1,
      format: rps,
      primary: true,
    },
    {
      type: 'slider',
      key: 'rateLimitRps',
      labelKey: 'field.rateLimit',
      hintKey: 'hint.buttonRateLimit',
      min: 0,
      max: 1_000,
      step: 1,
      format: rps,
      primary: true,
    },
    {
      type: 'slider',
      key: 'cooldownMs',
      labelKey: 'field.cooldown',
      hintKey: 'hint.cooldown',
      min: 0,
      max: 10_000,
      step: 50,
      format: ms,
      primary: true,
    },
    {
      type: 'slider',
      key: 'maxPending',
      labelKey: 'field.maxPending',
      hintKey: 'hint.maxPending',
      min: 1,
      max: 10_000,
      step: 1,
      format: formatCompact,
    },
    FAILURE,
  ],

  loadBalancer: [
    {
      type: 'slider',
      key: 'capacityRps',
      labelKey: 'field.throughputMax',
      hintKey: 'hint.capacity',
      min: 10,
      max: 100_000,
      step: 10,
      format: rps,
      primary: true,
    },
    {
      type: 'select',
      key: 'algorithm',
      labelKey: 'field.algorithm',
      hintKey: 'hint.algorithm',
      options: LOAD_BALANCING_ALGORITHMS.map((value) => ({
        value,
        label: ALGORITHM_LABELS[value],
      })),
      primary: true,
    },
    { ...FAILURE, primary: true },
    {
      type: 'slider',
      key: 'baseLatencyMs',
      labelKey: 'field.baseLatency',
      hintKey: 'hint.latency',
      min: 0,
      max: 500,
      step: 1,
      format: ms,
    },
  ],

  apiGateway: [
    {
      type: 'slider',
      key: 'rateLimitRps',
      labelKey: 'field.rateLimit',
      hintKey: 'hint.rateLimit',
      min: 0,
      max: 100_000,
      step: 10,
      format: rps,
      primary: true,
    },
    {
      type: 'slider',
      key: 'capacityRps',
      labelKey: 'field.throughputMax',
      hintKey: 'hint.capacity',
      min: 10,
      max: 100_000,
      step: 10,
      format: rps,
      primary: true,
    },
    {
      type: 'toggle',
      key: 'authEnabled',
      labelKey: 'field.auth',
      hintKey: 'hint.auth',
      primary: true,
    },
    {
      type: 'slider',
      key: 'authLatencyMs',
      labelKey: 'field.authLatency',
      hintKey: 'hint.authLatency',
      min: 0,
      max: 1_000,
      step: 1,
      format: ms,
    },
    {
      type: 'slider',
      key: 'baseLatencyMs',
      labelKey: 'field.baseLatency',
      hintKey: 'hint.latency',
      min: 0,
      max: 1_000,
      step: 1,
      format: ms,
    },
    FAILURE,
  ],

  server: [
    {
      type: 'slider',
      key: 'capacityRps',
      labelKey: 'field.throughputPerInstance',
      hintKey: 'hint.capacityPerInstance',
      min: 1,
      max: 5_000,
      step: 1,
      format: rps,
      primary: true,
    },
    {
      type: 'slider',
      key: 'instances',
      labelKey: 'field.instances',
      hintKey: 'hint.instances',
      min: 1,
      max: 20,
      step: 1,
      primary: true,
    },
    {
      type: 'slider',
      key: 'baseLatencyMs',
      labelKey: 'field.baseLatency',
      hintKey: 'hint.latency',
      min: 0,
      max: 2_000,
      step: 1,
      format: ms,
      primary: true,
    },
    { ...FAILURE, primary: true },
    {
      type: 'slider',
      key: 'maxQueueSize',
      labelKey: 'field.queueSize',
      hintKey: 'hint.queueSize',
      min: 0,
      max: 10_000,
      step: 10,
      format: formatCompact,
    },
    {
      type: 'slider',
      key: 'timeoutMs',
      labelKey: 'field.timeout',
      hintKey: 'hint.timeout',
      min: 100,
      max: 30_000,
      step: 100,
      format: ms,
    },
  ],

  cache: [
    { type: 'percent', key: 'hitRate', labelKey: 'field.hitRate', hintKey: 'hint.hitRate', primary: true },
    {
      type: 'slider',
      key: 'capacityRps',
      labelKey: 'field.throughputMax',
      hintKey: 'hint.capacity',
      min: 10,
      max: 100_000,
      step: 10,
      format: rps,
      primary: true,
    },
    {
      type: 'slider',
      key: 'hitLatencyMs',
      labelKey: 'field.hitLatency',
      hintKey: 'hint.hitLatency',
      min: 0,
      max: 200,
      step: 1,
      format: ms,
      primary: true,
    },
    {
      type: 'slider',
      key: 'missOverheadMs',
      labelKey: 'field.missCost',
      hintKey: 'hint.missCost',
      min: 0,
      max: 200,
      step: 1,
      format: ms,
    },
    FAILURE,
  ],

  messageQueue: [
    {
      type: 'slider',
      key: 'deliveryCapacityRps',
      labelKey: 'field.delivery',
      hintKey: 'hint.delivery',
      min: 1,
      max: 100_000,
      step: 10,
      format: (value) => `${formatCompact(value)} msg/s`,
      primary: true,
    },
    {
      type: 'slider',
      key: 'ingressCapacityRps',
      labelKey: 'field.ingress',
      hintKey: 'hint.ingress',
      min: 1,
      max: 100_000,
      step: 10,
      format: (value) => `${formatCompact(value)} msg/s`,
      primary: true,
    },
    {
      type: 'slider',
      key: 'maxBacklog',
      labelKey: 'field.maxBacklog',
      hintKey: 'hint.backlog',
      min: 1_000,
      max: 5_000_000,
      step: 1_000,
      format: formatCompact,
    },
    {
      type: 'slider',
      key: 'baseLatencyMs',
      labelKey: 'field.publishLatency',
      hintKey: 'hint.publishLatency',
      min: 0,
      max: 500,
      step: 1,
      format: ms,
    },
  ],

  database: [
    {
      type: 'slider',
      key: 'capacityRps',
      labelKey: 'field.throughputMax',
      hintKey: 'hint.capacity',
      min: 1,
      max: 10_000,
      step: 1,
      format: (value) => `${formatCompact(value)} ops/s`,
      primary: true,
    },
    {
      type: 'slider',
      key: 'baseLatencyMs',
      labelKey: 'field.queryTime',
      hintKey: 'hint.latency',
      min: 1,
      max: 2_000,
      step: 1,
      format: ms,
      primary: true,
    },
    {
      type: 'slider',
      key: 'maxConnections',
      labelKey: 'field.connections',
      hintKey: 'hint.connections',
      min: 1,
      max: 2_000,
      step: 1,
      format: formatCompact,
      primary: true,
    },
    {
      type: 'slider',
      key: 'maxQueueSize',
      labelKey: 'field.queueSize',
      hintKey: 'hint.queueSize',
      min: 0,
      max: 10_000,
      step: 10,
      format: formatCompact,
    },
    {
      type: 'slider',
      key: 'timeoutMs',
      labelKey: 'field.timeout',
      hintKey: 'hint.timeout',
      min: 100,
      max: 30_000,
      step: 100,
      format: ms,
    },
    FAILURE,
  ],
};

export function primaryFields(kind: NodeKind): readonly FieldSpec[] {
  return FIELD_SPECS[kind].filter((spec) => spec.primary);
}
