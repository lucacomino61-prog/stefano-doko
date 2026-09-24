// Renders v3 PNGs. usage: python brand/v6/make.py && node brand/v6/render.mjs
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const url = (f) => pathToFileURL(path.join(dir, f)).href;
const browser = await puppeteer.launch({ headless: 'new', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
{
  await page.setViewport({ width: 1600, height: 900 });
  await page.goto(url('sheet.html'), { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(dir, 'sheet.png'), fullPage: true });
}
for (const [src, out, w, h] of [['logo-paper.svg', 'logo.png', 2040, 1176], ['logo-sq.svg', 'logo-sq.png', 2040, 1176], ['logo-reversed.svg', 'logo-reversed.png', 2040, 1176], ['icon.svg', 'icon-1080.png', 1080, 1080]]) {
  await page.setViewport({ width: w, height: h });
  await page.setContent(`<style>*{margin:0}img{display:block;width:${w}px;height:${h}px}</style><img src="${url(src)}">`, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(dir, out), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
}
await browser.close();
