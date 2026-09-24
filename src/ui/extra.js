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

  // the stamp's two phrases follow the language
  const paintBadge = () => {
    sheet.querySelectorAll('[data-badge]').forEach((t) => { t.textContent = state.T.badge[+t.dataset.badge]; });
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
  const ring = sheet.querySelector('.badge__ring');
  let rot = 0;
  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '80px' }).observe(sheet);

  return function update(dt) {
    if (!visible) return;
    if (!state.reduced) {
      rot += dt * (7 + Math.min(120, Math.abs(state.velocity) * 4));
      ring.style.transform = `rotate(${rot.toFixed(2)}deg)`;
    }
    target *= Math.pow(0.02, dt);
    off += (target - off) * Math.min(1, dt * 14);
    const on = Math.abs(off) > 0.4;
    if (on !== active) {
      active = on;
      head.classList.toggle('is-sliced', on);
    }
    if (slices.length === 3) {
      slices[0].style.transform = on ? `translateX(${(-off * 0.55).toFixed(2)}px)` : '';
      slices[1].style.transform = on ? `translateX(${(off * 0.35).toFixed(2)}px)` : '';
      slices[2].style.transform = on ? `translateX(${off.toFixed(2)}px)` : '';
    }
  };
}
