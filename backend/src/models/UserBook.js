import mongoose from 'mongoose';

export const SHELF_STATUSES = ['reading', 'read', 'want'];

/** A book on a user's bookshelf. One entry per (user, book) — no duplicates. */
const userBookSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    status: { type: String, enum: SHELF_STATUSES, required: true },
    currentPage: { type: Number, default: 0, min: 0 },
    totalPages: { type: Number, default: null, min: 1 },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userBookSchema.index({ user: 1, book: 1 }, { unique: true });
userBookSchema.index({ user: 1, status: 1, updatedAt: -1 });
userBookSchema.index({ user: 1, status: 1, finishedAt: 1 });

export default mongoose.model('UserBook', userBookSchema);
