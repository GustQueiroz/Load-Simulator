/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SelectField, SliderField, ToggleField } from '@/components/ui/fields';

import { renderWithI18n } from './test-utils';

describe('SelectField', () => {
  it('renders option labels and reports changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SelectField
        label="Perfil"
        value="constant"
        options={[
          { value: 'constant', label: 'Constante' },
          { value: 'ramp', label: 'Rampa' },
          { value: 'spike', label: 'Spike' },
        ]}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Perfil' })).toHaveDisplayValue('Constante');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Perfil' }), 'spike');
    expect(onChange).toHaveBeenCalledWith('spike');
  });
});

describe('ToggleField', () => {
  it('toggles the checked state', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ToggleField label="Auth" checked={false} onChange={onChange} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('SliderField', () => {
  it('exposes an editable value control', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderWithI18n(
      <SliderField label="Throughput" min={0} max={100} step={1} value={10} onChange={onChange} />,
    );

    await user.click(screen.getByRole('button', { name: /Throughput: 10/ }));
    const input = screen.getByRole('textbox', { name: 'Throughput (valor)' });
    await user.clear(input);
    await user.type(input, '42');
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith(42);
  });
});
