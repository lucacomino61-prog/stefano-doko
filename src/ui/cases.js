// The case sheets. On wide screens each sheet is laid down and held while it
// is read: the brayer inks the name, the plates develop from proof to colour,
// the lettered callouts are drawn out to their details, and the facts are
// dealt onto the sheet. Then the next sheet is laid over it, and the read
// one fades toward the paper.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { state, bus, clamp } from '../state.js';
import { judder, sound } from './press.js';

// Callout anchors, measured on the screenshots: x, y from the top-left of
// the picture (0..1), and which side the rule leaves by.
const ANCHORS = {
  'elixir-desktop': [[0.585, 0.018, 1], [0.72, 0.071, 1], [0.722, 0.13, 1], [0.28, 0.345, 1], [0.205, 0.566, 1]],
  'elixir-phone': [[0.5, 0.952, -1], [0.14, 0.524, -1]],
  'martiri-desktop': [[0.896, 0.049, 1], [0.668, 0.4, 1], [0.483, 0.778, 1], [0.6, 0.951, 1]],
  'martiri-phone': [[0.88, 0.853, -1], [0.3, 0.72, -1]],
};
const LETTERS = 'ABCDEFGH';

const seg = (v, a, b) => clamp((v - a) / (b - a));

export function initCases(stage) {
  const cases = [...document.querySelectorAll('[data-case]')];
  const all = [];
  cases.forEach((caseEl) => {
    const key = caseEl.id;
    const body = caseEl.querySelector('.case__body');
    const svg = caseEl.querySelector('[data-callouts]');
    const nextSheet = caseEl.nextElementSibling?.nextElementSibling || null;
    const figures = [...caseEl.querySelectorAll('[data-plate]')];
    const plates = figures.map((fig) => {
      const anchors = ANCHORS[fig.dataset.plate] || [];
      const pl = stage ? stage.addPlate(fig, anchors, nextSheet) : { develop: 0, leader: 0, figure: fig };
      pl.anchors = anchors;
      pl.fig = fig;
      return pl;
    });
    const facts = [...caseEl.querySelectorAll('.fact')];
    const labelsKey = `${key}Callouts`;

    // labels
    const labels = [];
    let n = 0;
    plates.forEach((pl) => pl.anchors.forEach((a) => {
      const el = document.createElement('span');
      el.className = 'callout';
      el.innerHTML = `<b>${LETTERS[n]}</b><span></span>`;
      el.dataset.idx = String(n);
      body.appendChild(el);
      labels.push({ el, pl, a, n });
      n++;
    }));
    const paintLabels = () => labels.forEach((l) => { l.el.lastChild.textContent = state.T[labelsKey][l.n] || ''; });
    paintLabels();

    const leaders = labels.map(() => {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      svg.appendChild(p);
      return p;
    });

    // lay the labels out beside their details and draw the rules to them
    function layout() {
      if (state.mobile) {
        labels.forEach((l) => { l.el.style.left = ''; l.el.style.top = ''; });
        return;
      }
      const br = body.getBoundingClientRect();
      const wide = plates[0].fig.querySelector('img').getBoundingClientRect();
      const tall = plates[1]?.fig.querySelector('img').getBoundingClientRect();
      const colL = wide.right + 26 - br.left, colR = (tall ? tall.left - br.left : br.width) - 26;
      // one column holds every label, so they queue in one line down it
      labels.forEach((l) => {
        const img = l.pl.fig.querySelector('img').getBoundingClientRect();
        l.ay = img.top - br.top + l.a[1] * img.height;
        l.ax = (l.a[2] > 0 ? img.right : img.left) - br.left;
      });
      const sorted = [...labels].sort((a, b) => a.ay - b.ay);
      let last = -Infinity;
      sorted.forEach((l) => { l.y = Math.max(l.ay, last + 32); last = l.y; });
      const over = last - (br.height - 16);
      if (over > 0) {
        let floor = br.height - 16;
        for (let i = sorted.length - 1; i >= 0; i--) { sorted[i].y = Math.min(sorted[i].y, floor); floor = sorted[i].y - 32; }
      }
      labels.forEach((l, i) => {
        const h = l.el.offsetHeight || 20, w = l.el.offsetWidth || 120;
        const right = l.a[2] < 0;
        const x = right ? colR - w : colL;
        l.el.style.left = `${x}px`;
        l.el.style.top = `${l.y - h / 2}px`;
        const x1 = right ? x + w + 4 : x - 4;
        const mid = l.ax + (right ? -12 : 12);
        leaders[i].setAttribute('d', `M${l.ax.toFixed(1)} ${l.ay.toFixed(1)}H${mid.toFixed(1)}L${(x1 + (right ? 10 : -10)).toFixed(1)} ${l.y.toFixed(1)}H${x1.toFixed(1)}`);
      });
      leaders.forEach((p) => { const len = p.getTotalLength(); p.style.strokeDasharray = `${len}`; p.dataset.len = String(len); });
      apply(lastP);
    }

    let lastP = state.reduced ? 1 : 0;
    let dealt = false;
    // write a style only when its value actually changes
    const written = new WeakMap();
    const put = (el, prop, value) => {
      let w = written.get(el);
      if (!w) { w = {}; written.set(el, w); }
      if (w[prop] === value) return;
      w[prop] = value;
      el.style[prop] = value;
    };
    function apply(p) {
      lastP = p;
      const dev0 = seg(p, 0.08, 0.42), dev1 = seg(p, 0.18, 0.55);
      if (plates[0]) plates[0].develop = dev0;
      if (plates[1]) plates[1].develop = dev1;
      const lead = seg(p, 0.36, 0.78);
      plates.forEach((pl) => { pl.leader = lead; });
      const outer = seg(lead, 0.55, 1);
      leaders.forEach((path, i) => {
        const len = +path.dataset.len || 0;
        const k = clamp(outer * 1.25 - i * 0.05);
        put(path, 'strokeDashoffset', (len * (1 - k)).toFixed(1));
        put(labels[i].el, 'opacity', seg(k, 0.6, 1).toFixed(3));
      });
      const d = seg(p, 0.5, 0.86);
      facts.forEach((f, i) => {
        const k = seg(d, i * 0.22, i * 0.22 + 0.5);
        const e = 1 - Math.pow(1 - k, 3);
        put(f, 'transform', `translate(${((1 - e) * 340).toFixed(1)}px, ${((1 - e) * -160).toFixed(1)}px) rotate(${((1 - e) * 24).toFixed(2)}deg)`);
        put(f, 'opacity', Math.min(1, k * 3).toFixed(3));
      });
      if (d > 0.3 && !dealt) { dealt = true; sound.paper(); }
      if (d < 0.05) dealt = false;
    }

    if (!state.mobile && !state.reduced) {
      const dwell = caseEl.nextElementSibling;
      ScrollTrigger.create({
        trigger: dwell,
        start: 'top bottom',
        end: 'bottom bottom',
        onUpdate: (st) => { state.dwell[key] = st.progress; apply(st.progress); },
        onEnter: () => { judder(caseEl.querySelector('.case__sheet'), 1.2); sound.press(); },
        onLeaveBack: () => { state.dwell[key] = 0; apply(0); },
      });
      // the read sheet fades toward the paper as the next one is laid over it
      if (nextSheet) {
        const sheet = caseEl.querySelector('.case__sheet');
        const veil = document.createElement('span');
        veil.className = 'case__veil';
        veil.setAttribute('aria-hidden', 'true');
        sheet.appendChild(veil);
        let lastVeil = '';
        ScrollTrigger.create({
          trigger: nextSheet,
          start: 'top bottom',
          end: 'top top',
          onUpdate: (st) => {
            const v = (st.progress * 0.62).toFixed(3);
            if (v !== lastVeil) { lastVeil = v; veil.style.opacity = v; }
          },
        });
      }
    } else if (!state.reduced) {
      // phones: each plate develops as it passes through the view
      plates.forEach((pl) => {
        ScrollTrigger.create({
          trigger: pl.fig,
          start: 'top 85%',
          end: 'bottom 45%',
          onUpdate: (st) => { pl.develop = clamp(st.progress * 1.4); pl.leader = 0; },
        });
      });
      gsap.fromTo(facts, { x: 120, rotation: 12, opacity: 0 }, { x: 0, rotation: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: caseEl.querySelector('.facts'), start: 'top 85%' } });
    } else {
      plates.forEach((pl) => { pl.develop = 1; pl.leader = 1; });
      apply(1);
    }

    // plates load their textures shortly before they are needed
    plates.forEach((pl) => {
      if (!pl.load) return;
      new IntersectionObserver(([e], io) => { if (e.isIntersecting) { pl.load(); io.disconnect(); } }, { rootMargin: '1200px 0px' }).observe(pl.fig);
    });

    all.push({ layout, paintLabels });
  });

  const relayout = () => gsap.delayedCall(0.02, () => all.forEach((c) => c.layout()));
  bus.on('lang', () => { all.forEach((c) => c.paintLabels()); relayout(); });
  bus.on('refit', relayout);
  bus.on('resize', relayout);
  ScrollTrigger.addEventListener('refresh', () => all.forEach((c) => c.layout()));
  relayout();
}
