// The night edition: the whole site set dark. Pressing the engraving's sun
// turns it into a moon and the sheet over to night; pressing the moon brings
// the day back. The date line carries the same switch on every sheet (a sun,
// or a moon), so a sheet without the engraving can go back to day. The choice
// is kept in this browser (sd-night) and set before the first paint by
// partials/head.html; the colours cross-fade as registered custom properties,
// and the engraving follows in the stage (src/gl/stage.js).
import { state, bus } from '../state.js';
import { judder, sound } from './press.js';

const KEY = 'sd-night';
const THEME = { day: '#EFE6D2', night: '#16140F' };

export function initNight() {
  const root = document.documentElement;
  state.night = root.classList.contains('is-night');
  const switches = [...document.querySelectorAll('[data-night]')];
  const paint = () => {
    switches.forEach((b) => {
      b.setAttribute('aria-pressed', String(state.night));
      b.querySelector('use')?.setAttribute('href', state.night ? '#moon' : '#sun');
    });
  };
  const set = (on) => {
    state.night = on;
    root.classList.toggle('is-night', on);
    // the phone's own bar and the page's form controls follow the sheet
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', on ? THEME.night : THEME.day);
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', on ? 'dark' : 'only light');
    try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* not kept */ }
    paint();
    bus.emit('night', on);
  };
  switches.forEach((b) => b.addEventListener('click', () => {
    if (!b.matches('[data-sky]')) judder(b);
    sound.paper();
    set(!state.night);
  }));
  paint();
  return set;
}
