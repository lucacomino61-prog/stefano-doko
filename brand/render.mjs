// Renders the logo sheet and PNG exports of each mark.
// usage: python brand/make_logo.py && node brand/render.mjs
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const url = (f) => pathToFileURL(path.join(dir, f)).href;
const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--allow-file-access-from-files'],
});
const page = await browser.newPage();

await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
await page.goto(url('sheet.html'), { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(dir, 'logo-sheet.png'), fullPage: true });

// transparent PNG exports
const exports = [
  ['logo-seal.svg', 'logo-seal.png', 2000, 2000],
  ['logo-seal-simple.svg', 'logo-seal-simple.png', 1080, 1080],
  ['logo-mono.svg', 'logo-mono-512.png', 512, 512],
];
for (const [src, out, w, h] of exports) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.setContent(`<style>*{margin:0}img{display:block;width:${w}px;height:${h}px}</style><img src="${url(src)}">`, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(dir, out), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
}
await browser.close();
console.log('wrote logo-sheet.png and PNG exports');
