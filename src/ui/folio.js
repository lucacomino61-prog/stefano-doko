// The case editions. Each figure is a plate of the live site with its key
// beside it: the plate prints as an engraving and develops into colour as it
// comes up the sheet, then the lettered rings are drawn beside the details
// and the rules run out to the key. Where each ring sits was worked out on
// the live pages when the screenshots were taken: just outside its detail,
// on the side facing the key, at a height where the rule crosses nothing
// (tools/shoot-work.mjs, src/data/plates.json, both sides for every plate).
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import gsap from 'gsap';
import { state, bus, clamp } from '../state.js';
import PLATES from '../data/plates.json';

const seg = (v, a, b) => clamp((v - a) / (b - a));
const LETTERS = 'ABCDEFGH';
// up to 1100px wide the key is a lettered list under its plate: no rules,
// the letters are pinned on the plate instead
const compact = () => window.matchMedia('(max-width: 1100px)').matches;

export function initFolio(stage) {
  const figs = [...document.querySelectorAll('[data-folio]')];
  if (!figs.length) return;
  const all = figs.map((el) => {
    const plateEl = el.querySelector('[data-plate]');
    const name = plateEl.dataset.plate;
    const side = el.classList.contains('folio--flip') ? -1 : 1;
    const set = PLATES[name] || {};
    const pts = (side > 0 ? set.r : set.l) || [];
    const anchors = pts.map(([x, y]) => [x, y, side]);
    // the way from each detail out to its ring, and the width the shot was taken at
    const outs = pts.map(([, , dx = 0, dy = 0]) => [dx, dy]);
    const shotW = set.view === 'phone' ? 390 : 1440;
    const pl = stage ? stage.addPlate(plateEl, anchors, null) : { develop: 1, leader: 1 };
    const labels = [...el.querySelectorAll('.folio__key .callout')];
    labels.forEach((l, i) => { l.querySelector('b').textContent = LETTERS[i]; });
    const svg = el.querySelector('.callouts');
    const leaders = labels.map(() => {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      svg.appendChild(p);
      return p;
    });
    // the pins sit in the figure, not in the plate's mount: the mount's
    // clip-path would hold them under the stage canvas
    const pins = labels.map((_, i) => {
      const pin = document.createElement('span');
      pin.className = 'folio__pin';
      pin.setAttribute('aria-hidden', 'true');
      pin.textContent = LETTERS[i];
      el.appendChild(pin);
      return pin;
    });
    return { el, plateEl, img: plateEl.querySelector('img'), pl, anchors, outs, shotW, labels, leaders, pins, side, lastP: state.reduced ? 1 : 0 };
  });

  // write a style only when its value changes
  const written = new WeakMap();
  const put = (el, prop, value) => {
    let w = written.get(el);
    if (!w) { w = {}; written.set(el, w); }
    if (w[prop] === value) return;
    w[prop] = value;
    el.style[prop] = value;
  };

  function apply(f, p) {
    f.lastP = p;
    f.pl.develop = seg(p, 0, 0.55);
    const narrow = compact();
    const lead = narrow ? 0 : seg(p, 0.45, 0.9);
    f.pl.leader = lead;
    f.leaders.forEach((path, i) => {
      const len = +path.dataset.len || 0;
      const k = clamp(lead * 1.25 - i * 0.06);
      put(path, 'strokeDashoffset', (len * (1 - k)).toFixed(1));
      if (!narrow) put(f.labels[i], 'opacity', seg(k, 0.55, 1).toFixed(3));
    });
  }

  // the key: one column beside the plate, each label level with its detail
  function layout(f) {
    const box = f.el.getBoundingClientRect();
    const img = f.img.getBoundingClientRect();
    if (compact()) {
      f.labels.forEach((l) => { l.style.left = ''; l.style.top = ''; l.style.opacity = ''; });
      f.leaders.forEach((p) => p.setAttribute('d', ''));
      // a ring was placed for 11px of the shot; a desktop shot shrunk onto a
      // phone makes the pinned letter several times that, so the pin steps
      // out from its detail by the difference and its inner edge stays where
      // the ring's was
      const scale = img.width / f.shotW;
      f.pins.forEach((pin, i) => {
        const a = f.anchors[i] || [0.5, 0.5];
        const [dx, dy] = f.outs[i] || [0, 0];
        const push = Math.max(0, (pin.offsetWidth || 16) / 2 - 11 * scale);
        pin.style.left = `${(img.left - box.left + a[0] * img.width + dx * push).toFixed(1)}px`;
        pin.style.top = `${(img.top - box.top + a[1] * img.height + dy * push).toFixed(1)}px`;
      });
      return;
    }
    const key = f.el.querySelector('.folio__key').getBoundingClientRect();
    f.labels.forEach((l, i) => {
      const a = f.anchors[i] || [0.5, 0.5, f.side];
      l.ay = img.top - box.top + a[1] * img.height;
      l.ax = (f.side > 0 ? img.right : img.left) - box.left;
    });
    const sorted = [...f.labels].sort((a, b) => a.ay - b.ay);
    let last = -Infinity;
    sorted.forEach((l) => { l.y = Math.max(l.ay, last + 34); last = l.y; });
    const floor0 = box.height - 16;
    if (last > floor0) {
      let floor = floor0;
      for (let i = sorted.length - 1; i >= 0; i--) { sorted[i].y = Math.min(sorted[i].y, floor); floor = sorted[i].y - 34; }
    }
    f.labels.forEach((l, i) => {
      const h = l.offsetHeight || 20, w = l.offsetWidth || 140;
      const x = f.side > 0 ? key.left - box.left : key.right - box.left - w;
      l.style.left = `${x}px`;
      l.style.top = `${l.y - h / 2}px`;
      const x1 = f.side > 0 ? x - 4 : x + w + 4;
      const mid = l.ax + f.side * 12;
      f.leaders[i].setAttribute('d', `M${l.ax.toFixed(1)} ${l.ay.toFixed(1)}H${mid.toFixed(1)}L${(x1 - f.side * 10).toFixed(1)} ${l.y.toFixed(1)}H${x1.toFixed(1)}`);
    });
    f.leaders.forEach((p) => { const len = p.getTotalLength(); p.style.strokeDasharray = `${len}`; p.dataset.len = String(len); });
    apply(f, f.lastP);
  }

  all.forEach((f) => {
    if (state.reduced) { apply(f, 1); return; }
    ScrollTrigger.create({
      trigger: f.plateEl,
      start: 'top 82%',
      end: compact() ? 'bottom 60%' : 'center 42%',
      onUpdate: (st) => apply(f, st.progress),
      onLeaveBack: () => apply(f, 0),
    });
    // the screenshot texture is loaded shortly before the plate is needed
    if (f.pl.load) {
      new IntersectionObserver(([e], io) => { if (e.isIntersecting) { f.pl.load(); io.disconnect(); } }, { rootMargin: '1200px 0px' }).observe(f.el);
    }
  });

  const relayout = () => gsap.delayedCall(0.02, () => all.forEach(layout));
  bus.on('lang', relayout);
  bus.on('refit', relayout);
  bus.on('resize', relayout);
  ScrollTrigger.addEventListener('refresh', () => all.forEach(layout));
  if (document.fonts?.ready) document.fonts.ready.then(relayout);
  relayout();
}
