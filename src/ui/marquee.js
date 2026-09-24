// One running line in two faces: wood gothic caps and the newspaper italic,
// changing voice at every star. It runs with the scroll, and turns when the
// reader turns. Under it, a flourish draws itself once.
import gsap from 'gsap';
import { state, bus } from '../state.js';

const STAR = '<svg class="orn" aria-hidden="true"><use href="#star"/></svg>';
const FLOURISH = [
  'M200 3.5 208.5 12 200 20.5 191.5 12Z',
  'M213 12C238 12 248 5.5 276 6.5C305 7.5 326 16.5 356 12.5C368 11 377 5.5 384 8.5C391 11.5 387 18.5 380.5 15.5C376 13.5 378.5 9 382 9.5',
  'M187 12C162 12 152 5.5 124 6.5C95 7.5 74 16.5 44 12.5C32 11 23 5.5 16 8.5C9 11.5 13 18.5 19.5 15.5C24 13.5 21.5 9 18 9.5',
];

export function createMarquee() {
  const root = document.querySelector('[data-marquee]');
  if (!root) return () => {};
  const track = root.querySelector('[data-marquee-track]');
  const flourish = root.querySelector('.marquee__flourish');
  flourish.innerHTML = FLOURISH.map((d, i) => `<path d="${d}" ${i === 0 ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"'}/>`).join('');
  let setWidth = 1, x = 0, dir = -1, visible = false;

  function build() {
    const words = state.T.marquee;
    const one = words.map((w, i) => `<span class="marquee__item"><span class="${i % 2 ? 'marquee__b' : 'marquee__a'}">${w}</span>${STAR}</span>`).join('');
    track.innerHTML = `<span class="marquee__set">${one}</span>`;
    const set = track.firstElementChild;
    setWidth = set.getBoundingClientRect().width || 1;
    const copies = Math.ceil((state.vw * 2) / setWidth) + 1;
    track.innerHTML = Array.from({ length: copies }, () => `<span class="marquee__set" style="display:flex">${one}</span>`).join('');
    x = x % setWidth;
  }
  build();
  bus.on('lang', build);
  bus.on('resize', build);

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(root);

  const paths = flourish.querySelectorAll('path');
  if (!state.reduced) {
    gsap.set(paths, { drawSVG: '50% 50%' });
    gsap.to(paths, { drawSVG: '0% 100%', duration: 1.6, ease: 'power2.inOut', stagger: 0.08, scrollTrigger: { trigger: root, start: 'top 85%' } });
  }

  return function update(dt) {
    if (!visible || state.reduced) return;
    if (Math.abs(state.velocity) > 0.2) dir = state.velocity > 0 ? -1 : 1;
    const speed = 46 + Math.min(900, Math.abs(state.velocity) * 38);
    x += dir * speed * dt;
    if (x <= -setWidth) x += setWidth;
    if (x > 0) x -= setWidth;
    track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
  };
}
