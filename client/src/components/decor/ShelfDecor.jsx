/*
 * Small shelf ornaments for the bookcase. Drawn in palette tones (Silver Veil
 * doubles as sage foliage) with a soft, slightly vintage line.
 */
import { cn } from '../../lib/utils';
import { Bow, BookStack, Sprig } from './Decor';

const INK = '#684F48';
const LEAF = '#93A8AD';
const LEAF_DEEP = '#758C92';
const PAPER = '#FEFAF3';

function Leaf({ x, y, r = 0, s = 1, deep = false }) {
  return (
    <path
      d="M0 0C5-6 15-7 22 0C15 7 5 6 0 0Z"
      transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
      fill={deep ? LEAF_DEEP : LEAF}
      stroke={LEAF_DEEP}
      strokeWidth=".6"
    />
  );
}

/** Terracotta-rose pot with a leafy plant; `vine` adds strands trailing over the shelf edge. */
export function PottedPlant({ className, vine = true }) {
  return (
    <div className={cn('relative', className)} aria-hidden>
      <svg viewBox="0 0 90 120" className="block h-[118px] w-[88px]">
        <g>
          <path d="M45 82C44 64 40 48 30 34" fill="none" stroke={LEAF_DEEP} strokeWidth="1.2" />
          <path d="M46 82C48 62 54 46 66 32" fill="none" stroke={LEAF_DEEP} strokeWidth="1.2" />
          <path d="M45 82C45 60 45 40 46 18" fill="none" stroke={LEAF_DEEP} strokeWidth="1.2" />
          <Leaf x={30} y={34} r={-140} s={1.1} />
          <Leaf x={36} y={46} r={-160} s={1.2} deep />
          <Leaf x={40} y={62} r={-170} s={1.1} />
          <Leaf x={66} y={32} r={-40} s={1.1} deep />
          <Leaf x={58} y={46} r={-20} s={1.2} />
          <Leaf x={52} y={62} r={-5} s={1.1} deep />
          <Leaf x={46} y={18} r={-95} s={1.1} />
          <Leaf x={45} y={30} r={-60} s={0.9} deep />
          <Leaf x={45} y={40} r={-120} s={0.9} />
          <Leaf x={22} y={26} r={-110} s={0.9} deep />
          <Leaf x={72} y={22} r={-70} s={0.85} />
        </g>
        <path d="M18 80h54l-6 36c-.5 2-2 3-4 3H28c-2 0-3.5-1-4-3z" fill="#C3A69A" stroke={INK} strokeWidth="1.2" />
        <rect x="15" y="76" width="60" height="9" rx="2" fill="#DCC6BD" stroke={INK} strokeWidth="1.2" />
        <path d="M24 94h42" stroke={INK} strokeWidth=".6" opacity=".35" />
      </svg>
      {vine && (
        <svg viewBox="0 0 60 130" className="pointer-events-none absolute top-[78px] -left-2 z-20 h-[130px] w-[60px]">
          <path d="M22 4C14 30 10 56 16 84C20 102 14 116 10 128" fill="none" stroke={LEAF_DEEP} strokeWidth="1.1" />
          <path d="M30 6C34 34 30 58 36 78" fill="none" stroke={LEAF_DEEP} strokeWidth="1" />
          {[[17, 18, 200], [13, 34, -20], [12, 50, 190], [14, 66, -10], [17, 82, 200], [17, 98, -30], [13, 112, 190], [11, 124, -40], [32, 22, -20], [32, 40, 200], [33, 58, -10], [35, 74, 190]].map(([x, y, r], i) => (
            <Leaf key={i} x={x} y={y} r={r} s={0.62} deep={i % 2 === 0} />
          ))}
        </svg>
      )}
    </div>
  );
}

/** Slim bud vase with a few white blossoms. */
export function BudVase({ className }) {
  const blossoms = [[20, 22, 4.2], [33, 14, 3.6], [42, 30, 3.8], [12, 36, 3.2], [28, 32, 2.6]];
  return (
    <svg viewBox="0 0 54 120" className={cn('block h-[118px] w-[52px]', className)} aria-hidden>
      <g fill="none" stroke={LEAF_DEEP} strokeWidth="1">
        <path d="M27 82C25 60 22 40 20 22" />
        <path d="M27 82C29 58 32 34 33 14" />
        <path d="M27 82C31 64 38 46 42 30" />
        <path d="M27 82C22 66 15 50 12 36" />
      </g>
      <Leaf x={24} y={60} r={-150} s={0.7} />
      <Leaf x={30} y={52} r={-30} s={0.7} deep />
      {blossoms.map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cy={-r * 0.9} rx={r * 0.6} ry={r * 0.8} transform={`rotate(${a})`} fill={PAPER} stroke="#C3A69A" strokeWidth=".5" />
          ))}
          <circle r={r * 0.34} fill="#F9E7C7" stroke={INK} strokeWidth=".4" />
        </g>
      ))}
      <path d="M21 80h12v6c6 4 9 11 9 18 0 8-6 14-15 14S12 112 12 104c0-7 3-14 9-18z" fill="#D6E9ED" fillOpacity=".85" stroke={INK} strokeWidth="1.1" />
      <path d="M17 100c1-5 3-8 6-10" stroke={PAPER} strokeWidth="1.5" strokeLinecap="round" opacity=".9" />
    </svg>
  );
}

/** A small framed botanical print leaning against the back panel. */
export function FramedPrint({ className }) {
  return (
    <div
      className={cn('origin-bottom -rotate-[4deg] rounded-[3px] p-[6px] shadow-[3px_4px_8px_-2px_rgb(40_26_18/0.45)]', className)}
      style={{ background: 'linear-gradient(135deg, #b98a5c, #8f6441 60%, #a97b50)' }}
      aria-hidden
    >
      <div className="flex h-[96px] w-[72px] items-center justify-center bg-oat-50 p-2 shadow-[inset_0_0_0_1px_rgb(104_79_72/0.15)]">
        <Sprig className="h-full w-full" />
      </div>
    </div>
  );
}

/** A little desk globe on a brass-and-wood stand. */
export function Globe({ className }) {
  return (
    <svg viewBox="0 0 80 124" className={cn('block h-[122px] w-[78px]', className)} aria-hidden>
      <ellipse cx="40" cy="118" rx="22" ry="4" fill={INK} opacity=".18" />
      <path d="M24 116c0-6 7-9 16-9s16 3 16 9z" fill="#8f6441" stroke={INK} strokeWidth="1.1" />
      <path d="M38 108V92h4v16" fill="#b98a5c" stroke={INK} strokeWidth="1" />
      <circle cx="40" cy="54" r="30" fill="#D6E9ED" stroke={INK} strokeWidth="1.2" />
      <g fill="#93A8AD" stroke={LEAF_DEEP} strokeWidth=".6">
        <path d="M22 42c4-6 12-8 16-4s-2 8 2 12-4 10-10 8-12-8-8-16z" />
        <path d="M46 30c6-2 14 2 16 8s-4 6-8 6-6 6-10 4 0-8-2-10 1-7 4-8z" />
        <path d="M44 62c4-2 10 0 12 5s-2 12-7 12-6-6-7-10 0-6 2-7z" />
      </g>
      <path d="M40 24v60M14 48c16 6 36 6 52 0" fill="none" stroke={INK} strokeWidth=".5" opacity=".35" />
      <path d="M12 72A34 34 0 0 1 60 22" fill="none" stroke="#b98a5c" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 72A34 34 0 0 1 60 22" fill="none" stroke={INK} strokeWidth=".7" />
      <ellipse cx="31" cy="42" rx="7" ry="4" fill={PAPER} opacity=".45" transform="rotate(-30 31 42)" />
    </svg>
  );
}

/** Books lying flat, tied with a ribbon. */
export function BookPile({ className }) {
  return <BookStack className={cn('block w-[118px]', className)} tones={['#b98a5c', 'mist', 'rose']} ribbon />;
}

export function TinyBow({ className }) {
  return <Bow className={cn('h-6 w-8', className)} fill="#ECDFD9" />;
}
