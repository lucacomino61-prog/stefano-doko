// The proofs (two per live site, one of the preview in the middle), dealt from
// a pile into a fan as the sheet arrives. Under a fine pointer the fan spreads
// apart so any one can be picked up. On a phone one proof at a time is at the
// front, upright and larger, with the rest fanned behind it: drag the fan
// sideways and it follows the finger, a quick flick deals the next proof
// forward, the ends give a little instead of stopping dead, a tap on the front
// proof opens its sheet and a tap on one behind brings it forward. The two
// hands under the fan do the same for anyone who does not swipe.
import gsap from 'gsap';
import { state, clamp } from '../state.js';
import { sound } from './press.js';

export function initFan() {
  const fan = document.querySelector('[data-fan]');
  if (!fan) return;
  const cards = [...fan.querySelectorAll('.fan__card')];
  const n = cards.length;
  const deck = state.mobile && n > 1;
  const front = { f: (n - 1) / 2 }; // which proof is at the front; fractional while it moves
  let w = fan.clientWidth;

  const arch = () => cards.map((_, i) => {
    const k = (i - (n - 1) / 2) / ((n - 1) / 2); // -1..1
    return { x: k * w * (state.mobile ? 0.3 : 0.285), y: Math.abs(k) * (state.mobile ? 26 : 40), rot: k * (state.mobile ? 11 : 13), s: 1, z: i + 1 };
  });
  const spread = () => cards.map((_, i) => {
    const d = i - front.f;
    const a = Math.abs(d);
    return {
      x: d * w * 0.25,
      y: Math.pow(a, 1.3) * 16,
      rot: clamp(d * 9, -26, 26),
      s: 1.22 - Math.min(a, 1) * 0.22 - clamp(a - 1, 0, 1) * 0.06,
      z: 100 - Math.round(a * 10),
    };
  });

  // Each card's transform is written whole, and only when it changed. The
  // paper is a sheet inside the card (style.css), so restyling the card every
  // frame does not repaint it; the hover's lift is the separate translate property.
  const shown = cards.map(() => ({ t: '', z: '' }));
  const apply = (hover = -1, p = 1) => {
    const spots = deck ? spread() : arch();
    cards.forEach((c, i) => {
      const s = spots[i];
      let dx = 0;
      if (hover >= 0 && i !== hover) dx = (i < hover ? -1 : 1) * 46;
      const x = (s.x * p + dx).toFixed(1);
      const y = (s.y * p + (1 - p) * 60).toFixed(1);
      const rot = (s.rot * p + (1 - p) * (i % 2 ? 4 : -3)).toFixed(2);
      const sc = (1 + (s.s - 1) * p).toFixed(3);
      const t = `translate(calc(-50% + ${x}px), ${y}px) rotate(${rot}deg) scale(${sc})`;
      if (t !== shown[i].t) { shown[i].t = t; c.style.transform = t; }
      // the deck orders the pile itself; the arch keeps page order, so a hover can lift a card
      if (deck && String(s.z) !== shown[i].z) { shown[i].z = String(s.z); c.style.zIndex = shown[i].z; }
    });
  };

  const deal = { p: state.reduced ? 1 : 0 };
  apply(-1, deal.p);
  if (state.reduced) fan.classList.add('is-dealt');
  if (!state.reduced) {
    // A finger's scroll already glides on its own: smoothing the deal on top
    // of it left the proofs trailing the page on a phone, so there they
    // follow the scroll as it is. The wheel's scroll gets the smoothing.
    gsap.to(deal, {
      p: 1,
      ease: 'none',
      scrollTrigger: { trigger: fan, start: 'top 92%', end: 'top 38%', scrub: state.fine ? 0.6 : true },
      onUpdate: () => { apply(-1, deal.p); fan.classList.toggle('is-dealt', deal.p > 0.98); },
    });
  }
  if (state.fine && !deck) {
    cards.forEach((c, i) => {
      c.addEventListener('pointerenter', () => { if (deal.p > 0.95) apply(i, 1); });
      c.addEventListener('pointerleave', () => { if (deal.p > 0.95) apply(-1, 1); });
    });
  }
  window.addEventListener('resize', () => { w = fan.clientWidth; apply(-1, deal.p); });
  if (deck) initDeck();

  function initDeck() {
    fan.classList.add('fan--deck');
    const nav = document.querySelector('[data-fan-nav]');
    const count = nav?.querySelector('[data-fan-count]');
    if (nav) nav.hidden = false;
    let shown = -1;
    const paintCount = () => {
      const i = Math.round(clamp(front.f, 0, n - 1));
      if (i === shown) return;
      shown = i;
      if (count) count.textContent = `${i + 1} / ${n}`;
    };
    const show = () => { apply(-1, deal.p); paintCount(); };
    paintCount();

    let tween = null;
    const go = (i) => {
      const to = clamp(Math.round(i), 0, n - 1);
      tween?.kill();
      if (to !== shown) sound.paper();
      if (state.reduced) { front.f = to; show(); return; }
      tween = gsap.to(front, { f: to, duration: 0.42, ease: 'power3.out', onUpdate: show });
    };
    nav?.querySelectorAll('[data-fan-step]').forEach((b) => b.addEventListener('click', () => go(Math.round(front.f) + Number(b.dataset.fanStep))));

    // the fan follows the finger sideways; up and down stay the page's scroll
    let drag = null;
    let swallowClick = false;
    fan.addEventListener('pointerdown', (e) => {
      // a new touch is a new choice (a finger's drag is followed by no click to swallow)
      swallowClick = false;
      if (drag || e.button > 0) return; // one finger at a time
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, f0: front.f, on: false, trail: [[e.timeStamp, e.clientX]] };
    });
    fan.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0;
      if (!drag.on) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(e.clientY - drag.y0)) return;
        drag.on = true;
        tween?.kill();
        fan.setPointerCapture(e.pointerId);
        fan.classList.add('is-dragging');
      }
      let f = drag.f0 - dx / (w * 0.25);
      // past either end the fan gives, less the further it is pulled
      if (f < 0) f = -(1 - 1 / (1 + -f * 0.9)) * 0.55;
      else if (f > n - 1) f = n - 1 + (1 - 1 / (1 + (f - n + 1) * 0.9)) * 0.55;
      front.f = f;
      drag.trail.push([e.timeStamp, e.clientX]);
      if (drag.trail.length > 6) drag.trail.shift();
      show();
    });
    const release = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      fan.classList.remove('is-dragging');
      if (!d.on) return;
      swallowClick = true;
      // a quick flick deals the next proof even when the drag was short
      const [t0, x0] = d.trail[0];
      const v = (e.clientX - x0) / Math.max(1, e.timeStamp - t0); // px per ms
      let to = Math.round(front.f);
      if (Math.abs(v) > 0.11) {
        to = v < 0 ? Math.ceil(front.f - 0.05) : Math.floor(front.f + 0.05);
        if (v < 0 && to <= Math.round(d.f0)) to = Math.round(d.f0) + 1;
        if (v > 0 && to >= Math.round(d.f0)) to = Math.round(d.f0) - 1;
      }
      go(to);
    };
    fan.addEventListener('pointerup', release);
    fan.addEventListener('pointercancel', release);

    // a tap on the front proof opens its sheet; a tap on one behind brings it forward
    fan.addEventListener('click', (e) => {
      if (swallowClick) { swallowClick = false; e.preventDefault(); e.stopPropagation(); return; }
      const card = e.target.closest('.fan__card');
      if (!card || e.detail === 0) return; // the keyboard opens what it chose
      const i = cards.indexOf(card);
      if (i !== Math.round(front.f)) { e.preventDefault(); e.stopPropagation(); go(i); }
    }, true);
    // tabbing to a proof brings it to the front
    fan.addEventListener('focusin', (e) => {
      const i = cards.indexOf(e.target.closest('.fan__card'));
      if (i >= 0 && i !== Math.round(front.f)) go(i);
    });
  }
}
