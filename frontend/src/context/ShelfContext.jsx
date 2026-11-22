import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { bookSummary, SHELVES } from '../lib/utils';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import ProgressModal from '../components/books/ProgressModal';

const ShelfContext = createContext(null);

/**
 * Global shelf state: which books are on which shelf (so every book card knows
 * its status), custom shelves, and the reading-progress modal.
 * `version` increments on every change so pages can refetch.
 */
export function ShelfProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [entries, setEntries] = useState({}); // olId -> { _id, status }
  const [customShelves, setCustomShelves] = useState([]);
  const [version, setVersion] = useState(0);
  const [progressEntry, setProgressEntry] = useState(null);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const refreshIndex = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get('/shelf/index');
      setEntries(Object.fromEntries(data.entries.map((e) => [e.olId, e])));
      setCustomShelves(data.customShelves);
    } catch { /* non-critical; cards just won't show status */ }
  }, [user]);

  useEffect(() => {
    if (user) refreshIndex();
    else { setEntries({}); setCustomShelves([]); }
  }, [user, refreshIndex]);

  const setStatus = useCallback(async (book, status) => {
    const existing = entries[book.olId];
    try {
      const { entry, unchanged } = existing
        ? await api.patch(`/shelf/${existing._id}`, { status }).then((r) => ({ entry: r.entry }))
        : await api.post('/shelf', { book: bookSummary(book), status });
      setEntries((m) => ({ ...m, [book.olId]: { _id: entry._id, olId: book.olId, status: entry.status } }));
      if (!unchanged) {
        toast.success(existing ? `Moved to ${SHELVES[status].label}` : `Added to ${SHELVES[status].label}`);
        bump();
      }
      return entry;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  }, [entries, toast, bump]);

  const removeFromShelves = useCallback(async (book) => {
    const existing = entries[book.olId];
    if (!existing) return;
    try {
      await api.del(`/shelf/${existing._id}`);
      setEntries((m) => { const n = { ...m }; delete n[book.olId]; return n; });
      toast.info(`Removed “${book.title}” from your shelves`);
      bump();
    } catch (err) {
      toast.error(err.message);
    }
  }, [entries, toast, bump]);

  const toggleCustom = useCallback(async (shelf, book) => {
    const on = shelf.olIds.includes(book.olId);
    try {
      if (on) await api.del(`/custom-shelves/${shelf._id}/books/${book.olId}`);
      else await api.post(`/custom-shelves/${shelf._id}/books`, { book: bookSummary(book) });
      setCustomShelves((list) => list.map((s) => (s._id === shelf._id
        ? { ...s, olIds: on ? s.olIds.filter((id) => id !== book.olId) : [...s.olIds, book.olId], count: s.count + (on ? -1 : 1) }
        : s)));
      toast.success(on ? `Removed from “${shelf.name}”` : `Added to “${shelf.name}”`);
      bump();
    } catch (err) {
      toast.error(err.message);
    }
  }, [toast, bump]);

  const createShelf = useCallback(async (name) => {
    const { shelf } = await api.post('/custom-shelves', { name });
    setCustomShelves((list) => [...list, { ...shelf, olIds: [] }]);
    bump();
    return shelf;
  }, [bump]);

  /** Opens the progress modal; accepts a full entry or a book (looks the entry up). */
  const openProgress = useCallback(async (entryOrBook) => {
    if (entryOrBook.book) return setProgressEntry(entryOrBook);
    try {
      const { entry } = await api.get(`/shelf/book/${entryOrBook.olId}`);
      if (entry) setProgressEntry(entry);
    } catch (err) {
      toast.error(err.message);
    }
    return undefined;
  }, [toast]);

  const onEntryChanged = useCallback((entry) => {
    setEntries((m) => ({ ...m, [entry.book.olId]: { _id: entry._id, olId: entry.book.olId, status: entry.status } }));
    bump();
  }, [bump]);

  const value = useMemo(() => ({
    entries,
    statusOf: (olId) => entries[olId]?.status || null,
    customShelves,
    version,
    setStatus,
    removeFromShelves,
    toggleCustom,
    createShelf,
    refreshIndex,
    openProgress,
    bump,
  }), [entries, customShelves, version, setStatus, removeFromShelves, toggleCustom, createShelf, refreshIndex, openProgress, bump]);

  return (
    <ShelfContext.Provider value={value}>
      {children}
      <ProgressModal entry={progressEntry} onClose={() => setProgressEntry(null)} onChanged={onEntryChanged} />
    </ShelfContext.Provider>
  );
}

export const useShelf = () => useContext(ShelfContext);
