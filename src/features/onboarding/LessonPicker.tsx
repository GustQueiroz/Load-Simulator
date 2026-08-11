'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';

import { PRESETS, type PresetId } from '@/application/presets/presets';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n/I18nProvider';
import { presetDescriptionKey, presetNameKey } from '@/i18n/keys';
import { cn } from '@/lib/cn';

import { useLoadPreset } from './useLoadPreset';

export function LessonPicker({ className }: { className?: string }) {
  const t = useT();
  const loadPreset = useLoadPreset();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const pick = (id: PresetId) => {
    loadPreset(id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn('relative shrink-0', className)}>
      <Button
        variant="subtle"
        size="sm"
        icon={<BookOpen className="size-3.5" />}
        title={t('toolbar.presetsTitle')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="max-w-28 truncate">{t('toolbar.presets')}</span>
        <ChevronDown className="size-3 opacity-60" aria-hidden />
      </Button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t('toolbar.presetsLabel')}
          className="absolute top-full left-0 z-50 mt-1.5 w-[320px] overflow-hidden rounded-xl border border-line bg-panel shadow-2xl shadow-black/50"
        >
          <p className="border-b border-line/70 px-3 py-2 text-[10px] font-semibold tracking-wider text-faint uppercase">
            {t('lessons.title')}
          </p>
          <ul className="max-h-80 overflow-y-auto p-1.5">
            {PRESETS.map((preset) => (
              <li key={preset.id}>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-raised focus-visible:bg-raised focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-400"
                  onClick={() => pick(preset.id)}
                >
                  <span className="text-[12px] font-semibold text-ink">
                    {t(presetNameKey(preset.id))}
                  </span>
                  <span className="text-[10.5px] leading-snug text-muted">
                    {t(presetDescriptionKey(preset.id))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
