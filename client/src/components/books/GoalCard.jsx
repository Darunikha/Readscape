import { useState } from 'react';
import { Pencil, Target } from 'lucide-react';
import Modal from '../ui/Modal';
import { Field, ProgressBar, Spinner } from '../ui';
import { BookStack, Bow } from '../decor/Decor';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { pluralize } from '../../lib/utils';

export function GoalModal({ open, onClose, challenge, onSaved }) {
  const toast = useToast();
  const [target, setTarget] = useState(challenge?.target || 24);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const n = Number(target);
    if (!Number.isInteger(n) || n < 1 || n > 1000) { setError('Choose a goal between 1 and 1000 books'); return; }
    setSaving(true);
    try {
      const { challenge: c } = await api.put('/challenge', { target: n, year: challenge?.year });
      toast.success(`Your ${c.year} goal is set to ${pluralize(n, 'book')}`);
      onSaved?.(c);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`${challenge?.year || new Date().getFullYear()} reading goal`} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-cocoa-500">How many books would you like to read this year? Finished books count automatically.</p>
        <Field label="Books to read" error={error}>
          <input type="number" min={1} max={1000} value={target} onChange={(e) => { setTarget(e.target.value); setError(''); }} className="input text-lg" autoFocus />
        </Field>
        <div className="flex flex-wrap gap-2">
          {[12, 24, 36, 52].map((n) => (
            <button key={n} type="button" onClick={() => setTarget(n)} className={`chip ${Number(target) === n ? 'chip-active' : 'hover:bg-mist/60'}`}>{n} books</button>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving && <Spinner />}Save goal</button>
        </div>
      </form>
    </Modal>
  );
}

/** Annual reading challenge summary card. */
export default function GoalCard({ challenge, onChange, editable = true, className = '' }) {
  const [open, setOpen] = useState(false);
  const hasGoal = Boolean(challenge?.target);
  const percent = hasGoal ? Math.min(100, Math.round((challenge.completed / challenge.target) * 100)) : 0;

  return (
    <section className={`card relative overflow-hidden p-6 ${className}`}>
      <Bow className="absolute top-3 right-4 h-9 w-12 opacity-80" />
      <BookStack className="pointer-events-none absolute -right-3 -bottom-3 hidden w-32 opacity-90 sm:block" tones={['silver', 'rose', 'mist']} />
      <div className="relative max-w-[78%] sm:max-w-[62%]">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-cocoa-100"><Target className="size-[18px] text-cocoa" /></span>
          <h2 className="font-serif text-[24px] font-semibold">Reading Goal</h2>
        </div>
        {hasGoal ? (
          <>
            <p className="mt-2 text-cocoa-500">Read {pluralize(challenge.target, 'book')} in {challenge.year}</p>
            <ProgressBar value={percent} className="mt-4" />
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <p className="font-serif text-xl font-semibold">{challenge.completed} <span className="text-cocoa-400">/ {challenge.target}</span></p>
              <p className="text-[13px] text-cocoa-400">
                {challenge.remaining === 0 ? 'Goal reached — wonderful!' : `${pluralize(challenge.remaining, 'book')} to go`}
              </p>
            </div>
            {editable && (
              <button type="button" onClick={() => setOpen(true)} className="btn-ghost btn-sm mt-2 -ml-3"><Pencil className="size-3.5" /> Adjust goal</button>
            )}
          </>
        ) : (
          <>
            <p className="mt-2 text-cocoa-500">{editable ? 'Set a gentle target for the year and watch your shelf grow.' : 'No goal set this year.'}</p>
            {editable && <button type="button" onClick={() => setOpen(true)} className="btn-primary btn-sm mt-4">Set a goal</button>}
          </>
        )}
      </div>
      {editable && open && <GoalModal open onClose={() => setOpen(false)} challenge={challenge} onSaved={onChange} />}
    </section>
  );
}
