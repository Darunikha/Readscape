import { useState } from 'react';
import { LoaderCircle, Star, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Sprig } from '../decor/Decor';

export const Spinner = ({ className }) => <LoaderCircle className={cn('size-4 animate-spin', className)} aria-hidden />;

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function ProgressBar({ value = 0, className, tone = 'silver', size = 'md' }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('w-full overflow-hidden rounded-full bg-cocoa-100/80', size === 'sm' ? 'h-1.5' : 'h-2.5', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-700 ease-out', tone === 'cocoa' ? 'bg-cocoa' : 'bg-silver')}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

/** Star rating. Interactive when `onChange` is given. */
export function StarRating({ value = 0, onChange, size = 'md', className }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const px = size === 'lg' ? 'size-8' : size === 'sm' ? 'size-3.5' : 'size-5';
  if (!onChange) {
    return (
      <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${value} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={cn(px, n <= Math.round(value) ? 'fill-cocoa text-cocoa' : 'fill-transparent text-cocoa-200')} />
        ))}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1', className)} role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n === value ? 0 : n)}
          className="rounded-md p-0.5 transition hover:scale-110"
        >
          <Star className={cn(px, 'transition-colors', n <= shown ? 'fill-cocoa text-cocoa' : 'fill-transparent text-cocoa-300')} />
        </button>
      ))}
    </span>
  );
}

export function Avatar({ user, size = 40, className }) {
  const name = user?.displayName || user?.username || '?';
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-cocoa/10 bg-mist font-serif font-semibold text-cocoa', className)}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {user?.avatar ? <img src={user.avatar} alt="" className="size-full object-cover" /> : initials}
    </span>
  );
}

export function EmptyState({ title, message, action, illustration, className }) {
  return (
    <div className={cn('flex flex-col items-center rounded-3xl border border-dashed border-cocoa/20 bg-oat-50/60 px-6 py-12 text-center', className)}>
      <div className="mb-4 text-cocoa">{illustration || <Sprig className="h-20 w-16" />}</div>
      <h3 className="text-2xl">{title}</h3>
      {message && <p className="mt-1.5 max-w-sm text-[15px] text-cocoa-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-2xl border border-cocoa-200 bg-cocoa-50/70 px-6 py-8 text-center', className)}>
      <p className="text-[15px] text-cocoa-700">{error?.message || 'Something went wrong.'}</p>
      {onRetry && (
        <button type="button" className="btn-secondary btn-sm" onClick={onRetry}>
          <RefreshCw className="size-3.5" /> Try again
        </button>
      )}
    </div>
  );
}

export function Field({ label, error, hint, children, className }) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {error ? <span className="mt-1 block text-[13px] text-cocoa-700">{error}</span> : hint && <span className="mt-1 block text-[13px] text-cocoa-400">{hint}</span>}
    </label>
  );
}

export function Segmented({ options, value, onChange, className, size = 'md' }) {
  return (
    <div className={cn('inline-flex rounded-full border border-cocoa/12 bg-oat-50 p-1', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          aria-label={o.ariaLabel}
          title={o.ariaLabel}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full font-medium transition',
            size === 'sm' ? 'px-2.5 py-1 text-[13px]' : 'px-3.5 py-1.5 text-sm',
            value === o.value ? 'bg-cocoa text-oat-50 shadow-soft' : 'text-cocoa-500 hover:text-cocoa',
          )}
        >
          {o.icon && <o.icon className="size-4" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
