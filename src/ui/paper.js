// Paper made in the browser: a fine grain tile laid under everything, and a
// speckle mask for the counter's rubber stamp (the dots where the ink did not
// take). Since the modern edition (2026-09-25) the grain is lighter and the
// coarse mottle of old newsprint is no longer made.
// Generated from a fixed seed, so every visit gets the same sheet.

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tile(size, paint) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  paint(img.data, size);
  ctx.putImageData(img, 0, 0);
  return c;
}

export function makeGrain() {
  const r = rng(23092026);
  const c = tile(256, (d, s) => {
    for (let i = 0; i < s * s; i++) {
      const n = r();
      const o = i * 4;
      if (n < 0.045) { // ink speck
        d[o] = 20; d[o + 1] = 20; d[o + 2] = 20; d[o + 3] = 6 + r() * 14;
      } else if (n > 0.975) { // bright fibre dot
        d[o] = 255; d[o + 1] = 252; d[o + 2] = 240; d[o + 3] = 18 + r() * 22;
      }
    }
  });
  // a few fibres: short hairlines in both tones
  const ctx = c.getContext('2d');
  ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const x = r() * 256, y = r() * 256, a = r() * Math.PI, l = 6 + r() * 16;
    ctx.strokeStyle = r() > 0.5 ? 'rgba(20,20,20,0.045)' : 'rgba(255,250,236,0.16)';
    ctx.lineWidth = 0.6 + r() * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 4, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * 4, x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  return c;
}

export function makeSpeckle() {
  const r = rng(1905);
  const c = tile(180, (d, s) => {
    for (let i = 0; i < s * s; i++) {
      const o = i * 4;
      d[o] = d[o + 1] = d[o + 2] = 255;
      d[o + 3] = 255;
    }
  });
  const ctx = c.getContext('2d');
  ctx.globalCompositeOperation = 'destination-out';
  // pinholes and a few starved patches, as a worn block prints
  for (let i = 0; i < 56; i++) {
    const x = r() * 180, y = r() * 180, rad = 0.3 + r() * r() * 1.05;
    ctx.fillStyle = `rgba(0,0,0,${0.55 + r() * 0.45})`;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 3; i++) {
    const x = r() * 180, y = r() * 180;
    for (let k = 0; k < 12; k++) {
      ctx.fillStyle = `rgba(0,0,0,${0.12 + r() * 0.2})`;
      ctx.beginPath(); ctx.arc(x + (r() - 0.5) * 12, y + (r() - 0.5) * 8, 0.4 + r() * 1.1, 0, Math.PI * 2); ctx.fill();
    }
  }
  return c;
}

export function makeMottle() {
  // coarse stock: small clumps of pulp and short fibres, in both tones
  const r = rng(61);
  const c = document.createElement('canvas');
  c.width = c.height = 640;
  const ctx = c.getContext('2d');
  const wrap = (x, y, f) => { for (const ox of [-640, 0, 640]) for (const oy of [-640, 0, 640]) f(x + ox, y + oy); };
  for (let i = 0; i < 1500; i++) {
    const x = r() * 640, y = r() * 640, rx = 1.2 + r() * 4.5, ry = rx * (0.4 + r() * 0.6), a = r() * Math.PI;
    const dark = r() > 0.5;
    ctx.fillStyle = dark ? `rgba(92,70,40,${0.02 + r() * 0.035})` : `rgba(255,251,240,${0.05 + r() * 0.07})`;
    wrap(x, y, (px, py) => { ctx.beginPath(); ctx.ellipse(px, py, rx, ry, a, 0, Math.PI * 2); ctx.fill(); });
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const x = r() * 640, y = r() * 640, a = r() * Math.PI, l = 4 + r() * 16;
    ctx.strokeStyle = r() > 0.5 ? `rgba(80,62,38,${0.05 + r() * 0.06})` : `rgba(255,250,236,${0.18 + r() * 0.2})`;
    ctx.lineWidth = 0.5 + r() * 0.7;
    wrap(x, y, (px, py) => { ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + (r() - 0.5) * 3, py + Math.sin(a) * l * 0.5 + (r() - 0.5) * 3, px + Math.cos(a) * l, py + Math.sin(a) * l); ctx.stroke(); });
  }
  return c;
}

// The tiles go to CSS as blob: URLs. A data: URL would put a megabyte of
// base64 inside a custom property, and every element that re-computes its
// style (a card being dealt, the pill, a sheet's veil) would re-parse it.
function blobUrl(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b ? URL.createObjectURL(b) : canvas.toDataURL('image/png')), 'image/png');
  });
}

export async function layPaper() {
  const root = document.documentElement.style;
  try {
    const [grain, speckle] = await Promise.all([makeGrain(), makeSpeckle()].map(blobUrl));
    root.setProperty('--grain', `url(${grain})`);
    root.setProperty('--speckle', `url(${speckle})`);
  } catch { /* canvas blocked: plain paper still reads */ }
}
