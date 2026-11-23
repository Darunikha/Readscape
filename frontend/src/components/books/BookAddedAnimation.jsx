import { useEffect } from 'react';
import { Check } from 'lucide-react';
import BookCover from './BookCover';

/*
 * A 3D book that spins once in the middle of the screen when a book is added to
 * a shelf, then settles and fades away. It's built from six CSS 3D faces:
 * the book's real front cover, back cover, page edges and a plain cloth binding
 * edge (deliberately blank — it is not meant to pass as the book's real spine).
 */
const W = 126; // cover width
const H = 188; // cover height
const D = 30; // thickness

const faceBase = { position: 'absolute', backfaceVisibility: 'hidden' };

const PAGES = 'repeating-linear-gradient(90deg, #f6ead2 0 2px, #e9d8b8 2px 3px)';
const PAGES_V = 'repeating-linear-gradient(0deg, #f6ead2 0 2px, #e9d8b8 2px 3px)';

export const ANIMATION_MS = 2300;

export default function BookAddedAnimation({ event, onDone }) {
  useEffect(() => {
    if (!event) return undefined;
    const t = setTimeout(onDone, ANIMATION_MS);
    return () => clearTimeout(t);
  }, [event, onDone]);

  if (!event) return null;
  const { book, label } = event;

  return (
    <div className="pointer-events-none fixed inset-0 z-[75] flex items-center justify-center" role="status" aria-live="polite">
      <div className="absolute inset-0 animate-[book-veil_2.3s_ease-in-out_both] bg-[radial-gradient(circle_at_center,rgb(249_231_199/0.75),rgb(249_231_199/0)_60%)]" />
      <div className="relative flex animate-[book-pop_2.3s_cubic-bezier(0.2,0.8,0.2,1)_both] flex-col items-center gap-9">
        <div style={{ perspective: 900 }}>
          <div
            className="relative animate-[book-turn_1.75s_cubic-bezier(0.45,0.05,0.2,1)_0.15s_both]"
            style={{ width: W, height: H, transformStyle: 'preserve-3d' }}
          >
            {/* front: the real cover */}
            <div style={{ ...faceBase, width: W, height: H, transform: `translateZ(${D / 2}px)`, boxShadow: '0 0 0 1px rgb(51 36 31 / 0.2)' }} className="overflow-hidden rounded-r-[4px] rounded-l-[2px]">
              <BookCover book={book} className="!size-full" rounded="rounded-none" shadow={false} />
              <span className="pointer-events-none absolute inset-y-0 left-0 w-[7%] bg-gradient-to-r from-black/30 via-white/10 to-transparent" />
            </div>
            {/* back cover */}
            <div style={{ ...faceBase, width: W, height: H, transform: `rotateY(180deg) translateZ(${D / 2}px)`, background: 'linear-gradient(135deg, #7f645b, #684f48)' }} className="rounded-[3px]" />
            {/* binding edge — plain cloth, no lettering */}
            <div style={{ ...faceBase, width: D, height: H, left: (W - D) / 2, transform: `rotateY(-90deg) translateZ(${W / 2}px)`, background: 'linear-gradient(90deg, #574039, #7f645b 45%, #684f48)' }} />
            {/* page edges */}
            <div style={{ ...faceBase, width: D, height: H - 8, top: 4, left: (W - D) / 2, transform: `rotateY(90deg) translateZ(${W / 2 - 2}px)`, background: PAGES }} />
            <div style={{ ...faceBase, width: W - 6, height: D, left: 3, top: (H - D) / 2, transform: `rotateX(90deg) translateZ(${H / 2 - 2}px)`, background: PAGES_V }} />
            <div style={{ ...faceBase, width: W - 6, height: D, left: 3, top: (H - D) / 2, transform: `rotateX(-90deg) translateZ(${H / 2 - 2}px)`, background: PAGES_V }} />
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-cocoa/10 bg-oat-50 px-4 py-2 text-sm font-medium text-cocoa-800 shadow-lift">
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-cocoa text-oat-50"><Check className="size-3" strokeWidth={3} /></span>
          {label}
        </div>
      </div>
    </div>
  );
}
