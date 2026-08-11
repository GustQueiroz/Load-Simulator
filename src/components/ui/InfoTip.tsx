'use client';

import { Info } from 'lucide-react';

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group/tip relative inline-flex">
      <button
        type="button"
        tabIndex={0}
        aria-label={text}
        className="nodrag text-faint transition-colors hover:text-sky-300 focus-visible:text-sky-300 focus-visible:outline-none"
      >
        <Info className="size-3" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-50 w-52 -translate-x-1/2 rounded-lg border border-line bg-[#0b1626] p-2 text-[11px] leading-snug font-normal text-muted opacity-0 shadow-xl transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
