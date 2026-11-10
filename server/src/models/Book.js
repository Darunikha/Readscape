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
  },
  { timestamps: true },
);

bookSchema.index({ title: 'text', authors: 'text' });

export const BOOK_CARD_FIELDS = 'olId title authors coverId genres firstPublishYear pageCount';

export default mongoose.model('Book', bookSchema);
