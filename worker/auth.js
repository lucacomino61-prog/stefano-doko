/**
 * Admin sign-in, the same design as LC/greta: one admin password, stored only
 * as a PBKDF2 hash in the ADMIN_PASSWORD_HASH secret (set by its owner with
 * `npm run admin:password`), and HMAC-signed session cookies, so there is no
 * session table. On a local `wrangler dev`, DEV_LOGIN=1 in .dev.vars allows a
 * sign-in without the password, and only from localhost.
 */
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';

export const SESSION_COOKIE = 'sd_admin';
const SESSION_DAYS = 7;
const enc = new TextEncoder();

const b64url = (bytes) => {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64 = (s) => {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(norm + '='.repeat((4 - (norm.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

const hmacKey = (secret) => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

export async function createSession(secret) {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400 })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function verifySession(secret, token) {
  if (!secret || !token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64(sig), enc.encode(payload));
    if (!ok) return false;
    const { exp } = JSON.parse(new TextDecoder().decode(fromB64(payload)));
    return typeof exp === 'number' && exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

/** Format: pbkdf2_sha256$<iterations>$<salt b64>$<hash b64>. Workers cap PBKDF2 at 100 000 iterations. */
export async function verifyPassword(stored, password) {
  const [algo, iterStr, saltB64, hashB64] = String(stored || '').split('$');
  const iterations = Number(iterStr);
  if (algo !== 'pbkdf2_sha256' || !saltB64 || !hashB64 || !Number.isInteger(iterations) || iterations < 10000 || iterations > 100000) return false;
  const expected = fromB64(hashB64);
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(saltB64), iterations }, key, expected.length * 8));
  return bits.length === expected.length && crypto.subtle.timingSafeEqual(bits, expected);
}

const isLocalHost = (c) => ['localhost', '127.0.0.1'].includes(new URL(c.req.url).hostname);

/** The password-free sign-in exists only on a local wrangler dev, from localhost, with DEV_LOGIN=1. */
export const devLoginAllowed = (c) => c.env.DEV_LOGIN === '1' && isLocalHost(c);

export async function startSession(c) {
  setCookie(c, SESSION_COOKIE, await createSession(c.env.SESSION_SECRET), {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Strict',
    path: '/',
    maxAge: SESSION_DAYS * 86400,
  });
}

export const endSession = (c) => deleteCookie(c, SESSION_COOKIE, { path: '/' });

export const isAdmin = (c) => verifySession(c.env.SESSION_SECRET, getCookie(c, SESSION_COOKIE));

/** A request that changes something must come from this site: the cookie is SameSite=Strict, and this is the second lock. */
export const sameOrigin = (c) => c.req.header('Origin') === new URL(c.req.url).origin;

/** Guards /api/admin/*. */
export async function requireAdmin(c, next) {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD' && !sameOrigin(c)) return c.json({ error: 'bad_origin' }, 403);
  if (!(await isAdmin(c))) return c.json({ error: 'unauthorized' }, 401);
  await next();
}

export const clientIp = (c) => c.req.header('CF-Connecting-IP') ?? 'local';
