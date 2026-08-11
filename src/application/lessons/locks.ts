import { isTrafficSource, type NodeKind } from '@/domain/simulation/node-kind';

import type { FieldLock, LessonDefinition, LessonLocks } from './types';
import { TRAFFIC_SOURCE_FIELD_KEYS } from './types';

function lockAllows(lock: FieldLock | undefined, field: string): boolean {
  if (!lock) return false;
  if (lock === '*') return true;
  return lock.includes(field);
}

/** Whether a config field is frozen for the active lesson. */
export function isLessonFieldLocked(
  lesson: LessonDefinition | undefined,
  nodeId: string,
  kind: NodeKind,
  field: string,
): boolean {
  if (!lesson?.locks) return false;
  const locks: LessonLocks = lesson.locks;

  if (locks.trafficSources && isTrafficSource(kind)) {
    if ((TRAFFIC_SOURCE_FIELD_KEYS as readonly string[]).includes(field)) return true;
  }

  if (lockAllows(locks.nodes?.[nodeId], field)) return true;
  if (lockAllows(locks.kinds?.[kind], field)) return true;

  return false;
}
