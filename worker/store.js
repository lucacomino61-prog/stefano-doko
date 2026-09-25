/**
 * Everything the Worker keeps, in one Workers KV namespace (binding SITE):
 *   settings                     the admin's settings (shared/settings.js)
 *   media/portrait-<id>.<ext>    the portrait photograph
 *   media/graphic-<id>.<ext>     a piece of graphic work
 *   tg:<newest-first>:<id>       one telegram each; the list reads its metadata
 *   rl:<scope>:<ip>              rate-limit counters, gone after their window
 *   stat:tg:<started|sent>:<month>  telegrams begun and sent that month (numbers only; kept while visits are counted)
 * KV is eventually consistent: a saved change reaches every region within
 * about a minute, which is what the admin tells its user.
 */
import { merged } from '../shared/settings.js';

export async function getSettings(env, { fresh = false } = {}) {
  const stored = await env.SITE.get('settings', fresh ? { type: 'json' } : { type: 'json', cacheTtl: 30 });
  return merged(stored);
}

export async function putSettings(env, value) {
  const next = { ...value, updatedAt: new Date().toISOString() };
  await env.SITE.put('settings', JSON.stringify(next));
  return next;
}

/** Counts a hit; false once `max` hits land within `ttl` seconds (KV's floor is 60). */
export async function hit(env, key, max, ttl) {
  const n = Number(await env.SITE.get(key)) || 0;
  if (n >= max) return false;
  await env.SITE.put(key, String(n + 1), { expirationTtl: Math.max(60, ttl) });
  return true;
}
export const clearHits = (env, key) => env.SITE.delete(key);

/* ---------------------------------------------------------- the form's numbers ---------------------------------------------------------- */

// the month in Albania, "2026-09"
const monthOf = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Tirane', year: 'numeric', month: '2-digit' }).format(d);

/** One more telegram begun, or sent, this month. A count and nothing else: no address, no time, no content. */
export async function countTelegram(env, what) {
  const key = `stat:tg:${what}:${monthOf()}`;
  const n = Number(await env.SITE.get(key)) || 0;
  await env.SITE.put(key, String(n + 1));
}

/** Sets a month's counts back (the local tests only: they leave the numbers as they found them). */
export async function setTelegramStats(env, { month, started, sent }) {
  if (!/^\d{4}-\d{2}$/.test(month)) return;
  await Promise.all([['started', started], ['sent', sent]].map(([w, n]) => env.SITE.put(`stat:tg:${w}:${month}`, String(Math.max(0, Number(n) || 0)))));
}

/** This month's and last month's counts, for the admin. */
export async function telegramStats(env) {
  const now = monthOf();
  const [y, m] = now.split('-').map(Number);
  const months = [now, m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`];
  return Promise.all(months.map(async (month) => {
    const [started, sent] = await Promise.all(['started', 'sent'].map(async (w) => Number(await env.SITE.get(`stat:tg:${w}:${month}`)) || 0));
    return { month, started, sent };
  }));
}

/* ------------------------------------------------------------ telegrams ------------------------------------------------------------ */

const TG_RE = /^tg:\d{13}:[a-z0-9]{6,24}$/;
export const isTelegramKey = (k) => TG_RE.test(k);

export async function storeTelegram(env, t) {
  const at = new Date().toISOString();
  const id = `${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-5)}`;
  // keys sort ascending, so the newest must sort first
  const key = `tg:${String(9999999999999 - Date.now()).padStart(13, '0')}:${id}`;
  const value = { ...t, at, read: false };
  await env.SITE.put(key, JSON.stringify(value), { metadata: meta(value) });
  return key;
}

// what the inbox list shows, kept on the key itself (KV metadata is capped at 1024 bytes)
const meta = (t) => ({ at: t.at, read: t.read, name: t.name.slice(0, 60), business: t.business.slice(0, 60), preview: t.message.replace(/\s+/g, ' ').slice(0, 120) });

export async function listTelegrams(env, cursor) {
  const res = await env.SITE.list({ prefix: 'tg:', limit: 100, cursor: cursor || undefined });
  return {
    items: res.keys.map((k) => ({ key: k.name, ...(k.metadata || {}) })),
    cursor: res.list_complete ? '' : res.cursor,
  };
}

export async function unreadCount(env) {
  let n = 0;
  let cursor;
  do {
    const res = await env.SITE.list({ prefix: 'tg:', limit: 1000, cursor });
    n += res.keys.filter((k) => k.metadata && k.metadata.read === false).length;
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);
  return n;
}

export const getTelegram = (env, key) => env.SITE.get(key, { type: 'json' });

export async function markTelegram(env, key, read) {
  const t = await getTelegram(env, key);
  if (!t) return null;
  t.read = read;
  await env.SITE.put(key, JSON.stringify(t), { metadata: meta(t) });
  return t;
}

export const deleteTelegram = (env, key) => env.SITE.delete(key);

/* -------------------------------------------------------------- media -------------------------------------------------------------- */

const MEDIA_RE = /^media\/(portrait|graphic)-[a-z0-9]{6,24}\.(jpg|webp)$/;
export const isMediaKey = (k) => MEDIA_RE.test(k);

export async function putMedia(env, key, bytes, contentType) {
  await env.SITE.put(key, bytes, { metadata: { ct: contentType } });
}
export const getMedia = (env, key) => env.SITE.getWithMetadata(key, { type: 'arrayBuffer', cacheTtl: 86400 });
export const deleteMedia = (env, key) => env.SITE.delete(key);
