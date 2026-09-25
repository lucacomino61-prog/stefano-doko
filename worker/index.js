/**
 * Stefano Doko's site on one Worker. The pages are the static build in dist/
 * (Workers Static Assets); this code runs first so every page can leave with
 * the admin's settings in it (inject.js). It also serves the admin panel's
 * API, the telegram inbox and the portrait. See wrangler.jsonc.
 */
import { Hono } from 'hono';
import { publicView, status } from '../shared/settings.js';
import { homePath, vcard } from '../shared/vcard.js';
import { adminApi } from './admin-api.js';
import { inject } from './inject.js';
import { serveMedia } from './media.js';
import { publicApi } from './public-api.js';
import { getSettings } from './store.js';

const app = new Hono();

// The admin is the Worker's own page: no inline code, nothing from elsewhere.
const ADMIN_CSP = [
  "default-src 'self'", "img-src 'self' data: blob:", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
  "font-src 'self'", "connect-src 'self'", "form-action 'self'", "base-uri 'self'", "frame-ancestors 'none'",
].join('; ');

const isAdminPage = (path) => path === '/admin' || path.startsWith('/admin/');

app.use('*', async (c, next) => {
  await next();
  c.header('x-content-type-options', 'nosniff');
  c.header('referrer-policy', 'strict-origin-when-cross-origin');
  c.header('permissions-policy', 'camera=(), microphone=(), geolocation=()');
});

app.get('/media/*', serveMedia);

// Stefano's contact card, for a phone to add to its contacts (the "vcard" part)
app.get('/stefano-doko.vcf', async (c) => {
  const s = await getSettings(c.env);
  const st = status(s);
  if (!st.vcard.live) return c.notFound();
  const lang = ['sq', 'it'].includes(c.req.query('lang')) ? c.req.query('lang') : 'en';
  const body = vcard({
    email: s.email,
    phone: st.whatsapp.live ? s.whatsapp : '',
    url: new URL(homePath(lang), c.req.url).href,
    lang,
  });
  return c.body(body, 200, {
    'content-type': 'text/vcard; charset=utf-8',
    'content-disposition': 'attachment; filename="stefano-doko.vcf"',
    'cache-control': 'no-cache',
  });
});

app.route('/api/admin', adminApi);
app.route('/api', publicApi);
app.all('/api/*', (c) => c.json({ error: 'not_found' }, 404));

// Every other request is a file of the built site.
app.all('*', async (c) => {
  const res = await c.env.ASSETS.fetch(c.req.raw);
  const type = res.headers.get('content-type') || '';
  if (!type.includes('text/html')) return new Response(res.body, res);

  const headers = new Headers(res.headers);
  if (isAdminPage(new URL(c.req.url).pathname)) {
    headers.set('x-robots-tag', 'noindex, nofollow');
    headers.set('cache-control', 'no-store');
    headers.set('content-security-policy', ADMIN_CSP);
    headers.set('x-frame-options', 'DENY');
    return new Response(res.body, { status: res.status, headers });
  }

  const settings = await getSettings(c.env);
  const out = inject(res, publicView(settings), { beacon: status(settings).analytics.live ? settings.analytics.token : '' });
  // the page now carries settings that may change at any moment: ask again each time
  headers.delete('content-length');
  headers.delete('etag');
  headers.set('cache-control', 'no-cache');
  headers.set('x-frame-options', 'SAMEORIGIN');
  return new Response(out.body, { status: res.status, headers });
});

app.onError((err, c) => {
  console.error(err);
  return c.req.path.startsWith('/api/') ? c.json({ error: 'server_error' }, 500) : c.text('Server error', 500);
});

export default app;
