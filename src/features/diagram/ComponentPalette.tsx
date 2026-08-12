'use client';

import { useReactFlow } from '@xyflow/react';
import type { DragEvent } from 'react';

import type { NodeKind } from '@/domain/simulation/node-kind';
import { useT } from '@/i18n/I18nProvider';
import { kindBlurbKey, kindKey } from '@/i18n/keys';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';

import { KIND_THEME, PALETTE_ORDER } from './nodes/node-theme';

export const PALETTE_DRAG_TYPE = 'application/x-simulator-node';

export function ComponentPalette() {
  const t = useT();
  const addNode = useSimulatorStore((state) => state.addNode);
  const { screenToFlowPosition } = useReactFlow();

  const addAtViewportCenter = (kind: NodeKind) => {
    const bounds = document.querySelector('.react-flow')?.getBoundingClientRect();
    const position = screenToFlowPosition({
      x: (bounds?.left ?? 0) + (bounds?.width ?? 800) / 2,
      y: (bounds?.top ?? 0) + (bounds?.height ?? 600) / 3,
    });
    addNode(kind, position, t(kindKey(kind)));
  };

  const onDragStart = (event: DragEvent<HTMLButtonElement>, kind: NodeKind) => {
    event.dataTransfer.setData(PALETTE_DRAG_TYPE, kind);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-[152px] rounded-xl border border-line bg-panel/95 p-1.5 shadow-xl backdrop-blur md:w-[184px] md:p-2">
      <h2 className="hidden px-1 pb-2 text-[11px] font-semibold tracking-wider text-faint uppercase md:block">
        {t('palette.title')}
      </h2>
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
      <p className="hidden px-1 pt-2 text-[10px] leading-snug text-faint md:block">{t('palette.hint')}</p>
    </aside>
  );
}
