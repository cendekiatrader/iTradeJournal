import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getClientRects().length > 0 && !el.hasAttribute('disabled')
  );
}

/**
 * Dialog accessibility helper for modal components.
 *  - Moves focus into the dialog when it opens
 *  - Traps Tab / Shift+Tab inside the dialog
 *  - Calls onClose on Escape (without leaking the key to global handlers)
 *  - Restores focus to the previously focused element on close
 *
 * Usage:
 *   const modalRef = useModalA11y(isOpen, onClose);
 *   <div ref={modalRef} className="modal-container" role="dialog" aria-modal="true" aria-label="...">
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  onClose?: () => void
) {
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = (document.activeElement as HTMLElement) || null;

    const container = containerRef.current;
    if (container) {
      const focusables = getFocusable(container);
      if (focusables.length > 0) {
        focusables[0].focus({ preventScroll: true });
      } else if (container.hasAttribute('tabindex')) {
        container.focus({ preventScroll: true });
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const c = containerRef.current;
      if (!c) return;

      const focusables = getFocusable(c);
      const active = document.activeElement as HTMLElement | null;

      if (focusables.length === 0) {
        e.preventDefault();
        c.focus({ preventScroll: true });
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (active === first || active === c || !active || !c.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !active || !c.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === 'function' && document.body.contains(prev)) {
        prev.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  return containerRef;
}
