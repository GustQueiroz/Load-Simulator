import type { AnyNodeConfig } from '@/domain/nodes/config';
import type { AnyNodeRuntime } from '@/domain/nodes/runtime';
import type { SimulationNode } from '@/domain/simulation/graph';
import type { NodeKind } from '@/domain/simulation/node-kind';
import type { SimulationInput } from '@/domain/simulation/traffic';

import { apiGatewaySimulator } from './simulators/api-gateway.simulator';
import { cacheSimulator } from './simulators/cache.simulator';
import { clientSimulator } from './simulators/client.simulator';
import { databaseSimulator } from './simulators/database.simulator';
import { loadBalancerSimulator } from './simulators/load-balancer.simulator';
import { messageQueueSimulator } from './simulators/message-queue.simulator';
import { serverSimulator } from './simulators/server.simulator';
import type { ComponentSimulator, SimulationContext, SimulationOutput, SimulatorFor } from './types';

/**
 * The only place that knows every component kind. Adding a kind here is the
 * last step of adding it to the engine — the compiler requires the entry.
 */
export const SIMULATORS: { [K in NodeKind]: SimulatorFor<K> } = {
  client: clientSimulator,
  loadBalancer: loadBalancerSimulator,
  apiGateway: apiGatewaySimulator,
  server: serverSimulator,
  cache: cacheSimulator,
  messageQueue: messageQueueSimulator,
  database: databaseSimulator,
};

type ErasedSimulator = ComponentSimulator<AnyNodeConfig, AnyNodeRuntime>;

/**
 * Dispatches to the simulator of `node.kind`.
 *
 * The registry is keyed by kind, so config and runtime always match the
 * simulator — TypeScript just cannot correlate the three unions on its own.
 * This is the single cast in the engine and it is contained here on purpose.
 */
export function simulateNode(
  node: SimulationNode,
  runtime: AnyNodeRuntime,
  input: SimulationInput,
  context: SimulationContext,
): SimulationOutput<AnyNodeRuntime> {
  const simulator = SIMULATORS[node.kind] as ErasedSimulator;
  return simulator.simulate(node.config, runtime, input, context);
}
