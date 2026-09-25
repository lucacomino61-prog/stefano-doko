// The weather over Albania, for the engraving's sky: MET Norway's reading for
// Tirana, asked of the site's own Worker (/api/weather, worker/public-api.js),
// which asks MET Norway at most every half hour. A visitor's browser never
// asks MET Norway itself.
// Served without the Worker there is no reading, and the sky stays as it was
// cut: fair, three clouds.
//
// `?weather=<MET symbol>` sets it by hand, for the stills and for checking:
// clearsky, fair, partlycloudy, cloudy, fog, lightrain, rain, heavyrain,
// sleet, lightsnow, snow, heavysnow, rainandthunder, heavyrainandthunder…
// (`&wind=12` for a gale, in m/s).

const params = new URLSearchParams(location.search);
const asked = params.get('weather');

// A symbol read into what the engraving draws: the sky (clear, fair, partly,
// overcast, fog), what falls (rain, sleet, snow; 1 light, 2, 3 heavy), thunder,
// the wind, and the caption's word for it.
export function readSymbol(code, { temp = null, wind = null, from = null, source = 'met' } = {}) {
  // "_day", "_night" and "_polartwilight" say only when; "lightssleet…" is MET's own spelling
  const base = String(code || '').toLowerCase().replace(/_(day|night|polartwilight)$/, '');
  const thunder = /thunder/.test(base);
  const b = base.replace(/andthunder$/, '');
  const fall = /snow/.test(b) ? 'snow' : /sleet/.test(b) ? 'sleet' : /rain/.test(b) ? 'rain' : null;
  const amount = !fall ? 0 : /^heavy/.test(b) ? 3 : /^lights?/.test(b) ? 1 : 2;
  const fog = b === 'fog';
  const sky = fall || thunder || b === 'cloudy' ? 'overcast' : fog ? 'fog' : b === 'partlycloudy' ? 'partly' : b === 'fair' ? 'fair' : 'clear';
  const word = thunder ? 'thunder'
    : fall === 'rain' ? ['lightrain', 'rain', 'heavyrain'][amount - 1]
    : fall === 'snow' ? ['lightsnow', 'snow', 'heavysnow'][amount - 1]
    : fall === 'sleet' ? 'sleet'
    : fog ? 'fog' : sky === 'overcast' ? 'cloudy' : sky;
  return {
    code: base,
    sky,
    fall,
    amount,
    thunder,
    fog,
    // a calm day's breeze when nothing was read
    wind: Number.isFinite(wind) ? Math.max(0, wind) : 3,
    from: Number.isFinite(from) ? from : 270,
    temp: Number.isFinite(temp) ? temp : null,
    word,
    met: source === 'met',
  };
}

export async function weatherNow() {
  if (asked) return readSymbol(asked, { wind: Number(params.get('wind')) || null, source: 'hand' });
  try {
    const res = await fetch('/api/weather', { headers: { accept: 'application/json' } });
    // a static server answers with the page itself: no reading
    if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) return null;
    const j = await res.json();
    if (!j || !j.ok) return null;
    return readSymbol(j.code, { temp: j.temp, wind: j.wind, from: j.from, source: 'met' });
  } catch {
    return null;
  }
}
