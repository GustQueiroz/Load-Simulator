

export const NODE_KINDS = [
  'client',
  'button',
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

export function isTrafficSource(kind: NodeKind): boolean {
  return kind === 'client' || kind === 'button';
}
