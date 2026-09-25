// A poster of the visitor's own line: the line they set on the colophon,
// printed as a small broadside, 1080 x 1350 (the size a phone's feed shows
// whole), on the site's own paper: a dateline with Albania's date, the line in
// the wood face fitted to the measure (broken into a stack of fitted lines
// when one line would print small), the engraving, and at the foot Stefano's
// mark, his name and a code to the site. Drawn on a canvas in the sheet's own
// faces, so the phone can save it or share it.
import { makeGrain, makeMottle } from './paper.js';
import { qrCells } from './qr.js';
import { albaniaNow } from '../i18n.js';
import { pathFor } from '../routes.js';

const W = 1080, H = 1350, M = 72;
const INK = '#141414', PAPER = '#EFE6D2', RED = '#E23B2E';
const MEASURE = W - 2 * M;

/** The site's address with the place it was reached from (read by src/ui/from.js). */
export const tagged = (p, source) => {
  const u = new URL(p, location.origin);
  u.searchParams.set('utm_source', source);
  u.searchParams.set('utm_medium', 'qr');
  return u.href;
};

const loadImage = (src) => new Promise((resolve, reject) => {
  const i = new Image();
  i.onload = () => resolve(i);
  i.onerror = reject;
  i.src = src;
});

// the mark, from the page's own symbol: the S in ink, the bubble in red
async function markImage() {
  const sym = document.querySelector('#sd-mark');
  if (!sym) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${sym.getAttribute('viewBox')}" style="color:${INK}">${sym.innerHTML}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try { return await loadImage(url); } finally { URL.revokeObjectURL(url); }
}

// the wood face, condensed (Anybody's width axis): said in the font shorthand
// and again as the canvas's own width where it has one; a canvas that takes
// neither sets the line wider, and smaller, but still fitted
function face(g, size, weight = 900) {
  const narrow = weight >= 900;
  g.font = `${weight} ${narrow ? 'condensed ' : ''}${size}px Anybody, "Arial Narrow", sans-serif`;
  if ('fontStretch' in g) g.fontStretch = narrow ? 'condensed' : 'normal';
}
function track(g, em) { if ('letterSpacing' in g) g.letterSpacing = em; }

// the size at which a line fills the measure, up to a cap
function fit(g, text, cap) {
  face(g, 100);
  return Math.min(cap, (MEASURE / Math.max(1, g.measureText(text).width)) * 100);
}

// The lines' height as set: each line box 0.84 of its size, 0.08 between them.
const height = (lines) => lines.reduce((a, l, i) => a + l.s * 0.84 + (i ? l.s * 0.08 : 0), 0);

// The words set as one, two or three fitted lines, whichever prints the
// smallest line largest once the stack is fitted into its room, the way the
// masthead's lines are set.
function stack(g, text, room) {
  const cap = 300;
  const words = text.split(' ');
  const set = (parts) => parts.map((w) => w.join(' ')).map((t) => ({ t, s: fit(g, t, cap) }));
  const score = (lines) => Math.min(...lines.map((l) => l.s)) * Math.min(1, room / height(lines));
  let best = set([words]);
  for (let i = 1; i < words.length; i++) {
    const lines = set([words.slice(0, i), words.slice(i)]);
    if (score(lines) > score(best)) best = lines;
    for (let j = i + 1; j < words.length; j++) {
      const three = set([words.slice(0, i), words.slice(i, j), words.slice(j)]);
      if (score(three) > score(best)) best = three;
    }
  }
  return best;
}

// words broken to a width, for the italic line
function wrap(g, text, width) {
  const out = [];
  let line = '';
  for (const w of text.split(' ')) {
    const next = line ? `${line} ${w}` : w;
    if (line && g.measureText(next).width > width) { out.push(line); line = w; } else line = next;
  }
  if (line) out.push(line);
  return out;
}

export async function printPoster({ text, T, lang }) {
  await Promise.all(['900 100px Anybody', '800 22px Anybody', '400 28px Inter'].map((f) => document.fonts?.load(f).catch(() => null)));
  const [band, mark, qr] = await Promise.all([
    loadImage('/band-poster.jpg').catch(() => null),
    markImage().catch(() => null),
    // the code says where it was scanned from, so a telegram it brings says "poster" (src/ui/from.js)
    qrCells(tagged(pathFor('home', lang), 'poster'), 'M').catch(() => null),
  ]);

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');

  // the paper: newsprint, its mottle and grain
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  for (const tile of [makeMottle(), makeGrain()]) {
    g.fillStyle = g.createPattern(tile, 'repeat');
    g.fillRect(0, 0, W, H);
  }
  g.fillStyle = INK;
  const rule = (y, h) => g.fillRect(M, y, MEASURE, h);

  // the dateline: a double rule, Albania's date and the country, a rule
  rule(M, 7);
  rule(M + 11, 2);
  face(g, 22, 800);
  track(g, '2.6px');
  g.textBaseline = 'alphabetic';
  const { date } = albaniaNow(lang);
  g.textAlign = 'left';
  g.fillText(date.toLocaleUpperCase(lang), M, M + 52);
  g.textAlign = 'right';
  g.fillText(String(T.zone).toLocaleUpperCase(lang), W - M, M + 52);
  rule(M + 68, 2);
  track(g, '0px');

  // the foot, measured first so the line takes the room that is left
  const bandH = Math.round(MEASURE / 4);
  const footTop = H - M - 176;
  const bandTop = footTop - 120 - bandH;

  // the line: fitted, and set in the room between the dateline and the engraving
  const upper = text.toLocaleUpperCase(lang);
  const room = bandTop - 40 - (M + 110);
  const lead = (s) => s * 0.84;
  let lines = stack(g, upper, room);
  const k = Math.min(1, room / height(lines));
  lines = lines.map((l) => ({ t: l.t, s: l.s * k }));
  // centred on the capitals: the last line box keeps 0.12 of its size under them
  let y = M + 110 + (room - (height(lines) - lines[lines.length - 1].s * 0.12)) / 2;
  g.textAlign = 'center';
  for (const [i, l] of lines.entries()) {
    if (i) y += l.s * 0.08;
    face(g, l.s);
    const m = g.measureText(l.t);
    const capTop = m.actualBoundingBoxAscent || l.s * 0.72;
    // the line box is 0.84 of the size; its capitals sit at its foot
    g.fillText(l.t, W / 2, y + Math.min(lead(l.s), capTop));
    y += lead(l.s);
  }

  // the engraving, between a rule and the heavy ground under it
  rule(bandTop - 3, 3);
  if (band) g.drawImage(band, 0, 0, band.naturalWidth, band.naturalHeight, M, bandTop, MEASURE, bandH);
  else { g.fillStyle = RED; g.fillRect(M, bandTop, MEASURE, bandH); g.fillStyle = INK; }
  rule(bandTop + bandH, 10);

  // the italic line under it
  g.font = '400 28px Inter, system-ui, sans-serif';
  g.textAlign = 'left';
  wrap(g, T.posterLine, MEASURE).slice(0, 2).forEach((l, i) => g.fillText(l, M, bandTop + bandH + 52 + i * 38));

  // the foot: a rule, the mark, the name and the trade, and the code to the site
  rule(footTop, 3);
  const markH = 70;
  if (mark) g.drawImage(mark, M, footTop + 34, markH * (707 / 488), markH);
  const nameX = M + (mark ? markH * (707 / 488) + 22 : 0);
  face(g, 52);
  g.fillText('STEFANO DOKO', nameX, footTop + 82);
  face(g, 19, 800);
  track(g, '3px');
  g.fillText(String(T.role).toLocaleUpperCase(lang), nameX, footTop + 114);
  track(g, '0px');
  if (qr) {
    const size = 136, q = 4, cell = size / (qr.n + q * 2);
    const x0 = W - M - size, y0 = footTop + 18;
    g.fillStyle = PAPER;
    g.fillRect(x0, y0, size, size);
    g.fillStyle = INK;
    for (let r = 0; r < qr.n; r++) {
      for (let col = 0; col < qr.n; col++) {
        if (qr.dark(r, col)) g.fillRect(x0 + (col + q) * cell, y0 + (r + q) * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }
    g.font = '400 19px Inter, system-ui, sans-serif';
    g.textAlign = 'right';
    g.fillText(T.posterScan, x0 - 18, y0 + size - 8);
  }
  // the imprint: where it was set
  g.font = '400 21px Inter, system-ui, sans-serif';
  g.textAlign = 'left';
  g.fillText(location.host, nameX, footTop + 150);

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('no poster'))), 'image/jpeg', 0.92));
}
