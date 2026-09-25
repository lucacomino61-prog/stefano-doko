/** /api/admin/*: the admin panel's back end. Every route below the sign-in block needs a session. */
import { Hono } from 'hono';
import { LANGS, LIMITS, clean, newId, status } from '../shared/settings.js';
import { clientIp, devLoginAllowed, endSession, isAdmin, requireAdmin, sameOrigin, startSession, verifyPassword } from './auth.js';
import {
  clearHits, deleteMedia, deleteTelegram, getSettings, getTelegram, hit, isTelegramKey, listTelegrams,
  markTelegram, putMedia, putSettings, setTelegramStats, telegramStats, unreadCount,
} from './store.js';

export const adminApi = new Hono();

/* --------------------------------------------------------------- sign in --------------------------------------------------------------- */

adminApi.get('/me', async (c) =>
  c.json({ admin: await isAdmin(c), devLogin: devLoginAllowed(c), passwordSet: Boolean(c.env.ADMIN_PASSWORD_HASH) }, 200, { 'cache-control': 'no-store' }),
);

adminApi.post('/login', async (c) => {
  if (!sameOrigin(c)) return c.json({ error: 'bad_origin' }, 403);
  if (!c.env.ADMIN_PASSWORD_HASH) return c.json({ error: 'no_password_set' }, 503);
  const key = `rl:login:${clientIp(c)}`;
  if (!(await hit(c.env, key, 10, 15 * 60))) return c.json({ error: 'too_many_attempts' }, 429);
  const body = await c.req.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password.slice(0, 200) : '';
  if (!password || !(await verifyPassword(c.env.ADMIN_PASSWORD_HASH, password))) return c.json({ error: 'wrong_password' }, 401);
  await clearHits(c.env, key);
  await startSession(c);
  return c.json({ ok: true });
});

adminApi.post('/dev-login', async (c) => {
  if (!devLoginAllowed(c)) return c.json({ error: 'not_available' }, 404);
  if (!sameOrigin(c)) return c.json({ error: 'bad_origin' }, 403);
  await startSession(c);
  return c.json({ ok: true });
});

adminApi.post('/logout', (c) => {
  endSession(c);
  return c.json({ ok: true });
});

/* ---------------------------------------------------------- everything else ------------------------------------------------------------ */

const open = new Set(['/api/admin/me', '/api/admin/login', '/api/admin/dev-login', '/api/admin/logout']);
adminApi.use('*', async (c, next) => (open.has(c.req.path) ? next() : requireAdmin(c, next)));
adminApi.use('*', async (c, next) => {
  await next();
  c.header('cache-control', 'no-store');
});

const view = async (c, settings) => ({ settings, status: status(settings), unread: await unreadCount(c.env) });

adminApi.get('/settings', async (c) => c.json(await view(c, await getSettings(c.env, { fresh: true }))));

adminApi.put('/settings', async (c) => {
  const current = await getSettings(c.env, { fresh: true });
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object') return c.json({ error: 'bad_json' }, 400);
  const { value, errors } = clean(body, current);
  if (Object.keys(errors).length) return c.json({ error: 'invalid', errors }, 400);
  const next = await putSettings(c.env, value);
  // a piece of graphic work taken off the list takes its photo with it
  const kept = new Set(next.graphic.map((g) => g.key));
  for (const g of current.graphic) if (g.key && !kept.has(g.key)) await deleteMedia(c.env, g.key);
  return c.json(await view(c, next));
});

/* ----------------------------------------------------------- photographs ---------------------------------------------------------------- */

const MAX_PHOTO = 3 * 1024 * 1024;

/** Magic bytes, so a renamed HTML or SVG file can never be stored as a photograph. */
async function kindOf(file) {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpg';
  const ascii = (a, b) => String.fromCharCode(...head.slice(a, b));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  return null;
}

/** A sent photo, checked and stored under a new key; { error } when it is not one. */
async function storePhoto(c, kind) {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_PHOTO) return { error: 'bad_file' };
  const ext = await kindOf(file);
  if (!ext) return { error: 'not_a_photo' };
  const w = Number(form.get('w'));
  const h = Number(form.get('h'));
  if (![w, h].every((n) => Number.isInteger(n) && n >= 100 && n <= 6000)) return { error: 'bad_size' };
  const key = `media/${kind}-${newId()}.${ext}`;
  await putMedia(c.env, key, await file.arrayBuffer(), ext === 'jpg' ? 'image/jpeg' : 'image/webp');
  return { key, w, h };
}

/* -------------------------------------------------------------- portrait --------------------------------------------------------------- */

adminApi.post('/portrait', async (c) => {
  const photo = await storePhoto(c, 'portrait');
  if (photo.error) return c.json({ error: photo.error }, 400);
  const current = await getSettings(c.env, { fresh: true });
  const old = current.portrait.key;
  const next = await putSettings(c.env, { ...current, portrait: { ...current.portrait, key: photo.key, w: photo.w, h: photo.h } });
  if (old && old !== photo.key) await deleteMedia(c.env, old);
  return c.json(await view(c, next));
});

adminApi.delete('/portrait', async (c) => {
  const current = await getSettings(c.env, { fresh: true });
  if (current.portrait.key) await deleteMedia(c.env, current.portrait.key);
  const next = await putSettings(c.env, { ...current, portrait: { ...current.portrait, key: '', w: 0, h: 0 } });
  return c.json(await view(c, next));
});

/* ------------------------------------------------------------ graphic work ------------------------------------------------------------- */

// A new piece is a photo first: it is kept at once, at the end of the list,
// hidden until it has a title and the client's permission (saved with the rest).
adminApi.post('/graphic', async (c) => {
  const current = await getSettings(c.env, { fresh: true });
  if (current.graphic.length >= LIMITS.graphic) return c.json({ error: 'too_many_pieces' }, 400);
  const photo = await storePhoto(c, 'graphic');
  if (photo.error) return c.json({ error: photo.error }, 400);
  const piece = { id: newId(), key: photo.key, w: photo.w, h: photo.h, title: Object.fromEntries(LANGS.map((l) => [l, ''])), client: '', year: '', permission: false };
  const next = await putSettings(c.env, { ...current, graphic: [...current.graphic, piece] });
  return c.json({ ...(await view(c, next)), piece: piece.id });
});

// a piece's photo, replaced; its words and permission stay
adminApi.post('/graphic/:id', async (c) => {
  const current = await getSettings(c.env, { fresh: true });
  const piece = current.graphic.find((g) => g.id === c.req.param('id'));
  if (!piece) return c.json({ error: 'not_found' }, 404);
  const photo = await storePhoto(c, 'graphic');
  if (photo.error) return c.json({ error: photo.error }, 400);
  const old = piece.key;
  const graphic = current.graphic.map((g) => (g.id === piece.id ? { ...g, key: photo.key, w: photo.w, h: photo.h } : g));
  const next = await putSettings(c.env, { ...current, graphic });
  if (old && old !== photo.key) await deleteMedia(c.env, old);
  return c.json(await view(c, next));
});

/* -------------------------------------------------------------- telegrams -------------------------------------------------------------- */

adminApi.get('/telegrams', async (c) => c.json(await listTelegrams(c.env, c.req.query('cursor'))));

// the form's numbers: telegrams begun and sent, this month and last (counted while visits are)
adminApi.get('/stats', async (c) => c.json({ counting: status(await getSettings(c.env)).analytics.live, months: await telegramStats(c.env) }));
// on this machine only (like the local sign-in): the tests put the numbers back as they found them
adminApi.put('/stats', async (c) => {
  if (!devLoginAllowed(c)) return c.json({ error: 'not_found' }, 404);
  const body = await c.req.json().catch(() => ({}));
  for (const m of Array.isArray(body.months) ? body.months.slice(0, 2) : []) await setTelegramStats(c.env, m);
  return c.json({ months: await telegramStats(c.env) });
});

adminApi.get('/telegrams/:key', async (c) => {
  const key = c.req.param('key');
  if (!isTelegramKey(key)) return c.json({ error: 'not_found' }, 404);
  const t = await getTelegram(c.env, key);
  return t ? c.json({ key, ...t }) : c.json({ error: 'not_found' }, 404);
});

adminApi.post('/telegrams/:key/read', async (c) => {
  const key = c.req.param('key');
  if (!isTelegramKey(key)) return c.json({ error: 'not_found' }, 404);
  const body = await c.req.json().catch(() => ({}));
  const t = await markTelegram(c.env, key, body.read !== false);
  return t ? c.json({ key, ...t }) : c.json({ error: 'not_found' }, 404);
});

adminApi.delete('/telegrams/:key', async (c) => {
  const key = c.req.param('key');
  if (!isTelegramKey(key)) return c.json({ error: 'not_found' }, 404);
  await deleteTelegram(c.env, key);
  return c.json({ ok: true });
});
