import type { AnyNodeConfig } from '@/domain/nodes/config';
import type { AnyNodeRuntime } from '@/domain/nodes/runtime';
import type { SimulationNode } from '@/domain/simulation/graph';
import type { NodeKind } from '@/domain/simulation/node-kind';
import type { SimulationInput } from '@/domain/simulation/traffic';

import { apiGatewaySimulator } from './simulators/api-gateway.simulator';
import { buttonSimulator } from './simulators/button.simulator';
import { cacheSimulator } from './simulators/cache.simulator';
import { clientSimulator } from './simulators/client.simulator';
import { databaseSimulator } from './simulators/database.simulator';
import { loadBalancerSimulator } from './simulators/load-balancer.simulator';
import { messageQueueSimulator } from './simulators/message-queue.simulator';
import { serverSimulator } from './simulators/server.simulator';
import type { ComponentSimulator, SimulationContext, SimulationOutput, SimulatorFor } from './types';

export const SIMULATORS: { [K in NodeKind]: SimulatorFor<K> } = {
  client: clientSimulator,
  button: buttonSimulator,
  loadBalancer: loadBalancerSimulator,
  apiGateway: apiGatewaySimulator,
  server: serverSimulator,
  cache: cacheSimulator,
  messageQueue: messageQueueSimulator,
  database: databaseSimulator,
};

type ErasedSimulator = ComponentSimulator<AnyNodeConfig, AnyNodeRuntime>;

export function simulateNode(
  node: SimulationNode,
  runtime: AnyNodeRuntime,
  input: SimulationInput,
  context: SimulationContext,
): SimulationOutput<AnyNodeRuntime> {
  const simulator = SIMULATORS[node.kind] as ErasedSimulator;
  return simulator.simulate(node.config, runtime, input, context);
}
