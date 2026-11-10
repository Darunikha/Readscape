import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

const ToastContext = createContext(null);

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };
const TONES = {
  success: 'bg-oat-50 border-silver/50 [&_svg.lead]:text-silver-700',
  error: 'bg-cocoa-50 border-cocoa-300 [&_svg.lead]:text-cocoa',
  info: 'bg-mist-50 border-mist-400 [&_svg.lead]:text-silver-700',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback((type, message, opts = {}) => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-3), { id, type, message, action: opts.action }]);
    setTimeout(() => dismiss(id), opts.duration || (type === 'error' ? 5000 : 3200));
  }, [dismiss]);

  const toast = useMemo(() => ({
    success: (m, o) => push('success', m, o),
    error: (m, o) => push('error', m, o),
    info: (m, o) => push('info', m, o),
  }), [push]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-20 z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} role="status" className={cn('pointer-events-auto flex w-full max-w-sm animate-pop items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lift', TONES[t.type])}>
              <Icon className="lead mt-0.5 size-[18px] shrink-0" />
              <p className="flex-1 leading-snug text-cocoa-800">{t.message}</p>
              {t.action && (
                <button type="button" onClick={() => { t.action.onClick(); dismiss(t.id); }} className="font-semibold text-cocoa underline-offset-2 hover:underline">
                  {t.action.label}
                </button>
              )}
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-cocoa-400 hover:text-cocoa"><X className="size-4" /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
