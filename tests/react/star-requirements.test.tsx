/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { lessonById } from '@/application/lessons';
import { StarRequirements } from '@/features/lessons/StarRequirements';
import { ptBR } from '@/i18n/messages/pt-BR';

import { renderWithI18n } from './test-utils';

/**
 * Every star-bearing lesson is a mission in worlds 2–3, all of them behind
 * progress gates, so driving one from a browser to see this panel is slow and
 * brittle. Rendering it directly asks the only question that matters: does a
 * learner who fell short get told what the tier wanted?
 */
describe('StarRequirements', () => {
  it('spells out a cost budget the run did not reach', () => {
    const lesson = lessonById('3.3');
    expect(lesson?.stars?.three).toBeDefined();

    renderWithI18n(<StarRequirements lesson={lesson!} tiers={{ two: true, three: false }} />);

    expect(screen.getByText(ptBR['lesson.complete.tiers'])).toBeInTheDocument();
    // 3.3 asks for $170 for two stars and $140 for three.
    expect(screen.getByText(/US\$\s?170|\$170/)).toBeInTheDocument();
    expect(screen.getByText(/US\$\s?140|\$140/)).toBeInTheDocument();
  });

  it('marks the tier that was met and the one that was not', () => {
    const lesson = lessonById('3.3');

    renderWithI18n(<StarRequirements lesson={lesson!} tiers={{ two: true, three: false }} />);

    expect(screen.getByText(ptBR['lesson.complete.tierMet'].replace('{count}', '2'))).toBeInTheDocument();
    expect(
      screen.getByText(ptBR['lesson.complete.tierMissed'].replace('{count}', '3')),
    ).toBeInTheDocument();
  });

  it('renders nothing for a lesson with no star tiers', () => {
    const lesson = lessonById('0.1');
    expect(lesson?.stars).toBeUndefined();

    const { container } = renderWithI18n(
      <StarRequirements lesson={lesson!} tiers={{ two: false, three: false }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('describes a tier built from several conditions', () => {
    const lesson = lessonById('2.2');
    expect(lesson?.stars?.three).toBeDefined();

    renderWithI18n(<StarRequirements lesson={lesson!} tiers={{ two: true, three: true }} />);

    // Whatever the tier asks for, it must read as words rather than as the
    // fallback for a condition nobody wrote a phrase for.
    expect(screen.queryByText(ptBR['clause.opaque'])).not.toBeInTheDocument();
    expect(screen.getByText(ptBR['lesson.complete.tiers'])).toBeInTheDocument();
  });
});
