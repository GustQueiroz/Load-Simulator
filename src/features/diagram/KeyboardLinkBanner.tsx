'use client';

import { Link2, X } from 'lucide-react';

import { useT } from '@/i18n/I18nProvider';

import type { KeyboardLink } from './hooks/keyboard-link';

interface KeyboardLinkBannerProps {
  link: KeyboardLink;
  onCancel: () => void;
}

/**
 * Shown while a keyboard connection is armed: the gesture has two steps, and
 * the learner needs to see that the first one landed.
 */
export function KeyboardLinkBanner({ link, onCancel }: KeyboardLinkBannerProps) {
  const t = useT();
  const message = t('canvas.link.armed', { node: link.sourceLabel });

  return (
    <>
      <SourceHighlight nodeId={link.sourceId} />
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 rounded-xl border border-sky-400/60 bg-panel/95 px-3 py-2 text-xs text-ink shadow-xl backdrop-blur"
      >
        <Link2 className="size-3.5 shrink-0 text-sky-300" aria-hidden />
        <span>{message}</span>
        <button
          type="button"
          onClick={onCancel}
          aria-label={t('canvas.link.cancel')}
          title={t('canvas.link.cancel')}
          className="grid size-5 place-items-center rounded-md text-faint transition-colors hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          <X className="size-3" aria-hidden />
        </button>
      </div>
    </>
  );
}

/**
 * Rings the armed card. React Flow owns the node wrapper, so the ring is a
 * scoped rule against the `data-id` it renders rather than a prop.
 */
function SourceHighlight({ nodeId }: { nodeId: string }) {
  const selector =
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(nodeId)
      : nodeId.replace(/["\\]/g, '\\$&');

  return (
    <style>{`.react-flow__node[data-id="${selector}"]{outline:2px solid #38bdf8;outline-offset:4px;border-radius:16px}`}</style>
  );
}
