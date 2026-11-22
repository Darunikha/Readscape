import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { Camera, Globe, Lock, Pencil, UserCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useShelf } from '../context/ShelfContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { useApi } from '../lib/useApi';
import { authorLine, cn, formatDate, pluralize, resizeImage, SHELVES } from '../lib/utils';
import Modal from '../components/ui/Modal';
import BookCover from '../components/books/BookCover';
import GoalCard from '../components/books/GoalCard';
import ActivityItem from '../components/books/ActivityItem';
import ReviewCard from '../components/books/ReviewCard';
import { Avatar, EmptyState, ErrorState, Field, ProgressBar, Segmented, Skeleton, Spinner, StarRating } from '../components/ui';
import { Bow, BookStack, Sparkle, Sprig } from '../components/decor/Decor';

export function FollowButton({ user, onChange, size = 'md' }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const toggle = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = user.isFollowing ? await api.del(`/users/${user.username}/follow`) : await api.post(`/users/${user.username}/follow`);
      onChange?.(user.username, res.following, res.followers);
      if (res.following) toast.success(`You’re now following ${user.displayName || user.username}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={toggle} disabled={busy} className={cn(user.isFollowing ? 'btn-secondary' : 'btn-primary', size === 'sm' && 'btn-sm')}>
      {busy ? <Spinner /> : user.isFollowing ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
      {user.isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}

export function ReaderRow({ user, onChange }) {
  return (
    <Link to={`/u/${user.username}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-mist/40">
      <Avatar user={user} size={42} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-cocoa-800">{user.displayName}</p>
        <p className="truncate text-[12.5px] text-cocoa-400">@{user.username} · {pluralize(user.booksRead, 'book')} read</p>
      </div>
      {onChange && <FollowButton user={user} onChange={onChange} size="sm" />}
    </Link>
  );
}

function EditProfileModal({ open, onClose }) {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const genres = useApi(open ? '/books/genres' : null);
  const fileRef = useRef(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ displayName: user.displayName, bio: user.bio, avatar: user.avatar, favouriteGenres: user.favouriteGenres, isPublic: user.isPublic });
      setError('');
    }
  }, [open, user]);

  if (!open || !form) return null;

  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setForm((f) => ({ ...f, avatar: '' }));
      const dataUrl = await resizeImage(file);
      setForm((f) => ({ ...f, avatar: dataUrl }));
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleGenre = (name) => setForm((f) => ({
    ...f,
    favouriteGenres: f.favouriteGenres.includes(name) ? f.favouriteGenres.filter((g) => g !== name) : f.favouriteGenres.length >= 6 ? f.favouriteGenres : [...f.favouriteGenres, name],
  }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await updateProfile(form);
      toast.success('Profile updated');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Edit profile" size="lg">
      <form onSubmit={submit} className="space-y-5">
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar user={{ ...user, avatar: form.avatar, displayName: form.displayName }} size={88} />
            <button type="button" onClick={() => fileRef.current?.click()} className="absolute -right-1 -bottom-1 inline-flex size-9 items-center justify-center rounded-full border border-cocoa/10 bg-oat-50 shadow-soft hover:bg-mist" aria-label="Upload profile picture">
              <Camera className="size-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
          </div>
          <div className="text-sm text-cocoa-500">
            <p>Upload a square-ish photo; we’ll crop it to a circle.</p>
            {form.avatar && <button type="button" className="mt-1 font-medium text-cocoa underline-offset-2 hover:underline" onClick={() => setForm({ ...form, avatar: '' })}>Remove photo</button>}
          </div>
        </div>
        <Field label="Display name">
          <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} maxLength={50} className="input" />
        </Field>
        <Field label="Short bio" hint={`${form.bio.length}/280`}>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={280} rows={3} className="input resize-none" placeholder="Tea, rainy afternoons and long novels…" />
        </Field>
        <div>
          <span className="label">Favourite genres <span className="font-normal text-cocoa-400">(up to 6)</span></span>
          <div className="flex flex-wrap gap-2">
            {genres.data?.genres.map((g) => {
              const on = form.favouriteGenres.includes(g.name);
              return <button key={g.slug} type="button" onClick={() => toggleGenre(g.name)} aria-pressed={on} className={cn('chip', on ? 'chip-active' : 'hover:bg-mist/50')}>{g.name}</button>;
            }) || <Skeleton className="h-8 w-full" />}
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-cocoa/10 bg-oat-100/60 p-4">
          <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} className="mt-1 size-4 accent-cocoa" />
          <span>
            <span className="flex items-center gap-1.5 font-medium">{form.isPublic ? <Globe className="size-4" /> : <Lock className="size-4" />} Public profile</span>
            <span className="text-sm text-cocoa-500">Other readers can see your bookshelf, reviews and activity.</span>
          </span>
        </label>
        {error && <p className="text-sm text-cocoa-700" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy && <Spinner />}Save changes</button>
        </div>
      </form>
    </Modal>
  );
}

function ConnectionsModal({ username, type, onClose }) {
  const { data, error, reload, setData } = useApi(type ? `/users/${username}/${type}` : null);
  const onChange = (u, following, followers) => setData((d) => ({ ...d, users: d.users.map((x) => (x.username === u ? { ...x, isFollowing: following, followers } : x)) }));
  const { user: me } = useAuth();
  return (
    <Modal open={Boolean(type)} onClose={onClose} title={type === 'followers' ? 'Followers' : 'Following'} size="sm">
      {error ? <ErrorState error={error} onRetry={reload} /> : !data ? <Skeleton className="h-24" /> : data.users.length ? (
        <div className="space-y-1" onClick={(e) => e.target.closest('a') && onClose()}>
          {data.users.map((u) => <ReaderRow key={u._id} user={u} onChange={u.username !== me.username ? onChange : undefined} />)}
        </div>
      ) : <p className="py-6 text-center text-cocoa-400">No one here yet.</p>}
    </Modal>
  );
}

function PublicShelf({ username, isMe }) {
  const [status, setStatus] = useState('reading');
  const { version } = useShelf();
  const { data, error, reload } = useApi(`/users/${username}/shelf?status=${status}`, [version]);
  return (
    <div className="space-y-5">
      <Segmented value={status} onChange={setStatus} size="sm" options={Object.values(SHELVES).map((s) => ({ value: s.key, label: s.label }))} />
      {error ? <ErrorState error={error} onRetry={reload} /> : !data ? (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[2/3]" />)}</div>
      ) : data.entries.length === 0 ? (
        <EmptyState title="Nothing on this shelf" message={isMe ? 'Books you add will show up here.' : 'This shelf is empty for now.'} />
      ) : (
        <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
          {data.entries.map((e) => (
            <Link key={e._id} to={`/book/${e.book.olId}`} className="group">
              <BookCover book={e.book} className="w-full transition group-hover:-translate-y-1" />
              <p className="mt-2 line-clamp-2 font-serif text-[15px] leading-snug font-semibold">{e.book.title}</p>
              <p className="truncate text-[12px] text-cocoa-400">{authorLine(e.book.authors)}</p>
              {e.status === 'reading' && <ProgressBar value={e.progress} size="sm" className="mt-1.5" />}
              {e.myRating && <StarRating value={e.myRating} size="sm" className="mt-1" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileReviews({ username }) {
  const { version } = useShelf();
  const { data, error, reload } = useApi(`/users/${username}/reviews`, [version]);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <Skeleton className="h-32 rounded-2xl" />;
  if (!data.reviews.length) return <EmptyState title="No reviews yet" message="Reviews will appear here once books are rated." />;
  return <div className="space-y-3">{data.reviews.map((r) => <ReviewCard key={r._id} review={r} showBook/>)}</div>;
}

function ProfileActivity({ username, isMe }) {
  const { version } = useShelf();
  const { data, error, reload } = useApi(`/users/${username}/activity`, [version]);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <Skeleton className="h-32 rounded-2xl" />;
  if (!data.activities.length) return <EmptyState title="No activity yet" message="Reading moments will gather here." />;
  return <div className="card space-y-5 p-6">{data.activities.map((a) => <ActivityItem key={a._id} activity={a} self={isMe} />)}</div>;
}

export default function Profile() {
  const { username: param } = useParams();
  const { user: me } = useAuth();
  const [params, setParams] = useSearchParams();
  const username = param || me.username;
  const { version } = useShelf();
  const { data, error, reload, setData } = useApi(`/users/${username}`, [version, me]);
  const [tab, setTab] = useState('shelf');
  const [connections, setConnections] = useState(null);
  const editOpen = params.get('edit') === '1' && (!param || param === me.username);

  useEffect(() => { setTab('shelf'); }, [username]);

  if (error && !data) return <ErrorState error={error} onRetry={reload} className="mt-6" />;
  if (!data) {
    return <div className="space-y-6"><Skeleton className="h-56 rounded-3xl" /><Skeleton className="h-40 rounded-2xl" /></div>;
  }

  const { user, stats, isMe, challenge } = data;
  const onFollow = (_u, following, followers) => setData((d) => ({ ...d, user: { ...d.user, isFollowing: following }, stats: d.stats && { ...d.stats, followers } }));

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-cocoa/10 bg-oat-50 shadow-soft">
        <div className="gingham h-28 [mask-image:linear-gradient(180deg,black,transparent)] sm:h-32" />
        <Sprig className="absolute top-4 right-6 h-28 w-20 opacity-90" flip />
        <Sparkle className="absolute top-8 right-36 size-3" />
        <div className="relative -mt-16 flex flex-col gap-5 px-6 pb-7 sm:flex-row sm:items-end sm:px-8">
          <div className="relative w-fit">
            <Avatar user={user} size={120} className="border-4 border-oat-50 shadow-soft" />
            <Bow className="absolute -top-3 -right-4 h-9 w-12 rotate-12" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[36px] leading-none">{user.displayName}</h1>
            <p className="mt-1 flex items-center gap-2 text-cocoa-400">@{user.username} {!user.isPublic && <span className="inline-flex items-center gap-1 text-[12px]"><Lock className="size-3" /> Private</span>}</p>
            {user.bio && <p className="mt-2 max-w-xl text-cocoa-600">{user.bio}</p>}
            <p className="mt-1 text-[13px] text-cocoa-400">Reading since {formatDate(user.createdAt, { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex gap-2">
            {isMe ? (
              <button type="button" className="btn-secondary" onClick={() => setParams({ edit: '1' })}><Pencil className="size-4" /> Edit profile</button>
            ) : <FollowButton user={user} onChange={onFollow} />}
          </div>
        </div>
      </section>

      {data.private ? (
        <EmptyState title="This library is private" message={`${user.displayName} keeps their bookshelf to themselves.`} illustration={<Lock className="size-10 text-cocoa-300" />} />
      ) : (
        <>
          <section className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {[
              ['Books read', stats.read, () => setTab('shelf')],
              ['Reading', stats.reading, () => setTab('shelf')],
              ['Want to read', stats.want, () => setTab('shelf')],
              ['Reviews', stats.reviews, () => setTab('reviews')],
              ['Followers', stats.followers, () => setConnections('followers')],
              ['Following', stats.following, () => setConnections('following')],
            ].map(([label, value, onClick], i) => (
              <button key={label} type="button" onClick={onClick} className={cn('rounded-2xl border border-cocoa/8 px-3 py-4 text-center transition hover:-translate-y-0.5 hover:shadow-soft', ['bg-cocoa-100/70', 'bg-mist', 'bg-silver-100', 'bg-oat'][i % 4])}>
                <p className="font-serif text-3xl leading-none font-semibold">{value}</p>
                <p className="mt-1 text-[12.5px] text-cocoa-500">{label}</p>
              </button>
            ))}
          </section>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <GoalCard challenge={challenge} editable={isMe} onChange={reload} />
            <section className="card relative overflow-hidden p-6">
              <BookStack className="pointer-events-none absolute -right-4 -bottom-4 w-32 opacity-70" tones={['mist', 'rose', 'silver']} />
              <h2 className="font-serif text-[24px] font-semibold">Favourite genres</h2>
              {user.favouriteGenres?.length ? (
                <div className="mt-4 flex max-w-[80%] flex-wrap gap-2">{user.favouriteGenres.map((g) => <span key={g} className="chip bg-mist/60">{g}</span>)}</div>
              ) : (
                <p className="mt-3 text-cocoa-400">{isMe ? <button type="button" className="underline underline-offset-2 hover:text-cocoa" onClick={() => setParams({ edit: '1' })}>Pick a few favourites</button> : 'None chosen yet.'}</p>
              )}
            </section>
          </div>

          <section className="space-y-5">
            <Segmented value={tab} onChange={setTab} options={[{ value: 'shelf', label: 'Bookshelf' }, { value: 'reviews', label: 'Reviews' }, { value: 'activity', label: 'Activity' }]} />
            {tab === 'shelf' && <PublicShelf username={username} isMe={isMe} />}
            {tab === 'reviews' && <ProfileReviews username={username} />}
            {tab === 'activity' && <ProfileActivity username={username} isMe={isMe} />}
          </section>
        </>
      )}

      <EditProfileModal open={editOpen} onClose={() => setParams({}, { replace: true })} />
      <ConnectionsModal username={username} type={connections} onClose={() => { setConnections(null); reload(); }} />
    </div>
  );
}
