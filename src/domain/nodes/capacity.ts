import type { SimulationNode } from '../simulation/graph';

export function capacityRpsOf(node: SimulationNode): number {
  switch (node.kind) {
    case 'client':
      return node.config.rps;
    case 'button': {

      const sustained =
        node.config.automatorRps > 0
          ? node.config.automatorRps
          : Math.max(1, node.config.requestsPerClick);
      if (node.config.rateLimitRps > 0) return Math.min(sustained, node.config.rateLimitRps);
      return sustained;
    }
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
