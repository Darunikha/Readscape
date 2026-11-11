/*
 * Verifies candidate photos with Gemini vision (free tier). For each candidate
 * it reports whether the real spine of THIS book is visible, whether it's a
 * genuine photograph, whether it matches the edition's cover design, and where
 * the spine is (a bounding box we can crop to).
 */
import { imageSize } from 'image-size';

// Free-tier models, tried in order when one is overloaded.
const MODELS = () => [process.env.GEMINI_MODEL || 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];
// A stronger model for the precise "exactly one spine" bounding box.
const PRECISE_MODELS = () => [process.env.GEMINI_PRECISE_MODEL || 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest'];
const ENDPOINT = (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

/** Quota or overload — the book is re-queued and tried again later. */
export class RateLimitError extends Error {
  constructor(message, retryAfterMs) { super(message); this.retryAfterMs = retryAfterMs; }
}

export async function fetchImage(url, maxBytes = 4 * 1024 * 1024) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Readscape/1.0 (personal book tracking app)', Accept: 'image/*' },
    signal: AbortSignal.timeout(15000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Image HTTP ${res.status}`);
  const type = res.headers.get('content-type') || '';
  if (!/^image\/(jpe?g|png|webp|gif)/.test(type)) throw new Error('Not a supported image');
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > maxBytes) throw new Error('Image too large');
  let dims = {};
  try { dims = imageSize(buf); } catch { /* unknown format details */ }
  return { buf, type: type.split(';')[0], width: dims.width || null, height: dims.height || null };
}

function validBox(b) {
  return Array.isArray(b) && b.length === 4 && b.every((n) => Number.isFinite(n) && n >= 0 && n <= 1000) && b[2] > b[0] && b[3] > b[1];
}

async function callModel(model, parts) {
  const res = await fetch(ENDPOINT(model), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }),
    signal: AbortSignal.timeout(90000),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

/** Calls Gemini, falling back across free models when one is busy or out of quota. */
async function callGemini(parts, models = MODELS()) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
  let limited = null;
  for (const model of [...new Set(models)]) {
    let res; let data;
    try { ({ res, data } = await callModel(model, parts)); } catch { continue; } // network/timeout: try next model
    const msg = JSON.stringify(data.error || '');
    if (res.status === 429 || data.error?.status === 'RESOURCE_EXHAUSTED') {
      limited = /per day|PerDay/i.test(msg) ? 60 * 60 * 1000 : 65 * 1000;
      continue;
    }
    if (res.status >= 500 || /high demand|overloaded|unavailable/i.test(msg)) { limited ??= 2 * 60 * 1000; continue; }
    if (res.status === 404) continue; // model not available to this key
    if (data.error) throw new Error(`Gemini: ${data.error.message}`);
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '[]';
    try { return JSON.parse(text); } catch { continue; }
  }
  throw new RateLimitError('Gemini is busy or over its free quota — will retry later', limited || 2 * 60 * 1000);
}

/** Long ÷ short side of a box, in the photo's pixel space. */
export function boxRatio(box, width, height) {
  const [y1, x1, y2, x2] = box;
  const w = ((x2 - x1) / 1000) * (width || 1000);
  const h = ((y2 - y1) / 1000) * (height || 1000);
  return Math.max(w, h) / Math.max(1, Math.min(w, h));
}

function describe(book) {
  const e = book.edition || {};
  const bits = [`"${book.title}"`, book.authors?.[0] ? `by ${book.authors[0]}` : '', e.publisher ? `published by ${e.publisher}` : '', e.year ? `(${e.year} edition)` : '', e.isbn13 ? `ISBN ${e.isbn13}` : ''];
  return bits.filter(Boolean).join(' ');
}

const INSTRUCTIONS = (book, hasReference) => `You are verifying photographs of the PHYSICAL book ${describe(book)}.
${hasReference ? 'The first image is the REFERENCE front cover of this edition. ' : ''}Then numbered candidate images follow.
For EACH candidate, judge strictly:
- spineVisible: is the SPINE of this exact book (the narrow edge between the covers, carrying the title) clearly visible?
- view: "spine" if the spine faces the camera; "angled" if the book is shown at an angle with its spine visible; "cover" if only the front/back cover; "other" otherwise.
- titleMatch: is the title "${book.title}" actually legible ON THE SPINE (not just on a cover)?
- authorMatch: is the author's name legible on the spine?
- sameEdition: does the spine's design (colours, typography, publisher logo) plausibly belong to the same edition as the reference cover?${hasReference ? '' : ' Use null if unsure.'}
- genuinePhoto: is it a real photograph of a physical object? Mark false for illustrations, flat digital mockups, 3D renders, collages, fan art or AI-generated images.
- spineBox: bounding box [ymin, xmin, ymax, xmax] (0–1000 scale) tightly around the ONE clearest spine of THIS book only (not other books). null if not visible.
- confidence: 0–1 that this candidate truly shows this book's spine.
Return ONLY a JSON array with one object per candidate: {"index", "view", "spineVisible", "titleMatch", "authorMatch", "sameEdition", "genuinePhoto", "spineBox", "confidence"}.`;

/**
 * Verifies up to ~8 candidates in one request (saves free-tier quota).
 * Returns [{ candidate, assessment }] for candidates that downloaded.
 */
export async function verifyCandidates(book, candidates, referenceCoverUrl) {
  const loaded = [];
  for (const c of candidates) {
    try {
      const img = await fetchImage(c.thumbnailUrl, 1.5 * 1024 * 1024);
      loaded.push({ c: { ...c, width: c.width || img.width, height: c.height || img.height }, img });
    } catch { /* skip unreachable images */ }
  }
  if (!loaded.length) return [];

  let reference = null;
  if (referenceCoverUrl) { try { reference = await fetchImage(referenceCoverUrl); } catch { /* optional */ } }

  const parts = [{ text: INSTRUCTIONS(book, Boolean(reference)) }];
  if (reference) parts.push({ text: 'Reference cover:' }, { inline_data: { mime_type: reference.type, data: reference.buf.toString('base64') } });
  loaded.forEach(({ img }, i) => parts.push({ text: `Candidate ${i}:` }, { inline_data: { mime_type: img.type, data: img.buf.toString('base64') } }));

  const results = await callGemini(parts);
  const list = Array.isArray(results) ? results : [];
  return loaded.map(({ c }, i) => {
    const a = list.find((r) => Number(r.index) === i) || list[i] || {};
    return { candidate: c, assessment: { ...a, spineBox: validBox(a.spineBox) ? a.spineBox.map(Math.round) : null } };
  });
}

/** Strict acceptance rules — never take a result just because it came first. */
export function isAcceptable({ assessment: a }) {
  return a.genuinePhoto === true && a.spineVisible === true && a.titleMatch === true && a.spineBox &&
    ['spine', 'angled'].includes(a.view) && Number(a.confidence) >= 0.7 && a.sameEdition !== false;
}

export function score({ candidate: c, assessment: a }) {
  const [y1, x1, y2, x2] = a.spineBox;
  const longPx = Math.max(((y2 - y1) / 1000) * (c.height || 400), ((x2 - x1) / 1000) * (c.width || 400));
  return (a.view === 'spine' ? 3 : 1) + (a.sameEdition === true ? 2 : 0) + (a.authorMatch ? 1 : 0) + Number(a.confidence) * 2 + Math.min(1, longPx / 500);
}

// A single real spine is long and narrow; a wider box usually spans several books.
export const MIN_SPINE_RATIO = { spine: 2.6, angled: 1.6 };

/**
 * Asks the stronger model for a tight box around exactly ONE spine of this book.
 * Returns a box, or null if it can't isolate one.
 */
export async function refineBox(book, candidate) {
  const img = await fetchImage(candidate.thumbnailUrl, 1.5 * 1024 * 1024);
  const parts = [
    { text: `This photograph shows the physical book ${describe(book)}, possibly among other books or several copies.
Return a tight bounding box around EXACTLY ONE spine of this book — a single book only, never several spines together.
Return ONLY JSON {"spineBox": [ymin, xmin, ymax, xmax] on a 0-1000 scale, or null if no single spine of this book is clearly visible}.` },
    { inline_data: { mime_type: img.type, data: img.buf.toString('base64') } },
  ];
  const out = await callGemini(parts, PRECISE_MODELS());
  const box = validBox(out?.spineBox) ? out.spineBox.map(Math.round) : null;
  return box;
}

/** Locates the spine in a single user-supplied image (manual replacement). */
export async function locateSpine(book, imageUrl) {
  const img = await fetchImage(imageUrl);
  const parts = [
    { text: `Find the spine of the physical book ${describe(book)} in this photograph. Return ONLY JSON {"spineVisible": boolean, "view": "spine"|"angled"|"cover"|"other", "spineBox": [ymin,xmin,ymax,xmax] (0-1000) or null}.` },
    { inline_data: { mime_type: img.type, data: img.buf.toString('base64') } },
  ];
  let found = {};
  try { found = await callGemini(parts); } catch { /* manual image still accepted without a box */ }
  return { width: img.width, height: img.height, box: validBox(found?.spineBox) ? found.spineBox.map(Math.round) : null, view: found?.view === 'angled' ? 'angled' : 'spine' };
}
