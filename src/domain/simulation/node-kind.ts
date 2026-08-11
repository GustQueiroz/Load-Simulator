/**
 * The set of component kinds the simulator can model.
 *
 * Adding a new kind is intentionally a "widening" operation: every place that
 * must handle it (config, defaults, runtime, simulator, renderer, cost model)
 * is keyed by `NodeKind`, so the compiler points at the gaps.
 */
export const NODE_KINDS = [
  'client',
  'loadBalancer',
  'apiGateway',
  'server',
  'cache',
  'messageQueue',
  'database',
] as const;

export type NodeKind = (typeof NODE_KINDS)[number];

export function isNodeKind(value: unknown): value is NodeKind {
  return typeof value === 'string' && (NODE_KINDS as readonly string[]).includes(value);
}
