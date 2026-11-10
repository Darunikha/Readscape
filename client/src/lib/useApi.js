import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

/**
 * Fetches `path` and tracks loading/error state. Pass `null` to skip.
 * `deps` lets callers trigger refetches (e.g. after shelf changes).
 */
export function useApi(path, deps = []) {
  const [state, setState] = useState({ data: null, loading: Boolean(path), error: null });
  const [nonce, setNonce] = useState(0);
  const hasData = useRef(false);

  useEffect(() => {
    if (!path) { setState({ data: null, loading: false, error: null }); return undefined; }
    const ctrl = new AbortController();
    // Keep showing previous data while refreshing in the background.
    setState((s) => ({ data: hasData.current ? s.data : null, loading: true, error: null }));
    api.get(path, { signal: ctrl.signal })
      .then((data) => { hasData.current = true; setState({ data, loading: false, error: null }); })
      .catch((error) => { if (error.name !== 'AbortError') setState((s) => ({ ...s, loading: false, error })); });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce, ...deps]);

  useEffect(() => { hasData.current = false; }, [path]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), []);
  return { ...state, reload, setData };
}

export function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
