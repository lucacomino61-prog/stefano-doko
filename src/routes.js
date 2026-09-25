// Every sheet's address in each language. The Albanian and Italian sheets are
// written from the English ones after the build (tools/build-sq.mjs), so in
// development each sheet has one address and the language changes in place.
export const ROUTES = {
  home: { en: '/', sq: '/sq/', it: '/it/' },
  // the front page's parts, each also a page of its own: the menus lead here
  work: { en: '/work/', sq: '/sq/puna/', it: '/it/lavori/' },
  about: { en: '/about/', sq: '/sq/rreth/', it: '/it/chi-e/' },
  services: { en: '/services/', sq: '/sq/sherbimet/', it: '/it/servizi/' },
  elixir: { en: '/work/elixir/', sq: '/sq/puna/elixir/', it: '/it/lavori/elixir/' },
  martiri: { en: '/work/bar-martiri/', sq: '/sq/puna/bar-martiri/', it: '/it/lavori/bar-martiri/' },
  made: { en: '/how-it-was-made/', sq: '/sq/si-u-be/', it: '/it/come-e-fatto/' },
  contact: { en: '/contact/', sq: '/sq/kontakt/', it: '/it/contatti/' },
  // what the site keeps, and its few rules (linked from the foot of every sheet)
  privacy: { en: '/privacy/', sq: '/sq/privatesia/', it: '/it/privacy/' },
  terms: { en: '/terms/', sq: '/sq/kushtet/', it: '/it/termini/' },
};

// the /sq/ and /it/ addresses exist only in the built site
const built = !!(import.meta.env && import.meta.env.PROD);

const norm = (p) => {
  let path = p.replace(/index\.html$/, '');
  if (!path.endsWith('/')) path += '/';
  return path;
};

export function routeOf(pathname = location.pathname) {
  const p = norm(pathname);
  for (const [key, r] of Object.entries(ROUTES)) if (Object.values(r).includes(p)) return key;
  return null;
}

export function pathFor(key, lang) {
  const r = ROUTES[key];
  if (!r) return '/';
  return built ? r[lang] || r.en : r.en;
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
  if (want && norm(location.pathname) !== want) history.replaceState(history.state, '', want + location.search + location.hash);
}

// the same sheet, or a part of it, as the link points to
export function isHere(a) {
  const url = new URL(a.href, location.href);
  return url.origin === location.origin && routeOf(url.pathname) === routeOf();
}
