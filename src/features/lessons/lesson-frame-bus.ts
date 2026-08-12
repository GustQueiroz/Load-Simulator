type LessonFrameListener = () => void;

/**
 * Fan-out for "the engine produced a frame".
 *
 * A Set rather than a single slot: with one slot, a second subscriber silently
 * evicted the first, and an unmount could clear a listener that a newer mount
 * had already installed. Subscribing returns its own release function.
 */
const listeners = new Set<LessonFrameListener>();

export function bindLessonFrameListener(listener: LessonFrameListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyLessonFrame(): void {
  for (const listener of listeners) listener();
}
