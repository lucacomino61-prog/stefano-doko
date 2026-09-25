// The verse: who Stefano is, set in two justified columns. The words take
// ink one by one as the sheet is read, the two cuts of his work print where
// they fall in the text, and the column rule draws itself down between them.
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { state, bus } from '../state.js';

const FLOURISH = [
  'M200 3.5 208.5 12 200 20.5 191.5 12Z',
  'M213 12C238 12 248 5.5 276 6.5C305 7.5 326 16.5 356 12.5C368 11 377 5.5 384 8.5C391 11.5 387 18.5 380.5 15.5C376 13.5 378.5 9 382 9.5',
  'M187 12C162 12 152 5.5 124 6.5C95 7.5 74 16.5 44 12.5C32 11 23 5.5 16 8.5C9 11.5 13 18.5 19.5 15.5C24 13.5 21.5 9 18 9.5',
];

// The verse is a fixed text, so its long words are hyphenated by hand, the
// way a compositor would, in every language (browsers carry no Albanian
// hyphenation). Only these soft hyphens may break a word.
const BREAKS = {
  en: ['Ste-fa-no', 'graph-ic', 'de-sign-er', 'Al-ba-nia', 'busi-ness-es', 'busi-ness', 'per-fume', 'on-line', 'fra-granc-es', 'de-liv-ered', 'Mar-ti-ri', 'sun-beds', 'lan-guag-es', 'close-ly', 'Al-ba-ni-an', 'Eng-lish', 'de-vel-op-er', 'web-site', 'de-signs'],
  sq: ['Ste-fa-no', 'Ste-fa-nos', 'di-zaj-ner', 'gra-fik', 'Shqi-pë-ri', 'Shqi-pë-ri-në', 'biz-ne-set', 'biz-ne-se', 'biz-ne-si', 'vi-zi-tosh', 'par-fu-me-ri', 'par-fu-me', 'de-sig-ner', 'dër-ge-sa', 'aku-llo-re', 'shez-lon-gë', 'për-do-rim', 'Shi-ko-ji', 'pi-kë-risht', 'shkrua-ji', 'an-glisht', 'Mar-ti-ri', 'on-li-ne', 'zhvi-llu-es', 'di-zaj-non', 'shkru-an', 'pro-von'],
  it: ['Ste-fa-no', 'gra-phic', 'de-si-gner', 'svi-lup-pa-to-re', 'Al-ba-nia', 'at-ti-vi-tà', 'pre-sen-ti-no', 'di-mo-stra', 'vi-si-ta-re', 'ne-go-zio', 'pro-fu-mi', 'on-li-ne', 'gran-di', 'nic-chia', 'con-se-gne', 'Mar-ti-ri', 'ge-la-ti', 'let-ti-ni', 'En-tram-bi', 'Guar-da-li', 'vi-ci-no', 'pro-prio', 'Pro-get-ta', 'lin-guag-gi', 'e-len-ca-ti', 'se-guen-te', 'al-ba-ne-se', 'in-gle-se', 'pre-sen-tar-si'],
};
const table = {};
for (const [lang, list] of Object.entries(BREAKS)) {
  table[lang] = new Map(list.map((w) => [w.replace(/-/g, '').toLowerCase(), w]));
}
function hyphenate(word, lang) {
  const m = word.match(/^([^\p{L}]*)([\p{L}’']+)([^\p{L}]*)$/u);
  if (!m) return word;
  const [, pre, core, post] = m;
  const hit = table[lang]?.get(core.toLowerCase());
  if (!hit) return word;
  let out = '', i = 0;
  for (const ch of hit) {
    if (ch === '-') { out += '\u00AD'; continue; }
    out += core[i++];
  }
  return pre + out + post;
}

export function initVerse() {
  const root = document.querySelector('[data-verse]');
  if (!root) return;
  let items = [];
  let lit = -1;
  let line = null;
  let st = null;
  let endPaths = [];

  function build() {
    const p = document.createElement('p');
    state.T.verse.forEach((part) => {
      if (typeof part === 'string') {
        part.split(/\s+/).filter(Boolean).forEach((w) => {
          const s = document.createElement('span');
          s.className = 'w';
          s.textContent = hyphenate(w, state.lang);
          p.append(s, ' ');
        });
      } else {
        const c = document.createElement('span');
        c.className = `cut cut--${part.cut}`;
        c.setAttribute('role', 'img');
        c.setAttribute('aria-label', part.alt);
        p.append(c, ' ');
      }
    });
    const rule = document.createElement('div');
    rule.className = 'verse__rule';
    rule.setAttribute('aria-hidden', 'true');
    rule.innerHTML = '<svg class="verse__line" viewBox="0 0 2 100" preserveAspectRatio="none"><line x1="1" y1="0" x2="1" y2="100" pathLength="1"/></svg><svg class="orn verse__star verse__star--t"><use href="#star"/></svg><svg class="orn verse__star verse__star--b"><use href="#star"/></svg>';
    root.replaceChildren(p, rule);
    line = rule.querySelector('line');
    items = [...p.querySelectorAll('.w, .cut')];
    lit = -1;
  }

  function paint(progress) {
    const n = Math.round(progress * items.length);
    const tail = Math.min(1, Math.max(0, (progress - 0.72) / 0.28));
    endPaths.forEach((p) => { p.style.strokeDashoffset = String(1 - tail); });
    if (line) line.style.strokeDashoffset = String(1 - Math.min(1, progress * 1.05));
    if (n === lit) return;
    for (let i = 0; i < items.length; i++) items[i].classList.toggle('on', i < n);
    lit = n;
  }

  const end = document.querySelector('[data-verse-end]');
  if (end) {
    end.innerHTML = FLOURISH.map((d, i) => `<path d="${d}" ${i === 0 ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" pathLength="1"'}/>`).join('');
    endPaths = [...end.querySelectorAll('path[pathLength]')];
    endPaths.forEach((p) => { p.style.strokeDasharray = '1'; p.style.strokeDashoffset = state.reduced ? '0' : '1'; });
  }
  build();
  if (state.reduced) paint(1);
  else st = ScrollTrigger.create({ trigger: root, start: 'top 82%', end: 'bottom 58%', onUpdate: (s) => paint(s.progress) });
  bus.on('lang', () => { build(); paint(st ? st.progress : 1); });
}
