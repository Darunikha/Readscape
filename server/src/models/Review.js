import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    rating: {
      type: Number,
      required: [true, 'Please choose a rating'],
      min: [1, 'Rating must be between 1 and 5'],
      max: [5, 'Rating must be between 1 and 5'],
      validate: { validator: Number.isInteger, message: 'Rating must be a whole number' },
    },
    body: { type: String, trim: true, maxlength: [5000, 'Reviews are limited to 5000 characters'], default: '' },
    spoiler: { type: Boolean, default: false },
    likes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
  },
  { timestamps: true },
);

reviewSchema.index({ user: 1, book: 1 }, { unique: true });
reviewSchema.index({ book: 1, createdAt: -1 });
reviewSchema.index({ createdAt: -1 });

export default mongoose.model('Review', reviewSchema);
