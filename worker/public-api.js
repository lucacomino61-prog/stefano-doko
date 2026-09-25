/**
 * /api/*: what a visitor's browser may call: a telegram from the contact
 * page, kept for the admin's inbox, and the weather over Albania for the
 * engraving's sky.
 */
import { Hono } from 'hono';
import { status } from '../shared/settings.js';
import { clientIp, sameOrigin } from './auth.js';
import { countTelegram, getSettings, hit, storeTelegram } from './store.js';

// the form's numbers are kept only while visits are counted (the admin's switch, with its token)
const counting = async (env) => status(await getSettings(env)).analytics.live;

export const publicApi = new Hono();

const words = (s) => (String(s).trim().match(/\S+/g) || []).length;
const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const rePhone = /^\+?[\d\s().-]{7,}$/;
const field = (body, k, max) => (typeof body[k] === 'string' ? body[k].replace(/\r\n?/g, '\n').trim().slice(0, max) : '');

publicApi.post('/telegram', async (c) => {
  if (!sameOrigin(c)) return c.json({ error: 'bad_origin' }, 403);
  const body = await c.req.parseBody().catch(() => ({}));
  // the honeypot line that people never see: a bot that fills it is told all went well
  if (field(body, 'bot-field', 200)) return c.json({ ok: true });

  const t = {
    name: field(body, 'name', 80),
    business: field(body, 'business', 120),
    message: field(body, 'message', 4000),
    reply: field(body, 'reply', 120),
    lang: body.lang === 'en' ? 'en' : 'sq',
    // where the visit came from, when a shared link said so (src/ui/from.js): a short name only
    from: field(body, 'from', 120).replace(/[^\p{L}\p{N} ./_-]/gu, ''),
  };
  const errors = {};
  if (!t.name) errors.name = 'required';
  if (words(t.message) < 2) errors.message = 'short';
  if (!reEmail.test(t.reply) && !rePhone.test(t.reply)) errors.reply = 'reply';
  if (Object.keys(errors).length) return c.json({ error: 'invalid', errors }, 400);

  if (!(await hit(c.env, `rl:tg:${clientIp(c)}`, 6, 3600))) return c.json({ error: 'too_many' }, 429);
  await storeTelegram(c.env, t);
  if (await counting(c.env)) await countTelegram(c.env, 'sent');
  return c.json({ ok: true });
});

// A telegram begun (the page's first keystroke in the form, sent once by
// src/ui/telegram.js): one more in this month's count, and nothing else.
publicApi.post('/telegram/started', async (c) => {
  if (!sameOrigin(c)) return c.body(null, 403);
  if (!(await hit(c.env, `rl:tgs:${clientIp(c)}`, 20, 3600))) return c.body(null, 204);
  if (await counting(c.env)) await countTelegram(c.env, 'started');
  return c.body(null, 204);
});

// The weather over Tirana, for the engraving's sky (src/weather.js): Luca's
// choice (2026-09-25), the capital's weather being the one people know as
// Albania's, and the caption says so by name. (The middle of the country, where
// src/sun.js reckons the sun, can differ: that afternoon it had showers while
// Tirana was clear.) This server
// asks MET Norway, the Norwegian Meteorological Institute, at most once a half
// hour per data centre, so a visitor's browser only ever asks the site. Their
// terms: an app name and a contact in the User-Agent, caching, and credit
// ("MET Norway", in the band's caption). Free for any use, unlike Open-Meteo's
// free tier.
const WX_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=41.3275&lon=19.8187';
const WX_KEY = 'https://weather.cache.invalid/tirana-v2';
const WX_UA = 'stefano-doko-portfolio/1.0 github.com/lucacomino61-prog/stefano-doko';

// the hour now: its symbol ("lightrain", "partlycloudy_day", "rainandthunder"),
// the temperature, and the wind (m/s, and the bearing it blows from). MET's
// list can begin an hour or two back (it starts where its forecast was made),
// so the hour taken is the last one begun, not the first in the list.
export function readWeather(json, at = Date.now()) {
  const series = json?.properties?.timeseries || [];
  const begun = series.filter((s) => Date.parse(s?.time) <= at);
  const now = begun[begun.length - 1] || series[0];
  const d = now?.data;
  const code = d?.next_1_hours?.summary?.symbol_code || d?.next_6_hours?.summary?.symbol_code || '';
  if (!/^[a-z_]{3,40}$/.test(code)) return { ok: false };
  const det = d.instant?.details || {};
  const num = (v) => (Number.isFinite(v) ? v : null);
  return {
    ok: true,
    code,
    temp: num(det.air_temperature) === null ? null : Math.round(det.air_temperature),
    wind: num(det.wind_speed),
    from: num(det.wind_from_direction),
    at: typeof now.time === 'string' ? now.time : null,
  };
}

publicApi.get('/weather', async (c) => {
  const cache = caches.default;
  const kept = await cache.match(WX_KEY);
  if (kept) return new Response(kept.body, kept);
  let body = { ok: false };
  let maxAge = 300;
  try {
    const res = await fetch(WX_URL, { headers: { 'user-agent': WX_UA, accept: 'application/json' } });
    if (res.ok) {
      body = readWeather(await res.json());
      if (body.ok) maxAge = 1800;
    }
  } catch { /* the engraving keeps a fair sky, and asks again in five minutes */ }
  const out = new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${maxAge}` } });
  c.executionCtx.waitUntil(cache.put(WX_KEY, out.clone()));
  return out;
});
