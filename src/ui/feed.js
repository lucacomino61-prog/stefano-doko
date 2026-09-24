// Sheets feed through the press: a line of type, a caption or the whole red
// sheet opens out of a horizontal slit, as paper comes through the rollers.
// A one-shot CSS transition, so the compositor runs it.
import { state } from '../state.js';

export function initFeed() {
  if (state.reduced) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-fed');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('[data-feed]').forEach((el) => io.observe(el));
}
