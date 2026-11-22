import { useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { StarRating, Spinner } from '../ui';

const RATING_WORDS = ['', 'Not for me', 'It was okay', 'Liked it', 'Really liked it', 'Loved it'];

/** Create or edit the current user's review. */
export default function ReviewForm({ olId, initial, onSaved, onCancel, submitLabel = 'Save review', compact = false }) {
  const toast = useToast();
  const [rating, setRating] = useState(initial?.rating || 0);
  const [body, setBody] = useState(initial?.body || '');
  const [spoiler, setSpoiler] = useState(Boolean(initial?.spoiler));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Choose a star rating to continue'); return; }
    setSaving(true);
    setError('');
    try {
      const { review, created } = await api.put(`/reviews/book/${olId}`, { rating, body, spoiler });
      toast.success(created ? 'Thanks for sharing your review' : 'Review updated');
      onSaved?.(review);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <StarRating value={rating} onChange={(v) => { setRating(v); setError(''); }} size="lg" />
        <span className="font-serif text-lg text-cocoa-500 italic">{RATING_WORDS[rating]}</span>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={compact ? 3 : 5}
        maxLength={5000}
        placeholder="What stayed with you? (optional)"
        className="input resize-y leading-relaxed"
        aria-label="Review"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-cocoa-500">
          <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} className="size-4 accent-cocoa" />
          Contains spoilers
        </label>
        <div className="flex gap-2">
          {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}
          <button type="submit" className="btn-primary" disabled={saving}>{saving && <Spinner />}{submitLabel}</button>
        </div>
      </div>
      {error && <p className="text-sm text-cocoa-700" role="alert">{error}</p>}
    </form>
  );
}
