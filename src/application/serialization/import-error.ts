export type ImportFailure =
  | { code: 'invalid-json' }
  | { code: 'invalid' }
  | { code: 'newer-version' }
  | { code: 'schema'; path?: string; detail: string }
  | { code: 'unknown-kind'; kind: string }
  | { code: 'no-migration'; from: number; to: number };
