// The proofs (two per live site, one of the preview in the middle), dealt from
// a pile into a fan as the sheet arrives, and spread apart under the pointer
// so any one can be picked up.
import gsap from 'gsap';
import { state } from '../state.js';

export function initFan() {
  const fan = document.querySelector('[data-fan]');
  if (!fan) return;
  const cards = [...fan.querySelectorAll('.fan__card')];
  const layout = () => {
    const w = fan.clientWidth;
    const spread = state.mobile ? 0.3 : 0.285;
    return cards.map((_, i) => {
      const k = (i - (cards.length - 1) / 2) / ((cards.length - 1) / 2); // -1..1
      return { x: k * w * spread, y: Math.abs(k) * (state.mobile ? 26 : 40), rot: k * (state.mobile ? 11 : 13) };
    });
  };
  let spots = layout();
  const apply = (hover = -1, p = 1) => {
    cards.forEach((c, i) => {
      const s = spots[i];
      let dx = 0;
      if (hover >= 0 && i !== hover) dx = (i < hover ? -1 : 1) * (state.mobile ? 0 : 46);
      c.style.setProperty('--x', `${(s.x * p + dx).toFixed(1)}px`);
      c.style.setProperty('--y', `${(s.y * p + (1 - p) * 60).toFixed(1)}px`);
      c.style.setProperty('--rot', `${(s.rot * p + (1 - p) * (i % 2 ? 4 : -3)).toFixed(2)}deg`);
    });
  };
  const deal = { p: state.reduced ? 1 : 0 };
  apply(-1, deal.p);
  if (state.reduced) fan.classList.add('is-dealt');
  if (!state.reduced) {
    gsap.to(deal, {
      p: 1,
      ease: 'none',
      scrollTrigger: { trigger: fan, start: 'top 92%', end: 'top 38%', scrub: 0.6 },
      onUpdate: () => { apply(-1, deal.p); fan.classList.toggle('is-dealt', deal.p > 0.98); },
    });
  }
  if (state.fine) {
    cards.forEach((c, i) => {
      c.addEventListener('pointerenter', () => { if (deal.p > 0.95) apply(i, 1); });
      c.addEventListener('pointerleave', () => { if (deal.p > 0.95) apply(-1, 1); });
    });
  }
  window.addEventListener('resize', () => { spots = layout(); apply(-1, deal.p); });
}
