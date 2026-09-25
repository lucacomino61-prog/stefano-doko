// Graphic work (switched on in the admin): each piece is a plate on the stage,
// printed as a line engraving that develops into its true colour as it comes
// up the sheet, with the loupe over it like the case plates. The figures are
// laid by site.js, from the pieces the admin allows; this only hands them to
// the stage and ties their developing to the scroll.
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { state, clamp } from '../state.js';
import { has } from './site.js';

export function initGraphic(stage) {
  const figs = [...document.querySelectorAll('[data-graphic] [data-plate]')];
  if (!stage || !figs.length || !has('graphic')) return;
  for (const fig of figs) {
    const pl = stage.addPlate(fig, [], null);
    pl.leader = 0;
    if (state.reduced) pl.develop = 1;
    else ScrollTrigger.create({ trigger: fig, start: 'top 85%', end: 'bottom 45%', onUpdate: (st) => { pl.develop = clamp(st.progress * 1.4); } });
    // the picture is uploaded as a texture shortly before it is needed
    new IntersectionObserver(([e], io) => {
      if (!e.isIntersecting) return;
      pl.load();
      io.disconnect();
    }, { rootMargin: '1200px 0px' }).observe(fig);
  }
}
