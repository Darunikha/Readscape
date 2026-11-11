import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, BookOpen, Calendar, FileText, Users } from 'lucide-react';
import { useApi } from '../lib/useApi';
import { api } from '../lib/api';
import { useShelf } from '../context/ShelfContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import BookCover from '../components/books/BookCover';
import ShelfButton from '../components/books/ShelfButton';
import ReviewForm from '../components/books/ReviewForm';
import ReviewCard from '../components/books/ReviewCard';
import SpinePanel from '../components/books/SpinePanel';
import { EmptyState, ErrorState, ProgressBar, Segmented, Skeleton, StarRating } from '../components/ui';
import { Bow, Sprig } from '../components/decor/Decor';
import { formatDate, pluralize } from '../lib/utils';

function RatingSummary({ stats, olRating }) {
  const max = Math.max(1, ...Object.values(stats.distribution));
  return (
    <div className="card grid gap-6 p-6 sm:grid-cols-[auto_1fr]">
      <div className="text-center sm:pr-6 sm:text-left">
        <p className="font-serif text-6xl leading-none font-semibold">{stats.average ? stats.average.toFixed(1) : '—'}</p>
        <StarRating value={stats.average || 0} className="mt-2" />
        <p className="mt-1 text-sm text-cocoa-500">{pluralize(stats.count, 'Readscape review')}</p>
        {olRating?.average && <p className="mt-2 text-[12.5px] text-cocoa-400">Open Library: {olRating.average.toFixed(1)} ★ ({olRating.count.toLocaleString()})</p>}
      </div>
      <div className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((r) => (
          <div key={r} className="flex items-center gap-3 text-sm">
            <span className="w-14 text-cocoa-500">{r} star{r > 1 && 's'}</span>
            <ProgressBar value={(stats.distribution[r] / max) * 100} size="sm" />
            <span className="w-6 text-right text-cocoa-400">{stats.distribution[r]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Description({ text }) {
  const [open, setOpen] = useState(false);
  if (!text) return <p className="text-cocoa-400 italic">No description available for this book yet.</p>;
  const long = text.length > 700;
  return (
    <div>
      <p className={`text-[16px] leading-[1.75] whitespace-pre-line text-cocoa-700 ${!open && long ? 'line-clamp-[8]' : ''}`}>{text}</p>
      {long && <button type="button" onClick={() => setOpen(!open)} className="mt-2 text-sm font-semibold text-silver-700 hover:underline">{open ? 'Show less' : 'Read more'}</button>}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-10 md:grid-cols-[260px_1fr]">
      <Skeleton className="mx-auto aspect-[2/3] w-52 md:w-full" />
      <div className="space-y-4"><Skeleton className="h-12 w-3/4" /><Skeleton className="h-5 w-1/3" /><Skeleton className="h-10 w-48 rounded-full" /><Skeleton className="h-32 w-full" /></div>
    </div>
  );
}

export default function BookDetail() {
  const { olId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { version, statusOf, openProgress, bump } = useShelf();
  const confirm = useConfirm();
  const toast = useToast();
  const detail = useApi(`/books/${olId}`, [version]);
  const [sort, setSort] = useState('recent');
  const reviews = useApi(`/reviews/book/${olId}?sort=${sort}`, [version]);
  const [editing, setEditing] = useState(false);

  if (detail.error && !detail.data) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => navigate(-1)} className="btn-ghost -ml-3"><ArrowLeft className="size-4" /> Back</button>
        {detail.error.status === 404
          ? <EmptyState title="Book not found" message="We couldn’t find this book in the catalogue." action={<Link to="/discover" className="btn-primary">Discover books</Link>} />
          : <ErrorState error={detail.error} onRetry={detail.reload} />}
      </div>
    );
  }
  if (!detail.data) return <DetailSkeleton />;

  const { book, stats, myReview } = detail.data;
  const status = statusOf(book.olId);
  const others = (reviews.data?.reviews || []).filter((r) => r.user._id !== user._id);

  const deleteReview = async () => {
    const ok = await confirm({ title: 'Delete your review?', message: 'Your rating and review for this book will be permanently removed.', confirmLabel: 'Delete review', danger: true });
    if (!ok) return;
    try {
      await api.del(`/reviews/${myReview._id}`);
      toast.info('Review deleted');
      bump();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const myReviewCard = myReview && reviews.data?.reviews.find((r) => r._id === myReview._id);

  return (
    <div className="space-y-12">
      <button type="button" onClick={() => navigate(-1)} className="btn-ghost -ml-3"><ArrowLeft className="size-4" /> Back</button>

      <section className="relative grid gap-8 md:grid-cols-[250px_1fr] lg:gap-12">
        <div className="relative mx-auto w-48 self-start md:w-full">
          <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-mist/60" />
          <Bow className="absolute -top-6 left-1/2 z-10 h-10 w-14 -translate-x-1/2" />
          <BookCover book={book} size="L" className="w-full" />
        </div>
        <div className="min-w-0">
          {book.genres?.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {book.genres.map((g) => <span key={g} className="chip bg-mist/60">{g}</span>)}
            </div>
          )}
          <h1 className="text-[40px] leading-[1.05] sm:text-[52px]">{book.title}</h1>
          <p className="mt-2 font-serif text-xl text-cocoa-500">by {book.authors?.length ? book.authors.join(', ') : 'Unknown author'}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-cocoa-500">
            <span className="flex items-center gap-2"><StarRating value={stats.average || 0} size="sm" />{stats.average ? stats.average.toFixed(1) : 'No ratings yet'} · {pluralize(stats.count, 'review')}</span>
            {(book.publishDate || book.firstPublishYear) && <span className="flex items-center gap-1.5"><Calendar className="size-4" />{book.publishDate || book.firstPublishYear}</span>}
            {book.pageCount && <span className="flex items-center gap-1.5"><FileText className="size-4" />{book.pageCount} pages</span>}
            {stats.readers > 0 && <span className="flex items-center gap-1.5"><Users className="size-4" />{pluralize(stats.readers, 'reader')} on Readscape</span>}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ShelfButton book={book} />
            {status === 'reading' && (
              <button type="button" className="btn-secondary" onClick={() => openProgress(book)}><BookOpen className="size-4" /> Update progress</button>
            )}
            {status === 'read' && (
              <button type="button" className="btn-secondary" onClick={() => openProgress(book)}><Calendar className="size-4" /> Edit reading dates</button>
            )}
          </div>
          {detail.data.myEntry?.status === 'read' && detail.data.myEntry.finishedAt && (
            <p className="mt-3 text-sm text-cocoa-400">You finished this on {formatDate(detail.data.myEntry.finishedAt)}</p>
          )}

          <div className="mt-8">
            <h2 className="mb-3 font-serif text-2xl font-semibold">About this book</h2>
            <Description text={book.description} />
          </div>
        </div>
      </section>

      <SpinePanel olId={book.olId} />

      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <Sprig className="h-10 w-8" />
          <h2 className="section-title">Ratings & reviews</h2>
        </div>
        <RatingSummary stats={stats} olRating={book.olRating} />

        <div className="card relative overflow-hidden p-6">
          <h3 className="mb-4 font-serif text-[22px] font-semibold">{myReview ? 'Your review' : 'What did you think?'}</h3>
          {myReview && !editing ? (
            myReviewCard ? (
              <ReviewCard key={myReviewCard._id + myReviewCard.updatedAt} review={myReviewCard} isMine onEdit={() => setEditing(true)} onDelete={deleteReview} />
            ) : <Skeleton className="h-24" />
          ) : (
            <ReviewForm
              key={myReview?._id || 'new'}
              olId={book.olId}
              initial={myReview}
              onSaved={() => { setEditing(false); bump(); }}
              onCancel={myReview ? () => setEditing(false) : undefined}
            />
          )}
        </div>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-serif text-[22px] font-semibold">Readers’ reviews</h3>
            <Segmented size="sm" value={sort} onChange={setSort} options={[{ value: 'recent', label: 'Newest' }, { value: 'liked', label: 'Most appreciated' }]} />
          </div>
          {reviews.error ? (
            <ErrorState error={reviews.error} onRetry={reviews.reload} />
          ) : !reviews.data ? (
            <div className="space-y-3"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div>
          ) : others.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-cocoa/20 px-6 py-8 text-center text-cocoa-400">No other readers have reviewed this book yet.</p>
          ) : (
            <div className="space-y-3">{others.map((r) => <ReviewCard key={r._id} review={r} />)}</div>
          )}
        </div>
      </section>
    </div>
  );
}
