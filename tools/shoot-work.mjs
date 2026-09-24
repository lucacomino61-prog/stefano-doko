// Dev-only: capture the case-page plates from the two live sites and place
// each callout from the page itself. For every detail in a key the tool
// measures its box (the control it sits in, its skin, or the ink of its
// text) and every line of visible text, control and picture on the screen;
// the ring then goes just outside the detail, on the side facing the key, at
// the height where a straight rule to the plate's edge crosses nothing (or
// as little as possible), clear of the rules already drawn. Both sides are
// placed, so a figure can take its key on either side.
// Consent notices are declined (the site's own "essential only" / "decline").
// Nothing is ordered, sent or saved on either site: the tool only scrolls,
// opens a menu and opens a basket in a throwaway browser.
// Writes public/work/<name>.jpg and src/data/plates.json:
//   { name: { r: [[x, y, dx, dy], ...], l: [...], view, url, shot } }
// anchors in key order (the order of the <li>s): the ring's centre as
// fractions of the shot, and the unit step from the detail out to the ring.
// usage: node tools/shoot-work.mjs [name ...] [--debug <dir>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const di = argv.indexOf('--debug');
const debugDir = di >= 0 ? argv[di + 1] : null;
const only = argv.filter((a, i) => !a.startsWith('--') && (di < 0 || i !== di + 1));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// finders, one per key entry and in the key's order:
//   { text } an element's own text, { aria } its aria-label, { sel } a CSS
//   selector (with text, matched against the whole textContent); nth picks
//   among visible matches in page order, all takes every match; union: [...]
//   joins several finders into one box
const SHOTS = [
  {
    name: 'elixir-home', url: 'https://www.elixir.al/', view: 'desktop',
    anchors: [
      { text: '^Transport falas' },
      { aria: '^Kërko një parfum$', sel: 'input' },
      { sel: 'nav[aria-label^="Katalogu"] button', all: true },
      { text: '^(Një aromë|që mbetet|në kujtesë)$', all: true },
      { text: '^Shiko parfumet$' },
    ],
  },
  {
    name: 'elixir-list', url: 'https://www.elixir.al/te-gjitha', view: 'desktop',
    anchors: [{ text: '^\\d+ parfume$' }, { text: '^Filtro$' }, { aria: 'preferuar', nth: 1 }, { text: '^best seller$', flags: 'i' }, { text: '^Shto$' }],
  },
  {
    name: 'elixir-product', url: 'https://www.elixir.al/produkt/maison-francis-kurkdjian-baccarat-rouge-540-a0d62c', view: 'desktop',
    anchors: [
      { text: '^ALL 28,000$' },
      { text: '^70ML' },
      { union: [{ text: 'Shto në shportë', flags: 'i' }, { text: '^Bli tani$', flags: 'i' }] },
      { text: 'Pyet në WhatsApp', flags: 'i' },
      { text: '100% origjinal', flags: 'i', list: true },
    ],
  },
  {
    name: 'elixir-product-phone', url: 'https://www.elixir.al/produkt/maison-francis-kurkdjian-baccarat-rouge-540-a0d62c', view: 'phone',
    anchors: [{ text: '^Bli tani$', flags: 'i' }, { text: 'Pyet në WhatsApp', flags: 'i' }, { text: '^Kërko$' }],
  },
  {
    name: 'elixir-list-phone', url: 'https://www.elixir.al/te-gjitha', view: 'phone',
    anchors: [{ sel: 'input[type="search"], input[placeholder^="Kërko"]' }, { text: '^Filtro$' }, { text: '^Shto$' }],
  },
  {
    name: 'elixir-guide', url: 'https://www.elixir.al/blog/si-te-dallosh-parfumin-origjinal-nga-i-falsifikuar', view: 'phone',
    anchors: [{ sel: 'h1' }, { text: '^Përditësuar' }, { text: '^Çmimi:' }],
  },
  {
    name: 'martiri-home', url: 'https://www.barmartiri.com/', view: 'desktop', lang: 'en',
    anchors: [
      { aria: '^Change language$' },
      { sel: 'h1' },
      { union: [{ text: '^View the menu$' }, { text: '^Call now$' }] },
      { aria: '^Main navigation$' },
    ],
  },
  {
    name: 'martiri-welcome', url: 'https://www.barmartiri.com/', view: 'phone', lang: 'en', keepConsent: true,
    anchors: [
      { text: '^Choose your language$' },
      { sel: 'button', text: '(Shqip|Italiano|English)$', all: true },
      { text: 'Google Maps only loads' },
      { union: [{ text: '^Decline$', flags: 'i' }, { text: 'Accept$', flags: 'i' }] },
    ],
  },
  {
    name: 'martiri-menu', url: 'https://www.barmartiri.com/', view: 'phone', lang: 'en',
    click: [{ text: '^View the menu$' }],
    anchors: [{ sel: 'input' }, { text: '^Ice Cream$', nth: -1 }, { aria: '^Add Vanilla$' }, { aria: '^Open basket$' }],
  },
  {
    // one vanilla in the basket of a throwaway browser, so the basket shows
    // where the order is brought; nothing is sent
    name: 'martiri-basket', url: 'https://www.barmartiri.com/', view: 'phone', lang: 'en',
    click: [{ text: '^View the menu$' }, { aria: '^Add Vanilla$' }, { aria: '^Close menu$' }, { aria: '^Open basket$' }],
    anchors: [{ text: '^Total', flags: 'i' }, { text: '^Where are you\\??$', flags: 'i' }, { text: 'minutes', flags: 'i' }, { sel: 'select', all: true }],
  },
  // Dresses by Greta: shown on the front page by name and preview only, with
  // no address (its domain comes later), so no key and no anchors
  { name: 'greta-home', url: 'https://www.dressesbygreta.workers.dev/', view: 'desktop', keepConsent: true, anchors: [] },
  { name: 'greta-phone', url: 'https://www.dressesbygreta.workers.dev/', view: 'phone', keepConsent: true, anchors: [] },
  {
    name: 'martiri-summer', url: 'https://www.barmartiri.com/', view: 'desktop', lang: 'en',
    scrollTo: { text: '^Summer starts at Bar Martiri\\.?$' }, offset: 150,
    anchors: [{ text: '^Call now$', flags: 'i' }, { text: '^700 ALL per day$' }, { text: '^Free parking$' }],
  },
  {
    name: 'martiri-hours', url: 'https://www.barmartiri.com/', view: 'desktop', lang: 'en',
    scrollTo: { text: '^Stop for the flavour' }, offset: 330,
    anchors: [{ text: '^Every day$' }, { text: '^Call now$', flags: 'i' }, { text: '^Open map$', flags: 'i' }],
  },
];

async function decline(page) {
  return page.evaluate(() => {
    const btn = [...document.querySelectorAll('button, a')].find((b) => /^(Vetëm thelbësore|Anulo|Decline|Rifiuta)$/i.test((b.textContent || '').trim()));
    if (btn) { btn.click(); return btn.textContent.trim(); }
    return null;
  });
}

// runs in the page: the box of each finder, and every obstacle on screen
function measure(specs) {
  const W = innerWidth, H = innerHeight;
  const R = (r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom });
  const join = (rs) => rs.reduce((u, r) => (u ? { l: Math.min(u.l, r.l), t: Math.min(u.t, r.t), r: Math.max(u.r, r.r), b: Math.max(u.b, r.b) } : r), null);
  const area = (r) => Math.max(0, r.r - r.l) * Math.max(0, r.b - r.t);
  const inView = (r) => r.right - r.left > 2 && r.bottom - r.top > 2 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W;
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return inView(r) && cs.visibility !== 'hidden' && +cs.opacity !== 0;
  };
  const own = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
  // is el the thing actually seen at the middle of r (not under an overlay)?
  // Text that ignores the pointer (a notice bar, a ticker) would fall through
  // the hit test, so it is made hit-testable for the moment of the test.
  const onTop = (el, r) => {
    const x = Math.min(W - 1, Math.max(0, (r.left + r.right) / 2));
    const y = Math.min(H - 1, Math.max(0, (r.top + r.bottom) / 2));
    const deaf = getComputedStyle(el).pointerEvents === 'none';
    const was = el.style.getPropertyValue('pointer-events');
    if (deaf) el.style.setProperty('pointer-events', 'auto', 'important');
    const hit = document.elementFromPoint(x, y);
    if (deaf) { if (was) el.style.setProperty('pointer-events', was); else el.style.removeProperty('pointer-events'); }
    return !hit || hit === el || el.contains(hit) || hit.contains(el);
  };
  const textRects = (el) => {
    const out = [];
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
      if (!n.textContent.trim()) continue;
      const rg = document.createRange();
      rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) if (inView(r)) out.push(R(r));
    }
    return out;
  };
  const skinned = (el) => {
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor;
    const fill = bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bg);
    const border = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth) + parseFloat(cs.borderLeftWidth) > 0 && cs.borderTopStyle !== 'none';
    return fill || border || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none';
  };
  const find = (spec) => {
    let c = spec.sel ? [...document.querySelectorAll(spec.sel)] : [...document.querySelectorAll('body *')];
    if (spec.aria) { const re = new RegExp(spec.aria, 'i'); c = c.filter((e) => re.test(e.getAttribute('aria-label') || '')); }
    if (spec.text) {
      const re = new RegExp(spec.text, spec.flags || '');
      c = spec.sel
        ? c.filter((e) => re.test((e.textContent || '').trim()))
        : c.filter((e) => re.test(own(e)) || (e.children.length === 0 && re.test((e.textContent || '').trim())));
    }
    c = c.filter(shown);
    if (spec.all) return c;
    const el = spec.nth < 0 ? c[c.length + spec.nth] : c[spec.nth || 0];
    return el ? [el] : [];
  };
  // what the ring points at: a control as a whole, a skinned element (or the
  // small skinned chip it sits in) as a whole, otherwise the ink of its text
  const boxOf = (el, spec) => {
    const self = R(el.getBoundingClientRect());
    const hard = el.closest('button, input, select, textarea, [role="button"]');
    if (hard) { const r = R(hard.getBoundingClientRect()); if (r.r - r.l < W * 0.6) return r; }
    if (spec.list) { const list = el.closest('ul, ol'); if (list) { const t = textRects(list); if (t.length) return join(t); } }
    const t = textRects(el);
    if (skinned(el) || !t.length) return self;
    // a chip holds little more than the detail's own words; a bordered list
    // or section holds much more, and is not the thing pointed at
    const words = (el.textContent || '').trim().length;
    for (let a = el.parentElement, i = 0; a && i < 3; a = a.parentElement, i++) {
      if (!skinned(a)) continue;
      const r = R(a.getBoundingClientRect());
      if (r.r - r.l < W * 0.5 && (a.textContent || '').trim().length <= words * 3 + 12) return r;
      break;
    }
    return join(t);
  };
  const box = (spec) => {
    if (spec.union) { const parts = spec.union.map(box); return parts.some((p) => !p) ? null : { ...join(parts.map((p) => p)), what: parts.map((p) => p.what).join(' + ') }; }
    const els = find(spec);
    if (!els.length) return null;
    const b = join(els.map((e) => boxOf(e, spec)));
    return { ...b, what: els.map((e) => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 24)).join(' | ') };
  };
  const targets = specs.map(box);

  const obs = [];
  // faded out somewhere up the tree (a closed tooltip, a hidden menu)
  const faded = (el) => { for (let a = el; a && a !== document.body; a = a.parentElement) if (+getComputedStyle(a).opacity < 0.05) return true; return false; };
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walk.nextNode())) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || faded(el)) continue;
    const rg = document.createRange();
    rg.selectNodeContents(n);
    for (const r of rg.getClientRects()) if (inView(r) && onTop(el, r)) obs.push([r.left, r.top, r.right, r.bottom, 't']);
  }
  for (const el of document.querySelectorAll('button, input, select, textarea, [role="button"], img, svg, video, canvas, iframe')) {
    if (el.tagName.toLowerCase() !== 'svg' && el.closest('svg')) continue;
    const r = el.getBoundingClientRect();
    if (!inView(r) || getComputedStyle(el).visibility === 'hidden' || faded(el) || !onTop(el, r)) continue;
    const tag = el.tagName.toLowerCase();
    const pic = /^(img|video|canvas|iframe)$/.test(tag) || (tag === 'svg' && (r.right - r.left) * (r.bottom - r.top) > 2500);
    obs.push([r.left, r.top, r.right, r.bottom, pic ? 'i' : 'c']);
  }
  return { W, H, targets, obs };
}

// the ring and its rule for each detail, on one side (+1 key to the right)
function place(W, H, targets, obs0, side, o) {
  const hit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  // what a rule may graze: the leading of a text line and the padding of a
  // control are not its letters
  const obs = obs0.map(([l, t, r, b, k]) => {
    const h = b - t;
    const v = k === 't' ? h * 0.12 : k === 'c' ? Math.max(3, h * 0.22) : 2;
    const x = k === 'c' ? 3 : k === 'i' ? 2 : 0;
    return [l + x, t + v, r - x, b - v, k];
  }).filter((b) => b[2] > b[0] && b[3] > b[1]);
  const done = [];
  return targets.map((T) => {
    if (!T) return null;
    const cy = (T.t + T.b) / 2;
    const cands = [];
    // (dx, dy): the way from the detail out to the ring, so a bigger marker
    // (a pinned letter on a small screen) can move out and still clear it
    const xb = side > 0 ? T.r + o.gap + o.dot : T.l - o.gap - o.dot;
    for (let y = Math.round(T.t - 3); y <= Math.round(T.b + 3); y++) cands.push({ x: xb, y, kind: 'beside', d: Math.abs(y - cy) * 0.4, dx: side, dy: 0 });
    const xc = side > 0 ? Math.max(T.l + o.dot, T.r - o.dot - 2) : Math.min(T.r - o.dot, T.l + o.dot + 2);
    // a ring pinned on the detail's top or bottom edge, at its key-side end
    cands.push({ x: xc, y: T.t + 1, kind: 'edge', d: 12, on: true, dx: 0, dy: -1 });
    cands.push({ x: xc, y: T.b - 1, kind: 'edge', d: 12, on: true, dx: 0, dy: 1 });
    for (let k = 0; k <= 36; k++) {
      cands.push({ x: xc, y: T.t - o.gap - o.dot - k, kind: 'above', d: 16 + k, dx: 0, dy: -1 });
      cands.push({ x: xc, y: T.b + o.gap + o.dot + k, kind: 'below', d: 16 + k, dx: 0, dy: 1 });
    }
    let best = null;
    for (const c of cands) {
      if (c.x - o.dot < 1 || c.x + o.dot > W - 1 || c.y - o.dot < 1 || c.y + o.dot > H - 1) continue;
      const disc = [c.x - o.dot - 1, c.y - o.dot - 1, c.x + o.dot + 1, c.y + o.dot + 1];
      const x0 = side > 0 ? c.x + o.dot : 0;
      const x1 = side > 0 ? W : c.x - o.dot;
      const lane = [x0, c.y - o.half, x1, c.y + o.half];
      let cost = c.d, hard = 0, pics = 0;
      if (hit(disc, [T.l, T.t, T.r, T.b])) cost += c.on ? 80 : 1000;
      for (const b of obs) {
        // a ring pinned on the detail's edge may touch the detail's own parts
        if (c.on && b[0] >= T.l - 1 && b[2] <= T.r + 1 && b[1] >= T.t - 1 && b[3] <= T.b + 1 && !hit(lane, b)) continue;
        const onDot = hit(disc, b), onLane = hit(lane, b);
        if (!onDot && !onLane) continue;
        if (b[4] === 'i') { pics += 1; cost += (onDot ? 40 : 0) + (onLane ? 10 : 0); } else { hard += 1; cost += (onDot ? 400 : 0) + (onLane ? 200 : 0); }
      }
      for (const p of done) {
        if (Math.min(x1, p.x1) - Math.max(x0, p.x0) > 0 && Math.abs(c.y - p.y) < o.sep) cost += 300;
        if (Math.hypot(c.x - p.x, c.y - p.y) < 2 * o.dot + 6) cost += 600;
      }
      // the key reads A, B, C down the column: keep the rings in that order
      const prev = done[done.length - 1];
      if (prev && c.y <= prev.y + 6) cost += 250;
      if (!best || cost < best.cost) best = { ...c, cost, hard, pics, x0, x1 };
    }
    done.push(best);
    return best;
  });
}

const browser = await puppeteer.launch({
  headless: 'new', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--mute-audio', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--lang=en-GB'],
});
const dataFile = path.join(root, 'src/data/plates.json');
fs.mkdirSync(path.dirname(dataFile), { recursive: true });
const data = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : {};
if (debugDir) fs.mkdirSync(debugDir, { recursive: true });

for (const s of SHOTS) {
  if (only.length && !only.includes(s.name)) continue;
  const phone = s.view === 'phone';
  // a fresh profile for every shot: a choice made on one (a declined notice,
  // a language) must not carry into the next
  const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
  const page = await ctx.newPage();
  // the debug overlay is an inline-styled svg; some sites forbid inline styles
  if (debugDir) await page.setBypassCSP(true);
  await page.setViewport({ width: phone ? 390 : 1440, height: phone ? 844 : 900, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
  if (s.lang) await page.evaluateOnNewDocument((l) => { try { localStorage.setItem('barMartiri.language.v1', l); } catch { /* */ } }, s.lang);
  await page.goto(s.url, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1800);
  if (!s.keepConsent) { await decline(page); await sleep(700); }
  if (s.scrollTo) {
    const top = await page.evaluate((spec, off) => {
      const re = new RegExp(spec.text);
      const el = [...document.querySelectorAll('h1, h2, h3, p, span, div')].find((e) => re.test((e.textContent || '').trim()) && e.children.length < 4);
      return el ? el.getBoundingClientRect().top + scrollY - off : null;
    }, s.scrollTo, s.offset || 100);
    if (top !== null) { await page.evaluate((y) => scrollTo(0, y), top); await sleep(1500); }
  }
  for (const c of [].concat(s.click || [])) {
    const found = await page.evaluate((spec) => {
      const re = new RegExp(spec.text || spec.aria, 'i');
      const el = [...document.querySelectorAll('button, a, [role=button]')].find((e) => (spec.text ? re.test((e.textContent || '').trim()) : re.test(e.getAttribute('aria-label') || '')));
      el?.click();
      return !!el;
    }, c);
    if (!found) console.log(`  ${s.name}: click ${JSON.stringify(c)} found nothing`);
    await sleep(1300);
  }
  const file = path.join(root, 'public/work', `${s.name}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 84, captureBeyondViewport: false });
  const m = await page.evaluate(measure, s.anchors);
  // sizes in css px of the shot: the plates show a shot at about 0.6 to 0.8
  // of its size, where the ring is 7px, its rule's halo 3px, and rules at
  // least about 11px apart on the page
  const o = { dot: 11, gap: 3, half: 5, sep: 18 };
  const out = { view: s.view, url: s.url, shot: new Date().toISOString().slice(0, 10) };
  for (const [key, side] of [['r', 1], ['l', -1]]) {
    const placed = place(m.W, m.H, m.targets, m.obs, side, o);
    // [x, y, dx, dy]: the ring's centre as fractions of the shot, and the way out from its detail
    out[key] = placed.map((p) => (p ? [+(p.x / m.W).toFixed(4), +(p.y / m.H).toFixed(4), p.dx, p.dy] : [0.5, 0.5, 0, 0]));
    const ys = placed.map((p) => (p ? p.y : 0));
    const ordered = ys.every((y, i) => i === 0 || y > ys[i - 1]);
    console.log(`  ${s.name} key ${key === 'r' ? 'right' : 'left '}: ${placed.map((p, i) => (p ? `${'ABCDEFGH'[i]} ${p.kind}${p.hard ? ` crosses ${p.hard}` : ''}${p.pics ? ` pics ${p.pics}` : ''}` : `${'ABCDEFGH'[i]} NOT FOUND`)).join(', ')}${ordered ? '' : '  (order differs from the key)'}`);
    if (debugDir) {
      await page.evaluate((pl, sd, W, T) => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('id', 'shoot-debug');
        svg.setAttribute('style', 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:2147483647;pointer-events:none');
        svg.innerHTML = pl.map((p, i) => (p ? `<rect x="${T[i].l}" y="${T[i].t}" width="${T[i].r - T[i].l}" height="${T[i].b - T[i].t}" fill="none" stroke="#e23b2e" stroke-dasharray="3 2"/><line x1="${p.x}" y1="${p.y}" x2="${sd > 0 ? W : 0}" y2="${p.y}" stroke="#000" stroke-width="1.6"/><circle cx="${p.x}" cy="${p.y}" r="7" fill="#fff" stroke="#000" stroke-width="2"/><text x="${p.x}" y="${p.y + 3.5}" font-size="10" text-anchor="middle" font-family="sans-serif">${'ABCDEFGH'[i]}</text>` : '')).join('');
        // a modal menu sits in the top layer, above any z-index
        (document.querySelector('dialog[open]') || document.body).appendChild(svg);
      }, placed, side, m.W, m.targets);
      await page.screenshot({ path: path.join(debugDir, `${s.name}-${key}.png`), captureBeyondViewport: false });
      await page.evaluate(() => document.getElementById('shoot-debug')?.remove());
    }
  }
  m.targets.forEach((t, i) => { if (!t) console.log(`  ${s.name}: ${JSON.stringify(s.anchors[i])} NOT FOUND`); });
  data[s.name] = out;
  console.log(`${s.name}.jpg`);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(dataFile, `${JSON.stringify(data, null, 1)}\n`);
console.log('plates.json');
