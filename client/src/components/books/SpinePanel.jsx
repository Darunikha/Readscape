import { useEffect, useState } from 'react';
import { ImageOff, RefreshCw, Search, ThumbsDown, Upload } from 'lucide-react';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useShelf } from '../../context/ShelfContext';
import Modal from '../ui/Modal';
import { ErrorState, Field, Skeleton, Spinner } from '../ui';
import { hasPhoto, SpinePhoto, SpineSource, spineRatio } from './SpineBooks';

const STATUS_TEXT = {
  queued: 'Waiting to search for a photo of the real spine…',
  searching: 'Searching for and verifying spine photographs…',
  found: 'Verified photograph of the real spine.',
  angled: 'Verified photograph of the book at an angle, showing its spine.',
  unavailable: 'No authentic spine photograph was found for this edition. The bookshelf shows the front cover instead.',
  error: 'The last search failed. You can try again.',
};

function EditionDetails({ edition }) {
  const rows = [
    ['ISBN-13', edition?.isbn13],
    ['ISBN-10', edition?.isbn10],
    ['Publisher', edition?.publisher],
    ['Published', edition?.publishDate || edition?.year],
  ];
  if (!rows.some(([, v]) => v)) return <p className="text-sm text-cocoa-400">Edition details haven’t been looked up yet.</p>;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {rows.filter(([, v]) => v).map(([k, v]) => (
        <div key={k} className="contents"><dt className="text-cocoa-400">{k}</dt><dd className="font-medium text-cocoa-700">{v}</dd></div>
      ))}
    </dl>
  );
}

function ManualModal({ open, onClose, olId, onSaved }) {
  const toast = useToast();
  const [imageUrl, setImageUrl] = useState('');
  const [sourcePage, setSourcePage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setImageUrl(''); setSourcePage(''); setError(''); } }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api.put(`/books/${olId}/spine`, { imageUrl, sourcePage });
      toast.success('Spine photo saved');
      onSaved(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Use your own spine photo" size="md">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-cocoa-500">Paste a direct link to a genuine photograph of this edition’s spine. Please only use images you’re allowed to use, and include the page it came from so it can be credited.</p>
        <Field label="Image link (https://…jpg / png / webp)">
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="input" placeholder="https://…" required autoFocus />
        </Field>
        <Field label="Source page (for attribution)" hint="Where you found the photo">
          <input value={sourcePage} onChange={(e) => setSourcePage(e.target.value)} className="input" placeholder="https://…" />
        </Field>
        {error && <p className="text-sm text-cocoa-700" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy && <Spinner />}Save photo</button>
        </div>
      </form>
    </Modal>
  );
}

function EditionModal({ open, onClose, olId, current, onSaved }) {
  const toast = useToast();
  const { data, error, reload } = useApi(open ? `/books/${olId}/editions` : null);
  const [busy, setBusy] = useState('');
  const [showAll, setShowAll] = useState(false);

  const choose = async (key) => {
    setBusy(key);
    try {
      const res = await api.put(`/books/${olId}/edition`, { olEditionKey: key });
      toast.success('Edition updated — searching for its spine');
      onSaved(res);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const list = (data?.editions || []).filter((e) => showAll || e.english);
  return (
    <Modal open={open} onClose={onClose} title="Which edition do you own?" size="lg">
      <p className="mb-3 text-sm text-cocoa-500">Spines differ between editions. Pick yours and Readscape will look for a photo of that edition’s spine.</p>
      {error ? <ErrorState error={error} onRetry={reload} /> : !data ? <Skeleton className="h-40" /> : (
        <>
          <ul className="max-h-[50vh] divide-y divide-cocoa/8 overflow-y-auto">
            {list.map((e) => (
              <li key={e.olEditionKey} className="flex items-center gap-3 py-2.5">
                {e.coverId ? <img src={`https://covers.openlibrary.org/b/id/${e.coverId}-S.jpg`} alt="" className="h-14 w-10 shrink-0 rounded-sm object-cover shadow-soft" /> : <span className="flex h-14 w-10 shrink-0 items-center justify-center rounded-sm bg-cocoa-50"><ImageOff className="size-4 text-cocoa-300" /></span>}
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-cocoa-800">{e.publisher || 'Unknown publisher'}{e.year ? ` · ${e.year}` : ''}</p>
                  <p className="text-cocoa-400">{[e.isbn13 && `ISBN-13 ${e.isbn13}`, e.isbn10 && `ISBN-10 ${e.isbn10}`].filter(Boolean).join(' · ')}</p>
                </div>
                {current === e.olEditionKey ? (
                  <span className="rounded-full bg-mist px-3 py-1 text-[13px]">Current</span>
                ) : (
                  <button type="button" className="btn-secondary btn-sm" disabled={Boolean(busy)} onClick={() => choose(e.olEditionKey)}>{busy === e.olEditionKey && <Spinner />}Choose</button>
                )}
              </li>
            ))}
            {!list.length && <li className="py-6 text-center text-cocoa-400">No editions with an ISBN were found.</li>}
          </ul>
          {!showAll && data.editions.some((e) => !e.english) && (
            <button type="button" className="mt-2 text-sm font-medium text-silver-700 hover:underline" onClick={() => setShowAll(true)}>Show editions in other languages</button>
          )}
        </>
      )}
    </Modal>
  );
}

/** Book page section: the edition and its real spine photograph, with manual controls. */
export default function SpinePanel({ olId }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { bump } = useShelf();
  const { data, error, reload, setData } = useApi(`/books/${olId}/spine`);
  const [busy, setBusy] = useState('');
  const [modal, setModal] = useState(null);
  const status = data?.spine?.status;
  const pending = ['queued', 'searching'].includes(status);

  useEffect(() => {
    if (!pending) return undefined;
    const t = setInterval(reload, 5000);
    return () => clearInterval(t);
  }, [pending, reload]);

  useEffect(() => { if (data && !pending) bump(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Links like /book/OL…W#spine (from the shelf's hover card) scroll here.
  const loaded = Boolean(data);
  useEffect(() => {
    if (loaded && window.location.hash === '#spine') document.getElementById('spine')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [loaded]);

  const act = async (kind) => {
    if (kind === 'reject') {
      const ok = await confirm({ title: 'Is this the wrong image?', message: 'It will be removed, never used again for this book, and a new search will start.', confirmLabel: 'Remove image', danger: true });
      if (!ok) return;
    }
    setBusy(kind);
    try {
      setData(await api.post(`/books/${olId}/spine/${kind}`));
      toast.info(kind === 'reject' ? 'Image removed — searching again' : 'Searching again');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <Skeleton className="h-48 rounded-2xl" />;
  const { spine = {}, edition } = data;
  const photo = hasPhoto({ spine });

  return (
    <section id="spine" className="card scroll-mt-28 p-6">
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex h-[280px] w-[120px] shrink-0 items-center justify-center rounded-xl bg-[#dca47a]/40">
          {photo ? (
            <SpinePhoto key={spine.imageUrl} spine={spine} width={Math.round(Math.max(28, Math.min(110, 260 / spineRatio(spine))))} height={260} className="rounded-[3px] shadow-[3px_3px_8px_-2px_rgb(60_35_18/0.5)]" />
          ) : pending ? (
            <Spinner className="size-6 text-cocoa-400" />
          ) : (
            <span className="flex flex-col items-center gap-2 px-2 text-center text-[12px] text-cocoa-500"><ImageOff className="size-5" />No spine photo</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h2 className="font-serif text-[24px] font-semibold">Spine & edition</h2>
            <p className="mt-1 text-sm text-cocoa-500">{STATUS_TEXT[status] || (data.enabled ? 'Not checked yet.' : 'Spine photo search isn’t configured on this server.')}</p>
            {photo && <SpineSource spine={spine} className="mt-1" />}
            {spine.verifiedBy && photo && <p className="text-[11.5px] text-cocoa-400">{spine.verifiedBy === 'user' ? 'Added manually by a reader.' : `Checked automatically against the edition’s cover${spine.confidence ? ` (confidence ${Math.round(spine.confidence * 100)}%)` : ''}.`}</p>}
          </div>
          <EditionDetails edition={edition} />
          <div className="flex flex-wrap gap-2">
            {photo && <button type="button" className="btn-secondary btn-sm" disabled={Boolean(busy)} onClick={() => act('reject')}>{busy === 'reject' ? <Spinner /> : <ThumbsDown className="size-3.5" />}Wrong image</button>}
            {data.enabled && !pending && <button type="button" className="btn-secondary btn-sm" disabled={Boolean(busy)} onClick={() => act('retry')}>{busy === 'retry' ? <Spinner /> : <RefreshCw className="size-3.5" />}Search again</button>}
            <button type="button" className="btn-secondary btn-sm" onClick={() => setModal('manual')}><Upload className="size-3.5" />Use my own photo</button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setModal('edition')}><Search className="size-3.5" />Change edition</button>
          </div>
        </div>
      </div>
      <ManualModal open={modal === 'manual'} onClose={() => setModal(null)} olId={olId} onSaved={setData} />
      <EditionModal open={modal === 'edition'} onClose={() => setModal(null)} olId={olId} current={edition?.olEditionKey} onSaved={setData} />
    </section>
  );
}
