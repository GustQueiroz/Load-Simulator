export type ClassValue = string | number | false | null | undefined;

/** Minimal class joiner — no dependency needed for what we do here. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
