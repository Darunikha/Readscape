/*
 * Spine retrieval pipeline, run in a small background queue:
 *   1. resolve the exact edition (ISBN, publisher, year)
 *   2. search for photographs (SerpApi Google Images, then Openverse)
 *   3. verify candidates with Gemini vision; accept only strict matches
 *   4. store the verified image URL + source on the Book (cached; never re-searched
 *      unless a reader asks)
 * If nothing authentic is found the book is marked "unavailable" — the client
 * then falls back to the front cover / a labelled placeholder. Nothing is generated.
 */
import Book from '../models/Book.js';
import { resolveEdition } from './editionService.js';
import { openverseImages, serpApiImages } from './imageSearch.js';
import { boxRatio, fetchImage, isAcceptable, locateSpine, MIN_SPINE_RATIO, RateLimitError, refineBox, score, verifyCandidates, verifyCrop } from './spineVerifier.js';

const MIN_GAP_MS = Number(process.env.SPINE_MIN_GAP_MS ?? 7000); // stay under free-tier RPM
const DAILY_LIMIT = Number(process.env.SPINE_DAILY_LIMIT ?? 80); // books processed per day
const BATCH = 8;

const MAX_ATTEMPTS = 5; // automatic retries when Gemini is busy

const queue = [];
const queued = new Set();
const searchCache = new Map(); // `${bookId}:${provider}` → candidates
const attempts = new Map(); // bookId → retries used
let running = false;
let pausedUntil = 0;
let day = { date: '', count: 0 };

export const spineEnabled = () => Boolean(process.env.GEMINI_API_KEY) && process.env.NODE_ENV !== 'test';

const coverUrl = (id) => (id ? `https://covers.openlibrary.org/b/id/${id}-M.jpg` : null);

async function setSpine(bookId, patch) {
  const set = Object.fromEntries(Object.entries(patch).map(([k, v]) => [`spine.${k}`, v]));
  await Book.updateOne({ _id: bookId }, { $set: set });
}

function clearedSpine(status) {
  return {
    status, imageUrl: '', thumbnailUrl: '', sourcePage: '', sourceName: '', provider: '', license: '', creator: '',
    width: null, height: null, box: null, view: '', confidence: null, verifiedBy: '', error: '',
    queriesDone: 0, searchLevel: 0, cropChecked: false,
  };
}

async function findSpine(book) {
  // 1. Edition
  if (!book.edition?.resolvedAt) {
    const edition = await resolveEdition(book).catch(() => null);
    if (edition) {
      book.edition = edition;
      await Book.updateOne({ _id: book._id }, { $set: { edition } });
    }
  }
  const reference = coverUrl(book.edition?.coverId || book.coverId);
  const rejected = new Set(book.spine?.rejected || []);
  const author = book.authors?.[0] || '';
  const notRejected = (c) => !rejected.has(c.imageUrl) && !rejected.has(c.thumbnailUrl);

  // 2 + 3. Search providers in order; verify in small batches. A second, differently
  // worded web search runs only if the first found nothing (max 2 SerpApi searches per book).
  const serpQueries = [`"${book.title}" ${author} book spine`, `${book.title} ${author} book spine bookshelf`];
  const alreadyDone = book.spine?.queriesDone || 0; // earlier attempts aren't repeated
  const sources = [
    ...serpQueries.slice(alreadyDone).map((q, i) => [`serpapi${alreadyDone + i}`, () => serpApiImages(q)]),
    ['openverse', () => openverseImages(`${book.title} ${author} book`)],
  ];
  for (const [name, search] of sources) {
    // Results are cached so a retry after a Gemini hiccup doesn't spend another search.
    const cacheKey = `${book._id}:${name}`;
    let candidates = searchCache.get(cacheKey);
    if (!candidates) {
      try { candidates = await search(); } catch (err) { console.warn('[spines] search failed:', err.message); candidates = []; }
      searchCache.set(cacheKey, candidates);
    }
    candidates = candidates.filter(notRejected);
    for (let i = 0; i < Math.min(candidates.length, BATCH * 3); i += BATCH) {
      const verified = await verifyCandidates(book, candidates.slice(i, i + BATCH), reference);
      const accepted = verified.filter(isAcceptable).sort((a, b) => score(b) - score(a));
      // The box must frame ONE spine, and the exact cropped region must be a clean spine
      // (no cover artwork, no neighbouring books) before it is ever shown.
      for (const best of accepted.slice(0, 3)) {
        const { candidate: c, assessment: a, image } = best;
        const need = MIN_SPINE_RATIO[a.view] || MIN_SPINE_RATIO.spine;
        const goodCrop = async (box) => {
          const ratio = boxRatio(box, c.width, c.height);
          if (ratio < need) return false;
          const cc = await verifyCrop(book, image, box).catch(onlyRateLimit);
          if (cc === undefined) return false;
          if (cc === null) return ratio >= 5; // image can't be cropped for checking: trust only clearly spine-shaped boxes
          return cc.clean;
        };
        if (await goodCrop(a.spineBox)) return { candidate: c, assessment: a };
        const refined = await refineBox(book, c).catch(onlyRateLimit);
        if (refined && await goodCrop(refined)) return { candidate: c, assessment: { ...a, spineBox: refined } };
      }
      await new Promise((r) => setTimeout(r, MIN_GAP_MS));
    }
  }
  return null;
}

const clearCache = (id) => { for (const k of searchCache.keys()) if (k.startsWith(`${id}:`)) searchCache.delete(k); };

// Re-throw quota/overload errors (the book is retried later); treat anything else as "no result".
function onlyRateLimit(err) {
  if (err instanceof RateLimitError) throw err;
  return undefined;
}

/**
 * Re-checks a stored result with the crop check. Photos whose displayed region
 * isn't a clean single spine are rejected (never reused) and the book is searched again.
 */
async function auditBook(bookId) {
  const book = await Book.findById(bookId);
  if (!book || book.spine?.cropChecked || book.spine?.verifiedBy === 'user' || !['found', 'angled'].includes(book.spine?.status)) return;
  const source = { thumbnailUrl: book.spine.thumbnailUrl || book.spine.imageUrl };
  const image = await fetchImage(source.thumbnailUrl, 2 * 1024 * 1024).catch(() => null);
  if (!image) { await setSpine(bookId, { cropChecked: true }); return; } // image unreachable now; leave it as it was
  const need = MIN_SPINE_RATIO[book.spine.view] || MIN_SPINE_RATIO.spine;
  const ok = async (box) => {
    if (!box || boxRatio(box, book.spine.width, book.spine.height) < need) return false;
    const cc = await verifyCrop(book, image, box).catch(onlyRateLimit);
    if (cc === undefined) return false;
    return cc === null ? true : cc.clean;
  };
  if (await ok(book.spine.box)) { await setSpine(bookId, { cropChecked: true }); return; }
  const refined = await refineBox(book, source).catch(onlyRateLimit);
  if (refined && await ok(refined)) { await setSpine(bookId, { box: refined, cropChecked: true }); return; }
  console.log(`[spines] rejecting a sloppy crop for "${book.title}" — searching again`);
  await rejectSpine(book);
}

async function processBook(rawId) {
  if (String(rawId).startsWith('audit:')) {
    const id = String(rawId).slice(6);
    try {
      await auditBook(id);
      attempts.delete(rawId);
    } catch (err) {
      if (err instanceof RateLimitError && (attempts.get(rawId) || 0) < MAX_ATTEMPTS) {
        attempts.set(rawId, (attempts.get(rawId) || 0) + 1);
        pausedUntil = Date.now() + err.retryAfterMs;
        queue.unshift(rawId);
        queued.add(rawId);
      } else {
        console.warn('[spines] audit failed -', err.message);
        attempts.delete(rawId);
        await setSpine(id, { cropChecked: true }).catch(() => {});
      }
    }
    return;
  }
  const bookId = rawId;
  const book = await Book.findById(bookId);
  if (!book || book.spine?.verifiedBy === 'user') return;
  await setSpine(bookId, { status: 'searching', error: '' });
  try {
    const best = await findSpine(book);
    clearCache(bookId);
    attempts.delete(String(bookId));
    if (best) {
      const { candidate: c, assessment: a } = best;
      await setSpine(bookId, {
        status: a.view === 'spine' ? 'found' : 'angled',
        imageUrl: c.imageUrl, thumbnailUrl: c.thumbnailUrl, sourcePage: c.sourcePage, sourceName: c.sourceName,
        provider: c.provider, license: c.license, creator: c.creator, width: c.width, height: c.height,
        box: a.spineBox, view: a.view, confidence: Number(a.confidence) || null, verifiedBy: 'gemini', checkedAt: new Date(),
        searchLevel: 2, cropChecked: true,
      });
    } else {
      await setSpine(bookId, { ...clearedSpine('unavailable'), checkedAt: new Date(), queriesDone: 2, searchLevel: 2 });
    }
  } catch (err) {
    const id = String(bookId);
    if (err instanceof RateLimitError && (attempts.get(id) || 0) < MAX_ATTEMPTS) {
      attempts.set(id, (attempts.get(id) || 0) + 1);
      pausedUntil = Date.now() + err.retryAfterMs;
      await setSpine(bookId, { status: 'queued' });
      queue.unshift(id);
      queued.add(id);
      return;
    }
    clearCache(bookId);
    attempts.delete(id);
    console.warn('[spines] failed for', book.title, '-', err.message);
    await setSpine(bookId, { status: 'error', error: err.message.slice(0, 200), checkedAt: new Date() });
  }
}

async function run() {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      const wait = pausedUntil - Date.now();
      if (wait > 0) { await new Promise((r) => setTimeout(r, Math.min(wait, 60000))); continue; }
      const today = new Date().toISOString().slice(0, 10);
      if (day.date !== today) day = { date: today, count: 0 };
      if (day.count >= DAILY_LIMIT) { pausedUntil = Date.now() + 60 * 60 * 1000; continue; }

      const id = queue.shift();
      queued.delete(id);
      day.count += 1;
      await processBook(id);
      await new Promise((r) => setTimeout(r, MIN_GAP_MS));
    }
  } finally {
    running = false;
  }
}

/** Queue books that have never been checked (cached results are never re-searched). */
export async function requestSpines(bookIds, { force = false } = {}) {
  if (!spineEnabled()) return { queued: 0, enabled: false };
  const filter = { _id: { $in: bookIds } };
  if (!force) filter.$or = [{ 'spine.status': { $exists: false } }, { 'spine.status': null }];
  const books = await Book.find(filter, '_id');
  let added = 0;
  for (const b of books) {
    const id = String(b._id);
    if (queued.has(id)) continue;
    queued.add(id);
    queue.push(id);
    added += 1;
  }
  if (added) {
    await Book.updateMany({ _id: { $in: books.map((b) => b._id) } }, { $set: { 'spine.status': 'queued' } });
    run();
  }
  return { queued: added, enabled: true };
}

/** Re-queue anything left mid-flight by a restart. */
export async function resumeSpineQueue() {
  if (!spineEnabled()) return;
  // Books that found nothing with the older single-query search get one more, wider try.
  await Book.updateMany(
    { 'spine.status': 'unavailable', 'spine.searchLevel': { $not: { $gte: 2 } }, 'spine.verifiedBy': { $ne: 'user' } },
    { $set: { 'spine.status': 'queued', 'spine.queriesDone': 1 } },
  );
  const pending = await Book.find({ 'spine.status': { $in: ['queued', 'searching'] } }, '_id');
  for (const b of pending) { if (!queued.has(String(b._id))) { queued.add(String(b._id)); queue.push(String(b._id)); } }
  // Audit stored photos with the stricter crop check (after the pending searches).
  const unaudited = await Book.find({ 'spine.status': { $in: ['found', 'angled'] }, 'spine.cropChecked': { $ne: true }, 'spine.verifiedBy': { $ne: 'user' } }, '_id');
  for (const b of unaudited) { const key = `audit:${b._id}`; if (!queued.has(key)) { queued.add(key); queue.push(key); } }
  if (pending.length) console.log(`[spines] resuming ${pending.length} queued book(s)`);
  if (unaudited.length) console.log(`[spines] auditing ${unaudited.length} stored spine photo(s)`);
  if (pending.length || unaudited.length) run();
}

export async function retrySpine(book) {
  if (book.spine?.verifiedBy === 'user') await setSpine(book._id, { verifiedBy: '' });
  await setSpine(book._id, clearedSpine(null));
  return requestSpines([book._id], { force: true });
}

/** The current image is wrong: never use it again, then search again. */
export async function rejectSpine(book) {
  const bad = [book.spine?.imageUrl, book.spine?.thumbnailUrl].filter(Boolean);
  await Book.updateOne({ _id: book._id }, { $addToSet: { 'spine.rejected': { $each: bad } } });
  await setSpine(book._id, clearedSpine(null));
  return requestSpines([book._id], { force: true });
}

/** A reader supplies a verified photo themselves. */
export async function setManualSpine(book, { imageUrl, sourcePage }) {
  const located = await locateSpine(book, imageUrl);
  // Same "exactly one spine" check as automatic results.
  if (located.box && boxRatio(located.box, located.width, located.height) < MIN_SPINE_RATIO[located.view === 'angled' ? 'angled' : 'spine']) {
    const refined = await refineBox(book, { thumbnailUrl: imageUrl }).catch(() => null);
    if (refined) located.box = refined;
  }
  let host = '';
  try { host = new URL(sourcePage || imageUrl).hostname.replace(/^www\./, ''); } catch { /* ignore */ }
  await setSpine(book._id, {
    ...clearedSpine(located.view === 'angled' ? 'angled' : 'found'),
    imageUrl, thumbnailUrl: imageUrl, sourcePage: sourcePage || imageUrl, sourceName: host, provider: 'manual',
    width: located.width, height: located.height, box: located.box || null, view: located.view,
    verifiedBy: 'user', checkedAt: new Date(),
  });
}
