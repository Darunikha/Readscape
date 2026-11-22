import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

export default function Modal({ open, onClose, title, children, size = 'md', className }) {
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      if (!panel.current?.contains(document.activeElement)) panel.current?.querySelector('[autofocus], input, textarea, button')?.focus();
    }, 30);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; clearTimeout(t); };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade bg-cocoa-900/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn('relative max-h-[92dvh] w-full animate-pop overflow-y-auto rounded-t-3xl border border-cocoa/10 bg-oat-50 p-6 shadow-lift sm:rounded-3xl sm:p-7', SIZES[size], className)}
      >
        {title && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-[26px] leading-tight">{title}</h2>
            <button type="button" onClick={onClose} className="icon-btn -mt-1 -mr-2" aria-label="Close"><X className="size-5" /></button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
