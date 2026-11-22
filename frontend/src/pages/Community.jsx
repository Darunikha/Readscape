import { useState } from 'react';
import { Link } from 'react-router';
import { MessageSquareQuote, Search, Users } from 'lucide-react';
import { useApi, useDebounced } from '../lib/useApi';
import { useShelf } from '../context/ShelfContext';
import ActivityItem from '../components/books/ActivityItem';
import ReviewCard from '../components/books/ReviewCard';
import { ReaderRow } from './Profile';
import { EmptyState, ErrorState, Skeleton } from '../components/ui';
import { Sprig } from '../components/decor/Decor';

function Feed() {
  const { version } = useShelf();
  const { data, error, reload } = useApi('/activity/feed', [version]);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <div className="space-y-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>;
  if (!data.activities.length) {
    return (
      <EmptyState
        className="border-none bg-transparent py-6"
        title={data.followingCount ? 'Quiet in here' : 'Follow some readers'}
        message={data.followingCount ? 'The readers you follow haven’t shelved anything lately.' : 'Follow readers to see what they’re reading, finishing and reviewing.'}
      />
    );
  }
  return <div className="space-y-5">{data.activities.map((a) => <ActivityItem key={a._id} activity={a} />)}</div>;
}

function FindReaders() {
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 300);
  const { data, error, loading, reload, setData } = useApi(`/users${dq ? `?q=${encodeURIComponent(dq)}` : ''}`);

  const onFollowChange = (username, following, followers) => {
    setData((d) => ({ ...d, users: d.users.map((u) => (u.username === username ? { ...u, isFollowing: following, followers } : u)) }));
  };

  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 font-serif text-[22px] font-semibold"><Users className="size-5 text-cocoa-400" /> Find readers</h2>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-cocoa-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or username" aria-label="Search readers" className="input rounded-full py-2 pl-9 text-sm" />
      </div>
      {error ? <ErrorState error={error} onRetry={reload} /> : !data && loading ? (
        <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
      ) : data?.users.length ? (
        <div className="space-y-1">{data.users.map((u) => <ReaderRow key={u._id} user={u} onChange={onFollowChange} />)}</div>
      ) : (
        <p className="py-4 text-center text-sm text-cocoa-400">{dq ? 'No readers match that search.' : 'No other readers yet — invite a friend!'}</p>
      )}
    </section>
  );
}

function RecentReviews() {
  const { version } = useShelf();
  const { data, error, reload } = useApi('/reviews/recent?limit=8', [version]);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <div className="space-y-3"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /></div>;
  if (!data.reviews.length) return <p className="rounded-2xl border border-dashed border-cocoa/20 px-6 py-8 text-center text-cocoa-400">No reviews yet. Finish a book and share your thoughts!</p>;
  return <div className="space-y-3">{data.reviews.map((r) => <ReviewCard key={r._id} review={r} showBook/>)}</div>;
}

export default function Community() {
  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-3xl border border-cocoa/10 bg-silver-100/80 px-6 py-8 sm:px-10">
        <Sprig className="absolute -right-2 -bottom-4 h-36 w-28 opacity-80" flip />
        <p className="eyebrow">Community</p>
        <h1 className="mt-1 text-[38px] leading-none sm:text-[44px]">Fellow readers</h1>
        <p className="mt-2 max-w-lg text-cocoa-600">See what the people you follow are reading, and discover thoughtful reviews from the Readscape community.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <section className="card p-6">
            <h2 className="mb-5 font-serif text-[24px] font-semibold">From readers you follow</h2>
            <Feed />
          </section>
          <section>
            <h2 className="section-title mb-4 flex items-center gap-2.5"><MessageSquareQuote className="size-5 text-cocoa-400" /> Recent reviews</h2>
            <RecentReviews />
          </section>
        </div>
        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <FindReaders />
          <p className="px-2 text-center text-[13px] text-cocoa-400">Want to keep your library private? <Link to="/profile?edit=1" className="underline underline-offset-2 hover:text-cocoa">Change your profile visibility</Link>.</p>
        </aside>
      </div>
    </div>
  );
}
