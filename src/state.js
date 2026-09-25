// Shared state for every part of the sheet. One clock (the GSAP ticker in
// main.js) reads and writes it; nothing else keeps its own loop.
import { STRINGS } from './i18n.js';

const mq = (q) => window.matchMedia(q);
// a touch screen wide enough for the tablet sheet but too short to hold a case
// sheet on it: a phone held sideways (the same query as in style.css)
export const SHORT = '(min-width: 768px) and (max-height: 560px) and (pointer: coarse)';

// "Stop the press" (the dateline): a reader's own choice to stop everything
// that moves by itself. Kept in this browser; while it is on, the sheet runs
// exactly as it does for a reader whose system asks for reduced motion.
export const prefersReduced = mq('(prefers-reduced-motion: reduce)').matches;
const stillStored = (() => { try { return localStorage.getItem('sd-still') === '1'; } catch { return false; } })();

export const state = {
  lang: 'en',
  T: STRINGS.en,
  reduced: prefersReduced || stillStored,
  still: stillStored,
  mobile: mq('(max-width: 767px)').matches,
  // a phone held sideways: too short to hold a case sheet on screen (style.css)
  short: mq(SHORT).matches,
  fine: mq('(hover: hover) and (pointer: fine)').matches,
  proof: false,
  sound: false,
  lenis: null,
  vw: window.innerWidth,
  vh: window.innerHeight,
  scroll: 0,
  velocity: 0,
  time: 0,
  pointer: { x: -9999, y: -9999, px: -9999, py: -9999, vx: 0, vy: 0, moved: 0, down: false },
  // the loupe held up by a finger (src/ui/magnifier.js): where the lens sits (x, y),
  // where the finger is (fx, fy), and when a tapped-on lens closes by itself (until)
  touchLoupe: { on: false, x: -9999, y: -9999, fx: -9999, fy: -9999, until: 0, moved: 0 },
  // a phone's tilt (src/ui/tilt.js): its last reading in degrees, left-right (x) and toward-away (y), as the screen is turned
  tilt: { on: false, x: 0, y: 0 },
  // the night edition (src/ui/night.js), set before the first paint by partials/head.html
  night: document.documentElement.classList.contains('is-night'),
  // the weather over Albania as last read for the engraving's sky (src/weather.js), or null
  weather: null,
  introDone: false,
  menuOpen: false,
  dwell: {},
};

// Tiny event bus: 'lang', 'resize', 'proof', 'refit'
const target = new EventTarget();
export const bus = {
  on(type, fn) { target.addEventListener(type, (e) => fn(e.detail)); },
  emit(type, detail) { target.dispatchEvent(new CustomEvent(type, { detail })); },
};

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
