import { Link } from 'react-router';
import { ArrowRight, Heart, Library, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useShelf } from '../context/ShelfContext';
import { useApi } from '../lib/useApi';
import { authorLine, pluralize } from '../lib/utils';
import BookCover from '../components/books/BookCover';
import GoalCard from '../components/books/GoalCard';
import ActivityItem from '../components/books/ActivityItem';
import { EmptyState, ErrorState, ProgressBar, Skeleton } from '../components/ui';
import { BookStack, Bow, Flourish, Sparkle, Sprig, Teacup, UprightBooks } from '../components/decor/Decor';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Reading late tonight?';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function WelcomeBanner({ name }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-cocoa/10 bg-cocoa-50 shadow-soft">
      <div className="gingham absolute inset-y-0 left-0 hidden w-[38%] [mask-image:linear-gradient(90deg,black_55%,transparent)] md:block" />
      <div className="relative grid items-center md:grid-cols-[38%_1fr]">
        <div className="relative hidden h-full min-h-[220px] md:block">
          <Sprig className="absolute top-3 left-8 h-32 w-24" />
          <Teacup className="absolute bottom-5 left-16 w-32" />
          <BookStack className="absolute right-0 bottom-3 w-44" tones={['silver', 'mist', 'rose']} />
        </div>
        <div className="relative px-6 py-10 text-center sm:py-12 md:pr-28">
          <Bow className="mx-auto h-10 w-14" />
          <Sparkle className="absolute top-10 right-[30%] size-3" />
          <Sparkle className="absolute bottom-12 left-[18%] size-2.5" color="#93A8AD" />
          <h1 className="mt-2 text-[40px] leading-none sm:text-[54px]">{greeting()}, {name}!</h1>
          <p className="mt-3 flex items-center justify-center gap-2 font-serif text-xl text-cocoa-500 italic">
            Happy reading <Heart className="size-4" />
          </p>
          <Flourish className="mx-auto mt-3 w-44 opacity-80" />
        </div>
      </div>
      <Sprig className="absolute -right-2 bottom-0 hidden h-36 w-28 lg:block" flip />
    </section>
  );
}

const SHELF_CARDS = [
  { key: 'reading', label: 'Currently Reading', bg: 'bg-cocoa-100/80 hover:bg-cocoa-100', Art: () => <BookStack className="w-32 sm:w-36" tones={['rose', 'mist', 'silver']} sprig /> },
  { key: 'read', label: 'Read', bg: 'bg-mist hover:bg-mist-300/80', Art: () => <UprightBooks className="w-32 sm:w-36" /> },
  { key: 'want', label: 'Want to Read', bg: 'bg-silver-100 hover:bg-silver-200/80', Art: () => <BookStack className="w-32 sm:w-36" tones={['mist', 'silver', 'oat']} ribbon /> },
];

function ShelfCards({ counts, loading }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Library className="size-6 text-cocoa-500" strokeWidth={1.6} />
          <h2 className="section-title">My Bookshelf</h2>
        </div>
        <Link to="/shelf" className="inline-flex items-center gap-1.5 text-sm font-medium text-cocoa-500 hover:text-cocoa">See all <ArrowRight className="size-4" /></Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {SHELF_CARDS.map(({ key, label, bg, Art }, i) => (
          <Link
            key={key}
            to={`/shelf?shelf=${key}`}
            style={{ animationDelay: `${i * 70}ms` }}
            className={`group relative flex animate-rise items-center gap-3 overflow-hidden rounded-2xl border border-cocoa/8 p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:min-h-[150px] ${bg}`}
          >
            <div className="shrink-0 transition duration-300 group-hover:scale-[1.03]"><Art /></div>
            <div className="min-w-0 flex-1">
              <h3 className="font-serif text-[22px] leading-tight font-semibold">{label}</h3>
              {loading ? <Skeleton className="mt-2 h-4 w-16" /> : <p className="mt-1 text-cocoa-500">{pluralize(counts?.[key] || 0, 'book')}</p>}
            </div>
            <span className="absolute right-4 bottom-4 inline-flex size-9 items-center justify-center rounded-full bg-oat-50 shadow-soft transition group-hover:translate-x-0.5">
              <ArrowRight className="size-4" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ContinueReading({ entries, loading }) {
  const { openProgress } = useShelf();
  const current = entries?.[0];
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <Sparkles className="size-5 text-cocoa-400" />
        <h2 className="section-title">Continue Reading</h2>
      </div>
      {loading ? (
        <div className="card flex gap-6 p-6"><Skeleton className="aspect-[2/3] w-32" /><div className="flex-1 space-y-3"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/3" /><Skeleton className="mt-8 h-2.5 w-full" /></div></div>
      ) : !current ? (
        <EmptyState
          className="flex-1"
          title="Nothing on the nightstand"
          message="Pick something from your Want to Read shelf, or discover your next favourite."
          action={<Link to="/discover" className="btn-primary">Discover books</Link>}
        />
      ) : (
        <div className="card flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <Link to={`/book/${current.book.olId}`} className="mx-auto shrink-0 sm:mx-0"><BookCover book={current.book} className="w-32 transition hover:-translate-y-1 sm:w-36" /></Link>
          <div className="min-w-0 flex-1">
            <Link to={`/book/${current.book.olId}`}><h3 className="text-[28px] leading-tight hover:underline">{current.book.title}</h3></Link>
            <p className="mt-1 font-serif text-lg text-cocoa-500">{authorLine(current.book.authors)}</p>
            <div className="mt-5 flex items-center gap-4">
              <ProgressBar value={current.progress} />
              <span className="font-serif text-2xl font-semibold">{current.progress}%</span>
            </div>
            <p className="mt-1 text-[13px] text-cocoa-400">
              {current.totalPages ? `Page ${current.currentPage} of ${current.totalPages}` : 'Add a page count to track progress'}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" className="btn-primary" onClick={() => openProgress(current)}>Continue Reading <ArrowRight className="size-4" /></button>
              {entries.length > 1 && <Link to="/shelf?shelf=reading" className="text-sm text-cocoa-500 hover:text-cocoa">+{entries.length - 1} more in progress</Link>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { version } = useShelf();
  const { data, loading, error, reload, setData } = useApi('/shelf/summary', [version]);
  const firstName = (user.displayName || user.username).split(' ')[0];

  return (
    <div className="space-y-10">
      <WelcomeBanner name={firstName} />
      {error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <ShelfCards counts={data?.counts} loading={!data} />
          <div className="grid gap-8 xl:grid-cols-[1.35fr_1fr]">
            <ContinueReading entries={data?.currentlyReading} loading={!data} />
            <div className="flex flex-col gap-5 xl:pt-[52px]">
              {data ? (
                <GoalCard challenge={data.challenge} onChange={(c) => setData((d) => ({ ...d, challenge: c }))} />
              ) : <Skeleton className="h-44 rounded-2xl" />}
              <section className="card p-6">
                <div className="mb-4 flex items-center gap-2.5">
                  <Zap className="size-5 text-cocoa-400" />
                  <h2 className="font-serif text-[24px] font-semibold">Recent Activity</h2>
                </div>
                {!data ? (
                  <div className="space-y-4"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
                ) : data.recentActivity.length ? (
                  <div className="space-y-4">
                    {data.recentActivity.slice(0, 3).map((a) => <ActivityItem key={a._id} activity={a} self />)}
                  </div>
                ) : (
                  <p className="text-[15px] text-cocoa-400">Your reading moments will gather here as you shelve and finish books.</p>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
