// Dev-only capture: real Chrome, headless, real GPU, muted. The Claude app's browser
// pane paints no WebGL frames, so every visual check goes through here.
// It pages down one screen at a time (stopping before the next edition, which
// carries the reader back to the top) and writes each screen as a frame;
// tools/stitch.py joins the frames into desktop.png and mobile.png.
// usage: node tools/capture.mjs [url] [--only desktop|mobile]
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith('http')) || 'http://localhost:3670/';
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const out = path.resolve('.impeccable/review/frames');
fs.mkdirSync(out, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  protocolTimeout: 120000,
  args: ['--mute-audio', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
});

const views = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
].filter((v) => !only || v.name === only);

for (const v of views) {
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`.slice(0, 240)); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + String(e.message).slice(0, 240)));
  await page.setViewport({ width: v.width, height: v.height, deviceScaleFactor: 1, isMobile: v.mobile, hasTouch: v.mobile });
  if (v.mobile) await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
  await page.goto(`${url}${url.includes('?') ? '&' : '?'}lang=en`, { waitUntil: 'networkidle0', timeout: 90000 }).catch((e) => logs.push('goto: ' + e.message));
  await sleep(7000); // intro, and the brayer's first pass
  await page.mouse.move(2, 2);
  const { H, stop } = await page.evaluate(() => {
    const ed = document.querySelector('[data-edition]');
    const top = ed ? ed.getBoundingClientRect().top + (window.__lenis?.scroll ?? scrollY) : Infinity;
    return { H: document.documentElement.scrollHeight, stop: Math.min(document.documentElement.scrollHeight - innerHeight, top - 12) };
  });
  fs.readdirSync(out).filter((f) => f.startsWith(v.name)).forEach((f) => fs.unlinkSync(path.join(out, f)));
  let i = 0;
  for (let y = 0; y <= stop; y += v.height) {
    await page.evaluate((yy) => { (window.__lenis ? window.__lenis.scrollTo(yy, { immediate: true, force: true }) : window.scrollTo(0, yy)); }, y);
    await sleep(1500);
    await page.screenshot({ path: path.join(out, `${v.name}-${String(i++).padStart(2, '0')}.png`), captureBeyondViewport: false });
  }
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(n); })(); }));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(JSON.stringify({ view: v.name, height: H, stop, frames: i, fps, overflow, logs: logs.slice(0, 12) }));
  await page.close();
}
await browser.close();
