import Activity from '../models/Activity.js';
import { BOOK_CARD_FIELDS } from '../models/Book.js';

const COALESCE_PROGRESS_MS = 6 * 60 * 60 * 1000;

export async function logActivity({ user, type, book = null, targetUser = null, data = {} }) {
  try {
    if (type === 'progress' && book) {
      // Collapse frequent progress updates on the same book into one entry.
      const recent = await Activity.findOne({
        user,
        book,
        type: 'progress',
        createdAt: { $gte: new Date(Date.now() - COALESCE_PROGRESS_MS) },
      });
      if (recent) {
        recent.data = data;
        recent.markModified('data');
        await recent.save();
        return recent;
      }
    }
    return await Activity.create({ user, type, book, targetUser, data });
  } catch (err) {
    console.error('[activity] failed to log', err.message);
    return null;
  }
}

export function populateActivity(query) {
  return query
    .populate('user', 'username displayName avatar')
    .populate('targetUser', 'username displayName avatar')
    .populate('book', BOOK_CARD_FIELDS);
}
