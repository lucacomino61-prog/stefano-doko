// QR codes as one SVG path: the print edition's (the site's address) and the
// contact card's (the whole card, so a phone can save it without a network).
// The maker (qrcode-generator) is fetched only when a code is drawn.
let maker = null;

async function load() {
  if (!maker) {
    maker = (await import('qrcode-generator')).default;
    // the card carries letters like ë: they are written as UTF-8, which phones read
    if (maker.stringToBytesFuncs?.['UTF-8']) maker.stringToBytes = maker.stringToBytesFuncs['UTF-8'];
  }
  return maker;
}

/**
 * The modules of a code for `text`: its size in modules and one path of its dark
 * squares. `ec` is how much of the code may be lost and still read: 'M' for paper,
 * which gets scuffed; 'L' for a screen, where the card's long text then fits in
 * fewer, larger squares that a phone reads more easily.
 */
export async function qrModules(text, ec = 'M') {
  const qr = (await load())(0, ec);
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return { n, d };
}

/** The code's squares, for drawing it on a canvas (the poster): its size and whether each is dark. */
export async function qrCells(text, ec = 'M') {
  const qr = (await load())(0, ec);
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  return { n, dark: (r, c) => qr.isDark(r, c) };
}

/** The code as an <svg> element, with a quiet zone of two modules (its frame's padding adds the rest). */
export async function qrElement(text, className = '', ec = 'M') {
  const { n, d } = await qrModules(text, ec);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `-2 -2 ${n + 4} ${n + 4}`);
  if (className) svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('shape-rendering', 'crispEdges');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', d);
  svg.append(path);
  return svg;
}

/** The code as a standalone SVG file's text, black on white with the full quiet zone (four modules), for print. */
export async function qrFile(text, size = 60) {
  const { n, d } = await qrModules(text, 'M');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${size}mm" height="${size}mm" viewBox="-4 -4 ${n + 8} ${n + 8}" shape-rendering="crispEdges"><rect x="-4" y="-4" width="${n + 8}" height="${n + 8}" fill="#fff"/><path d="${d}" fill="#000"/></svg>\n`;
}
