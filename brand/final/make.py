"""Stefano Doko identity: the final system.

Directives it follows
  Rand, Haviv    one shape, one idea; must work in one colour and at 16 px
  Vignelli, Experimental Jetset   one typeface, one grid, three colours
  Bierut         plain type, one twist: the D is a speech bubble
  Scher          in use, type is the image (big headlines in posts and stories)

The mark: S, and the D is a speech bubble. The initials, and "write to Stefano".
Grid: everything is measured on the cap height c. Clear space is c/4 on every side.

usage: python brand/final/make.py   (writes brand/final/logo/*.svg)
"""
import importlib.util
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

HERE = Path(__file__).resolve().parent
OUT = HERE / 'logo'
OUT.mkdir(exist_ok=True)
_spec = importlib.util.spec_from_file_location('v7', HERE.parent / 'v7/make.py')
v7 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(v7)

RED, INK, CREAM, WHITE = '#E23B2E', '#141414', '#EFE6D2', '#FFFFFF'
FADE_LIGHT, FADE_DARK = '#5F584F', '#B9B1A2'
SEMI, REG, BOLD = v7.Face(600), v7.Face(400), v7.BOLD


# ---------- the mark ----------
# S beside a D that is a speech bubble: the initials, and the one thing the site asks of you,
# write to Stefano. Measured on the cap height c: the S is Inter Bold at cap c, the gap is
# 0.12c, the D is 0.86c wide with a half-disc bowl, and the tail drops 0.22c below the baseline.

def _s_glyph():
    g = BOLD.cmap[ord('S')]
    bp = BoundsPen(BOLD.gs)
    BOLD.gs[g].draw(bp)
    return g, bp.bounds


def mark_w(c):
    _, (gx0, gy0, gx1, gy1) = _s_glyph()
    return (gx1 - gx0) * c / BOLD.cap + 0.12 * c + 0.86 * c


def mark_h(c):
    return 1.22 * c


def mark_parts(x, y, c):
    """(S path, D path) with the cap top-left at (x, y), cap height c."""
    g, (gx0, gy0, gx1, gy1) = _s_glyph()
    s = c / BOLD.cap
    pen = SVGPathPen(BOLD.gs)
    BOLD.gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x - gx0 * s, y + c)))
    dx = x + (gx1 - gx0) * s + 0.12 * c
    r = c / 2
    top, bot = y, y + c
    d = (f'M{dx:.2f},{top:.2f} H{dx + 0.86 * c - r:.2f} A{r:.2f},{r:.2f} 0 0 1 {dx + 0.86 * c - r:.2f},{bot:.2f} '
         f'H{dx + 0.30 * c:.2f} L{dx - 0.10 * c:.2f},{bot + 0.22 * c:.2f} L{dx:.2f},{bot - 0.10 * c:.2f} Z')
    return pen.getCommands(), d


def mark(x, y, c, s_fill=INK, d_fill=RED):
    sp, dp = mark_parts(x, y, c)
    return f'<path fill="{s_fill}" d="{sp}"/><path fill="{d_fill}" d="{dp}"/>'


def text_left(face, txt, x, base, cap, fill, track=-0.02):
    size = cap / face.cap * face.upm
    _, adv = face.place(txt, track)
    s = size / face.upm
    el, _, _, _ = face.text(txt, x + adv * s / 2, base, size, fill, track)
    return el, adv * s


def text_centre(face, txt, cx, base, cap, fill, track=-0.02):
    size = cap / face.cap * face.upm
    return face.text(txt, cx, base, size, fill, track)[0]


def svg(w, h, body, bg=None, rx=0, title='Stefano Doko'):
    b = f'<rect width="{w:.0f}" height="{h:.0f}" rx="{rx}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}" role="img">'
            f'<title>{title}</title>{b}{body}</svg>\n')


def write(name, text):
    (OUT / name).write_text(text, encoding='utf-8')


# ---------- 1 · the mark alone, in its colourways ----------
C = 400
pad = C * 0.25
for name, sf, df in (('mark-red', INK, RED),        # primary, on cream or white
                     ('mark-dark', CREAM, RED),     # on ink
                     ('mark-cream', CREAM, CREAM),  # on red
                     ('mark-ink', INK, INK),        # one colour
                     ('mark-white', WHITE, WHITE)):
    write(f'{name}.svg', svg(mark_w(C) + 2 * pad, mark_h(C) + 2 * pad, mark(pad, pad, C, sf, df)))

# tight (no clear space), for placing by hand in print and slides
write('mark-tight.svg', svg(mark_w(C), mark_h(C), mark(0, 0, C, INK, RED)))
write('mark-tight-cream.svg', svg(mark_w(C), mark_h(C), mark(0, 0, C, CREAM, CREAM)))

# ---------- 2 · horizontal lockups ----------
def lockup_h(tag=None, dark=False, bg=None):
    h = 200
    pad = h * 0.25
    fg = CREAM if dark else INK
    fade = FADE_DARK if dark else FADE_LIGHT
    c = h / 1.22
    body = mark(pad, pad, c, fg, RED)
    x = pad + mark_w(c) + h * 0.26
    mid = pad + h / 2
    if tag:
        el, w1 = text_left(SEMI, 'Stefano Doko', x, mid - h * 0.04, h * 0.30, fg)
        el2, w2 = text_left(REG, tag, x + h * 0.01, mid + h * 0.29, h * 0.135, fade, -0.005)
        body += el + el2
        w = max(w1, w2)
    else:
        el, w = text_left(SEMI, 'Stefano Doko', x, mid + h * 0.17, h * 0.34, fg)
        body += el
    return svg(x + w + pad, h + 2 * pad, body, bg)


write('lockup.svg', lockup_h())
write('lockup-dark.svg', lockup_h(dark=True, bg=INK))
write('lockup-tag-en.svg', lockup_h('Graphic designer, Albania'))
write('lockup-tag-sq.svg', lockup_h('Dizajner grafik, Shqipëri'))
write('lockup-tag-en-dark.svg', lockup_h('Graphic designer, Albania', True, INK))
write('lockup-tag-sq-dark.svg', lockup_h('Dizajner grafik, Shqipëri', True, INK))

# ---------- 3 · stacked lockup ----------
def lockup_v(dark=False, bg=None):
    h, W = 300, 760
    fg = CREAM if dark else INK
    c = h / 1.22
    body = mark(W / 2 - mark_w(c) / 2, 80, c, fg, RED)
    body += text_centre(SEMI, 'Stefano Doko', W / 2, 80 + h + 150, 84, fg)
    return svg(W, 80 + h + 150 + 80, body, bg)


write('lockup-stacked.svg', lockup_v())
write('lockup-stacked-dark.svg', lockup_v(True, INK))

# ---------- 4 · wordmark alone ----------
el, w = text_left(SEMI, 'Stefano Doko', 40, 40 + 120, 120, INK)
write('wordmark.svg', svg(w + 80, 200, el))
el, w = text_left(SEMI, 'Stefano Doko', 40, 40 + 120, 120, CREAM)
write('wordmark-cream.svg', svg(w + 80, 200, el))

# ---------- 5 · icons: favicon, app, avatar ----------
def square(S, bg, s_fill, d_fill, frac, rx):
    """The mark centred on a square: frac is the share of the width it takes."""
    c = S * frac / mark_w(1)
    x = (S - mark_w(c)) / 2
    y = (S - mark_h(c)) / 2
    return svg(S, S, mark(x, y, c, s_fill, d_fill), bg, rx)


write('favicon.svg', square(64, RED, CREAM, CREAM, 0.80, 14))      # tab and Google icon: cream on red, reads at 16 px
write('app-icon.svg', square(1024, RED, CREAM, CREAM, 0.66, 0))   # iOS/Android mask their own corners
write('avatar.svg', square(1080, CREAM, INK, RED, 0.60, 0))       # Instagram crops to a circle
write('avatar-red.svg', square(1080, RED, CREAM, CREAM, 0.60, 0))
print('wrote brand/final/logo/*.svg')
