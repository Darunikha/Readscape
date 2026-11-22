import Book from '../models/Book.js';
import { getWorkDetails } from './openLibrary.js';
import { badRequest, HttpError } from '../utils/httpError.js';

const REFRESH_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const enriching = new Set();

function sanitizeSummary(input = {}) {
  const olId = String(input.olId || '').trim();
  if (!/^OL\d+W$/.test(olId)) throw badRequest('A valid Open Library work id is required');
  const title = String(input.title || '').trim();
  return {
    olId,
    title: title.slice(0, 300),
    authors: Array.isArray(input.authors) ? input.authors.map(String).slice(0, 5) : [],
    coverId: Number.isInteger(input.coverId) && input.coverId > 0 ? input.coverId : null,
    firstPublishYear: Number.isInteger(input.firstPublishYear) ? input.firstPublishYear : null,
    pageCount: Number.isInteger(input.pageCount) && input.pageCount > 0 ? input.pageCount : null,
    genres: Array.isArray(input.genres) ? input.genres.map(String).slice(0, 3) : [],
  };
}

/** Merges fetched details into the stored book without wiping known values. */
function applyDetails(book, details) {
  for (const [key, value] of Object.entries(details)) {
    if (key === 'olId') continue;
    const empty = value === null || value === '' || (Array.isArray(value) && value.length === 0);
    if (!empty) book.set(key, value);
  }
  book.enrichedAt = new Date();
}

export async function enrichBook(book) {
  if (enriching.has(book.olId)) return book;
  enriching.add(book.olId);
  try {
    const details = await getWorkDetails(book.olId);
    applyDetails(book, details);
    await book.save();
  } finally {
    enriching.delete(book.olId);
  }
  return book;
}

/**
 * Finds or creates the canonical Book for a summary coming from the client
 * (e.g. a search result). If the summary has no title we fetch details first.
 * Missing details are filled in asynchronously.
 */
export async function upsertBookFromSummary(input) {
  const summary = sanitizeSummary(input);
  let book = await Book.findOne({ olId: summary.olId });
  if (book) return book;

  if (!summary.title) {
    return getBookByOlId(summary.olId);
  }

  try {
    book = await Book.create(summary);
  } catch (err) {
    if (err.code === 11000) return Book.findOne({ olId: summary.olId }); // created concurrently
    throw err;
  }
  enrichBook(book).catch(() => {}); // fire-and-forget; failures leave the summary data intact
  return book;
}

/** Returns a detailed book, fetching from Open Library when needed. */
export async function getBookByOlId(olId) {
  if (!/^OL\d+W$/.test(olId)) throw badRequest('Invalid book id');
  let book = await Book.findOne({ olId });
  const stale = !book?.enrichedAt || Date.now() - book.enrichedAt.getTime() > REFRESH_AFTER_MS;

  if (book && !stale) return book;

  try {
    const details = await getWorkDetails(olId);
    if (!book) {
      try {
        book = await Book.create({ ...details, enrichedAt: new Date() });
      } catch (err) {
        if (err.code !== 11000) throw err;
        book = await Book.findOne({ olId });
      }
    } else {
      applyDetails(book, details);
      await book.save();
    }
  } catch (err) {
    // If the catalogue is down but we have a local copy, serve that instead.
    if (book) return book;
    if (err instanceof HttpError) throw err;
    throw new HttpError(502, 'Could not load this book right now');
  }
  return book;
}
