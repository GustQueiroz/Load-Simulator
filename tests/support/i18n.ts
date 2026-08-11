import type { PresetId, PresetVocabulary } from '@/application/presets/presets';
import { ptBR } from '@/i18n/messages/pt-BR';

export const TEST_VOCABULARY: PresetVocabulary = {
  client: ptBR['kind.client'],
  button: ptBR['kind.button'],
  loadBalancer: ptBR['kind.loadBalancer'],
  apiGateway: ptBR['kind.apiGateway'],
  server: ptBR['kind.server'],
  cache: ptBR['kind.cache'],
  messageQueue: ptBR['kind.messageQueue'],
  database: ptBR['kind.database'],
  producer: ptBR['preset.term.producer'],
  worker: ptBR['preset.term.worker'],
};

export function presetName(id: PresetId): string {
  return ptBR[`preset.${id}.name`];
}
