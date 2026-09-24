// Set your own line: whatever is typed is fitted to the measure as it is
// typed, the width axis first and then the size, the way every headline on
// the sheet is set.
import { fitText, ROLES } from './fit.js';
import { state, bus } from '../state.js';

export function initSetline() {
  const input = document.querySelector('[data-setline-in]');
  const out = document.querySelector('[data-setline-out]');
  if (!input || !out) return;
  const role = { ...ROLES.head, max: () => (state.mobile ? 120 : 200), mode: () => 'one' };
  const set = () => {
    const text = input.value.replace(/\s+/g, ' ').trim() || 'Stefano Doko';
    const target = out.clientWidth;
    if (target < 40) return;
    const { size, stretch } = fitText(text, role, target);
    out.style.fontSize = `${size.toFixed(1)}px`;
    out.style.fontStretch = `${stretch.toFixed(1)}%`;
    out.textContent = text;
  };
  input.addEventListener('input', set);
  bus.on('resize', set);
  bus.on('refit', set);
  document.fonts?.ready.then(set);
  set();
}
