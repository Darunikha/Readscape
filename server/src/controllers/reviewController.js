import Review from '../models/Review.js';
import Book, { BOOK_CARD_FIELDS } from '../models/Book.js';
import { getBookByOlId } from '../services/bookService.js';
import { logActivity } from '../services/activityService.js';
import { badRequest, forbidden, notFound } from '../utils/httpError.js';

const USER_FIELDS = 'username displayName avatar';

export function serializeReview(review, viewerId) {
  const r = review.toObject ? review.toObject() : review;
  const likes = (r.likes || []).map(String);
  return {
    _id: r._id,
    rating: r.rating,
    body: r.body,
    spoiler: r.spoiler,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    edited: r.updatedAt && r.createdAt && new Date(r.updatedAt) - new Date(r.createdAt) > 60 * 1000,
    likesCount: likes.length,
    likedByMe: viewerId ? likes.includes(String(viewerId)) : false,
    user: r.user,
    book: r.book,
  };
}

export async function listForBook(req, res) {
  const book = await Book.findOne({ olId: req.params.olId });
  if (!book) return res.json({ reviews: [], total: 0 });
  const sort = req.query.sort === 'liked' ? { likesCount: -1, createdAt: -1 } : { createdAt: -1 };
  const reviews = await Review.aggregate([
    { $match: { book: book._id } },
    { $addFields: { likesCount: { $size: '$likes' } } },
    { $sort: sort },
    { $limit: 100 },
  ]);
  await Review.populate(reviews, { path: 'user', select: USER_FIELDS });
  res.json({ reviews: reviews.filter((r) => r.user).map((r) => serializeReview(r, req.user?._id)), total: reviews.length });
}

/** Create or update the current user's review for a book. */
export async function upsertReview(req, res) {
  const { rating, body = '', spoiler = false } = req.body || {};
  const n = Number(rating);
  if (!Number.isInteger(n) || n < 1 || n > 5) throw badRequest('Please choose a rating from 1 to 5 stars');
  const book = await getBookByOlId(req.params.olId);

  let review = await Review.findOne({ user: req.user._id, book: book._id });
  const created = !review;
  if (!review) review = new Review({ user: req.user._id, book: book._id });
  review.rating = n;
  review.body = String(body).trim();
  review.spoiler = Boolean(spoiler);
  await review.save();

  if (created) await logActivity({ user: req.user._id, type: 'reviewed', book: book._id, data: { rating: n } });
  await review.populate('user', USER_FIELDS);
  res.status(created ? 201 : 200).json({ review: serializeReview(review, req.user._id), created });
}

export async function deleteReview(req, res) {
  const review = await Review.findById(req.params.id);
  if (!review) throw notFound('Review not found');
  if (!review.user.equals(req.user._id)) throw forbidden('You can only delete your own reviews');
  await review.deleteOne();
  res.json({ ok: true });
}

export async function toggleLike(req, res) {
  const review = await Review.findById(req.params.id);
  if (!review) throw notFound('Review not found');
  if (review.user.equals(req.user._id)) throw badRequest("You can't appreciate your own review");
  const liked = review.likes.some((id) => id.equals(req.user._id));
  const updated = await Review.findByIdAndUpdate(
    review._id,
    liked ? { $pull: { likes: req.user._id } } : { $addToSet: { likes: req.user._id } },
    { returnDocument: 'after', timestamps: false },
  );
  res.json({ liked: !liked, likesCount: updated.likes.length });
}

/** Most recent reviews across Readscape (for the community page). */
export async function recentReviews(req, res) {
  const limit = Math.min(30, Number(req.query.limit) || 10);
  const reviews = await Review.find({ body: { $ne: '' } })
    .sort({ createdAt: -1 })
    .limit(limit * 2)
    .populate('user', `${USER_FIELDS} isPublic`)
    .populate('book', BOOK_CARD_FIELDS);
  res.json({
    reviews: reviews.filter((r) => r.user?.isPublic && r.book).slice(0, limit).map((r) => serializeReview(r, req.user?._id)),
  });
}
