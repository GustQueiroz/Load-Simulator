'use client';

import { ReactFlowProvider } from '@xyflow/react';

import { CostPanel } from '@/features/cost/CostPanel';
import { DetailsPanel } from '@/features/diagram/DetailsPanel';
import { DiagramCanvas } from '@/features/diagram/DiagramCanvas';
import { BalloonCoach } from '@/features/lessons/BalloonCoach';
import { LessonComplete } from '@/features/lessons/LessonComplete';
import { LessonHud } from '@/features/lessons/LessonHud';
import { useLessonSessionStore } from '@/features/lessons/lesson-session-store';
import { useLessonRunner } from '@/features/lessons/useLessonRunner';
import { MissionBrief } from '@/features/lessons/MissionBrief';
import { WorldMap } from '@/features/lessons/WorldMap';
import { FirstRunTour } from '@/features/onboarding/FirstRunTour';
import { LessonChecklist } from '@/features/onboarding/LessonChecklist';
import { PresentationBar } from '@/features/presentation/PresentationBar';
import { EventLog } from '@/features/simulation/EventLog';
import { SimulationAnnouncer } from '@/features/simulation/SimulationAnnouncer';
import { SystemSummary } from '@/features/simulation/SystemSummary';
import { useSimulationEngine } from '@/features/simulation/useSimulationEngine';
import { I18nProvider, useT, type MessageKey } from '@/i18n/I18nProvider';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';

import { DinDropOverlay, useDinFileDrop } from './DinFileDrop';
import { InspectorDock } from './InspectorDock';
import { Toasts } from './Toasts';
import { Toolbar } from './Toolbar';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useProjectBootstrap } from './useProjectBootstrap';

export function SimulatorPage() {
  return (
    <I18nProvider>
      <SimulatorShell />
    </I18nProvider>
  );
}

function SimulatorShell() {
  useSimulationEngine();
  useProjectBootstrap();
  useKeyboardShortcuts();
  useLessonRunner();
  const { active: dinDropActive } = useDinFileDrop();

  const presenting = useSimulatorStore((state) => state.presentationMode);
  const lessonActive = useLessonSessionStore((state) => state.activeLessonId !== null);

  return (
    <ReactFlowProvider>
      <div className="simulator-shell flex h-full flex-col bg-canvas">
        {presenting ? <PresentationBar /> : <Toolbar />}

        <div className="relative flex min-h-0 flex-1">
          <main className="relative min-w-0 flex-1">
            <DiagramCanvas />
            <LessonHud />
            {!lessonActive ? <LessonChecklist /> : null}
          </main>

          <InspectorDock>
            <SystemSummary />
            <EventLog />
            <CostPanel />
            {!presenting ? <DetailsPanel /> : null}
            {!presenting ? (
              <div className="hidden lg:block">
                <ShortcutsHint />
              </div>
            ) : null}
          </InspectorDock>
        </div>
      </div>

      <DinDropOverlay active={dinDropActive} />
      <FirstRunTour />
      <WorldMap />
      <MissionBrief />
      <BalloonCoach />
      <LessonComplete />
      <SimulationAnnouncer />
      <Toasts />
    </ReactFlowProvider>
  );
}

const SHORTCUTS: readonly { key: string | MessageKey; keyIsMessage?: boolean; label: MessageKey }[] =
  [
    { key: 'shortcuts.key.space', keyIsMessage: true, label: 'shortcuts.startStop' },
    { key: 'R', label: 'shortcuts.reset' },
    { key: 'F', label: 'shortcuts.fit' },
    { key: 'P', label: 'shortcuts.present' },
    { key: 'Tab', label: 'shortcuts.focus' },
    { key: 'Enter', label: 'shortcuts.select' },
    { key: 'shortcuts.key.arrows', keyIsMessage: true, label: 'shortcuts.move' },
    { key: 'C', label: 'shortcuts.link' },
    { key: 'shortcuts.key.delete', keyIsMessage: true, label: 'shortcuts.delete' },
    { key: '⌘/Ctrl + Z', label: 'shortcuts.undo' },
    { key: '⌘/Ctrl + Shift + Z', label: 'shortcuts.redo' },
    { key: '⌘/Ctrl + S', label: 'shortcuts.export' },
  ];

function ShortcutsHint() {
  const t = useT();

  return (
    <section className="rounded-xl border border-line bg-panel px-3 py-2.5">
      <h2 className="pb-1.5 text-[10px] font-semibold tracking-wider text-faint uppercase">
        {t('shortcuts.title')}
      </h2>
      <dl className="space-y-1">
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.label} className="flex items-baseline justify-between gap-2">
            <dt className="rounded border border-line bg-raised px-1.5 py-px font-mono text-[10px] text-muted">
              {shortcut.keyIsMessage ? t(shortcut.key as MessageKey) : shortcut.key}
            </dt>
            <dd className="text-[10.5px] text-faint">{t(shortcut.label)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 border-t border-line/70 pt-2 text-[10px] leading-snug text-faint">
        {t('shortcuts.disclaimer')}
      </p>
    </section>
  );
}
