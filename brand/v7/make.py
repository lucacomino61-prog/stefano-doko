"""Stefano Doko, v7: nine minimal marks after three working designers, one idea each.

Sagi Haviv (Chermayeff & Geismar & Haviv): a symbol that survives any size.
  haviv-crop      crop marks around a red dot: framing what matters
  haviv-bezier    the S as a vector path, anchors and one red handle showing
  haviv-register  two registration marks, ink and red, a hair out of register
Michael Bierut (Pentagram): ordinary type, one twist that carries the idea.
  bierut-eyes     doko, and its two o's are looking at you
  bierut-bubble   SD, and the D is a speech bubble: write to Stefano
  bierut-swatch   a colour chip for a colour called Doko Red
Experimental Jetset: strict type, one rule, nothing else.
  jetset-stop     stefano doko. with a red full stop
  jetset-select   the name selected, as in any design app
  jetset-cursor   the name being typed, the cursor still blinking

All type is Inter (open source, Helvetica's closest free kin), outlined here.
usage: python brand/v7/make.py   (writes brand/v7/*.svg)
"""
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

OUT = Path(__file__).resolve().parent
PAPER, INK, ALARM = '#EFE6D2', '#141414', '#E23B2E'
VF = OUT.parent / 'v5/fonts-src/Inter-VF-latin.woff2'


class Face:
    def __init__(self, wght):
        f = instancer.instantiateVariableFont(TTFont(VF), {'wght': wght})
        self.gs, self.cmap, self.hmtx = f.getGlyphSet(), f.getBestCmap(), f['hmtx']
        self.upm, self.cap, self.xh = f['head'].unitsPerEm, f['OS/2'].sCapHeight, f['OS/2'].sxHeight
        self.kern = {}
        for lk in f['GPOS'].table.LookupList.Lookup:
            for st in lk.SubTable:
                st = getattr(st, 'ExtSubTable', st)
                if getattr(st, 'LookupType', lk.LookupType) != 2 or not hasattr(st, 'Format'):
                    continue
                if st.Format == 1:
                    for i, g1 in enumerate(st.Coverage.glyphs):
                        for pvr in st.PairSet[i].PairValueRecord:
                            if pvr.Value1 is not None and getattr(pvr.Value1, 'XAdvance', 0):
                                self.kern.setdefault((g1, pvr.SecondGlyph), pvr.Value1.XAdvance)
                elif st.Format == 2:
                    c1, c2 = st.ClassDef1.classDefs, st.ClassDef2.classDefs
                    for g1 in st.Coverage.glyphs:
                        rec = st.Class1Record[c1.get(g1, 0)]
                        for g2, k2 in c2.items():
                            v = rec.Class2Record[k2].Value1
                            if v is not None and getattr(v, 'XAdvance', 0):
                                self.kern.setdefault((g1, g2), v.XAdvance)

    def place(self, text, track=-0.02):
        """[(char, glyph, x)] in font units, and the advance width."""
        x, out, prev = 0.0, [], None
        for ch in text:
            g = self.cmap[ord(ch)]
            if prev:
                x += self.kern.get((prev, g), 0)
            out.append((ch, g, x))
            x += self.hmtx[g][0] + track * self.upm
            prev = g
        return out, x - track * self.upm

    def path(self, g, s, x, base):
        pen = SVGPathPen(self.gs)
        self.gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x, base)))
        return pen.getCommands()

    def gbounds(self, g, s, x, base):
        bp = BoundsPen(self.gs)
        self.gs[g].draw(TransformPen(bp, (s, 0, 0, -s, x, base)))
        return bp.bounds   # x0, y0(top), x1, y1(bottom) in svg space since y is flipped

    def text(self, text, cx, base, size, fill, track=-0.02, colours=None):
        """Centre text on cx. colours: {index: fill} overrides. Returns (svg, placements, scale, x0)."""
        s = size / self.upm
        pl, w = self.place(text, track)
        x0 = cx - w * s / 2
        groups = {}
        for i, (ch, g, x) in enumerate(pl):
            if ch == ' ':
                continue
            groups.setdefault((colours or {}).get(i, fill), []).append(self.path(g, s, x0 + x * s, base))
        return ''.join(f'<path fill="{f}" d="{" ".join(d)}"/>' for f, d in groups.items()), pl, s, x0


MED, BOLD = Face(500), Face(700)
S = 800


def svg(body, bg=None, w=S, h=S, title='Stefano Doko'):
    b = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img">'
            f'<title>{title}</title>{b}{body}</svg>\n')


def write(name, body, bg=None):
    (OUT / f'{name}.svg').write_text(svg(body, bg), encoding='utf-8')
    (OUT / f'{name}-paper.svg').write_text(svg(body, PAPER), encoding='utf-8')


def name_below(y=690, size=44, fill=INK):
    return MED.text('Stefano Doko', S / 2, y, size, fill, -0.01)[0]


# ---------- Sagi Haviv ----------

def crop():
    cx, cy, half, off, L, w = 400, 330, 150, 34, 110, 16
    d = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = cx + sx * half, cy + sy * half
            # horizontal arm, outside the trim corner
            x_a, x_b = x + sx * off, x + sx * (off + L)
            d.append(f'M{min(x_a, x_b)},{y - w / 2} H{max(x_a, x_b)} V{y + w / 2} H{min(x_a, x_b)} Z')
            y_a, y_b = y + sy * off, y + sy * (off + L)
            d.append(f'M{x - w / 2},{min(y_a, y_b)} V{max(y_a, y_b)} H{x + w / 2} V{min(y_a, y_b)} Z')
    return (f'<path fill="{INK}" d="{" ".join(d)}"/><circle cx="{cx}" cy="{cy}" r="84" fill="{ALARM}"/>'
            + name_below())


def bezier():
    ox, oy = 100, 30
    P = lambda x, y: (x + ox, y + oy)
    A, c1, c2, B, c3, c4, C = P(408, 182), P(370, 78), P(150, 196), P(300, 300), P(450, 404), P(232, 522), P(192, 418)
    f = lambda p: f'{p[0]},{p[1]}'
    body = (f'<path fill="none" stroke="{INK}" stroke-width="50" stroke-linecap="round" '
            f'd="M{f(A)} C{f(c1)} {f(c2)} {f(B)} C{f(c3)} {f(c4)} {f(C)}"/>')
    body += f'<path stroke="{ALARM}" stroke-width="5" d="M{f(c2)} L{f(c3)}"/>'
    body += ''.join(f'<circle cx="{p[0]}" cy="{p[1]}" r="13" fill="{ALARM}"/>' for p in (c2, c3))
    body += ''.join(f'<rect x="{p[0] - 14}" y="{p[1] - 14}" width="28" height="28" fill="{PAPER}" stroke="{INK}" stroke-width="5"/>'
                    for p in (A, B, C))
    return body + name_below()


def register():
    def mark(cx, cy, fill):
        r, R, w = 108, 172, 18
        return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{fill}" stroke-width="{w}"/>'
                f'<path fill="{fill}" d="M{cx - w / 2},{cy - R} h{w} v{2 * R} h{-w} Z M{cx - R},{cy - w / 2} v{w} h{2 * R} v{-w} Z"/>')
    return mark(392, 338, INK) + mark(408, 322, ALARM) + name_below()


# ---------- Michael Bierut ----------

def eyes():
    size = 330
    base = 470
    body, pl, s, x0 = BOLD.text('doko', S / 2, base, size, INK, -0.03)
    for ch, g, x in pl:
        if ch != 'o':
            continue
        bx0, by0, bx1, by1 = BOLD.gbounds(g, s, x0 + x * s, base)
        w, h = bx1 - bx0, by1 - by0
        cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
        # pupil resting against the upper-right of the counter: looking up at you
        body += f'<circle cx="{cx + w * 0.10:.1f}" cy="{cy - h * 0.09:.1f}" r="{w * 0.17:.1f}" fill="{ALARM}"/>'
    body += MED.text('stefano', S / 2, base - size * 0.78 - 30, 52, INK, 0.0)[0]
    return body


def bubble():
    size = 380
    cap = BOLD.cap * size / BOLD.upm
    top, bot = 330 - cap / 2, 330 + cap / 2
    _, pl, s, x0 = BOLD.text('S', 0, bot, size, INK)
    sx0, _, sx1, _ = BOLD.gbounds(pl[0][1], s, x0, bot)
    sw = sx1 - sx0
    dw = cap * 0.86
    gap = cap * 0.12
    total = sw + gap + dw
    left = S / 2 - total / 2
    # re-centre S exactly: shift so its ink starts at `left`
    s_body = f'<g transform="translate({left - sx0:.1f} 0)">{BOLD.text("S", 0, bot, size, INK)[0]}</g>'
    dx = left + sw + gap
    r = cap / 2
    d = (f'M{dx},{top} H{dx + dw - r} A{r},{r} 0 0 1 {dx + dw - r},{bot} '
         f'H{dx + cap * 0.30} L{dx - cap * 0.10},{bot + cap * 0.22} L{dx},{bot - cap * 0.10} Z')
    return s_body + f'<path fill="{ALARM}" d="{d}"/>' + name_below(700)


def swatch():
    w, h, x, y = 380, 540, 210, 110
    body = (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{PAPER}" stroke="{INK}" stroke-width="4"/>'
            f'<path fill="{ALARM}" d="M{x + 2},{y + 12} a10,10 0 0 1 10,-10 H{x + w - 12} a10,10 0 0 1 10,10 V{y + 372} H{x + 2} Z"/>')
    lx = x + 30
    t1, _, s1, x1 = BOLD.text('Doko Red', 0, y + 436, 44, INK, -0.02)
    t2, _, _, _ = MED.text('Stefano Doko', 0, y + 480, 24, INK, 0)
    t3, _, _, _ = MED.text('Graphic designer, Albania', 0, y + 510, 24, INK, 0)
    # left-align: the helper centres on 0, so shift each by its half width
    def left(txt, face, size, track):
        _, adv = face.place(txt, track)
        return adv * size / face.upm / 2
    body += f'<g transform="translate({lx + left("Doko Red", BOLD, 44, -0.02):.1f} 0)">{t1}</g>'
    body += f'<g transform="translate({lx + left("Stefano Doko", MED, 24, 0):.1f} 0)">{t2}</g>'
    body += f'<g transform="translate({lx + left("Graphic designer, Albania", MED, 24, 0):.1f} 0)">{t3}</g>'
    return body


# ---------- Experimental Jetset ----------

def stop():
    text = 'stefano doko.'
    return MED.text(text, S / 2, 430, 120, INK, -0.03, {len(text) - 1: ALARM})[0]


def select():
    size = 110
    base = 430
    body, pl, s, x0 = MED.text('stefano doko', S / 2, base, size, INK, -0.03)
    xs, ys = [], []
    for ch, g, x in pl:
        if ch == ' ':
            continue
        b = MED.gbounds(g, s, x0 + x * s, base)
        xs += [b[0], b[2]]
        ys += [b[1], b[3]]
    pad = 22
    bx0, by0, bx1, by1 = min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad
    body += f'<rect x="{bx0:.1f}" y="{by0:.1f}" width="{bx1 - bx0:.1f}" height="{by1 - by0:.1f}" fill="none" stroke="{ALARM}" stroke-width="3"/>'
    hs = 16
    mx, my = (bx0 + bx1) / 2, (by0 + by1) / 2
    for hx, hy in [(bx0, by0), (mx, by0), (bx1, by0), (bx0, my), (bx1, my), (bx0, by1), (mx, by1), (bx1, by1)]:
        body += f'<rect x="{hx - hs / 2:.1f}" y="{hy - hs / 2:.1f}" width="{hs}" height="{hs}" fill="{PAPER}" stroke="{ALARM}" stroke-width="3"/>'
    return body


def cursor():
    size = 190
    l1, _, _, _ = MED.text('stefano', 0, 0, size, INK, -0.03)
    _, adv1 = MED.place('stefano', -0.03)
    _, adv2 = MED.place('doko', -0.03)
    s = size / MED.upm
    w = max(adv1, adv2) * s
    x = S / 2 - w / 2
    base1, base2 = 360, 360 + size * 0.98
    body = f'<g transform="translate({x + adv1 * s / 2:.1f} {base1})">{l1}</g>'
    l2, _, _, _ = MED.text('doko', 0, 0, size, INK, -0.03)
    body += f'<g transform="translate({x + adv2 * s / 2:.1f} {base2})">{l2}</g>'
    cw = size * 0.075
    cx = x + adv2 * s + size * 0.06
    body += f'<rect x="{cx:.1f}" y="{base2 - size * 0.80:.1f}" width="{cw:.1f}" height="{size * 1.0:.1f}" fill="{ALARM}"/>'
    return body


MARKS = {
    'haviv-crop': crop, 'haviv-bezier': bezier, 'haviv-register': register,
    'bierut-eyes': eyes, 'bierut-bubble': bubble, 'bierut-swatch': swatch,
    'jetset-stop': stop, 'jetset-select': select, 'jetset-cursor': cursor,
}
for name, fn in MARKS.items():
    write(name, fn())
print('wrote', len(MARKS), 'marks to brand/v7/')
