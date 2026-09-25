// The road (Luca, 2026-09-25: "when scrolling, a red path for the car, and it
// follows the path, on PC and mobile"). The Elixir van from the engraving
// drives down the sheet as it is read, and the road it has driven is painted
// red behind it; the way still ahead is dotted in. The road keeps to the
// margin beside the sheets and crosses the page only where two parts of it
// leave the whole width clear, so it never runs over a word. The van keeps to
// a reading line on the screen; on a crossing it slows, turns with the road
// and drives across, then catches up.
//
// Everything is worked out from the laid-out page (layout()) as a list of
// scroll positions, and handed to the browser as keyframes on a ScrollTimeline:
// the van and the painted road then move on the compositor with the scroll
// itself, so they never trail the page (a phone scrolls the page between this
// script's frames). Where there is no ScrollTimeline, the one clock moves
// them (update()). With the press stopped the road is shown whole, and no van.
import gsap from 'gsap';
import { state, bus } from '../state.js';

// what is set on the page, whose height a crossing must not cut through
const SOLID = [
  'p', 'h1', 'h2', 'h3', 'li', 'figure', 'img', 'canvas', 'button', 'a', 'input', 'textarea', 'label', 'table', 'svg',
  '[data-fit]', '.fan', '.band', '.marquee', '.typecase', '.telegram', '.ratecard', '.card', '.gallery', '.letter', '.game',
].map((s) => `main ${s}`).join(', ');

const VAN = `<svg class="van__car" viewBox="-4 -2 36 54" aria-hidden="true" focusable="false">
  <rect class="van__body" x="0" y="0" width="28" height="50" rx="7"/>
  <path class="van__ribs" d="M6 6.5h16M6 11h16M6 15.5h16M6 20h16"/>
  <rect class="van__stripe" x="4.5" y="24" width="19" height="4" rx="1.5"/>
  <path class="van__glass" d="M4 33h20l-2.2 6.5H6.2z"/>
  <path class="van__bonnet" d="M6 45.5h16"/>
  <rect class="van__mirror" x="-3.2" y="33.6" width="4.2" height="3" rx="1.2"/>
  <rect class="van__mirror" x="27" y="33.6" width="4.2" height="3" rx="1.2"/>
</svg>`;

const SVGNS = 'http://www.w3.org/2000/svg';
const svg = (cls) => { const el = document.createElementNS(SVGNS, 'svg'); el.setAttribute('class', cls); el.setAttribute('aria-hidden', 'true'); return el; };
const node = (tag, cls) => { const el = document.createElementNS(SVGNS, tag); if (cls) el.setAttribute('class', cls); return el; };

// a point on the road at a height down the page: where it is across, and which
// way it heads (degrees from straight down; a crossing turns up to 90)
function pointAt(segs, y) {
  let seg = segs[segs.length - 1];
  for (const s of segs) if (y <= s.y1) { seg = s; break; }
  if (seg.t === 'v') return { x: seg.x, a: 0 };
  // an S between the lanes: leaves straight down, runs across, arrives straight down
  const { x0, x1, y0, y1 } = seg;
  const ym = (y0 + y1) / 2;
  const yAt = (t) => { const u = 1 - t; return y0 * u * u * u + 3 * ym * u * u * t + 3 * ym * u * t * t + y1 * t * t * t; };
  let lo = 0, hi = 1;
  for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (yAt(mid) < y) lo = mid; else hi = mid; }
  const t = Math.max(0, Math.min(1, (lo + hi) / 2)), u = 1 - t;
  const x = x0 * u * u * u + 3 * x0 * u * u * t + 3 * x1 * u * t * t + x1 * t * t * t;
  const dx = 6 * (x1 - x0) * u * t;
  const dy = 1.5 * (y1 - y0) * (u * u + t * t);
  return { x, a: (Math.atan2(-dx, dy) * 180) / Math.PI };
}

// the height the van has reached at a scroll position: straight lines between knots
function yAtScroll(knots, s) {
  if (s <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    const [s1, y1] = knots[i];
    if (s <= s1) {
      const [s0, y0] = knots[i - 1];
      return s1 === s0 ? y1 : y0 + ((y1 - y0) * (s - s0)) / (s1 - s0);
    }
  }
  return knots[knots.length - 1][1];
}

export function initRoad() {
  const main = document.querySelector('main');
  if (!main) return null;

  const road = document.createElement('div');
  road.className = 'road';
  road.setAttribute('aria-hidden', 'true');
  const ahead = svg('road__ahead');
  const aheadPath = node('path', 'road__dots');
  const start = node('circle', 'road__start');
  const end = node('circle', 'road__end');
  const endDot = node('circle', 'road__end-dot');
  ahead.append(aheadPath, start, end, endDot);
  const reveal = document.createElement('div');
  reveal.className = 'road__reveal';
  const inner = document.createElement('div');
  inner.className = 'road__inner';
  const done = svg('road__done');
  const casing = node('path', 'road__casing');
  const line = node('path', 'road__line');
  done.append(casing, line);
  inner.append(done);
  reveal.append(inner);
  road.append(ahead, reveal);

  const van = document.createElement('div');
  van.className = 'van';
  van.setAttribute('aria-hidden', 'true');
  van.innerHTML = VAN;
  document.body.append(road, van);

  const timeline = typeof ScrollTimeline === 'function'
    ? new ScrollTimeline({ source: document.scrollingElement || document.documentElement, axis: 'block' })
    : null;
  let anims = null; // [van, reveal, inner] on the scroll timeline
  let built = null; // the laid-out road: its segments, knots and sizes
  let lastS = -1;

  function layout() {
    const doc = document.scrollingElement || document.documentElement;
    const W = doc.clientWidth;
    const vh = window.innerHeight;
    // the page's own height: the road is laid over it and must never lengthen it
    const H = document.body.offsetHeight;
    const M = Math.max(1, H - vh);
    const sy = window.scrollY;
    const top = (el) => el.getBoundingClientRect().top + sy;
    const bottom = (el) => el.getBoundingClientRect().bottom + sy;

    // the lanes: the middle of each side margin, kept clear of a notch
    const cs = getComputedStyle(document.documentElement);
    const probe = document.querySelector('.toolbar') || main;
    const m = parseFloat(getComputedStyle(probe).marginLeft) || 16;
    const vanW = Math.max(14, Math.min(20, m * 0.8));
    // a phone held sideways: its margin is the notch's, so the lane keeps near the words
    const safe = parseFloat(cs.getPropertyValue('--safe-l')) || 0;
    const laneL = Math.max(m / 2, Math.min(m - vanW / 2 - 2, safe + vanW / 2));
    const laneR = W - laneL;

    // where the road sets out: under the engraving on the front page, under
    // the date line elsewhere; where it arrives: the foot
    const band = main.querySelector('[data-gl="band"]');
    const dl = main.querySelector('.dateline') || document.querySelector('.toolbar');
    const yStart = Math.round((band ? bottom(band) + 14 : (dl ? bottom(dl) + 18 : 120)));
    const foot = document.querySelector('.foot');
    const yEnd = Math.round(foot ? top(foot) + 26 : H - 60);
    if (yEnd - yStart < 200) return null;

    // the page's clear strips: nothing set across the whole width. Case sheets
    // held on the screen in turn (a computer, a tablet) are one block, which
    // the road passes beside, never across; laid one after another (a phone,
    // held either way), the strips between them count
    const held = !state.mobile && !state.short;
    const spans = [];
    for (const el of main.querySelectorAll(held ? `${SOLID}, main .stack` : SOLID)) {
      if (held && !el.matches('.stack') && el.closest('.stack')) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 1 || r.width < 1) continue;
      spans.push([r.top + sy - 10, r.bottom + sy + 10]);
    }
    // and every line of words, whatever holds it (a key's labels are spans)
    const words = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
    const range = document.createRange();
    for (let n = words.nextNode(); n; n = words.nextNode()) {
      if (held && n.parentElement?.closest('.stack')) continue;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) spans.push([r.top + sy - 8, r.bottom + sy + 8]);
    }
    spans.sort((a, b) => a[0] - b[0]);
    const gaps = [];
    let reach = yStart;
    for (const [a, b] of spans) {
      if (b <= reach) continue;
      if (a > reach) gaps.push([reach, a]);
      reach = Math.max(reach, b);
    }
    if (yEnd > reach) gaps.push([reach, yEnd]);

    // the reading line the van keeps to, and the scroll a crossing takes
    const c = Math.round(vh * (state.mobile ? 0.56 : 0.6));
    const L = Math.max(160, Math.min(440, vh * 0.42, M * 0.22));
    const minGap = state.mobile ? 36 : 48;
    const spacing = Math.max(vh * 1.2, 700);

    // Scroll to height, the crossings aside: set out (waiting under the start
    // until the reading line reaches it, or catching up with the line), keep
    // to the line, and arrive at the foot, hurrying over the last half screen
    // if the scroll would end first. Straight lines between its bends (base).
    const g = (s) => (yStart >= c ? Math.max(yStart, s + c) : Math.min(s + c, yStart + 2 * s));
    const R = Math.min(vh * 0.5, M / 3);
    const lack = Math.max(0, yEnd - g(M));
    const ramp = (s) => g(s) + lack * Math.max(0, (s - (M - R)) / R);
    const baseAt = (s) => Math.min(yEnd, ramp(s));
    const solve = (f, y) => { let lo = 0, hi = M; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (f(mid) < y) lo = mid; else hi = mid; } return hi; };
    const bends = new Set([0, M, Math.abs(yStart - c), Math.max(0, M - R), solve(ramp, yEnd)]);
    const base = [...bends].filter((s) => s >= 0 && s <= M).sort((x, y) => x - y).map((s) => [s, baseAt(s)]);

    // choose the crossings: clear strips a good way apart, sides taken in
    // turn, each with the scroll to slow over it and catch up after it
    const crossings = [];
    let lastMid = -Infinity;
    let clearAt = 0;
    for (const [g0, g1] of gaps) {
      const h = g1 - g0;
      if (h < minGap) continue;
      const pad = Math.min(10, h * 0.12);
      const a = g0 + pad, b = g1 - pad;
      const mid = (a + b) / 2;
      if (mid - yStart < vh * 0.3 || mid - lastMid < spacing) continue;
      const sA = solve(baseAt, a), s2 = sA + 2 * L;
      if (sA < clearAt + 30 || s2 > M - 30 || baseAt(s2) < b + 30) continue;
      crossings.push({ a, b, sA, s2 });
      lastMid = mid;
      clearAt = s2;
    }

    // the road: down a lane, across, down the other
    const segs = [];
    let side = 1; // 1: the right-hand lane
    let y = yStart;
    for (const cr of crossings) {
      const x0 = side > 0 ? laneR : laneL, x1 = side > 0 ? laneL : laneR;
      segs.push({ t: 'v', x: x0, y0: y, y1: cr.a });
      segs.push({ t: 'c', x0, x1, y0: cr.a, y1: cr.b });
      y = cr.b;
      side = -side;
    }
    const xEnd = side > 0 ? laneR : laneL;
    segs.push({ t: 'v', x: xEnd, y0: y, y1: yEnd });
    let d = `M${laneR.toFixed(1)} ${yStart}`;
    for (const sg of segs) {
      if (sg.t === 'v') d += `V${sg.y1.toFixed(1)}`;
      else {
        const ym = ((sg.y0 + sg.y1) / 2).toFixed(1);
        d += `C${sg.x0.toFixed(1)} ${ym} ${sg.x1.toFixed(1)} ${ym} ${sg.x1.toFixed(1)} ${sg.y1.toFixed(1)}`;
      }
    }

    // scroll to height with the crossings: the base, but over each crossing
    // the van slows (the whole S in L of scroll) and then catches up with it
    const knots = [];
    let i = 0;
    for (const cr of crossings) {
      for (; i < base.length && base[i][0] < cr.sA; i++) knots.push(base[i]);
      knots.push([cr.sA, cr.a], [cr.sA + L, cr.b], [cr.s2, baseAt(cr.s2)]);
      while (i < base.length && base[i][0] <= cr.s2) i++;
    }
    for (; i < base.length; i++) knots.push(base[i]);
    const dense = crossings.map((cr) => [cr.sA, cr.sA + L]);

    return { W, H, M, vh, c, vanW, segs, knots, dense, d, xEnd, yStart, yEnd, laneR };
  }

  // what the van and the painted road look like at a scroll position
  function pose(b, s) {
    const y = yAtScroll(b.knots, s);
    const p = pointAt(b.segs, y);
    return { y, x: p.x, a: p.a };
  }
  const vanT = (p, s) => `translate(${p.x.toFixed(2)}px, ${(p.y - s).toFixed(2)}px) rotate(${p.a.toFixed(2)}deg)`;

  function keyframes(b) {
    // every knot, and the crossings sampled finely (the road bends there)
    const at = new Set(b.knots.map((k) => Math.round(Math.min(b.M, Math.max(0, k[0])))));
    at.add(0);
    at.add(Math.round(b.M));
    for (const [s0, s1] of b.dense) for (let s = s0; s < s1; s += 5) at.add(Math.round(s));
    const list = [...at].filter((s) => s >= 0 && s <= b.M).sort((x, y) => x - y);
    const k = { van: [], reveal: [], inner: [] };
    for (const s of list) {
      const p = pose(b, s);
      const offset = s / b.M;
      k.van.push({ offset, transform: vanT(p, s) });
      k.reveal.push({ offset, transform: `translateY(${(p.y - b.H).toFixed(2)}px)` });
      k.inner.push({ offset, transform: `translateY(${(b.H - p.y).toFixed(2)}px)` });
    }
    return k;
  }

  function build() {
    built = layout();
    road.hidden = !built;
    van.hidden = !built;
    if (!built) return;
    const b = built;
    road.style.width = `${b.W}px`;
    road.style.height = `${b.H}px`;
    for (const el of [ahead, done]) {
      el.setAttribute('width', b.W);
      el.setAttribute('height', b.H);
      el.setAttribute('viewBox', `0 0 ${b.W} ${b.H}`);
    }
    aheadPath.setAttribute('d', b.d);
    casing.setAttribute('d', b.d);
    line.setAttribute('d', b.d);
    start.setAttribute('cx', b.laneR.toFixed(1));
    start.setAttribute('cy', b.yStart);
    start.setAttribute('r', state.mobile ? 3.5 : 4.5);
    for (const [el, r] of [[end, state.mobile ? 6 : 7.5], [endDot, state.mobile ? 2 : 2.6]]) {
      el.setAttribute('cx', b.xEnd.toFixed(1));
      el.setAttribute('cy', b.yEnd);
      el.setAttribute('r', r);
    }
    van.style.setProperty('--van-w', `${b.vanW.toFixed(1)}px`);
    road.classList.toggle('road--narrow', state.mobile);
    if (timeline) {
      const k = keyframes(b);
      if (!anims) {
        const opts = { timeline, fill: 'both', easing: 'linear' };
        anims = [van.animate(k.van, opts), reveal.animate(k.reveal, opts), inner.animate(k.inner, opts)];
      } else {
        anims[0].effect.setKeyframes(k.van);
        anims[1].effect.setKeyframes(k.reveal);
        anims[2].effect.setKeyframes(k.inner);
      }
    } else {
      lastS = -1;
      update();
    }
    van.classList.add('is-on');
  }

  // Without a ScrollTimeline the one clock moves them (called in the tick's
  // write phase); with one, the browser does, and this does nothing.
  function update() {
    if (anims || !built) return;
    const s = Math.max(0, Math.min(built.M, state.scroll));
    if (s === lastS) return;
    lastS = s;
    const p = pose(built, s);
    van.style.transform = vanT(p, s);
    reveal.style.transform = `translateY(${(p.y - built.H).toFixed(2)}px)`;
    inner.style.transform = `translateY(${(built.H - p.y).toFixed(2)}px)`;
  }

  // laid out again whenever the page changes its size or its words
  let call = null;
  const soon = () => { call?.kill(); call = gsap.delayedCall(0.15, build); };
  new ResizeObserver(soon).observe(document.body);
  for (const e of ['refit', 'lang', 'resize', 'edition', 'still']) bus.on(e, soon);
  build();
  return { update, build };
}
