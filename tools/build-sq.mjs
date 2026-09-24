// After the build: write the Albanian sheets from the English ones, and give
// every sheet its canonical and hreflang links, so search engines find both.
// Text is swapped wherever the HTML marks it for translation (data-i18n,
// data-i18n-attr, data-i18n-list, proof notes), as src/i18n.js does in the
// browser, and links marked data-route are pointed at the Albanian sheets.
// usage: node tools/build-sq.mjs
//        SITE_URL=https://the-domain node tools/build-sq.mjs  (absolute links, sitemap)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STRINGS } from '../src/i18n.js';
import { ROUTES } from '../src/routes.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || '').replace(/\/$/, '');

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

function headLinks(html, key, lang) {
  const r = ROUTES[key];
  const abs = (p) => `${SITE}${p}`;
  const lines = [
    `<link rel="canonical" href="${abs(r[lang])}">`,
    `<link rel="alternate" hreflang="en" href="${abs(r.en)}">`,
    `<link rel="alternate" hreflang="sq" href="${abs(r.sq)}">`,
    `<link rel="alternate" hreflang="x-default" href="${abs(r.en)}">`,
    `<meta property="og:locale" content="${lang === 'sq' ? 'sq_AL' : 'en_GB'}">`,
    `<meta property="og:locale:alternate" content="${lang === 'sq' ? 'en_GB' : 'sq_AL'}">`,
  ];
  if (SITE) lines.push(`<meta property="og:url" content="${abs(r[lang])}">`);
  let out = html.replace(/<\/head>/, `${lines.map((l) => `  ${l}`).join('\n')}\n</head>`);
  if (SITE) out = out.replace(/(<meta property="og:image" content=")\/(og\.png")/, `$1${SITE}/$2`);
  return out;
}

const stripHead = (html) => html.replace(/\n[ \t]*<link rel="(?:canonical|alternate)"[^>]*>/g, '').replace(/\n[ \t]*<meta property="og:(?:locale|locale:alternate|url)"[^>]*>/g, '');

let written = 0;
for (const [key, r] of Object.entries(ROUTES)) {
  const enFile = path.join(dist, r.en, 'index.html');
  if (!fs.existsSync(enFile)) { console.warn(`missing ${enFile}`); continue; }
  const src = stripHead(fs.readFileSync(enFile, 'utf8'));
  fs.writeFileSync(enFile, headLinks(relink(src, 'en'), key, 'en'));
  const sqFile = path.join(dist, r.sq, 'index.html');
  fs.mkdirSync(path.dirname(sqFile), { recursive: true });
  fs.writeFileSync(sqFile, headLinks(relink(translate(src, STRINGS.sq), 'sq'), key, 'sq'));
  written++;
  console.log(`${r.en.padEnd(20)} ${r.sq}`);
}

if (SITE) {
  const urls = Object.values(ROUTES).flatMap((r) => ['en', 'sq'].map((lang) => [
    '  <url>',
    `    <loc>${SITE}${r[lang]}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${r.en}"/>`,
    `    <xhtml:link rel="alternate" hreflang="sq" href="${SITE}${r.sq}"/>`,
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
console.log(`${written} sheets in two languages`);
