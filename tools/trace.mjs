// Dev-only: record a Chrome trace while scrolling a stretch of the page and
// summarise the Layout / style events: how long, how much was dirty, and
// which script forced them. usage: node tools/trace.mjs [url] [fromY] [toY]
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith('http')) || 'http://localhost:3670/';
const nums = args.filter((a) => /^\d+$/.test(a)).map(Number);
const [fromY, toY] = [nums[0] ?? 600, nums[1] ?? 1600];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  headless: 'new', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', protocolTimeout: 180000,
  args: ['--mute-audio', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
await sleep(7500);
await page.evaluate((y) => window.__lenis.scrollTo(y, { immediate: true, force: true }), fromY);
await sleep(800);
await page.mouse.move(720, 450);
const file = '.impeccable/perf/trace.json';
await page.tracing.start({ path: file, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.stack', 'blink.user_timing'] });
for (let n = 0; n < 200; n++) {
  const y = await page.evaluate(() => scrollY);
  if (y >= toY) break;
  await page.mouse.wheel({ deltaY: 70 });
  await sleep(35);
}
await sleep(600);
await page.tracing.stop();
await browser.close();

const trace = JSON.parse(fs.readFileSync(file, 'utf8'));
const ev = trace.traceEvents || trace;
const pick = (name) => ev.filter((e) => e.name === name && e.ph === 'X' && e.dur);
const sum = (a) => a.reduce((s, e) => s + e.dur, 0) / 1000;
const layouts = pick('Layout');
const styles = pick('UpdateLayoutTree');
const paints = pick('Paint');
const raster = ev.filter((e) => /RasterTask|GPUTask/.test(e.name) && e.dur);
console.log(`Layout: ${layouts.length} events, ${sum(layouts).toFixed(1)}ms | Style: ${styles.length}, ${sum(styles).toFixed(1)}ms | Paint: ${paints.length}, ${sum(paints).toFixed(1)}ms | Raster/GPU tasks: ${raster.length}, ${sum(raster).toFixed(1)}ms`);
const big = layouts.sort((a, b) => b.dur - a.dur).slice(0, 8);
for (const l of big) {
  const bd = l.args?.beginData || {};
  const st = (bd.stackTrace || []).slice(0, 4).map((f) => `${f.functionName || '?'}@${(f.url || '').split('/').pop()}:${f.lineNumber}`).join(' < ');
  console.log(`layout ${(l.dur / 1000).toFixed(1)}ms dirty ${bd.dirtyObjects}/${bd.totalObjects} partial=${bd.partialLayout} | ${st}`);
}
const bigS = styles.sort((a, b) => b.dur - a.dur).slice(0, 5);
for (const s of bigS) {
  const st = (s.args?.beginData?.stackTrace || []).slice(0, 3).map((f) => `${f.functionName || '?'}@${(f.url || '').split('/').pop()}:${f.lineNumber}`).join(' < ');
  console.log(`style ${(s.dur / 1000).toFixed(1)}ms elements=${s.args?.elementCount ?? s.args?.beginData?.elementCount ?? '?'} | ${st}`);
}
