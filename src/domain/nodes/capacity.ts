import type { SimulationNode } from '../simulation/graph';

/**
 * The capacity a component advertises to the rest of the system, in req/s.
 *
 * Used by the load balancer (to compare targets), by the bottleneck heuristic
 * and by the cost model, so every kind must answer the question in one place.
 */
export function capacityRpsOf(node: SimulationNode): number {
  switch (node.kind) {
    case 'client':
      return node.config.rps;
    case 'server':
      return node.config.capacityRps * Math.max(1, node.config.instances);
    case 'messageQueue':
      return node.config.deliveryCapacityRps;
    case 'apiGateway':
      return Math.min(node.config.capacityRps, node.config.rateLimitRps);
    case 'loadBalancer':
    case 'cache':
    case 'database':
      return node.config.capacityRps;
  }
}
