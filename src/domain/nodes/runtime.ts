import type { NodeKind } from '../simulation/node-kind';
import type { NodeConfigByKind } from './config';

export interface EmptyRuntime {
  readonly _kind?: never;
}

export interface ServerRuntime {

  backlogCount: number;
}

export interface DatabaseRuntime {
  backlogCount: number;
}

export interface QueueRuntime {
  backlogCount: number;
}

export interface ButtonRuntime {

  pendingCount: number;

  cooldownRemainingMs: number;

  queuedClicks: number;
}

export interface NodeRuntimeByKind {
  client: EmptyRuntime;
  button: ButtonRuntime;
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
  button: () => ({ pendingCount: 0, cooldownRemainingMs: 0, queuedClicks: 0 }),
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
