import User, { PUBLIC_USER_FIELDS } from '../models/User.js';
import Follow from '../models/Follow.js';
import UserBook from '../models/UserBook.js';
import Review from '../models/Review.js';
import Activity from '../models/Activity.js';
import { BOOK_CARD_FIELDS } from '../models/Book.js';
import { serializeEntry, refineEntries } from './shelfController.js';
import { serializeReview } from './reviewController.js';
import { challengeFor } from './challengeController.js';
import { logActivity, populateActivity } from '../services/activityService.js';
import { GENRE_NAMES } from '../utils/genres.js';
import { badRequest, forbidden, notFound } from '../utils/httpError.js';

const MAX_AVATAR_BYTES = 400 * 1024;

async function findByUsername(username) {
  const user = await User.findOne({ username: String(username).toLowerCase() });
  if (!user) throw notFound('Reader not found');
  return user;
}

function canView(target, viewer) {
  return target.isPublic || (viewer && target._id.equals(viewer._id));
}

async function assertVisible(target, viewer) {
  if (!canView(target, viewer)) throw forbidden('This reader keeps their library private');
}

function publicUser(u) {
  return {
    _id: u._id,
    username: u.username,
    displayName: u.displayName || u.username,
    avatar: u.avatar,
    bio: u.bio,
    favouriteGenres: u.favouriteGenres,
    isPublic: u.isPublic,
    createdAt: u.createdAt,
  };
}

async function decorate(users, viewerId) {
  const ids = users.map((u) => u._id);
  const [following, readCounts, followerCounts] = await Promise.all([
    viewerId ? Follow.find({ follower: viewerId, following: { $in: ids } }, 'following') : [],
    UserBook.aggregate([{ $match: { user: { $in: ids }, status: 'read' } }, { $group: { _id: '$user', n: { $sum: 1 } } }]),
    Follow.aggregate([{ $match: { following: { $in: ids } } }, { $group: { _id: '$following', n: { $sum: 1 } } }]),
  ]);
  const followingSet = new Set(following.map((f) => String(f.following)));
  const reads = new Map(readCounts.map((r) => [String(r._id), r.n]));
  const followers = new Map(followerCounts.map((r) => [String(r._id), r.n]));
  return users.map((u) => ({
    ...publicUser(u),
    isFollowing: followingSet.has(String(u._id)),
    booksRead: reads.get(String(u._id)) || 0,
    followers: followers.get(String(u._id)) || 0,
  }));
}

/** Search readers, or suggest some when no query is given. */
export async function listUsers(req, res) {
  const q = String(req.query.q || '').trim();
  const filter = { _id: { $ne: req.user._id }, isPublic: true };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ username: rx }, { displayName: rx }];
  }
  const users = await User.find(filter, PUBLIC_USER_FIELDS).sort({ updatedAt: -1 }).limit(24);
  res.json({ users: await decorate(users, req.user._id) });
}

export async function getProfile(req, res) {
  const target = await findByUsername(req.params.username);
  const isMe = target._id.equals(req.user._id);
  const [decorated] = await decorate([target], req.user._id);
  const base = { user: { ...decorated, email: isMe ? target.email : undefined }, isMe };

  if (!canView(target, req.user)) return res.json({ ...base, private: true });

  const [counts, reviews, followers, following, challenge] = await Promise.all([
    UserBook.aggregate([{ $match: { user: target._id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Review.countDocuments({ user: target._id }),
    Follow.countDocuments({ following: target._id }),
    Follow.countDocuments({ follower: target._id }),
    challengeFor(target._id, new Date().getFullYear()),
  ]);
  const count = (s) => counts.find((c) => c._id === s)?.n || 0;
  res.json({
    ...base,
    stats: { read: count('read'), reading: count('reading'), want: count('want'), reviews, followers, following },
    challenge: { ...challenge, books: undefined },
  });
}

export async function userShelf(req, res) {
  const target = await findByUsername(req.params.username);
  await assertVisible(target, req.user);
  const filter = { user: target._id };
  if (['reading', 'read', 'want'].includes(req.query.status)) filter.status = req.query.status;
  const [entries, reviews] = await Promise.all([
    UserBook.find(filter).populate('book', BOOK_CARD_FIELDS),
    Review.find({ user: target._id }, 'book rating'),
  ]);
  const ratings = new Map(reviews.map((r) => [String(r.book), r.rating]));
  const all = entries.map((e) => serializeEntry(e, ratings));
  res.json({ entries: refineEntries(all, { sort: req.query.sort || 'updated', q: req.query.q }) });
}

export async function userReviews(req, res) {
  const target = await findByUsername(req.params.username);
  await assertVisible(target, req.user);
  const reviews = await Review.find({ user: target._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('user', 'username displayName avatar')
    .populate('book', BOOK_CARD_FIELDS);
  res.json({ reviews: reviews.filter((r) => r.book).map((r) => serializeReview(r, req.user._id)) });
}

export async function userActivity(req, res) {
  const target = await findByUsername(req.params.username);
  await assertVisible(target, req.user);
  const activities = await populateActivity(Activity.find({ user: target._id }).sort({ updatedAt: -1 }).limit(20));
  res.json({ activities });
}

export async function follow(req, res) {
  const target = await findByUsername(req.params.username);
  if (target._id.equals(req.user._id)) throw badRequest("You can't follow yourself");
  const result = await Follow.updateOne(
    { follower: req.user._id, following: target._id },
    { $setOnInsert: { follower: req.user._id, following: target._id } },
    { upsert: true },
  );
  if (result.upsertedCount) await logActivity({ user: req.user._id, type: 'followed', targetUser: target._id });
  res.json({ following: true, followers: await Follow.countDocuments({ following: target._id }) });
}

export async function unfollow(req, res) {
  const target = await findByUsername(req.params.username);
  await Follow.deleteOne({ follower: req.user._id, following: target._id });
  res.json({ following: false, followers: await Follow.countDocuments({ following: target._id }) });
}

export async function connections(req, res) {
  const target = await findByUsername(req.params.username);
  await assertVisible(target, req.user);
  const type = req.params.type === 'following' ? 'following' : 'followers';
  const links = type === 'followers'
    ? await Follow.find({ following: target._id }).populate('follower', PUBLIC_USER_FIELDS)
    : await Follow.find({ follower: target._id }).populate('following', PUBLIC_USER_FIELDS);
  const users = links.map((l) => (type === 'followers' ? l.follower : l.following)).filter(Boolean);
  res.json({ users: await decorate(users, req.user._id) });
}

export async function updateMe(req, res) {
  const { displayName, bio, avatar, favouriteGenres, isPublic } = req.body || {};
  const user = req.user;
  if (displayName !== undefined) user.displayName = String(displayName).trim().slice(0, 50);
  if (bio !== undefined) user.bio = String(bio);
  if (isPublic !== undefined) user.isPublic = Boolean(isPublic);
  if (favouriteGenres !== undefined) {
    if (!Array.isArray(favouriteGenres)) throw badRequest('Favourite genres must be a list');
    user.favouriteGenres = [...new Set(favouriteGenres.filter((g) => GENRE_NAMES.includes(g)))].slice(0, 6);
  }
  if (avatar !== undefined) {
    const value = String(avatar || '');
    const isDataImage = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value);
    const isUrl = /^https:\/\/[^\s]+$/.test(value);
    if (value && !isDataImage && !isUrl) throw badRequest('Profile picture must be an image upload or an https link');
    if (isDataImage && value.length * 0.75 > MAX_AVATAR_BYTES) throw badRequest('Profile picture is too large');
    user.avatar = value;
  }
  await user.save();
  res.json({ user });
}

/** Activity from readers you follow — powers the community feed. */
export async function feed(req, res) {
  const follows = await Follow.find({ follower: req.user._id }, 'following');
  const ids = follows.map((f) => f.following);
  const before = req.query.before ? new Date(req.query.before) : null;
  const filter = { user: { $in: ids }, type: { $ne: 'goal' } };
  if (before && !Number.isNaN(before.getTime())) filter.updatedAt = { $lt: before };
  const activities = await populateActivity(Activity.find(filter).sort({ updatedAt: -1 }).limit(20));
  res.json({ activities: activities.filter((a) => a.user), followingCount: ids.length });
}

export async function myActivity(req, res) {
  const limit = Math.min(50, Number(req.query.limit) || 10);
  const activities = await populateActivity(Activity.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(limit));
  res.json({ activities });
}
