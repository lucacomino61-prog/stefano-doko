"""Stefano Doko logo set, drawn from the site's own faces (Ultra, Anybody) as outlines.

Marks
  seal       the press seal: alarm-red stamp, ring text, SD in Ultra with a misregistered ink plate
  mono       SD on an ink block, for favicon / avatar sizes
  wordmark   seal + STEFANO DOKO lockup, on newsprint and reversed on ink

usage: python brand/make_logo.py   (writes brand/*.svg)
"""
import math
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'brand'
PAPER, AGED, INK, ALARM = '#EFE6D2', '#E3D6BA', '#141414', '#E23B2E'

ultra = TTFont(ROOT / 'tools/fonts-src/Ultra-Regular.ttf')
anybody_vf = TTFont(ROOT / 'public/fonts/Anybody-VF.woff2')
anybody_black = instancer.instantiateVariableFont(TTFont(ROOT / 'public/fonts/Anybody-VF.woff2'), {'wght': 900, 'wdth': 64})
anybody_label = instancer.instantiateVariableFont(anybody_vf, {'wght': 800, 'wdth': 90})


class Face:
    def __init__(self, font):
        self.font = font
        self.gs = font.getGlyphSet()
        self.cmap = font.getBestCmap()
        self.upm = font['head'].unitsPerEm
        self.hmtx = font['hmtx']
        os2 = font['OS/2']
        self.cap = getattr(os2, 'sCapHeight', 0) or self.upm * 0.7

    def name(self, ch):
        return self.cmap[ord(ch)]

    def adv(self, ch):
        return self.hmtx[self.name(ch)][0]

    def draw(self, ch, matrix):
        """SVG path data for one glyph under an affine matrix (font units, y up)."""
        pen = SVGPathPen(self.gs)
        self.gs[self.name(ch)].draw(TransformPen(pen, matrix))
        return pen.getCommands()

    def bounds(self, text, track=0):
        bp = BoundsPen(self.gs)
        x = 0
        for ch in text:
            if ch != ' ':
                self.gs[self.name(ch)].draw(TransformPen(bp, (1, 0, 0, 1, x, 0)))
            x += self.adv(ch) + track
        return bp.bounds  # xmin, ymin, xmax, ymax in font units


U, A, L = Face(ultra), Face(anybody_black), Face(anybody_label)


def line(face, text, x, y, size, track=0.0):
    """Set a line of text with its baseline at (x, y) in SVG space. track is in em."""
    s = size / face.upm
    t = track * face.upm
    d, cx = [], 0
    for ch in text:
        if ch != ' ':
            d.append(face.draw(ch, (s, 0, 0, -s, x + cx * s, y)))
        cx += face.adv(ch) + t
    return ' '.join(d), (cx - t) * s


def width(face, text, size, track=0.0):
    t = track * face.upm
    return (sum(face.adv(c) for c in text) + t * (len(text) - 1)) * size / face.upm


def star(cx, cy, r, rot=-90):
    pts = []
    for i in range(10):
        rr = r if i % 2 == 0 else r * 0.42
        a = math.radians(rot + i * 36)
        pts.append(f'{cx + rr * math.cos(a):.2f},{cy + rr * math.sin(a):.2f}')
    return 'M' + ' L'.join(pts) + ' Z'


def arc_text(text, cx, cy, r_mid, size, face, span_deg, bottom=False):
    """Centre text on the top arc (clockwise) or the bottom arc (reading upright),
    tracked so it spans span_deg. r_mid is the radius at the letters' mid-height."""
    s = size / face.upm
    half_cap = face.cap * s / 2
    widths = [face.adv(ch) * s for ch in text]
    span = math.radians(span_deg) * r_mid
    gap = (span - sum(widths)) / (len(text) - 1)
    r_base = r_mid + half_cap if bottom else r_mid - half_cap
    d, pos = [], 0.0
    for ch, w in zip(text, widths):
        mid = pos + w / 2 - span / 2          # arc offset from the arc's centre
        if bottom:
            theta = math.pi / 2 - mid / r_mid
            rot = theta - math.pi / 2
        else:
            theta = -math.pi / 2 + mid / r_mid
            rot = theta + math.pi / 2
        px, py = cx + r_base * math.cos(theta), cy + r_base * math.sin(theta)
        c, sn = math.cos(rot), math.sin(rot)
        ox = -w / 2
        if ch != ' ':
            d.append(face.draw(ch, (s * c, s * sn, s * sn, -s * c, px + ox * c, py + ox * sn)))
        pos += w + gap
    return ' '.join(d)


def sd(cx, cy, height, face=U, max_w=None):
    """SD centred on (cx, cy): cap height = height, shrunk if wider than max_w."""
    xmin, ymin, xmax, ymax = face.bounds('SD')
    size = height / (face.cap / face.upm)
    if max_w and (xmax - xmin) * size / face.upm > max_w:
        size = max_w / ((xmax - xmin) / face.upm)
    s = size / face.upm
    w = (xmax - xmin) * s
    h = (ymax - ymin) * s
    x = cx - w / 2 - xmin * s
    y = cy + h / 2 + ymin * s
    d, _ = line(face, 'SD', x, y, size)
    return d


def seal(cx, cy, R, ring=True):
    """The press seal as a list of SVG elements."""
    el = [f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="{ALARM}"/>',
          f'<circle cx="{cx}" cy="{cy}" r="{R * 0.955:.2f}" fill="none" stroke="{PAPER}" stroke-width="{R * 0.016:.2f}"/>']
    if ring:
        inner = R * 0.70
        r_mid = (R * 0.955 + inner) / 2
        size = R * 0.15
        el.append(f'<circle cx="{cx}" cy="{cy}" r="{inner:.2f}" fill="none" stroke="{PAPER}" stroke-width="{R * 0.012:.2f}"/>')
        el.append(f'<path fill="{PAPER}" d="{arc_text("STEFANO DOKO", cx, cy, r_mid, size, A, 128)}"/>')
        el.append(f'<path fill="{PAPER}" d="{arc_text("DIZAJNER GRAFIK", cx, cy, r_mid, size, A, 128, bottom=True)}"/>')
        el.append(f'<path fill="{PAPER}" d="{star(cx - r_mid, cy, R * 0.055)} {star(cx + r_mid, cy, R * 0.055)}"/>')
        h, max_w, dy = R * 0.40, inner * 1.52, -R * 0.05
        # the country, small, under SD
        lsize = R * 0.075 / (L.cap / L.upm)
        lw = width(L, 'SHQIPËRI', lsize, 0.16)
        d, _ = line(L, 'SHQIPËRI', cx - lw / 2, cy + R * 0.39, lsize, 0.16)
        el.append(f'<path fill="{PAPER}" d="{d}"/>')
    else:
        h, max_w, dy = R * 0.62, R * 1.42, 0
    off = h * 0.05
    el.append(f'<path fill="{INK}" d="{sd(cx + off, cy + dy + off, h, max_w=max_w)}"/>')   # ink plate, out of register
    el.append(f'<path fill="{PAPER}" d="{sd(cx, cy + dy, h, max_w=max_w)}"/>')
    return el


def svg(w, h, body, bg=None, title='Stefano Doko'):
    b = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img">'
            f'<title>{title}</title>{b}{"".join(body)}</svg>\n')


def write(name, text):
    (OUT / name).write_text(text, encoding='utf-8')
    print('wrote', name)


# 1 · seal (primary)
write('logo-seal.svg', svg(1000, 1000, seal(500, 500, 490)))

# 2 · seal without ring text, for small sizes (profile pictures, stickers)
write('logo-seal-simple.svg', svg(1000, 1000, seal(500, 500, 490, ring=False)))

# 3 · mono block (favicon)
def mono(fg, bg, inset):
    body = [f'<rect width="64" height="64" rx="12" fill="{bg}"/>']
    if inset:
        body.append(f'<rect x="4" y="4" width="56" height="56" rx="9" fill="none" stroke="{fg}" stroke-width="1.5" opacity=".7"/>')
    body.append(f'<path fill="{fg}" d="{sd(32, 32, 26 if inset else 30, max_w=44)}"/>')
    return svg(64, 64, body)
write('logo-mono.svg', mono(PAPER, INK, True))

# 4 · wordmark lockups
def lockup(fg, bg):
    H = 360
    R = 150
    body = seal(40 + R, H / 2, R, ring=False)
    x0 = 40 + 2 * R + 48
    name_size = 1.0
    cap_target = 150
    size = cap_target / (A.cap / A.upm)
    d, w = line(A, 'STEFANO DOKO', x0, H / 2 + 10, size)
    body.append(f'<path fill="{fg}" d="{d}"/>')
    rule_y = H / 2 + 42
    body.append(f'<rect x="{x0}" y="{rule_y}" width="{w:.1f}" height="6" fill="{fg}"/>')
    lab = 'DIZAJNER GRAFIK'
    lsize = 44 / (L.cap / L.upm)
    lw = width(L, lab, lsize, 0.12)
    d2, _ = line(L, lab, x0, rule_y + 6 + 26 + 44, lsize, 0.12)
    body.append(f'<path fill="{fg}" d="{d2}"/>')
    tail = 'SHQIPËRI'
    tw = width(L, tail, lsize, 0.12)
    d3, _ = line(L, tail, x0 + w - tw, rule_y + 6 + 26 + 44, lsize, 0.12)
    body.append(f'<path fill="{fg}" d="{d3}"/>')
    sx = (x0 + lw + x0 + w - tw) / 2
    body.append(f'<path fill="{ALARM}" d="{star(sx, rule_y + 6 + 26 + 22, 20)}"/>')
    W = int(x0 + w + 40)
    return svg(W, H, body, bg)
write('logo-wordmark.svg', lockup(INK, None))
write('logo-wordmark-paper.svg', lockup(INK, PAPER))
write('logo-wordmark-ink.svg', lockup(PAPER, INK))
