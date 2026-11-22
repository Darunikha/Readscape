import ReadingChallenge from '../models/ReadingChallenge.js';
import UserBook from '../models/UserBook.js';
import { BOOK_CARD_FIELDS } from '../models/Book.js';
import { logActivity } from '../services/activityService.js';
import { badRequest } from '../utils/httpError.js';

function parseYear(value) {
  const year = value ? Number(value) : new Date().getFullYear();
  if (!Number.isInteger(year) || year < 1900 || year > 3000) throw badRequest('Invalid year');
  return year;
}

/** Completed counts are always derived from finished books, so they update automatically. */
export async function challengeFor(userId, year) {
  const [challenge, finished] = await Promise.all([
    ReadingChallenge.findOne({ user: userId, year }),
    UserBook.find({ user: userId, status: 'read', finishedAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) } })
      .sort({ finishedAt: -1 })
      .populate('book', BOOK_CARD_FIELDS),
  ]);
  const completed = finished.length;
  const target = challenge?.target ?? null;
  return {
    year,
    target,
    completed,
    remaining: target ? Math.max(0, target - completed) : null,
    percent: target ? Math.min(100, Math.round((completed / target) * 100)) : null,
    books: finished.filter((e) => e.book).map((e) => ({ finishedAt: e.finishedAt, book: e.book })),
  };
}

export async function getChallenge(req, res) {
  res.json({ challenge: await challengeFor(req.user._id, parseYear(req.query.year)) });
}

export async function setChallenge(req, res) {
  const year = parseYear(req.body?.year);
  const target = Number(req.body?.target);
  if (!Number.isInteger(target) || target < 1 || target > 1000) throw badRequest('Your goal should be between 1 and 1000 books');
  const existing = await ReadingChallenge.findOne({ user: req.user._id, year });
  await ReadingChallenge.findOneAndUpdate(
    { user: req.user._id, year },
    { target },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );
  if (!existing || existing.target !== target) {
    await logActivity({ user: req.user._id, type: 'goal', data: { year, target } });
  }
  res.json({ challenge: await challengeFor(req.user._id, year) });
}
