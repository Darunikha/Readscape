import UserBook, { SHELF_STATUSES } from '../models/UserBook.js';
import Review from '../models/Review.js';
import CustomShelf from '../models/CustomShelf.js';
import ReadingChallenge from '../models/ReadingChallenge.js';
import Activity from '../models/Activity.js';
import { BOOK_CARD_FIELDS } from '../models/Book.js';
import { upsertBookFromSummary } from '../services/bookService.js';
import { logActivity, populateActivity } from '../services/activityService.js';
import { badRequest, notFound } from '../utils/httpError.js';

const STATUS_ACTIVITY = { want: 'want', reading: 'started', read: 'finished' };

/** Shapes a populated entry for the client, including computed progress. */
export function serializeEntry(entry, ratingsByBook = new Map()) {
  const e = entry.toObject ? entry.toObject() : entry;
  const totalPages = e.totalPages || e.book?.pageCount || null;
  const progress = e.status === 'read' ? 100 : totalPages ? Math.min(100, Math.round((e.currentPage / totalPages) * 100)) : 0;
  return {
    _id: e._id,
    status: e.status,
    currentPage: e.currentPage,
    totalPages,
    progress,
    startedAt: e.startedAt,
    finishedAt: e.finishedAt,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    myRating: ratingsByBook.get(String(e.book?._id)) ?? null,
    book: e.book,
  };
}

async function ratingsFor(userId) {
  const reviews = await Review.find({ user: userId }, 'book rating');
  return new Map(reviews.map((r) => [String(r.book), r.rating]));
}

/** Applies a status change with the side-effects that make shelves feel automatic. */
function applyStatus(entry, status, book) {
  const prev = entry.status;
  entry.status = status;
  if (!entry.totalPages && book?.pageCount) entry.totalPages = book.pageCount;

  if (status === 'reading') {
    if (prev === 'read') {
      // Starting a re-read.
      entry.currentPage = 0;
      entry.finishedAt = null;
      entry.startedAt = new Date();
    }
    if (!entry.startedAt) entry.startedAt = new Date();
  } else if (status === 'read') {
    if (!entry.finishedAt) entry.finishedAt = new Date();
    if (!entry.startedAt) entry.startedAt = entry.finishedAt;
    if (entry.totalPages) entry.currentPage = entry.totalPages;
  } else if (status === 'want') {
    entry.currentPage = 0;
    entry.startedAt = null;
    entry.finishedAt = null;
  }
}

function parseDate(value, field) {
  if (value === null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw badRequest(`Invalid ${field}`);
  if (d.getTime() > Date.now() + 24 * 60 * 60 * 1000) throw badRequest(`${field === 'startedAt' ? 'Start' : 'Finish'} date cannot be in the future`);
  return d;
}

async function findOwnEntry(req) {
  const entry = await UserBook.findOne({ _id: req.params.id, user: req.user._id }).populate('book', BOOK_CARD_FIELDS);
  if (!entry) throw notFound('That book is not on your shelf');
  return entry;
}

const SORTERS = {
  title: (a, b) => (a.book?.title || '').localeCompare(b.book?.title || ''),
  author: (a, b) => (a.book?.authors?.[0] || '').localeCompare(b.book?.authors?.[0] || ''),
  added: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  rating: (a, b) => (b.myRating ?? 0) - (a.myRating ?? 0),
  updated: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
  finished: (a, b) => new Date(b.finishedAt || 0) - new Date(a.finishedAt || 0),
};

/** Sort/filter/search helpers shared with custom shelves and public shelves. */
export function refineEntries(entries, { q, genre, sort = 'added', order } = {}) {
  let list = entries.filter((e) => e.book);
  const query = String(q || '').trim().toLowerCase();
  if (query) {
    list = list.filter((e) => e.book.title.toLowerCase().includes(query) || e.book.authors.some((a) => a.toLowerCase().includes(query)));
  }
  if (genre) list = list.filter((e) => e.book.genres?.includes(genre));
  const sorter = SORTERS[sort] || SORTERS.added;
  list.sort(sorter);
  if (order === 'reverse') list.reverse();
  return list;
}

export async function listShelf(req, res) {
  const { status } = req.query;
  const filter = { user: req.user._id };
  if (status && status !== 'all') {
    if (!SHELF_STATUSES.includes(status)) throw badRequest('Unknown shelf');
    filter.status = status;
  }
  const [entries, ratings] = await Promise.all([UserBook.find(filter).populate('book', BOOK_CARD_FIELDS), ratingsFor(req.user._id)]);
  const all = entries.map((e) => serializeEntry(e, ratings));
  const genres = [...new Set(all.flatMap((e) => e.book?.genres || []))].sort();
  res.json({ entries: refineEntries(all, req.query), genres, total: all.length });
}

/** Lightweight map of olId → shelf entry so the UI can show shelf state everywhere. */
export async function shelfIndex(req, res) {
  const [entries, shelves] = await Promise.all([
    UserBook.find({ user: req.user._id }, 'status book').populate('book', 'olId'),
    CustomShelf.find({ user: req.user._id }, 'name books.book').populate('books.book', 'olId'),
  ]);
  res.json({
    entries: entries.filter((e) => e.book).map((e) => ({ _id: e._id, olId: e.book.olId, status: e.status })),
    customShelves: shelves.map((s) => ({ _id: s._id, name: s.name, count: s.books.length, olIds: s.books.map((b) => b.book?.olId).filter(Boolean) })),
  });
}

export async function summary(req, res) {
  const userId = req.user._id;
  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const [counts, reading, challenge, completed, activities, ratings] = await Promise.all([
    UserBook.aggregate([{ $match: { user: userId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    UserBook.find({ user: userId, status: 'reading' }).sort({ updatedAt: -1 }).limit(4).populate('book', BOOK_CARD_FIELDS),
    ReadingChallenge.findOne({ user: userId, year }),
    UserBook.countDocuments({ user: userId, status: 'read', finishedAt: { $gte: yearStart, $lt: yearEnd } }),
    populateActivity(Activity.find({ user: userId }).sort({ updatedAt: -1 }).limit(4)),
    ratingsFor(userId),
  ]);

  const byStatus = Object.fromEntries(SHELF_STATUSES.map((s) => [s, counts.find((c) => c._id === s)?.count || 0]));
  res.json({
    counts: byStatus,
    currentlyReading: reading.map((e) => serializeEntry(e, ratings)),
    challenge: {
      year,
      target: challenge?.target ?? null,
      completed,
      remaining: challenge ? Math.max(0, challenge.target - completed) : null,
    },
    recentActivity: activities,
  });
}

export async function getEntryForBook(req, res) {
  const entries = await UserBook.find({ user: req.user._id }).populate({ path: 'book', match: { olId: req.params.olId }, select: BOOK_CARD_FIELDS });
  const entry = entries.find((e) => e.book);
  res.json({ entry: entry ? serializeEntry(entry, await ratingsFor(req.user._id)) : null });
}

/** Adds a book to a shelf, or moves it if it's already shelved (never duplicates). */
export async function addToShelf(req, res) {
  const { book: bookInput, status } = req.body || {};
  if (!SHELF_STATUSES.includes(status)) throw badRequest('Please choose a shelf');
  const book = await upsertBookFromSummary(bookInput);

  let entry = await UserBook.findOne({ user: req.user._id, book: book._id });
  let created = false;
  if (entry) {
    if (entry.status === status) {
      await entry.populate('book', BOOK_CARD_FIELDS);
      return res.json({ entry: serializeEntry(entry, await ratingsFor(req.user._id)), created: false, unchanged: true });
    }
  } else {
    entry = new UserBook({ user: req.user._id, book: book._id, status });
    created = true;
  }
  applyStatus(entry, status, book);
  try {
    await entry.save();
  } catch (err) {
    if (err.code === 11000) {
      // A parallel request created it first; treat it as a move.
      entry = await UserBook.findOne({ user: req.user._id, book: book._id });
      applyStatus(entry, status, book);
      await entry.save();
      created = false;
    } else throw err;
  }

  await logActivity({ user: req.user._id, type: STATUS_ACTIVITY[status], book: book._id });
  await entry.populate('book', BOOK_CARD_FIELDS);
  res.status(created ? 201 : 200).json({ entry: serializeEntry(entry, await ratingsFor(req.user._id)), created });
}

/** Updates status, progress and dates of a shelf entry. */
export async function updateEntry(req, res) {
  const entry = await findOwnEntry(req);
  const { status, currentPage, totalPages, startedAt, finishedAt } = req.body || {};
  const prevStatus = entry.status;
  const prevPage = entry.currentPage;

  if (totalPages !== undefined) {
    if (totalPages === null) entry.totalPages = null;
    else {
      const n = Number(totalPages);
      if (!Number.isInteger(n) || n < 1 || n > 20000) throw badRequest('Total pages must be a whole number between 1 and 20000');
      entry.totalPages = n;
    }
  }
  if (status !== undefined && status !== entry.status) {
    if (!SHELF_STATUSES.includes(status)) throw badRequest('Unknown shelf');
    applyStatus(entry, status, entry.book);
  }
  if (currentPage !== undefined) {
    const n = Number(currentPage);
    if (!Number.isInteger(n) || n < 0) throw badRequest('Current page must be a whole number');
    const total = entry.totalPages || entry.book?.pageCount;
    if (total && n > total) throw badRequest(`Current page cannot be more than ${total}`);
    entry.currentPage = n;
    if (!entry.totalPages && entry.book?.pageCount) entry.totalPages = entry.book.pageCount;
  }
  if (startedAt !== undefined) entry.startedAt = parseDate(startedAt, 'startedAt');
  if (finishedAt !== undefined) entry.finishedAt = parseDate(finishedAt, 'finishedAt');
  if (entry.startedAt && entry.finishedAt && entry.finishedAt < entry.startedAt) {
    throw badRequest('The finish date cannot be before the start date');
  }
  if (entry.status === 'read' && !entry.finishedAt) entry.finishedAt = new Date();

  await entry.save();

  if (entry.status !== prevStatus) {
    await logActivity({ user: req.user._id, type: STATUS_ACTIVITY[entry.status], book: entry.book._id });
  } else if (entry.status === 'reading' && entry.currentPage > prevPage) {
    const total = entry.totalPages || entry.book?.pageCount;
    await logActivity({
      user: req.user._id,
      type: 'progress',
      book: entry.book._id,
      data: { page: entry.currentPage, totalPages: total, percent: total ? Math.round((entry.currentPage / total) * 100) : null },
    });
  }

  res.json({ entry: serializeEntry(entry, await ratingsFor(req.user._id)), statusChanged: entry.status !== prevStatus });
}

export async function removeEntry(req, res) {
  const entry = await findOwnEntry(req);
  await entry.deleteOne();
  res.json({ ok: true, removed: entry._id });
}
