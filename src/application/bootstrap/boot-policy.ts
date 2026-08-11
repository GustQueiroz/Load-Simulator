export type BootSource =
  | { kind: 'lesson'; lessonId: string }
  | { kind: 'share-diagram' }
  | { kind: 'share-preset'; presetId: string }
  | { kind: 'last-project' }
  | { kind: 'default-preset' };

export interface BootPolicyInput {
  lessonParam: string | null;
  lessonValid: boolean;
  shareKind: 'diagram' | 'preset' | 'none';
  sharePresetId?: string;
  hasLastProject: boolean;
}

export function resolveBootSource(input: BootPolicyInput): BootSource {
  if (input.lessonParam && input.lessonValid) {
    return { kind: 'lesson', lessonId: input.lessonParam };
  }

  if (input.shareKind === 'diagram') {
    return { kind: 'share-diagram' };
  }

  if (input.shareKind === 'preset' && input.sharePresetId) {
    return { kind: 'share-preset', presetId: input.sharePresetId };
  }

  if (input.hasLastProject) {
    return { kind: 'last-project' };
  }

  return { kind: 'default-preset' };
}
