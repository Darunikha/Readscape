import { useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, Plus } from 'lucide-react';
import ShelfButton from './ShelfButton';
import BookCover from './BookCover';
import { ProgressBar, StarRating } from '../ui';
import { authorLine, cn, coverUrl, SHELVES } from '../../lib/utils';
import { BookPile, PottedPlant, TinyBow } from '../decor/ShelfDecor';

/*
 * A warm wooden bookcase. Each compartment's rows sit on shelf boards drawn as
 * a repeating gradient, so wrapped rows (on smaller screens) each get a board.
 */
export const ROW = 214; // vertical room for books in a row
export const BOARD = 22; // shelf board thickness
const PERIOD = ROW + BOARD;

const SHELF_ROWS_BG = `repeating-linear-gradient(180deg,
  rgb(40 26 18 / 0.26) 0px, rgb(40 26 18 / 0) 18px,
  rgb(40 26 18 / 0) ${ROW - 14}px, rgb(40 26 18 / 0.2) ${ROW}px,
  #e8c9a0 ${ROW}px, #dcb88b ${ROW + 6}px,
  #c69768 ${ROW + 6}px, #b38254 ${ROW + BOARD - 4}px,
  #8a5f3d ${ROW + BOARD - 4}px, #8a5f3d ${PERIOD}px)`;

const hash = (s = '') => [...s].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5381);

/** Hover/focus card with details and shelf actions. */
function BookOnShelf({ entry, children, onProgress }) {
  const { book } = entry;
  return (
    <div className="group/book relative">
      {children}
      <div className="absolute bottom-full left-1/2 z-30 hidden w-56 -translate-x-1/2 animate-fade pb-3 group-focus-within/book:block group-hover/book:block">
        <div className="rounded-xl border border-cocoa/10 bg-oat-50 p-3 shadow-lift">
          <Link to={`/book/${book.olId}`} className="line-clamp-2 font-serif text-[16px] leading-snug font-semibold hover:underline">{book.title}</Link>
          <p className="mt-0.5 truncate text-[12.5px] text-cocoa-500">{authorLine(book.authors)}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="min-w-0 text-[12px] text-cocoa-400">
              {entry.myRating ? <StarRating value={entry.myRating} size="sm" /> : entry.status ? SHELVES[entry.status].label : 'In this collection'}
            </div>
            <ShelfButton book={book} variant="icon" />
          </div>
          {onProgress && entry.status === 'reading' && entry._id && (
            <button type="button" onClick={() => onProgress(entry)} className="btn-soft btn-sm mt-2.5 w-full">
              <BookOpen className="size-3.5" /> Update progress
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A book standing face-out. The cover keeps its natural aspect ratio (measured
 * on load); heights vary slightly so the row feels hand-arranged.
 */
export function ShelfBook({ entry, onProgress }) {
  const { book } = entry;
  const h = hash(book.olId);
  const height = 152 + (h % 6) * 7; // 152–187px
  const [state, setState] = useState(book.coverId ? 'loading' : 'fallback');
  const [ratio, setRatio] = useState(2 / 3);
  const width = Math.round(height * ratio);

  const onLoad = (e) => {
    const { naturalWidth: w, naturalHeight: hh } = e.currentTarget;
    if (w < 10) { setState('fallback'); return; } // Open Library's 1×1 "no cover" pixel
    setRatio(Math.min(0.9, Math.max(0.5, w / hh)));
    setState('ok');
  };

  return (
    <BookOnShelf entry={entry} onProgress={onProgress}>
      <div className="relative transition duration-300 ease-out group-hover/book:-translate-y-2.5" style={{ height, width }}>
        {/* contact shadow on the board */}
        <span className="pointer-events-none absolute -bottom-1 left-[6%] h-2.5 w-[96%] rounded-[50%] bg-cocoa-900/30 blur-[3px] transition group-hover/book:opacity-50" />
        <Link
          to={`/book/${book.olId}`}
          aria-label={`${book.title} by ${authorLine(book.authors)}`}
          className="relative block size-full overflow-hidden rounded-[2px] rounded-r-[3px] shadow-[3px_3px_7px_-1px_rgb(40_26_18/0.5),1px_0_0_rgb(40_26_18/0.15)] transition group-hover/book:shadow-[6px_10px_16px_-4px_rgb(40_26_18/0.5)]"
        >
          {state === 'fallback' ? (
            <BookCover book={{ ...book, coverId: null }} className="!size-full" rounded="rounded-none" shadow={false} />
          ) : (
            <>
              {state === 'loading' && <span className="skeleton absolute inset-0 rounded-none" />}
              <img
                src={coverUrl(book.coverId, 'M')}
                srcSet={`${coverUrl(book.coverId, 'M')} 1x, ${coverUrl(book.coverId, 'L')} 2x`}
                alt=""
                loading="lazy"
                onLoad={onLoad}
                onError={() => setState('fallback')}
                className={cn('size-full object-contain transition-opacity duration-500', state === 'ok' ? 'opacity-100' : 'opacity-0')}
              />
              {/* spine hinge + soft sheen */}
              <span className="pointer-events-none absolute inset-y-0 left-0 w-[7%] bg-gradient-to-r from-black/30 via-white/10 to-transparent" />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10" />
            </>
          )}
        </Link>
        {entry.status === 'reading' && (
          <div className="pointer-events-none absolute inset-x-1.5 bottom-1.5 flex items-center gap-1.5 rounded-full bg-oat-50/95 px-2 py-0.5 shadow-soft">
            <ProgressBar value={entry.progress} size="sm" />
            <span className="text-[10px] font-semibold text-cocoa-700">{entry.progress}%</span>
          </div>
        )}
      </div>
    </BookOnShelf>
  );
}

/** Every item sits in a slot of identical height, so each row lands on a board. */
const Slot = ({ children, className }) => (
  <div className={cn('flex shrink-0 items-end', className)} style={{ height: PERIOD, paddingBottom: BOARD }}>{children}</div>
);

/** Ribbon label with a little bow. */
function ShelfLabel({ title, count }) {
  return (
    <div className="relative inline-flex drop-shadow-[0_2px_2px_rgb(40_26_18/0.3)]">
      <TinyBow className="absolute -top-2.5 -left-3 z-10 -rotate-12" />
      <div
        className="flex items-center gap-2.5 py-1.5 pr-7 pl-6"
        style={{
          background: 'linear-gradient(180deg, #fefaf3, #f4e4c8)',
          clipPath: 'polygon(0 0, 100% 0, calc(100% - 12px) 50%, 100% 100%, 0 100%, 8px 50%)',
        }}
      >
        <h2 className="font-serif text-[19px] leading-none font-semibold whitespace-nowrap text-cocoa">{title}</h2>
        {count != null && <span className="rounded-full bg-cocoa-100 px-1.5 text-[11.5px] font-medium text-cocoa-600">{count}</span>}
      </div>
    </div>
  );
}

/** Shown on an empty shelf so it never looks like a bare box. */
function EmptyShelf({ text, onAdd, actionLabel = 'Add books', pile = true }) {
  return (
    <Slot className="min-w-0 flex-1 basis-[300px] justify-center gap-4 sm:justify-start">
      {pile && <BookPile className="hidden shrink-0 sm:block" />}
      <div className="mb-6 max-w-[260px] rounded-xl bg-oat-50/85 px-4 py-3 text-center shadow-soft sm:text-left">
        <p className="font-serif text-[17px] leading-snug text-cocoa-700 italic">{text}</p>
        {onAdd && (
          <button type="button" onClick={onAdd} className="btn-primary btn-sm mt-2.5">
            <Plus className="size-3.5" /> {actionLabel}
          </button>
        )}
      </div>
    </Slot>
  );
}

/** One wooden compartment of the bookcase. */
export function Compartment({ id, title, count, entries, loading, onAdd, onProgress, emptyText, menu, decor, decorWidth = 0 }) {
  const showDecor = decor && !loading && decorWidth > 0;
  return (
    <section id={`shelf-${id}`} className="case-back relative scroll-mt-28" style={{ '--decor-w': `${decorWidth + 24}px` }}>
      <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-8 sm:pt-5">
        <ShelfLabel title={title} count={count} />
        {menu}
      </div>
      <div
        className={cn('relative flex flex-wrap items-end gap-x-3 px-4 sm:gap-x-4 sm:px-8', showDecor && 'md:pr-[var(--decor-w)]')}
        style={{ backgroundImage: SHELF_ROWS_BG }}
      >
        {/* Decorations live in a reserved spot at the end of the first row, so they never wrap away. */}
        {showDecor && (
          <div className="pointer-events-none absolute top-0 right-6 hidden items-end gap-2 md:flex sm:right-8" style={{ height: ROW }}>
            {decor}
          </div>
        )}
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Slot key={i}><span className="skeleton block rounded-[2px]" style={{ width: 104 + (i % 3) * 6, height: 156 + (i % 4) * 8 }} /></Slot>
          ))
        ) : entries.length === 0 ? (
          <EmptyShelf text={emptyText} onAdd={onAdd} pile={id !== 'read'} />
        ) : (
          <>
            {entries.map((e) => (
              <Slot key={e.book._id}><ShelfBook entry={e} onProgress={onProgress} /></Slot>
            ))}
            {onAdd && (
              <Slot>
                <button
                  type="button"
                  onClick={onAdd}
                  aria-label={`Add books to ${title}`}
                  title="Add books"
                  className="group/add mb-0.5 flex h-[150px] w-[52px] flex-col items-center justify-center gap-2 rounded-[3px] border-2 border-dashed border-cocoa/30 bg-oat-50/20 text-cocoa-500 transition hover:border-cocoa/60 hover:bg-oat-50/60 hover:text-cocoa"
                >
                  <Plus className="size-5 transition group-hover/add:scale-110" />
                  <span className="text-[10.5px] tracking-wider uppercase [writing-mode:vertical-rl]">Add books</span>
                </button>
              </Slot>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** The carved wooden frame around the compartments. */
export function Bookcase({ children, topDecor = true, className }) {
  const items = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean);
  return (
    <div className={cn('relative pt-2', className)}>
      {topDecor && (
        <div className="pointer-events-none absolute right-10 bottom-full z-20 -mb-[30px] hidden sm:block">
          <PottedPlant />
        </div>
      )}
      {/* crown moulding */}
      <div className="case-wood relative z-10 -mx-2 h-4 rounded-t-md shadow-[0_2px_0_rgb(255_255_255/0.25)_inset] sm:-mx-3" />
      <div className="case-wood relative z-10 -mx-1 h-3 border-y border-black/10 brightness-[0.9] sm:-mx-1.5" />
      <div className="case-wood px-2.5 py-2.5 shadow-[0_18px_30px_-16px_rgb(40_26_18/0.6)] sm:px-4">
        {items.map((child, i) => (
          <div key={child.key ?? i}>
            {child}
            {i < items.length - 1 && <div className="h-2.5 sm:h-3" />}
          </div>
        ))}
      </div>
      {/* plinth and feet */}
      <div className="case-wood relative -mx-1.5 h-6 border-t border-black/15 brightness-[0.88] sm:-mx-2" />
      <div className="flex justify-between px-3">
        <span className="case-wood block h-3 w-10 rounded-b-md brightness-75" />
        <span className="case-wood block h-3 w-10 rounded-b-md brightness-75" />
      </div>
    </div>
  );
}
