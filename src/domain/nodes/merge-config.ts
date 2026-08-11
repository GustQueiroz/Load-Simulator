import type { AnyNodeConfig, SimulatorNodeData } from './config';

export function mergeSimulatorNodeConfig(
  data: SimulatorNodeData,
  patch: Partial<AnyNodeConfig>,
): SimulatorNodeData {
  switch (data.kind) {
    case 'client':
      return { kind: 'client', config: applyPatch(data.config, patch) };
    case 'button':
      return { kind: 'button', config: applyPatch(data.config, patch) };
    case 'loadBalancer':
      return { kind: 'loadBalancer', config: applyPatch(data.config, patch) };
    case 'apiGateway':
      return { kind: 'apiGateway', config: applyPatch(data.config, patch) };
    case 'server':
      return { kind: 'server', config: applyPatch(data.config, patch) };
    case 'cache':
      return { kind: 'cache', config: applyPatch(data.config, patch) };
    case 'messageQueue':
      return { kind: 'messageQueue', config: applyPatch(data.config, patch) };
    case 'database':
      return { kind: 'database', config: applyPatch(data.config, patch) };
  }
}

export function toConfigPatch(
  key: string,
  value: string | number | boolean,
): Partial<AnyNodeConfig> {
  return { [key]: value } as Partial<AnyNodeConfig>;
}

function applyPatch<C extends AnyNodeConfig>(config: C, patch: Partial<AnyNodeConfig>): C {
  const next = { ...config };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (!Object.hasOwn(config, key)) continue;
    Reflect.set(next, key, value);
  }
  return next;
}
