import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/**
 * Accessible drawer: focus trap, Escape to close, aria-modal,
 * restores focus to the opener on close. Used by cart + mobile filters.
 */
export function Drawer({ open, onClose, title, children, side = 'right' }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: 'right' | 'bottom';
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('button, a, input, select')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel) {
        const focusables = panel.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className={side === 'right' ? 'cart-ov open' : 'drawer-ov open'} onClick={onClose} />
      <div
        ref={panelRef}
        className={side === 'right' ? 'cart-panel open' : 'drawer open'}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {side === 'right' ? (
          <div className="cart-head">
            <h2>{title}</h2>
            <button className="cart-close" onClick={onClose} aria-label={`Close ${title}`}>
              ✕
            </button>
          </div>
        ) : (
          <>
            <div className="cart-head" style={{ marginBottom: 10 }}>
              <h2>{title}</h2>
              <button className="cart-close" onClick={onClose} aria-label={`Close ${title}`}>
                ✕
              </button>
            </div>
          </>
        )}
        {children}
      </div>
    </>
  );
}
