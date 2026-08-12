'use client';

import { useReactFlow } from '@xyflow/react';
import { PanelLeftClose, Shapes } from 'lucide-react';
import { useState, useSyncExternalStore, type DragEvent } from 'react';

import type { NodeKind } from '@/domain/simulation/node-kind';
import { useT } from '@/i18n/I18nProvider';
import { kindBlurbKey, kindKey } from '@/i18n/keys';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';

import { KIND_THEME, PALETTE_ORDER } from './nodes/node-theme';

export const PALETTE_DRAG_TYPE = 'application/x-simulator-node';

/** Below this the palette would cover the diagram, so it starts collapsed. */
const COMPACT_VIEWPORT = 768;

const COMPACT_QUERY = `(max-width: ${COMPACT_VIEWPORT - 1}px)`;

function subscribeToCompact(onChange: () => void): () => void {
  const media = window.matchMedia(COMPACT_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** Static HTML is built for the desktop layout, so the server snapshot is false. */
function useIsCompactViewport(): boolean {
  return useSyncExternalStore(
    subscribeToCompact,
    () => window.matchMedia(COMPACT_QUERY).matches,
    () => false,
  );
}

export function ComponentPalette() {
  const t = useT();
  const addNode = useSimulatorStore((state) => state.addNode);
  const { screenToFlowPosition } = useReactFlow();

  const compact = useIsCompactViewport();
  // Collapsed by default on a phone, where it would cover the diagram —
  // until the learner says otherwise, and then their choice sticks.
  const [override, setOverride] = useState<boolean | null>(null);
  const open = override ?? !compact;
  const setOpen = setOverride;

  const addAtViewportCenter = (kind: NodeKind) => {
    const bounds = document.querySelector('.react-flow')?.getBoundingClientRect();
    const position = screenToFlowPosition({
      x: (bounds?.left ?? 0) + (bounds?.width ?? 800) / 2,
      y: (bounds?.top ?? 0) + (bounds?.height ?? 600) / 3,
    });
    addNode(kind, position, t(kindKey(kind)));
    if (compact) setOpen(false);
  };

  const onDragStart = (event: DragEvent<HTMLButtonElement>, kind: NodeKind) => {
    event.dataTransfer.setData(PALETTE_DRAG_TYPE, kind);
    event.dataTransfer.effectAllowed = 'move';
  };

  if (!open) {
    return (
      <button
        type="button"
        data-lesson-keepout="palette"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        aria-label={t('palette.open')}
        title={t('palette.open')}
        className="grid size-9 place-items-center rounded-xl border border-line bg-panel/95 text-muted shadow-xl backdrop-blur transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
      >
        <Shapes className="size-4" aria-hidden />
      </button>
    );
  }

  return (
    <aside
      data-lesson-keepout="palette"
      className="w-[152px] rounded-xl border border-line bg-panel/95 p-1.5 shadow-xl backdrop-blur md:w-[184px] md:p-2"
    >
      <div className="flex items-center justify-between gap-1 pb-1 md:pb-2">
        <h2 className="hidden px-1 text-[11px] font-semibold tracking-wider text-faint uppercase md:block">
          {t('palette.title')}
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-expanded
          aria-label={t('palette.close')}
          title={t('palette.close')}
          className="ml-auto grid size-6 place-items-center rounded-md text-faint transition-colors hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          <PanelLeftClose className="size-3.5" aria-hidden />
        </button>
      </div>
      <ul className="space-y-1">
        {PALETTE_ORDER.map((kind) => {
          const theme = KIND_THEME[kind];
          const Icon = theme.icon;
          return (
            <li key={kind}>
              <button
                type="button"
                draggable
                title={t(kindBlurbKey(kind))}
                onDragStart={(event) => onDragStart(event, kind)}
                onClick={() => addAtViewportCenter(kind)}
                className="flex w-full cursor-grab items-center gap-1.5 rounded-lg border border-transparent bg-raised px-1.5 py-1.5 text-left text-[11px] font-medium text-ink transition-colors hover:border-line hover:bg-[#22314b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 active:cursor-grabbing md:gap-2 md:px-2 md:text-xs"
                style={{ borderLeft: `3px solid ${theme.accent}` }}
              >
                <Icon className="size-3.5 shrink-0" style={{ color: theme.accent }} aria-hidden />
                <span className="truncate">{t(kindKey(kind))}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="hidden px-1 pt-2 text-[10px] leading-snug text-faint md:block">
        {t('palette.hint')}
      </p>
    </aside>
  );
}
