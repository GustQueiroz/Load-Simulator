import type { NodeTypes } from '@xyflow/react';

import { ApiGatewayNode } from './ApiGatewayNode';
import { ButtonNode } from './ButtonNode';
import { CacheNode } from './CacheNode';
import { ClientNode } from './ClientNode';
import { DatabaseNode } from './DatabaseNode';
import { LoadBalancerNode } from './LoadBalancerNode';
import { MessageQueueNode } from './MessageQueueNode';
import { ServerNode } from './ServerNode';

export const NODE_TYPES: NodeTypes = {
  client: ClientNode,
  button: ButtonNode,
  loadBalancer: LoadBalancerNode,
  apiGateway: ApiGatewayNode,
  server: ServerNode,
  cache: CacheNode,
  messageQueue: MessageQueueNode,
  database: DatabaseNode,
};
