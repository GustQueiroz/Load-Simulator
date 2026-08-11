'use client';

import { useEffect, useRef, useState } from 'react';
import { FileUp } from 'lucide-react';

import { useT } from '@/i18n/I18nProvider';
import { notify } from '@/infrastructure/store/toast-store';

import { isDinLikeFile, useProjectFiles } from './useProjectFiles';

function dataTransferHasFiles(transfer: DataTransfer | null): boolean {
  if (!transfer) return false;
  return Array.from(transfer.types).includes('Files');
}

export function useDinFileDrop(): { active: boolean } {
  const t = useT();
  const { importDinFile } = useProjectFiles();
  const [active, setActive] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    const onDragEnter = (event: DragEvent) => {
      if (!dataTransferHasFiles(event.dataTransfer)) return;
      event.preventDefault();
      depth.current += 1;
      setActive(true);
    };

    const onDragOver = (event: DragEvent) => {
      if (!dataTransferHasFiles(event.dataTransfer)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };

    const onDragLeave = (event: DragEvent) => {
      if (!dataTransferHasFiles(event.dataTransfer)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setActive(false);
    };

    const onDrop = (event: DragEvent) => {
      if (!dataTransferHasFiles(event.dataTransfer)) return;
      event.preventDefault();
      depth.current = 0;
      setActive(false);

      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      if (!isDinLikeFile(file)) {
        notify(t('toast.dropUnsupported'), 'info');
        return;
      }
      void importDinFile(file);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [importDinFile, t]);

  return { active };
}

export function DinDropOverlay({ active }: { active: boolean }) {
  const t = useT();
  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-sky-950/70 p-6 backdrop-blur-[2px]">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-sky-400/70 bg-panel/95 px-8 py-7 text-center shadow-2xl">
        <FileUp className="size-8 text-sky-300" aria-hidden />
        <p className="text-sm font-semibold text-ink">{t('drop.din.title')}</p>
        <p className="text-xs leading-relaxed text-muted">{t('drop.din.body')}</p>
      </div>
    </div>
  );
}
