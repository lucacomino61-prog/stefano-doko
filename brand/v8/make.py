"""Stefano Doko, v8: eight more minimal marks, four more designers, one idea each.

Noma Bar (one picture hiding another):
  bar-eye        an eye whose iris is the sun setting on the sea
  bar-nib        a fountain-pen nib that is also an ice-cream cone
Shigeo Fukuda (letters that turn into things):
  fukuda-sunset  SD turned on its side: the D is a sun going down on the S's wave
  fukuda-drop    the D turned and pinched into an ink drop, an S cut out of it
Lindon Leader (the symbol hiding in the negative space):
  leader-s       a red D whose counter is an S
  leader-nib     a black D whose counter is a pen nib
Build / Michael C. Place (strict geometry):
  build-dots     SD on a dot grid, one dot red: the full stop
  build-lines    SD engraved in horizontal rules, like the site's band

Type is Inter, outlined, via the Face helper in brand/v7/make.py.
usage: python brand/v8/make.py   (writes brand/v8/*.svg)
"""
import importlib.util
import math
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

OUT = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location('v7', OUT.parent / 'v7/make.py')
v7 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(v7)          # also regenerates v7's files; harmless
PAPER, INK, ALARM, S = v7.PAPER, v7.INK, v7.ALARM, v7.S
BOLD, MED = v7.BOLD, v7.MED
name_below = v7.name_below


def write(name, body):
    (OUT / f'{name}.svg').write_text(v7.svg(body), encoding='utf-8')
    (OUT / f'{name}-paper.svg').write_text(v7.svg(body, PAPER), encoding='utf-8')


def glyph(face, ch, cx, cy, cap, rot=0):
    """One glyph as path data, its ink box centred on (cx, cy), cap height `cap`, rotated `rot` degrees."""
    g = face.cmap[ord(ch)]
    bp = BoundsPen(face.gs)
    face.gs[g].draw(bp)
    x0, y0, x1, y1 = bp.bounds
    s = cap / face.cap
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    a = math.radians(rot)
    c, sn = math.cos(a), math.sin(a)
    # font units -> centred, flipped, scaled, rotated, moved
    m = (s * c, s * sn, s * sn, -s * c, 0, 0)
    ex = cx - (m[0] * mx + m[2] * my)
    ey = cy - (m[1] * mx + m[3] * my)
    pen = SVGPathPen(face.gs)
    face.gs[g].draw(TransformPen(pen, (m[0], m[1], m[2], m[3], ex, ey)))
    return pen.getCommands()


# ---------- Noma Bar ----------

def eye():
    L, R, cy = 150, 650, 330
    lid = f'M{L},{cy} Q400,{cy - 250} {R},{cy} Q400,{cy + 250} {L},{cy} Z'
    horizon = cy + 26
    body = f'<defs><clipPath id="e"><path d="{lid}"/></clipPath></defs>'
    body += f'<g clip-path="url(#e)">'
    body += f'<path fill="{ALARM}" d="M300,{horizon} A100,100 0 0 1 500,{horizon} Z"/>'
    for i, (w, y) in enumerate([(260, horizon + 30), (170, horizon + 58), (90, horizon + 84)]):
        body += f'<rect x="{400 - w / 2}" y="{y - 5}" width="{w}" height="10" rx="5" fill="{ALARM}"/>'
    body += f'<rect x="{L}" y="{horizon - 5}" width="{R - L}" height="10" fill="{INK}"/></g>'
    body += f'<path fill="none" stroke="{INK}" stroke-width="22" stroke-linejoin="round" d="{lid}"/>'
    return body + name_below()


def nib():
    # the nib, pointing down: shoulders at y=300, tip at y=590
    cone = 'M292,300 C292,410 352,500 400,592 C448,500 508,410 508,300 Z'
    body = f'<circle cx="400" cy="232" r="122" fill="{ALARM}"/>'
    body += f'<path fill="{INK}" d="{cone}"/>'
    body += f'<rect x="395" y="420" width="10" height="172" fill="{PAPER}"/>'
    body += f'<circle cx="400" cy="414" r="17" fill="{PAPER}"/>'
    return body + name_below(700)


# ---------- Shigeo Fukuda ----------

def sunset():
    # the letters SD turned a quarter-turn anticlockwise: D (a dome) sits on S (a wave)
    cap = 250
    d = glyph(BOLD, 'D', 400, 250, cap, rot=-90)
    s_ = glyph(BOLD, 'S', 400, 470, cap, rot=-90)
    return f'<path fill="{ALARM}" d="{d}"/><path fill="{INK}" d="{s_}"/>' + name_below(700)


def drop():
    cx, cy, r = 400, 390, 150
    tip = cy - r * 2.05
    shape = (f'M{cx},{tip:.1f} C{cx + r * 0.45:.1f},{cy - r * 1.25:.1f} {cx + r:.1f},{cy - r * 0.55:.1f} {cx + r},{cy} '
             f'A{r},{r} 0 0 1 {cx - r},{cy} C{cx - r:.1f},{cy - r * 0.55:.1f} {cx - r * 0.45:.1f},{cy - r * 1.25:.1f} {cx},{tip:.1f} Z')
    s_ = glyph(BOLD, 'S', cx - r * 0.02, cy - r * 0.05, r * 0.95)
    return f'<path fill="{ALARM}" fill-rule="evenodd" d="{shape} {s_}"/>' + name_below(690)


# ---------- Lindon Leader ----------

def D_shape(x, top, h, w):
    """A heavy D: straight stem, bowl a half-disc of radius h/2."""
    r = h / 2
    return f'M{x},{top} H{x + w - r} A{r},{r} 0 0 1 {x + w - r},{top + h} H{x} Z'


def leader_s():
    h, w = 440, 400
    x, top = 400 - w / 2, 330 - h / 2
    outer = D_shape(x, top, h, w)
    s_ = glyph(BOLD, 'S', x + w * 0.44, 330, h * 0.60)
    return f'<path fill="{ALARM}" fill-rule="evenodd" d="{outer} {s_}"/>' + name_below(700)


def leader_nib():
    h, w = 440, 400
    x, top = 400 - w / 2, 330 - h / 2
    outer = D_shape(x, top, h, w)
    # counter = a nib pointing right
    nx, ny = x + 92, 330
    counter = (f'M{nx},{ny - 108} C{nx + 110},{ny - 108} {nx + 180},{ny - 52} {nx + 250},{ny} '
               f'C{nx + 180},{ny + 52} {nx + 110},{ny + 108} {nx},{ny + 108} Z')
    body = f'<path fill="{INK}" fill-rule="evenodd" d="{outer} {counter}"/>'
    body += f'<rect x="{nx + 110}" y="{ny - 4}" width="{140}" height="8" fill="{INK}"/>'
    body += f'<circle cx="{nx + 104}" cy="{ny}" r="15" fill="{INK}"/>'
    return body + name_below(700)


# ---------- Build ----------

S_DOTS = ['111', '100', '111', '001', '111']
D_DOTS = ['110', '101', '101', '101', '110']


def dots():
    p, r = 74, 27
    x0 = 400 - (7 * p) / 2 + p / 2
    y0 = 330 - (5 * p) / 2 + p / 2
    body = ''
    for letter, off in ((S_DOTS, 0), (D_DOTS, 4)):
        for j, row in enumerate(letter):
            for i, on in enumerate(row):
                cx, cy = x0 + (off + i) * p, y0 + j * p
                if on == '1':
                    body += f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}" fill="{INK}"/>'
                else:
                    body += f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="5" fill="{INK}" opacity=".28"/>'
    # the full stop: one red dot after the D, on the baseline
    body += f'<circle cx="{x0 + 7 * p:.1f}" cy="{y0 + 4 * p:.1f}" r="{r}" fill="{ALARM}"/>'
    return body + name_below(700)


def lines():
    cap = 380
    s_ = glyph(BOLD, 'S', 227, 330, cap)
    d = glyph(BOLD, 'D', 566, 330, cap)
    top, bot = 330 - cap / 2 - 4, 330 + cap / 2 + 4
    rules = ''.join(f'<rect x="80" y="{y:.1f}" width="640" height="11"/>' for y in [top + i * 19 for i in range(int((bot - top) / 19) + 1)])
    body = (f'<defs><clipPath id="s"><path d="{s_}"/></clipPath><clipPath id="d"><path d="{d}"/></clipPath></defs>'
            f'<g clip-path="url(#s)" fill="{INK}">{rules}</g><g clip-path="url(#d)" fill="{ALARM}">{rules}</g>')
    return body + name_below(700)


MARKS = {
    'bar-eye': eye, 'bar-nib': nib,
    'fukuda-sunset': sunset, 'fukuda-drop': drop,
    'leader-s': leader_s, 'leader-nib': leader_nib,
    'build-dots': dots, 'build-lines': lines,
}
for n, fn in MARKS.items():
    write(n, fn())
print('wrote', len(MARKS), 'marks to brand/v8/')
