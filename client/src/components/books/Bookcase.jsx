import { useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, Plus } from 'lucide-react';
import ShelfButton from './ShelfButton';
import BookCover from './BookCover';
import { ProgressBar, StarRating } from '../ui';
import { Sparkle } from '../decor/Decor';
import { CornerBow } from '../decor/ShelfDecor';
import { authorLine, cn, coverUrl, SHELVES } from '../../lib/utils';

/*
 * An open honey-wood bookcase: one continuous back panel, shelf boards running
 * across it, decorations on either side and books standing face-out in the
 * middle. Boards are a repeating gradient so wrapped rows each get a shelf.
 */
export const ROW = 236; // vertical room for a row of books
export const BOARD = 24; // shelf board thickness
const PERIOD = ROW + BOARD;

const SHELF_ROWS_BG = `repeating-linear-gradient(180deg,
  rgb(90 50 25 / 0.2) 0px, rgb(90 50 25 / 0) 20px,
  rgb(90 50 25 / 0) ${ROW - 16}px, rgb(90 50 25 / 0.18) ${ROW}px,
  #f2cfa6 ${ROW}px, #e8bd91 ${ROW + 7}px,
  #d9a676 ${ROW + 7}px, #c99464 ${ROW + BOARD - 5}px,
  #a8744a ${ROW + BOARD - 5}px, #a8744a ${PERIOD}px)`;

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
 * on load); heights vary a touch so the row feels hand-arranged.
 */
export function ShelfBook({ entry, onProgress }) {
  const { book } = entry;
  const h = hash(book.olId);
  const height = 186 + (h % 5) * 5; // 186–206px
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
        <span className="pointer-events-none absolute -bottom-1.5 left-[4%] h-3 w-[100%] rounded-[50%] bg-[#5a3219]/35 blur-[4px] transition group-hover/book:opacity-40" />
        <Link
          to={`/book/${book.olId}`}
          aria-label={`${book.title} by ${authorLine(book.authors)}`}
          className="relative block size-full overflow-hidden rounded-[2px] rounded-r-[4px] shadow-[4px_4px_10px_-2px_rgb(70_40_20/0.45),1px_0_0_rgb(70_40_20/0.15)] transition group-hover/book:shadow-[8px_14px_20px_-6px_rgb(70_40_20/0.45)]"
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
              <span className="pointer-events-none absolute inset-y-0 left-0 w-[6%] bg-gradient-to-r from-black/25 via-white/10 to-transparent" />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-[#5a3219]/10" />
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

/** Every book sits in a slot of identical height, so each row lands on a board. */
const Slot = ({ children, className }) => (
  <div className={cn('flex shrink-0 items-end', className)} style={{ height: PERIOD, paddingBottom: BOARD }}>{children}</div>
);

/** Cream pill label with little sparkles, like a hand-lettered shelf tag. */
export function ShelfLabel({ title, count }) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-b from-oat-50 to-[#f8ead2] px-4 py-2 shadow-[0_3px_8px_-2px_rgb(90_50_25/0.35),inset_0_1px_0_rgb(255_255_255/0.8)] ring-1 ring-[#c99464]/40">
      <Sparkle className="size-3 shrink-0" color="#C79B66" />
      <h2 className="font-serif text-[21px] leading-none font-semibold whitespace-nowrap text-cocoa">{title}</h2>
      {count != null && <span className="text-[12px] font-medium text-cocoa-400">{count}</span>}
      <Sparkle className="size-3 shrink-0" color="#C79B66" />
    </div>
  );
}

/** Shown in the middle of an empty shelf so it never looks bare. */
function EmptyShelf({ text, onAdd }) {
  return (
    <Slot className="min-w-0 flex-1 justify-center">
      <div className="mb-10 max-w-[280px] rounded-2xl bg-oat-50/90 px-5 py-4 text-center shadow-[0_6px_16px_-6px_rgb(90_50_25/0.4)]">
        <p className="font-serif text-[18px] leading-snug text-cocoa-700 italic">{text}</p>
        {onAdd && (
          <button type="button" onClick={onAdd} className="btn-primary btn-sm mt-3">
            <Plus className="size-3.5" /> Add books
          </button>
        )}
      </div>
    </Slot>
  );
}

/**
 * One shelf of the bookcase.
 * `left` sits under the label on the left; `right` stands at the right end.
 */
export function Compartment({ id, title, count, entries, loading, onAdd, onProgress, emptyText, menu, left, right }) {
  return (
    <section id={`shelf-${id}`} className="relative scroll-mt-28">
      {/* small screens: label above the books */}
      <div className="flex items-center justify-between px-3 pt-4 md:hidden">
        <ShelfLabel title={title} count={count} />
        {menu}
      </div>
      {menu && <div className="absolute top-3 right-3 z-10 hidden md:block">{menu}</div>}

      <div
        className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_230px]"
        style={{ backgroundImage: SHELF_ROWS_BG }}
      >
        <div className="hidden flex-col items-start justify-between pt-4 pl-5 md:flex" style={{ height: ROW }}>
          <ShelfLabel title={title} count={count} />
          <div className="pointer-events-none flex origin-bottom-left scale-100 items-end gap-1 xl:scale-[1.15]">{left}</div>
        </div>

        <div className="flex flex-wrap items-end justify-center gap-x-6 px-3 lg:gap-x-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Slot key={i}><span className="skeleton block rounded-[2px]" style={{ width: 128 + (i % 3) * 6, height: 190 + (i % 3) * 6 }} /></Slot>
            ))
          ) : entries.length === 0 ? (
            <EmptyShelf text={emptyText} onAdd={onAdd} />
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
                    className="group/add mb-0.5 flex h-[176px] w-[54px] flex-col items-center justify-center gap-2 rounded-[4px] border-2 border-dashed border-oat-50/70 bg-oat-50/15 text-oat-50 transition hover:bg-oat-50/35"
                  >
                    <Plus className="size-5 drop-shadow transition group-hover/add:scale-110" />
                    <span className="text-[10.5px] tracking-wider uppercase drop-shadow [writing-mode:vertical-rl]">Add books</span>
                  </button>
                </Slot>
              )}
            </>
          )}
        </div>

        <div className="pointer-events-none hidden items-end justify-end pr-5 xl:flex" style={{ height: ROW }}>
          <div className="flex origin-bottom-right scale-[1.15] items-end gap-1">{right}</div>
        </div>
      </div>
    </section>
  );
}

/** The honey-wood frame. Shelves stack directly on a single back panel. */
export function Bookcase({ children, bow = true, className }) {
  return (
    <div className={cn('relative', className)}>
      {bow && <CornerBow className="pointer-events-none absolute -top-7 right-0 z-30 origin-top-right scale-75 rotate-[18deg] drop-shadow-[0_3px_3px_rgb(90_50_25/0.3)] sm:-top-9 sm:-right-5 sm:scale-100" />}
      {/* top board */}
      <div className="honey-wood relative z-10 -mx-2 h-5 rounded-t-[10px] shadow-[0_3px_6px_-2px_rgb(90_50_25/0.45),inset_0_2px_0_rgb(255_255_255/0.35)] sm:-mx-3" />
      <div className="honey-wood px-2.5 pb-2.5 shadow-[0_24px_40px_-20px_rgb(90_50_25/0.6)] sm:px-4">
        <div className="honey-back relative">
          <div className="window-light pointer-events-none absolute inset-0 z-[5]" aria-hidden />
          {children}
        </div>
      </div>
      {/* base */}
      <div className="honey-wood relative -mx-1.5 h-6 border-t border-[#8a5a35]/30 brightness-[0.92] sm:-mx-2" />
      <div className="flex justify-between px-4">
        <span className="honey-wood block h-3 w-12 rounded-b-md brightness-75" />
        <span className="honey-wood block h-3 w-12 rounded-b-md brightness-75" />
      </div>
    </div>
  );
}
