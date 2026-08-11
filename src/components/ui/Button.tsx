'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

type Variant = 'primary' | 'danger' | 'subtle' | 'ghost';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-sky-500 text-slate-950 hover:bg-sky-400 border-sky-400/40',
  danger: 'bg-rose-500/90 text-slate-950 hover:bg-rose-400 border-rose-400/40',
  subtle: 'bg-raised text-ink hover:bg-[#22314b] border-line',
  ghost: 'bg-transparent text-muted hover:text-ink hover:bg-raised border-transparent',
};

const SIZES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function Button({
  variant = 'subtle',
  size = 'md',
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  const iconOnly = icon !== undefined && (children === undefined || children === null || children === false);

  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg border font-medium whitespace-nowrap transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400',
        'disabled:cursor-not-allowed disabled:opacity-40',
        VARIANTS[variant],
        iconOnly ? (size === 'sm' ? 'size-8 p-0' : 'size-9 p-0') : SIZES[size],
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}
