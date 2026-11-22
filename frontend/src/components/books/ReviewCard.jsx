import { useState } from 'react';
import { Link } from 'react-router';
import { Heart, Pencil, Trash2 } from 'lucide-react';
import { Avatar, StarRating } from '../ui';
import BookCover from './BookCover';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { cn, timeAgo } from '../../lib/utils';

export default function ReviewCard({ review, isMine: isMineProp, onEdit, onDelete, showBook = false }) {
  const toast = useToast();
  const { user } = useAuth();
  const isMine = isMineProp ?? String(review.user?._id) === String(user?._id);
  const [liked, setLiked] = useState(review.likedByMe);
  const [likes, setLikes] = useState(review.likesCount);
  const [revealed, setRevealed] = useState(!review.spoiler);
  const [expanded, setExpanded] = useState(false);
  const long = review.body.length > 420;

  const like = async () => {
    // Optimistic toggle
    setLiked(!liked);
    setLikes((n) => n + (liked ? -1 : 1));
    try {
      const res = await api.post(`/reviews/${review._id}/like`);
      setLiked(res.liked);
      setLikes(res.likesCount);
    } catch (err) {
      setLiked(liked);
      setLikes(review.likesCount);
      toast.error(err.message);
    }
  };

  return (
    <article className="card animate-rise p-5">
      <div className="flex gap-4">
        {showBook && review.book && (
          <Link to={`/book/${review.book.olId}`} className="shrink-0"><BookCover book={review.book} className="w-14" /></Link>
        )}
        <div className="min-w-0 flex-1">
          {showBook && review.book && (
            <Link to={`/book/${review.book.olId}`} className="font-serif text-lg leading-tight font-semibold hover:underline">{review.book.title}</Link>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link to={`/u/${review.user.username}`} className="flex items-center gap-2.5">
              <Avatar user={review.user} size={32} />
              <span className="text-sm font-medium text-cocoa-800 hover:underline">{review.user.displayName || review.user.username}</span>
            </Link>
            <StarRating value={review.rating} size="sm" />
            <span className="text-[13px] text-cocoa-400">{timeAgo(review.createdAt)}{review.edited && ' · edited'}</span>
          </div>

          {review.body && (
            <div className="relative mt-3">
              <p className={cn('text-[15px] leading-relaxed whitespace-pre-line text-cocoa-700', !revealed && 'blur-sm select-none', !expanded && long && 'line-clamp-[7]')}>
                {review.body}
              </p>
              {!revealed && (
                <button type="button" onClick={() => setRevealed(true)} className="btn-secondary btn-sm absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  Contains spoilers · Show
                </button>
              )}
              {revealed && long && (
                <button type="button" onClick={() => setExpanded(!expanded)} className="mt-1 text-sm font-medium text-silver-700 hover:underline">
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center gap-1">
            {isMine ? (
              <>
                <span className="mr-2 inline-flex items-center gap-1.5 text-[13px] text-cocoa-400"><Heart className="size-4" /> {likes}</span>
                {onEdit && <button type="button" className="btn-ghost btn-sm" onClick={onEdit}><Pencil className="size-3.5" /> Edit</button>}
                {onDelete && <button type="button" className="btn-ghost btn-sm" onClick={onDelete}><Trash2 className="size-3.5" /> Delete</button>}
              </>
            ) : (
              <button
                type="button"
                onClick={like}
                aria-pressed={liked}
                className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition', liked ? 'bg-cocoa-100 text-cocoa' : 'text-cocoa-500 hover:bg-cocoa-50')}
              >
                <Heart className={cn('size-4 transition', liked && 'scale-110 fill-cocoa')} />
                {liked ? 'Appreciated' : 'Appreciate'} {likes > 0 && `· ${likes}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
