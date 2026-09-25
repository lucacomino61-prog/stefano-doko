// Proofs pulled once, under the intro, and thrown away before it opens. The
// first time the page draws some kinds of paint, Chrome compiles GPU shaders
// for them (15 to 30ms each on a slow GPU, so on a first visit a frame
// dropped mid-scroll). Drawn here, a copy of each part pays for its shaders
// while the counter hides the sheet:
// - the red sheet: the stamp's rings beside the outlined head;
// - the fan: its tilted cards and their screenshots;
// - a case plate: its rounded mount (it was cut by a chamfered clip-path);
// - the pinned bar: its frosted glass (a backdrop blur), which alone cost a
//   frame of about 100ms, with nothing on the main thread, the first time the
//   bar slid in (the modern edition, 2026-09-25).
// The copies of the work sit together in a band clear of the red sheet's head
// and stamp (style.css), so everything is drawn at once, inside the screen.
import { state } from '../state.js';

// a copy with nothing a script or an id could find; the red sheet keeps its
// own data-feed, which holds it open (is-fed) the way the real one is drawn
function copyOf(src, keepRoot = false) {
  const copy = src.cloneNode(true);
  for (const el of [copy, ...copy.querySelectorAll('*')]) {
    el.removeAttribute('id');
    if (el === copy && keepRoot) continue;
    [...el.attributes].forEach((a) => { if (a.name.startsWith('data-')) el.removeAttribute(a.name); });
  }
  return copy;
}

export function warmSheets() {
  if (state.reduced) return null;
  const box = document.createElement('div');
  box.className = 'warm';
  box.setAttribute('aria-hidden', 'true');
  box.inert = true;
  const extra = document.querySelector('.sheet--extra');
  if (extra) {
    const copy = copyOf(extra, true);
    copy.classList.add('is-fed');
    box.append(copy);
  }
  const work = document.createElement('div');
  work.className = 'warm__work';
  for (const sel of ['[data-fan]', '[data-plate]']) {
    const src = document.querySelector(sel);
    if (src) work.append(copyOf(src));
  }
  // Lying in the pile as they are, the copy's cards still left the real ones
  // two shaders to compile for their screenshots (phone and desktop alike);
  // drawn a little larger, two of them compile those too. They are the two
  // Elixir screenshots, which the contents and the feature have loaded by
  // now. The rest lie in the pile, tilted, as the real ones do before the deal.
  work.querySelectorAll('.fan__card').forEach((c, i) => {
    if (i < 2) c.style.transform = c.style.transform.replace(/scale\([^)]*\)/, 'scale(1.1)');
  });
  // drawn now, so loaded now; the plate's picture is left out of the copy: with
  // the stage on, the real plate's picture is drawn by WebGL, not by the page,
  // and a full-width copy of it was the largest thing painted on arrival (the
  // page's LCP, at 2.1s, instead of the band at 0.75s). Its mount and chamfered
  // clip, the part that compiles, are still drawn.
  work.querySelectorAll('img').forEach((img) => { img.decoding = 'sync'; img.loading = 'eager'; });
  work.querySelectorAll('.plate__mount img').forEach((img) => { img.style.visibility = 'hidden'; });
  if (work.childElementCount) box.append(work);
  // the pinned bar, shown as it is once the head has gone by (phones have the tab bar, on screen from the start)
  const pill = document.querySelector('[data-pill]');
  if (pill && !state.mobile) {
    const copy = copyOf(pill);
    copy.classList.add('is-on');
    box.append(copy);
  }
  if (!box.childElementCount) return null;
  document.body.append(box);
  return () => box.remove();
}
