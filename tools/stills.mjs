// Dev-only: render the band's still from the live page in headless Chrome on
// the real GPU.
//   public/band-poster.jpg  the engraving band, shown when WebGL is missing
//   public/og.png           only with --og: a capture of the page (1200x630).
//                           Since 2026-09-24 the shipped link preview comes
//                           from the brand set (brand/final/templates/og-site.html),
//                           so --og replaces it.
// usage: npm run dev, then node tools/stills.mjs [url] [--og]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.argv.find((a) => a.startsWith('http')) || 'http://localhost:3670/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--mute-audio', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});

// the band, at a moment when the van is on the road below the bottles
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1.25 });
await page.goto(`${url}?lang=en`, { waitUntil: 'networkidle0' });
await sleep(8200);
await page.mouse.move(5, 5);
await sleep(600);
// a clipped page capture: element captures scroll and re-render, which hangs on a live canvas
const clip = await page.evaluate(() => { const r = document.querySelector('[data-gl="band"]').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
await page.screenshot({ path: path.join(root, 'public/band-poster.jpg'), type: 'jpeg', quality: 84, clip, captureBeyondViewport: false });
console.log('band-poster.jpg');

// the social card, only when asked: public/og.png is the brand set's preview now
if (process.argv.includes('--og')) {
  const og = await browser.newPage();
  await og.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await og.goto(`${url}?lang=en`, { waitUntil: 'networkidle0' });
  await sleep(8200);
  await og.mouse.move(5, 5);
  await og.evaluate(() => window.__lenis?.scrollTo(84, { immediate: true, force: true }));
  await sleep(900);
  await og.screenshot({ path: path.join(root, 'public/og.png'), captureBeyondViewport: false });
  console.log('og.png');
}
await browser.close();
