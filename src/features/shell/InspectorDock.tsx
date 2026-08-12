'use client';

import { PanelRight, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';

const DESKTOP_MQ = '(min-width: 1024px)';

export function InspectorDock({ children }: { children: ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const sync = () => {
      setDesktop(mq.matches);
      if (mq.matches) setOpen(false);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!open || desktop) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, desktop]);

  return (
    <>
      <button
        type="button"
        className={cn(
          'fixed inset-0 z-40 bg-black/55 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-label={t('inspector.close')}
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />

      <aside
        className={cn(
          'z-50 flex flex-col gap-3 overflow-y-auto overscroll-contain bg-canvas p-3',
          'fixed inset-x-0 bottom-0 max-h-[min(70vh,560px)] rounded-t-2xl border border-line shadow-2xl shadow-black/50 transition-transform duration-200 ease-out',
          'lg:static lg:z-auto lg:h-auto lg:max-h-none lg:w-[308px] lg:shrink-0 lg:translate-y-0 lg:rounded-none lg:border-0 lg:border-l lg:shadow-none lg:transition-none lg:pointer-events-auto',
          open ? 'translate-y-0' : 'pointer-events-none translate-y-full',
        )}
        role="region"
        aria-label={t('inspector.title')}
        aria-hidden={desktop ? undefined : !open}
      >
        <header className="relative -mx-3 -mt-3 flex items-center justify-between border-b border-line/70 px-3 py-2.5 lg:hidden">
          <span className="w-8" aria-hidden />
          <span className="h-1 w-10 rounded-full bg-line" aria-hidden />
          <button
            type="button"
            className="grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            aria-label={t('inspector.close')}
            tabIndex={open ? 0 : -1}
            onClick={() => setOpen(false)}
          >
            <X className="size-3.5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 pb-[max(0.25rem,env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </div>
      </aside>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <Button
          type="button"
          variant="primary"
          size="sm"
          className={cn(
            'pointer-events-auto shadow-xl shadow-black/50 transition-opacity',
            open && 'pointer-events-none opacity-0',
          )}
          icon={<PanelRight className="size-3.5" />}
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          {t('inspector.open')}
        </Button>
      </div>
    </>
  );
}
