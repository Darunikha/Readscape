import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowUpDown, FolderPlus, Library, List, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useShelf } from '../context/ShelfContext';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { useApi, useDebounced } from '../lib/useApi';
import { authorLine, formatDate, pluralize, SHELVES } from '../lib/utils';
import BookCover from '../components/books/BookCover';
import ShelfButton from '../components/books/ShelfButton';
import AddBooksModal from '../components/books/AddBooksModal';
import { Bookcase, Compartment } from '../components/books/Bookcase';
import { BookPile, BudVase, FramedPrint, Globe } from '../components/decor/ShelfDecor';
import Modal from '../components/ui/Modal';
import Popover, { MenuItem } from '../components/ui/Popover';
import { ErrorState, Field, ProgressBar, Segmented, Spinner, StarRating } from '../components/ui';

const VIEW_KEY = 'readscape.shelfView';
// One small arrangement per shelf, kept to the far end so books stay the focus.
const SECTIONS = [
  { key: 'reading', title: 'Currently Reading', empty: 'Nothing on the nightstand yet — pick a book to begin.', decor: <BudVase />, decorWidth: 52 },
  { key: 'want', title: 'Want to Read', empty: 'Save the stories you’re dreaming of reading next.', decor: <FramedPrint />, decorWidth: 90 },
  { key: 'read', title: 'Read', empty: 'Every book you finish will find its place here.', decor: <><BookPile className="w-[104px]" /><Globe /></>, decorWidth: 190 },
];
const SORTS = [
  { value: 'added', label: 'Date added' },
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
  { value: 'rating', label: 'My rating' },
];

function ShelfNameModal({ open, onClose, initial = '', onSubmit, title }) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setName(initial); setError(''); } }, [open, initial]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Give your shelf a name'); return; }
    setBusy(true);
    try {
      await onSubmit(name.trim());
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Shelf name" error={error}>
          <input value={name} onChange={(e) => { setName(e.target.value); setError(''); }} maxLength={40} className="input" placeholder="e.g. Rainy day reads" autoFocus />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy && <Spinner />}Save</button>
        </div>
      </form>
    </Modal>
  );
}

function ShelfRow({ entry, onProgress }) {
  const { book } = entry;
  return (
    <div className="card flex items-center gap-4 p-3 pr-4 transition hover:shadow-lift sm:gap-5">
      <Link to={`/book/${book.olId}`}><BookCover book={book} size="S" className="w-12 sm:w-14" /></Link>
      <div className="min-w-0 flex-1">
        <Link to={`/book/${book.olId}`} className="font-serif text-lg leading-tight font-semibold hover:underline">{book.title}</Link>
        <p className="truncate text-[13px] text-cocoa-500">{authorLine(book.authors)}</p>
        {entry.status === 'reading' && (
          <button type="button" onClick={() => onProgress(entry)} className="mt-2 flex w-full max-w-xs items-center gap-2" aria-label="Update progress">
            <ProgressBar value={entry.progress} size="sm" /><span className="text-[12px] text-cocoa-500">{entry.progress}%</span>
          </button>
        )}
      </div>
      <div className="hidden w-24 lg:block">{entry.myRating ? <StarRating value={entry.myRating} size="sm" /> : <span className="text-[13px] text-cocoa-300">Not rated</span>}</div>
      <div className="hidden w-28 text-[13px] text-cocoa-400 sm:block">{formatDate(entry.status === 'read' ? entry.finishedAt || entry.createdAt : entry.createdAt)}</div>
      <ShelfButton book={book} variant="icon" />
    </div>
  );
}

function ListSection({ title, entries, onProgress }) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-[24px] font-semibold">{title} <span className="text-base font-normal text-cocoa-400">{entries.length}</span></h2>
      {entries.length ? entries.map((e) => <ShelfRow key={e.book._id} entry={e} onProgress={onProgress} />) : <p className="text-cocoa-400">No books here.</p>}
    </section>
  );
}

/** A custom shelf compartment loads its own books. */
function CustomCompartment({ shelf, query, view, onRename, onDelete, onProgress }) {
  const { version } = useShelf();
  const { data, loading, error, reload } = useApi(`/custom-shelves/${shelf._id}/books?${query}`, [version]);
  const entries = data?.entries || [];

  if (view === 'list') return <ListSection title={shelf.name} entries={entries} onProgress={onProgress} />;
  if (error) return <div className="bookcase-panel p-6"><ErrorState error={error} onRetry={reload} /></div>;
  return (
    <Compartment
      id={shelf._id}
      title={shelf.name}
      count={data ? entries.length : null}
      entries={entries}
      loading={loading && !data}
      emptyText="Add books here from any book’s shelf menu."
      menu={(
        <Popover width={190} align="end" trigger={<button type="button" className="icon-btn bg-oat-50/60" aria-label={`${shelf.name} options`}><MoreHorizontal className="size-5" /></button>}>
          {(close) => (
            <>
              <MenuItem icon={Pencil} onClick={() => { close(); onRename(shelf); }}>Rename shelf</MenuItem>
              <MenuItem icon={Trash2} danger onClick={() => { close(); onDelete(shelf); }}>Delete shelf</MenuItem>
            </>
          )}
        </Popover>
      )}
    />
  );
}

export default function Bookshelf() {
  const [params] = useSearchParams();
  const focus = params.get('shelf');
  const { version, customShelves, createShelf, refreshIndex, openProgress, bump } = useShelf();
  const confirm = useConfirm();
  const toast = useToast();

  const [view, setView] = useState(() => { try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'shelf'; } catch { return 'shelf'; } });
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState('added');
  const [nameModal, setNameModal] = useState(null); // { mode: 'create' } | { mode: 'rename', shelf }
  const [addTo, setAddTo] = useState(null); // status for the add-books modal
  const debouncedQ = useDebounced(q, 250);

  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view); } catch { /* ignore */ } }, [view]);

  const query = new URLSearchParams({ sort, ...(debouncedQ && { q: debouncedQ }), ...(genre && { genre }) }).toString();
  const { data, loading, error, reload } = useApi(`/shelf?status=all&${query}`, [version]);

  const groups = useMemo(() => {
    const g = { reading: [], want: [], read: [] };
    for (const e of data?.entries || []) g[e.status]?.push(e);
    return g;
  }, [data]);

  // Arriving from Home (?shelf=read) scrolls to that compartment.
  useEffect(() => {
    if (!focus || !data) return;
    const t = setTimeout(() => document.getElementById(`shelf-${focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    return () => clearTimeout(t);
  }, [focus, Boolean(data)]); // eslint-disable-line react-hooks/exhaustive-deps

  const renameShelf = async (shelf, name) => {
    await api.patch(`/custom-shelves/${shelf._id}`, { name });
    await refreshIndex();
    bump();
    toast.success('Shelf renamed');
  };

  const deleteShelf = async (shelf) => {
    const ok = await confirm({
      title: `Delete “${shelf.name}”?`,
      message: 'The shelf will be removed from your bookcase. The books themselves stay on your other shelves.',
      confirmLabel: 'Delete shelf',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/custom-shelves/${shelf._id}`);
      await refreshIndex();
      bump();
      toast.info('Shelf deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const hasFilters = Boolean(debouncedQ || genre);
  const total = data?.total;

  return (
    <div className="space-y-6">
      {/* Title + controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Your personal library</p>
          <h1 className="mt-1 text-[38px] leading-none sm:text-[44px]">My Bookshelf</h1>
          <p className="mt-2 text-cocoa-500">
            {total != null ? pluralize(total, 'book') : ' '}
            {customShelves.length > 0 && ` · ${pluralize(customShelves.length, 'custom shelf', 'custom shelves')}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => setAddTo('want')}><Plus className="size-4" /> Add books</button>
          <button type="button" className="btn-secondary" onClick={() => setNameModal({ mode: 'create' })}><FolderPlus className="size-4" /> New shelf</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 basis-full sm:max-w-72 sm:flex-1 sm:basis-auto">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-cocoa-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your bookshelf" aria-label="Search your bookshelf" className="input rounded-full py-2 pr-8 pl-9 text-sm" />
          {q && <button type="button" onClick={() => setQ('')} className="absolute top-1/2 right-2.5 -translate-y-1/2 text-cocoa-400 hover:text-cocoa" aria-label="Clear search"><X className="size-4" /></button>}
        </div>
        <select value={genre} onChange={(e) => setGenre(e.target.value)} aria-label="Filter by genre" className="input w-auto rounded-full py-2 text-sm">
          <option value="">All genres</option>
          {(data?.genres || []).map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <label className="relative">
          <ArrowUpDown className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-cocoa-400" />
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort books" className="input w-auto rounded-full py-2 pl-9 text-sm">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <Segmented
          size="sm"
          className="ml-auto"
          value={view}
          onChange={setView}
          options={[{ value: 'shelf', icon: Library, ariaLabel: 'Bookcase view' }, { value: 'list', icon: List, ariaLabel: 'List view' }]}
        />
      </div>
      {hasFilters && (
        <p className="text-sm text-cocoa-500">
          Showing matches for {debouncedQ && <>“{debouncedQ}”</>}{debouncedQ && genre && ' in '}{genre}.{' '}
          <button type="button" className="font-medium text-cocoa underline underline-offset-2" onClick={() => { setQ(''); setGenre(''); }}>Clear</button>
        </p>
      )}

      {error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : view === 'list' ? (
        <div className="space-y-8">
          {SECTIONS.map((s) => <ListSection key={s.key} title={s.title} entries={groups[s.key]} onProgress={openProgress} />)}
          {customShelves.map((shelf) => (
            <CustomCompartment key={shelf._id} shelf={shelf} query={query} view="list" onProgress={openProgress} />
          ))}
        </div>
      ) : (
        <div className="space-y-12 pt-16 sm:pt-20">
          <Bookcase>
            {SECTIONS.map((s) => (
              <Compartment
                key={s.key}
                id={s.key}
                title={s.title}
                count={data ? groups[s.key].length : null}
                entries={groups[s.key]}
                loading={!data}
                decor={s.decor}
                decorWidth={s.decorWidth}
                emptyText={hasFilters ? 'No matches on this shelf.' : s.empty}
                onAdd={hasFilters ? undefined : () => setAddTo(s.key)}
                onProgress={openProgress}
              />
            ))}
          </Bookcase>

          {customShelves.length > 0 && (
            <section className="space-y-4">
              <div>
                <h2 className="section-title">My collections</h2>
                <p className="text-sm text-cocoa-500">Your own shelves — add books from any book’s shelf menu.</p>
              </div>
              <Bookcase topDecor={false}>
                {customShelves.map((shelf) => (
                  <CustomCompartment
                    key={shelf._id}
                    shelf={shelf}
                    query={query}
                    view="shelf"
                    onRename={(sh) => setNameModal({ mode: 'rename', shelf: sh })}
                    onDelete={deleteShelf}
                    onProgress={openProgress}
                  />
                ))}
              </Bookcase>
            </section>
          )}
        </div>
      )}

      <AddBooksModal open={Boolean(addTo)} initialStatus={addTo || 'want'} onClose={() => setAddTo(null)} />
      <ShelfNameModal
        open={nameModal?.mode === 'create'}
        onClose={() => setNameModal(null)}
        title="Create a shelf"
        onSubmit={async (name) => {
          const s = await createShelf(name);
          toast.success(`“${s.name}” added to your bookcase`);
          setTimeout(() => document.getElementById(`shelf-${s._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
        }}
      />
      <ShelfNameModal
        open={nameModal?.mode === 'rename'}
        onClose={() => setNameModal(null)}
        title="Rename shelf"
        initial={nameModal?.shelf?.name || ''}
        onSubmit={(name) => renameShelf(nameModal.shelf, name)}
      />
    </div>
  );
}

