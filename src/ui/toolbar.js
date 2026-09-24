// The sheet's controls: the dateline clock (Albania time), the language and
// proof words, the sticky pill, "read" states, and the index that deals out
// as a stack of small sheets.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { state, bus, clamp } from '../state.js';
import { albaniaNow } from '../i18n.js';
import { pathFor, isHere } from '../routes.js';
import { judder, sound } from './press.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------- clock ----------
export function startClock() {
  const tick = () => {
    const { date, time, seconds } = albaniaNow(state.lang, state.mobile);
    $$('[data-date]').forEach((el) => { el.textContent = date; });
    $$('[data-clock]').forEach((el) => { el.textContent = `${time}:${seconds}`; el.setAttribute('datetime', time); });
    const line = $('[data-clock-line]');
    if (line) line.textContent = state.T.clockLine(time);
  };
  tick();
  setInterval(tick, 1000);
  bus.on('lang', tick);
}

// ---------- pill, read states, current section ----------
const tracked = ['work', 'elixir', 'martiri', 'greta', 'about', 'services', 'contact', 'back'];
// the case sheets belong to the work
const CASES = new Set(['elixir', 'martiri', 'greta']);

export function initNav() {
  const pill = $('[data-pill]');
  const toolbar = $('[data-toolbar]');
  const readSet = new Set();
  let edition = null;
  bus.on('edition', (el) => { edition = el; });

  // measured once per layout change, never per frame
  let maxScroll = 1;
  const measureHeight = () => { maxScroll = Math.max(1, document.documentElement.scrollHeight - state.vh); };
  measureHeight();
  bus.on('resize', measureHeight);
  bus.on('refit', measureHeight);
  ScrollTrigger.addEventListener('refresh', measureHeight);

  // the words that point at a part of the front page (the others name whole sheets)
  const navLinks = () => $$('.toolbar__nav .word[data-hash], .pill__nav .word[data-hash], .tabbar__item[data-hash]').filter((a) => !a.closest('[data-edition]'));
  let links = navLinks();
  bus.on('edition', () => { links = navLinks(); });
  const sections = tracked.map((id) => document.getElementById(id)).filter(Boolean);
  let pillOn = null, lastRead = -1, lastCurrent;

  let tbBottom = 0, edTop = Infinity, current = null;
  const newlyRead = [];
  function measure() {
    tbBottom = toolbar.getBoundingClientRect().bottom;
    edTop = edition ? edition.getBoundingClientRect().top : Infinity;
    current = null;
    newlyRead.length = 0;
    const mid = state.vh * 0.45, readLine = state.vh * 0.25;
    for (const el of sections) {
      const r = el.getBoundingClientRect();
      if (r.top < mid && r.bottom > mid) current = el.id;
      if (r.bottom < readLine && !readSet.has(el.id)) newlyRead.push(el.id);
    }
  }
  function apply() {
    // writes, and only when something changed
    const show = tbBottom < -40 && edTop >= 120 && !state.menuOpen;
    if (show !== pillOn) { pillOn = show; pill.classList.toggle('is-on', show); }
    const read = clamp(state.scroll / maxScroll);
    if (Math.abs(read - lastRead) > 0.002) { lastRead = read; pill.style.setProperty('--read', read.toFixed(3)); }
    for (const id of newlyRead) {
      readSet.add(id);
      $$(`a[href="#${id}"], a[data-hash="#${id}"]`).filter((a) => !a.closest('[data-edition]')).forEach((a) => a.classList.add('is-read'));
    }
    const navId = CASES.has(current) ? 'work' : current === 'back' ? null : current;
    if (navId !== lastCurrent) {
      lastCurrent = navId;
      for (const a of links) {
        if (a.dataset.hash === `#${navId}`) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      }
    }
  }
  return { measure, apply };
}

// ---------- the index: a stack of small sheets ----------
export function initMenu(scrollTo) {
  const menu = $('[data-menu]');
  const list = $('[data-menu-list]', menu);
  const openers = $$('[data-menu-open]');
  const closer = $('[data-menu-close]', menu);
  let trigger = null;

  // each sheet of the index names a sheet of the site, or a part of the front page
  const render = () => {
    list.replaceChildren(...state.T.menu.map(([route, hash, title, line], i) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'stack-menu__sheet';
      a.dataset.route = route;
      if (hash) a.dataset.hash = hash;
      a.href = pathFor(route, state.lang) + hash;
      a.style.zIndex = String(20 - i);
      a.innerHTML = `<b></b><i></i><svg class="hand" aria-hidden="true"><use href="#hand"/></svg>`;
      a.querySelector('b').textContent = title;
      a.querySelector('i').textContent = line;
      li.appendChild(a);
      return li;
    }));
    closer.textContent = state.T.navClose;
  };
  render();
  bus.on('lang', render);

  const sheets = () => $$('.stack-menu__sheet', menu);
  function open(btn) {
    if (state.menuOpen) return;
    trigger = btn;
    state.menuOpen = true;
    menu.hidden = false;
    openers.forEach((b) => b.setAttribute('aria-expanded', 'true'));
    const from = state.mobile ? 40 : -40;
    const s = sheets();
    if (state.reduced) gsap.set(s, { opacity: 1, y: 0, rotation: (i) => (i % 2 ? 1.1 : -1.1) });
    else gsap.fromTo(s, { opacity: 0, y: from, rotation: (i) => (i % 2 ? 7 : -7) }, { opacity: 1, y: 0, rotation: (i) => (i % 2 ? 1.1 : -1.1), duration: 0.34, ease: 'power3.out', stagger: state.mobile ? { each: 0.035, from: 'end' } : 0.035 });
    sound.paper();
    s[0]?.focus();
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onOutside, true);
  }
  function close(returnFocus = true) {
    if (!state.menuOpen) return;
    state.menuOpen = false;
    openers.forEach((b) => b.setAttribute('aria-expanded', 'false'));
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onOutside, true);
    const done = () => { menu.hidden = true; if (returnFocus) trigger?.focus(); };
    if (state.reduced) done();
    else gsap.to(sheets(), { opacity: 0, y: state.mobile ? 24 : -24, duration: 0.18, ease: 'power2.in', stagger: 0.015, onComplete: done });
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  }
  function onOutside(e) {
    if (!menu.contains(e.target) && !e.target.closest('[data-menu-open]')) close(false);
  }
  openers.forEach((b) => b.addEventListener('click', () => (state.menuOpen ? close() : open(b))));
  closer.addEventListener('click', () => close());
  menu.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    // another sheet: let the press feed it in; this sheet: carry the reader there
    if (!isHere(a)) { close(false); return; }
    e.preventDefault();
    close(false);
    scrollTo(a.dataset.hash || '#top');
  });
}

// ---------- language, sound and proof words ----------
export function initWords({ onLang, onProof }) {
  $$('[data-lang]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.lang !== state.lang) { judder(b.parentElement); onLang(b.dataset.lang); }
  }));
  $$('[data-lang-toggle]').forEach((b) => b.addEventListener('click', () => { judder(b); onLang(state.lang === 'en' ? 'sq' : 'en'); }));

  const soundBtn = $('[data-sound]');
  const soundLabel = $('[data-sound-label]');
  const paintSound = () => {
    soundBtn.setAttribute('aria-pressed', String(state.sound));
    soundLabel.textContent = state.sound ? state.T.soundOn : state.T.soundOff;
  };
  soundBtn.addEventListener('click', () => { sound.enable(!state.sound); paintSound(); judder(soundBtn); sound.press(); });

  const proofBtn = $('[data-proof]');
  const proofLabel = $('[data-proof-label]');
  const paintProof = () => {
    proofBtn.setAttribute('aria-pressed', String(state.proof));
    proofLabel.textContent = state.proof ? state.T.proofOn : state.T.proof;
  };
  proofBtn.addEventListener('click', () => { onProof(!state.proof); paintProof(); judder(proofBtn); sound.press(); });

  const paintLang = () => {
    $$('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
    $$('[data-lang-toggle]').forEach((b) => { const other = state.lang === 'en' ? 'sq' : 'en'; b.textContent = other.toUpperCase(); b.lang = other; });
  };
  const paint = () => { paintSound(); paintProof(); paintLang(); };
  paint();
  bus.on('lang', paint);
  return paint;
}
