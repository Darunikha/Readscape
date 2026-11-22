import { HttpError } from '../utils/httpError.js';
import { deriveGenres } from '../utils/genres.js';

const BASE = 'https://openlibrary.org';
const SEARCH_FIELDS = [
  'key', 'title', 'author_name', 'cover_i', 'first_publish_year',
  'number_of_pages_median', 'subject', 'ratings_average', 'ratings_count',
].join(',');

// Small in-memory TTL cache so repeated discovery requests stay fast and we
// stay polite to Open Library.
const cache = new Map();
const MAX_CACHE_ENTRIES = 500;

async function olFetch(path, ttlMs = 10 * 60 * 1000) {
  const hit = cache.get(path);
  if (hit && hit.expires > Date.now()) return hit.data;

  let res;
  try {
    res = await fetch(BASE + path, {
      headers: { 'User-Agent': 'Readscape/1.0 (personal book tracking app)', Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new HttpError(502, 'Could not reach the book catalogue. Please try again shortly.');
  }
  if (res.status === 404) throw new HttpError(404, 'Book not found');
  if (!res.ok) throw new HttpError(502, 'The book catalogue is unavailable right now.');

  const data = await res.json();
  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(path, { data, expires: Date.now() + ttlMs });
  return data;
}

const workId = (key = '') => key.replace('/works/', '');

/** Normalises a search/trending document into Readscape's book summary shape. */
export function fromSearchDoc(doc) {
  const subjects = (doc.subject || []).slice(0, 15);
  return {
    olId: workId(doc.key),
    title: doc.title,
    authors: (doc.author_name || []).slice(0, 3),
    coverId: doc.cover_i || null,
    firstPublishYear: doc.first_publish_year || null,
    pageCount: doc.number_of_pages_median || null,
    genres: deriveGenres(subjects),
    olRating: doc.ratings_average
      ? { average: Math.round(doc.ratings_average * 100) / 100, count: doc.ratings_count || 0 }
      : undefined,
  };
}

function fromSubjectWork(work) {
  const subjects = (work.subject || []).slice(0, 15);
  return {
    olId: workId(work.key),
    title: work.title,
    authors: (work.authors || []).map((a) => a.name).slice(0, 3),
    coverId: work.cover_id || null,
    firstPublishYear: work.first_publish_year || null,
    pageCount: null,
    genres: deriveGenres(subjects),
  };
}

const isWork = (b) => /^OL\d+W$/.test(b.olId) && b.title;

export async function searchBooks(query, { page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ q: query, page: String(page), limit: String(limit), fields: SEARCH_FIELDS });
  const data = await olFetch(`/search.json?${params}`);
  return { total: data.numFound || 0, page, books: (data.docs || []).map(fromSearchDoc).filter(isWork) };
}

export async function trendingBooks(period = 'daily', limit = 12) {
  const allowed = ['daily', 'weekly', 'monthly', 'yearly', 'forever'];
  const p = allowed.includes(period) ? period : 'daily';
  const data = await olFetch(`/trending/${p}.json?limit=${limit}`, 30 * 60 * 1000);
  return (data.works || []).map(fromSearchDoc).filter(isWork);
}

export async function newReleases(limit = 12) {
  const year = new Date().getFullYear();
  const params = new URLSearchParams({
    q: `first_publish_year:[${year - 1} TO ${year}]`,
    sort: 'readinglog',
    limit: String(limit),
    fields: SEARCH_FIELDS,
  });
  const data = await olFetch(`/search.json?${params}`, 60 * 60 * 1000);
  return (data.docs || []).map(fromSearchDoc).filter(isWork);
}

export async function booksBySubject(slug, { limit = 18, offset = 0 } = {}) {
  const safe = encodeURIComponent(String(slug).toLowerCase());
  const data = await olFetch(`/subjects/${safe}.json?limit=${limit}&offset=${offset}`, 60 * 60 * 1000);
  return { total: data.work_count || 0, books: (data.works || []).map(fromSubjectWork).filter(isWork) };
}

function cleanDescription(desc) {
  const text = typeof desc === 'string' ? desc : desc?.value || '';
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n-{3,}\n|\n\*\*Contains\*\*|\n\(\[source\]/i)[0] // drop trailing source/link sections
    .replace(/\[([^\]]+)\]\[\d+\]/g, '$1') // [text][1] markdown refs
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1')
    .replace(/^\s*\[\d+\]:.*$/gm, '')
    .trim()
    .slice(0, 6000);
}

/** Fetches the full details for a work: description, authors, pages, rating. */
export async function getWorkDetails(olId) {
  if (!/^OL\d+W$/.test(olId)) throw new HttpError(400, 'Invalid book id');
  const work = await olFetch(`/works/${olId}.json`, 24 * 60 * 60 * 1000);

  const authorKeys = (work.authors || []).map((a) => a.author?.key).filter(Boolean).slice(0, 3);
  const [authors, editions, ratings] = await Promise.all([
    Promise.all(authorKeys.map((k) => olFetch(`${k}.json`, 7 * 24 * 60 * 60 * 1000).then((a) => a.name).catch(() => null))),
    olFetch(`/works/${olId}/editions.json?limit=20`, 24 * 60 * 60 * 1000).catch(() => ({ entries: [] })),
    olFetch(`/works/${olId}/ratings.json`, 6 * 60 * 60 * 1000).catch(() => null),
  ]);

  const entries = editions.entries || [];
  const pageCounts = entries.map((e) => e.number_of_pages).filter((n) => Number.isInteger(n) && n > 20).sort((a, b) => a - b);
  const pageCount = pageCounts.length ? pageCounts[Math.floor(pageCounts.length / 2)] : null;
  const publishDate = work.first_publish_date || entries.map((e) => e.publish_date).filter(Boolean).sort().at(0) || '';
  const yearMatch = String(publishDate).match(/\d{4}/);
  const subjects = (work.subjects || []).slice(0, 15);
  const editionCover = entries.find((e) => e.covers?.[0] > 0)?.covers?.[0];

  return {
    olId,
    title: work.title,
    authors: authors.filter(Boolean),
    coverId: (work.covers || []).find((c) => c > 0) || editionCover || null,
    description: cleanDescription(work.description),
    subjects,
    genres: deriveGenres(subjects),
    publishDate,
    firstPublishYear: yearMatch ? Number(yearMatch[0]) : null,
    pageCount,
    olRating: ratings?.summary?.average
      ? { average: Math.round(ratings.summary.average * 100) / 100, count: ratings.summary.count || 0 }
      : { average: null, count: 0 },
  };
}
