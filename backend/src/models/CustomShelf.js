import mongoose from 'mongoose';

const customShelfSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: {
      type: String,
      required: [true, 'Shelf name is required'],
      trim: true,
      minlength: [1, 'Shelf name is required'],
      maxlength: [40, 'Shelf names are limited to 40 characters'],
    },
    // Lower-cased name used to enforce case-insensitive uniqueness per user.
    nameKey: { type: String, required: true },
    books: {
      type: [
        {
          _id: false,
          book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
          addedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

customShelfSchema.index({ user: 1, nameKey: 1 }, { unique: true });

customShelfSchema.pre('validate', function setKey() {
  if (this.name) this.nameKey = this.name.trim().toLowerCase();
});

export default mongoose.model('CustomShelf', customShelfSchema);
