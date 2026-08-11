'use client';

import { Handle, Position } from '@xyflow/react';
import { Copy, Power, Trash2 } from 'lucide-react';
import { memo, useEffect, useRef, useState, type ReactNode } from 'react';

import type { NodeKind } from '@/domain/simulation/node-kind';
import { useT } from '@/i18n/I18nProvider';
import { kindKey } from '@/i18n/keys';
import { useNodeMetrics, useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { cn } from '@/lib/cn';

import { KIND_THEME, STATUS_COLOR } from './node-theme';

export interface NodeShellProps {
  id: string;
  kind: NodeKind;
  label: string;
  enabled: boolean;
  selected?: boolean;
  /** Sources (clients) have no inbound handle. */
  hasInput?: boolean;
  hasOutput?: boolean;
  children: ReactNode;
}

/**
 * Chrome shared by every component card: identity, status ring, rename,
 * handles and the node actions.
 *
 * It subscribes only to the node's *status* so a tick repaints the ring
 * without re-rendering the configuration controls it wraps.
 */
export const NodeShell = memo(function NodeShell({
  id,
  kind,
  label,
  enabled,
  selected,
  hasInput = true,
  hasOutput = true,
  children,
}: NodeShellProps) {
  const t = useT();
  const theme = KIND_THEME[kind];
  const Icon = theme.icon;

  const status = useNodeMetrics(id).status;
  const isBottleneck = useSimulatorStore((state) => state.system.bottleneckNodeId === id);
  const presenting = useSimulatorStore((state) => state.presentationMode);
  const removeNodes = useSimulatorStore((state) => state.removeNodes);
  const duplicateNode = useSimulatorStore((state) => state.duplicateNode);
  const updateNodeConfig = useSimulatorStore((state) => state.updateNodeConfig);

  const [renaming, setRenaming] = useState(false);

  return (
    <div
      className={cn(
        'w-[264px] overflow-hidden rounded-xl border bg-node shadow-lg shadow-black/40 transition-shadow',
        selected ? 'border-sky-400/70 ring-1 ring-sky-400/40' : 'border-line',
        !enabled && 'opacity-55 saturate-0',
        status === 'critical' && enabled && 'node-critical',
      )}
      style={{ borderTopColor: theme.accent, borderTopWidth: 3 }}
    >
      {hasInput ? (
        <Handle type="target" position={Position.Top} isConnectable={!presenting} />
      ) : null}

      <header className="flex items-center gap-2 px-3 pt-2.5 pb-2">
        <span
          className="grid size-6 shrink-0 place-items-center rounded-md"
          style={{ backgroundColor: `${theme.accent}1f`, color: theme.accent }}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>

        {renaming ? (
          <RenameInput
            value={label}
            onDone={(next) => {
              setRenaming(false);
              if (next && next !== label) updateNodeConfig(id, { label: next });
            }}
          />
        ) : (
          // No `nodrag` here on purpose: the title is most of the header, so
          // it has to stay draggable and selectable like the rest of the card.
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-ink"
            title={t('node.rename')}
            onDoubleClick={() => setRenaming(true)}
          >
            {label}
          </button>
        )}

        <span
          className="size-2 shrink-0 rounded-full transition-colors"
          style={{ backgroundColor: STATUS_COLOR[enabled ? status : 'idle'] }}
          aria-hidden
        />

        {!presenting ? (
          <div className="nodrag flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/node:opacity-100">
            <IconAction
              label={enabled ? t('node.disable') : t('node.enable')}
              onClick={() => updateNodeConfig(id, { enabled: !enabled })}
            >
              <Power className="size-3" />
            </IconAction>
            <IconAction label={t('node.duplicate')} onClick={() => duplicateNode(id, t(kindKey(kind)))}>
              <Copy className="size-3" />
            </IconAction>
            <IconAction label={t('node.remove')} danger onClick={() => removeNodes([id])}>
              <Trash2 className="size-3" />
            </IconAction>
          </div>
        ) : null}
      </header>

      {isBottleneck ? (
        <p className="mx-3 mb-2 rounded-md bg-rose-500/10 px-2 py-1 text-[10.5px] font-medium text-rose-300">
          {t('node.bottleneck')}
        </p>
      ) : null}

      {children}

      {hasOutput ? (
        <Handle type="source" position={Position.Bottom} isConnectable={!presenting} />
      ) : null}
    </div>
  );
});

function IconAction({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'grid size-5 place-items-center rounded transition-colors',
        danger
          ? 'text-faint hover:bg-rose-500/15 hover:text-rose-300'
          : 'text-faint hover:bg-white/5 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

function RenameInput({ value, onDone }: { value: string; onDone: (next: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      className="nodrag min-w-0 flex-1 rounded border border-sky-400/60 bg-[#101c2e] px-1.5 py-0.5 text-sm font-semibold text-ink focus:outline-none"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onDone(draft.trim())}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Enter') onDone(draft.trim());
        if (event.key === 'Escape') onDone('');
      }}
      autoFocus
    />
  );
}
