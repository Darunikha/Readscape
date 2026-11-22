import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [24, 'Username must be at most 24 characters'],
      match: [/^[a-z0-9_]+$/, 'Username may only contain letters, numbers and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },
    password: { type: String, required: true, select: false },
    displayName: { type: String, trim: true, maxlength: 50, default: '' },
    bio: { type: String, trim: true, maxlength: [280, 'Bio must be at most 280 characters'], default: '' },
    avatar: { type: String, default: '' },
    favouriteGenres: { type: [String], default: [] },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

/** Fields safe to show to other users. */
export const PUBLIC_USER_FIELDS = 'username displayName avatar bio favouriteGenres isPublic createdAt';

export default mongoose.model('User', userSchema);
