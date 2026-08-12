import type {
  HoldTracker,
  LessonDefinition,
  LessonId,
  LessonObservation,
  LessonProgressMap,
  WorldDefinition,
} from './types';
import { stackRows } from '@/domain/diagram/layout';

import { EMPTY_HOLD, LESSON_IDS } from './types';
import { evaluateAll } from './predicates';
import { WORLD_0_LESSONS } from './worlds/world-0';
import { WORLD_1_LESSONS } from './worlds/world-1';
import { WORLD_2_LESSONS } from './worlds/world-2';
import { WORLD_3_LESSONS } from './worlds/world-3';

export const WORLDS: readonly WorldDefinition[] = [
  { id: '0', order: 0, lessonIds: ['0.1', '0.2'] },
  { id: '1', order: 1, lessonIds: ['1.1', '1.2', '1.3', '1.4', '1.5'] },
  { id: '2', order: 2, lessonIds: ['2.1', '2.2', '2.3', '2.4', '2.5'] },
  { id: '3', order: 3, lessonIds: ['3.1', '3.2', '3.3', '3.4'] },
];

/**
 * Rows are compacted centrally so no lesson has to reason about how tall a
 * card becomes once the metrics appear. Authors keep writing `ROWS[n]`.
 */
function withCompactRows(lesson: LessonDefinition): LessonDefinition {
  return {
    ...lesson,
    build: (vocabulary) => {
      const snapshot = lesson.build(vocabulary);
      return { ...snapshot, nodes: stackRows(snapshot.nodes) };
    },
  };
}

export const LESSONS: readonly LessonDefinition[] = [
  ...WORLD_0_LESSONS,
  ...WORLD_1_LESSONS,
  ...WORLD_2_LESSONS,
  ...WORLD_3_LESSONS,
].map(withCompactRows);

const BY_ID = new Map(LESSONS.map((lesson) => [lesson.id, lesson]));

const BY_WORLD: Record<string, readonly LessonDefinition[]> = Object.fromEntries(
  WORLDS.map((world) => [
    world.id,
    LESSONS.filter((lesson) => lesson.worldId === world.id),
  ]),
);

export function isLessonId(value: string): value is LessonId {
  return (LESSON_IDS as readonly string[]).includes(value);
}

export function lessonById(id: string): LessonDefinition | undefined {
  return BY_ID.get(id as LessonId);
}

export function lessonsInWorld(worldId: string): readonly LessonDefinition[] {
  return BY_WORLD[worldId] ?? [];
}

export function isLessonUnlocked(id: LessonId, progress: LessonProgressMap): boolean {
  const index = LESSON_IDS.indexOf(id);
  if (index <= 0) return true;
  const previous = LESSON_IDS[index - 1];
  return Boolean(progress[previous]);
}

export function nextLessonId(id: LessonId): LessonId | null {
  const index = LESSON_IDS.indexOf(id);
  if (index < 0 || index >= LESSON_IDS.length - 1) return null;
  return LESSON_IDS[index + 1] ?? null;
}

export function worldById(id: string): WorldDefinition | undefined {
  return WORLDS.find((world) => world.id === id);
}

export interface LessonEvaluation {
  won: boolean;
  stars: 1 | 2 | 3;
  hold: HoldTracker;
}

/**
 * Grades win and star tiers in a single pass over one observation.
 *
 * They share a tracker on purpose: a `sustained` inside a star tier has to
 * accumulate on every tick, exactly like the win condition. Evaluating the
 * tiers only at the moment of victory would silently treat them as
 * instantaneous.
 */
export function evaluateLesson(
  lesson: LessonDefinition,
  observation: LessonObservation,
  hold: HoldTracker = EMPTY_HOLD,
): LessonEvaluation {
  const { results, hold: nextHold } = evaluateAll(
    [lesson.win, lesson.stars?.three, lesson.stars?.two],
    observation,
    hold,
  );
  const [won, three, two] = results;

  return { won, stars: three ? 3 : two ? 2 : 1, hold: nextHold };
}
