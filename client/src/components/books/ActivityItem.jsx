import { Link } from 'react-router';
import { Avatar, StarRating } from '../ui';
import BookCover from './BookCover';
import { timeAgo } from '../../lib/utils';

function describe(a) {
  switch (a.type) {
    case 'want': return 'wants to read';
    case 'started': return 'started reading';
    case 'progress': return a.data?.percent != null ? `is ${a.data.percent}% through` : `is on page ${a.data?.page} of`;
    case 'finished': return 'finished';
    case 'reviewed': return 'reviewed';
    case 'followed': return 'started following';
    case 'goal': return `set a goal of ${a.data?.target} books for ${a.data?.year}`;
    default: return '';
  }
}

/** A single activity line. `self` renders it in the second person (“You …”). */
export default function ActivityItem({ activity: a, self = false, compact = false }) {
  const name = self ? 'You' : a.user?.displayName || a.user?.username;
  const verb = self ? describe(a).replace(/^is /, 'are ').replace(/^wants/, 'want') : describe(a);
  return (
    <div className="flex items-start gap-3">
      {!self && !compact && (
        <Link to={`/u/${a.user?.username}`}><Avatar user={a.user} size={36} /></Link>
      )}
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[14.5px] leading-snug text-cocoa-500">
          {self ? <span className="text-cocoa-700">{name}</span> : <Link to={`/u/${a.user?.username}`} className="font-medium text-cocoa-800 hover:underline">{name}</Link>}{' '}
          {verb}{' '}
          {a.book && <Link to={`/book/${a.book.olId}`} className="font-serif text-[16px] font-semibold text-cocoa hover:underline">{a.book.title}</Link>}
          {a.targetUser && <Link to={`/u/${a.targetUser.username}`} className="font-medium text-cocoa-800 hover:underline">{a.targetUser.displayName || a.targetUser.username}</Link>}
        </p>
        {a.type === 'reviewed' && a.data?.rating && <StarRating value={a.data.rating} size="sm" className="mt-1" />}
        <p className="mt-0.5 text-[12.5px] text-cocoa-400">{timeAgo(a.updatedAt || a.createdAt)}</p>
      </div>
      {a.book && (
        <Link to={`/book/${a.book.olId}`} className="shrink-0"><BookCover book={a.book} size="S" className="w-10" rounded="rounded" /></Link>
      )}
    </div>
  );
}
