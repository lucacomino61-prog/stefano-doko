"""Stefano Doko mark, v5: after Massimo Vignelli (grid, one sans, black, white and one red).

The idea: the name as a sign. Vignelli and Noorda's subway signage (black band, a thin white
rule along the top, a coloured disc, mixed-case sans) is information design at its plainest:
where you are, where to go. Here the disc is a red SD and the sign says who, and what he does.
Everything sits on one module m; the type is Inter (open-source, Helvetica's closest free kin),
tracked tight, set in medium, the way the signs were.

usage: python brand/v5/make.py   (writes brand/v5/*.svg)
"""
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

OUT = Path(__file__).resolve().parent
PAPER, INK, ALARM = '#EFE6D2', '#141414', '#E23B2E'
WHITE = '#F7F4EC'   # sign white, a touch warmer than pure
VF = OUT / 'fonts-src/Inter-VF-latin.woff2'


class Face:
    def __init__(self, wght):
        f = instancer.instantiateVariableFont(TTFont(VF), {'wght': wght})
        self.gs, self.cmap, self.hmtx = f.getGlyphSet(), f.getBestCmap(), f['hmtx']
        self.upm = f['head'].unitsPerEm
        self.cap = f['OS/2'].sCapHeight
        self.kern = self._kern(f)

    @staticmethod
    def _kern(f):
        """Pair kerning from GPOS PairPos format 1 and 2 (enough for a short wordmark)."""
        pairs = {}
        if 'GPOS' not in f:
            return pairs
        for lk in f['GPOS'].table.LookupList.Lookup:
            for st in lk.SubTable:
                if lk.LookupType == 9:
                    st = st.ExtSubTable
                if getattr(st, 'LookupType', lk.LookupType) != 2 and lk.LookupType not in (2, 9):
                    continue
                if not hasattr(st, 'Format') or not hasattr(st, 'Coverage'):
                    continue
                cov = st.Coverage.glyphs
                if st.Format == 1:
                    for i, g1 in enumerate(cov):
                        for pvr in st.PairSet[i].PairValueRecord:
                            v = pvr.Value1
                            if v is not None and getattr(v, 'XAdvance', 0):
                                pairs.setdefault((g1, pvr.SecondGlyph), v.XAdvance)
                elif st.Format == 2:
                    c1 = st.ClassDef1.classDefs
                    c2 = st.ClassDef2.classDefs
                    for g1 in cov:
                        k1 = c1.get(g1, 0)
                        rec = st.Class1Record[k1]
                        for g2, k2 in c2.items():
                            v = rec.Class2Record[k2].Value1
                            if v is not None and getattr(v, 'XAdvance', 0):
                                pairs.setdefault((g1, g2), v.XAdvance)
        return pairs

    def layout(self, text, track):
        x, out, prev = 0.0, [], None
        for ch in text:
            g = self.cmap[ord(ch)]
            if prev:
                x += self.kern.get((prev, g), 0)
            if ch != ' ':
                out.append((g, x))
            x += self.hmtx[g][0] + track * self.upm
            prev = g
        return out, x - track * self.upm

    def text(self, text, x, baseline, cap_px, fill, track=-0.01):
        """Set text so its cap height is cap_px. Returns (element, advance width in px)."""
        s = cap_px / self.cap
        glyphs, w = self.layout(text, track)
        d = []
        for g, gx in glyphs:
            pen = SVGPathPen(self.gs)
            self.gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x + gx * s, baseline)))
            d.append(pen.getCommands())
        return f'<path fill="{fill}" d="{" ".join(d)}"/>', w * s

    def ink(self, text, cap_px, track=-0.01):
        s = cap_px / self.cap
        glyphs, _ = self.layout(text, track)
        bp = BoundsPen(self.gs)
        for g, gx in glyphs:
            self.gs[g].draw(TransformPen(bp, (1, 0, 0, 1, gx, 0)))
        x0, y0, x1, y1 = bp.bounds
        return x0 * s, x1 * s


MED, BOLD = Face(500), Face(700)
m = 40   # the module


def disc(cx, cy, r, fill, letter_fill):
    cap = r * 0.74
    x0, x1 = BOLD.ink('SD', cap, -0.02)
    el, _ = BOLD.text('SD', cx - (x0 + x1) / 2, cy + cap / 2, cap, letter_fill, -0.02)
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"/>' + el


def svg(w, h, body, bg=None, title='Stefano Doko', rx=0):
    b = f'<rect width="{w}" height="{h}" rx="{rx}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}" role="img">'
            f'<title>{title}</title>{b}{body}</svg>\n')


def write(name, text):
    (OUT / name).write_text(text, encoding='utf-8')


def sign(tagline, band=True):
    """The sign: 10m tall. Rule at 1m; disc of 6m centred at 5.5m; name cap 2m; tagline cap 0.7m."""
    H = 10 * m
    fg = WHITE if band else INK
    body = []
    if band:
        body.append('')  # background added in svg()
    cy = 5.6 * m
    body.append(disc(2 * m + 3 * m, cy, 3 * m, ALARM, WHITE))
    x = 9 * m
    name, w1 = MED.text('Stefano Doko', x, cy + 0.2 * m, 2.1 * m, fg)
    tag, w2 = MED.text(tagline, x + 0.05 * m, cy + 1.95 * m, 0.72 * m, fg, 0.0)
    body += [name, tag]
    W = x + max(w1, w2) + 2 * m
    W = round(W / m) * m   # the sign ends on the module
    if band:
        body.insert(0, f'<rect x="0" y="{1 * m}" width="{W}" height="{0.16 * m}" fill="{WHITE}"/>')
    return svg(W, H, ''.join(body), INK if band else None)


write('logo.svg', sign('Graphic designer, Albania'))
write('logo-sq.svg', sign('Dizajner grafik, Shqipëri'))
write('logo-light.svg', sign('Graphic designer, Albania', band=False))
write('logo-light-sq.svg', sign('Dizajner grafik, Shqipëri', band=False))

# icon: a square of the sign, rule and disc
S = 640
body = (f'<rect x="0" y="{S * 0.1}" width="{S}" height="{S * 0.016}" fill="{WHITE}"/>'
        + disc(S / 2, S * 0.56, S * 0.33, ALARM, WHITE))
write('icon.svg', svg(S, S, body, INK, rx=120))
write('icon-disc.svg', svg(S, S, disc(S / 2, S / 2, S / 2, ALARM, WHITE)))
print('wrote brand/v5/*.svg')
