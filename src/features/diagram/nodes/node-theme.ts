import {
  Database,
  Inbox,
  Network,
  Server,
  ShieldCheck,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import type { NodeKind } from '@/domain/simulation/node-kind';
import type { LoadStatus } from '@/domain/simulation/status';

export interface KindTheme {
  /** Identity colour of the component type. Status never replaces it. */
  accent: string;
  icon: LucideIcon;
}

export const KIND_THEME: Record<NodeKind, KindTheme> = {
  client: { accent: '#38bdf8', icon: Users },
  loadBalancer: { accent: '#34d399', icon: Network },
  apiGateway: { accent: '#818cf8', icon: ShieldCheck },
  server: { accent: '#a78bfa', icon: Server },
  cache: { accent: '#f472b6', icon: Zap },
  messageQueue: { accent: '#fb923c', icon: Inbox },
  database: { accent: '#fbbf24', icon: Database },
};

export const STATUS_COLOR: Record<LoadStatus, string> = {
  idle: '#64748b',
  normal: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
};

/** Order used by the palette and by the legend. */
export const PALETTE_ORDER: readonly NodeKind[] = [
  'client',
  'loadBalancer',
  'apiGateway',
  'cache',
  'messageQueue',
  'server',
  'database',
];
