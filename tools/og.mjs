// Link previews, one per sheet and language: the 1200 x 630 picture WhatsApp,
// Facebook, LinkedIn and the rest show when a sheet's address is shared. Each
// is the sheet's own head, set in the sheet's own type over its own picture,
// in the broadside of public/og.png (brand/final/templates/og-site.html), with
// the words of that language. Since the modern edition (2026-09-25) set as the
// sheets are: Inter for the lines, Anybody set wide for a case's name,
// hairlines, and the picture as a rounded cut. tools/build-sq.mjs points each sheet at its
// preview. Headless Chrome, like the brand's renders.
// usage: node tools/og.mjs [--only home,elixir] [--lang en,sq,it]
//   then give each new picture its origin note (see README, "Link previews").
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { STRINGS } from '../src/i18n.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1].split(',') : null);
const LANGS = opt('--lang') || ['en', 'sq', 'it'];
const LANG_NAMES = ['English', 'Shqip', 'Italiano'];

// what each sheet's preview carries: its head (in the wood face, or set wide for a
// case's name, as the sheet sets it), three short lines beside it, its picture, and a line under it
const SHEETS = {
  home: (T) => ({ head: T.mastName, face: 'var', side: [T.mastSide1, T.mastSide2, T.mastSide3], image: 'public/band-poster.jpg', pos: '50% 62%', foot: T.standHead }),
  // the front page's parts on pages of their own: the work as the fan's three phones, the others in words
  work: (T) => ({ head: menuName(T, 'work'), face: 'var', side: ['Elixir', 'Bar Martiri', 'Dresses by Greta'], images: ['public/work/elixir-phone.jpg', 'public/work/greta-phone.jpg', 'public/work/martiri-phone.jpg'], foot: T.footerLine }),
  about: (T) => ({ head: T.aboutHead, face: 'var', side: [T.mastSide1, T.mastSide2, T.mastSide3], red: T.abDescription, foot: T.footerLine }),
  services: (T) => ({ head: T.cCode, face: 'var', side: [T.svcDesignHead, T.svcFrontHead, T.svcBackHead], red: T.servicesLine, foot: T.footerLine }),
  elixir: (T) => ({ head: 'Elixir', face: 'fat', side: T.elixirFacts, image: 'public/work/elixir-desktop.jpg', pos: '50% 12%', foot: `elixir.al · ${T.cElixir}` }),
  martiri: (T) => ({ head: 'Bar Martiri', face: 'fat', side: T.martiriFacts, image: 'public/work/martiri-desktop.jpg', pos: '50% 30%', foot: `barmartiri.com · ${T.cMartiri}` }),
  made: (T) => ({ head: T.mdHead, face: 'var', side: [T.mdEngHead, T.mdTypeHead, T.mdInkHead], image: 'public/band-poster.jpg', pos: '50% 40%', foot: T.footerLine }),
  contact: (T) => ({ head: T.ctHead, face: 'var', side: [T.cta, T.cWriteLine], red: T.extraLine, foot: T.footerLine }),
};
const only = opt('--only');
// a sheet's name as the index gives it ("The work")
function menuName(T, route) { return T.menu.find(([r, hash]) => r === route && !hash)?.[2] || route; }

const url = (p) => pathToFileURL(path.join(root, p)).href;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function sheet(T, s) {
  return `<!doctype html><html lang="${T.htmlLang}"><head><meta charset="utf-8"><style>
@font-face { font-family: 'Anybody'; src: url('${url('public/fonts/Anybody-VF.woff2')}') format('woff2'); font-weight: 100 900; font-stretch: 50% 150%; }
@font-face { font-family: 'Inter'; src: url('${url('public/fonts/Inter-VF-latin.woff2')}') format('woff2'); font-weight: 100 900; }
:root { --paper: #EFE6D2; --ink: #141414; --alarm: #E23B2E; }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; }
.sheet { width: 1200px; height: 630px; padding: 30px 56px 30px; background: var(--paper); color: var(--ink); display: flex; flex-direction: column;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .08 0 0 0 0 .07 0 0 0 0 .05 0 0 0 .1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
.label { font: 800 16px/1 'Anybody', sans-serif; font-stretch: 90%; letter-spacing: .08em; text-transform: uppercase; }
.slug { display: grid; grid-template-columns: 1fr auto 1fr; border-bottom: 1.5px solid var(--ink); }
.slug span { padding-bottom: 11px; }
.slug span:nth-child(2) { padding: 0 22px 11px; }
.slug span:nth-child(3) { text-align: right; }
.mast { display: flex; align-items: center; gap: 26px; padding: 22px 0 20px; min-height: 0; }
.mast img { height: 84px; width: auto; display: block; flex: none; }
.head { flex: 1; min-width: 0; line-height: .82; white-space: nowrap; text-transform: uppercase; }
.head--var { font-family: 'Anybody', sans-serif; font-weight: 900; font-stretch: 66%; }
.head--fat { font-family: 'Anybody', sans-serif; font-weight: 900; font-stretch: 118%; line-height: .86; }
.side { flex: none; max-width: 330px; font: 850 21px/1.1 'Anybody', sans-serif; font-stretch: 80%; text-transform: uppercase; }
.side p { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.band { flex: 1; min-height: 0; display: flex; border-radius: 22px; overflow: hidden; }
.band img { display: block; width: 100%; height: 100%; object-fit: cover; }
.band--three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; border-radius: 0; }
.band--three img { object-position: 50% 0; border-radius: 18px; }
.band--red { background: var(--alarm); align-items: center; padding: 0 44px; }
.band--red p { font: 400 36px/1.3 'Inter', sans-serif; letter-spacing: -0.02em; max-width: 28ch; }
.foot { margin-top: 16px; display: flex; justify-content: space-between; align-items: baseline; gap: 30px; border-top: 1.5px solid var(--ink); padding-top: 12px; }
.foot p { font: 400 21px/1.25 'Inter', sans-serif; letter-spacing: -0.015em; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.foot .label { white-space: nowrap; }
</style></head><body>
<div class="sheet">
  <div class="slug label"><span>Stefano Doko</span><span>${LANG_NAMES.join(' · ')}</span><span>${esc(T.zone)}</span></div>
  <div class="mast">
    <img src="${url('brand/final/logo/mark-tight.svg')}" alt="">
    <div class="head head--${s.face}" data-head>${esc(s.head)}</div>
    <div class="side">${s.side.map((l) => `<p>${esc(l)}</p>`).join('')}</div>
  </div>
  ${s.red ? `<div class="band band--red"><p>${esc(s.red)}</p></div>` : s.images ? `<div class="band band--three">${s.images.map((i) => `<img src="${url(i)}" alt="">`).join('')}</div>` : `<div class="band"><img src="${url(s.image)}" alt="" style="object-position:${s.pos}"></div>`}
  <div class="foot"><p>${esc(s.foot)}</p><span class="label">${esc(T.role)}</span></div>
</div></body></html>`;
}

// the head fitted to its room, the way the sheets fit theirs: largest size that fits, up to a cap
async function fitHead(page) {
  await page.evaluate(() => {
    const el = document.querySelector('[data-head]');
    let lo = 20, hi = 140;
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = `${mid}px`;
      if (el.scrollWidth > el.clientWidth + 0.5) hi = mid; else lo = mid;
    }
    el.style.fontSize = `${lo}px`;
  });
}

const browser = await puppeteer.launch({ headless: 'new', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
const tmp = path.join(root, 'tools', '_og.html');
let n = 0;
try {
  for (const lang of LANGS) {
    const T = STRINGS[lang];
    for (const [key, make] of Object.entries(SHEETS)) {
      if (only && !only.includes(key)) continue;
      fs.writeFileSync(tmp, sheet(T, make(T)));
      await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await fitHead(page);
      // JPEG: a PNG of the engraving was 850 KB, and WhatsApp leaves out a preview picture much over 300 KB
      const out = path.join(root, 'public', 'og', lang, `${key}.jpg`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await page.screenshot({ path: out, type: 'jpeg', quality: 86, clip: { x: 0, y: 0, width: 1200, height: 630 } });
      console.log(path.relative(root, out));
      n++;
    }
  }
} finally {
  fs.rmSync(tmp, { force: true });
  await browser.close();
}
console.log(`${n} previews`);
