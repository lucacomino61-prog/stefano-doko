"""Stefano Doko mark, v3: after Saul Bass (cut paper, hand-cut letters, flat red and black).

The idea: the site's pointing hand, cut from black paper with scissors, points at a red sun.
It is the gesture the whole site is built on ("look at the work", "write to Stefano"),
and the sun is the coast his clients work on. The letters are the site's Anybody,
re-cut by hand: flattened to straight scissor cuts, each letter a little off the line.

usage: python brand/v3/make.py   (writes brand/v3/*.svg)
"""
import math
import random
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.basePen import BasePen
from fontTools.pens.transformPen import TransformPen

OUT = Path(__file__).resolve().parent
ROOT = OUT.parent.parent
PAPER, INK, ALARM = '#EFE6D2', '#141414', '#E23B2E'


# ---------- cutting ----------

def cut(points, rng, step=16, wobble=1.6, corner=1.0, closed=True):
    """Resample a polyline into short straight cuts and nudge every point, like scissors."""
    out = []
    n = len(points)
    for i in range(n if closed else n - 1):
        (x0, y0), (x1, y1) = points[i], points[(i + 1) % n]
        out.append((x0 + rng.uniform(-corner, corner), y0 + rng.uniform(-corner, corner)))
        L = math.hypot(x1 - x0, y1 - y0)
        k = int(L // step)
        if k:
            nx, ny = -(y1 - y0) / L, (x1 - x0) / L
            for j in range(1, k + 1):
                t = j / (k + 1)
                w = rng.uniform(-wobble, wobble)
                out.append((x0 + (x1 - x0) * t + nx * w, y0 + (y1 - y0) * t + ny * w))
    return out


def poly(pts):
    return 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + ' Z'


def rough_disc(cx, cy, r, rng, n=44, jit=0.018):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n + rng.uniform(-0.02, 0.02)
        rr = r * (1 + rng.uniform(-jit, jit))
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return poly(cut(pts, rng, step=40, wobble=1.2))


# ---------- the hand (pointing right), drawn on a 600 x 250 box ----------

def arc(cx, cy, rx, ry, a0, a1, n=6):
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


HAND = [(0, 44), (78, 36), (86, 214), (8, 208)]                          # cuff
FIST = ([(92, 56), (150, 38), (240, 40), (540, 46)]                        # back of the hand, index finger
        + arc(540, 70, 34, 24, -90, 90)                                   # fingertip
        + [(310, 94)]
        + arc(318, 118, 40, 24, -90, 90)                                  # 2nd knuckle
        + [(300, 142)]
        + arc(306, 164, 36, 22, -90, 90)                                  # 3rd knuckle
        + [(290, 186)]
        + arc(290, 206, 30, 20, -90, 90)                                  # 4th knuckle
        + [(200, 230), (130, 226), (92, 212)])                            # heel of the hand
CUTS = [  # paper-coloured scissor slits: the thumb and the gaps between fingers
    [(150, 90), (306, 94), (304, 100), (150, 98)],
    [(214, 141), (304, 142), (302, 147), (212, 147)],
    [(222, 185), (292, 186), (290, 191), (220, 191)],
]


def hand(x, y, scale, rng, ink=INK, paper=PAPER):
    tf = lambda pts: [(x + px * scale, y + py * scale) for px, py in pts]
    body = [f'<path fill="{ink}" d="{poly(cut(tf(HAND), rng, 16 * scale, 1.2 * scale))} {poly(cut(tf(FIST), rng, 16 * scale, 1.1 * scale))}"/>']
    body.append(f'<path fill="{paper}" d="{" ".join(poly(cut(tf(c), rng, 12 * scale, .8 * scale, .6 * scale)) for c in CUTS)}"/>')
    # a slit between cuff and hand
    body.append(f'<path fill="{paper}" d="{poly(tf([(78, 34), (92, 34), (100, 218), (86, 218)]))}"/>')
    return ''.join(body)


# ---------- hand-cut letters ----------

class FlatPen(BasePen):
    def __init__(self, gs):
        super().__init__(gs)
        self.contours, self.cur = [], []

    def _moveTo(self, p):
        self.cur = [p]

    def _lineTo(self, p):
        self.cur.append(p)

    def _curveToOne(self, p1, p2, p3):
        p0 = self.cur[-1]
        for i in range(1, 7):
            t = i / 6
            mt = 1 - t
            self.cur.append((mt**3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t**3 * p3[0],
                             mt**3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t**3 * p3[1]))

    def _qCurveToOne(self, p1, p2):
        p0 = self.cur[-1]
        for i in range(1, 5):
            t = i / 4
            mt = 1 - t
            self.cur.append((mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
                             mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]))

    def _closePath(self):
        if len(self.cur) > 2:
            self.contours.append(self.cur)
        self.cur = []

    _endPath = _closePath


def instance(wght, wdth):
    return instancer.instantiateVariableFont(TTFont(ROOT / 'public/fonts/Anybody-VF.woff2'), {'wght': wght, 'wdth': wdth})


class Cutter:
    def __init__(self, font):
        self.gs = font.getGlyphSet()
        self.cmap = font.getBestCmap()
        self.upm = font['head'].unitsPerEm
        self.hmtx = font['hmtx']
        self.cap = font['OS/2'].sCapHeight

    def adv(self, ch):
        return self.hmtx[self.cmap[ord(ch)]][0]

    def width(self, text, size, track):
        return (sum(self.adv(c) for c in text) + track * self.upm * (len(text) - 1)) * size / self.upm

    def line(self, text, x, y, size, rng, track=0.0, tilt=2.2, bob=0.035, step=10):
        """Each letter flattened into scissor cuts, tilted and bobbed a little off the line."""
        s = size / self.upm
        out, cx = [], 0.0
        for ch in text:
            a = self.adv(ch)
            if ch != ' ':
                ang = math.radians(rng.uniform(-tilt, tilt))
                dy = rng.uniform(-bob, bob) * self.cap * s
                # rotate about the letter's centre
                ox, oy = x + (cx + a / 2) * s, y - self.cap * s / 2 + dy
                c, sn = math.cos(ang), math.sin(ang)
                m = (s * c, s * sn, s * sn, -s * c,
                     ox - (a / 2) * s * c + (self.cap / 2) * s * sn,
                     oy - (a / 2) * s * sn - (self.cap / 2) * s * c)
                pen = FlatPen(self.gs)
                self.gs[self.cmap[ord(ch)]].draw(TransformPen(pen, m))
                out.extend(poly(cut(c_, rng, step, size * 0.006, size * 0.004)) for c_ in pen.contours)
            cx += a + track * self.upm
        return ' '.join(out)


BLACK = Cutter(instance(900, 72))
LABEL = Cutter(instance(800, 100))


# ---------- compositions ----------

def svg(w, h, body, bg=None, title='Stefano Doko'):
    b = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img">'
            f'<title>{title}</title>{b}{body}</svg>\n')


def write(name, text):
    (OUT / name).write_text(text, encoding='utf-8')


def emblem(x, y, S, seed, ink=INK, paper=PAPER, sun=ALARM, outline=None):
    """Sun + hand; spans x+0.07S..x+0.87S, y+0.03S..y+0.54S."""
    rng = random.Random(seed)
    disc = rough_disc(x + S * 0.60, y + S * 0.30, S * 0.27, rng)
    body = (f'<path fill="none" stroke="{outline}" stroke-width="{S * 0.014:.1f}" d="{disc}"/>' if outline
            else f'<path fill="{sun}" d="{disc}"/>')
    body += hand(x + S * 0.07, y + S * 0.305, S / 1000, rng, ink, paper)
    return body


def words(fill_name, fill_label, seed=8):
    rng = random.Random(seed)
    size, t = 150, 'STEFANO DOKO'
    w = BLACK.width(t, size, 0.01)
    out = f'<path fill="{fill_name}" d="{BLACK.line(t, (1000 - w) / 2, 872, size, rng, 0.01)}"/>'
    lsize, t2 = 34, 'DIZAJNER GRAFIK'
    w2 = LABEL.width(t2, lsize, 0.22)
    out += f'<path fill="{fill_label}" d="{LABEL.line(t2, (1000 - w2) / 2, 936, lsize, rng, 0.22, tilt=1.2, bob=0.02, step=8)}"/>'
    return out


write('logo.svg', svg(1000, 1000, emblem(0, 14, 1000, 7) + words(INK, ALARM)))
write('logo-paper.svg', svg(1000, 1000, emblem(0, 14, 1000, 7) + words(INK, ALARM), PAPER))
write('logo-ink.svg', svg(1000, 1000, emblem(0, 14, 1000, 7, outline=INK) + words(INK, INK), PAPER))
write('logo-reversed.svg', svg(1000, 1000, emblem(0, 14, 1000, 7, PAPER, INK) + words(PAPER, ALARM), INK))
write('icon.svg', svg(640, 640, f'<rect width="640" height="640" rx="120" fill="{PAPER}"/>' + emblem(19, 137, 640, 7)))
print('wrote brand/v3/*.svg')
