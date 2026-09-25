// Where the sun stands over Albania: its bearing (degrees from north, clockwise)
// and its height above the horizon, at a moment, seen from the middle of the
// country (the site names no city). NOAA's solar position formulas, good to a
// fraction of a degree, which is far finer than the engraving needs.
const LAT = 41.15;
const LON = 20.17;
const rad = Math.PI / 180;

export function sunOverAlbania(date = new Date()) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545) / 36525;
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(M * rad) * (1.914602 - T * (0.004817 + 0.000014 * T))
    + Math.sin(2 * M * rad) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * rad) * 0.000289;
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * rad);
  const eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(omega * rad);
  const decl = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad));
  const y = Math.tan((eps / 2) * rad) ** 2;
  // the equation of time, in minutes
  const eqTime = (4 / rad) * (y * Math.sin(2 * L0 * rad) - 2 * e * Math.sin(M * rad)
    + 4 * e * y * Math.sin(M * rad) * Math.cos(2 * L0 * rad) - 0.5 * y * y * Math.sin(4 * L0 * rad) - 1.25 * e * e * Math.sin(2 * M * rad));
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  let ha = (((minutes + eqTime + 4 * LON) % 1440) + 1440) % 1440 / 4 - 180; // hour angle
  if (ha < -180) ha += 360;
  const lat = LAT * rad;
  const cosZ = Math.min(1, Math.max(-1, Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha * rad)));
  const zenith = Math.acos(cosZ);
  const a = Math.acos(Math.min(1, Math.max(-1, (Math.sin(lat) * cosZ - Math.sin(decl)) / (Math.cos(lat) * Math.sin(zenith) || 1e-9)))) / rad;
  return { azimuth: ha > 0 ? (a + 180) % 360 : (540 - a) % 360, elevation: 90 - zenith / rad };
}

// `?sun=HH:MM` lights the engraving as at that hour in Albania today (for the
// stills and for checking dawn, noon and night); otherwise it is now.
const asked = (() => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(new URLSearchParams(location.search).get('sun') || '');
  if (!m) return null;
  const now = new Date();
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Tirane', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
  }).formatToParts(now).map((x) => [x.type, x.value]));
  // how far Albania's clock is ahead of UTC now, then that hour on Albania's today
  const ahead = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(now.getTime() / 60000) * 60000;
  return new Date(Date.UTC(+p.year, +p.month - 1, +p.day, +m[1], +m[2]) - ahead);
})();

export const sunNow = () => sunOverAlbania(asked || new Date());
// up: above the sea's edge, as the engraving draws it
export const sunIsUp = (s = sunNow()) => s.elevation > -1;
