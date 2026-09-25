/**
 * /media/*: the portrait photograph and the pieces of graphic work, from KV. A
 * new upload always gets a new key, so a key's bytes never change and can be
 * cached for a year.
 */
import { getMedia, isMediaKey } from './store.js';

export async function serveMedia(c) {
  const key = c.req.path.slice(1); // "media/portrait-<id>.jpg"
  if (!isMediaKey(key)) return c.notFound();
  const etag = `"${key.replace(/[^a-z0-9.]/gi, '-')}"`;
  const headers = new Headers({ etag, 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' });
  if (c.req.header('If-None-Match') === etag) return new Response(null, { status: 304, headers });
  const { value, metadata } = await getMedia(c.env, key);
  if (!value) return c.notFound();
  headers.set('content-type', metadata?.ct || (key.endsWith('.jpg') ? 'image/jpeg' : 'image/webp'));
  return new Response(value, { headers });
}
