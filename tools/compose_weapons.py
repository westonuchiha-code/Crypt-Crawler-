"""Composes sword, crossbow and chaingun frames: drawn pixel weapons gripped by the real photo
fists from the weapon pack. Called by pack_assets.py with the processed fist frames.

Everything is 160x90 (the held-weapon frame size). Sprite-space reminders: the crosshair is at
about (80, 40); weapons are seen from behind, so their far ends taper toward that point.
Shapes are drawn 4x supersampled, downscaled, alpha-thresholded and outlined, which gives
clean pixel-art edges that match the photo frames.
"""
import math
from PIL import Image, ImageDraw, ImageOps

W, H, SS = 160, 90, 4
OUTLINE = (10, 8, 14, 255)
STEEL, STEEL_L, STEEL_D = (128, 138, 154), (214, 224, 240), (66, 72, 88)
BLACK, BLACK_L, BLACK_D = (36, 38, 46), (92, 98, 112), (18, 19, 24)
GOLD, GOLD_D = (206, 164, 52), (126, 92, 24)
WOOD, WOOD_L, WOOD_D = (122, 78, 40), (176, 122, 68), (78, 48, 22)


def layer(): return Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0))


def poly(d, pts, fill):
    d.polygon([(x * SS, y * SS) for x, y in pts], fill=fill)


def line(d, a, b, fill, width=1):
    d.line([(a[0] * SS, a[1] * SS), (b[0] * SS, b[1] * SS)], fill=fill, width=int(width * SS))


def ell(d, cx, cy, rx, ry, fill):
    d.ellipse([(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS], fill=fill)


def rot(pts, ang, pivot):
    a = math.radians(ang); c, s = math.cos(a), math.sin(a)
    return [(pivot[0] + x * c - y * s, pivot[1] + x * s + y * c) for x, y in pts]


def finish(lay, outline_it=True):
    """Downscale a supersampled layer to 160x90 with hard alpha, then outline."""
    im = lay.convert('RGBa').resize((W, H), Image.BOX).convert('RGBA')
    px = im.load()
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= 120 else (0, 0, 0, 0)
    if not outline_it: return im
    out = im.copy(); o = out.load()
    for y in range(H):
        for x in range(W):
            if px[x, y][3]: continue
            if any(0 <= x + dx < W and 0 <= y + dy < H and px[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o[x, y] = OUTLINE
    return out


def shifted(im, dx, dy, rotate=0, mirror=False, about=None):
    """Move (and optionally rotate/mirror) a full 160x90 frame."""
    if mirror: im = ImageOps.mirror(im)
    if rotate: im = im.rotate(-rotate, resample=Image.NEAREST, center=about or (W / 2, H), fillcolor=(0, 0, 0, 0))
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0)); out.paste(im, (int(dx), int(dy)), im)
    return out


def starburst(d, cx, cy, size, seed=0):
    for col, k in (((255, 70, 30, 255), 1.0), ((255, 160, 40, 255), 0.72), ((255, 242, 150, 255), 0.4)):
        pts = []
        for i in range(16):
            ang = i * math.pi / 8 + seed
            r = (0.55 if i % 2 else 1.0 + 0.25 * math.sin(i * 2.3 + seed * 3)) * size * k
            pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r * 0.9))
        poly(d, pts, col)


# ----------------------------------------------------------------- sword
SWORD_FRAMES = [   # blade angle (deg, 0 = up, + = tip to the right), fist dx, dy, fist rotation, smear (a0, a1)
    (-16, 0, 0, 0, None),             # idle
    (50, 10, -4, 16, None),           # windup: blade drawn back to the right
    (22, 4, -10, 8, (50, 22)),        # slash begins
    (-40, -12, -14, -14, (22, -40)),  # slash across the view
    (-92, -26, -10, -32, (-40, -92)), # follow-through, blade pointing left
    (-48, -10, -4, -12, None),        # recover
]


def sword(fist):
    top = min(y for y in range(H) for x in range(W) if fist.getpixel((x, y))[3])
    px0 = sum(x for x in range(W) if fist.getpixel((x, top + 1))[3]) / max(1, sum(1 for x in range(W) if fist.getpixel((x, top + 1))[3]))
    frames = []
    for ang, dx, dy, fr, smear in SWORD_FRAMES:
        pv = (px0 + dx + 1, top + 6 + dy)                       # grip point, just inside the top of the fist
        L = 60
        sm = layer(); d = ImageDraw.Draw(sm)
        if smear:                                                # translucent sweep behind the blade
            a0, a1 = smear
            for i in range(6):
                t0, t1 = a0 + (a1 - a0) * i / 6, a0 + (a1 - a0) * (i + 1) / 6
                p = []
                for a in (t0, t1):
                    r = math.radians(a); p += [(pv[0] + math.sin(r) * L * 0.35, pv[1] - math.cos(r) * L * 0.35)]
                for a in (t1, t0):
                    r = math.radians(a); p += [(pv[0] + math.sin(r) * L * 1.04, pv[1] - math.cos(r) * L * 1.04)]
                poly(d, p, (225, 236, 255, 14 + 9 * i))
        smear_img = sm.convert('RGBa').resize((W, H), Image.BOX).convert('RGBA')
        bl = layer(); d = ImageDraw.Draw(bl)
        blade = [(-5.5, 0), (5.5, 0), (5, -L + 12), (0, -L), (-5, -L + 12)]
        lit = [(-5.5, 0), (0, 0), (0, -L), (-5, -L + 12)]
        dark = [(0, 0), (5.5, 0), (5, -L + 12), (0, -L)]
        poly(d, rot(blade, ang, pv), STEEL)
        poly(d, rot(lit, ang, pv), STEEL_L)
        poly(d, rot(dark, ang, pv), STEEL_D)
        line(d, rot([(0, -4)], ang, pv)[0], rot([(0, -L + 3)], ang, pv)[0], (240, 246, 255, 255), 0.7)   # bright ridge
        guard = [(-14, -4), (14, -4), (14, 1), (-14, 1)]
        poly(d, rot(guard, ang, pv), GOLD)
        poly(d, rot([(-14, -1), (14, -1), (14, 1), (-14, 1)], ang, pv), GOLD_D)
        blade_img = finish(bl)
        out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        out.alpha_composite(smear_img); out.alpha_composite(blade_img)
        out.alpha_composite(shifted(fist, dx, dy, rotate=fr, about=(px0, H - 8)))
        frames.append(out)
    return frames


# ----------------------------------------------------------------- crossbow
def crossbow(fist, hands='over'):
    sb = 74 if hands == 'under' else 90        # stock ends higher when a hand grips it from below
    frames = []
    for state in ('loaded', 'fired', 'cocking'):
        lay = layer(); d = ImageDraw.Draw(lay)
        poly(d, [(66, sb), (94, sb), (86, 50), (74, 50)], WOOD)                    # stock, narrowing toward the target
        poly(d, [(66, sb), (74, sb), (75, 50), (74, 50)], WOOD_L)
        poly(d, [(94, sb), (88, sb), (85, 50), (86, 50)], WOOD_D)
        poly(d, [(77, sb), (83, sb), (81, 50), (79, 50)], WOOD_D)                  # rail groove
        poly(d, [(72, 56), (88, 56), (86, 61), (74, 61)], STEEL_D)                 # lock plate
        poly(d, [(72, 56), (88, 56), (87, 58), (73, 58)], STEEL)
        # limbs: a wide curved bow across the front, bulging toward the target
        for t in range(0, 40):
            u0, u1 = t / 40, (t + 1) / 40
            def pt(u, off): x = 14 + 132 * u; y = 60 - 20 * math.sin(math.pi * u) - off; return (x, y)
            thick = 5.2 - 2.2 * abs(2 * u0 - 1)
            poly(d, [pt(u0, 0), pt(u1, 0), pt(u1, -thick), pt(u0, -thick)], WOOD)
            poly(d, [pt(u0, thick * 0.55), pt(u1, thick * 0.55), pt(u1, 0), pt(u0, 0)], WOOD_L)
        for x in (24, 136): poly(d, [(x - 3, 56), (x + 3, 56), (x + 3, 63), (x - 3, 63)], STEEL)     # limb tips
        poly(d, [(66, 51), (94, 51), (94, 57), (66, 57)], STEEL)                   # bracket where limbs meet the stock
        poly(d, [(66, 51), (94, 51), (94, 53), (66, 53)], STEEL_L)
        nock = {'loaded': (80, 70), 'fired': (80, 60), 'cocking': (80, 65)}[state]
        line(d, (24, 60), nock, (232, 232, 232, 255), 0.9); line(d, nock, (136, 60), (232, 232, 232, 255), 0.9)
        if state == 'loaded':                                                      # bolt on the rail, point toward the crosshair
            poly(d, [(79, 70), (81, 70), (81, 44), (79, 44)], (200, 168, 120))
            poly(d, [(80, 36), (84, 45), (76, 45)], STEEL_L)
            poly(d, [(80, 36), (84, 45), (80, 45)], STEEL)
            poly(d, [(80, 66), (86, 74), (80, 71), (74, 74)], (200, 50, 50))
        lay_img = finish(lay)
        out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        kick = {'loaded': 0, 'fired': 3, 'cocking': 1}[state]
        if hands == 'under':                                                       # hand behind and below the stock
            out.alpha_composite(shifted(fist, -29, 6 + kick, rotate=-2)); out.alpha_composite(lay_img)
        elif hands == 'none':
            out.alpha_composite(lay_img)
        else:
            out.alpha_composite(lay_img)
            out.alpha_composite(shifted(fist, -4, kick, rotate=-4))                   # right fist
            out.alpha_composite(shifted(fist, 4, kick, rotate=4, mirror=True))          # left fist
        frames.append(out)
    return frames


# ----------------------------------------------------------------- chaingun
def chaingun(fist, hands='over'):
    hb = 76 if hands == 'under' else 90
    frames = []
    for state in range(3):                       # 0 idle, 1 and 2 firing with different flash/barrel phase
        lay = layer(); d = ImageDraw.Draw(lay)
        ell(d, 124, 54, 11, 10, GOLD)                                               # ammo drum, above the right hand
        ell(d, 121, 51, 6, 5, (236, 200, 96))
        poly(d, [(110, 60), (118, 58), (119, 66), (110, 68)], (96, 70, 30))         # feed belt into the housing
        poly(d, [(44, hb), (116, hb), (106, 58), (54, 58)], BLACK)                  # main housing
        poly(d, [(44, hb), (52, hb), (58, 58), (54, 58)], BLACK_L)
        poly(d, [(116, hb), (108, hb), (104, 58), (106, 58)], BLACK_D)
        poly(d, [(54, 58), (106, 58), (100, 52), (60, 52)], (74, 80, 94))           # top plate
        poly(d, [(54, 58), (106, 58), (105, 56), (55, 56)], (120, 128, 146))
        phase = state % 2                                                           # barrels: highlight moves as they spin
        for i, (bx0, bx1) in enumerate(((64, 71), (80, 80), (96, 89))):
            half0, half1 = 7.5, 4.2
            poly(d, [(bx0 - half0, 54), (bx0 + half0, 54), (bx1 + half1, 36), (bx1 - half1, 36)], STEEL_D)
            hl = 0.15 + 0.5 * (((i + phase) % 3) / 2)
            poly(d, [(bx0 - half0 + hl * 6, 54), (bx0 - half0 + hl * 6 + 3.5, 54), (bx1 - half1 + hl * 3 + 1.8, 36), (bx1 - half1 + hl * 3, 36)], STEEL_L)
            ell(d, bx1, 36, half1, 1.8, (8, 8, 10, 255))
        poly(d, [(60, 47), (100, 47), (98, 43), (62, 43)], STEEL)                   # barrel clamp
        lay_img = finish(lay)
        out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        kick = (0, 2, 1)[state]
        if hands == 'under':                                                       # both hands beneath the housing
            out.alpha_composite(shifted(fist, -6, 8 + kick, rotate=-3)); out.alpha_composite(shifted(fist, 6, 8 + kick, rotate=3, mirror=True))
            out.alpha_composite(lay_img)
        elif hands == 'none':
            out.alpha_composite(lay_img)
        else:
            out.alpha_composite(lay_img)
            out.alpha_composite(shifted(fist, -2, kick, rotate=-3))
            out.alpha_composite(shifted(fist, 2, kick, rotate=3, mirror=True))
        if state:
            fl = layer(); d = ImageDraw.Draw(fl)
            starburst(d, 80, 32, (13, 18)[state - 1], seed=state * 1.7)
            out.alpha_composite(finish(fl, outline_it=False))
        frames.append(out)
    return frames


def tips_for(frames):
    res = []
    for f in frames:
        px = f.load(); ys = [y for y in range(H) for x in range(W) if px[x, y][3]]
        top = min(ys); xs = [x for y in range(top, top + 2) for x in range(W) if px[x, y][3]]
        res.append([round(sum(xs) / len(xs)), top])
    return res


def build(fist_frames):
    fist = fist_frames[0]
    return {}   # sword cut too (user rejected it); sword()/crossbow()/chaingun() kept for reference   # crossbow/chaingun were cut (user rejected the look); their functions are kept for reference
