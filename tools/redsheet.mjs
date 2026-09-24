// Dev-only: what does the first sight of one part of the page cost (the red
// EXTRA sheet by default)? Walks the page down to just above it (so everything
// before it has been drawn once), then wheel-scrolls it into view while
// recording a Chrome trace with the GPU threads, and every frame interval.
// Each run starts Chrome with an empty shader cache, like a first visit.
// Reports slow frames and every GPU shader compile: which Skia op asked for it
// and where the page stood.
// usage: node tools/redsheet.mjs [url] [--at ".sheet--extra"] [--mobile] [--cpu 4]
//        [--w 1920] [--h 960] [--css "..."] [--runs 2] [--profile DIR] [--quiet]
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const url = args.find((a) => a.startsWith('http')) || 'http://localhost:3671/';
const mobile = args.includes('--mobile');
const W = Number(opt('--w', mobile ? 390 : 1440)), H = Number(opt('--h', mobile ? 844 : 900));
const at = opt('--at', '.sheet--extra');
const cpu = Number(opt('--cpu', 1));
const css = opt('--css', null);
const runs = Number(opt('--runs', 1));
const quiet = args.includes('--quiet');
// --profile DIR keeps Chrome's profile (and its on-disk shader cache) between
// runs, like a returning visitor; without it every run is a first visit
const profile = opt('--profile', null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const file = '.impeccable/perf/redsheet-trace.json';

const CATS = ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame',
  'toplevel', 'cc', 'gpu', 'viz', 'skia', 'disabled-by-default-skia', 'disabled-by-default-skia.gpu', 'disabled-by-default-skia.shaders',
  'gpu.angle', 'benchmark', 'disabled-by-default-gpu.service',
  // --invalidations: which elements get repainted, and why
  ...(args.includes('--invalidations') ? ['disabled-by-default-devtools.timeline.invalidationTracking'] : [])];

const summary = [];
for (let run = 0; run < runs; run++) {
  const browser = await puppeteer.launch({
    headless: 'new', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', protocolTimeout: 180000,
    ...(profile ? { userDataDir: profile } : {}),
    args: ['--mute-audio', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  if (mobile) await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
  if (css) await page.addStyleTag({ content: css });
  await sleep(7500);
  const geo = await page.evaluate((sel) => {
    const s = document.querySelector(sel);
    const r = s.getBoundingClientRect();
    return { top: r.top + scrollY, height: r.height, vh: innerHeight };
  }, at);
  const y0 = Math.max(0, geo.top - geo.vh - 500);
  // walk down to the target the way a reader would, so everything above it has
  // been drawn (and its shaders compiled) before the recording starts
  for (let y = 0; y < y0; y += Math.round(geo.vh * 0.4)) {
    await page.evaluate((v) => window.__lenis.scrollTo(v, { immediate: true, force: true }), y);
    await sleep(320);
  }
  await page.evaluate((y) => window.__lenis.scrollTo(y, { immediate: true, force: true }), y0);
  await sleep(1800);
  if (cpu > 1) await (await page.createCDPSession()).send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await page.mouse.move(W / 2, H / 2);
  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const loop = (t) => {
      window.__frames.push([t - last, scrollY, t]);
      last = t;
      console.timeStamp(`y${Math.round(scrollY)}`);
      if (window.__frames.length < 4000) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  await page.tracing.start({ path: file, categories: CATS });
  const t0 = await page.evaluate(() => performance.now());
  const endY = geo.top + Math.min(geo.height, geo.vh * 1.5) - geo.vh * 0.5;
  for (let n = 0; n < 400; n++) {
    const y = await page.evaluate(() => scrollY);
    if (y >= endY) break;
    await page.mouse.wheel({ deltaY: 70 });
    await sleep(35);
  }
  await sleep(700);
  await page.tracing.stop();
  const frames = (await page.evaluate(() => window.__frames)).filter((f) => f[2] >= t0);
  await browser.close();

  const trace = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ev = trace.traceEvents || trace;
  const xs = ev.filter((e) => e.ph === 'X' && e.dur);
  const encloses = (k, c) => k.pid === c.pid && k.tid === c.tid && k.ts <= c.ts && k.ts + k.dur >= c.ts + c.dur;

  // where the page stood when each compile ran (the frame loop stamps scrollY into the trace)
  const stamps = ev.filter((e) => e.name === 'TimeStamp' && /^y[0-9]+$/.test(e.args?.data?.message || ''))
    .map((e) => [e.ts, +e.args.data.message.slice(1)]).sort((a, b) => a[0] - b[0]);
  const yAt = (ts) => { let y = null; for (const [t, v] of stamps) { if (t <= ts) y = v; else break; } return y; };
  const compiles = xs.filter((e) => e.name === 'shader_compile');
  const ops = {};
  const atList = compiles.map((c) => {
    const y = yAt(c.ts);
    const op = xs.filter((k) => encloses(k, c) && /Op$/.test(k.name)).sort((a, b) => a.dur - b.dur)[0];
    const viz = xs.some((k) => encloses(k, c) && /SkiaOutputSurface/.test(k.name));
    const name = `${op ? op.name : '?'}${viz ? '(viz)' : ''}`;
    ops[name] = (ops[name] || 0) + Math.round(c.dur / 1000);
    const where = y === null ? '?' : `target top ${Math.round(geo.top - y)}px`;
    return `${name} ${Math.round(c.dur / 1000)}ms @y${y} (${where})`;
  });
  // the longest GPU-process tasks, and what was inside them
  const gpuLong = xs.filter((e) => /GPUTask|SkiaOutputSurfaceImplOnGpu::FinishPaintRenderPass|DoEndRasterCHROMIUM$/.test(e.name) && e.dur > 12000)
    .sort((a, b) => b.dur - a.dur).slice(0, 6)
    .map((e) => {
      const kids = xs.filter((k) => k !== e && encloses(e, k) && k.dur > 3000 && /Op$|compile|Flush|Raster|Decode|Upload|Blur|Tessell|Path/i.test(k.name))
        .sort((a, b) => b.dur - a.dur).slice(0, 3).map((k) => `${k.name.replace(/^.*?(\w+::\w+|\w+Op)\b.*$/, '$1')} ${Math.round(k.dur / 1000)}ms`);
      return `${e.name.replace(/^.*?(\w+::\w+|GPUTask).*$/, '$1')} ${Math.round(e.dur / 1000)}ms @y${yAt(e.ts)}${kids.length ? ' [' + kids.join(', ') + ']' : ''}`;
    });
  const compileMs = Math.round(compiles.reduce((m, c) => m + c.dur, 0) / 1000);
  const slow = frames.filter((f) => f[0] > 20);
  const worst = frames.reduce((m, f) => Math.max(m, f[0]), 0);
  // main-thread paint work over the recording: how often and how much
  const tname = new Map();
  for (const e of ev) if (e.ph === 'M' && e.name === 'thread_name') tname.set(`${e.pid}:${e.tid}`, e.args.name);
  const onMain = xs.filter((e) => tname.get(`${e.pid}:${e.tid}`) === 'CrRendererMain');
  const total = (name) => Math.round(onMain.filter((e) => e.name === name).reduce((m, e) => m + e.dur, 0) / 1000);
  const count = (name) => onMain.filter((e) => e.name === name).length;
  const mainWork = { paintMs: total('Paint'), layerizeMs: total('Layerize'), layerizeRuns: count('Layerize'), styleMs: total('UpdateLayoutTree') };
  summary.push({ run, frames: frames.length, over20: slow.length, over34: frames.filter((f) => f[0] > 34).length,
    worst: +worst.toFixed(1), compiles: compiles.length, compileMs, ops, at: atList, gpuLong, mainWork });
  if (quiet) continue;

  if (args.includes('--invalidations')) {
    const inv = {};
    for (const e of ev) {
      if (!/Invalidation/.test(e.name)) continue;
      const d = e.args?.data || {};
      const key = `${e.name} ${d.nodeName || '?'} ${d.reason || d.cause?.reason || ''}`.trim();
      inv[key] = (inv[key] || 0) + 1;
    }
    console.log('invalidations (count, event, node, reason):');
    Object.entries(inv).sort((a, b) => b[1] - a[1]).slice(0, 16).forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${k.slice(0, 150)}`));
  }
  console.log(`\nrun ${run}: ${frames.length} frames, ${at} top ${Math.round(geo.top)}, viewport ${geo.vh}`);
  for (const f of slow) console.log(`  slow frame ${f[0].toFixed(1)}ms at scrollY ${Math.round(f[1])} (target top on screen at ${Math.round(geo.top - f[1])}px)`);
  for (const a of atList) console.log(`  compile ${a}`);
  for (const g of gpuLong) console.log(`  gpu ${g}`);
}
console.log('\nsummary', JSON.stringify(summary));
