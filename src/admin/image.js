// The portrait is resized in the browser before it is sent: at most 1400
// pixels on its long side, as a JPEG. The Worker only checks and keeps it.

export async function resizePhoto(file, max = 1400) {
  let bmp;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('photo_read');
  }
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  if (w < 400 && h < 400) { bmp.close?.(); throw new Error('bad_size'); }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
  if (!blob) throw new Error('photo_read');
  return { blob, w, h };
}
