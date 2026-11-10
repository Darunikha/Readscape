export const cn = (...parts) => parts.flat().filter(Boolean).join(' ');

export const coverUrl = (coverId, size = 'M') => (coverId ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg` : null);

/** The minimal book payload the API needs to shelve a book. */
export const bookSummary = (b) => ({
  olId: b.olId,
  title: b.title,
  authors: b.authors || [],
  coverId: b.coverId || null,
  firstPublishYear: b.firstPublishYear || null,
  pageCount: b.pageCount || null,
  genres: b.genres || [],
});

export const SHELVES = {
  reading: { key: 'reading', label: 'Currently Reading', short: 'Reading' },
  read: { key: 'read', label: 'Read', short: 'Read' },
  want: { key: 'want', label: 'Want to Read', short: 'Want to Read' },
};

export const authorLine = (authors = []) => (authors.length ? authors.slice(0, 2).join(', ') : 'Unknown author');

export function timeAgo(date) {
  if (!date) return '';
  const s = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  const units = [[60, 'minute'], [24, 'hour'], [7, 'day'], [4.35, 'week'], [12, 'month'], [Infinity, 'year']];
  let value = s / 60;
  for (const [step, unit] of units) {
    if (value < step) {
      const n = Math.floor(value);
      return `${n} ${unit}${n === 1 ? '' : 's'} ago`;
    }
    value /= step;
  }
  return '';
}

export const formatDate = (date, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  date ? new Date(date).toLocaleDateString(undefined, opts) : '';

/** yyyy-mm-dd for <input type="date"> in local time. */
export function toInputDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayInput = () => toInputDate(new Date());

export const pluralize = (n, word, plural = `${word}s`) => `${n} ${n === 1 ? word : plural}`;

/** Resizes an image file to a square JPEG data URL for avatars. */
export function resizeImage(file, size = 256) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file'));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const min = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That image could not be read')); };
    img.src = url;
  });
}
