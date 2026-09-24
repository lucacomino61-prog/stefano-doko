"""Stefano Doko mark, v6: after Milton Glaser (the rebus; warm fat letters; one picture in the word).

The idea: the O in DOKO is a sun. Read it as a word or as a picture, both work: the name,
and the coast his clients live on. The letters are Ultra, a fat Victorian slab of the kind
Push Pin Studios brought back; the rays swirl like the hair on Glaser's Dylan poster.
The small line is Old Standard italic, fat face against fine italic, the Push Pin pairing.

usage: python brand/v6/make.py   (writes brand/v6/*.svg)
"""
import math
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

OUT = Path(__file__).resolve().parent
ROOT = OUT.parent.parent
PAPER, INK, ALARM = '#EFE6D2', '#141414', '#E23B2E'


class Face:
    def __init__(self, font):
        self.gs, self.cmap, self.hmtx = font.getGlyphSet(), font.getBestCmap(), font['hmtx']
        self.upm = font['head'].unitsPerEm
        self.cap = font['OS/2'].sCapHeight or self.upm * 0.7

    def g(self, ch):
        return self.cmap[ord(ch)]

    def bounds(self, ch):
        bp = BoundsPen(self.gs)
        self.gs[self.g(ch)].draw(bp)
        return bp.bounds

    def draw(self, ch, m):
        pen = SVGPathPen(self.gs)
        self.gs[self.g(ch)].draw(TransformPen(pen, m))
        return pen.getCommands()


ULTRA = Face(TTFont(ROOT / 'tools/fonts-src/Ultra-Regular.ttf'))
ITAL = Face(TTFont(ROOT / 'public/fonts/OldStandard-Italic.woff2'))


def row(face, items, track):
    """items: chars, or ('gap', width_in_units) for the sun's slot. Returns placements and ink extent."""
    x, out = 0.0, []
    for it in items:
        if isinstance(it, tuple):
            out.append(('slot', x, it[1]))
            x += it[1] + track * face.upm
        else:
            out.append((it, x, face.hmtx[face.g(it)][0]))
            x += face.hmtx[face.g(it)][0] + track * face.upm
    first, last = out[0], out[-1]
    x0 = face.bounds(first[0])[0] + first[1] if first[0] != 'slot' else first[1]
    x1 = face.bounds(last[0])[2] + last[1] if last[0] != 'slot' else last[1] + last[2]
    return out, x0, x1


def sun(cx, cy, r, fill=ALARM, gap_fill=PAPER, rays=14, spin=18):
    """Red disc ringed by swirling flame rays, a thin paper gap between them."""
    parts = [f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{fill}"/>']
    r1, r2 = r * 1.16, r * 1.62
    d = []
    for i in range(rays):
        a = 2 * math.pi * i / rays
        half = math.pi / rays * 0.62
        tip = a + math.radians(spin)
        p = lambda rr, aa: (cx + rr * math.cos(aa), cy + rr * math.sin(aa))
        bl, br = p(r1, a - half), p(r1, a + half)
        t = p(r2, tip)
        c1 = p(r1 + (r2 - r1) * 0.55, a - half * 0.2)
        c2 = p(r1 + (r2 - r1) * 0.45, a + half * 1.6)
        d.append(f'M{bl[0]:.1f},{bl[1]:.1f} Q{c1[0]:.1f},{c1[1]:.1f} {t[0]:.1f},{t[1]:.1f} '
                 f'Q{c2[0]:.1f},{c2[1]:.1f} {br[0]:.1f},{br[1]:.1f} A{r1:.1f},{r1:.1f} 0 0 0 {bl[0]:.1f},{bl[1]:.1f} Z')
    parts.append(f'<path fill="{fill}" d="{" ".join(d)}"/>')
    return ''.join(parts)


def svg(w, h, body, bg=None, title='Stefano Doko', rx=0):
    b = f'<rect width="{w}" height="{h}" rx="{rx}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}" role="img">'
            f'<title>{title}</title>{b}{body}</svg>\n')


def write(name, text):
    (OUT / name).write_text(text, encoding='utf-8')


def lockup(ink=INK, red=ALARM, bg=None, paper=PAPER, tagline='graphic designer, Albania'):
    W, M = 900, 60                      # measure, margin
    U = ULTRA
    # row 1: STEFANO, justified to W
    r1, a0, a1 = row(U, list('STEFANO'), 0.0)
    s1 = W / (a1 - a0)
    cap1 = U.cap * s1
    # row 2: D (sun) K O, the sun's slot a bit wider than an O so the rays have room
    o_w = U.hmtx[U.g('O')][0]
    r2, b0, b1 = row(U, ['D', ('gap', o_w * 1.36), 'K', 'O'], 0.0)
    s2 = W / (b1 - b0)
    cap2 = U.cap * s2
    ray_room = cap2 * 0.28             # how far the rays poke above and below the cap line
    top1 = M
    base1 = top1 + cap1
    top2 = base1 + cap1 * 0.16 + ray_room
    base2 = top2 + cap2
    body = []
    d = [U.draw(ch, (s1, 0, 0, -s1, M + (x - a0) * s1, base1)) for ch, x, _ in r1]
    body.append(f'<path fill="{ink}" d="{" ".join(d)}"/>')
    d = []
    for ch, x, w in r2:
        if ch == 'slot':
            cx = M + (x - b0 + w / 2) * s2
            body.append(sun(cx, base2 - cap2 / 2, cap2 * 0.45, red, paper))
        else:
            d.append(U.draw(ch, (s2, 0, 0, -s2, M + (x - b0) * s2, base2)))
    body.append(f'<path fill="{ink}" d="{" ".join(d)}"/>')
    # tagline: fine italic, centred
    I = ITAL
    size = 44
    s3 = size / I.upm
    tw = sum(I.hmtx[I.g(c)][0] for c in tagline) * s3
    x = M + (W - tw) / 2
    base3 = base2 + ray_room + 62
    d = []
    for c in tagline:
        if c != ' ':
            d.append(I.draw(c, (s3, 0, 0, -s3, x, base3)))
        x += I.hmtx[I.g(c)][0] * s3
    body.append(f'<path fill="{ink}" d="{" ".join(d)}"/>')
    H = base3 + 14 + M
    return svg(W + 2 * M, H, ''.join(body), bg)


write('logo.svg', lockup())
write('logo-paper.svg', lockup(bg=PAPER))
write('logo-sq.svg', lockup(bg=PAPER, tagline='dizajner grafik, Shqipëri'))
write('logo-reversed.svg', lockup(ink=PAPER, bg=INK, paper=INK))
write('logo-ink.svg', lockup(red=INK, bg=PAPER))

# icon: the sun alone, SD in fat face knocked out of the disc
S = 640
cx = cy = S / 2
R = S * 0.25
U = ULTRA
xs = [U.bounds('S'), U.bounds('D')]
adv_s = U.hmtx[U.g('S')][0]
w_units = (adv_s + xs[1][2]) - xs[0][0]
cap_px = R * 0.78
s = cap_px / U.cap
if w_units * s > R * 1.5:
    s = R * 1.5 / w_units
x0 = cx - w_units * s / 2 - xs[0][0] * s
base = cy + U.cap * s / 2
sd = U.draw('S', (s, 0, 0, -s, x0, base)) + ' ' + U.draw('D', (s, 0, 0, -s, x0 + adv_s * s, base))
icon = sun(cx, cy, R) + f'<path fill="{PAPER}" d="{sd}"/>'
write('icon.svg', svg(S, S, icon, PAPER, rx=120))
write('icon-bare.svg', svg(S, S, icon))
print('wrote brand/v6/*.svg')
