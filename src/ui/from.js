// Where a visit came from, when the link says so: a link shared with
// ?utm_source=instagram (or a poster's code, ?utm_source=poster) names its
// place. The name is kept for this tab only (sessionStorage) and goes with a
// telegram sent from it, so Stefano knows how he was found; nothing else reads
// it, and the privacy page says so. The address is then cleared of the
// names, so a link copied from here does not carry them on.
const KEY = 'sd-from';
const NAMES = ['utm_source', 'utm_medium', 'utm_campaign'];
const ALL = [...NAMES, 'utm_term', 'utm_content', 'utm_id'];

export function noteSource() {
  const q = new URLSearchParams(location.search);
  if (!ALL.some((k) => q.has(k))) return;
  const said = NAMES.map((k) => (q.get(k) || '').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 40)).filter(Boolean);
  // the first place named in a tab is the one that brought the visitor
  if (said.length) {
    try { if (!sessionStorage.getItem(KEY)) sessionStorage.setItem(KEY, said.join(' / ')); } catch { /* not kept */ }
  }
  ALL.forEach((k) => q.delete(k));
  const rest = q.toString();
  history.replaceState(history.state, '', location.pathname + (rest ? `?${rest}` : '') + location.hash);
}

/** The place the visit came from, or '' */
export function sourceOf() {
  try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; }
}
