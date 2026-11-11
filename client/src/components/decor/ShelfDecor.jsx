/*
 * Shelf ornaments for the bookcase, in a soft, slightly vintage illustrated
 * style. Colours stay within the palette: Creamy Oat ceramics, Winter Mist
 * glass, Silver Veil sage foliage and Cocoa Rose line work.
 */
import { cn } from '../../lib/utils';
import { Bow, Sprig } from './Decor';

const INK = '#684F48';
const LEAF = '#93A8AD';
const LEAF_DEEP = '#758C92';
const LEAF_DARK = '#5C7177';
const PAPER = '#FEFAF3';
const CERAMIC = '#FBF3E4';
const CERAMIC_SHADE = '#EEDCBE';

function Leaf({ x, y, r = 0, s = 1, tone = 0 }) {
  return (
    <path
      d="M0 0C5-6 15-7 22 0C15 7 5 6 0 0Z"
      transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
      fill={[LEAF, LEAF_DEEP, LEAF_DARK][tone % 3]}
      stroke={LEAF_DARK}
      strokeWidth=".5"
    />
  );
}

function Blossom({ x, y, r = 3.4 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cy={-r * 0.9} rx={r * 0.6} ry={r * 0.8} transform={`rotate(${a})`} fill={PAPER} stroke="#C3A69A" strokeWidth=".45" />
      ))}
      <circle r={r * 0.34} fill="#F0D7AB" stroke={INK} strokeWidth=".35" />
    </g>
  );
}

/** Trailing pothos in a cream pot. `trail` = how far the vines hang (px). */
export function TrailingPlant({ className, trail = 120, side = 'left' }) {
  const strands = side === 'left' ? [[26, -1], [44, 1]] : [[62, 1], [44, -1]];
  return (
    <div className={cn('relative', className)} aria-hidden>
      <svg viewBox="0 0 90 112" className="block h-[112px] w-[90px]">
        {[[45, 20, -95, 1.2], [30, 30, -140, 1.2], [60, 28, -40, 1.2], [22, 46, -170, 1.1], [68, 44, -10, 1.1], [38, 40, -120, 1], [52, 38, -60, 1], [45, 50, -90, 0.9], [14, 34, -150, 0.9], [76, 32, -30, 0.9]].map(([x, y, r, s], i) => (
          <Leaf key={i} x={x} y={y} r={r} s={s} tone={i} />
        ))}
        <path d="M16 62h58l-5 40c-1 6-6 9-12 9H33c-6 0-11-3-12-9z" fill={CERAMIC} stroke={INK} strokeWidth="1.1" />
        <path d="M16 62h58v5H16z" fill={CERAMIC_SHADE} stroke={INK} strokeWidth="1.1" />
        <path d="M24 74c2 14 4 24 9 30" stroke={PAPER} strokeWidth="3" strokeLinecap="round" opacity=".9" fill="none" />
      </svg>
      <svg viewBox={`0 0 90 ${trail}`} className="pointer-events-none absolute top-[60px] left-0 z-20" style={{ width: 90, height: trail }}>
        {strands.map(([x0, dir], si) => {
          const pts = Array.from({ length: Math.floor(trail / 14) }, (_, i) => [x0 + Math.sin(i * 0.9 + si) * 6 * dir, 6 + i * 14]);
          return (
            <g key={si}>
              <path d={`M${pts.map((p) => p.join(' ')).join(' L')}`} fill="none" stroke={LEAF_DEEP} strokeWidth="1" />
              {pts.map(([x, y], i) => <Leaf key={i} x={x} y={y} r={i % 2 ? 200 : -20} s={0.62} tone={i + si} />)}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** A sleeping cream cat curled on a little stack of books. */
export function CatOnBooks({ className }) {
  return (
    <svg viewBox="0 0 140 104" className={cn('block h-[104px] w-[140px]', className)} aria-hidden>
      <ellipse cx="70" cy="101" rx="62" ry="3" fill={INK} opacity=".16" />
      <rect x="10" y="80" width="118" height="19" rx="2" fill="#A9CAD2" stroke={INK} strokeWidth="1" />
      <rect x="118" y="82" width="7" height="15" fill={PAPER} stroke={INK} strokeWidth=".5" />
      <rect x="18" y="64" width="104" height="16" rx="2" fill={CERAMIC} stroke={INK} strokeWidth="1" />
      <rect x="113" y="66" width="6" height="12" fill={PAPER} stroke={INK} strokeWidth=".5" />
      <path d="M22 68h88" stroke={INK} strokeWidth=".5" opacity=".3" />
      {/* cat */}
      <path d="M44 64c-4-16 8-30 30-30 20 0 34 10 34 22 0 6-3 8-6 8z" fill={PAPER} stroke={INK} strokeWidth="1.1" />
      <path d="M104 60c8 0 10-6 4-8" fill="none" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M70 40c4 6 4 14 0 20M82 38c3 6 3 14 0 22" stroke="#DCC6BD" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <ellipse cx="44" cy="52" rx="15" ry="12.5" fill={PAPER} stroke={INK} strokeWidth="1.1" />
      <path d="M32 46l-2-12 9 7M50 41l7-8 1 12" fill={PAPER} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M33 39l1 4M54 37l-2 4" stroke="#C3A69A" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M36 52q3 2 6 0M46 52q3 2 6 0" fill="none" stroke={INK} strokeWidth=".9" strokeLinecap="round" />
      <path d="M43 56l1 1 1-1" fill="none" stroke={INK} strokeWidth=".8" />
      <ellipse cx="34" cy="57" rx="2.6" ry="1.4" fill="#ECDFD9" />
      <ellipse cx="54" cy="57" rx="2.6" ry="1.4" fill="#ECDFD9" />
      <path d="M40 64c2-3 8-3 10 0" fill={PAPER} stroke={INK} strokeWidth="1" />
    </svg>
  );
}

/** Glass jar of white flowers tied with a ribbon. */
export function JarBouquet({ className }) {
  const flowers = [[30, 30, 4.6], [44, 18, 4.2], [58, 26, 4.8], [72, 16, 4], [84, 30, 4.4], [24, 48, 3.8], [40, 40, 3.6], [64, 42, 4], [90, 48, 3.6], [52, 34, 3.2], [78, 40, 3.4], [34, 22, 3], [60, 12, 3.2]];
  return (
    <svg viewBox="0 0 112 172" className={cn('block h-[170px] w-[110px]', className)} aria-hidden>
      <g fill="none" stroke={LEAF_DEEP} strokeWidth=".9">
        {flowers.map(([x, y], i) => <path key={i} d={`M56 110C${(56 + x) / 2} ${(110 + y) / 2 + 10} ${x} ${y + 12} ${x} ${y}`} />)}
      </g>
      {[[34, 62, -150], [74, 60, -30], [48, 74, -120], [66, 76, -60]].map(([x, y, r], i) => <Leaf key={i} x={x} y={y} r={r} s={0.75} tone={i} />)}
      {flowers.map(([x, y, r], i) => <Blossom key={i} x={x} y={y} r={r} />)}
      <path d="M36 98h40v6c8 4 12 12 12 24v30c0 6-4 10-10 10H34c-6 0-10-4-10-10v-30c0-12 4-20 12-24z" fill="#D6E9ED" fillOpacity=".55" stroke={INK} strokeWidth="1.1" />
      <path d="M30 140h52v16c0 5-3 8-8 8H38c-5 0-8-3-8-8z" fill="#A9CAD2" fillOpacity=".35" />
      <path d="M33 118c-2 10-2 26 1 38" stroke={PAPER} strokeWidth="3" strokeLinecap="round" opacity=".8" fill="none" />
      <g transform="translate(36 92) scale(.56)"><Bow fill="#F9E7C7" /></g>
    </svg>
  );
}

/** A loose row of upright books, one leaning. */
export function UprightSpines({ className, flip = false }) {
  const books = [
    [8, 56, 18, 92, '#D6E9ED'],
    [27, 44, 16, 104, CERAMIC],
    [44, 50, 20, 98, '#93A8AD'],
    [65, 40, 15, 108, PAPER],
    [81, 52, 18, 96, '#7F645B'],
  ];
  return (
    <svg viewBox="0 0 128 152" className={cn('block h-[150px] w-[126px]', flip && '-scale-x-100', className)} aria-hidden>
      <ellipse cx="64" cy="149" rx="60" ry="3" fill={INK} opacity=".16" />
      {books.map(([x, y, w, h, c], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} rx="2" fill={c} stroke={INK} strokeWidth="1" />
          <path d={`M${x + 3} ${y + 12}h${w - 6}M${x + 3} ${y + 15}h${w - 6}M${x + 3} ${y + h - 14}h${w - 6}`} stroke={i === 4 ? '#F9E7C7' : INK} strokeWidth=".6" opacity=".55" />
          <rect x={x + 4} y={y + 30} width={w - 8} height="14" rx="1" fill="none" stroke={i === 4 ? '#F9E7C7' : INK} strokeWidth=".5" opacity=".45" />
        </g>
      ))}
      <g transform="rotate(18 118 148)">
        <rect x="104" y="46" width="16" height="102" rx="2" fill="#C3A69A" stroke={INK} strokeWidth="1" />
        <path d="M107 58h10M107 61h10" stroke={INK} strokeWidth=".6" opacity=".5" />
      </g>
    </svg>
  );
}

/** Round cream vase of daisies. */
export function DaisyVase({ className }) {
  const flowers = [[30, 34, 6], [50, 22, 6.4], [72, 30, 6], [88, 46, 5.4], [18, 52, 5.2], [42, 46, 5], [64, 50, 5.2], [58, 12, 4.6], [80, 18, 4.4], [24, 24, 4.2]];
  return (
    <svg viewBox="0 0 108 160" className={cn('block h-[158px] w-[106px]', className)} aria-hidden>
      <ellipse cx="54" cy="157" rx="34" ry="3" fill={INK} opacity=".16" />
      <g fill="none" stroke={LEAF_DEEP} strokeWidth="1">
        {flowers.map(([x, y], i) => <path key={i} d={`M54 104C${(54 + x) / 2} ${(104 + y) / 2} ${x} ${y + 14} ${x} ${y}`} />)}
      </g>
      {[[38, 80, -150], [70, 80, -30], [46, 70, -110], [62, 66, -70]].map(([x, y, r], i) => <Leaf key={i} x={x} y={y} r={r} s={0.85} tone={i} />)}
      {flowers.map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          {Array.from({ length: 10 }, (_, k) => (
            <ellipse key={k} cy={-r} rx={r * 0.32} ry={r * 0.75} transform={`rotate(${k * 36})`} fill={PAPER} stroke="#C3A69A" strokeWidth=".35" />
          ))}
          <circle r={r * 0.42} fill="#F0D7AB" stroke={INK} strokeWidth=".4" />
        </g>
      ))}
      <path d="M42 96h24v6c14 6 22 18 22 30 0 14-12 24-34 24S20 146 20 132c0-12 8-24 22-30z" fill={CERAMIC} stroke={INK} strokeWidth="1.1" />
      <path d="M30 120c-3 8-2 18 4 26" stroke={PAPER} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M40 96h28" stroke={INK} strokeWidth="1.1" />
    </svg>
  );
}

/** A small framed botanical print on a stand. */
export function FramedPrint({ className }) {
  return (
    <div className={cn('relative origin-bottom -rotate-[3deg]', className)} aria-hidden>
      <div
        className="rounded-[3px] p-[7px] shadow-[4px_6px_10px_-3px_rgb(40_26_18/0.45)]"
        style={{ background: 'linear-gradient(135deg, #e9c89a, #c79b66 45%, #e3bd8c 70%, #b98a5c)' }}
      >
        <div className="flex h-[118px] w-[92px] items-center justify-center bg-oat-50 p-2.5 shadow-[inset_0_0_0_1px_rgb(104_79_72/0.18)]">
          <Sprig className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}

/** Glass candle jar with a ribbon bow. */
export function CandleJar({ className }) {
  return (
    <svg viewBox="0 0 80 96" className={cn('block h-[94px] w-[78px]', className)} aria-hidden>
      <ellipse cx="40" cy="93" rx="30" ry="3" fill={INK} opacity=".16" />
      <path d="M40 34c-4-6 0-12 0-16 3 4 6 9 0 16z" fill="#F0D7AB" stroke={INK} strokeWidth=".7" />
      <circle cx="40" cy="30" r="9" fill="#F9E7C7" opacity=".35" />
      <path d="M40 34v6" stroke={INK} strokeWidth="1" />
      <rect x="18" y="40" width="44" height="50" rx="8" fill="#D6E9ED" fillOpacity=".5" stroke={INK} strokeWidth="1.1" />
      <rect x="22" y="46" width="36" height="40" rx="5" fill={CERAMIC} stroke={INK} strokeWidth=".6" opacity=".95" />
      <path d="M24 52c-1 10-1 22 1 30" stroke={PAPER} strokeWidth="3" strokeLinecap="round" fill="none" />
      <g transform="translate(19 30) scale(.58)"><Bow fill="#F9E7C7" /></g>
    </svg>
  );
}

/** Books lying flat, cream and mist. */
export function LyingBooks({ className, count = 3 }) {
  const books = [
    [6, 104, 128, 20, '#D6E9ED'],
    [14, 84, 114, 20, CERAMIC],
    [8, 66, 118, 18, '#93A8AD'],
    [18, 50, 100, 16, PAPER],
  ].slice(0, count);
  const top = books.at(-1)[1];
  return (
    <svg viewBox={`0 ${top - 4} 140 ${128 - top}`} className={cn('block w-[136px]', className)} aria-hidden>
      <ellipse cx="70" cy="125" rx="64" ry="3" fill={INK} opacity=".16" />
      {books.map(([x, y, w, h, c], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} rx="2" fill={c} stroke={INK} strokeWidth="1" />
          <rect x={x + w - 8} y={y + 2.5} width="6" height={h - 5} fill={PAPER} stroke={INK} strokeWidth=".5" />
          <path d={`M${x + 8} ${y + 3}v${h - 6}M${x + 11} ${y + 3}v${h - 6}`} stroke={INK} strokeWidth=".5" opacity=".35" />
        </g>
      ))}
    </svg>
  );
}

/** Vintage desk globe on a brass stand. */
export function Globe({ className }) {
  return (
    <svg viewBox="0 0 100 150" className={cn('block h-[148px] w-[98px]', className)} aria-hidden>
      <ellipse cx="50" cy="146" rx="28" ry="3.5" fill={INK} opacity=".18" />
      <path d="M30 144c0-7 9-11 20-11s20 4 20 11z" fill="#B98A5C" stroke={INK} strokeWidth="1.1" />
      <path d="M47 133v-18h6v18" fill="#C79B66" stroke={INK} strokeWidth="1" />
      <circle cx="50" cy="66" r="38" fill="#F6E6CA" stroke={INK} strokeWidth="1.2" />
      <g fill="#DCC6BD" stroke="#9C7F74" strokeWidth=".6">
        <path d="M26 52c5-8 15-10 20-5s-3 10 3 15-5 13-13 10-15-10-10-20z" />
        <path d="M58 36c8-3 18 2 20 10s-5 8-10 8-8 8-13 5 0-10-3-13 1-8 6-10z" />
        <path d="M56 78c5-3 13 0 15 6s-3 15-9 15-8-8-9-13 0-7 3-8z" />
      </g>
      <path d="M50 28v76M13 62c22 8 52 8 74 0M18 84c18 6 46 6 64 0M18 44c18-6 46-6 64 0" fill="none" stroke={INK} strokeWidth=".45" opacity=".3" />
      <path d="M14 92A44 44 0 0 1 76 30" fill="none" stroke="#C79B66" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M14 92A44 44 0 0 1 76 30" fill="none" stroke={INK} strokeWidth=".7" />
      <ellipse cx="38" cy="50" rx="9" ry="5" fill={PAPER} opacity=".5" transform="rotate(-30 38 50)" />
    </svg>
  );
}

/** Large ribbon bow for the bookcase corner. */
export function CornerBow({ className }) {
  return <Bow className={cn('h-[88px] w-[124px]', className)} fill="#F9E7C7" stroke="#B98A5C" />;
}
