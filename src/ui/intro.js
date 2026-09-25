// Pulling the proof. A counter rolls up with the real loading (fonts, the
// engraving being cut), then the stamp opens onto the sheet like a ring and
// the brayer inks the masthead.
import gsap from 'gsap';
import { state } from '../state.js';
import { introInk } from './ink.js';
import { sound, judder } from './press.js';

export function createIntro() {
  const el = document.querySelector('.intro');
  const odo = el?.querySelector('[data-odo]');
  let target = 0, shown = 0, finishing = false, resolveDone;
  const done = new Promise((r) => { resolveDone = r; });
  const opening = [];
  // the proof is pulled once a visit: coming back to the front page from
  // another sheet goes straight to the sheet
  let pulled = false;
  try { pulled = sessionStorage.getItem('sd-proof-pulled') === '1'; } catch { /* storage blocked */ }

  if (!el || state.reduced || pulled) {
    el?.remove();
    // no counter on this sheet (or already seen): the head still takes its ink
    // as the sheet opens, unless motion is reduced
    if (state.reduced) introInk.u = 1;
    else { introInk.u = 0; gsap.to(introInk, { u: 1, duration: 1.7, delay: 0.35, ease: 'none' }); }
    state.introDone = true;
    resolveDone();
    return { progress() {}, update() {}, done, finish() {}, covering: () => false, onOpen() {} };
  }

  const cols = [0, 1, 2].map(() => {
    const c = document.createElement('span');
    c.className = 'odo__col';
    for (let d = 0; d <= 10; d++) { const s = document.createElement('span'); s.textContent = String(d % 10); c.appendChild(s); }
    odo.appendChild(c);
    return c;
  });
  const setCol = (c, v) => { c.style.transform = `translateY(${-v}em)`; };
  let lastTick = -1;
  function render(v) {
    const ones = v % 10;
    const roll = ones > 9 ? ones - 9 : 0;
    const tensInt = Math.floor(v / 10) % 10;
    const tens = tensInt + roll;
    const hundreds = Math.floor(v / 100) + (tensInt === 9 ? roll : 0);
    setCol(cols[2], ones);
    setCol(cols[1], tens);
    setCol(cols[0], hundreds);
    cols[0].style.opacity = v >= 99.5 || hundreds > 0.01 ? '1' : '0.28';
    const t = Math.floor(v / 10);
    if (t !== lastTick) { lastTick = t; sound.tick(); }
  }
  render(0);

  const skip = () => { target = 100; shown = Math.max(shown, 99.6); };
  el.addEventListener('click', skip);
  window.addEventListener('keydown', skip, { once: true });

  function finish() {
    if (finishing) return;
    finishing = true;
    // once the stamp opens, the sheet under it is the page: pointer and focus
    // go through (a mask leaves the counter catching the pointer otherwise)
    el.style.pointerEvents = 'none';
    opening.forEach((f) => f());
    const disc = el.querySelector('.intro__disc');
    judder(disc, 1.6);
    sound.press();
    const R = Math.hypot(state.vw, state.vh) * 0.62;
    gsap.timeline({
      onComplete: () => {
        el.remove();
        state.introDone = true;
        try { sessionStorage.setItem('sd-proof-pulled', '1'); } catch { /* storage blocked */ }
        resolveDone();
      },
    })
      .to(disc, { scale: 1.08, duration: 0.18, ease: 'power2.out' }, 0.05)
      .to(el, { '--ring': `${R}px`, duration: 1.05, ease: 'power3.inOut' }, 0.2)
      .to([disc, el.querySelector('.intro__label')], { opacity: 0, duration: 0.3, ease: 'power1.out' }, 0.45)
      .to(introInk, { u: 1, duration: 1.9, ease: 'none' }, 0.55);
  }

  return {
    done,
    finish,
    // true while the counter still covers the whole sheet
    covering: () => !finishing,
    // called as the stamp starts to open, before anything beneath shows
    onOpen(f) { opening.push(f); },
    progress(p) { target = Math.max(target, Math.min(100, p * 100)); },
    update(dt) {
      if (finishing) return;
      const step = Math.max(18 * dt, (target - shown) * Math.min(1, dt * 5));
      shown = Math.min(target, shown + step);
      render(shown);
      if (shown >= 99.99) finish();
    },
  };
}
