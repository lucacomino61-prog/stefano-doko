// PRINT and PROOF. Flipping the sheet shows its marked-up proof: the type
// uninked, the baseline grid, the draft that was struck out, and notes in red
// pencil on why the page is made the way it is. The colours cross-fade as
// registered custom properties; the notes draw themselves in.
import gsap from 'gsap';
import { state, bus } from '../state.js';

const ARROW = 'M4 26C10 14 20 7 34 5M34 5 26 2M34 5 29 11';

export function initProof() {
  const notes = [...document.querySelectorAll('[data-note]')];
  notes.forEach((n) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 40 30');
    svg.setAttribute('class', 'proof-arrow');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<path d="${ARROW}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
    n.prepend(svg);
  });

  const paint = () => {
    const P = state.T.proofNotes;
    notes.forEach((n) => { const s = n.querySelector('span'); if (s) s.textContent = P[n.dataset.note] || ''; });
    document.querySelectorAll('[data-note-text]').forEach((el) => { el.textContent = P[el.dataset.noteText] || ''; });
    const price = document.querySelector('.dateline__price');
    if (price) price.textContent = state.proof ? state.T.proofPrice : state.T.price;
  };
  paint();
  bus.on('lang', paint);

  return function set(on) {
    state.proof = on;
    document.documentElement.classList.toggle('is-proof', on);
    paint();
    bus.emit('proof', on);
    if (on && !state.reduced) {
      const paths = document.querySelectorAll('.proof-arrow path');
      gsap.fromTo(paths, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, ease: 'power2.out', stagger: 0.06, delay: 0.25 });
    }
  };
}
