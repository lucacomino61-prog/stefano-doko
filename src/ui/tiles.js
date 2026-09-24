// Re-setting the sheet in another language. The compartments of a type case
// drop over the page, black plate and red plate a hair out of register; the
// words are swapped underneath; the case lifts away.
import gsap from 'gsap';
import { state } from '../state.js';

let built = false;
let cols = 0, rows = 0;
let busy = false;

function build(root) {
  cols = state.mobile ? 5 : 10;
  rows = state.mobile ? 9 : 6;
  root.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  root.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < cols * rows; i++) {
    const t = document.createElement('div');
    t.className = 'tile';
    t.append(document.createElement('i'), document.createElement('b'));
    frag.appendChild(t);
  }
  root.replaceChildren(frag);
  built = true;
}

export function resetTiles(root) { built = false; if (root) build(root); }

export function playTiles(root, swap) {
  if (busy) return Promise.resolve();
  if (state.reduced) { swap(); return Promise.resolve(); }
  if (!built) build(root);
  busy = true;
  const tiles = [...root.children];
  const red = tiles.map((t) => t.firstChild);
  const ink = tiles.map((t) => t.lastChild);
  const order = (i) => { const x = i % cols, y = Math.floor(i / cols); return (x + y) * 0.022; };
  return new Promise((resolve) => {
    gsap.timeline({ onComplete: () => { busy = false; resolve(); } })
      .set([...red, ...ink], { transformOrigin: '50% 0%' })
      .to(red, { scaleY: 1, duration: 0.22, ease: 'power3.out', delay: (i) => order(i) }, 0)
      .to(ink, { scaleY: 1, duration: 0.24, ease: 'power3.out', delay: (i) => order(i) + 0.03 }, 0)
      .add(() => swap(), '>-0.02')
      .set([...red, ...ink], { transformOrigin: '50% 100%' })
      .to(ink, { scaleY: 0, duration: 0.24, ease: 'power3.inOut', delay: (i) => order(i) }, '+=0.05')
      .to(red, { scaleY: 0, duration: 0.22, ease: 'power3.inOut', delay: (i) => order(i) + 0.03 }, '<');
  });
}
