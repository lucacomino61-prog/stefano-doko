// The 404 sheet: the words "sheet not found" lie pied on the floor, the way
// spilled type does. "Set it again" puts every sort back in line; press it
// once more and the forme falls over again.
import './style.css';
import gsap from 'gsap';
import { STRINGS, initialLang, applyStrings } from './i18n.js';
import { pathFor } from './routes.js';
import { layPaper } from './ui/paper.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
layPaper();
const lang = initialLang();
const T = STRINGS[lang];
applyStrings(T);
// back to the front page in the reader's own language
document.querySelectorAll('a[data-home]').forEach((a) => { a.href = pathFor('home', lang); });
document.querySelectorAll('a[data-route]').forEach((a) => { a.href = pathFor(a.dataset.route, lang); });
document.documentElement.classList.add('fitted');

const pie = document.querySelector('[data-pie]');
const btn = document.querySelector('[data-set]');
let sorts = [];
let set = false;

function build() {
  const text = T.notFound.toUpperCase();
  pie.replaceChildren();
  const line = document.createElement('div');
  line.className = 'pie__line';
  sorts = [...text].map((ch) => {
    const s = document.createElement('span');
    s.className = ch === ' ' ? 'sort sort--space' : 'sort';
    s.textContent = ch === ' ' ? ' ' : ch;
    line.appendChild(s);
    return s;
  });
  pie.appendChild(line);
}

function scatter(animate) {
  const W = pie.clientWidth, H = pie.clientHeight;
  const line = pie.firstElementChild.getBoundingClientRect();
  sorts.forEach((s, i) => {
    const home = s.getBoundingClientRect();
    const x = (Math.random() * 0.86 + 0.02) * W - (home.left - line.left);
    const y = (Math.random() * 0.62 + 0.25) * H - (home.top - pie.getBoundingClientRect().top) - home.height * 0.5;
    const r = (Math.random() - 0.5) * 150;
    if (animate && !reduced) gsap.to(s, { x, y, rotation: r, duration: 0.7 + Math.random() * 0.4, ease: 'bounce.out', delay: i * 0.012 });
    else gsap.set(s, { x, y, rotation: r });
  });
  set = false;
}

function setInLine() {
  if (reduced) gsap.set(sorts, { x: 0, y: 0, rotation: 0 });
  else gsap.to(sorts, { x: 0, y: 0, rotation: 0, duration: 0.55, ease: 'power3.inOut', stagger: 0.03 });
  set = true;
}

document.fonts.load('900 60px Anybody').finally(() => {
  build();
  scatter(false);
});
btn.addEventListener('click', () => (set ? scatter(true) : setInLine()));
