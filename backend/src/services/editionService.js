/*
 * Resolves the specific printed edition of a book (ISBN-13/10, publisher, year).
 * Preference: the Open Library edition whose cover the reader actually sees,
 * then any edition with an ISBN, then Google Books by title + author.
 */
const OL = 'https://openlibrary.org';
const GB = 'https://www.googleapis.com/books/v1/volumes';
const UA = { 'User-Agent': 'Readscape/1.0 (personal book tracking app)', Accept: 'application/json' };

async function getJson(url, headers = UA) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return res.json();
}

const yearOf = (s) => Number(String(s || '').match(/\d{4}/)?.[0]) || null;

function fromOlEdition(e) {
  return {
    isbn13: e.isbn_13?.[0] || '',
    isbn10: e.isbn_10?.[0] || '',
    publisher: e.publishers?.[0] || '',
    publishDate: e.publish_date || '',
    year: yearOf(e.publish_date),
    olEditionKey: (e.key || '').replace('/books/', ''),
    coverId: (e.covers || []).find((c) => c > 0) || null,
    title: e.title || '',
    languages: (e.languages || []).map((l) => l.key?.replace('/languages/', '')),
  };
}

export async function listEditions(olId, limit = 50) {
  const data = await getJson(`${OL}/works/${olId}/editions.json?limit=${limit}`);
  return (data.entries || []).map(fromOlEdition);
}

async function googleBooks(query, { english = false } = {}) {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const url = `${GB}?q=${encodeURIComponent(query)}&maxResults=5&printType=books${english ? '&langRestrict=en' : ''}${key ? `&key=${key}` : ''}`;
  const data = await getJson(url, { Accept: 'application/json' });
  return (data.items || []).map((it) => {
    const v = it.volumeInfo || {};
    const id = (type) => v.industryIdentifiers?.find((x) => x.type === type)?.identifier || '';
    return { isbn13: id('ISBN_13'), isbn10: id('ISBN_10'), publisher: v.publisher || '', publishDate: v.publishedDate || '', year: yearOf(v.publishedDate), title: v.title || '' };
  });
}

export async function lookupIsbn(isbn) {
  const [hit] = await googleBooks(`isbn:${isbn}`).catch(() => []);
  return hit || null;
}

/** Returns the best-known edition for a Book document. */
export async function resolveEdition(book) {
  let editions = [];
  try { editions = await listEditions(book.olId); } catch { /* fall through to Google Books */ }

  const withIsbn = (e) => e.isbn13 || e.isbn10;
  const isEnglish = (e) => e.languages.includes('eng');
  const author = book.authors?.[0] || '';

  // 1. The edition whose cover the reader sees on Readscape.
  let edition = editions.find((e) => book.coverId && e.coverId === book.coverId && withIsbn(e));
  if (edition) edition = { ...edition, source: 'openlibrary' };

  // 2. Google Books' best English edition (Open Library often lacks language data).
  if (!edition) {
    try {
      const results = await googleBooks(`intitle:"${book.title}"${author ? ` inauthor:"${author}"` : ''}`, { english: true });
      const gb = results.find((r) => r.isbn13 || r.isbn10);
      if (gb) {
        const ol = editions.find((e) => (gb.isbn13 && e.isbn13 === gb.isbn13) || (gb.isbn10 && e.isbn10 === gb.isbn10));
        edition = { ...gb, olEditionKey: ol?.olEditionKey || '', coverId: ol?.coverId || null, languages: [], source: 'googlebooks' };
      }
    } catch { /* Google Books is optional */ }
  }

  // 3. Open Library editions explicitly marked English, then anything with an ISBN.
  if (!edition) {
    const chosen = editions.find((e) => withIsbn(e) && isEnglish(e) && e.coverId) || editions.find((e) => withIsbn(e) && isEnglish(e)) || editions.find(withIsbn);
    if (chosen) edition = { ...chosen, source: 'openlibrary' };
  }

  // Fill gaps from Google Books by ISBN.
  if (edition && (edition.isbn13 || edition.isbn10) && (!edition.publisher || !edition.year || !edition.isbn13 || !edition.isbn10)) {
    const gb = await lookupIsbn(edition.isbn13 || edition.isbn10).catch(() => null);
    if (gb) {
      edition.isbn13 ||= gb.isbn13;
      edition.isbn10 ||= gb.isbn10;
      edition.publisher ||= gb.publisher;
      edition.year ||= gb.year;
    }
  }

  if (!edition) return null;
  const { languages, title, ...rest } = edition; // eslint-disable-line no-unused-vars
  return { ...rest, resolvedAt: new Date() };
}
