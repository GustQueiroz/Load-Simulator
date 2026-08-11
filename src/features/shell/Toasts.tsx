'use client';

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

import { useT } from '@/i18n/I18nProvider';
import { useToastStore, type ToastTone } from '@/infrastructure/store/toast-store';
import { cn } from '@/lib/cn';

const TONE: Record<ToastTone, { className: string; Icon: typeof Info }> = {
  info: { className: 'border-sky-500/40 text-sky-200', Icon: Info },
  success: { className: 'border-emerald-500/40 text-emerald-200', Icon: CheckCircle2 },
  error: { className: 'border-rose-500/50 text-rose-200', Icon: AlertCircle },
};

export function Toasts() {
  const t = useT();
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const { className, Icon } = TONE[toast.tone];
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2 rounded-xl border bg-[#0d1728]/95 px-3 py-2.5 text-xs shadow-xl backdrop-blur',
              className,
            )}
          >
            <Icon className="mt-px size-3.5 shrink-0" aria-hidden />
            <p className="flex-1 leading-snug">{toast.message}</p>
            <button
              type="button"
              aria-label={t('toast.dismiss')}
              className="text-faint transition-colors hover:text-ink"
              onClick={() => dismiss(toast.id)}
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
