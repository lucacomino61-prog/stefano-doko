# Dev-only: join the capture frames into one tall image per view.
# usage: python tools/stitch.py   (reads .impeccable/review/frames, writes desktop.png and mobile.png)
import glob
import os
from PIL import Image

root = os.path.join(os.path.dirname(__file__), '..', '.impeccable', 'review')
for view in ('desktop', 'mobile'):
    frames = sorted(glob.glob(os.path.join(root, 'frames', f'{view}-*.png')))
    if not frames:
        continue
    ims = [Image.open(f).convert('RGB') for f in frames]
    w, h = ims[0].size
    sheet = Image.new('RGB', (w, h * len(ims)), '#141414')
    for i, im in enumerate(ims):
        sheet.paste(im, (0, i * h))
    out = os.path.join(root, f'{view}.png')
    sheet.save(out, optimize=True)
    print(view, len(ims), sheet.size)
