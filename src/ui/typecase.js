// The type case. The languages lie in their boxes like sorts in a
// compositor's case, the big boxes for what the web uses most. The first time
// the case comes into view the sorts drop into their boxes one after another:
// a one-shot CSS transition of transform and opacity, so the compositor runs it.
import { state } from '../state.js';

export function initTypecase() {
  const tray = document.querySelector('[data-typecase]');
  if (!tray || state.reduced) return;
  tray.classList.add('is-armed');
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    tray.classList.add('is-cased');
    io.disconnect();
  }, { rootMargin: '0px 0px -18% 0px' });
  io.observe(tray);
}
