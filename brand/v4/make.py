"""Stefano Doko mark, v4: after Paula Scher (type is the image; one family, many voices; justified stacks).

The idea: the name gets louder as you read it. STEFANO climbs from hairline-condensed to
black-extended, one step per letter, then DOKO lands at full volume. Every line is justified
to the same measure, so the sizes fall where the words fall. One family (the site's Anybody,
whose weight and width axes do all the work), black plus one red.

usage: python brand/v4/make.py   (writes brand/v4/*.svg)
"""
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

OUT = Path(__file__).resolve().parent
ROOT = OUT.parent.parent
PAPER, INK, ALARM = '#EFE6D2', '#141414', '#E23B2E'
VF = TTFont(ROOT / 'public/fonts/Anybody-VF.woff2')
_cache = {}


def face(wght, wdth):
    key = (wght, wdth)
    if key not in _cache:
        f = instancer.instantiateVariableFont(VF, {'wght': wght, 'wdth': wdth})
        _cache[key] = (f.getGlyphSet(), f.getBestCmap(), f['hmtx'])
    return _cache[key]


UPM = VF['head'].unitsPerEm


def set_line(spec, track=-0.01):
    """spec: list of (char, wght, wdth). Returns (glyph list, ink bounds) in font units, baseline 0."""
    x, glyphs = 0.0, []
    bp_all = None
    for ch, wg, wd in spec:
        gs, cmap, hmtx = face(wg, wd)
        name = cmap[ord(ch)]
        adv = hmtx[name][0]
        if ch != ' ':
            glyphs.append((gs, name, x))
        x += adv + track * UPM
    # ink bounds
    xs, ys = [], []
    for gs, name, gx in glyphs:
        bp = BoundsPen(gs)
        gs[name].draw(TransformPen(bp, (1, 0, 0, 1, gx, 0)))
        if bp.bounds:
            xs += [bp.bounds[0], bp.bounds[2]]
            ys += [bp.bounds[1], bp.bounds[3]]
    return glyphs, (min(xs), min(ys), max(xs), max(ys))


def draw_line(spec, x, top, measure, fill, track=-0.01):
    """Justify a line to `measure` (scaled, ink-flush left and right), its ink top at `top`.
    Returns (svg path element, ink height)."""
    glyphs, (x0, y0, x1, y1) = set_line(spec, track)
    s = measure / (x1 - x0)
    d = []
    for gs, name, gx in glyphs:
        pen = SVGPathPen(gs)
        gs[name].draw(TransformPen(pen, (s, 0, 0, -s, x + (gx - x0) * s, top + y1 * s)))
        d.append(pen.getCommands())
    return f'<path fill="{fill}" d="{" ".join(d)}"/>', (y1 - y0) * s


def ramp(word, w0, w1, d0, d1):
    n = len(word) - 1
    return [(ch, round(w0 + (w1 - w0) * i / n), round(d0 + (d1 - d0) * i / n)) for i, ch in enumerate(word)]


def even(word, wg, wd):
    return [(ch, wg, wd) for ch in word]


def svg(w, h, body, bg=None, title='Stefano Doko'):
    b = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h:.0f}" role="img">'
            f'<title>{title}</title>{b}{body}</svg>\n')


def write(name, text):
    (OUT / name).write_text(text, encoding='utf-8')


def stack(lines, measure, margin, gap, bg=None):
    """lines: list of (spec, fill). Stacks justified lines; returns svg text."""
    body, y = [], margin
    for spec, fill in lines:
        el, h = draw_line(spec, margin, y, measure, fill)
        body.append(el)
        y += h + gap
    H = y - gap + margin
    return svg(measure + 2 * margin, H, ''.join(body), bg)


STEFANO = ramp('STEFANO', 200, 900, 50, 150)       # hairline-condensed to black-extended
DOKO = even('DOKO', 900, 150)
TAG = even('DIZAJNER GRAFIK', 700, 150)
COUNTRY = ramp('SHQIPËRI', 900, 200, 150, 50)      # the country answers the name, getting quieter


def primary(ink, red, bg=None):
    return stack([(STEFANO, ink), (DOKO, ink), (TAG, red), (COUNTRY, ink)], 900, 50, 22, bg)


write('logo.svg', primary(INK, ALARM))
write('logo-paper.svg', primary(INK, ALARM, PAPER))
write('logo-reversed.svg', primary(PAPER, ALARM, INK))
write('logo-ink.svg', primary(INK, INK, PAPER))

# one-line wordmark: the same crescendo, read in one breath
write('wordmark.svg', stack([(ramp('STEFANO DOKO', 200, 900, 50, 150), INK)], 1200, 30, 0))
write('wordmark-paper.svg', stack([(ramp('STEFANO DOKO', 200, 900, 50, 150), INK)], 1200, 30, 0, PAPER))

# icon: S whispers, D shouts, both justified into the same square
def icon(bg, s_fill, d_fill):
    M, m = 640, 80
    body = [f'<rect width="{M}" height="{M}" rx="120" fill="{bg}"/>']
    glyphs_s, bs = set_line([('S', 560, 50)])
    glyphs_d, bd = set_line([('D', 900, 150)])
    inner = M - 2 * m
    # both letters share the cap height, which fills the square's inner height
    cap = inner
    ws = (bs[2] - bs[0]) * cap / (bs[3] - bs[1])
    wd = (bd[2] - bd[0]) * cap / (bd[3] - bd[1])
    gap = 18
    total = ws + gap + wd
    k = inner / total if total > inner else 1
    x = m + (inner - total * k) / 2
    for (gl, b, fill, w) in ((glyphs_s, bs, s_fill, ws), (glyphs_d, bd, d_fill, wd)):
        h = cap * k
        el, _ = draw_line([(c, wg, wdh) for c, wg, wdh in ([('S', 560, 50)] if gl is glyphs_s else [('D', 900, 150)])],
                          x, m + (inner - h) / 2, w * k, fill)
        body.append(el)
        x += (w + gap) * k
    return svg(M, M, ''.join(body))


write('icon.svg', icon(PAPER, INK, ALARM))
write('icon-ink.svg', icon(INK, PAPER, ALARM))
print('wrote brand/v4/*.svg')
