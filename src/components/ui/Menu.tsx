'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/cn';

import { Button } from './Button';

export interface MenuItem {
  id: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
}

export interface MenuProps {
  label: string;
  title?: string;
  icon?: ReactNode;
  items: readonly MenuItem[];
  /** Optional block rendered below the items (legend, language, …). */
  footer?: ReactNode;
  align?: 'left' | 'right';
  variant?: 'subtle' | 'ghost';
  size?: 'sm' | 'md';
}

/** Lightweight dropdown — no portal, closes on outside click / Escape. */
export function Menu({
  label,
  title,
  icon,
  items,
  footer,
  align = 'right',
  variant = 'ghost',
  size = 'sm',
}: MenuProps) {
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

  return (
    <div ref={rootRef} className="relative shrink-0">
      <Button
        variant={variant}
        size={size}
        icon={icon}
        title={title ?? label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </Button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute top-[calc(100%+6px)] z-[100] min-w-52 overflow-hidden rounded-xl border border-line bg-panel py-1 shadow-xl shadow-black/40',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              title={item.hint}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors',
                item.danger
                  ? 'text-rose-300 hover:bg-rose-500/10'
                  : 'text-ink hover:bg-raised',
              )}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.icon ? (
                <span className="text-faint [&_svg]:size-3.5">{item.icon}</span>
              ) : null}
              <span className="flex-1">{item.label}</span>
            </button>
          ))}

          {footer ? (
            <div className="mt-1 border-t border-line/80 px-3 py-2.5">{footer}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
