import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowUpDown, BookCheck, BookMarked, BookOpen, FolderPlus, LayoutGrid, Library, List, MoreHorizontal, Pencil, Search, Trash2, X } from 'lucide-react';
import { useShelf } from '../context/ShelfContext';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { useApi, useDebounced } from '../lib/useApi';
import { authorLine, cn, formatDate, pluralize, SHELVES } from '../lib/utils';
import BookCover from '../components/books/BookCover';
import ShelfButton from '../components/books/ShelfButton';
import Modal from '../components/ui/Modal';
import Popover, { MenuItem } from '../components/ui/Popover';
import { EmptyState, ErrorState, Field, ProgressBar, Segmented, Skeleton, Spinner, StarRating } from '../components/ui';
import { BookStack, UprightBooks } from '../components/decor/Decor';

const VIEW_KEY = 'readscape.shelfView';
const DEFAULT_TABS = [
  { key: 'reading', label: 'Currently Reading', icon: BookOpen, tone: 'bg-cocoa-100' },
  { key: 'read', label: 'Read', icon: BookCheck, tone: 'bg-mist' },
  { key: 'want', label: 'Want to Read', icon: BookMarked, tone: 'bg-silver-100' },
  { key: 'all', label: 'All books', icon: Library, tone: 'bg-oat' },
];
const SORTS = [
  { value: 'added', label: 'Date added' },
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
  { value: 'rating', label: 'My rating' },
];

const EMPTY_COPY = {
  reading: ['Nothing in progress', 'Start a book from your Want to Read shelf and it will appear here.'],
  read: ['No finished books yet', 'Books you finish move here automatically, with the date you completed them.'],
  want: ['Your wishlist is empty', 'Save books you’d love to read next while browsing Discover.'],
  all: ['Your library awaits', 'Every book you shelve will gather here.'],
  custom: ['This shelf is empty', 'Add books to it from any book’s shelf menu.'],
};

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

/** Cover tile that sits on a "shelf ledge" — rows of these read as a real bookcase. */
function ShelfTile({ entry, onOpen }) {
  const { book } = entry;
  return (
    <div className="group relative flex flex-col px-3 pt-4 sm:px-4">
      <div className="relative">
        <button type="button" onClick={() => onOpen(entry)} className="block w-full text-left" aria-label={`Open ${book.title}`}>
          <BookCover book={book} className="w-full transition duration-300 group-hover:-translate-y-1.5 group-hover:shadow-lift" />
        </button>
        <div className="absolute top-2 right-2"><ShelfButton book={book} variant="icon" /></div>
        {entry.status === 'reading' && (
          <div className="absolute inset-x-2 bottom-2 rounded-full bg-oat-50/95 px-2 py-1 shadow-soft">
            <ProgressBar value={entry.progress} size="sm" />
          </div>
        )}
      </div>
      {/* the ledge */}
      <div className="relative -mx-3 mt-0 h-3 rounded-sm bg-gradient-to-b from-cocoa-200 to-cocoa-300/80 shadow-[0_6px_10px_-6px_rgb(104_79_72/0.5)] sm:-mx-4" />
      <Link to={`/book/${book.olId}`} className="mt-3 block">
        <h3 className="line-clamp-2 font-serif text-[16.5px] leading-snug font-semibold hover:underline">{book.title}</h3>
      </Link>
      <p className="truncate text-[13px] text-cocoa-500">{authorLine(book.authors)}</p>
      <div className="mt-1 flex min-h-5 items-center gap-2 text-[12px] text-cocoa-400">
        {entry.status === 'reading' && <span>{entry.progress}% read</span>}
        {entry.myRating ? <StarRating value={entry.myRating} size="sm" /> : entry.status === 'read' && entry.finishedAt && <span>Finished {formatDate(entry.finishedAt, { month: 'short', year: 'numeric' })}</span>}
      </div>
    </div>
  );
}

function ShelfRow({ entry, onOpen }) {
  const { book } = entry;
  return (
    <div className="card flex items-center gap-4 p-3 pr-4 transition hover:shadow-lift sm:gap-5">
      <button type="button" onClick={() => onOpen(entry)} aria-label={`Open ${book.title}`}><BookCover book={book} size="S" className="w-12 sm:w-14" /></button>
      <div className="min-w-0 flex-1">
        <Link to={`/book/${book.olId}`} className="font-serif text-lg leading-tight font-semibold hover:underline">{book.title}</Link>
        <p className="truncate text-[13px] text-cocoa-500">{authorLine(book.authors)}</p>
        {entry.status === 'reading' && (
          <div className="mt-2 flex max-w-xs items-center gap-2"><ProgressBar value={entry.progress} size="sm" /><span className="text-[12px] text-cocoa-500">{entry.progress}%</span></div>
        )}
      </div>
      <div className="hidden w-28 text-[13px] text-cocoa-500 md:block">{entry.status ? SHELVES[entry.status].short : '—'}</div>
      <div className="hidden w-24 lg:block">{entry.myRating ? <StarRating value={entry.myRating} size="sm" /> : <span className="text-[13px] text-cocoa-300">Not rated</span>}</div>
      <div className="hidden w-28 text-[13px] text-cocoa-400 sm:block">{formatDate(entry.status === 'read' ? entry.finishedAt || entry.createdAt : entry.createdAt)}</div>
      <ShelfButton book={book} variant="icon" />
    </div>
  );
}

export default function Bookshelf() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const shelfKey = params.get('shelf') || 'reading';
  const isCustom = !DEFAULT_TABS.some((t) => t.key === shelfKey);
  const { version, customShelves, createShelf, refreshIndex, openProgress, bump } = useShelf();
  const confirm = useConfirm();
  const toast = useToast();

  const [view, setView] = useState(() => { try { return localStorage.getItem(VIEW_KEY) || 'grid'; } catch { return 'grid'; } });
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState('added');
  const [modal, setModal] = useState(null); // 'create' | 'rename'
  const debouncedQ = useDebounced(q, 250);

  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view); } catch { /* ignore */ } }, [view]);
  useEffect(() => { setQ(''); setGenre(''); }, [shelfKey]);

  const query = new URLSearchParams({ sort, ...(debouncedQ && { q: debouncedQ }), ...(genre && { genre }) }).toString();
  const path = isCustom ? `/custom-shelves/${shelfKey}/books?${query}` : `/shelf?status=${shelfKey}&${query}`;
  const { data, loading, error, reload } = useApi(path, [version]);
  const summary = useApi('/shelf/summary', [version]);

  const counts = summary.data?.counts;
  const allCount = counts ? counts.reading + counts.read + counts.want : null;
  const currentCustom = customShelves.find((s) => s._id === shelfKey);
  const tabLabel = isCustom ? currentCustom?.name || data?.shelf?.name || 'Shelf' : DEFAULT_TABS.find((t) => t.key === shelfKey)?.label;

  // If a deleted/unknown custom shelf is in the URL, go back to the default shelf.
  useEffect(() => {
    if (isCustom && error?.status === 404) setParams({ shelf: 'reading' }, { replace: true });
  }, [isCustom, error, setParams]);

  const onOpen = (entry) => {
    if (entry.status === 'reading' && entry._id) openProgress(entry);
    else navigate(`/book/${entry.book.olId}`);
  };

  const renameShelf = async (name) => {
    await api.patch(`/custom-shelves/${shelfKey}`, { name });
    await refreshIndex();
    bump();
    toast.success('Shelf renamed');
  };

  const deleteShelf = async () => {
    const ok = await confirm({
      title: `Delete “${tabLabel}”?`,
      message: 'The shelf will be deleted. The books themselves stay on your other shelves.',
      confirmLabel: 'Delete shelf',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/custom-shelves/${shelfKey}`);
      await refreshIndex();
      setParams({ shelf: 'reading' });
      toast.info('Shelf deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const entries = data?.entries || [];
  const hasFilters = Boolean(debouncedQ || genre);
  const emptyCopy = EMPTY_COPY[isCustom ? 'custom' : shelfKey];
  const countFor = (key) => (key === 'all' ? allCount : counts?.[key]);

  const tabs = useMemo(() => [
    ...DEFAULT_TABS.map((t) => ({ ...t, count: countFor(t.key) })),
    ...customShelves.map((s) => ({ key: s._id, label: s.name, count: s.count, custom: true })),
  ], [customShelves, counts]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-7">
      <header className="relative overflow-hidden rounded-3xl border border-cocoa/10 bg-mist/60 px-6 py-7 sm:px-8">
        <div className="relative z-10 max-w-xl">
          <p className="eyebrow">Your personal library</p>
          <h1 className="mt-1 text-[40px] leading-none sm:text-[46px]">My Bookshelf</h1>
          <p className="mt-2 text-cocoa-500">{allCount != null ? `${pluralize(allCount, 'book')} across your shelves` : ' '}{customShelves.length > 0 && ` · ${pluralize(customShelves.length, 'collection')}`}</p>
        </div>
        <div className="pointer-events-none absolute -right-2 -bottom-2 hidden items-end sm:flex">
          <UprightBooks className="w-40" />
          <BookStack className="-ml-6 w-40" tones={['silver', 'rose', 'oat']} ribbon />
        </div>
      </header>

      {/* Shelf tabs */}
      <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Shelves">
        {tabs.map((t) => {
          const active = t.key === shelfKey;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setParams({ shelf: t.key })}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition',
                active ? 'border-cocoa bg-cocoa text-oat-50 shadow-soft' : 'border-cocoa/12 bg-oat-50 text-cocoa-700 hover:border-cocoa/30',
              )}
            >
              {Icon ? <Icon className="size-4" /> : <span className={cn('size-2 rounded-full', active ? 'bg-oat' : 'bg-silver')} />}
              {t.label}
              {t.count != null && <span className={cn('rounded-full px-1.5 text-[12px]', active ? 'bg-oat-50/20' : 'bg-cocoa-50 text-cocoa-500')}>{t.count}</span>}
            </button>
          );
        })}
        <button type="button" onClick={() => setModal('create')} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-dashed border-cocoa/30 px-4 py-2 text-sm text-cocoa-500 transition hover:border-cocoa hover:text-cocoa">
          <FolderPlus className="size-4" /> New shelf
        </button>
      </nav>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-[28px] leading-none font-semibold">{tabLabel}</h2>
          {isCustom && (
            <Popover
              width={190}
              trigger={<button type="button" className="icon-btn" aria-label="Shelf options"><MoreHorizontal className="size-5" /></button>}
            >
              {(close) => (
                <>
                  <MenuItem icon={Pencil} onClick={() => { close(); setModal('rename'); }}>Rename shelf</MenuItem>
                  <MenuItem icon={Trash2} danger onClick={() => { close(); deleteShelf(); }}>Delete shelf</MenuItem>
                </>
              )}
            </Popover>
          )}
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 md:justify-end">
          <div className="relative min-w-0 flex-1 md:max-w-60">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-cocoa-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this shelf" aria-label="Search this shelf" className="input rounded-full py-2 pr-8 pl-9 text-sm" />
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
            value={view}
            onChange={setView}
            options={[{ value: 'grid', icon: LayoutGrid, ariaLabel: 'Grid view' }, { value: 'list', icon: List, ariaLabel: 'List view' }]}
          />
        </div>
      </div>

      {/* Books */}
      {error && error.status !== 404 ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        view === 'grid' ? (
          <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="px-4 pt-4"><Skeleton className="aspect-[2/3] w-full" /><Skeleton className="mt-5 h-4 w-3/4" /></div>)}
          </div>
        ) : (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        )
      ) : entries.length === 0 ? (
        hasFilters ? (
          <EmptyState title="No matches on this shelf" message="Try a different search or clear the genre filter." action={<button type="button" className="btn-secondary" onClick={() => { setQ(''); setGenre(''); }}>Clear filters</button>} />
        ) : (
          <EmptyState title={emptyCopy[0]} message={emptyCopy[1]} illustration={<BookStack className="w-40" tones={['mist', 'silver', 'rose']} ribbon />} action={<Link to="/discover" className="btn-primary">Find books</Link>} />
        )
      ) : view === 'grid' ? (
        <div className={cn('grid grid-cols-2 gap-y-8 rounded-3xl border border-cocoa/8 bg-oat-50/60 p-2 pb-6 transition-opacity sm:grid-cols-3 sm:p-4 md:grid-cols-4 xl:grid-cols-6', loading && 'opacity-60')}>
          {entries.map((e) => <ShelfTile key={e.book._id} entry={e} onOpen={onOpen} />)}
        </div>
      ) : (
        <div className={cn('space-y-3 transition-opacity', loading && 'opacity-60')}>
          {entries.map((e) => <ShelfRow key={e.book._id} entry={e} onOpen={onOpen} />)}
        </div>
      )}

      <ShelfNameModal
        open={modal === 'create'}
        onClose={() => setModal(null)}
        title="Create a shelf"
        onSubmit={async (name) => { const s = await createShelf(name); toast.success(`“${s.name}” created`); setParams({ shelf: s._id }); }}
      />
      <ShelfNameModal open={modal === 'rename'} onClose={() => setModal(null)} title="Rename shelf" initial={tabLabel} onSubmit={renameShelf} />
    </div>
  );
}
