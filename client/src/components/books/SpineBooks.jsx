/*
 * Books on the shelf, shown with PHOTOGRAPHS of their real spines.
 *
 * Fallback order (nothing is ever generated or styled to imitate a spine):
 *   1. verified spine photograph  2. angled photo showing the spine
 *   3. the real front cover (labelled as a cover)  4. a labelled "unavailable" placeholder
 *
 * Photos are cropped to the spine's bounding box (found during verification)
 * and rotated 90° when a horizontal spine needs to stand upright, or vice versa.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, ExternalLink, ImageOff, Search } from 'lucide-react';
import ShelfButton from './ShelfButton';
import BookCover from './BookCover';
import { ProgressBar, StarRating } from '../ui';
import { api } from '../../lib/api';
import { authorLine, cn, SHELVES } from '../../lib/utils';

export const hash = (s = '') => [...String(s)].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5381);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const PENDING = ['queued', 'searching'];
// Set from the server's answer: when spine search isn't configured, unchecked
// books go straight to the cover fallback instead of "searching" forever.
let lookupsEnabled = true;
export const isPending = (book) => PENDING.includes(book.spine?.status) || (!book.spine?.status && lookupsEnabled);
export const hasPhoto = (book) => ['found', 'angled'].includes(book.spine?.status) && Boolean(book.spine.imageUrl || book.spine.thumbnailUrl);

/** Geometry of the spine region inside the photo. */
function photoGeom(sp, natural) {
  const W = natural?.w || sp.width || 1000;
  const H = natural?.h || sp.height || 1000;
  const [y1, x1, y2, x2] = sp.box?.length === 4 ? sp.box : [0, 0, 1000, 1000];
  const bw = Math.max(1, ((x2 - x1) / 1000) * W);
  const bh = Math.max(1, ((y2 - y1) / 1000) * H);
  return { W, H, x1, y1, bw, bh, vertical: bh >= bw, ratio: Math.max(bw, bh) / Math.min(bw, bh) };
}

/** Long-side ÷ short-side of the spine region in the photo. */
export const spineRatio = (spine) => photoGeom(spine).ratio;

// ── Dimensions (deterministic, so the shelf can plan rows) ──────────────────
export const uprightHeight = (book) => 172 + (hash(book.olId) % 6) * 6; // 172–202px
export function uprightWidth(book) {
  const h = uprightHeight(book);
  if (hasPhoto(book)) return Math.round(clamp(h / photoGeom(book.spine).ratio, 18, 64));
  return 40; // labelled placeholder (searching / no photo) — never the cover
}
export const lyingLength = (book) => 132 + (hash(book.olId) % 6) * 7; // 132–167px
export const lyingThickness = (book) => Math.round(clamp(lyingLength(book) / photoGeom(book.spine).ratio, 16, 40));
export const stackWidth = (entries) => Math.max(...entries.map((e) => lyingLength(e.book))) + 12;

/**
 * Shows the spine region of a real photo in a width×height box.
 * Crops only as much as needed and rotates when the photo's spine runs the other way.
 */
export function SpinePhoto({ spine, width, height, className, onFail }) {
  const [src, setSrc] = useState(spine.imageUrl || spine.thumbnailUrl);
  const [natural, setNatural] = useState(null);
  useEffect(() => { setSrc(spine.imageUrl || spine.thumbnailUrl); setNatural(null); }, [spine.imageUrl, spine.thumbnailUrl]);

  const g = photoGeom(spine, natural);
  const wantVertical = height >= width;
  const rotate = g.vertical !== wantVertical;
  const fw = rotate ? height : width; // frame drawn in the photo's own orientation
  const fh = rotate ? width : height;
  const scale = Math.max(fw / g.bw, fh / g.bh);
  const imgW = g.W * scale;
  const imgH = g.H * scale;
  const left = -((g.x1 / 1000) * g.W * scale) + (fw - g.bw * scale) / 2;
  const top = -((g.y1 / 1000) * g.H * scale) + (fh - g.bh * scale) / 2;
  // Vertical photo → lying: rotate -90° so the spine text reads left-to-right.
  const turn = rotate ? (g.vertical ? -90 : 90) : 0;

  const onError = () => {
    if (spine.thumbnailUrl && src !== spine.thumbnailUrl) setSrc(spine.thumbnailUrl);
    else onFail?.();
  };

  return (
    <span className={cn('relative block overflow-hidden', className)} style={{ width, height }}>
      {!natural && <span className="skeleton absolute inset-0 rounded-none" />}
      <span
        className="absolute"
        style={{ width: fw, height: fh, left: (width - fw) / 2, top: (height - fh) / 2, transform: turn ? `rotate(${turn}deg)` : undefined }}
      >
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          onError={onError}
          className={cn('absolute max-w-none transition-opacity duration-500', natural ? 'opacity-100' : 'opacity-0')}
          style={{ width: imgW, height: imgH, left, top }}
          draggable={false}
        />
      </span>
    </span>
  );
}

/** Where a spine photo came from (attribution). */
export function SpineSource({ spine, className }) {
  if (!hasPhoto({ spine })) return null;
  const by = [spine.creator && `by ${spine.creator}`, spine.license].filter(Boolean).join(' · ');
  return (
    <a href={spine.sourcePage || spine.imageUrl} target="_blank" rel="noopener noreferrer" className={cn('inline-flex items-center gap-1 text-[11.5px] text-cocoa-400 hover:text-cocoa hover:underline', className)}>
      {spine.view === 'angled' ? 'Angled photo' : 'Spine photo'}: {spine.sourceName || 'source'}{by && ` (${by})`} <ExternalLink className="size-3" />
    </a>
  );
}

/** Hover/focus card with the real cover, details, source and shelf actions. */
export function BookOnShelf({ entry, children, onProgress, className }) {
  const { book } = entry;
  return (
    <div className={cn('group/book relative', className)}>
      {children}
      <div className="absolute bottom-full left-1/2 z-30 hidden w-64 -translate-x-1/2 animate-fade pb-3 group-focus-within/book:block group-hover/book:block">
        <div className="rounded-xl border border-cocoa/10 bg-oat-50 p-3 shadow-lift">
          <div className="flex gap-3">
            <Link to={`/book/${book.olId}`} className="shrink-0" tabIndex={-1}><BookCover book={book} size="S" className="w-12" rounded="rounded-sm" /></Link>
            <div className="min-w-0">
              <Link to={`/book/${book.olId}`} className="line-clamp-2 font-serif text-[16px] leading-snug font-semibold hover:underline">{book.title}</Link>
              <p className="mt-0.5 truncate text-[12.5px] text-cocoa-500">{authorLine(book.authors)}</p>
              {entry.status === 'reading' && (
                <div className="mt-1.5 flex items-center gap-2"><ProgressBar value={entry.progress} size="sm" /><span className="text-[11px] text-cocoa-500">{entry.progress}%</span></div>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="min-w-0 text-[12px] text-cocoa-400">
              {entry.myRating ? <StarRating value={entry.myRating} size="sm" /> : entry.status ? SHELVES[entry.status].label : 'In this collection'}
            </div>
            <ShelfButton book={book} variant="icon" />
          </div>
          <div className="mt-2 border-t border-cocoa/10 pt-2">
            {hasPhoto(book) ? <SpineSource spine={book.spine} /> : (
              <p className="text-[11.5px] text-cocoa-400">
                {isPending(book) ? 'Searching for a photo of the real spine…' : 'No verified photo of this book’s spine was found.'}
              </p>
            )}
            <Link to={`/book/${book.olId}#spine`} className="mt-0.5 block text-[11.5px] font-medium text-silver-700 hover:underline">
              {hasPhoto(book) ? 'Wrong image? Fix it' : 'Add a spine photo'}
            </Link>
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

const linkProps = (book) => ({ to: `/book/${book.olId}`, 'aria-label': `${book.title} by ${authorLine(book.authors)}` });
const bookShadow = '3px 2px 6px -2px rgb(60 35 18 / 0.5), 1px 0 0 rgb(0 0 0 / 0.12)';

/**
 * Clearly labelled placeholder for a book with no verified spine photo.
 * Dashed and translucent so it can never be mistaken for a real spine;
 * the plain title is there only so you can tell which book it is.
 */
function PlaceholderSpine({ book, width, height, pending }) {
  return (
    <span
      className={cn('relative flex flex-col items-center gap-1.5 overflow-hidden rounded-[3px] border border-dashed border-cocoa/35 bg-oat-50/45 py-2 text-cocoa-500', pending && 'border-silver-600/50')}
      style={{ width, height }}
    >
      {pending && <span className="skeleton absolute inset-0 rounded-none opacity-50" />}
      {pending ? <Search className="relative size-3.5 shrink-0 animate-pulse" /> : <ImageOff className="relative size-3.5 shrink-0" />}
      <span className="relative min-h-0 flex-1 overflow-hidden text-[10px] leading-none font-medium text-ellipsis whitespace-nowrap text-cocoa-600 [writing-mode:vertical-rl]">{book.title}</span>
      <span className="relative shrink-0 text-[8px] font-semibold tracking-[0.12em] whitespace-nowrap text-cocoa-400 uppercase [writing-mode:vertical-rl]">{pending ? 'Finding spine' : 'No spine photo'}</span>
    </span>
  );
}

/** An upright book: spine photo, else front cover, else a labelled placeholder. */
export function UprightBook({ entry, onProgress }) {
  const { book } = entry;
  const [failed, setFailed] = useState(false);
  const height = uprightHeight(book);
  const width = uprightWidth(book);
  const reading = entry.status === 'reading';

  let body;
  if (hasPhoto(book) && !failed) {
    body = <SpinePhoto spine={book.spine} width={width} height={height} className="rounded-[2px]" onFail={() => setFailed(true)} />;
  } else {
    body = <PlaceholderSpine book={book} width={width} height={height} pending={isPending(book)} />;
  }

  return (
    <BookOnShelf entry={entry} onProgress={onProgress}>
      <Link
        {...linkProps(book)}
        className="relative block transition duration-300 ease-out group-hover/book:-translate-y-2 group-hover/book:brightness-[1.06] focus-visible:-translate-y-2"
        style={{ boxShadow: hasPhoto(book) && !failed ? bookShadow : undefined }}
      >
        {body}
      </Link>
      {reading && (
        <span
          className="pointer-events-none absolute -top-2.5 left-1/2 h-6 w-2 -translate-x-1/2 bg-silver transition duration-300 group-hover/book:-translate-y-2"
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)' }}
          aria-hidden
        />
      )}
    </BookOnShelf>
  );
}

/** A book lying flat in a stack — only books with a real spine photo are stacked. */
function LyingBook({ entry, offset, onProgress }) {
  const { book } = entry;
  const length = lyingLength(book);
  const thickness = lyingThickness(book);
  return (
    <BookOnShelf entry={entry} onProgress={onProgress} className="w-fit">
      <Link
        {...linkProps(book)}
        className="relative block transition duration-300 ease-out group-hover/book:translate-x-1.5 group-hover/book:brightness-[1.06]"
        style={{ marginLeft: offset, boxShadow: '0 2px 3px -1px rgb(60 35 18 / 0.5)' }}
      >
        <SpinePhoto spine={book.spine} width={length} height={thickness} className="rounded-[2px]" />
      </Link>
    </BookOnShelf>
  );
}

/** 2–4 books lying flat: longest at the bottom for a stable stack, slightly offset. */
export function BookStackGroup({ entries, onProgress }) {
  const books = [...entries]
    .map((e) => ({ entry: e, length: lyingLength(e.book), offset: ((hash(e.book.olId) >> 3) % 3) * 5 - 5 }))
    .sort((a, b) => a.length - b.length);
  return (
    <div className="flex flex-col items-center" style={{ width: stackWidth(entries) }}>
      {books.map((b) => <LyingBook key={b.entry.book._id} entry={b.entry} offset={b.offset} onProgress={onProgress} />)}
    </div>
  );
}

/**
 * Asks the server to look up spines for books never checked, and polls while
 * any are still being searched. `reload` refetches the shelf data.
 */
export function useSpineLookups(entries, reload) {
  const requested = useRef(new Set());
  const books = (entries || []).map((e) => e.book).filter(Boolean);
  const unchecked = books.filter((b) => !b.spine?.status && !requested.current.has(b.olId)).map((b) => b.olId);
  const pending = books.some((b) => isPending(b));
  const uncheckedKey = unchecked.join(',');

  useEffect(() => {
    if (!uncheckedKey) return;
    const ids = uncheckedKey.split(',');
    ids.forEach((id) => requested.current.add(id));
    api.post('/spines/request', { olIds: ids }).then((r) => {
      if (r.enabled === false) { lookupsEnabled = false; reload(); } else if (r.queued) reload();
    }).catch(() => {});
  }, [uncheckedKey, reload]);

  useEffect(() => {
    if (!pending) return undefined;
    const t = setInterval(reload, 8000);
    return () => clearInterval(t);
  }, [pending, reload]);
}
