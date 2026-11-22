import { useState } from 'react';
import { cn, coverUrl } from '../../lib/utils';

const FALLBACK_TONES = [
  { bg: '#684F48', fg: '#F9E7C7', line: '#C3A69A' },
  { bg: '#93A8AD', fg: '#FEFAF3', line: '#D6E9ED' },
  { bg: '#D6E9ED', fg: '#684F48', line: '#93A8AD' },
  { bg: '#F0D7AB', fg: '#684F48', line: '#C3A69A' },
];

const hash = (s = '') => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** A designed placeholder cover so missing covers still look intentional. */
function FallbackCover({ title, author }) {
  const tone = FALLBACK_TONES[hash(title) % FALLBACK_TONES.length];
  return (
    <div className="flex size-full flex-col items-center justify-between p-[9%] text-center" style={{ background: tone.bg, color: tone.fg }}>
      <span className="h-px w-1/2" style={{ background: tone.line }} />
      <span className="line-clamp-4 font-serif text-[clamp(11px,1.15em,20px)] leading-tight font-semibold">{title}</span>
      <span className="text-[0.62em] tracking-wider uppercase opacity-80">{author}</span>
      <span className="h-px w-1/2" style={{ background: tone.line }} />
    </div>
  );
}

export default function BookCover({ book, size = 'M', className, rounded = 'rounded-md', shadow = true }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const src = coverUrl(book?.coverId, size);
  const showImg = src && !failed;

  return (
    <div
      className={cn(
        'relative aspect-[2/3] shrink-0 overflow-hidden bg-cocoa-100 text-[12px]',
        rounded,
        shadow && 'shadow-book',
        className,
      )}
    >
      {showImg ? (
        <>
          {!loaded && <div className="skeleton absolute inset-0 rounded-none" />}
          <img
            src={src}
            alt={`Cover of ${book.title}`}
            loading="lazy"
            onLoad={(e) => {
              // Open Library serves a 1x1 placeholder for some missing covers.
              if (e.currentTarget.naturalWidth < 10) setFailed(true);
              else setLoaded(true);
            }}
            onError={() => setFailed(true)}
            className={cn('size-full object-cover transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0')}
          />
        </>
      ) : (
        <FallbackCover title={book?.title || 'Untitled'} author={book?.authors?.[0] || ''} />
      )}
      {/* subtle spine highlight */}
      <span className="pointer-events-none absolute inset-y-0 left-0 w-[6%] bg-gradient-to-r from-black/15 to-transparent" />
    </div>
  );
}
