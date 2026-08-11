'use client';

import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { ToggleField } from '@/components/ui/fields';
import { useT } from '@/i18n/I18nProvider';
import { kindKey } from '@/i18n/keys';
import { useNodeMetrics, useSimulatorStore } from '@/infrastructure/store/simulator-store';

import { explainNode } from './explain';
import { ConfigFields } from './nodes/ConfigFields';
import { FIELD_SPECS } from './nodes/field-specs';
import { KIND_THEME } from './nodes/node-theme';

export function DetailsPanel() {
  const t = useT();
  const selected = useSimulatorStore((state) => state.nodes.find((node) => node.selected));

  if (!selected) {
    return (
      <section className="rounded-xl border border-line bg-panel px-3 py-3">
        <h2 className="text-xs font-semibold text-ink">{t('details.title')}</h2>
        <p className="mt-1 text-[11px] leading-snug text-faint">{t('details.empty')}</p>
      </section>
    );
  }

  return <SelectedNodeDetails key={selected.id} nodeId={selected.id} />;
}

function SelectedNodeDetails({ nodeId }: { nodeId: string }) {
  const t = useT();
  const node = useSimulatorStore((state) => state.nodes.find((item) => item.id === nodeId));
  const updateNodeConfig = useSimulatorStore((state) => state.updateNodeConfig);
  const removeNodes = useSimulatorStore((state) => state.removeNodes);
  const hasFrame = useSimulatorStore((state) => state.tick > 0);
  const metrics = useNodeMetrics(nodeId);

  if (!node) return null;

  const theme = KIND_THEME[node.data.kind];
  const Icon = theme.icon;
  const explanation = hasFrame ? explainNode({ id: node.id, ...node.data }, metrics, t) : [];

  return (
    <section className="rounded-xl border border-line bg-panel">
      <header className="flex items-center gap-2 border-b border-line/70 px-3 py-2.5">
        <span
          className="grid size-6 place-items-center rounded-md"
          style={{ backgroundColor: `${theme.accent}1f`, color: theme.accent }}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-ink">{node.data.config.label}</p>
          <p className="text-[10px] text-faint">{t(kindKey(node.data.kind))}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t('node.remove')}
          onClick={() => removeNodes([node.id])}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </header>

      {explanation.length > 0 ? (
        <div className="border-b border-line/70 px-3 py-2.5">
          <h3 className="pb-1 text-[10px] font-semibold tracking-wider text-faint uppercase">
            {t('details.why')}
          </h3>
          <ul className="space-y-1">
            {explanation.map((line) => (
              <li key={line} className="text-[11px] leading-snug text-muted">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="border-b border-line/70 px-3 py-2">
        <ToggleField
          label={t('details.active')}
          hint={t('details.activeHint')}
          checked={node.data.config.enabled}
          onChange={(enabled) => updateNodeConfig(node.id, { enabled })}
        />
      </div>

      <ConfigFields
        nodeId={node.id}
        config={node.data.config}
        specs={FIELD_SPECS[node.data.kind]}
        accent={theme.accent}
      />
    </section>
  );
}
