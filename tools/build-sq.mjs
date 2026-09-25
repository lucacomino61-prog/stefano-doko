// After the build: write the Albanian and Italian sheets from the English ones,
// and give every sheet its canonical and hreflang links, its link preview and
// its structured data, so search engines find each language and know what
// each sheet is.
// Text is swapped wherever the HTML marks it for translation (data-i18n,
// data-i18n-attr, data-i18n-list, proof notes), as src/i18n.js does in the
// browser, and links marked data-route are pointed at the sheets in the same
// language. (The file keeps its first name: it began with Albanian alone.)
// usage: node tools/build-sq.mjs
//        SITE_URL=https://the-domain node tools/build-sq.mjs  (absolute links, sitemap)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STRINGS, albaniaNow } from '../src/i18n.js';
import { ROUTES } from '../src/routes.js';

// when this build was made: the sheets' "Updated" line and their dateModified
const BUILT = new Date().toISOString();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || '').replace(/\/$/, '');
const LANGS = ['en', 'sq', 'it'];
const LOCALE = { en: 'en_GB', sq: 'sq_AL', it: 'it_IT' };

const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => escText(s).replace(/"/g, '&quot;');
const attrOf = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`)); return m ? m[1] : null; };
const setAttr = (tag, name, value) => {
  const re = new RegExp(`(\\s${name}=")[^"]*(")`);
  if (re.test(tag)) return tag.replace(re, (_, a, b) => `${a}${escAttr(value)}${b}`);
  return tag.replace(/\s*(\/?)>$/, (_, slash) => ` ${name}="${escAttr(value)}"${slash}>`);
};

function translate(html, T) {
  // the text of elements marked data-i18n or data-i18n-list (they hold text only)
  html = html.replace(/(<([a-zA-Z][\w:-]*)\b[^>]*\sdata-i18n(-list)?="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/g, (m, open, tag, list, key, text, close) => {
    let v;
    if (list) { const [k, i] = key.split('.'); v = Array.isArray(T[k]) ? T[k][+i] : undefined; } else v = T[key];
    return typeof v === 'string' ? `${open}${escText(v)}${close}` : m;
  });
  // attributes marked data-i18n-attr="attr:key, attr:key"
  html = html.replace(/<[a-zA-Z][^>]*\sdata-i18n-attr="([^"]+)"[^>]*>/g, (tag, spec) => {
    for (const pair of spec.split(',')) {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (typeof T[key] === 'string') tag = setAttr(tag, attr, T[key]);
    }
    return tag;
  });
  // proof notes, and the struck-out proof line
  html = html.replace(/(<aside\b[^>]*\sdata-note="([^"]+)"[^>]*>\s*<span>)([^<]*)(<\/span>)/g, (m, open, key, text, close) => (T.proofNotes?.[key] ? `${open}${escText(T.proofNotes[key])}${close}` : m));
  html = html.replace(/(<([a-z]+)\b[^>]*\sdata-note-text="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/g, (m, open, tag, key, text, close) => (T.proofNotes?.[key] ? `${open}${escText(T.proofNotes[key])}${close}` : m));
  // the verse on the front page (the script sets it word by word; this is its text without script)
  html = html.replace(/(<div class="verse" data-verse>\s*<p>)[\s\S]*?(<\/p>)/, (m, open, close) => `${open}${escText(T.verse.filter((p) => typeof p === 'string').join(' '))}${close}`);
  return html.replace(/<html lang="[^"]*"/, `<html lang="${T.htmlLang}"`);
}

// links marked data-route point at the sheet in this language
function relink(html, lang) {
  return html.replace(/<a\b[^>]*\sdata-route="([^"]+)"[^>]*>/g, (tag, key) => {
    const r = ROUTES[key];
    return r ? setAttr(tag, 'href', r[lang] + (attrOf(tag, 'data-hash') || '')) : tag;
  });
}

// Structured data (schema.org JSON-LD), one graph per sheet and language: who
// Stefano is (on the front page), which live site a case sheet is about, and
// where each sheet sits. Only what the sheets already say; the email, the
// number and his profiles are added by the Worker (worker/inject.js) once they
// are set in the admin. Addresses are root-relative until SITE_URL is set.
const CLIENT_SITES = {
  elixir: { name: 'Elixir', url: 'https://elixir.al/' },
  martiri: { name: 'Bar Martiri', url: 'https://barmartiri.com/' },
};
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// a sheet's name as the index gives it ("The work"), or the foot's ("Privacy")
const pageName = (T, k) => T.menu.find(([route, hash]) => route === k && (k === 'home' ? hash === '#front' : !hash))?.[2] || T.pageNames?.[k] || 'Stefano Doko';

// the day this build was made, in the foot of every sheet (src/ui/site.js sets it again on a language switch)
const stamp = (html, lang) => html.replace(/<span class="foot__updated" data-updated>[^<]*<\/span>/, `<span class="foot__updated" data-updated="${BUILT}">${escText(`${STRINGS[lang].updated} ${albaniaNow(lang, true, new Date(BUILT)).date}`)}</span>`);

function structured(html, key, lang) {
  const T = STRINGS[lang];
  const r = ROUTES[key];
  const abs = (p) => `${SITE}${p}`;
  const person = `${abs('/')}#stefano`;
  const website = `${abs('/')}#website`;
  const page = abs(r[lang]);
  const title = unescape((html.match(/<title\b[^>]*>([^<]*)<\/title>/) || [])[1] || 'Stefano Doko').trim();
  const nameOf = (k) => pageName(T, k);
  const graph = [];
  if (key === 'home') {
    graph.push(
      { '@type': 'ProfilePage', '@id': `${page}#page`, url: page, name: title, inLanguage: lang, dateModified: BUILT, isPartOf: { '@id': website }, mainEntity: { '@id': person } },
      {
        '@type': 'Person', '@id': person, name: 'Stefano Doko', url: abs('/'),
        jobTitle: ['Graphic designer', 'Web designer', 'Web developer'],
        knowsAbout: ['Graphic design', 'Web design', 'Front-end development', 'Back-end development', 'HTML', 'CSS', 'JavaScript', 'TypeScript', 'PHP', 'Python', 'SQL'],
        homeLocation: { '@type': 'Country', name: 'Albania' },
        // the languages he answers in (the site is also in Italian; he is not said to speak it)
        knowsLanguage: ['sq', 'en'],
      },
      { '@type': 'WebSite', '@id': website, url: abs('/'), name: 'Stefano Doko', inLanguage: LANGS, author: { '@id': person } },
    );
  } else {
    const TYPE = { contact: 'ContactPage', about: 'AboutPage', work: 'CollectionPage' };
    const node = { '@type': TYPE[key] || 'WebPage', '@id': `${page}#page`, url: page, name: title, inLanguage: lang, dateModified: BUILT, isPartOf: { '@id': website }, breadcrumb: { '@id': `${page}#breadcrumb` } };
    const client = CLIENT_SITES[key];
    if (client) {
      node.about = { '@id': client.url };
      graph.push({ '@type': 'WebSite', '@id': client.url, name: client.name, url: client.url, creator: { '@id': person } });
    } else {
      node.about = { '@id': person };
    }
    // the trail: the front page, the work for a case sheet, then the sheet
    const trail = [['Stefano Doko', ROUTES.home[lang]], ...(client ? [[nameOf('work'), ROUTES.work[lang]]] : []), [nameOf(key), r[lang]]];
    graph.push(node, {
      '@type': 'BreadcrumbList', '@id': `${page}#breadcrumb`,
      itemListElement: trail.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(p) })),
    });
  }
  // `<` never reaches the page inside a script
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

// the link preview drawn for this sheet in this language (tools/og.mjs), when there is one
// a sheet's own preview (tools/og.mjs, JPEG since 2026-09-25: small enough for WhatsApp), or the brand set's
const previewOf = (key, lang) => (fs.existsSync(path.join(dist, 'og', lang, `${key}.jpg`)) ? `/og/${lang}/${key}.jpg` : '/og.png');

function headLinks(html, key, lang) {
  const r = ROUTES[key];
  const abs = (p) => `${SITE}${p}`;
  const lines = [
    `<script type="application/ld+json">${structured(html, key, lang)}</script>`,
    `<link rel="canonical" href="${abs(r[lang])}">`,
    ...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${abs(r[l])}">`),
    `<link rel="alternate" hreflang="x-default" href="${abs(r.en)}">`,
    `<meta property="og:locale" content="${LOCALE[lang]}">`,
    ...LANGS.filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${LOCALE[l]}">`),
  ];
  if (SITE) lines.push(`<meta property="og:url" content="${abs(r[lang])}">`);
  let out = html.replace(/<\/head>/, `${lines.map((l) => `  ${l}`).join('\n')}\n</head>`);
  out = out.replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${abs(previewOf(key, lang))}$2`);
  return out;
}

const stripHead = (html) => html
  .replace(/\n[ \t]*<link rel="(?:canonical|alternate)"[^>]*>/g, '')
  .replace(/\n[ \t]*<meta property="og:(?:locale|locale:alternate|url)"[^>]*>/g, '')
  .replace(/\n[ \t]*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');

let written = 0;
for (const [key, r] of Object.entries(ROUTES)) {
  const enFile = path.join(dist, r.en, 'index.html');
  if (!fs.existsSync(enFile)) { console.warn(`missing ${enFile}`); continue; }
  const src = stripHead(fs.readFileSync(enFile, 'utf8'));
  fs.writeFileSync(enFile, headLinks(stamp(relink(src, 'en'), 'en'), key, 'en'));
  for (const lang of LANGS.filter((l) => l !== 'en')) {
    const file = path.join(dist, r[lang], 'index.html');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, headLinks(stamp(relink(translate(src, STRINGS[lang]), lang), lang), key, lang));
  }
  written++;
  console.log(LANGS.map((l) => r[l].padEnd(24)).join(' '));
}

// The site search (the index's field, src/ui/toolbar.js): each sheet's name
// and the words of its page, per language, read from the sheets just written.
// Proof notes and the date line are left out; the parts the admin switches on
// are not in the files, so they are not searched.
const textOf = (html) => {
  const main = (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/) || [])[1] || '';
  return unescape(main
    .replace(/<div class="dateline">[\s\S]*?data-note="clock">[\s\S]*?<\/aside>\s*<\/div>/g, ' ')
    .replace(/<aside class="proof-note[\s\S]*?<\/aside>/g, ' ')
    .replace(/<(script|style|svg|template)\b[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ').trim();
};
fs.mkdirSync(path.join(dist, 'search'), { recursive: true });
for (const lang of LANGS) {
  const entries = Object.entries(ROUTES).map(([key, r]) => {
    const file = path.join(dist, r[lang], 'index.html');
    return fs.existsSync(file) ? { r: key, t: pageName(STRINGS[lang], key), x: textOf(fs.readFileSync(file, 'utf8')) } : null;
  }).filter(Boolean);
  fs.writeFileSync(path.join(dist, 'search', `${lang}.json`), JSON.stringify(entries));
}
console.log(`search: ${LANGS.map((l) => `${l} ${Math.round(fs.statSync(path.join(dist, 'search', `${l}.json`)).size / 1024)} KB`).join(', ')}`);

if (SITE) {
  const urls = Object.values(ROUTES).flatMap((r) => LANGS.map((lang) => [
    '  <url>',
    `    <loc>${SITE}${r[lang]}</loc>`,
    ...LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${r[l]}"/>`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${r.en}"/>`,
    '  </url>',
  ].join('\n')));
  fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);
  const robots = path.join(dist, 'robots.txt');
  const txt = fs.existsSync(robots) ? fs.readFileSync(robots, 'utf8') : 'User-agent: *\nAllow: /\n';
  if (!/^Sitemap:/m.test(txt)) fs.writeFileSync(robots, `${txt.trimEnd()}\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log('sitemap.xml');
} else {
  console.warn('SITE_URL is not set: canonical and hreflang links are root-relative and no sitemap was written. Set it before launch.');
}
console.log(`${written} sheets in ${LANGS.length} languages`);
