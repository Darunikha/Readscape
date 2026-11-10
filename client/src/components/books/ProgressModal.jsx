import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { BookCheck, PartyPopper } from 'lucide-react';
import Modal from '../ui/Modal';
import BookCover from './BookCover';
import ReviewForm from './ReviewForm';
import { Field, ProgressBar, Segmented, Spinner } from '../ui';
import { Bow, Sparkle } from '../decor/Decor';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { authorLine, todayInput, toInputDate } from '../../lib/utils';

const STATUS_OPTIONS = [
  { value: 'want', label: 'Want to Read' },
  { value: 'reading', label: 'Reading' },
  { value: 'read', label: 'Read' },
];

/**
 * Reading progress editor. Finishing a book moves it to Read, records the
 * completion date and invites the reader to rate and review it.
 */
export default function ProgressModal({ entry, onClose, onChanged }) {
  const toast = useToast();
  const [step, setStep] = useState('progress'); // progress | finished
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(entry);

  useEffect(() => {
    if (!entry) return;
    setCurrent(entry);
    setStep('progress');
    setError('');
    setForm({
      status: entry.status,
      currentPage: entry.currentPage || 0,
      totalPages: entry.totalPages || '',
      startedAt: toInputDate(entry.startedAt),
      finishedAt: toInputDate(entry.finishedAt),
    });
  }, [entry]);

  if (!entry || !form) return null;
  const book = current.book;
  const total = Number(form.totalPages) || 0;
  const page = Math.min(Number(form.currentPage) || 0, total || Infinity);
  const percent = form.status === 'read' ? 100 : total ? Math.round((page / total) * 100) : 0;
  const atEnd = total > 0 && page >= total && form.status === 'reading';
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e })); setError(''); };

  const save = async (overrides = {}) => {
    const payload = {
      status: form.status,
      totalPages: form.totalPages === '' ? null : Number(form.totalPages),
      currentPage: Number(form.currentPage) || 0,
      startedAt: form.startedAt || null,
      finishedAt: form.status === 'read' ? form.finishedAt || todayInput() : form.finishedAt || null,
      ...overrides,
    };
    if (payload.totalPages !== null && (!Number.isInteger(payload.totalPages) || payload.totalPages < 1)) {
      setError('Total pages must be a positive whole number'); return null;
    }
    if (payload.totalPages && payload.currentPage > payload.totalPages) {
      setError(`Current page can’t be more than ${payload.totalPages}`); return null;
    }
    setSaving(true);
    try {
      const { entry: updated } = await api.patch(`/shelf/${entry._id}`, payload);
      setCurrent(updated);
      onChanged?.(updated);
      return updated;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const wasRead = entry.status === 'read';
    const updated = await save();
    if (!updated) return;
    if (updated.status === 'read' && !wasRead) { setStep('finished'); return; }
    toast.success(updated.status === entry.status ? 'Progress saved' : 'Shelf updated');
    onClose();
  };

  const finish = async () => {
    const updated = await save({ status: 'read', finishedAt: form.finishedAt || todayInput(), currentPage: total || Number(form.currentPage) || 0 });
    if (updated) setStep('finished');
  };

  if (step === 'finished') {
    return (
      <Modal open onClose={onClose} size="md">
        <div className="relative text-center">
          <Sparkle className="absolute top-2 left-6 size-4 animate-pulse" />
          <Sparkle className="absolute top-14 right-8 size-3 animate-pulse [animation-delay:400ms]" color="#93A8AD" />
          <Bow className="mx-auto h-14 w-20 animate-sway" />
          <p className="eyebrow mt-3 flex items-center justify-center gap-1.5"><PartyPopper className="size-3.5" /> Finished</p>
          <h2 className="mt-1 text-[30px] leading-tight">You finished <em className="italic">{book.title}</em>!</h2>
          <p className="mt-1 text-cocoa-500">It’s now on your <Link to="/shelf?shelf=read" onClick={onClose} className="font-medium text-cocoa underline underline-offset-2">Read</Link> shelf and counts towards your reading goal.</p>
        </div>
        <div className="mt-6 rounded-2xl border border-cocoa/10 bg-oat-100/70 p-5">
          <h3 className="mb-3 text-xl">Would you like to rate it?</h3>
          <ReviewForm olId={book.olId} compact submitLabel="Save rating" onSaved={() => { onChanged?.(current); onClose(); }} onCancel={onClose} />
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="Reading progress" size="md">
      <form onSubmit={submit} className="space-y-5">
        <div className="flex gap-4">
          <Link to={`/book/${book.olId}`} onClick={onClose}><BookCover book={book} className="w-20" /></Link>
          <div className="min-w-0 flex-1">
            <h3 className="text-[22px] leading-tight">{book.title}</h3>
            <p className="text-sm text-cocoa-500">{authorLine(book.authors)}</p>
            <div className="mt-3 flex items-center gap-3">
              <ProgressBar value={percent} />
              <span className="w-12 text-right font-serif text-2xl font-semibold">{percent}%</span>
            </div>
          </div>
        </div>

        <Segmented options={STATUS_OPTIONS} value={form.status} onChange={set('status')} className="w-full justify-between [&>button]:flex-1 [&>button]:justify-center" />

        {form.status !== 'want' && (
          <div className="space-y-4">
            {form.status === 'reading' && (
              <div>
                <input
                  type="range"
                  min={0}
                  max={total || 1000}
                  value={Number(form.currentPage) || 0}
                  onChange={set('currentPage')}
                  className="w-full"
                  aria-label="Current page slider"
                  disabled={!total}
                />
                {!total && <p className="text-[13px] text-cocoa-400">Add the total page count to track your percentage.</p>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {form.status === 'reading' && (
                <Field label="Current page">
                  <input type="number" min={0} max={total || undefined} value={form.currentPage} onChange={set('currentPage')} className="input" inputMode="numeric" />
                </Field>
              )}
              <Field label="Total pages" className={form.status === 'read' ? 'col-span-2' : ''}>
                <input type="number" min={1} value={form.totalPages} onChange={set('totalPages')} className="input" inputMode="numeric" placeholder="e.g. 320" />
              </Field>
              <Field label="Started">
                <input type="date" value={form.startedAt} max={todayInput()} onChange={set('startedAt')} className="input" />
              </Field>
              <Field label="Finished">
                <input type="date" value={form.finishedAt} max={todayInput()} min={form.startedAt || undefined} onChange={set('finishedAt')} className="input" />
              </Field>
            </div>
          </div>
        )}

        {atEnd && (
          <div className="flex items-center gap-3 rounded-2xl bg-mist/70 p-4 text-sm">
            <BookCheck className="size-5 shrink-0 text-silver-700" />
            <p className="flex-1 text-cocoa-700">You’ve reached the last page — ready to mark it as finished?</p>
          </div>
        )}

        {error && <p className="text-sm text-cocoa-700" role="alert">{error}</p>}

        <div className="flex flex-col-reverse gap-2 border-t border-cocoa/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          {entry.status === 'reading' && form.status === 'reading' ? (
            <button type="button" className="btn-soft" onClick={finish} disabled={saving}>
              <BookCheck className="size-4" /> Mark as finished
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1 sm:flex-none" disabled={saving}>{saving && <Spinner />}Save</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
