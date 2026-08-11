import {
  CLIENT_TRAFFIC_MODES,
  LOAD_BALANCING_ALGORITHMS,
  type ClientTrafficMode,
  type LoadBalancingAlgorithm,
  type NodeConfigByKind,
} from '@/domain/nodes/config';
import type { NodeKind } from '@/domain/simulation/node-kind';
import type { MessageKey } from '@/i18n/messages/pt-BR';
import { formatCompact, formatLatency } from '@/lib/format';

type KeysMatching<T, V> = {
  [P in keyof T]-?: T[P] extends V ? P : never;
}[keyof T] & string;

interface BaseFieldSpec<K extends NodeKind> {
  key: keyof NodeConfigByKind[K] & string;
  labelKey: MessageKey;
  hintKey?: MessageKey;
  primary?: boolean;
}

export interface SliderSpec<K extends NodeKind = NodeKind> extends BaseFieldSpec<K> {
  type: 'slider';
  key: KeysMatching<NodeConfigByKind[K], number>;
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string;
}

export interface PercentSpec<K extends NodeKind = NodeKind> extends BaseFieldSpec<K> {
  type: 'percent';
  key: KeysMatching<NodeConfigByKind[K], number>;
}

export interface SelectSpec<K extends NodeKind = NodeKind> extends BaseFieldSpec<K> {
  type: 'select';
  key: KeysMatching<NodeConfigByKind[K], string>;
  options: readonly { value: string; labelKey: MessageKey }[];
}

export interface ToggleSpec<K extends NodeKind = NodeKind> extends BaseFieldSpec<K> {
  type: 'toggle';
  key: KeysMatching<NodeConfigByKind[K], boolean>;
}

export type FieldSpecOf<K extends NodeKind> =
  | SliderSpec<K>
  | PercentSpec<K>
  | SelectSpec<K>
  | ToggleSpec<K>;

/** Union of every kind-specific spec — safe for the shared ConfigFields renderer. */
export type FieldSpec = { [K in NodeKind]: FieldSpecOf<K> }[NodeKind];

const rps = (value: number) => `${formatCompact(value)} req/s`;
const ms = (value: number) => formatLatency(value);

export const TRAFFIC_MODE_LABEL_KEYS = {
  constant: 'option.traffic.constant',
  ramp: 'option.traffic.ramp',
  spike: 'option.traffic.spike',
} as const satisfies Record<ClientTrafficMode, MessageKey>;

export const ALGORITHM_LABEL_KEYS = {
  roundRobin: 'option.algorithm.roundRobin',
  weightedRoundRobin: 'option.algorithm.weightedRoundRobin',
  leastLoad: 'option.algorithm.leastLoad',
  random: 'option.algorithm.random',
} as const satisfies Record<LoadBalancingAlgorithm, MessageKey>;

function failureField<K extends NodeKind>(): PercentSpec<K> {
  return {
    type: 'percent',
    key: 'baseFailureRate' as KeysMatching<NodeConfigByKind[K], number>,
    labelKey: 'field.injectedFailure',
    hintKey: 'hint.failure',
  };
}

function specs<K extends NodeKind>(_kind: K, fields: readonly FieldSpecOf<K>[]): readonly FieldSpecOf<K>[] {
  return fields;
}

export const FIELD_SPECS: { [K in NodeKind]: readonly FieldSpecOf<K>[] } = {
  client: specs('client', [
    {
      type: 'select',
      key: 'trafficMode',
      labelKey: 'field.trafficMode',
      hintKey: 'hint.trafficMode',
      options: CLIENT_TRAFFIC_MODES.map((value) => ({
        value,
        labelKey: TRAFFIC_MODE_LABEL_KEYS[value],
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
    { ...failureField<'client'>(), primary: true },
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
  ]),

  button: specs('button', [
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
    failureField(),
  ]),

  loadBalancer: specs('loadBalancer', [
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
        labelKey: ALGORITHM_LABEL_KEYS[value],
      })),
      primary: true,
    },
    { ...failureField(), primary: true },
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
  ]),

  apiGateway: specs('apiGateway', [
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
    failureField(),
  ]),

  server: specs('server', [
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
    { ...failureField(), primary: true },
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
  ]),

  cache: specs('cache', [
    {
      type: 'percent',
      key: 'hitRate',
      labelKey: 'field.hitRate',
      hintKey: 'hint.hitRate',
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
    failureField(),
  ]),

  messageQueue: specs('messageQueue', [
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
  ]),

  database: specs('database', [
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
    failureField(),
  ]),
};

export function primaryFields(kind: NodeKind): readonly FieldSpec[] {
  return fieldsFor(kind).filter((spec) => spec.primary);
}

/** Single cast from kind-indexed specs → renderer union. */
export function fieldsFor(kind: NodeKind): readonly FieldSpec[] {
  return FIELD_SPECS[kind] as readonly FieldSpec[];
}

export function readConfigNumber(config: NodeConfigByKind[NodeKind], key: string): number {
  const value = Reflect.get(config, key);
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function readConfigString(config: NodeConfigByKind[NodeKind], key: string): string {
  const value = Reflect.get(config, key);
  return typeof value === 'string' ? value : '';
}

export function readConfigBoolean(config: NodeConfigByKind[NodeKind], key: string): boolean {
  const value = Reflect.get(config, key);
  return typeof value === 'boolean' ? value : false;
}
