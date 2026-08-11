'use client';

import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { useId, useRef, useState } from 'react';

import { useT } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';

import { InfoTip } from './InfoTip';

interface FieldFrameProps {
  label: string;
  value?: ReactNode;
  hint?: string;
  children: ReactNode;
  className?: string;
}

function FieldFrame({ label, value, hint, children, className }: FieldFrameProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1 text-[11px] font-medium tracking-wide text-muted uppercase">
          {label}
          {hint ? <InfoTip text={hint} /> : null}
        </span>
        {value !== undefined ? value : null}
      </div>
      {children}
    </div>
  );
}

export interface SliderFieldProps {
  label: string;
  hint?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  accent?: string;
  format?: (value: number) => string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function SliderField({
  label,
  hint,
  min,
  max,
  step = 1,
  value,
  accent = '#38bdf8',
  format,
  onChange,
  disabled = false,
}: SliderFieldProps) {
  const t = useT();
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const cancelCommitRef = useRef(false);
  const editing = draft !== null;
  const progress = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const style = {
    '--range-accent': accent,
    '--range-progress': `${Math.min(100, Math.max(0, progress))}%`,
  } as CSSProperties;

  const commitDraft = (raw: string) => {
    if (cancelCommitRef.current) {
      cancelCommitRef.current = false;
      setDraft(null);
      return;
    }
    setDraft(null);
    const parsed = Number(raw.trim().replace(',', '.'));
    if (!Number.isFinite(parsed)) return;
    onChange(snapToStep(parsed, min, max, step));
  };

  const onValueKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.currentTarget.blur();
      return;
    }
    if (event.key === 'Escape') {
      cancelCommitRef.current = true;
      setDraft(null);
    }
  };

  return (
    <FieldFrame
      label={label}
      hint={hint}
      value={
        editing ? (
          <input
            type="text"
            inputMode="decimal"
            className="nodrag nopan w-24 rounded border border-sky-400/60 bg-[#101c2e] px-1.5 py-0.5 text-right font-mono text-xs text-ink tabular-nums focus:outline-none"
            value={draft}
            aria-label={t('field.valueOf', { label })}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => commitDraft(draft ?? '')}
            onKeyDown={onValueKeyDown}
            onPointerDown={(event) => event.stopPropagation()}
          />
        ) : (
          <button
            type="button"
            className="nodrag nopan rounded px-1 py-0.5 font-mono text-xs text-ink tabular-nums transition-colors hover:bg-white/5 hover:text-sky-200 focus-visible:bg-white/5 focus-visible:text-sky-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-ink"
            title={disabled ? undefined : t('field.editValue')}
            aria-label={t('field.valueClick', { label, value: format ? format(value) : value })}
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              cancelCommitRef.current = false;
              setDraft(String(value));
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {format ? format(value) : value}
          </button>
        )
      }
    >

      <input
        id={id}
        type="range"
        className="nodrag disabled:cursor-not-allowed disabled:opacity-50"
        style={style}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </FieldFrame>
  );
}

function snapToStep(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  if (!Number.isFinite(step) || step <= 0) return clamped;
  const steps = Math.round((clamped - min) / step);
  const snapped = min + steps * step;
  const decimals = countDecimals(step);
  return Math.min(max, Math.max(min, Number(snapped.toFixed(decimals))));
}

function countDecimals(step: number): number {
  if (!Number.isFinite(step) || Number.isInteger(step)) return 0;
  const text = String(step);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

export interface SelectFieldProps<T extends string> {
  label: string;
  hint?: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function SelectField<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
  disabled = false,
}: SelectFieldProps<T>) {
  return (
    <FieldFrame label={label} hint={hint}>
      <select
        className="nodrag h-8 w-full rounded-lg border border-line bg-[#101c2e] px-2 text-xs text-ink transition-colors hover:border-sky-500/40 focus-visible:border-sky-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        value={value}
        aria-label={label}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}

export interface ToggleFieldProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ToggleField({ label, hint, checked, onChange, disabled = false }: ToggleFieldProps) {
  return (
    <label
      className={cn(
        'nodrag flex items-center justify-between gap-2 py-0.5',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      )}
    >
      <span className="flex items-center gap-1 text-[11px] font-medium tracking-wide text-muted uppercase">
        {label}
        {hint ? <InfoTip text={hint} /> : null}
      </span>
      <span className="relative inline-flex">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="h-4.5 w-8 rounded-full bg-[#26364f] transition-colors peer-checked:bg-sky-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-400" />
        <span className="pointer-events-none absolute top-0.5 left-0.5 size-3.5 rounded-full bg-slate-200 transition-transform peer-checked:translate-x-3.5" />
      </span>
    </label>
  );
}
