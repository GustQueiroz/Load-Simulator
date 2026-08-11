type LessonFrameListener = () => void;

let listener: LessonFrameListener | null = null;

export function bindLessonFrameListener(next: LessonFrameListener | null): void {
  listener = next;
}

export function notifyLessonFrame(): void {
  listener?.();
}
