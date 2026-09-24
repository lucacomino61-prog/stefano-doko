// Every sheet's address in both languages. The Albanian sheets are written
// from the English ones after the build (tools/build-sq.mjs), so in
// development each sheet has one address and the language changes in place.
export const ROUTES = {
  home: { en: '/', sq: '/sq/' },
  elixir: { en: '/work/elixir/', sq: '/sq/puna/elixir/' },
  martiri: { en: '/work/bar-martiri/', sq: '/sq/puna/bar-martiri/' },
  made: { en: '/how-it-was-made/', sq: '/sq/si-u-be/' },
  contact: { en: '/contact/', sq: '/sq/kontakt/' },
};

// the /sq/ addresses exist only in the built site
const built = !!(import.meta.env && import.meta.env.PROD);

const norm = (p) => {
  let path = p.replace(/index\.html$/, '');
  if (!path.endsWith('/')) path += '/';
  return path;
};

export function routeOf(pathname = location.pathname) {
  const p = norm(pathname);
  for (const [key, r] of Object.entries(ROUTES)) if (r.en === p || r.sq === p) return key;
  return null;
}

export function pathFor(key, lang) {
  const r = ROUTES[key];
  if (!r) return '/';
  return built ? r[lang] : r.en;
}

// point every [data-route] link at its sheet in this language
export function paintRoutes(lang, root = document) {
  root.querySelectorAll('a[data-route]').forEach((a) => {
    a.setAttribute('href', pathFor(a.dataset.route, lang) + (a.dataset.hash || ''));
  });
}

// keep the address in step with the language the sheet is set in
export function syncAddress(lang) {
  if (!built) return;
  const key = routeOf();
  if (!key) return;
  const want = ROUTES[key][lang];
  if (norm(location.pathname) !== want) history.replaceState(history.state, '', want + location.search + location.hash);
}

// the same sheet, or a part of it, as the link points to
export function isHere(a) {
  const url = new URL(a.href, location.href);
  return url.origin === location.origin && routeOf(url.pathname) === routeOf();
}
