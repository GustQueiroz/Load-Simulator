'use client';

import {
  BookOpen,
  Download,
  FilePlus2,
  Link2,
  ListChecks,
  Maximize2,
  MonitorPlay,
  MoreHorizontal,
  Pause,
  Play,
  Presentation,
  RotateCcw,
  Upload,
} from 'lucide-react';

import { buildShareUrl } from '@/application/serialization/share-url';
import { Button } from '@/components/ui/Button';
import { Menu } from '@/components/ui/Menu';
import { LessonPicker } from '@/features/onboarding/LessonPicker';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';
import { useT } from '@/i18n/I18nProvider';
import { statusKey, statusLegendKey } from '@/i18n/keys';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { notify } from '@/infrastructure/store/toast-store';
import { formatClock } from '@/lib/format';

import { STATUS_COLOR } from '../diagram/nodes/node-theme';
import { LocaleSwitcher } from './LocaleSwitcher';
import { useProjectFiles } from './useProjectFiles';

export function Toolbar() {
  const t = useT();
  const status = useSimulatorStore((state) => state.status);
  const elapsedSeconds = useSimulatorStore((state) => state.elapsedSeconds);
  const name = useSimulatorStore((state) => state.name);
  const isDirty = useSimulatorStore((state) => state.isDirty);
  const toggleRunning = useSimulatorStore((state) => state.toggleRunning);
  const reset = useSimulatorStore((state) => state.reset);
  const setName = useSimulatorStore((state) => state.setName);
  const clearDiagram = useSimulatorStore((state) => state.clearDiagram);
  const requestFitView = useSimulatorStore((state) => state.requestFitView);
  const togglePresentationMode = useSimulatorStore((state) => state.togglePresentationMode);
  const openTour = useOnboardingStore((state) => state.openTour);
  const showChecklist = useOnboardingStore((state) => state.showChecklist);

  const { exportProject, importProject } = useProjectFiles();
  const isRunning = status === 'running';

  return (
    <header className="relative z-40 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
      <div className="hidden shrink-0 items-center gap-1.5 pr-1 md:flex">
        <MonitorPlay className="size-4 text-sky-400" aria-hidden />
        <span className="text-sm font-semibold whitespace-nowrap text-ink">{t('app.name')}</span>
      </div>

      <div className="hidden h-6 w-px shrink-0 bg-line md:block" />

      <Button
        variant={isRunning ? 'danger' : 'primary'}
        size="sm"
        icon={isRunning ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        onClick={toggleRunning}
        title={isRunning ? t('toolbar.stopTitle') : t('toolbar.startTitle')}
      >
        {isRunning ? t('toolbar.stop') : t('toolbar.start')}
      </Button>

      <Button
        variant="subtle"
        size="sm"
        icon={<RotateCcw className="size-3.5" />}
        onClick={reset}
        title={t('toolbar.resetTitle')}
        aria-label={t('toolbar.reset')}
      />

      <span
        className="shrink-0 font-mono text-xs text-muted tabular-nums"
        aria-label={t('toolbar.elapsed')}
      >
        {formatClock(elapsedSeconds)}
      </span>

      <div className="h-6 w-px shrink-0 bg-line" />

      <LessonPicker />

      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <input
          aria-label={t('toolbar.diagramName')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-8 min-w-0 max-w-56 flex-1 truncate rounded-lg border border-transparent bg-transparent px-2 text-sm text-ink transition-colors hover:border-line focus-visible:border-sky-400 focus-visible:outline-none"
        />
        {isDirty ? (
          <span className="hidden shrink-0 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300 sm:inline">
            {t('toolbar.unsaved')}
          </span>
        ) : null}
      </div>

      <Button
        variant="subtle"
        size="sm"
        icon={<Presentation className="size-3.5" />}
        onClick={togglePresentationMode}
        title={t('toolbar.presentTitle')}
      >
        <span className="hidden lg:inline">{t('toolbar.present')}</span>
      </Button>

      <Menu
        label={t('toolbar.more')}
        title={t('toolbar.moreTitle')}
        icon={<MoreHorizontal className="size-3.5" />}
        variant="subtle"
        size="sm"
        align="right"
        items={[
          {
            id: 'fit',
            label: t('toolbar.fit'),
            hint: t('toolbar.fitTitle'),
            icon: <Maximize2 />,
            onSelect: requestFitView,
          },
          {
            id: 'new',
            label: t('toolbar.new'),
            hint: t('toolbar.newTitle'),
            icon: <FilePlus2 />,
            onSelect: () => {
              const { isDirty: dirty, nodes } = useSimulatorStore.getState();
              if (dirty && nodes.length > 0 && !window.confirm(t('toolbar.newConfirm'))) return;
              useSimulatorStore.getState().reset();
              clearDiagram();
            },
          },
          {
            id: 'import',
            label: t('toolbar.import'),
            hint: t('toolbar.importTitle'),
            icon: <Upload />,
            onSelect: () => {
              void importProject();
            },
          },
          {
            id: 'export',
            label: t('toolbar.export'),
            hint: t('toolbar.exportTitle'),
            icon: <Download />,
            onSelect: exportProject,
          },
          {
            id: 'share',
            label: t('toolbar.share'),
            hint: t('toolbar.shareTitle'),
            icon: <Link2 />,
            onSelect: () => {
              void (async () => {
                const state = useSimulatorStore.getState();
                if (state.nodes.length === 0) {
                  notify(t('toast.nothingToExport'), 'info');
                  return;
                }
                try {
                  const url = await buildShareUrl({
                    name: state.name,
                    nodes: state.nodes,
                    edges: state.edges,
                    viewport: state.viewport,
                    settings: {
                      cloud: state.cloud,
                      tickMs: state.tickMs,
                      presentationMode: state.presentationMode,
                    },
                    createdAt: state.createdAt,
                    now: new Date().toISOString(),
                  });
                  await navigator.clipboard.writeText(url);
                  notify(t('toast.linkCopied'), 'success');
                } catch {
                  notify(t('toast.linkCopyFailed'), 'error');
                }
              })();
            },
          },
          {
            id: 'tour',
            label: t('toolbar.tour'),
            hint: t('toolbar.tourTitle'),
            icon: <BookOpen />,
            onSelect: openTour,
          },
          {
            id: 'checklist',
            label: t('toolbar.checklist'),
            hint: t('toolbar.checklistTitle'),
            icon: <ListChecks />,
            onSelect: showChecklist,
          },
        ]}
        footer={
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted">{t('toolbar.language')}</span>
              <LocaleSwitcher />
            </div>
            <StatusLegend />
          </div>
        }
      />
    </header>
  );
}

function StatusLegend() {
  const t = useT();
  return (
    <ul className="flex flex-col gap-1.5">
      <li className="pb-0.5 text-[10px] font-semibold tracking-wide text-faint uppercase">
        {t('toolbar.legend')}
      </li>
      {(['normal', 'warning', 'critical'] as const).map((status) => (
        <li
          key={status}
          title={t(statusLegendKey(status))}
          className="flex items-center gap-1.5 text-[11px] text-muted"
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: STATUS_COLOR[status] }}
            aria-hidden
          />
          <span className="truncate">{t(statusKey(status))}</span>
        </li>
      ))}
    </ul>
  );
}
