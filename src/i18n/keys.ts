import type { PresetId, PresetVocabulary } from '@/application/presets/presets';
import type { NodeKind } from '@/domain/simulation/node-kind';
import type { LoadStatus } from '@/domain/simulation/status';

import type { Translate } from './I18nProvider';

export const kindKey = (kind: NodeKind) => `kind.${kind}` as const;
export const kindBlurbKey = (kind: NodeKind) => `kind.${kind}.blurb` as const;
export const statusKey = (status: LoadStatus) => `status.${status}` as const;
export const statusLegendKey = (status: 'normal' | 'warning' | 'critical') =>
  `legend.${status}` as const;
export const presetNameKey = (id: PresetId) => `preset.${id}.name` as const;
export const presetDescriptionKey = (id: PresetId) => `preset.${id}.description` as const;

export function presetVocabulary(t: Translate): PresetVocabulary {
  return {
    client: t('kind.client'),
    button: t('kind.button'),
    loadBalancer: t('kind.loadBalancer'),
    apiGateway: t('kind.apiGateway'),
    server: t('kind.server'),
    cache: t('kind.cache'),
    messageQueue: t('kind.messageQueue'),
    database: t('kind.database'),
    producer: t('preset.term.producer'),
    worker: t('preset.term.worker'),
  };
}
