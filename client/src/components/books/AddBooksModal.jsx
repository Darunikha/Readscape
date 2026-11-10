import { useEffect, useState } from 'react';
import { Check, Search } from 'lucide-react';
import Modal from '../ui/Modal';
import BookCover from './BookCover';
import { ErrorState, Segmented, Skeleton, Spinner } from '../ui';
import { useApi, useDebounced } from '../../lib/useApi';
import { useShelf } from '../../context/ShelfContext';
import { authorLine, SHELVES } from '../../lib/utils';

const TARGETS = [
  { value: 'reading', label: 'Reading' },
  { value: 'want', label: 'Want to Read' },
  { value: 'read', label: 'Read' },
];

/** Search the catalogue and place books straight onto a shelf. */
export default function AddBooksModal({ open, onClose, initialStatus = 'want' }) {
  const { statusOf, setStatus } = useShelf();
  const [q, setQ] = useState('');
  const [target, setTarget] = useState(initialStatus);
  const [busy, setBusy] = useState(null);
  const dq = useDebounced(q.trim(), 400);
  const { data, loading, error, reload } = useApi(open && dq.length >= 2 ? `/books/search?q=${encodeURIComponent(dq)}` : null);

  useEffect(() => { if (open) { setTarget(initialStatus); setQ(''); } }, [open, initialStatus]);

  const place = async (book) => {
    setBusy(book.olId);
    await setStatus(book, target).catch(() => {});
    setBusy(null);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add books to your shelf" size="lg">
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-cocoa-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title or author…" aria-label="Search books" className="input rounded-full pl-11" autoFocus />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-cocoa-500">Place on</span>
          <Segmented size="sm" value={target} onChange={setTarget} options={TARGETS} />
        </div>

        <div className="-mx-2 max-h-[52vh] min-h-40 overflow-y-auto px-2">
          {dq.length < 2 ? (
            <p className="py-10 text-center text-cocoa-400">Start typing to search millions of books.</p>
          ) : error ? (
            <ErrorState error={error} onRetry={reload} />
          ) : loading && !data ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : !data?.books.length ? (
            <p className="py-10 text-center text-cocoa-400">No books found for “{dq}”.</p>
          ) : (
            <ul className="divide-y divide-cocoa/8">
              {data.books.map((book) => {
                const status = statusOf(book.olId);
                const here = status === target;
                return (
                  <li key={book.olId} className="flex items-center gap-3.5 py-3">
                    <BookCover book={book} size="S" className="w-11" rounded="rounded" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-serif text-[16.5px] leading-snug font-semibold">{book.title}</p>
                      <p className="truncate text-[13px] text-cocoa-500">{authorLine(book.authors)}{book.firstPublishYear ? ` · ${book.firstPublishYear}` : ''}</p>
                      {status && !here && <p className="text-[12px] text-silver-700">Currently on {SHELVES[status].label}</p>}
                    </div>
                    {here ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-[13px] text-cocoa-700"><Check className="size-3.5" /> On shelf</span>
                    ) : (
                      <button type="button" className={status ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'} disabled={busy === book.olId} onClick={() => place(book)}>
                        {busy === book.olId && <Spinner />}{status ? 'Move here' : 'Add'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
