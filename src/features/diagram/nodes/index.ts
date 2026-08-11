import type { NodeTypes } from '@xyflow/react';

import { ApiGatewayNode } from './ApiGatewayNode';
import { CacheNode } from './CacheNode';
import { ClientNode } from './ClientNode';
import { DatabaseNode } from './DatabaseNode';
import { LoadBalancerNode } from './LoadBalancerNode';
import { MessageQueueNode } from './MessageQueueNode';
import { ServerNode } from './ServerNode';

/**
 * Defined once at module scope. Recreating this object on every render makes
 * React Flow remount every node — one of the classic ways this kind of canvas
 * starts to feel broken.
 */
export const NODE_TYPES: NodeTypes = {
  client: ClientNode,
  loadBalancer: LoadBalancerNode,
  apiGateway: ApiGatewayNode,
  server: ServerNode,
  cache: CacheNode,
  messageQueue: MessageQueueNode,
  database: DatabaseNode,
};
