/**
 * Each page leaves the Worker with the settings it needs, streamed in as it
 * passes (HTMLRewriter), so nothing waits on a second request:
 *   <html data-features="...">       which optional parts are live (CSS and scripts read it)
 *   <script id="site-settings">      the public settings as JSON (src/ui/site.js reads it)
 *   a[data-mail], [data-mail-text]   the real address in place of the placeholder
 *   a JSON-LD Person                 the email, the number (when WhatsApp is live) and the
 *                                    profiles (when the links are), for search engines, on the
 *                                    Person the build describes
 *   the visit counter's script       only while the analytics part is live
 * Without the Worker (a plain static preview) none of this happens and the
 * page is the page as built: every optional part off, the placeholder address.
 */
import { PLACEHOLDER_EMAIL, TOKEN_RE } from '../shared/settings.js';

// JSON inside a <script> element: "<" could close it, and the two Unicode line
// separators end a line in older parsers. (Built from char codes: a written
// escape of those two characters turned into the characters themselves once.)
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
const scriptSafe = (v) => JSON.stringify(v).split('<').join('\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');

/**
 * `beacon` is the Cloudflare Web Analytics token when that part is live: it
 * counts visits with no cookie and nothing kept in the visitor's browser.
 */
export function inject(res, pub, { beacon = '' } = {}) {
  // the same Person as tools/build-sq.mjs writes ("/#stefano", resolved against the page)
  const person = { '@context': 'https://schema.org', '@type': 'Person', '@id': '/#stefano' };
  if (pub.email) person.email = pub.email;
  if (pub.whatsapp) person.telephone = `+${pub.whatsapp}`;
  if (pub.links?.length) person.sameAs = pub.links.map((l) => l.url);
  const ld = person.email || person.telephone || person.sameAs ? `<script type="application/ld+json">${scriptSafe(person)}</script>` : '';
  const rw = new HTMLRewriter()
    .on('html', { element(el) { el.setAttribute('data-features', pub.live.join(' ')); } })
    .on('head', { element(el) { el.append(`<script type="application/json" id="site-settings">${scriptSafe(pub)}</script>${ld}`, { html: true }); } });

  if (TOKEN_RE.test(beacon)) {
    rw.on('body', { element(el) { el.append(`<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${beacon.toLowerCase()}"}'></script>`, { html: true }); } });
  }

  if (pub.email) {
    let buf = '';
    rw.on('a[data-mail]', { element(el) { el.setAttribute('href', `mailto:${pub.email}`); } });
    // A text node may arrive in several chunks: gather it, then write it once.
    rw.on('[data-mail-text]', {
      text(t) {
        buf += t.text;
        if (!t.lastInTextNode) { t.remove(); return; }
        t.replace(buf.split(PLACEHOLDER_EMAIL).join(pub.email));
        buf = '';
      },
    });
  }
  return rw.transform(res);
}
