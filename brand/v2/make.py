"""Stefano Doko mark, v2: after Paul Rand's method (reduce to one shape, one idea, one colour).

The idea: the whole monogram is one shape, the half-disc.
  S = two small half-discs, turned against each other
  D = the same half-disc, twice the size
Three pieces, one module. The D in alarm red doubles as half of the stamp the site
already uses, and as a sun coming up over the sea.

usage: python brand/v2/make.py   (writes brand/v2/*.svg)
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent
PAPER, INK, ALARM, FADE = '#EFE6D2', '#141414', '#E23B2E', '#5F584F'

r = 100          # the module: radius of the small half-disc
gap = 34         # space between S and D


def half(cx, cy, rad, side):
    """Solid half-disc with its flat edge on x = cx. side = 'L' bulges left, 'R' bulges right."""
    sweep = 0 if side == 'L' else 1
    return f'M{cx},{cy - rad} A{rad},{rad} 0 0 {sweep} {cx},{cy + rad} Z'


def mark(x, y, s_fill, d_fill):
    """Monogram at (x, y) top-left; 4r+gap wide, 4r tall."""
    s_top = half(x + r, y + r, r, 'L')
    s_bot = half(x + r, y + 3 * r, r, 'R')
    d = half(x + 2 * r + gap, y + 2 * r, 2 * r, 'R')
    return (f'<path fill="{s_fill}" d="{s_top} {s_bot}"/>'
            f'<path fill="{d_fill}" d="{d}"/>')


W, H = 4 * r + gap, 4 * r


def svg(w, h, body, bg=None, title='Stefano Doko'):
    b = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img">'
            f'<title>{title}</title>{b}{body}</svg>\n')


def write(name, text):
    (OUT / name).write_text(text, encoding='utf-8')


pad = 60
# primary: ink S, red D
write('mark.svg', svg(W + 2 * pad, H + 2 * pad, mark(pad, pad, INK, ALARM)))
# one colour
write('mark-ink.svg', svg(W + 2 * pad, H + 2 * pad, mark(pad, pad, INK, INK)))
write('mark-paper-on-ink.svg', svg(W + 2 * pad, H + 2 * pad, mark(pad, pad, PAPER, ALARM), INK))

# app icon / favicon: mark on paper square
S = 640
k = 0.62 * S / W
ox, oy = (S - W * k) / 2, (S - H * k) / 2
write('icon.svg', svg(S, S, f'<rect width="{S}" height="{S}" rx="{S * 0.19:.0f}" fill="{PAPER}"/>'
      f'<g transform="translate({ox:.1f} {oy:.1f}) scale({k:.4f})">{mark(0, 0, INK, ALARM)}</g>'))
write('icon-ink.svg', svg(S, S, f'<rect width="{S}" height="{S}" rx="{S * 0.19:.0f}" fill="{INK}"/>'
      f'<g transform="translate({ox:.1f} {oy:.1f}) scale({k:.4f})">{mark(0, 0, PAPER, ALARM)}</g>'))

# construction drawing: the module and its circles
c = []
g = 'fill="none" stroke="#5F584F" stroke-width="1.6" stroke-dasharray="6 6"'
c.append(f'<circle cx="{pad + r}" cy="{pad + r}" r="{r}" {g}/>')
c.append(f'<circle cx="{pad + r}" cy="{pad + 3 * r}" r="{r}" {g}/>')
c.append(f'<circle cx="{pad + 2 * r + gap}" cy="{pad + 2 * r}" r="{2 * r}" {g}/>')
for yy in (0, r, 2 * r, 3 * r, 4 * r):
    c.append(f'<line x1="{pad - 30}" y1="{pad + yy}" x2="{pad + W + 30}" y2="{pad + yy}" stroke="#5F584F" stroke-width="1" opacity=".5"/>')
for xx in (0, r, 2 * r, 2 * r + gap, 3 * r + gap, 4 * r + gap):
    c.append(f'<line x1="{pad + xx}" y1="{pad - 30}" x2="{pad + xx}" y2="{pad + H + 30}" stroke="#5F584F" stroke-width="1" opacity=".5"/>')
body = mark(pad, pad, INK + '22', ALARM + '33') + ''.join(c)
body += f'<path fill="none" stroke="{INK}" stroke-width="3" d="{half(pad + r, pad + r, r, "L")} {half(pad + r, pad + 3 * r, r, "R")} {half(pad + 2 * r + gap, pad + 2 * r, 2 * r, "R")}"/>'
write('construction.svg', svg(W + 2 * pad, H + 2 * pad, body))
print('wrote brand/v2/*.svg')
