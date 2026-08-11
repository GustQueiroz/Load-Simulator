import type { NodeKind } from '../simulation/node-kind';
import type { NodeConfigByKind } from './config';

/**
 * Runtime state is everything the engine carries *between* ticks. It is kept
 * strictly apart from configuration: a tick may never write into config, and
 * a reset may never touch it.
 */
export interface EmptyRuntime {
  readonly _kind?: never;
}

export interface ServerRuntime {
  /** Waiting requests, in count. */
  backlogCount: number;
}

export interface DatabaseRuntime {
  backlogCount: number;
}

export interface QueueRuntime {
  backlogCount: number;
}

export interface NodeRuntimeByKind {
  client: EmptyRuntime;
  loadBalancer: EmptyRuntime;
  apiGateway: EmptyRuntime;
  server: ServerRuntime;
  cache: EmptyRuntime;
  messageQueue: QueueRuntime;
  database: DatabaseRuntime;
}

export type AnyNodeRuntime = NodeRuntimeByKind[NodeKind];

type RuntimeFactories = {
  [K in NodeKind]: (config: NodeConfigByKind[K]) => NodeRuntimeByKind[K];
};

const FACTORIES: RuntimeFactories = {
  client: () => ({}),
  loadBalancer: () => ({}),
  apiGateway: () => ({}),
  cache: () => ({}),
  server: () => ({ backlogCount: 0 }),
  messageQueue: () => ({ backlogCount: 0 }),
  database: () => ({ backlogCount: 0 }),
};

export function createInitialRuntime<K extends NodeKind>(
  kind: K,
  config: NodeConfigByKind[K],
): NodeRuntimeByKind[K] {
  return FACTORIES[kind](config);
}
