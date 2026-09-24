// Renders the v7 sheet and a 1080px PNG of each mark. usage: python brand/v8/make.py && node brand/v8/render.mjs
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const url = (f) => pathToFileURL(path.join(dir, f)).href;
const names = ['bar-eye', 'bar-nib', 'fukuda-sunset', 'fukuda-drop', 'leader-s', 'leader-nib', 'build-dots', 'build-lines'];
const browser = await puppeteer.launch({ headless: 'new', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
await page.goto(url('sheet.html'), { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(dir, 'sheet.png'), fullPage: true });
await page.setViewport({ width: 1080, height: 1080 });
for (const n of names) {
  await page.setContent(`<style>*{margin:0}img{display:block;width:1080px;height:1080px}</style><img src="${url(n + '-paper.svg')}">`, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(dir, n + '.png'), clip: { x: 0, y: 0, width: 1080, height: 1080 } });
}
await browser.close();
