import { describe, expect, it } from 'vitest';

import { LESSON_IDS, WORLDS } from '@/application/lessons';
import { PRESETS } from '@/application/presets/presets';
import { NODE_KINDS } from '@/domain/simulation/node-kind';
import { en } from '@/i18n/messages/en';
import { ptBR, type MessageKey } from '@/i18n/messages/pt-BR';

const CATALOGUES = { 'pt-BR': ptBR, en } as const;
const keys = Object.keys(ptBR) as MessageKey[];

describe('message catalogues', () => {
  it('declare exactly the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(keys.slice().sort());
  });

  it.each(Object.entries(CATALOGUES))('%s has no empty messages', (_locale, catalogue) => {
    const empty = Object.entries(catalogue).filter(([, value]) => value.trim().length === 0);
    expect(empty).toEqual([]);
  });

  it('use the same placeholders in both languages', () => {
    const placeholders = (text: string) => (text.match(/\{(\w+)\}/g) ?? []).sort();

    for (const key of keys) {
      expect(placeholders(en[key]), key).toEqual(placeholders(ptBR[key]));
    }
  });
});

describe('catalogue coverage', () => {
  it.each(NODE_KINDS)('names and describes "%s"', (kind) => {
    for (const catalogue of Object.values(CATALOGUES)) {
      expect(catalogue[`kind.${kind}`]).toBeTruthy();
      expect(catalogue[`kind.${kind}.blurb`]).toBeTruthy();
    }
  });

  it.each(PRESETS.map((preset) => preset.id))('names and describes the "%s" preset', (id) => {
    for (const catalogue of Object.values(CATALOGUES)) {
      expect(catalogue[`preset.${id}.name`]).toBeTruthy();
      expect(catalogue[`preset.${id}.description`]).toBeTruthy();
    }
  });
});

describe('lesson catalogue coverage', () => {
  it.each([...LESSON_IDS])('names lesson %s', (id) => {
    for (const catalogue of Object.values(CATALOGUES)) {
      expect(catalogue[`lesson.${id}.title` as MessageKey]).toBeTruthy();
      expect(catalogue[`lesson.${id}.goal` as MessageKey]).toBeTruthy();
    }
  });

  it.each(
    [...LESSON_IDS].filter((id) => id.startsWith('2.') || id.startsWith('3.')),
  )('briefs mission lesson %s', (id) => {
    for (const catalogue of Object.values(CATALOGUES)) {
      expect(catalogue[`lesson.${id}.brief.situation` as MessageKey]).toBeTruthy();
      expect(catalogue[`lesson.${id}.brief.objective` as MessageKey]).toBeTruthy();
      expect(catalogue[`lesson.${id}.brief.constraints` as MessageKey]).toBeTruthy();
    }
  });

  it.each([...WORLDS.map((world) => world.id)])('names world %s', (id) => {
    for (const catalogue of Object.values(CATALOGUES)) {
      expect(catalogue[`world.${id}.name` as MessageKey]).toBeTruthy();
      expect(catalogue[`world.${id}.blurb` as MessageKey]).toBeTruthy();
    }
  });
});
