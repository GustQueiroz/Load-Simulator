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
  const selectedEdge = useSimulatorStore((state) => state.edges.find((edge) => edge.selected));

  return (
    <section className="rounded-xl border border-line bg-panel">
      <DiagramOutline />
      {selected ? (
        <SelectedNodeDetails key={selected.id} nodeId={selected.id} />
      ) : selectedEdge ? (
        <SelectedEdgeDetails edgeId={selectedEdge.id} />
      ) : (
        <div className="border-t border-line/70 px-3 py-3">
          <h2 className="text-xs font-semibold text-ink">{t('details.title')}</h2>
          <p className="mt-1 text-[11px] leading-snug text-faint">{t('details.empty')}</p>
        </div>
      )}
    </section>
  );
}

function DiagramOutline() {
  const t = useT();
  const nodes = useSimulatorStore((state) => state.nodes);
  const edges = useSimulatorStore((state) => state.edges);
  const selectNode = useSimulatorStore((state) => state.selectNode);
  const selectEdge = useSimulatorStore((state) => state.selectEdge);

  if (nodes.length === 0) return null;

  return (
    <div className="px-3 py-2.5">
      <h2 className="pb-1.5 text-[10px] font-semibold tracking-wider text-faint uppercase">
        {t('details.outline')}
      </h2>
      <ul role="listbox" aria-label={t('details.outlineNodes')} className="space-y-0.5">
        {nodes.map((node) => (
          <li key={node.id} role="option" aria-selected={Boolean(node.selected)}>
            <button
              type="button"
              className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                node.selected ? 'bg-sky-500/15 text-ink' : 'text-muted hover:bg-raised hover:text-ink'
              }`}
              onClick={() => selectNode(node.id)}
            >
              <span className="truncate font-medium">{node.data.config.label}</span>
              <span className="shrink-0 text-[10px] text-faint">{t(kindKey(node.data.kind))}</span>
            </button>
          </li>
        ))}
      </ul>
      {edges.length > 0 ? (
        <>
          <h3 className="mt-2 pb-1 text-[10px] font-semibold tracking-wider text-faint uppercase">
            {t('details.outlineEdges')}
          </h3>
          <ul role="listbox" aria-label={t('details.outlineEdges')} className="space-y-0.5">
            {edges.map((edge) => {
              const source = nodes.find((node) => node.id === edge.source)?.data.config.label ?? edge.source;
              const target = nodes.find((node) => node.id === edge.target)?.data.config.label ?? edge.target;
              return (
                <li key={edge.id} role="option" aria-selected={Boolean(edge.selected)}>
                  <button
                    type="button"
                    className={`flex w-full truncate rounded-md px-2 py-1 text-left text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                      edge.selected
                        ? 'bg-sky-500/15 text-ink'
                        : 'text-muted hover:bg-raised hover:text-ink'
                    }`}
                    onClick={() => selectEdge(edge.id)}
                  >
                    {source} → {target}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function SelectedEdgeDetails({ edgeId }: { edgeId: string }) {
  const t = useT();
  const edge = useSimulatorStore((state) => state.edges.find((item) => item.id === edgeId));
  const nodes = useSimulatorStore((state) => state.nodes);
  if (!edge) return null;
  const source = nodes.find((node) => node.id === edge.source)?.data.config.label ?? edge.source;
  const target = nodes.find((node) => node.id === edge.target)?.data.config.label ?? edge.target;

  return (
    <div className="border-t border-line/70 px-3 py-3">
      <h2 className="text-xs font-semibold text-ink">{t('details.edgeTitle')}</h2>
      <p className="mt-1 text-[11px] text-muted">
        {source} → {target}
      </p>
    </div>
  );
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
    <div className="border-t border-line/70">
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
    </div>
  );
}
