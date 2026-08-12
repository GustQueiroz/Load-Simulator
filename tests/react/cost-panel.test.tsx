/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CostPanel } from '@/features/cost/CostPanel';
import { useLessonSessionStore } from '@/features/lessons/lesson-session-store';
import { ptBR } from '@/i18n/messages/pt-BR';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';

import { renderWithI18n } from './test-utils';

const initialSim = useSimulatorStore.getState();
const initialSession = useLessonSessionStore.getState();

/** A server and a database, both cheap, with traffic flowing through them. */
function seedDiagram(): void {
  const store = useSimulatorStore.getState();
  store.reset();
  store.addNode('server', { x: 0, y: 0 }, 'Servidor 1');
  store.addNode('database', { x: 0, y: 200 }, 'Banco 1');
}

beforeEach(() => {
  useSimulatorStore.setState(initialSim, true);
  useLessonSessionStore.setState(initialSession, true);
  seedDiagram();
});

afterEach(() => {
  useSimulatorStore.setState(initialSim, true);
  useLessonSessionStore.setState(initialSession, true);
});

/**
 * The first currency figure in a row, as a number. Anchored on the currency
 * marker: the traffic row's label carries its own numbers ("1k GB · 12 KB").
 */
function firstAmount(row: HTMLElement | null): number {
  const match = row?.textContent?.match(/(?:US)?\$\s*([\d.,]+)/);
  if (!match) throw new Error(`no amount in ${row?.textContent ?? 'nothing'}`);
  return Number(match[1].replace(/\./g, '').replace(',', '.'));
}

describe('CostPanel', () => {
  it('shows only the total when no mission is active', () => {
    renderWithI18n(<CostPanel />);

    expect(screen.getByText(ptBR['cost.total'])).toBeInTheDocument();
    expect(screen.queryByText(ptBR['cost.budgetLabel'])).not.toBeInTheDocument();
  });

  it('names the figure a mission grades, and it is not the total', () => {
    // 3.3 budgets $200 of infrastructure.
    useLessonSessionStore.getState().beginLesson('3.3');

    renderWithI18n(<CostPanel />);

    expect(screen.getByText(ptBR['cost.budgetLabel'])).toBeInTheDocument();
    expect(screen.getByText(ptBR['cost.budgetHint'])).toBeInTheDocument();
    expect(screen.getByText(/\/\s*US\$\s?200|\/\s*\$200/)).toBeInTheDocument();
  });

  it('excludes egress from the graded figure', () => {
    useSimulatorStore.setState({
      system: { ...useSimulatorStore.getState().system, completedRps: 500 },
    });
    useLessonSessionStore.getState().beginLesson('3.3');

    renderWithI18n(<CostPanel />);

    // With 500 rps of egress the traffic line is worth about $1,000/month.
    // The graded figure has to be strictly smaller than the total by roughly
    // that much — otherwise the row is showing the same number under a new
    // label, which is the confusion it exists to remove.
    const graded = firstAmount(screen.getByText(ptBR['cost.budgetLabel']).parentElement);
    const total = firstAmount(screen.getByText(ptBR['cost.total']).parentElement);
    const traffic = firstAmount(screen.getByText(ptBR['cost.traffic']).parentElement);

    expect(traffic).toBeGreaterThan(500);
    expect(graded).toBeLessThan(total);
    expect(total - graded).toBeCloseTo(traffic, 0);
  });
});
