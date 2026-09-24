// Dev-only: CPU profile of one interaction, aggregated by function.
// usage: node tools/cpu.mjs [url] [stir|scroll] [fromY] [toY]
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith('http')) || 'http://localhost:3670/';
const mode = args.find((a) => a === 'stir' || a === 'scroll') || 'stir';
const nums = args.filter((a) => /^\d+$/.test(a)).map(Number);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  headless: 'new', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', protocolTimeout: 180000,
  args: ['--mute-audio', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
await sleep(7500);
await page.mouse.move(5, 5);
if (mode === 'scroll') { await page.evaluate((y) => window.__lenis.scrollTo(y, { immediate: true, force: true }), nums[0] ?? 0); await sleep(800); }
const cdp = await page.target().createCDPSession();
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');
if (mode === 'stir') {
  for (let i = 0; i < 40; i++) { await page.mouse.move(120 + i * 25, 420 + Math.sin(i * 0.4) * 80); await sleep(16); }
} else {
  await page.mouse.move(720, 450);
  for (let n = 0; n < 200; n++) { const y = await page.evaluate(() => scrollY); if (y >= (nums[1] ?? 1500)) break; await page.mouse.wheel({ deltaY: 70 }); await sleep(35); }
}
const { profile } = await cdp.send('Profiler.stop');
await browser.close();

const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const dt = profile.timeDeltas;
profile.samples.forEach((id, i) => {
  const n = byId.get(id);
  const cf = n.callFrame;
  const key = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop().split('?')[0]}:${cf.lineNumber + 1}`;
  self.set(key, (self.get(key) || 0) + (dt[i] || 0) / 1000);
});
const rows = [...self.entries()].filter(([k]) => !/^\(idle\)|^\(program\)|^\(garbage/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 18);
console.table(rows.map(([k, ms]) => ({ fn: k.slice(0, 90), selfMs: +ms.toFixed(1) })));
const gc = [...self.entries()].filter(([k]) => /garbage/.test(k)).reduce((a, [, v]) => a + v, 0);
console.log('GC ms', gc.toFixed(1));
