import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { BookStackGroup, hasPhoto, hash, stackWidth, UprightBook, uprightWidth } from './SpineBooks';
import { Plus } from 'lucide-react';
import { Sparkle } from '../decor/Decor';
import { CornerBow } from '../decor/ShelfDecor';
import { cn } from '../../lib/utils';

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

/**
 * Turns a shelf's books into a natural mix of upright runs and lying stacks.
 * The pattern is seeded by the shelf so each shelf differs, and it simply
 * re-flows as books are added or removed — no fixed positions.
 */
const SPINE_GAP = 3;
const STACK_MARGIN = 16; // each side

/*
 * Only books with a verified spine PHOTO can lie in a stack (their spine is what
 * you see). Books shown by their cover or a placeholder always stand upright.
 */
export function arrange(entries, seed) {
  const n = entries.length;
  if (n <= 2) return [{ type: 'upright', items: entries }];
  const groups = [];
  let rnd = hash(seed + n);
  const next = () => { rnd = (Math.imul(rnd, 1103515245) + 12345) >>> 0; return rnd >>> 8; };
  let stackTurn = next() % 3 === 0;
  const rest = [...entries];
  while (rest.length) {
    if (stackTurn) {
      // Gather nearby photographed books (looking a few books ahead keeps order natural).
      const want = Math.min(3 + (next() % 2), rest.length);
      const picked = [];
      for (let k = 0; k < Math.min(rest.length, 8) && picked.length < want; k += 1) {
        if (hasPhoto(rest[k].book)) picked.push(rest[k]);
      }
      if (picked.length >= 2) {
        groups.push({ type: 'stack', items: picked });
        for (const p of picked) rest.splice(rest.indexOf(p), 1);
        stackTurn = false;
        continue;
      }
    }
    const size = Math.min(3 + (next() % 4), rest.length); // 3–6 upright
    groups.push({ type: 'upright', items: rest.splice(0, size) });
    stackTurn = !stackTurn;
  }
  return groups;
}

/**
 * Fits the planned groups into rows of `capacity` px. A stack that would not
 * fit on the current row becomes upright books instead, which fill the space
 * book by book — so a row never ends early and leaves a big empty gap.
 */
export function fitToRows(groups, capacity) {
  if (!capacity) return groups;

  // 1. Place groups; a stack that won't fit on the current row stands upright instead.
  const out = [];
  const rows = [{ used: 0, items: [] }]; // items: { group, entry? }
  const row = () => rows.at(-1);
  const take = (w) => { if (row().used > 0 && row().used + w > capacity) rows.push({ used: 0, items: [] }); row().used += w; };
  const placeUpright = (items) => {
    let group = out.at(-1);
    if (group?.type !== 'upright') { group = { type: 'upright', items: [] }; out.push(group); }
    for (const e of items) {
      take(uprightWidth(e.book) + SPINE_GAP);
      group.items.push(e);
      row().items.push({ group, entry: e });
    }
  };
  for (const g of groups) {
    if (g.type === 'stack') {
      const w = stackWidth(g.items) + STACK_MARGIN * 2;
      if (row().used > 0 && row().used + w > capacity) { placeUpright(g.items); continue; }
      const group = { type: 'stack', items: [...g.items] };
      out.push(group);
      take(w);
      row().items.push({ group });
    } else {
      placeUpright(g.items);
    }
  }

  // 2. Don't strand one or two books on a board of their own: tuck them onto an
  //    earlier stack (max 5 high) when that stack's row has room for any growth.
  const last = rows.at(-1);
  if (rows.length > 1 && last.items.length <= 2 && last.items.every((i) => i.entry)) {
    const loose = last.items.map((i) => i.entry);
    for (let r = rows.length - 2; r >= 0; r -= 1) {
      const stackItem = rows[r].items.find((i) => !i.entry && i.group.items.length + loose.length <= 5);
      if (!stackItem) continue;
      const grow = stackWidth([...stackItem.group.items, ...loose]) - stackWidth(stackItem.group.items);
      if (rows[r].used + grow > capacity) continue;
      stackItem.group.items.push(...loose);
      for (const i of last.items) i.group.items = i.group.items.filter((e) => e !== i.entry);
      break;
    }
  }

  // 3. Drop emptied groups and join neighbouring upright runs.
  const result = [];
  for (const g of out) {
    if (!g.items.length) continue;
    const prev = result.at(-1);
    if (g.type === 'upright' && prev?.type === 'upright') prev.items = [...prev.items, ...g.items];
    else result.push(g);
  }
  return result;
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

/** Small round "+" beside a shelf label (never takes up shelf space). */
function AddButton({ title, onAdd }) {
  if (!onAdd) return null;
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label={`Add books to ${title}`}
      title="Add books"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-oat-50/90 text-cocoa shadow-[0_3px_8px_-2px_rgb(90_50_25/0.35)] ring-1 ring-[#c99464]/40 transition hover:scale-105 hover:bg-oat-50"
    >
      <Plus className="size-4" />
    </button>
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
  // Measure the book area so the arrangement can plan full rows.
  const rowRef = useRef(null);
  const [capacity, setCapacity] = useState(0);
  useLayoutEffect(() => {
    const el = rowRef.current;
    if (!el) return undefined;
    const measure = () => setCapacity(Math.max(0, el.clientWidth - 24)); // minus px-3 padding
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <section id={`shelf-${id}`} className="relative scroll-mt-28">
      {/* small screens: label above the books */}
      <div className="flex items-center justify-between px-3 pt-4 md:hidden">
        <div className="flex items-center gap-2"><ShelfLabel title={title} count={count} /><AddButton title={title} onAdd={onAdd} /></div>
        {menu}
      </div>
      {menu && <div className="absolute top-3 right-3 z-10 hidden md:block">{menu}</div>}

      <div
        className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_230px]"
        style={{ backgroundImage: SHELF_ROWS_BG }}
      >
        <div className="hidden flex-col items-start justify-between pt-4 pl-5 md:flex" style={{ height: ROW }}>
          <div className="flex items-center gap-2"><ShelfLabel title={title} count={count} /><AddButton title={title} onAdd={entries?.length ? onAdd : undefined} /></div>
          <div className="pointer-events-none flex origin-bottom-left scale-100 items-end gap-1 xl:scale-[1.15]">{left}</div>
        </div>

        <div ref={rowRef} className="flex flex-wrap items-end justify-center px-3">
          {loading ? (
            Array.from({ length: 9 }).map((_, i) => (
              <Slot key={i} className="pr-[3px]"><span className="skeleton block rounded-[2px]" style={{ width: 30 + ((i * 7) % 16), height: 172 + ((i * 13) % 30) }} /></Slot>
            ))
          ) : entries.length === 0 ? (
            <EmptyShelf text={emptyText} onAdd={onAdd} />
          ) : (
            <>
              {/* Each upright book is its own slot so long runs can wrap book-by-book without gaps. */}
              {fitToRows(arrange(entries, id), capacity).map((g) => (
                <Fragment key={g.items[0].book._id}>
                  {g.type === 'stack' ? (
                    <Slot className="mx-4">
                      <BookStackGroup entries={g.items} onProgress={onProgress} />
                    </Slot>
                  ) : (
                    g.items.map((e) => (
                      <Slot key={e.book._id} className="pr-[3px]">
                        <UprightBook entry={e} onProgress={onProgress} />
                      </Slot>
                    ))
                  )}
                </Fragment>
              ))}
            </>
          )}
        </div>

        <div className="pointer-events-none hidden items-end justify-end pr-5 xl:flex" style={{ height: ROW }}>
          <div className="flex origin-bottom-right scale-[1.1] items-end gap-1">{right}</div>
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
