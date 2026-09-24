// Inking the forme. Every sheet head starts as uninked type (an outline) and
// takes ink where the brayer's roller touches it. The brayer comes in from
// the left edge, rolls across the head and goes out past the right edge, so
// it never parks on top of anything. Its position is a pure function of
// scroll (or of the intro, for the masthead): scroll back and it rolls back.
import { state, clamp, lerp } from '../state.js';

const items = [];
export const roller = { visible: false, x: 0, y: 0, len: 100, u: 0, clipBottom: Infinity, key: '' };
export const introInk = { u: 0 };

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function collectInk() {
  items.length = 0;
  const byEl = new Map();
  document.querySelectorAll('[data-ink]').forEach((el) => {
    const key = el.dataset.ink;
    const follow = el.dataset.inkFollow || null;
    // the head of each sheet is inked as the sheet opens; the rest as they are read
    // a case sheet's name is inked while the sheet is held (its data-ink is the case's id)
    const source = follow ? 'follow' : key === 'mast' || el.dataset.inkSource === 'intro' ? 'intro' : el.closest('[data-case]')?.id === key && !state.mobile ? 'dwell' : 'view';
    const occluder = el.closest('[data-case]')?.nextElementSibling?.nextElementSibling || null;
    const it = { el, key, source, follow, occluder, u: -1, p: -1, x: 0, leader: null };
    byEl.set(el, it);
    items.push(it);
  });
  // a follower takes its ink from the roller of the head it stands beside
  for (const it of items) {
    if (!it.follow) continue;
    const leadEl = it.el.closest('.mast')?.querySelector(`[data-ink="${it.follow}"]`) || document.querySelector(`[data-ink="${it.follow}"]`);
    it.leader = leadEl ? byEl.get(leadEl) : null;
  }
  // leaders first, so followers read this frame's roller
  items.sort((a, b) => (a.follow ? 1 : 0) - (b.follow ? 1 : 0));
}

function progressOf(it, rect) {
  if (state.reduced) return 1;
  if (it.source === 'intro') return introInk.u;
  if (it.source === 'dwell') return clamp((state.dwell?.[it.key] ?? 0) / 0.3);
  const cy = rect.top + rect.height / 2;
  const start = state.vh * 0.88, end = state.vh * 0.4;
  return clamp((start - cy) / (start - end));
}

const setP = (it, p) => {
  if (Math.abs(p - it.p) > 0.0005) { it.p = p; it.el.style.setProperty('--p', p.toFixed(4)); }
};

// Read every head's box in one pass (the tick measures everything before it
// writes anything, so the page lays out once per frame).
export function measureInk() {
  for (const it of items) {
    it.rect = it.el.getBoundingClientRect();
    it.occTop = it.occluder ? it.occluder.getBoundingClientRect().top : Infinity;
  }
}

export function updateInk() {
  let active = null;
  for (const it of items) {
    const rect = it.rect;
    if (!rect) continue;
    if (it.follow) {
      const lead = it.leader;
      const p = state.reduced || !lead ? 1 : clamp((lead.x - rect.left) / Math.max(1, rect.width));
      setP(it, p);
      continue;
    }
    const u = progressOf(it, rect);
    const len = Math.max(28, rect.height * 1.08);
    // in from beyond the left edge, out beyond the right edge
    const x = lerp(-len * 1.4, state.vw + len * 1.6, easeInOut(u));
    it.x = x;
    it.u = u;
    setP(it, state.reduced ? 1 : clamp((x - rect.left) / Math.max(1, rect.width)));
    const visible = rect.bottom > 0 && rect.top < state.vh;
    if (visible && u > 0 && u < 1 && !active) active = { it, rect, x, len };
  }
  if (!active || state.reduced || state.proof) { roller.visible = false; return; }
  const { it, rect, x, len } = active;
  roller.visible = true;
  roller.key = it.key;
  roller.x = x;
  roller.y = rect.top + rect.height / 2;
  roller.len = len;
  roller.u = it.u;
  roller.clipBottom = it.occTop;
}
