// The print edition: the front page set once more as a single broadside for
// an A4 sheet, to hand to a shop owner across the counter. It is built from
// the page's own words and the admin's settings (nothing new is said here),
// sits hidden at the end of the body, and only the print stylesheet shows it.
// The masthead is fitted to the paper's measure the way every head on the
// sheet is fitted to the screen's. A QR code carries the site's address.
import { state, bus } from '../state.js';
import { albaniaNow } from '../i18n.js';
import { pathFor } from '../routes.js';
import { fitText, ROLES } from './fit.js';
import { qrElement } from './qr.js';
import { site, has, money, prettyPhone, availLine, pick } from './site.js';

// A4 portrait with 12mm margins: 186mm of measure, in CSS pixels (96 per inch)
const MEASURE = Math.round((186 / 25.4) * 96);
let sheet = null;
let qr = null; // the code for the site's address, drawn once the maker has loaded

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

function build() {
  const T = state.T;
  const lang = state.lang;
  const host = location.host;
  const { date } = albaniaNow(lang);
  const s = el('div', 'print-sheet');
  s.setAttribute('aria-hidden', 'true');

  const dl = el('p', 'ps-dateline');
  dl.append(el('span', '', date), el('span', '', host), el('span', '', T.printEdition));
  s.append(el('div', 'ps-rule'), dl);

  const name = T.mastName.toUpperCase();
  const { size, stretch } = fitText(name, { ...ROLES.name, max: 400, mode: () => 'one' }, MEASURE);
  const mast = el('p', 'ps-mast', name);
  mast.style.fontSize = `${size.toFixed(1)}px`;
  mast.style.fontStretch = `${stretch.toFixed(1)}%`;
  s.append(mast, el('p', 'ps-side', [T.mastSide1, T.mastSide2, T.mastSide3].join(' ')));

  const band = el('img', 'ps-band');
  band.src = '/band-poster.jpg';
  band.alt = '';
  s.append(band);

  // the lead, as the front page states it
  const lead = el('section', 'ps-lead');
  lead.append(el('h2', 'ps-lead__head', T.standHead), el('p', 'ps-lead__body', T.standBody));
  s.append(lead);

  const cols = el('div', 'ps-cols');
  const col = (head, ...kids) => { const c = el('section', 'ps-col'); c.append(el('h2', 'ps-head', head), ...kids); return c; };
  const work = (title, line, where) => { const p = el('p', 'ps-item'); p.append(el('b', '', title), ` ${line} `, el('span', 'ps-where', where)); return p; };
  const works = [work('Elixir', T.cElixir, 'elixir.al'), work('Bar Martiri', T.cMartiri, 'barmartiri.com')];
  if (has('greta') && site.greta) works.push(work('Dresses by Greta', '', site.greta.host));
  const svc = (h, body) => { const p = el('p', 'ps-item'); p.append(el('b', '', h), ` ${body}`); return p; };

  const write = [];
  if (site.email) write.push(el('p', 'ps-contact', site.email));
  if (has('whatsapp') && site.whatsapp) {
    // the number stays whole: the line breaks after the word, never inside it
    const wa = el('p', 'ps-contact', 'WhatsApp ');
    wa.append(el('span', 'ps-whole', prettyPhone(site.whatsapp)));
    write.push(wa);
  }
  if (has('availability') && site.availability) write.push(el('p', 'ps-where ps-avail', availLine(T)));
  write.push(el('p', 'ps-item', T.extraLine));
  if (qr?.lang === lang) write.push(qr.svg.cloneNode(true));
  write.push(el('p', 'ps-where', host));

  cols.append(
    col(T.printWork, ...works),
    col(T.servicesHead, svc(T.svcDesignHead, T.svcDesign), svc(T.svcFrontHead, T.svcFront), svc(T.svcBackHead, T.svcBack)),
    col(T.cta, ...write),
  );
  s.append(cols);

  if (has('rates') && site.rates?.items.length) {
    const rates = el('section', 'ps-rates');
    rates.append(el('h2', 'ps-head', T.ratesHead));
    const ol = el('ol', 'ps-rates__list');
    site.rates.items.forEach((it) => {
      const li = el('li', 'ps-rate');
      li.append(el('span', 'ps-rate__name', pick(it.name, lang)), el('span', 'ps-rate__leader'), el('span', 'ps-rate__price', `${it.from ? `${T.rateFrom} ` : ''}${money(it.price, site.rates.currency, lang)}`));
      ol.append(li);
    });
    rates.append(ol);
    const note = pick(site.rates.note, lang);
    if (note) rates.append(el('p', 'ps-item', note));
    s.append(rates);
  }

  s.append(el('p', 'ps-foot', `${T.printedFrom} ${host}, ${date}.`));
  if (sheet) sheet.replaceWith(s); else document.body.append(s);
  sheet = s;
}

export function initPrint() {
  const words = [...document.querySelectorAll('[data-print]')];
  if (!has('print') || document.body.dataset.page !== 'home') return;
  // the QR code (and its maker) only for a page that can print: the front page's address in its language
  const drawQr = () => {
    const lang = state.lang;
    // the code says it was scanned off the printed edition (src/ui/from.js); built here, not from poster.js, which loads only for the press
    const at = new URL(pathFor('home', lang), location.origin);
    at.searchParams.set('utm_source', 'print');
    at.searchParams.set('utm_medium', 'qr');
    qrElement(at.href, 'ps-qr').then((svg) => { qr = { lang, svg }; if (sheet) build(); }).catch(() => {});
  };
  drawQr();
  words.forEach((w) => w.addEventListener('click', () => { build(); window.print(); }));
  window.addEventListener('beforeprint', build);
  bus.on('lang', () => { drawQr(); if (sheet) build(); });
  document.fonts?.ready.then(build);
}
