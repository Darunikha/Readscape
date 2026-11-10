import { useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, Plus } from 'lucide-react';
import ShelfButton from './ShelfButton';
import BookCover from './BookCover';
import { ProgressBar, StarRating } from '../ui';
import { authorLine, cn, coverUrl, SHELVES } from '../../lib/utils';

/*
 * A physical bookcase: wooden frame, compartments with back panels, and shelf
 * boards drawn as a repeating gradient so wrapped rows each sit on a board.
 */
export const ROW = 214; // vertical space for books in a row
export const BOARD = 18; // shelf board thickness
const PERIOD = ROW + BOARD;

const SHELF_ROWS_BG = `repeating-linear-gradient(180deg,
  rgb(51 36 31 / 0.10) 0px, rgb(51 36 31 / 0) 14px,
  rgb(51 36 31 / 0) ${ROW - 8}px, rgb(51 36 31 / 0.12) ${ROW}px,
  #f6e6ca ${ROW}px, #efdab7 ${ROW + 4}px,
  #ddc097 ${ROW + 4}px, #cfae85 ${ROW + BOARD - 3}px,
  #b8936b ${ROW + BOARD - 3}px, #b8936b ${PERIOD}px)`;

const hash = (s = '') => [...s].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5381);

// Cloth-binding colours for spines without a cover: palette tints only.
const SPINE_TONES = ['#684f48', '#7f645b', '#93a8ad', '#758c92', '#5c7177', '#9c7f74', '#574039', '#aebec2'];

/** Wraps a book so hovering lifts it and reveals a small details card. */
function BookOnShelf({ entry, children, extra }) {
  const { book } = entry;
  return (
    <div className="group/book relative">
      {children}
      <div className="absolute bottom-full left-1/2 z-30 hidden w-56 -translate-x-1/2 animate-fade pb-4 group-focus-within/book:block group-hover/book:block">
        <div className="rounded-xl border border-cocoa/10 bg-oat-50 p-3 shadow-lift">
          <div className="flex gap-3">
            <Link to={`/book/${book.olId}`} className="shrink-0"><BookCover book={book} size="S" className="w-11" rounded="rounded-sm" /></Link>
            <div className="min-w-0">
              <Link to={`/book/${book.olId}`} className="line-clamp-2 font-serif text-[16px] leading-snug font-semibold hover:underline">{book.title}</Link>
              <p className="mt-0.5 truncate text-[12.5px] text-cocoa-500">{authorLine(book.authors)}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="min-w-0 text-[12px] text-cocoa-400">
              {entry.myRating ? <StarRating value={entry.myRating} size="sm" /> : entry.status ? SHELVES[entry.status].label : 'Not on a shelf'}
            </div>
            <ShelfButton book={book} variant="icon" />
          </div>
          {extra}
        </div>
      </div>
    </div>
  );
}

/** An upright book seen from the spine, cut from the real cover when available. */
export function Spine({ entry }) {
  const { book } = entry;
  const h = hash(book.olId);
  const pages = book.pageCount || 160 + (h % 340);
  const width = Math.round(Math.min(54, Math.max(28, 20 + pages / 14)));
  const height = 164 + ((h >> 4) % 7) * 7; // 164–206px
  const tone = SPINE_TONES[h % SPINE_TONES.length];
  const [coverOk, setCoverOk] = useState(Boolean(book.coverId));
  const author = book.authors?.[0]?.split(' ').at(-1) || '';

  return (
    <BookOnShelf entry={entry}>
      <Link
        to={`/book/${book.olId}`}
        aria-label={`${book.title} by ${authorLine(book.authors)}`}
        className="relative block overflow-hidden rounded-[3px] transition duration-300 ease-out group-hover/book:-translate-y-3 focus-visible:-translate-y-3"
        style={{ width, height, backgroundColor: tone, boxShadow: '3px 0 5px -1px rgb(51 36 31 / 0.35), -1px 0 0 rgb(51 36 31 / 0.25)' }}
      >
        {coverOk && (
          <img
            src={coverUrl(book.coverId, 'M')}
            alt=""
            loading="lazy"
            onLoad={(e) => e.currentTarget.naturalWidth < 10 && setCoverOk(false)}
            onError={() => setCoverOk(false)}
            className="absolute inset-0 size-full scale-[1.6] object-cover blur-[7px] saturate-[0.85]"
            style={{ objectPosition: `${15 + (h % 70)}% 50%` }}
          />
        )}
        {coverOk && <span className="absolute inset-0 bg-cocoa-900/25" />}
        <span className="spine-shade absolute inset-0" />
        <span className="absolute inset-x-0 top-[7%] h-px bg-oat/55" />
        <span className="absolute inset-x-0 top-[8.5%] h-px bg-oat/30" />
        <span className="absolute inset-x-[3px] top-[12%] bottom-[15%] flex justify-center overflow-hidden">
          <span
            className="block max-h-full overflow-hidden font-serif text-[13px] leading-none font-semibold tracking-wide text-ellipsis whitespace-nowrap text-oat-50 [writing-mode:vertical-rl]"
            style={{ textShadow: '0 1px 2px rgb(30 20 16 / 0.6)' }}
          >
            {book.title}
          </span>
        </span>
        <span className="absolute inset-x-0 bottom-[8.5%] h-px bg-oat/30" />
        <span className="absolute inset-x-0 bottom-[3%] truncate px-0.5 text-center text-[7.5px] tracking-wider text-oat-50/85 uppercase">{author.slice(0, 7)}</span>
      </Link>
    </BookOnShelf>
  );
}

/** A face-out book showing its full cover (used for books in progress). */
export function FaceOut({ entry, onProgress }) {
  const { book } = entry;
  return (
    <BookOnShelf
      entry={entry}
      extra={onProgress && (
        <button type="button" onClick={() => onProgress(entry)} className="btn-soft btn-sm mt-2.5 w-full">
          <BookOpen className="size-3.5" /> Update progress
        </button>
      )}
    >
      <div className="relative transition duration-300 ease-out group-hover/book:-translate-y-3">
        <Link to={`/book/${book.olId}`} aria-label={`${book.title} — ${entry.progress}% read`}>
          <BookCover book={book} className="w-[112px] sm:w-[124px]" rounded="rounded-[3px]" />
        </Link>
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center gap-1.5 rounded-full bg-oat-50/95 px-2 py-1 shadow-soft">
          <ProgressBar value={entry.progress} size="sm" />
          <span className="text-[10.5px] font-semibold text-cocoa-700">{entry.progress}%</span>
        </div>
      </div>
    </BookOnShelf>
  );
}

function SkeletonSpine({ i }) {
  return <div className="skeleton rounded-[3px] opacity-70" style={{ width: 30 + ((i * 7) % 18), height: 150 + ((i * 13) % 40) }} />;
}

/** Wraps every item so all rows share the same height and land on a board. */
const Slot = ({ children, className }) => (
  <div className={cn('flex items-end', className)} style={{ height: PERIOD, paddingBottom: BOARD }}>{children}</div>
);

/** One compartment of the bookcase. */
export function Compartment({ id, title, count, entries, loading, faceOut, onAdd, onProgress, emptyText, menu }) {
  return (
    <section id={`shelf-${id}`} className="bookcase-panel scroll-mt-28">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-7 sm:pt-5">
        <div className="plaque inline-flex items-center gap-2.5 rounded-md px-3.5 py-1.5">
          <span className="size-1 rounded-full bg-cocoa-300" />
          <h2 className="font-serif text-[19px] leading-none font-semibold">{title}</h2>
          {count != null && <span className="text-[12px] text-cocoa-400">{count}</span>}
          <span className="size-1 rounded-full bg-cocoa-300" />
        </div>
        {menu}
      </div>
      <div
        className={cn('flex flex-wrap items-end px-4 sm:px-7', faceOut ? 'gap-x-5 sm:gap-x-7' : 'gap-x-[3px]')}
        style={{ backgroundImage: SHELF_ROWS_BG }}
      >
        {loading ? (
          Array.from({ length: faceOut ? 3 : 12 }).map((_, i) => (
            <Slot key={i}>{faceOut ? <div className="skeleton h-[170px] w-[118px] rounded-[3px]" /> : <SkeletonSpine i={i} />}</Slot>
          ))
        ) : (
          <>
            {entries.map((e) => (
              <Slot key={e.book._id}>{faceOut ? <FaceOut entry={e} onProgress={onProgress} /> : <Spine entry={e} />}</Slot>
            ))}
            {entries.length === 0 && (
              <Slot className="flex-1 justify-center">
                <p className="mb-14 max-w-xs text-center font-serif text-lg text-cocoa-400 italic">{emptyText}</p>
              </Slot>
            )}
            {onAdd && (
              <Slot className={entries.length ? 'ml-3' : ''}>
                <button
                  type="button"
                  onClick={onAdd}
                  aria-label={`Add books to ${title}`}
                  className="group/add flex h-[150px] w-[46px] flex-col items-center justify-center gap-2 rounded-[3px] border-2 border-dashed border-cocoa/25 text-cocoa-400 transition hover:border-cocoa/50 hover:bg-oat-50/50 hover:text-cocoa"
                >
                  <Plus className="size-5 transition group-hover/add:scale-110" />
                  <span className="text-[11px] tracking-wider uppercase [writing-mode:vertical-rl]">Add books</span>
                </button>
              </Slot>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** The wooden frame around all compartments. */
export function Bookcase({ children }) {
  const items = Array.isArray(children) ? children.flat().filter(Boolean) : [children];
  return (
    <div className="relative pb-4">
      {/* crown */}
      <div className="bookcase-frame relative z-10 -mx-1.5 h-5 rounded-t-lg shadow-[0_4px_8px_-4px_rgb(51_36_31/0.4)] sm:-mx-2.5 sm:h-6" />
      <div className="bookcase-frame px-2 sm:px-4">
        {items.map((child, i) => (
          <div key={child.key ?? i}>
            {child}
            <div className={cn('wood-grain-h bg-[#d2b189] shadow-[0_3px_6px_-2px_rgb(51_36_31/0.35)]', i === items.length - 1 ? 'h-3' : 'h-3.5 sm:h-4')} />
          </div>
        ))}
      </div>
      {/* plinth */}
      <div className="bookcase-frame -mx-1 h-7 rounded-b-md shadow-[0_14px_24px_-12px_rgb(51_36_31/0.55)] brightness-[0.93] sm:-mx-1.5" />
    </div>
  );
}
