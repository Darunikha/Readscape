import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Modal from '../components/ui/Modal';

const ConfirmContext = createContext(null);

/** `const ok = await confirm({ title, message, confirmLabel, danger })` */
export function ConfirmProvider({ children }) {
  const [opts, setOpts] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current = resolve;
    setOpts(options);
  }), []);

  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={Boolean(opts)} onClose={() => close(false)} title={opts?.title} size="sm">
        <p className="text-[15px] leading-relaxed text-cocoa-500">{opts?.message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => close(false)}>{opts?.cancelLabel || 'Cancel'}</button>
          <button type="button" autoFocus className={opts?.danger ? 'btn-danger' : 'btn-primary'} onClick={() => close(true)}>
            {opts?.confirmLabel || 'Confirm'}
          </button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
