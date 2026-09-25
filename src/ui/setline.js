// Set your own line: whatever is typed is fitted to the measure as it is
// typed, the width axis first and then the size, the way every headline on
// the sheet is set. Then the press: the line printed as a poster
// (src/ui/poster.js) to save or to share from the phone.
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { fitText, ROLES } from './fit.js';
import { state, bus } from '../state.js';
import { judder, sound } from './press.js';

const DEFAULT = 'Stefano Doko';
const slug = (t) => t.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'line';

export function initSetline() {
  const input = document.querySelector('[data-setline-in]');
  const out = document.querySelector('[data-setline-out]');
  if (!input || !out) return;
  const role = { ...ROLES.head, max: () => (state.mobile ? 120 : 200), mode: () => 'one' };
  const current = () => input.value.replace(/\s+/g, ' ').trim() || DEFAULT;
  const set = () => {
    const text = current();
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
  initPress(out, current);
}

// The press: the line judders under the platen, and the poster comes off it
// with a word to save it and, where the phone can share a picture, one to share it.
function initPress(out, current) {
  const btn = document.querySelector('[data-setline-print]');
  const fig = document.querySelector('[data-setline-poster]');
  if (!btn || !fig) return;
  const img = fig.querySelector('img');
  const save = fig.querySelector('[data-setline-save]');
  const share = fig.querySelector('[data-setline-share]');
  const status = document.querySelector('[data-setline-status]');
  let url = null, file = null;
  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    const text = current();
    judder(out, 1.6);
    sound.press();
    status.textContent = state.T.mdPrinting;
    try {
      const { printPoster } = await import('./poster.js');
      const blob = await printPoster({ text, T: state.T, lang: state.lang });
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob);
      const name = `broadside-${slug(text)}.jpg`;
      file = new File([blob], name, { type: blob.type });
      img.src = url;
      img.alt = state.T.mdPosterAlt(text);
      save.href = url;
      save.download = name;
      share.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
      const first = fig.hidden;
      fig.hidden = false;
      status.textContent = state.T.mdPrinted;
      // the sheet has grown by the poster: what is measured on the scroll below it is measured again
      if (first) ScrollTrigger.refresh();
    } catch {
      status.textContent = state.T.mdPrintFail;
    }
    btn.disabled = false;
  });
  share.addEventListener('click', async () => {
    if (!file) return;
    try { await navigator.share({ files: [file], title: 'Stefano Doko' }); } catch { /* the sheet was closed */ }
  });
  // a new language prints anew: the poster already made keeps its own words
  bus.on('lang', () => { if (!fig.hidden) status.textContent = ''; });
}
