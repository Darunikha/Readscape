import CustomShelf from '../models/CustomShelf.js';
import UserBook from '../models/UserBook.js';
import Review from '../models/Review.js';
import { BOOK_CARD_FIELDS } from '../models/Book.js';
import { upsertBookFromSummary } from '../services/bookService.js';
import { refineEntries } from './shelfController.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';

const MAX_SHELVES = 30;

async function ownShelf(req) {
  const shelf = await CustomShelf.findOne({ _id: req.params.id, user: req.user._id });
  if (!shelf) throw notFound('Shelf not found');
  return shelf;
}

async function ensureUniqueName(userId, name, exceptId) {
  const nameKey = String(name || '').trim().toLowerCase();
  if (!nameKey) throw badRequest('Shelf name is required');
  if (['currently reading', 'read', 'want to read'].includes(nameKey)) throw conflict('That name is reserved for a default shelf');
  const clash = await CustomShelf.findOne({ user: userId, nameKey, _id: { $ne: exceptId } });
  if (clash) throw conflict('You already have a shelf with that name');
}

const shelfJson = (s) => ({ _id: s._id, name: s.name, count: s.books.length, createdAt: s.createdAt, updatedAt: s.updatedAt });

export async function listShelves(req, res) {
  const shelves = await CustomShelf.find({ user: req.user._id }).sort({ createdAt: 1 }).populate('books.book', 'coverId olId title');
  res.json({
    shelves: shelves.map((s) => ({
      ...shelfJson(s),
      preview: s.books.slice(-4).reverse().map((b) => b.book).filter(Boolean),
    })),
  });
}

export async function createShelf(req, res) {
  const { name } = req.body || {};
  if ((await CustomShelf.countDocuments({ user: req.user._id })) >= MAX_SHELVES) throw badRequest(`You can have up to ${MAX_SHELVES} custom shelves`);
  await ensureUniqueName(req.user._id, name);
  const shelf = await CustomShelf.create({ user: req.user._id, name: String(name).trim() });
  res.status(201).json({ shelf: shelfJson(shelf) });
}

export async function renameShelf(req, res) {
  const shelf = await ownShelf(req);
  await ensureUniqueName(req.user._id, req.body?.name, shelf._id);
  shelf.name = String(req.body.name).trim();
  await shelf.save();
  res.json({ shelf: shelfJson(shelf) });
}

export async function deleteShelf(req, res) {
  const shelf = await ownShelf(req);
  await shelf.deleteOne();
  res.json({ ok: true });
}

/** Books on a custom shelf, joined with the user's reading status for each. */
export async function shelfBooks(req, res) {
  const shelf = await ownShelf(req);
  await shelf.populate('books.book', BOOK_CARD_FIELDS);
  const bookIds = shelf.books.map((b) => b.book?._id).filter(Boolean);
  const [entries, reviews] = await Promise.all([
    UserBook.find({ user: req.user._id, book: { $in: bookIds } }),
    Review.find({ user: req.user._id, book: { $in: bookIds } }, 'book rating'),
  ]);
  const entryMap = new Map(entries.map((e) => [String(e.book), e]));
  const ratingMap = new Map(reviews.map((r) => [String(r.book), r.rating]));

  const items = shelf.books.filter((b) => b.book).map((b) => {
    const e = entryMap.get(String(b.book._id));
    const totalPages = e?.totalPages || b.book.pageCount || null;
    return {
      _id: e?._id || null,
      shelfItem: true,
      status: e?.status || null,
      currentPage: e?.currentPage || 0,
      totalPages,
      progress: e?.status === 'read' ? 100 : e && totalPages ? Math.round((e.currentPage / totalPages) * 100) : 0,
      createdAt: b.addedAt,
      updatedAt: e?.updatedAt || b.addedAt,
      finishedAt: e?.finishedAt || null,
      myRating: ratingMap.get(String(b.book._id)) ?? null,
      book: b.book,
    };
  });
  const genres = [...new Set(items.flatMap((i) => i.book.genres || []))].sort();
  res.json({ shelf: shelfJson(shelf), entries: refineEntries(items, req.query), genres, total: items.length });
}

export async function addBook(req, res) {
  const shelf = await ownShelf(req);
  const book = await upsertBookFromSummary(req.body?.book);
  // Atomic $addToSet-style guard: only push if not already present.
  const result = await CustomShelf.updateOne(
    { _id: shelf._id, 'books.book': { $ne: book._id } },
    { $push: { books: { book: book._id, addedAt: new Date() } } },
  );
  res.status(result.modifiedCount ? 201 : 200).json({ ok: true, added: result.modifiedCount === 1, olId: book.olId });
}

export async function removeBook(req, res) {
  const shelf = await ownShelf(req);
  const olId = req.params.olId;
  await shelf.populate('books.book', 'olId');
  const before = shelf.books.length;
  shelf.books = shelf.books.filter((b) => b.book?.olId !== olId);
  if (shelf.books.length === before) throw notFound('That book is not on this shelf');
  await shelf.save();
  res.json({ ok: true });
}
