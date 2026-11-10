import { Link } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import BookCover from './BookCover';
import ShelfButton from './ShelfButton';
import { useShelf } from '../../context/ShelfContext';
import { authorLine, cn, SHELVES } from '../../lib/utils';
import { ErrorState, Skeleton } from '../ui';

/** Cover-first book tile used across Discover, search and rows. */
export function BookCard({ book, className }) {
  const { statusOf } = useShelf();
  const status = statusOf(book.olId);
  return (
    <div className={cn('group relative w-full', className)}>
      <Link to={`/book/${book.olId}`} className="block rounded-md">
        <BookCover book={book} className="w-full transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lift" />
      </Link>
      <div className="absolute top-2 right-2 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 [&:has([aria-label^='On shelf'])]:opacity-100">
        <ShelfButton book={book} variant="icon" />
      </div>
      <Link to={`/book/${book.olId}`} className="mt-3 block">
        <h3 className="line-clamp-2 font-serif text-[17px] leading-snug font-semibold text-cocoa group-hover:text-cocoa-700">{book.title}</h3>
        <p className="mt-0.5 truncate text-[13px] text-cocoa-500">{authorLine(book.authors)}</p>
      </Link>
      {status && <span className="mt-1.5 inline-block rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-cocoa-700">{SHELVES[status].short}</span>}
    </div>
  );
}

export function BookCardSkeleton({ className }) {
  return (
    <div className={cn('w-full', className)}>
      <Skeleton className="aspect-[2/3] w-full rounded-md" />
      <Skeleton className="mt-3 h-4 w-4/5" />
      <Skeleton className="mt-2 h-3 w-1/2" />
    </div>
  );
}

export function BookGrid({ books, loading, count = 12 }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
      {books?.map((b) => <BookCard key={b.olId} book={b} />)}
      {loading && Array.from({ length: count }).map((_, i) => <BookCardSkeleton key={`s${i}`} />)}
    </div>
  );
}

/** Horizontally scrolling row with arrows, loading skeletons and retry. */
export function BookRow({ title, subtitle, icon: Icon, books, loading, error, onRetry, action }) {
  const row = useRef(null);
  const scroll = (dir) => row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className="animate-rise">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="size-5 text-silver-700" />}
          <div>
            <h2 className="section-title">{title}</h2>
            {subtitle && <p className="text-[13px] text-cocoa-400">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {action}
          <button type="button" className="icon-btn hidden sm:inline-flex" onClick={() => scroll(-1)} aria-label="Scroll left"><ChevronLeft className="size-5" /></button>
          <button type="button" className="icon-btn hidden sm:inline-flex" onClick={() => scroll(1)} aria-label="Scroll right"><ChevronRight className="size-5" /></button>
        </div>
      </div>
      {error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : (
        <div ref={row} className="scroll-row -mx-1 px-1 pt-1">
          {loading && !books?.length
            ? Array.from({ length: 7 }).map((_, i) => <BookCardSkeleton key={i} className="w-[132px] shrink-0 sm:w-[150px]" />)
            : books?.map((b) => <BookCard key={b.olId} book={b} className="w-[132px] shrink-0 sm:w-[150px]" />)}
          {!loading && !books?.length && <p className="py-6 text-cocoa-400">Nothing to show here yet.</p>}
        </div>
      )}
    </section>
  );
}
