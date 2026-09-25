// The portrait on the About sheet, switched on in the admin with a photo. The
// stage prints it the way it prints the work plates, as a line engraving, and
// the loupe shows the photograph in true colour. It never develops: it is a
// cut of the designer, not a screenshot to be read.
import { has, site } from './site.js';

export function initPortrait(stage) {
  const fig = document.querySelector('[data-optional="portrait"]');
  if (!fig || !stage || !has('portrait') || !site.portrait) return;
  const pl = stage.addPlate(fig, [], null);
  pl.develop = 0;
  pl.leader = 0;
  if (!pl.load) return;
  new IntersectionObserver(([e], io) => {
    if (!e.isIntersecting) return;
    pl.load();
    io.disconnect();
  }, { rootMargin: '1200px 0px' }).observe(fig);
}
