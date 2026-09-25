// The loupe on a phone (switched on in the admin). With no pointer to hover, a
// finger held still on a plate for a moment brings the loupe up just above
// the fingertip, and it follows the finger until it lifts. On a case page a
// tap on a letter of the key opens the loupe on that detail for a moment.
// The loupe is the stage's own (src/gl/plates.js): this only says where it
// is, through state.touchLoupe, and the one clock draws it.
//
// Touch listeners sit on the plates alone, so a scroll that starts anywhere
// else never waits for this script; on a plate the move handler returns at
// once unless the loupe is up.
import { state } from '../state.js';
import { has } from './site.js';

const HOLD = 300; // ms held still before the loupe comes up
const LIFT = 76; // px above the fingertip, so the finger does not cover it
const TAP_SHOW = 1600; // ms the loupe stays on a tapped letter's detail

export function initMagnifier() {
  if (!has('magnifier') || state.fine) return;
  const tl = state.touchLoupe;
  let timer = 0;
  let start = null;
  let active = false;

  const place = (t) => {
    tl.fx = t.clientX;
    tl.fy = t.clientY;
    tl.x = t.clientX;
    tl.y = t.clientY - LIFT;
    tl.moved = 1;
  };
  const stop = () => {
    clearTimeout(timer);
    timer = 0;
    start = null;
    if (!active) return;
    active = false;
    tl.on = false;
    tl.moved = 1;
  };
  const onStart = (e) => {
    if (e.touches.length !== 1) { stop(); return; }
    const t = e.touches[0];
    start = { clientX: t.clientX, clientY: t.clientY };
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = 0;
      if (!start) return;
      active = true;
      tl.on = true;
      tl.until = 0;
      place(start);
    }, HOLD);
  };
  const onMove = (e) => {
    const t = e.touches[0];
    if (active) {
      e.preventDefault(); // the loupe has the finger now: no scrolling under it
      place(t);
      return;
    }
    // moving before the hold completes is a scroll, and stays one
    if (start && Math.hypot(t.clientX - start.clientX, t.clientY - start.clientY) > 10) stop();
  };

  for (const p of document.querySelectorAll('[data-plate], [data-optional="portrait"]')) {
    p.addEventListener('touchstart', onStart, { passive: true });
    p.addEventListener('touchmove', onMove, { passive: false });
    p.addEventListener('touchend', stop, { passive: true });
    p.addEventListener('touchcancel', stop, { passive: true });
    // a long press on a picture would open the phone's own menu over the loupe
    p.addEventListener('contextmenu', (e) => { if (active || timer) e.preventDefault(); });
  }

  // a letter of a case page's key: the loupe on its detail, for a moment
  document.addEventListener('click', (e) => {
    const li = e.target.closest?.('.folio__key .callout');
    if (!li) return;
    const fig = li.closest('[data-folio]');
    if (!fig) return;
    const i = [...fig.querySelectorAll('.folio__key .callout')].indexOf(li);
    const pin = fig.querySelectorAll('.folio__pin')[i];
    if (!pin || !pin.offsetParent) return;
    const r = pin.getBoundingClientRect();
    if (r.bottom < 0 || r.top > state.vh) return;
    tl.fx = tl.x = r.left + r.width / 2;
    tl.fy = tl.y = r.top + r.height / 2;
    tl.on = true;
    tl.until = performance.now() + TAP_SHOW;
    tl.moved = 1;
    // the letter's pin would sit in the middle of the lens: step it aside meanwhile
    fig.classList.add('is-looking');
    setTimeout(() => fig.classList.remove('is-looking'), TAP_SHOW + 150);
  });
}
