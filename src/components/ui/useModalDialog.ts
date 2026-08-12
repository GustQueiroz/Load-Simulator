'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Modals are siblings of the app shell, so the shell is the thing to switch
 * off while one is open. Ref-counted: closing a stacked dialog must not wake
 * the background up while another is still on top.
 */
let openDialogs = 0;

function setShellInert(inert: boolean): void {
  const shell = document.querySelector('.simulator-shell');
  if (!(shell instanceof HTMLElement)) return;
  if (inert) shell.setAttribute('inert', '');
  else shell.removeAttribute('inert');
}

export interface ModalDialogOptions {
  open: boolean;
  onClose?: () => void;
  /** Set false for dialogs that must be dismissed by an explicit choice. */
  closeOnEscape?: boolean;
}

/**
 * Gives a dialog the behaviour `role="dialog"` promises: focus moves inside on
 * open, Tab cycles within, Escape dismisses, the background is inert, and the
 * previously focused element gets focus back on close.
 *
 * Attach the returned ref to the dialog container and give it `tabIndex={-1}`
 * so it can hold focus when it contains no controls yet.
 */
export function useModalDialog<T extends HTMLElement>({
  open,
  onClose,
  closeOnEscape = true,
}: ModalDialogOptions) {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);

  // Kept in a ref so a new closure on every render does not tear down and
  // rebuild the trap — which would steal focus back to the top on each keypress.
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const node = ref.current;
    if (!open || !node) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    openDialogs += 1;
    setShellInert(true);

    const focusable = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );

    // `preventScroll` matters on a phone: focusing a control inside a fixed
    // overlay otherwise scrolls the page under it sideways.
    (focusable()[0] ?? node).focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        node.focus({ preventScroll: true });
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (!node.contains(active)) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      } else if (event.shiftKey && (active === first || active === node)) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    node.addEventListener('keydown', onKeyDown);

    return () => {
      node.removeEventListener('keydown', onKeyDown);
      openDialogs = Math.max(0, openDialogs - 1);
      if (openDialogs === 0) setShellInert(false);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open, closeOnEscape]);

  return ref;
}
