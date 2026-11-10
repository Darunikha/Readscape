/*
 * Hand-drawn style decorative SVGs (bows, botanical sprigs, book stacks).
 * They only use palette colours, and are aria-hidden.
 */
import { cn } from '../../lib/utils';

const C = {
  cocoa: '#684F48',
  cocoaLight: '#C3A69A',
  rose: '#ECDFD9',
  mist: '#D6E9ED',
  mistDeep: '#A9CAD2',
  silver: '#93A8AD',
  silverDeep: '#758C92',
  oat: '#F9E7C7',
  paper: '#FEFAF3',
};

export function Bow({ className, fill = C.rose, stroke = C.cocoa }) {
  return (
    <svg viewBox="0 0 72 52" className={className} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M36 20C29 9 13 3 8 9s5 18 28 11z" fill={fill} />
      <path d="M36 20C43 9 59 3 64 9s-5 18-28 11z" fill={fill} />
      <path d="M14 11c6 1 12 4 19 8M58 11c-6 1-12 4-19 8" opacity=".45" />
      <path d="M33.5 22C30 29 25 39 18 48l5-1 2 4c4-9 8-18 10-27" fill={fill} />
      <path d="M38.5 22C42 29 47 39 54 48l-5-1-2 4c-4-9-8-18-10-27" fill={fill} />
      <ellipse cx="36" cy="20.5" rx="4" ry="4.6" fill={fill} />
    </svg>
  );
}

export function Sparkle({ className, color = C.cocoaLight }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path d="M10 0c.8 5.2 4.8 9.2 10 10-5.2.8-9.2 4.8-10 10-.8-5.2-4.8-9.2-10-10C5.2 9.2 9.2 5.2 10 0z" fill={color} />
    </svg>
  );
}

function Blossom({ x, y, r = 4.2, rot = 0 }) {
  const petals = [0, 72, 144, 216, 288];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {petals.map((a) => (
        <ellipse key={a} cx="0" cy={-r * 0.95} rx={r * 0.62} ry={r * 0.82} transform={`rotate(${a})`} fill={C.paper} stroke={C.cocoaLight} strokeWidth=".6" />
      ))}
      <circle r={r * 0.36} fill={C.oat} stroke={C.cocoa} strokeWidth=".5" />
    </g>
  );
}

function Leaf({ x, y, rot, s = 1 }) {
  return (
    <path
      d="M0 0c3-5 9-7 14-6-2 5-8 8-14 6z"
      transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}
      fill={C.silver}
      stroke={C.silverDeep}
      strokeWidth=".5"
    />
  );
}

/** A small botanical sprig with white blossoms and sage (silver veil) leaves. */
export function Sprig({ className, flip }) {
  return (
    <svg viewBox="0 0 80 100" className={cn(className, flip && '-scale-x-100')} aria-hidden>
      <g fill="none" stroke={C.silverDeep} strokeWidth="1" strokeLinecap="round">
        <path d="M40 98C40 70 36 48 26 22" />
        <path d="M39 70c6-10 14-20 26-30" />
        <path d="M38 55c-6-6-14-10-24-12" />
        <path d="M33 38c2-8 6-14 12-20" />
      </g>
      <Leaf x={39} y={84} rot={-40} s={1.2} />
      <Leaf x={40} y={78} rot={200} s={1.1} />
      <Leaf x={48} y={60} rot={-60} />
      <Leaf x={30} y={50} rot={190} />
      <Leaf x={36} y={44} rot={-80} s={0.9} />
      <Blossom x={26} y={20} r={5} rot={10} />
      <Blossom x={46} y={17} r={4} rot={30} />
      <Blossom x={66} y={38} r={4.6} rot={-10} />
      <Blossom x={13} y={42} r={4} rot={20} />
      <Blossom x={57} y={48} r={3.2} />
      <circle cx="35" cy="28" r="1.6" fill={C.paper} stroke={C.cocoaLight} strokeWidth=".6" />
      <circle cx="20" cy="33" r="1.4" fill={C.paper} stroke={C.cocoaLight} strokeWidth=".6" />
    </svg>
  );
}

function BookSpine({ x, y, w, h, color, band }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="2" fill={color} stroke={C.cocoa} strokeWidth="1" />
      <rect x={x + w - 6} y={y + 2} width="4" height={h - 4} fill={C.paper} stroke={C.cocoa} strokeWidth=".5" opacity=".9" />
      {band && <path d={`M${x + 4} ${y + 3}v${h - 6}`} stroke={C.cocoa} strokeWidth=".6" opacity=".5" />}
    </g>
  );
}

/** A stack of lying books, optionally tied with a ribbon bow. */
export function BookStack({ className, tones = ['mist', 'silver', 'rose'], ribbon = false, sprig = false }) {
  const col = (t) => ({ mist: C.mistDeep, silver: C.silver, rose: C.cocoaLight, cocoa: C.cocoa, oat: C.oat })[t] || t;
  return (
    <svg viewBox="0 0 140 110" className={className} aria-hidden>
      {sprig && (
        <g transform="translate(36 0) scale(.6)">
          <Sprig />
        </g>
      )}
      <BookSpine x={14} y={84} w={112} h={18} color={col(tones[0])} band />
      <BookSpine x={22} y={67} w={98} h={17} color={col(tones[1])} band />
      <BookSpine x={18} y={52} w={92} h={15} color={col(tones[2])} />
      {ribbon && (
        <g>
          <path d="M70 52v50" stroke={C.oat} strokeWidth="5" />
          <path d="M70 52v50" stroke={C.cocoa} strokeWidth=".6" strokeDasharray="0" opacity=".35" />
          <g transform="translate(52 38) scale(.5)"><Bow fill={C.oat} /></g>
        </g>
      )}
      <ellipse cx="70" cy="104" rx="60" ry="3" fill={C.cocoa} opacity=".08" />
    </svg>
  );
}

/** Upright books leaning together. */
export function UprightBooks({ className }) {
  return (
    <svg viewBox="0 0 140 110" className={className} aria-hidden>
      <g transform="translate(-6 20) scale(.55)"><Sprig /></g>
      {[
        [44, 30, 16, 72, C.paper],
        [61, 24, 14, 78, C.cocoaLight],
        [76, 34, 18, 68, C.silver],
        [95, 28, 13, 74, C.mistDeep],
      ].map(([x, y, w, h, color], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} rx="2" fill={color} stroke={C.cocoa} strokeWidth="1" />
          <path d={`M${x + 3} ${y + 10}h${w - 6}M${x + 3} ${y + h - 10}h${w - 6}`} stroke={C.cocoa} strokeWidth=".6" opacity=".5" />
        </g>
      ))}
      <g transform="rotate(16 118 102)">
        <rect x={110} y={34} width={14} height={68} rx="2" fill={C.cocoaLight} stroke={C.cocoa} strokeWidth="1" />
      </g>
      <ellipse cx="86" cy="104" rx="52" ry="3" fill={C.cocoa} opacity=".08" />
    </svg>
  );
}

/** Teacup with a little bow, used in the welcome banner. */
export function Teacup({ className }) {
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden>
      <path d="M86 46c14-2 20 8 14 18s-18 10-24 8" fill="none" stroke={C.cocoa} strokeWidth="1.4" />
      <path d="M86 46c10-1 14 6 10 13s-12 8-18 7" fill="none" stroke={C.cocoa} strokeWidth="1" opacity=".5" />
      <path d="M20 34h68l-6 46c-1 8-8 12-16 12H42c-8 0-15-4-16-12z" fill={C.paper} stroke={C.cocoa} strokeWidth="1.4" />
      <ellipse cx="54" cy="34" rx="34" ry="6" fill={C.oat} stroke={C.cocoa} strokeWidth="1.4" />
      <ellipse cx="54" cy="35" rx="28" ry="3.6" fill={C.cocoaLight} opacity=".55" />
      <g transform="translate(40 50) scale(.4)"><Bow fill={C.rose} /></g>
      <ellipse cx="54" cy="94" rx="40" ry="4" fill={C.cocoa} opacity=".08" />
    </svg>
  );
}

export function Flourish({ className }) {
  return (
    <svg viewBox="0 0 200 20" className={className} fill="none" stroke={C.cocoaLight} strokeWidth="1" strokeLinecap="round" aria-hidden>
      <path d="M2 12c30-10 60 8 96-2 10-3 14-8 10-9-5-1-6 6 2 9 30 10 58-6 88 2" />
    </svg>
  );
}
