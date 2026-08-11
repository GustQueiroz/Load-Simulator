/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { createDefaultConfig } from '@/domain/nodes/defaults';
import { ConfigFields } from '@/features/diagram/nodes/ConfigFields';
import { fieldsFor } from '@/features/diagram/nodes/field-specs';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';

import { renderWithI18n } from './test-utils';

const CLIENT_ID = 'client-test';

describe('ConfigFields', () => {
  beforeEach(() => {
    useSimulatorStore.setState({
      nodes: [
        {
          id: CLIENT_ID,
          type: 'client',
          position: { x: 0, y: 0 },
          data: {
            kind: 'client',
            config: createDefaultConfig('client', 'Cliente 1'),
          },
        },
      ],
      edges: [],
      past: [],
      future: [],
      isDirty: false,
    });
  });

  it('translates select option labels in pt-BR', () => {
    const config = useSimulatorStore.getState().nodes[0]!.data.config;

    renderWithI18n(
      <ConfigFields
        nodeId={CLIENT_ID}
        kind="client"
        config={config}
        specs={fieldsFor('client')}
        accent="#38bdf8"
      />,
      'pt-BR',
    );

    const select = screen.getByRole('combobox', { name: 'Perfil de carga' });
    expect(select).toHaveDisplayValue('Constante');
    expect(screen.getByRole('option', { name: 'Rampa' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Spike' })).toBeInTheDocument();
  });

  it('translates select option labels in en', () => {
    const config = useSimulatorStore.getState().nodes[0]!.data.config;

    renderWithI18n(
      <ConfigFields
        nodeId={CLIENT_ID}
        kind="client"
        config={config}
        specs={fieldsFor('client')}
        accent="#38bdf8"
      />,
      'en',
    );

    expect(screen.getByRole('combobox', { name: 'Load profile' })).toHaveDisplayValue('Constant');
    expect(screen.getByRole('option', { name: 'Ramp' })).toBeInTheDocument();
  });

  it('writes select changes into the store without casts leaking bad keys', async () => {
    const user = userEvent.setup();
    const config = useSimulatorStore.getState().nodes[0]!.data.config;

    renderWithI18n(
      <ConfigFields
        nodeId={CLIENT_ID}
        kind="client"
        config={config}
        specs={fieldsFor('client')}
        accent="#38bdf8"
      />,
    );

    await user.selectOptions(screen.getByRole('combobox', { name: 'Perfil de carga' }), 'ramp');

    const updated = useSimulatorStore.getState().nodes[0]!.data;
    expect(updated.kind).toBe('client');
    if (updated.kind === 'client') {
      expect(updated.config.trafficMode).toBe('ramp');
    }
  });
});
