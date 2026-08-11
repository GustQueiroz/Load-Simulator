import { PRESETS, presetById, type PresetId } from '@/application/presets/presets';
import { useT } from '@/i18n/I18nProvider';
import { presetNameKey, presetVocabulary } from '@/i18n/keys';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';

export function useLoadPreset() {
  const t = useT();

  return (presetId: PresetId = PRESETS[0].id) => {
    const preset = presetById(presetId) ?? PRESETS[0];
    const state = useSimulatorStore.getState();
    state.reset();
    state.loadSnapshot(preset.build(presetVocabulary(t)), t(presetNameKey(preset.id)));
    state.clearHistory();
    state.requestFitView();
  };
}
