/**
 * Curated genre list. `slug` is the Open Library subject used for browsing;
 * `keywords` are matched against Open Library's free-form subjects to derive
 * clean genres for a book.
 */
export const GENRES = [
  { slug: 'fantasy', name: 'Fantasy', keywords: ['fantasy', 'magic', 'dragons', 'wizards'] },
  { slug: 'science_fiction', name: 'Science Fiction', keywords: ['science fiction', 'sci-fi', 'dystopia', 'space opera'] },
  { slug: 'romance', name: 'Romance', keywords: ['romance', 'love stories'] },
  { slug: 'mystery_and_detective_stories', name: 'Mystery', keywords: ['mystery', 'detective', 'crime'] },
  { slug: 'thriller', name: 'Thriller', keywords: ['thriller', 'suspense'] },
  { slug: 'historical_fiction', name: 'Historical Fiction', keywords: ['historical fiction', 'history, fiction'] },
  { slug: 'literary_fiction', name: 'Literary Fiction', keywords: ['literary fiction', 'domestic fiction', 'psychological fiction'] },
  { slug: 'horror', name: 'Horror', keywords: ['horror', 'ghost stories', 'supernatural'] },
  { slug: 'young_adult_fiction', name: 'Young Adult', keywords: ['young adult', 'juvenile fiction', 'teen'] },
  { slug: 'classics', name: 'Classics', keywords: ['classics', 'classic literature'] },
  { slug: 'poetry', name: 'Poetry', keywords: ['poetry', 'poems'] },
  { slug: 'biography', name: 'Biography', keywords: ['biography', 'autobiography', 'memoir'] },
  { slug: 'history', name: 'History', keywords: ['history'] },
  { slug: 'self-help', name: 'Self-Help', keywords: ['self-help', 'self-actualization', 'personal development', 'habits', 'success'] },
  { slug: 'philosophy', name: 'Philosophy', keywords: ['philosophy'] },
  { slug: 'humor', name: 'Humour', keywords: ['humor', 'humour', 'comedy'] },
];

export const GENRE_NAMES = GENRES.map((g) => g.name);

export function genreBySlug(slug) {
  return GENRES.find((g) => g.slug === slug);
}

export function genreByName(name) {
  return GENRES.find((g) => g.name.toLowerCase() === String(name).toLowerCase());
}

/** Derives up to `max` clean genre names from raw Open Library subjects. */
export function deriveGenres(subjects = [], max = 3) {
  const lower = subjects.map((s) => String(s).toLowerCase());
  const scored = [];
  for (const genre of GENRES) {
    let score = 0;
    for (const subject of lower) {
      for (const kw of genre.keywords) {
        if (subject.includes(kw)) score += subject === kw ? 3 : 1;
      }
    }
    if (score > 0) scored.push({ name: genre.name, score });
  }
  // "History" matches too eagerly when the book is historical fiction.
  const names = scored.sort((a, b) => b.score - a.score).map((g) => g.name);
  const filtered = names.includes('Historical Fiction') ? names.filter((n) => n !== 'History') : names;
  return filtered.slice(0, max);
}
