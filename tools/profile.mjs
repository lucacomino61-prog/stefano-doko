// Dev-only: where do frames drop? Scrolls the page with real wheel events
// (so Lenis smooths it like a visitor's), stirs the band, hovers a plate,
// and records every frame interval plus the long animation frames with the
// scripts that caused them. Headless Chrome on the real GPU.
// usage: node tools/profile.mjs [url] [--mobile] [--label name]
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith('http')) || 'http://localhost:3671/';
const mobile = args.includes('--mobile');
const label = args.includes('--label') ? args[args.indexOf('--label') + 1] : (mobile ? 'mobile' : 'desktop');
const cpu = args.includes('--cpu') ? Number(args[args.indexOf('--cpu') + 1]) : 1;
const css = args.includes('--css') ? args[args.indexOf('--css') + 1] : null; // experiment: extra CSS injected after load
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  protocolTimeout: 180000,
  args: ['--mute-audio', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
});
const page = await browser.newPage();
const vw = mobile ? 390 : 1440, vh = mobile ? 844 : 900;
await page.setViewport({ width: vw, height: vh, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
if (mobile) await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');

// instrument before any page script runs
await page.evaluateOnNewDocument(() => {
  window.__frames = [];
  window.__loaf = [];
  window.__phase = 'load';
  const tick = (t) => { window.__frames.push([t, window.scrollY, window.__phase]); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        window.__loaf.push({
          start: e.startTime, dur: e.duration, block: e.blockingDuration, render: e.renderStart ? e.startTime + e.duration - e.renderStart : 0,
          style: e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0,
          phase: window.__phase, y: window.scrollY,
          scripts: (e.scripts || []).map((s) => ({ dur: Math.round(s.duration), fn: s.sourceFunctionName, src: (s.sourceURL || '').split('/').pop(), inv: s.invoker, fsl: Math.round(s.forcedStyleAndLayoutDuration || 0) })),
        });
      }
    }).observe({ type: 'long-animation-frame', buffered: true });
  } catch (e) { /* older Chrome */ }
});

await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
if (cpu > 1) { const c = await page.target().createCDPSession(); await c.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }
if (css) await page.addStyleTag({ content: css });
await sleep(7500); // intro and first ink pass

const setPhase = (p) => page.evaluate((pp) => { window.__phase = pp; }, p);

// 1. idle on the front page (band animating)
await setPhase('idle-front');
await page.mouse.move(5, 5);
await sleep(2500);

// 2. stir the band's ink
await setPhase('stir-band');
for (let i = 0; i < 70; i++) { await page.mouse.move(120 + i * 17, 420 + Math.sin(i * 0.4) * 80); await sleep(16); }
await sleep(800);

// 3. scroll the whole sheet with wheel steps, like a reader
await setPhase('scroll-down');
await page.mouse.move(vw * 0.5, vh * 0.5);
const H = await page.evaluate(() => document.documentElement.scrollHeight);
const stop = await page.evaluate(() => { const ed = document.querySelector('[data-edition]'); return ed ? ed.getBoundingClientRect().top + scrollY - innerHeight - 40 : document.documentElement.scrollHeight - innerHeight; });
for (let n = 0; n < 900; n++) {
  const y = await page.evaluate(() => scrollY);
  if (y >= stop) break;
  if (mobile) await page.evaluate((d) => window.scrollBy(0, d), 60);
  else await page.mouse.wheel({ deltaY: 70 });
  await sleep(35);
}
await sleep(1200);

// 4. hover a plate with the loupe (desktop)
if (!mobile) {
  await setPhase('loupe');
  // the front page's first case sheet, or on another sheet its first plate
  await page.evaluate(() => {
    const stack = document.querySelector('.stack');
    if (stack) {
      const top = stack.getBoundingClientRect().top + scrollY;
      window.__lenis?.scrollTo(top + document.querySelector('#elixir').nextElementSibling.offsetHeight * 0.95, { immediate: true, force: true });
    } else {
      const fig = document.querySelector('[data-plate]');
      if (fig) window.__lenis?.scrollTo(fig.getBoundingClientRect().top + scrollY - 120, { immediate: true, force: true });
    }
  });
  await sleep(1200);
  const b = await page.evaluate(() => { const r = (document.querySelector('[data-plate=elixir-desktop] img') || document.querySelector('[data-plate] img') || document.body).getBoundingClientRect(); return [r.left, Math.max(0, r.top), r.width, Math.min(r.height, innerHeight)]; });
  for (let i = 0; i < 60; i++) { await page.mouse.move(b[0] + b[2] * (0.2 + 0.6 * (i / 60)), b[1] + b[3] * (0.3 + 0.3 * Math.sin(i * 0.2))); await sleep(16); }
  await sleep(600);
}
await setPhase('end');

const data = await page.evaluate(() => ({ frames: window.__frames, loaf: window.__loaf }));
await browser.close();

// ---- report ----
const phases = {};
for (let i = 1; i < data.frames.length; i++) {
  const [t, y, ph] = data.frames[i];
  const dt = t - data.frames[i - 1][0];
  if (ph === 'load' || ph === 'end') continue;
  const key = ph === 'scroll-down' ? `scroll ${String(Math.floor(y / 1000) * 1000).padStart(5)}` : ph;
  (phases[key] ||= []).push(dt);
}
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const rows = Object.entries(phases).map(([k, a]) => ({
  phase: k, frames: a.length,
  p50: +pct(a, 0.5).toFixed(1), p95: +pct(a, 0.95).toFixed(1), max: +Math.max(...a).toFixed(1),
  over20: a.filter((d) => d > 20).length, over34: a.filter((d) => d > 34).length,
}));
console.table(rows);
const loaf = data.loaf.filter((l) => l.phase !== 'load');
const byFn = {};
for (const l of loaf) for (const s of l.scripts) { const k = `${s.fn || '?'} (${s.src}) ${s.inv || ''}`.slice(0, 110); (byFn[k] ||= { n: 0, dur: 0, fsl: 0 }); byFn[k].n++; byFn[k].dur += s.dur; byFn[k].fsl += s.fsl; }
console.log(`long animation frames after load: ${loaf.length}, total ${Math.round(loaf.reduce((a, l) => a + l.dur, 0))}ms; style+layout inside them ${Math.round(loaf.reduce((a, l) => a + l.style, 0))}ms`);
console.table(Object.entries(byFn).sort((a, b) => b[1].dur - a[1].dur).slice(0, 12).map(([k, v]) => ({ script: k, count: v.n, ms: v.dur, forcedLayoutMs: v.fsl })));
const out = path.resolve('.impeccable/perf');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, `${label}.json`), JSON.stringify({ rows, loaf: loaf.slice(0, 400) }, null, 1));
console.log('saved', path.join(out, `${label}.json`));
