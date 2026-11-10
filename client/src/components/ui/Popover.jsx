import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

/**
 * Dropdown rendered in a portal with fixed positioning so it never gets
 * clipped by scrolling rows or cards.
 */
export default function Popover({ trigger, children, align = 'start', width = 240, className }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btn = useRef(null);
  const panel = useRef(null);

  const place = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.min(width, window.innerWidth - 16);
    let left = align === 'end' ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    const h = panel.current?.offsetHeight || 260;
    const below = r.bottom + 6;
    const top = below + h > window.innerHeight - 8 && r.top - h - 6 > 8 ? r.top - h - 6 : below;
    setPos({ top, left, width: w });
  };

  useLayoutEffect(() => { if (open) place(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (panel.current?.contains(e.target) || btn.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onScroll = (e) => { if (!panel.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', () => setOpen(false), { once: true });
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <span ref={btn} className="inline-flex" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}>
        {typeof trigger === 'function' ? trigger(open) : trigger}
      </span>
      {open && createPortal(
        <div
          ref={panel}
          style={pos ? { top: pos.top, left: pos.left, width: pos.width } : { visibility: 'hidden', top: 0, left: 0 }}
          className={cn('fixed z-[65] animate-pop rounded-2xl border border-cocoa/10 bg-oat-50 p-1.5 shadow-lift', className)}
          onClick={(e) => e.stopPropagation()}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>,
        document.body,
      )}
    </>
  );
}

export function MenuItem({ icon: Icon, children, active, onClick, danger, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition disabled:opacity-50',
        danger ? 'text-cocoa-700 hover:bg-cocoa-100' : 'text-cocoa-800 hover:bg-mist/60',
        active && 'bg-mist/70 font-medium',
      )}
    >
      {Icon && <Icon className="size-4 shrink-0 text-cocoa-500" />}
      <span className="flex-1 truncate">{children}</span>
    </button>
  );
}

export const MenuLabel = ({ children }) => <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-[0.14em] text-silver-700 uppercase">{children}</p>;
export const MenuDivider = () => <div className="my-1 h-px bg-cocoa/10" />;
