// Stefano's contact card (vCard 3.0): the same card whether it is downloaded
// from the Worker (/stefano-doko.vcf) or read from the QR code on the contact
// page. Only what the site already says publicly: his name and trade, the
// country, the email, and the number only while the WhatsApp part is live.

const TITLE = {
  en: 'Graphic designer and web developer',
  sq: 'Dizajner grafik dhe zhvillues uebi',
  it: 'Grafico e sviluppatore web',
};
const COUNTRY = { en: 'Albania', sq: 'Shqipëri', it: 'Albania' };

// a value's backslashes, line breaks, commas and semicolons are escaped (RFC 2426)
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** The card as text. `phone` is digits with the country code; `url` is the site's address in this language. */
export function vcard({ email = '', phone = '', url = '', lang = 'en' } = {}) {
  const L = TITLE[lang] ? lang : 'en';
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', 'N:Doko;Stefano;;;', 'FN:Stefano Doko', `TITLE:${esc(TITLE[L])}`];
  if (email) lines.push(`EMAIL:${esc(email)}`);
  if (/^\d{8,15}$/.test(phone)) lines.push(`TEL;TYPE=CELL:+${phone}`);
  if (url) lines.push(`URL:${url}`);
  lines.push(`ADR;TYPE=WORK:;;;;;;${esc(COUNTRY[L])}`, 'END:VCARD');
  return `${lines.join('\r\n')}\r\n`;
}

/** The front page's address in each language, for the card's URL line. */
export const homePath = (lang) => (lang === 'sq' || lang === 'it' ? `/${lang}/` : '/');
