import { useEffect, useState } from 'react';
import { coverUrl } from './utils';

/*
 * Derives spine colours from a book's real cover. The small cover image is
 * drawn to a tiny canvas (Open Library sends CORS headers), pixels are bucketed
 * and the most characterful colour becomes the spine, a contrasting one the
 * accent. Results are cached per cover. Falls back to palette tones.
 */
const cache = new Map();
const FALLBACK = [
  ['#684f48', '#c3a69a'], ['#7f645b', '#f0d7ab'], ['#5c7177', '#d6e9ed'], ['#93a8ad', '#fefaf3'],
  ['#9c7f74', '#f9e7c7'], ['#46332d', '#c79b66'], ['#758c92', '#ecdfd9'], ['#d6e9ed', '#684f48'],
];

export const hash = (s = '') => [...String(s)].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5381);

const hex = (r, g, b) => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
const parse = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const OAT = [249, 231, 199];
const INK = [51, 36, 31];

function finish(base, accent) {
  const soft = mix(base, OAT, 0.08); // a whisper of oat keeps spines cohesive with the palette
  const lum = luminance(soft);
  return {
    base: hex(...soft),
    accent: hex(...accent),
    text: lum > 0.58 ? '#33241f' : '#fefaf3',
    muted: lum > 0.58 ? 'rgb(51 36 31 / 0.65)' : 'rgb(254 250 243 / 0.75)',
  };
}

function fallbackColors(seed) {
  const [b, a] = FALLBACK[hash(seed) % FALLBACK.length];
  return finish(parse(b), parse(a));
}

function extract(img) {
  const w = 24;
  const h = 36;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]; const g = data[i + 1]; const b = data[i + 2];
    const key = (r >> 5) * 64 + (g >> 5) * 8 + (b >> 5);
    const entry = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    entry.n += 1; entry.r += r; entry.g += g; entry.b += b;
    buckets.set(key, entry);
  }
  const scored = [...buckets.values()].map((e) => {
    const c = [e.r / e.n, e.g / e.n, e.b / e.n];
    const max = Math.max(...c); const min = Math.min(...c);
    const sat = max === 0 ? 0 : (max - min) / max;
    const lum = luminance(c);
    const extreme = lum > 0.93 || lum < 0.06 ? 0.45 : 1;
    return { c, score: e.n * (0.55 + sat) * extreme };
  }).sort((a, b) => b.score - a.score);

  const base = scored[0].c;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const contrast = scored.find((s) => dist(s.c, base) > 90)?.c;
  const accent = contrast || mix(base, luminance(base) > 0.5 ? INK : OAT, 0.55);
  return finish(base, accent);
}

export function useSpineColors(book) {
  const key = book.coverId || `f:${book.olId}`;
  const [colors, setColors] = useState(() => cache.get(key) || fallbackColors(book.olId));

  useEffect(() => {
    if (cache.has(key)) { setColors(cache.get(key)); return undefined; }
    const fb = fallbackColors(book.olId);
    if (!book.coverId) { cache.set(key, fb); setColors(fb); return undefined; }
    let alive = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let c = fb;
      try { if (img.naturalWidth > 10) c = extract(img); } catch { /* tainted canvas: keep fallback */ }
      cache.set(key, c);
      if (alive) setColors(c);
    };
    img.onerror = () => cache.set(key, fb);
    img.src = coverUrl(book.coverId, 'S');
    return () => { alive = false; };
  }, [key, book.coverId, book.olId]);

  return colors;
}
