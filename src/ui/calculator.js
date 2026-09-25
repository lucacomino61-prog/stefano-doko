// The price calculator (switched on in the admin, under the rate card): the
// visitor ticks what the business needs and sees the rates add up, then sends
// the list in a telegram. The telegram page writes the list into the message
// (src/ui/telegram.js), where it stays the visitor's to finish. Only the
// admin's own rates are added up, and the note under the total says it is an
// estimate from the card, not an offer.
import { state, bus } from '../state.js';
import { pathFor } from '../routes.js';
import { site, has, money, pick } from './site.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const priceOf = (T, lang, it) => `${it.from ? `${T.rateFrom} ` : ''}${money(it.price, site.rates.currency, lang)}`;

/** The ticked rates' total: "from" when any of them is a starting price. */
export function totalText(T, lang, items) {
  const sum = items.reduce((a, it) => a + it.price, 0);
  return `${items.some((it) => it.from) ? `${T.rateFrom} ` : ''}${money(sum, site.rates.currency, lang)}`;
}

/** The ticked rates (their places on the card) as a telegram's first lines, in the page's language. */
export function orderText(T, lang, picked) {
  const items = picked.map((i) => site.rates?.items[i]).filter(Boolean);
  if (!items.length) return '';
  const lines = items.map((it) => `— ${pick(it.name, lang)} (${priceOf(T, lang, it)})`);
  return `${T.calcWant}\n${lines.join('\n')}\n${T.calcSum(totalText(T, lang, items))}\n\n`;
}

export function initCalculator() {
  const form = document.querySelector('[data-calc]');
  if (!form || !has('calculator') || !site.rates?.items.length) return;
  form.hidden = false;
  const list = form.querySelector('[data-calc-list]');
  const out = form.querySelector('[data-calc-total]');
  const send = form.querySelector('[data-calc-send]');
  const picked = () => [...list.querySelectorAll('input:checked')].map((b) => Number(b.value));

  const update = () => {
    const T = state.T;
    const lang = state.lang;
    const ids = picked();
    const items = ids.map((i) => site.rates.items[i]).filter(Boolean);
    out.textContent = items.length ? totalText(T, lang, items) : T.calcNone;
    send.hidden = !items.length;
    send.href = `${pathFor('contact', lang)}?rates=${ids.join(',')}`;
  };
  // the card's rates as lines to tick, kept ticked across a language switch
  const paint = () => {
    const T = state.T;
    const lang = state.lang;
    const ticked = new Set(picked());
    const legend = list.querySelector('legend');
    list.replaceChildren(legend, ...site.rates.items.map((it, i) => {
      const row = el('label', 'calc__item');
      const box = el('input');
      box.type = 'checkbox';
      box.name = 'rate';
      box.value = String(i);
      box.checked = ticked.has(i);
      const leader = el('span', 'calc__leader');
      leader.setAttribute('aria-hidden', 'true');
      row.append(box, el('span', 'calc__name', pick(it.name, lang)), leader, el('span', 'calc__price', priceOf(T, lang, it)));
      return row;
    }));
    update();
  };
  list.addEventListener('change', update);
  form.addEventListener('submit', (e) => e.preventDefault());
  paint();
  bus.on('lang', paint);
}
