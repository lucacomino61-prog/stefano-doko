// The next edition. Past the foot of the sheet the front page is set again,
// and when it reaches the top the reader is carried back to the real one,
// so the broadside runs on without a seam.
import { state, bus } from '../state.js';

export function initEdition() {
  const slot = document.querySelector('[data-edition]');
  if (!slot || state.reduced) { slot?.remove(); return null; }
  const build = () => {
    const parts = ['[data-toolbar]', '.dateline', '.mast', '[data-gl="band"]'].map((s) => document.querySelector(s)?.cloneNode(true)).filter(Boolean);
    parts.forEach((p) => {
      p.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      p.removeAttribute('id');
      p.querySelectorAll('.proof-note, figcaption').forEach((el) => el.remove());
      p.querySelectorAll('a, button, input').forEach((el) => el.setAttribute('tabindex', '-1'));
      p.querySelectorAll('[data-clock]').forEach((el) => el.setAttribute('data-clock', ''));
    });
    slot.replaceChildren(...parts);
    slot.style.minHeight = `${state.vh + 40}px`;
    bus.emit('edition', slot);
  };
  build();
  bus.on('refit', build);
  bus.on('lang', build);
  return slot;
}

export function editionMeasure(slot) {
  return slot ? slot.getBoundingClientRect().top : Infinity;
}

// Returns true when it carried the reader back to the top this frame.
export function editionUpdate(slot, lenis, top) {
  if (!slot || !lenis || !state.introDone) return false;
  if (top <= 0 && state.velocity >= 0) {
    lenis.scrollTo(Math.max(0, -top), { immediate: true, force: true });
    return true;
  }
  return false;
}
