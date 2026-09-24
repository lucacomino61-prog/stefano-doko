// Cut your own letter. Draw a letter in the box; it is cast into a real
// OpenType font in the browser (nothing is sent anywhere), set in the preview
// line, and offered as a file to take home.
import { state, bus } from '../state.js';
import { judder, sound } from './press.js';

const EM = 1000, BASE = 0.78, CAP = 0.2;
// the font library is only fetched when someone casts a letter; the package
// ships ESM with named exports and a UMD build, so take whichever arrives
let opentype = null;
const loadType = async () => {
  if (!opentype) { const ot = await import('opentype.js'); opentype = ot.Font ? ot : ot.default; }
  return opentype;
};

export function initLetter() {
  const pad = document.querySelector('[data-pad]');
  if (!pad) return;
  const ctx = pad.getContext('2d');
  const charIn = document.querySelector('[data-char]');
  const castBtn = document.querySelector('[data-cast]');
  const clearBtn = document.querySelector('[data-clear]');
  const dlBtn = document.querySelector('[data-download]');
  const msg = document.querySelector('[data-letter-msg]');
  const preview = document.querySelector('[data-preview]');
  let strokes = [], current = null, size = 260, dpr = 1, buffer = null, fontName = '', count = 0;
  let colors = {};

  const read = () => {
    const cs = getComputedStyle(document.documentElement);
    colors = { ink: cs.getPropertyValue('--ink').trim(), alarm: cs.getPropertyValue('--alarm').trim(), paper: cs.getPropertyValue('--paper').trim() };
  };
  const lineW = () => size * 0.078;

  function fit() {
    const r = pad.getBoundingClientRect();
    size = r.width || 260;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    pad.width = Math.round(size * dpr); pad.height = Math.round(size * dpr);
    read();
    draw();
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const ch = (charIn.value || 'S').slice(0, 1);
    // a ghost of the letter to trace, and the guide lines
    ctx.fillStyle = colors.ink;
    ctx.globalAlpha = 0.07;
    ctx.font = `400 ${size * 0.72}px Ultra, serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(ch.toUpperCase(), size / 2, size * BASE);
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = colors.alarm;
    ctx.lineWidth = 1;
    [BASE, CAP].forEach((f) => { ctx.beginPath(); ctx.moveTo(14, size * f); ctx.lineTo(size - 14, size * f); ctx.stroke(); });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = colors.ink;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = lineW();
    for (const s of [...strokes, current].filter(Boolean)) {
      ctx.beginPath();
      s.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (s.length === 1) ctx.lineTo(s[0][0] + 0.01, s[0][1]);
      ctx.stroke();
    }
  }
  const at = (e) => { const r = pad.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    loadType().catch(() => {}); // fetch the type library while the letter is being drawn
    pad.setPointerCapture(e.pointerId);
    current = [at(e)];
    draw();
  });
  pad.addEventListener('pointermove', (e) => {
    if (!current) return;
    const p = at(e), q = current[current.length - 1];
    if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 2) { current.push(p); draw(); }
  });
  const end = () => { if (current) { strokes.push(current); current = null; draw(); } };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
  charIn.addEventListener('input', () => { charIn.value = charIn.value.slice(-1); draw(); });
  clearBtn.addEventListener('click', () => { strokes = []; draw(); msg.textContent = ''; judder(pad); });

  // ---------- casting ----------
  const toEm = ([x, y]) => [(x / size) * EM, ((size * BASE - y) / size) * EM];
  function simplify(pts, tol) {
    if (pts.length < 3) return pts;
    const d2 = (p, a, b) => {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const l = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l));
      return (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2;
    };
    let idx = 0, max = 0;
    for (let i = 1; i < pts.length - 1; i++) { const d = d2(pts[i], pts[0], pts[pts.length - 1]); if (d > max) { max = d; idx = i; } }
    if (max > tol * tol) return [...simplify(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplify(pts.slice(idx), tol)];
    return [pts[0], pts[pts.length - 1]];
  }
  function ccw(poly) {
    let a = 0;
    for (let i = 0; i < poly.length; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]; a += x1 * y2 - x2 * y1; }
    return a < 0 ? poly.slice().reverse() : poly;
  }
  async function cast() {
    if (!opentype) {
      msg.textContent = state.T.letterCasting;
      castBtn.disabled = true;
      try { await loadType(); } catch { msg.textContent = state.T.letterFail; castBtn.disabled = false; return; }
      castBtn.disabled = false;
    }
    const ch = (charIn.value || '').slice(0, 1);
    if (!strokes.length) { msg.textContent = state.T.letterEmpty; judder(pad); return; }
    if (!ch.trim()) { charIn.focus(); return; }
    const r = (lineW() / size) * EM / 2;
    const polys = [];
    const all = strokes.map((s) => simplify(s.map(toEm), 5));
    let minX = Infinity, maxX = -Infinity;
    all.flat().forEach(([x]) => { minX = Math.min(minX, x - r); maxX = Math.max(maxX, x + r); });
    const shift = 60 - minX;
    for (const s of all) {
      const pts = s.map(([x, y]) => [x + shift, y]);
      pts.forEach(([x, y]) => polys.push(Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return [x + Math.cos(a) * r, y + Math.sin(a) * r]; })));
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        const len = Math.hypot(x1 - x0, y1 - y0) || 1;
        const nx = (-(y1 - y0) / len) * r, ny = ((x1 - x0) / len) * r;
        polys.push(ccw([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]));
      }
    }
    const path = new opentype.Path();
    polys.forEach((poly) => {
      poly.forEach(([x, y], i) => (i ? path.lineTo(Math.round(x), Math.round(y)) : path.moveTo(Math.round(x), Math.round(y))));
      path.close();
    });
    const advance = Math.round(maxX - minX + 120);
    const glyphs = [
      new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: 600, path: new opentype.Path() }),
      new opentype.Glyph({ name: 'space', unicode: 32, advanceWidth: 260, path: new opentype.Path() }),
    ];
    const up = ch.toUpperCase(), low = ch.toLowerCase();
    const codes = [...new Set([up, low].map((c) => c.codePointAt(0)))];
    codes.forEach((code) => glyphs.push(new opentype.Glyph({ name: `uni${code.toString(16).toUpperCase().padStart(4, '0')}`, unicode: code, advanceWidth: advance, path })));
    count++;
    fontName = `BroadsideLetter${count}`;
    const font = new opentype.Font({ familyName: 'Broadside Letter', styleName: 'Regular', unitsPerEm: EM, ascender: 820, descender: -220, glyphs });
    buffer = font.toArrayBuffer();
    const face = new FontFace(fontName, buffer);
    face.load().then((f) => {
      document.fonts.add(f);
      preview.style.fontFamily = `'${fontName}', 'Anybody', sans-serif`;
      preview.textContent = `${up} ${state.T.mastName}`;
      dlBtn.disabled = false;
      dlBtn.dataset.char = up;
      msg.textContent = state.T.letterDone;
      judder(preview);
      sound.press();
    }).catch(() => { msg.textContent = state.T.letterEmpty; });
  }
  castBtn.addEventListener('click', cast);
  dlBtn.addEventListener('click', () => {
    if (!buffer) return;
    const blob = new Blob([buffer], { type: 'font/otf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `broadside-letter-${(dlBtn.dataset.char || 'x').toLowerCase()}.otf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });

  new ResizeObserver(fit).observe(pad);
  bus.on('proof', () => setTimeout(() => { read(); draw(); }, 850));
  bus.on('lang', () => { if (!buffer) msg.textContent = ''; else preview.textContent = `${(charIn.value || 'S').toUpperCase()} ${state.T.mastName}`; });
}
