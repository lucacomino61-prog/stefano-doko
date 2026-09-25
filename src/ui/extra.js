// The Extra sheet: the address to write to, a button that copies it, the
// turning stamp, and a headline that slips in three slices when you drag
// the pointer across it, like a sheet that moved under the platen.
import gsap from 'gsap';
import { state, bus } from '../state.js';
import { judder, sound } from './press.js';

// A copy of this sheet is drawn once under the intro, so the GPU has seen it
// before the reader does (warm.js).
export function initExtra() {
  const sheet = document.querySelector('.sheet--extra');
  if (!sheet) return () => {};
  const copyBtn = sheet.querySelector('[data-copy]');
  const copyLabel = sheet.querySelector('[data-copy-label]');
  const status = sheet.querySelector('[data-copy-status]');
  const email = (document.querySelector('[data-mail]')?.getAttribute('href') || '').replace(/^mailto:/, '');
  let revert = null;

  copyBtn?.addEventListener('click', async () => {
    judder(copyBtn);
    sound.press();
    let ok = false;
    try { await navigator.clipboard.writeText(email); ok = true; } catch { ok = false; }
    if (!ok) {
      const mail = sheet.querySelector('.extra__mail');
      const range = document.createRange();
      range.selectNodeContents(mail);
      const sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);
    }
    const msg = ok ? state.T.copied : state.T.copyFail;
    copyLabel.textContent = msg;
    status.textContent = msg;
    revert?.kill();
    revert = gsap.delayedCall(2.6, () => { copyLabel.textContent = state.T.copy; status.textContent = ''; });
  });

  // The stamp's two phrases follow the language, and are set to fit their half
  // of the ring between its two stars: at the sheet's size "Shkruaji Stefanos"
  // ran half a word into them. Both phrases take the smaller of the two fits.
  const paintBadge = () => {
    const paths = [...sheet.querySelectorAll('[data-badge]')];
    paths.forEach((t) => { t.textContent = state.T.badge[+t.dataset.badge]; t.parentElement.style.fontSize = ''; });
    let k = 1;
    for (const t of paths) {
      const arc = sheet.querySelector(t.getAttribute('href'))?.getTotalLength() || 0;
      const len = t.parentElement.getComputedTextLength();
      if (arc && len) k = Math.min(k, (arc * 0.8) / len);
    }
    if (k < 1) {
      paths.forEach((t) => {
        const size = parseFloat(getComputedStyle(t.parentElement).fontSize);
        t.parentElement.style.fontSize = `${(size * k).toFixed(2)}px`;
      });
    }
  };
  paintBadge();
  bus.on('lang', paintBadge);

  // sliced headline
  const head = sheet.querySelector('.extra__head');
  let slices = [];
  const setup = () => {
    const lines = [...head.querySelectorAll(':scope > .fit-line')];
    if (!lines.length) return;
    const s1 = document.createElement('span');
    s1.className = 'slice slice--1';
    lines.forEach((l) => s1.appendChild(l));
    const clone = (n) => { const s = s1.cloneNode(true); s.className = `slice slice--${n}`; s.setAttribute('aria-hidden', 'true'); s.querySelectorAll('.ink__fill').forEach((f) => f.removeAttribute('id')); return s; };
    const s2 = clone(2), s3 = clone(3);
    head.replaceChildren(s1, s2, s3);
    slices = [s1, s2, s3];
  };
  setup();
  bus.on('refit', setup);

  let off = 0, target = 0, active = false;
  if (state.fine && !state.reduced) {
    head.addEventListener('pointermove', (e) => { target = Math.max(-60, Math.min(60, target + e.movementX * 0.9)); });
  }
  // The stamp turns on the compositor, 7 degrees a second, faster with a fast
  // scroll. Written from here every frame, its transform cost a full
  // compositor update on every frame the sheet was on screen (a phone at a
  // quarter speed dropped every other frame there); now the scroll's pace sets
  // the animation's rate, and only when it changes by a step.
  const ring = sheet.querySelector('.badge__ring');
  const spin = ring.animate?.([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: (360 / 7) * 1000, iterations: Infinity }) || null;
  spin?.pause();
  let rate = 1;
  let visible = false;
  const turn = () => { if (!spin) return; if (visible && !state.reduced) spin.play(); else spin.pause(); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; turn(); }, { rootMargin: '80px' }).observe(sheet);
  bus.on('still', turn);

  return function update(dt) {
    if (!visible) return;
    if (spin && !state.reduced) {
      const want = Math.round((1 + Math.min(120, Math.abs(state.velocity) * 4) / 7) * 2) / 2;
      if (want !== rate) { rate = want; spin.updatePlaybackRate(rate); }
    }
    target *= Math.pow(0.02, dt);
    off += (target - off) * Math.min(1, dt * 14);
    const on = Math.abs(off) > 0.4;
    const was = active;
    if (on !== active) {
      active = on;
      head.classList.toggle('is-sliced', on);
    }
    // the slices are written only while they slip, and once to put them back
    if (slices.length === 3 && (on || was)) {
      slices[0].style.transform = on ? `translateX(${(-off * 0.55).toFixed(2)}px)` : '';
      slices[1].style.transform = on ? `translateX(${(off * 0.35).toFixed(2)}px)` : '';
      slices[2].style.transform = on ? `translateX(${off.toFixed(2)}px)` : '';
    }
  };
}
