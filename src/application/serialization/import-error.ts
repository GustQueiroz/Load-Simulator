/**
 * Why an import failed, as data.
 *
 * The application layer states the problem; `src/i18n` decides how to phrase
 * it. Keeping this a discriminated union also means the UI cannot forget a
 * case — the compiler checks the mapping is exhaustive.
 */
export type ImportFailure =
  | { code: 'invalid-json' }
  | { code: 'invalid' }
  | { code: 'newer-version' }
  | { code: 'schema'; path?: string; detail: string }
  | { code: 'unknown-kind'; kind: string }
  | { code: 'no-migration'; from: number; to: number };
