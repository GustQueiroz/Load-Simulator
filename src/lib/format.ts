import { DEFAULT_LOCALE, type Locale } from '@/i18n/locale';

let activeLocale: Locale = DEFAULT_LOCALE;

export function setFormatLocale(locale: Locale): void {
  activeLocale = locale;
}

const MAX_DISPLAY_LATENCY_MS = 120_000;

const numberFormatters = new Map<string, Intl.NumberFormat>();

function num(value: number, maximumFractionDigits = 0): string {
  const cacheKey = `${activeLocale}:${maximumFractionDigits}`;
  let formatter = numberFormatters.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(activeLocale, { maximumFractionDigits });
    numberFormatters.set(cacheKey, formatter);
  }
  return formatter.format(value);
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${num(value / 1_000_000, 1)}M`;
  if (abs >= 1_000) return `${num(value / 1_000, 1)}k`;
  if (abs >= 100) return num(value);
  if (abs >= 10) return num(value, 1);
  if (abs === 0) return '0';
  return num(value, abs < 1 ? 2 : 1);
}

export function formatRps(value: number): string {
  return `${formatCompact(value)}/s`;
}

export function formatCount(value: number): string {
  return formatCompact(value);
}

export function formatLatency(valueMs: number): string {
  if (!Number.isFinite(valueMs) || valueMs <= 0) return '0 ms';
  if (valueMs > MAX_DISPLAY_LATENCY_MS) return '>120 s';
  if (valueMs >= 10_000) return `${num(valueMs / 1000)} s`;
  if (valueMs >= 1_000) return `${num(valueMs / 1000, 1)} s`;
  if (valueMs >= 10) return `${num(valueMs)} ms`;
  return `${num(valueMs, 1)} ms`;
}

export function formatSeconds(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 s';
  if (value >= 3600) return `${num(value / 3600, 1)} h`;
  if (value >= 60) return `${num(value / 60, 1)} min`;
  return `${num(value, value < 10 ? 1 : 0)} s`;
}

export function formatPercent(ratio: number, decimals = 0): string {
  if (!Number.isFinite(ratio)) return '0%';
  return `${num(ratio * 100, decimals)}%`;
}

const currencyFormatters = new Map<string, Intl.NumberFormat>();

export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) value = 0;
  const decimals = value >= 100 ? 0 : 2;
  const cacheKey = `${activeLocale}:${decimals}`;
  let formatter = currencyFormatters.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(activeLocale, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    });
    currencyFormatters.set(cacheKey, formatter);
  }
  return formatter.format(value);
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
