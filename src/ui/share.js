// Share this sheet (the foot of every sheet): on a phone or a tablet, the
// system's own share sheet; on a computer, the sheet's address copied, and a
// line saying so. The address is the sheet's own (its canonical link), in its
// language, without anything a visit added to it.
import { state } from '../state.js';

export function initShare() {
  const btn = document.querySelector('[data-share]');
  const status = document.querySelector('[data-share-status]');
  if (!btn) return;
  let quiet = null;
  const say = (text) => {
    if (!status) return;
    status.textContent = text;
    clearTimeout(quiet);
    quiet = setTimeout(() => { status.textContent = ''; }, 4000);
  };
  btn.addEventListener('click', async () => {
    const url = document.querySelector('link[rel="canonical"]')?.href || location.origin + location.pathname;
    if (!state.fine && navigator.share) {
      try { await navigator.share({ title: document.title, url }); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      say(state.T.shareCopied);
    } catch {
      say(state.T.shareFail);
    }
  });
}
