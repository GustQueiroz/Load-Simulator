import { describe, expect, it } from 'vitest';

import { HINT_LEVELS, hintKey, LESSONS } from '@/application/lessons';
import { en } from '@/i18n/messages/en';
import { ptBR } from '@/i18n/messages/pt-BR';

const CATALOGUES = { 'pt-BR': ptBR, en } as const;

/**
 * Hints are a mission affordance: a guided lesson walks the learner through it
 * step by step, so the coach balloon is the hint there.
 *
 * Keys are built by concatenation (`lesson.2.1.hint1`), which the type system
 * cannot check, so the invariant lives here instead: every mission has its full
 * ladder in both languages, and no guided lesson carries copy nobody renders.
 */
describe('lesson hints', () => {
  const missions = LESSONS.filter((lesson) => lesson.mode === 'mission');
  const guided = LESSONS.filter((lesson) => lesson.mode !== 'mission');

  it('has both worlds represented, so neither branch is vacuous', () => {
    expect(missions.length).toBeGreaterThan(0);
    expect(guided.length).toBeGreaterThan(0);
  });

  it.each(missions.map((lesson) => lesson.id))('mission %s has a full hint ladder', (id) => {
    for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
      for (let level = 1; level <= HINT_LEVELS; level += 1) {
        const key = hintKey(id, level);
        const text = (catalogue as Record<string, string>)[key];
        expect(text, `${locale} is missing ${key}`).toBeTruthy();
        expect(text.length, `${locale} ${key} is too short to help`).toBeGreaterThan(20);
      }
    }
  });

  it.each(guided.map((lesson) => lesson.id))('guided lesson %s carries no hint copy', (id) => {
    for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
      for (let level = 1; level <= HINT_LEVELS; level += 1) {
        const key = hintKey(id, level);
        expect(
          (catalogue as Record<string, string>)[key],
          `${locale} has ${key}, but guided lessons never render hints`,
        ).toBeUndefined();
      }
    }
  });

  it('clamps the level to the ladder', () => {
    expect(hintKey('2.1', 0)).toBe(hintKey('2.1', 1));
    expect(hintKey('2.1', 99)).toBe(hintKey('2.1', HINT_LEVELS));
  });
});
