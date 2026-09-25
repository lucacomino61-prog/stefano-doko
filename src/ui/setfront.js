// Your business on the front page (contact page, switched on in the admin): a
// visitor types the business's name and sees it set as a masthead, fitted to
// the measure like the sheet's own heads and inked once the typing pauses.
// One tap then carries the name into the telegram below it.
import { fitText, ROLES } from './fit.js';
import { state, bus } from '../state.js';
import { albaniaNow } from '../i18n.js';
import { has } from './site.js';

const clean = (v) => v.replace(/\s+/g, ' ').trim();

export function initSetfront() {
  const sec = document.querySelector('[data-optional="masthead"]');
  if (!sec || !has('masthead')) return;
  const input = sec.querySelector('[data-setfront-in]');
  const out = sec.querySelector('[data-setfront-out]');
  const outline = out.querySelector('.setfront__outline');
  const fill = out.querySelector('.setfront__fill');
  const date = sec.querySelector('[data-setfront-date]');
  const send = sec.querySelector('[data-setfront-send]');
  const form = document.querySelector('[data-telegram]');
  const role = { ...ROLES.name, max: () => (state.mobile ? 110 : 190), mode: () => 'one' };
  let timer = 0;
  let placed = ''; // what this put into the telegram's business line, so a later name can replace it

  const set = () => {
    const text = clean(input.value);
    const shown = text || state.T.setfrontPlaceholder;
    const target = out.clientWidth;
    if (target >= 40) {
      const { size, stretch } = fitText(shown, role, target);
      out.style.fontSize = `${size.toFixed(1)}px`;
      out.style.fontStretch = `${stretch.toFixed(1)}%`;
    }
    outline.textContent = shown;
    fill.textContent = shown;
    out.classList.toggle('is-blank', !text);
    send.hidden = !text;
    // the ink goes on once the typing pauses, as a roller would pass
    out.classList.remove('is-inked');
    clearTimeout(timer);
    if (text) timer = setTimeout(() => out.classList.add('is-inked'), state.reduced ? 0 : 420);
  };
  const paintDate = () => { date.textContent = albaniaNow(state.lang).date; };

  input.addEventListener('input', set);
  send.addEventListener('click', () => {
    const text = clean(input.value);
    if (!form || !text) return;
    const biz = form.elements.business;
    if (biz && (!biz.value.trim() || biz.value === placed)) {
      biz.value = text;
      placed = text;
      biz.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const msg = form.querySelector('[data-telegram-message]');
    if (state.lenis) state.lenis.scrollTo(form, { offset: -24, duration: 1.1 });
    else form.scrollIntoView({ behavior: state.reduced ? 'auto' : 'smooth', block: 'start' });
    msg?.focus({ preventScroll: true });
  });
  bus.on('resize', set);
  bus.on('refit', set);
  bus.on('lang', () => { paintDate(); set(); });
  paintDate();
  document.fonts?.ready.then(set);
  set();
}
