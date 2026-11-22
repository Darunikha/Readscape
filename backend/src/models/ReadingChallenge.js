import mongoose from 'mongoose';

/** The annual goal. Completed counts are derived from finished shelf entries. */
const readingChallengeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    year: { type: Number, required: true, min: 1900, max: 3000 },
    target: {
      type: Number,
      required: true,
      min: [1, 'Your goal should be at least 1 book'],
      max: [1000, 'Your goal can be at most 1000 books'],
    },
  },
  { timestamps: true },
);

readingChallengeSchema.index({ user: 1, year: 1 }, { unique: true });

export default mongoose.model('ReadingChallenge', readingChallengeSchema);
