'use client';

import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

export function NodeWarning({ children }: { children: ReactNode }) {
  return (
    <p className="mx-3 mb-2 flex items-start gap-1.5 rounded-md bg-amber-500/10 px-2 py-1.5 text-[10.5px] leading-snug text-amber-300">
      <AlertTriangle className="mt-px size-3 shrink-0" aria-hidden />
      {children}
    </p>
  );
}
