import type { PresetId, PresetVocabulary } from '@/application/presets/presets';
import type { NodeKind } from '@/domain/simulation/node-kind';
import type { LoadStatus } from '@/domain/simulation/status';

import type { Translate } from './I18nProvider';

/**
 * Typed bridges between domain enums and message keys.
 *
 * Template literal types keep these honest: if a kind, status or preset is
 * added without its message, the build fails at the call site instead of
 * rendering a raw key to the audience.
 */
export const kindKey = (kind: NodeKind) => `kind.${kind}` as const;
export const kindBlurbKey = (kind: NodeKind) => `kind.${kind}.blurb` as const;
export const statusKey = (status: LoadStatus) => `status.${status}` as const;
export const statusLegendKey = (status: 'normal' | 'warning' | 'critical') =>
  `legend.${status}` as const;
export const presetNameKey = (id: PresetId) => `preset.${id}.name` as const;
export const presetDescriptionKey = (id: PresetId) => `preset.${id}.description` as const;

/** Localized node names a preset uses to label the components it creates. */
export function presetVocabulary(t: Translate): PresetVocabulary {
  return {
    client: t('kind.client'),
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
