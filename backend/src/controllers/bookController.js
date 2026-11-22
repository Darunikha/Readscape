import mongoose from 'mongoose';
import Book from '../models/Book.js';
import Review from '../models/Review.js';
import UserBook from '../models/UserBook.js';
import CustomShelf from '../models/CustomShelf.js';
import * as ol from '../services/openLibrary.js';
import { getBookByOlId } from '../services/bookService.js';
import { GENRES, genreByName, genreBySlug } from '../utils/genres.js';
import { badRequest } from '../utils/httpError.js';

const toSummary = (b) => ({
  olId: b.olId,
  title: b.title,
  authors: b.authors,
  coverId: b.coverId,
  firstPublishYear: b.firstPublishYear,
  pageCount: b.pageCount,
  genres: b.genres,
});

/** When Open Library is unreachable, fall back to books already in our database. */
async function localFallback(filter = {}, limit = 12) {
  const books = await Book.find(filter).sort({ updatedAt: -1 }).limit(limit);
  return books.map(toSummary);
}

async function withFallback(fetcher, filter, limit) {
  try {
    return { books: await fetcher(), fallback: false };
  } catch (err) {
    const books = await localFallback(filter, limit);
    if (!books.length) throw err;
    return { books, fallback: true };
  }
}

export function listGenres(_req, res) {
  res.json({ genres: GENRES.map(({ slug, name }) => ({ slug, name })) });
}

export async function search(req, res) {
  const q = String(req.query.q || '').trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  if (q.length < 2) throw badRequest('Search for at least 2 characters');
  try {
    res.json(await ol.searchBooks(q, { page, limit: 24 }));
  } catch (err) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const books = await localFallback({ $or: [{ title: rx }, { authors: rx }] }, 24);
    if (!books.length) throw err;
    res.json({ total: books.length, page: 1, books, fallback: true });
  }
}

export async function trending(req, res) {
  res.json(await withFallback(() => ol.trendingBooks('daily', 14), {}, 14));
}

export async function popular(req, res) {
  res.json(await withFallback(() => ol.trendingBooks('yearly', 14), {}, 14));
}

export async function newReleases(req, res) {
  const year = new Date().getFullYear();
  res.json(await withFallback(() => ol.newReleases(14), { firstPublishYear: { $gte: year - 1 } }, 14));
}

export async function byGenre(req, res) {
  const genre = genreBySlug(req.params.slug);
  if (!genre) throw badRequest('Unknown genre');
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 24;
  try {
    const { total, books } = await ol.booksBySubject(genre.slug, { limit, offset: (page - 1) * limit });
    res.json({ genre: { slug: genre.slug, name: genre.name }, total, page, books });
  } catch (err) {
    const books = await localFallback({ genres: genre.name }, limit);
    if (!books.length) throw err;
    res.json({ genre: { slug: genre.slug, name: genre.name }, total: books.length, page: 1, books, fallback: true });
  }
}

/** Recommendations from the reader's favourite genres and the genres on their shelves. */
export async function recommended(req, res) {
  const entries = await UserBook.find({ user: req.user._id }).populate('book', 'olId genres');
  const owned = new Set(entries.map((e) => e.book?.olId));

  const counts = new Map();
  for (const g of req.user.favouriteGenres || []) counts.set(g, (counts.get(g) || 0) + 3);
  for (const e of entries) for (const g of e.book?.genres || []) counts.set(g, (counts.get(g) || 0) + (e.status === 'read' ? 2 : 1));

  const topGenres = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => genreByName(name)).filter(Boolean).slice(0, 3);

  let books = [];
  let basedOn = topGenres.map((g) => g.name);
  try {
    if (topGenres.length) {
      const results = await Promise.all(topGenres.map((g) => ol.booksBySubject(g.slug, { limit: 16 }).catch(() => ({ books: [] }))));
      // Interleave genres so the row feels varied.
      const lists = results.map((r) => r.books.filter((b) => !owned.has(b.olId)));
      for (let i = 0; books.length < 14 && lists.some((l) => l[i]); i++) {
        for (const list of lists) if (list[i] && !books.some((b) => b.olId === list[i].olId)) books.push(list[i]);
      }
    }
    if (books.length < 6) {
      basedOn = [];
      books = (await ol.trendingBooks('weekly', 20)).filter((b) => !owned.has(b.olId)).slice(0, 14);
    }
    res.json({ books: books.slice(0, 14), basedOn });
  } catch (err) {
    const fallback = await localFallback({ olId: { $nin: [...owned] } }, 14);
    if (!fallback.length) throw err;
    res.json({ books: fallback, basedOn: [], fallback: true });
  }
}

export async function getBook(req, res) {
  const book = await getBookByOlId(req.params.olId);

  const [stats] = await Review.aggregate([
    { $match: { book: book._id } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const distribution = await Review.aggregate([
    { $match: { book: book._id } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]);
  const readers = await UserBook.countDocuments({ book: book._id });

  const payload = {
    book,
    stats: {
      average: stats ? Math.round(stats.average * 100) / 100 : null,
      count: stats?.count || 0,
      distribution: Object.fromEntries([1, 2, 3, 4, 5].map((r) => [r, distribution.find((d) => d._id === r)?.count || 0])),
      readers,
    },
  };

  if (req.user) {
    const [entry, review, shelves] = await Promise.all([
      UserBook.findOne({ user: req.user._id, book: book._id }),
      Review.findOne({ user: req.user._id, book: book._id }),
      CustomShelf.find({ user: req.user._id, 'books.book': book._id }, '_id name'),
    ]);
    payload.myEntry = entry;
    payload.myReview = review;
    payload.myShelves = shelves;
  }
  res.json(payload);
}

export { toSummary };
export const isObjectId = (id) => mongoose.isValidObjectId(id);
