// Shared state for every part of the sheet. One clock (the GSAP ticker in
// main.js) reads and writes it; nothing else keeps its own loop.
import { STRINGS } from './i18n.js';

const mq = (q) => window.matchMedia(q);

export const state = {
  lang: 'en',
  T: STRINGS.en,
  reduced: mq('(prefers-reduced-motion: reduce)').matches,
  mobile: mq('(max-width: 767px)').matches,
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
