import Book from '../models/Book.js';
import { listEditions } from '../services/editionService.js';
import { rejectSpine, requestSpines, retrySpine, setManualSpine, spineEnabled } from '../services/spineService.js';
import { badRequest, notFound } from '../utils/httpError.js';

async function bookByOlId(olId) {
  const book = await Book.findOne({ olId });
  if (!book) throw notFound('Book not found');
  return book;
}

const spineJson = (book) => ({ olId: book.olId, edition: book.edition, spine: book.spine, enabled: spineEnabled() });

/** Queue spine lookups for books that have never been checked. */
export async function request(req, res) {
  const olIds = Array.isArray(req.body?.olIds) ? req.body.olIds.filter((id) => /^OL\d+W$/.test(id)).slice(0, 200) : [];
  if (!olIds.length) return res.json({ queued: 0, enabled: spineEnabled() });
  const books = await Book.find({ olId: { $in: olIds } }, '_id');
  res.json(await requestSpines(books.map((b) => b._id)));
}

/** Current status for a set of books (used for polling while searches run). */
export async function status(req, res) {
  const olIds = String(req.query.olIds || '').split(',').filter((id) => /^OL\d+W$/.test(id)).slice(0, 200);
  const books = await Book.find({ olId: { $in: olIds } }, 'olId spine edition');
  res.json({ books: books.map(spineJson), enabled: spineEnabled() });
}

export async function getOne(req, res) {
  res.json(spineJson(await bookByOlId(req.params.olId)));
}

export async function retry(req, res) {
  const book = await bookByOlId(req.params.olId);
  if (!spineEnabled()) throw badRequest('Spine search is not configured on the server (GEMINI_API_KEY missing)');
  await retrySpine(book);
  res.json(spineJson(await bookByOlId(req.params.olId)));
}

export async function reject(req, res) {
  const book = await bookByOlId(req.params.olId);
  if (!book.spine?.imageUrl) throw badRequest('There is no spine image to reject');
  await rejectSpine(book);
  res.json(spineJson(await bookByOlId(req.params.olId)));
}

export async function setManual(req, res) {
  const book = await bookByOlId(req.params.olId);
  const imageUrl = String(req.body?.imageUrl || '').trim();
  const sourcePage = String(req.body?.sourcePage || '').trim();
  if (!/^https:\/\/\S+$/i.test(imageUrl)) throw badRequest('Please provide an https link to the image');
  if (sourcePage && !/^https?:\/\/\S+$/i.test(sourcePage)) throw badRequest('The source page must be a web link');
  try {
    await setManualSpine(book, { imageUrl, sourcePage });
  } catch (err) {
    throw badRequest(`That image could not be used: ${err.message}`);
  }
  res.json(spineJson(await bookByOlId(req.params.olId)));
}

export async function editions(req, res) {
  const list = await listEditions(req.params.olId, 100).catch(() => []);
  res.json({ editions: list.filter((e) => e.isbn13 || e.isbn10).map(({ languages, ...e }) => ({ ...e, english: !languages.length || languages.includes('eng') })) });
}

/** Choose the edition the reader owns; its spine is searched afresh. */
export async function setEdition(req, res) {
  const book = await bookByOlId(req.params.olId);
  const key = String(req.body?.olEditionKey || '');
  const chosen = (await listEditions(book.olId, 100)).find((e) => e.olEditionKey === key);
  if (!chosen) throw badRequest('That edition was not found for this book');
  const { languages, title, ...edition } = chosen; // eslint-disable-line no-unused-vars
  await Book.updateOne({ _id: book._id }, { $set: { edition: { ...edition, source: 'manual', resolvedAt: new Date() } } });
  const updated = await bookByOlId(book.olId);
  if (spineEnabled() && updated.spine?.verifiedBy !== 'user') await retrySpine(updated);
  res.json(spineJson(await bookByOlId(book.olId)));
}
