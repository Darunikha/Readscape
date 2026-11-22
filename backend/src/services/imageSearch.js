/*
 * Image search providers for spine photographs.
 *  - SerpApi (Google Images) — needs SERPAPI_KEY; free plan is 250 searches/month.
 *  - Openverse — free, no key, openly licensed images only (includes Flickr & Wikimedia).
 * Both are official APIs; nothing is scraped directly.
 */
const SERPAPI = 'https://serpapi.com';
const OPENVERSE = 'https://api.openverse.org/v1/images/';
const RESERVE = Number(process.env.SERPAPI_RESERVE ?? 10); // keep a few searches spare each month

let accountCache = { at: 0, left: null };

/** Free call (doesn't consume a search) — used to protect the monthly quota. */
export async function serpApiSearchesLeft() {
  const key = process.env.SERPAPI_KEY;
  if (!key) return 0;
  if (Date.now() - accountCache.at < 10 * 60 * 1000 && accountCache.left != null) return accountCache.left;
  try {
    const res = await fetch(`${SERPAPI}/account.json?api_key=${key}`, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    accountCache = { at: Date.now(), left: data.plan_searches_left ?? data.total_searches_left ?? 0 };
  } catch {
    accountCache = { at: Date.now(), left: 0 };
  }
  return accountCache.left;
}

export async function serpApiImages(query) {
  const key = process.env.SERPAPI_KEY;
  if (!key) return [];
  if ((await serpApiSearchesLeft()) <= RESERVE) return [];
  const params = new URLSearchParams({ engine: 'google_images', q: query, api_key: key, safe: 'active' });
  const res = await fetch(`${SERPAPI}/search.json?${params}`, { signal: AbortSignal.timeout(30000) });
  const data = await res.json();
  if (accountCache.left != null) accountCache.left -= 1;
  if (data.error) {
    if (/no results/i.test(data.error)) return [];
    throw new Error(`SerpApi: ${data.error}`);
  }
  return (data.images_results || []).map((r) => ({
    provider: 'serpapi',
    imageUrl: r.original || '',
    thumbnailUrl: r.thumbnail || '',
    sourcePage: r.link || '',
    sourceName: r.source || '',
    width: r.original_width || null,
    height: r.original_height || null,
    title: r.title || '',
    license: '',
    creator: '',
  })).filter((c) => c.thumbnailUrl);
}

export async function openverseImages(query) {
  const params = new URLSearchParams({ q: query, page_size: '20', mature: 'false' });
  const res = await fetch(`${OPENVERSE}?${params}`, {
    headers: { 'User-Agent': 'Readscape/1.0 (personal book tracking app)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Openverse HTTP ${res.status}`);
  const data = await res.json();
  return (data.results || []).map((r) => ({
    provider: 'openverse',
    imageUrl: r.url || '',
    thumbnailUrl: r.thumbnail || r.url || '',
    sourcePage: r.foreign_landing_url || '',
    sourceName: r.source || r.provider || 'Openverse',
    width: r.width || null,
    height: r.height || null,
    title: r.title || '',
    license: r.license ? `CC ${String(r.license).toUpperCase()} ${r.license_version || ''}`.trim() : '',
    creator: r.creator || '',
  })).filter((c) => c.thumbnailUrl);
}
