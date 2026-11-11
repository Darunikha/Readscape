import mongoose from 'mongoose';

/**
 * A single canonical record per Open Library work. Shelves, reviews and
 * activities all reference this, so book data is never duplicated per user.
 */
const bookSchema = new mongoose.Schema(
  {
    olId: { type: String, required: true, unique: true, match: /^OL\d+W$/ },
    title: { type: String, required: true, trim: true },
    authors: { type: [String], default: [] },
    coverId: { type: Number, default: null },
    description: { type: String, default: '' },
    subjects: { type: [String], default: [] },
    genres: { type: [String], default: [] },
    firstPublishYear: { type: Number, default: null },
    publishDate: { type: String, default: '' },
    pageCount: { type: Number, default: null, min: 0 },
    olRating: {
      average: { type: Number, default: null },
      count: { type: Number, default: 0 },
    },
    enrichedAt: { type: Date, default: null },

    // The specific printed edition — spines differ between editions, so the
    // ISBN is the primary identifier for spine retrieval.
    edition: {
      isbn13: { type: String, default: '' },
      isbn10: { type: String, default: '' },
      publisher: { type: String, default: '' },
      publishDate: { type: String, default: '' },
      year: { type: Number, default: null },
      olEditionKey: { type: String, default: '' },
      coverId: { type: Number, default: null },
      source: { type: String, default: '' }, // 'openlibrary' | 'googlebooks' | 'manual'
      resolvedAt: { type: Date, default: null },
    },

    // A photograph of the real physical spine (never generated artwork).
    spine: {
      status: { type: String, enum: ['queued', 'searching', 'found', 'angled', 'unavailable', 'error'], default: undefined },
      imageUrl: { type: String, default: '' },
      thumbnailUrl: { type: String, default: '' },
      sourcePage: { type: String, default: '' },
      sourceName: { type: String, default: '' },
      provider: { type: String, default: '' }, // 'serpapi' | 'openverse' | 'manual'
      license: { type: String, default: '' },
      creator: { type: String, default: '' },
      width: { type: Number, default: null },
      height: { type: Number, default: null },
      box: { type: [Number], default: undefined }, // [ymin, xmin, ymax, xmax] in 0–1000
      view: { type: String, default: '' }, // 'spine' | 'angled'
      confidence: { type: Number, default: null },
      verifiedBy: { type: String, default: '' }, // 'gemini' | 'user'
      checkedAt: { type: Date, default: null },
      error: { type: String, default: '' },
      rejected: { type: [String], default: [] }, // image URLs marked wrong — never re-used
      queriesDone: { type: Number, default: 0 }, // web searches already spent on this book
      searchLevel: { type: Number, default: 0 }, // version of the search strategy last used
    },
  },
  { timestamps: true },
);

bookSchema.index({ title: 'text', authors: 'text' });

export const BOOK_CARD_FIELDS = 'olId title authors coverId genres firstPublishYear pageCount edition spine';

export default mongoose.model('Book', bookSchema);
