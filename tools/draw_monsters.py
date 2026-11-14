"""Hand-drawn enemy sprites (drawn in code, large, then pixelated by tools/pack_assets.py to 64 px tall).

Writes art/monsters/<kind>_0.png (idle) and <kind>_1.png (attack). Both frames share one canvas, feet at the
bottom edge, so they line up in game. Light comes from the upper left; every shape is drawn dark first, then
lit, then highlighted, which survives the downscale as readable pixel-art shading.
Run: python3 tools/draw_monsters.py && python3 tools/pack_assets.py
"""
import os, math
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 240, 320   # drawing canvas; feet sit on y = H - 1


def sh(c, k):
    """Scale a colour's brightness (k < 1 darker, > 1 lighter)."""
    return tuple(max(0, min(255, int(v * k))) for v in c[:3]) + (255,)


def blob(d, box, col, light=True):
    """Shaded ellipse: dark rim, lit body, small highlight toward the upper left."""
    x0, y0, x1, y1 = box
    d.ellipse(box, fill=sh(col, 0.55))
    w, h = x1 - x0, y1 - y0
    d.ellipse((x0 + w * 0.06, y0 + h * 0.04, x1 - w * 0.14, y1 - h * 0.16), fill=sh(col, 0.85))
    if light:
        d.ellipse((x0 + w * 0.18, y0 + h * 0.12, x0 + w * 0.52, y0 + h * 0.42), fill=sh(col, 1.18))


def limb(d, a, b, wa, wb, col):
    """Tapered limb from a to b (widths wa, wb), shaded: dark body, lit left stripe, rounded joints."""
    ax, ay = a; bx, by = b
    dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L, dx / L
    poly = [(ax + nx * wa / 2, ay + ny * wa / 2), (bx + nx * wb / 2, by + ny * wb / 2),
            (bx - nx * wb / 2, by - ny * wb / 2), (ax - nx * wa / 2, ay - ny * wa / 2)]
    d.polygon(poly, fill=sh(col, 0.6))
    d.ellipse((ax - wa / 2, ay - wa / 2, ax + wa / 2, ay + wa / 2), fill=sh(col, 0.6))
    d.ellipse((bx - wb / 2, by - wb / 2, bx + wb / 2, by + wb / 2), fill=sh(col, 0.6))
    s = 1 if nx > 0 else -1     # lit side faces left
    lit = [(ax - s * nx * wa * 0.05, ay - s * ny * wa * 0.05), (bx - s * nx * wb * 0.05, by - s * ny * wb * 0.05),
           (bx - s * nx * wb * 0.42, by - s * ny * wb * 0.42), (ax - s * nx * wa * 0.42, ay - s * ny * wa * 0.42)]
    d.polygon(lit, fill=sh(col, 0.95))


def eyes(d, cx, y, gap, r, col=(255, 60, 30)):
    for ex in (cx - gap, cx + gap):
        d.ellipse((ex - r * 1.7, y - r * 1.7, ex + r * 1.7, y + r * 1.7), fill=col[:3] + (255,))
        d.ellipse((ex - r, y - r, ex + r, y + r), fill=(255, 240, 160, 255))


def canvas():
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); return im, ImageDraw.Draw(im)


# ---------------------------------------------------------------- giant rat (front view, crouched)
def rat(attack):
    im, d = canvas(); fur = (122, 98, 84); cx = 120
    d.polygon([(cx + 40, 290), (cx + 95, 300), (cx + 112, 268), (cx + 100, 262), (cx + 88, 286), (cx + 44, 280)], fill=(196, 128, 128, 255))  # tail
    blob(d, (cx - 72, 170, cx + 72, 318), fur)                                   # body
    blob(d, (cx - 40, 215, cx + 40, 300), sh(fur, 1.25))                         # belly
    hy = 150 if attack else 168
    for s in (-1, 1):                                                              # ears
        blob(d, (cx + s * 44 - 22, hy - 44, cx + s * 44 + 22, hy - 2), (170, 120, 120))
        d.ellipse((cx + s * 44 - 12, hy - 34, cx + s * 44 + 12, hy - 10), fill=(220, 150, 150, 255))
    blob(d, (cx - 48, hy - 20, cx + 48, hy + 70), fur)                            # head
    blob(d, (cx - 22, hy + 30, cx + 22, hy + 82), sh(fur, 1.1))                   # snout
    d.ellipse((cx - 8, hy + 70, cx + 8, hy + 84), fill=(230, 140, 150, 255))      # nose
    if attack:                                                                     # gaping mouth and teeth
        d.ellipse((cx - 16, hy + 80, cx + 16, hy + 112), fill=(60, 10, 14, 255))
        d.rectangle((cx - 8, hy + 80, cx + 8, hy + 92), fill=(245, 235, 200, 255))
    eyes(d, cx, hy + 22, 22, 5)
    for s in (-1, 1):                                                              # whiskers
        for k in (-6, 2, 10):
            d.line((cx + s * 14, hy + 64 + k, cx + s * 58, hy + 56 + k * 2), fill=(30, 25, 25, 255), width=2)
    for s in (-1, 1):                                                              # front paws
        px = cx + s * (60 if attack else 34)
        limb(d, (cx + s * 40, 230), (px, 300), 30, 22, fur)
        for t in (-8, 0, 8):
            d.line((px + t, 304, px + t * 1.3, 316), fill=(230, 220, 200, 255), width=3)
    return im


# ---------------------------------------------------------------- flaming skull wisp (floats, with a floor shadow)
def flame(attack):
    im, d = canvas(); cx = 120; cy = 120
    d.ellipse((cx - 44, 300, cx + 44, 318), fill=(20, 10, 6, 150))                # floor shadow
    for i, (r, col) in enumerate([(92, (150, 20, 0)), (78, (230, 70, 0)), (62, (255, 140, 10)), (44, (255, 210, 60))]):
        pts = []
        for a in range(0, 360, 12):
            rr = r * (1.0 + (0.45 if 200 < a < 340 else 0.12) * abs(math.sin(math.radians(a * 3 + i * 40))))
            t = math.radians(a)
            pts.append((cx + math.cos(t) * rr * 0.8, cy + 30 + math.sin(t) * rr * (1.25 if 190 < a < 350 else 0.8)))
        d.polygon(pts, fill=col + (255,))
    blob(d, (cx - 40, cy - 10, cx + 40, cy + 70), (238, 226, 196))               # skull
    d.rectangle((cx - 22, cy + 52, cx + 22, cy + 82), fill=(220, 206, 176, 255))
    for s in (-1, 1):
        d.ellipse((cx + s * 17 - 13, cy + 14, cx + s * 17 + 13, cy + 42), fill=(30, 6, 0, 255))
        d.ellipse((cx + s * 17 - 5, cy + 22, cx + s * 17 + 5, cy + 32), fill=(255, 230, 80, 255))
    d.polygon([(cx - 6, cy + 46), (cx + 6, cy + 46), (cx, cy + 56)], fill=(40, 10, 0, 255))
    if attack:
        d.rectangle((cx - 20, cy + 68, cx + 20, cy + 96), fill=(40, 6, 0, 255))   # jaw drops, fire spills out
        d.ellipse((cx - 14, cy + 74, cx + 14, cy + 100), fill=(255, 200, 40, 255))
    for x in range(cx - 18, cx + 20, 9):
        d.rectangle((x, cy + 64, x + 6, cy + 72), fill=(245, 240, 220, 255))
    return im


# ---------------------------------------------------------------- imp (Doom-style brown demon with spikes)
def imp(attack):
    im, d = canvas(); skin = (150, 92, 58); cx = 120
    for s in (-1, 1):                                                              # legs, digitigrade
        limb(d, (cx + s * 22, 200), (cx + s * 34, 258), 34, 24, skin)
        limb(d, (cx + s * 34, 258), (cx + s * 28, 312), 22, 16, skin)
        d.polygon([(cx + s * 28 - 14, 318), (cx + s * 28 + 14, 318), (cx + s * 28, 300)], fill=sh(skin, 0.5))
    blob(d, (cx - 46, 112, cx + 46, 214), skin)                                    # torso
    d.line((cx, 140, cx, 200), fill=sh(skin, 0.6), width=3)
    for y in (150, 170): d.line((cx - 26, y, cx + 26, y), fill=sh(skin, 0.65), width=2)
    for y in range(118, 210, 18):                                                  # shoulder and spine spikes
        for s in (-1, 1):
            d.polygon([(cx + s * 40, y), (cx + s * 58, y - 10), (cx + s * 44, y + 10)], fill=(225, 210, 170, 255))
    # arms: idle claws low, attack = right arm raised with a fireball
    limb(d, (cx - 44, 128), (cx - 62, 178), 24, 18, skin); limb(d, (cx - 62, 178), (cx - 56, 222), 18, 14, skin)
    for t in (-6, 0, 6): d.line((cx - 56 + t, 222, cx - 58 + t * 1.6, 238), fill=(240, 230, 200, 255), width=3)
    if attack:
        limb(d, (cx + 44, 128), (cx + 72, 92), 24, 18, skin); limb(d, (cx + 72, 92), (cx + 70, 50), 18, 14, skin)
        for r, c in ((30, (200, 40, 0)), (22, (255, 130, 10)), (12, (255, 230, 120))):
            d.ellipse((cx + 70 - r, 34 - r, cx + 70 + r, 34 + r), fill=c + (255,))
    else:
        limb(d, (cx + 44, 128), (cx + 62, 178), 24, 18, skin); limb(d, (cx + 62, 178), (cx + 56, 222), 18, 14, skin)
        for t in (-6, 0, 6): d.line((cx + 56 + t, 222, cx + 58 + t * 1.6, 238), fill=(240, 230, 200, 255), width=3)
    blob(d, (cx - 30, 62, cx + 30, 126), skin)                                     # head
    for s in (-1, 1):
        d.polygon([(cx + s * 18, 70), (cx + s * 40, 42), (cx + s * 26, 80)], fill=(225, 210, 170, 255))  # horns
    eyes(d, cx, 92, 12, 4, (255, 170, 0))
    d.polygon([(cx - 16, 108), (cx + 16, 108), (cx + 10, 118), (cx - 10, 118)], fill=(50, 10, 6, 255))
    for x in range(cx - 13, cx + 14, 7): d.polygon([(x, 108), (x + 5, 108), (x + 2, 114)], fill=(240, 235, 210, 255))
    return im


# ---------------------------------------------------------------- skeleton warrior (rusty sword and round shield)
def skel(attack):
    im, d = canvas(); bone = (222, 214, 190); cx = 120; rust = (130, 90, 60)
    for s in (-1, 1):
        limb(d, (cx + s * 16, 196), (cx + s * 20, 254), 14, 11, bone)
        limb(d, (cx + s * 20, 254), (cx + s * 20, 308), 11, 9, bone)
        d.ellipse((cx + s * 20 - 13, 302, cx + s * 20 + 13, 318), fill=sh(bone, 0.8))
    blob(d, (cx - 30, 176, cx + 30, 210), bone)                                    # pelvis
    d.rectangle((cx - 4, 120, cx + 4, 190), fill=sh(bone, 0.75))                    # spine
    for i, y in enumerate(range(118, 172, 11)):                                    # ribs
        w = 34 - i * 3
        d.arc((cx - w, y - 6, cx + w, y + 12), 200, 340, fill=bone + (255,), width=5)
    d.rectangle((cx - 38, 108, cx + 38, 118), fill=bone + (255,))                   # shoulders
    blob(d, (cx - 22, 56, cx + 22, 108), bone)                                     # skull
    for s in (-1, 1): d.ellipse((cx + s * 9 - 7, 72, cx + s * 9 + 7, 86), fill=(20, 10, 10, 255))
    for s in (-1, 1): d.ellipse((cx + s * 9 - 2, 76, cx + s * 9 + 2, 81), fill=(255, 90, 40, 255))
    d.polygon([(cx - 3, 90), (cx + 3, 90), (cx, 96)], fill=(30, 20, 20, 255))
    d.rectangle((cx - 12, 98, cx + 12, 104), fill=(240, 236, 220, 255))
    # left arm: shield
    limb(d, (cx - 38, 114), (cx - 50, 160), 11, 9, bone); limb(d, (cx - 50, 160), (cx - 46, 196), 9, 8, bone)
    blob(d, (cx - 84, 150, cx - 16, 222), (110, 74, 44)); d.ellipse((cx - 58, 176, cx - 42, 194), fill=(170, 160, 150, 255))
    # right arm: sword low (idle) or raised overhead (attack)
    if attack:
        limb(d, (cx + 38, 114), (cx + 62, 80), 11, 9, bone); limb(d, (cx + 62, 80), (cx + 58, 46), 9, 8, bone)
        d.polygon([(cx + 52, 44), (cx + 64, 44), (cx + 62, 0), (cx + 54, 0)], fill=(176, 170, 160, 255))
        d.line((cx + 56, 2, cx + 56, 42), fill=(230, 226, 220, 255), width=2)
        d.rectangle((cx + 42, 44, cx + 74, 50), fill=rust + (255,))
    else:
        limb(d, (cx + 38, 114), (cx + 52, 160), 11, 9, bone); limb(d, (cx + 52, 160), (cx + 56, 196), 9, 8, bone)
        d.polygon([(cx + 52, 200), (cx + 64, 200), (cx + 66, 286), (cx + 54, 290)], fill=(176, 170, 160, 255))
        d.line((cx + 56, 204, cx + 58, 284), fill=(230, 226, 220, 255), width=2)
        d.rectangle((cx + 42, 194, cx + 74, 200), fill=rust + (255,))
    return im


# ---------------------------------------------------------------- ghoul (hunched green zombie, arms reaching)
def ghoul(attack):
    im, d = canvas(); skin = (106, 140, 78); rag = (70, 58, 48); cx = 120
    for s in (-1, 1):
        limb(d, (cx + s * 20, 200), (cx + s * 28, 258), 26, 20, rag)
        limb(d, (cx + s * 28, 258), (cx + s * 26, 310), 18, 14, skin)
        d.ellipse((cx + s * 26 - 15, 302, cx + s * 26 + 15, 318), fill=sh(skin, 0.6))
    blob(d, (cx - 44, 110, cx + 44, 216), rag)                                     # torn shirt over a hunched torso
    blob(d, (cx - 22, 150, cx + 18, 200), sh(skin, 0.9))                            # rip showing flesh
    for s in (-1, 1):                                                              # arms reaching forward/down; up on attack
        if attack:
            limb(d, (cx + s * 40, 120), (cx + s * 66, 80), 22, 16, skin); limb(d, (cx + s * 66, 80), (cx + s * 58, 42), 16, 12, skin)
            for t in (-6, 0, 6): d.line((cx + s * 58 + t, 42, cx + s * 54 + t * 1.4, 26), fill=(200, 200, 160, 255), width=3)
        else:
            limb(d, (cx + s * 40, 120), (cx + s * 60, 170), 22, 16, skin); limb(d, (cx + s * 60, 170), (cx + s * 46, 206), 16, 12, skin)
            for t in (-6, 0, 6): d.line((cx + s * 46 + t, 206, cx + s * 44 + t * 1.4, 222), fill=(200, 200, 160, 255), width=3)
    hy = 82
    blob(d, (cx - 28, hy, cx + 28, hy + 58), skin)                                 # head, slumped low
    d.polygon([(cx - 26, hy + 8), (cx - 8, hy - 4), (cx + 10, hy + 2), (cx + 26, hy + 10), (cx + 12, hy + 16), (cx - 20, hy + 18)], fill=(40, 34, 30, 255))  # stringy hair
    eyes(d, cx, hy + 28, 11, 3, (230, 230, 80))
    if attack:
        d.ellipse((cx - 12, hy + 38, cx + 12, hy + 62), fill=(40, 6, 6, 255))
    else:
        d.line((cx - 10, hy + 46, cx + 10, hy + 46), fill=(40, 10, 10, 255), width=3)
    return im


# ---------------------------------------------------------------- angel (SMT-style: masked, robed, huge wings, halo)
def angel(attack):
    im, d = canvas(); robe = (232, 230, 238); gold = (220, 176, 70); cx = 120
    for s in (-1, 1):                                                              # wings: layered feathers
        for k in range(5):
            ang = math.radians(-40 + k * 26 if not attack else -70 + k * 24)
            L = 112 - k * 8
            x0, y0 = cx + s * 30, 120
            x1, y1 = x0 + s * math.cos(ang) * L, y0 + math.sin(ang) * L
            limb(d, (x0, y0), (x1, y1), 40 - k * 3, 14, sh((210, 214, 232), 1.0 - k * 0.06))
    d.polygon([(cx - 30, 120), (cx + 30, 120), (cx + 52, 316), (cx - 52, 316)], fill=sh(robe, 0.6))   # robe
    d.polygon([(cx - 26, 122), (cx + 10, 122), (cx + 8, 316), (cx - 46, 316)], fill=sh(robe, 0.9))
    for y in (200, 260): d.line((cx - 44, y, cx + 44, y), fill=gold + (255,), width=3)
    d.rectangle((cx - 6, 124, cx + 6, 316), fill=sh(gold, 0.85))
    for s in (-1, 1):                                                              # sleeves; attack = hands raised casting light
        if attack:
            limb(d, (cx + s * 28, 128), (cx + s * 50, 78), 22, 18, robe)
            d.ellipse((cx + s * 50 - 14, 54, cx + s * 50 + 14, 82), fill=(255, 250, 200, 255))
        else:
            limb(d, (cx + s * 28, 128), (cx + s * 36, 196), 22, 18, robe)
    blob(d, (cx - 24, 62, cx + 24, 118), (210, 200, 180))                          # mask
    d.polygon([(cx - 24, 62), (cx + 24, 62), (cx + 24, 86), (cx - 24, 86)], fill=sh(gold, 0.9))      # gold helm band
    d.line((cx - 14, 96, cx - 4, 96), fill=(30, 30, 40, 255), width=3); d.line((cx + 4, 96, cx + 14, 96), fill=(30, 30, 40, 255), width=3)
    d.ellipse((cx - 30, 30, cx + 30, 48), outline=(255, 230, 120, 255), width=5)  # halo
    return im


# ---------------------------------------------------------------- slime (sewers): wobbling green blob with bones inside
def slime(attack):
    im, d = canvas(); cx = 120; g = (90, 180, 70)
    top = 150 if attack else 190
    d.ellipse((cx - 80, top, cx + 80, 320), fill=sh(g, 0.55) )
    d.ellipse((cx - 72, top + 6, cx + 60, 300), fill=sh(g, 0.85))
    d.ellipse((cx - 50, top + 16, cx - 10, top + 46), fill=sh(g, 1.35))
    d.ellipse((cx + 6, 250, cx + 34, 262), fill=(230, 226, 200, 255)); d.ellipse((cx - 30, 270, cx - 4, 296), fill=(230, 226, 200, 255))   # bones
    eyes(d, cx, top + 50, 24, 6, (230, 255, 120))
    if attack: d.ellipse((cx - 26, top + 70, cx + 26, top + 110), fill=(30, 60, 20, 255))
    return im


# ---------------------------------------------------------------- knight (castle): plate armour, tabard, longsword
def knight(attack):
    im, d = canvas(); steel = (160, 166, 176); cx = 120; red = (150, 24, 28)
    for s in (-1, 1):
        limb(d, (cx + s * 18, 200), (cx + s * 22, 256), 30, 24, steel); limb(d, (cx + s * 22, 256), (cx + s * 22, 308), 24, 20, steel)
        d.rectangle((cx + s * 22 - 15, 304, cx + s * 22 + 15, 318), fill=sh(steel, 0.6))
    blob(d, (cx - 44, 108, cx + 44, 216), steel)
    d.polygon([(cx - 30, 130), (cx + 30, 130), (cx + 26, 250), (cx - 26, 250)], fill=red + (255,))   # tabard
    d.polygon([(cx - 8, 150), (cx + 8, 150), (cx + 8, 200), (cx - 8, 200)], fill=(220, 180, 60, 255))
    d.rectangle((cx - 24, 166, cx + 24, 180), fill=(220, 180, 60, 255))
    for s in (-1, 1): blob(d, (cx + s * 46 - 22, 100, cx + s * 46 + 22, 140), steel)                    # pauldrons
    limb(d, (cx - 48, 128), (cx - 58, 196), 24, 20, steel)
    blob(d, (cx - 92, 150, cx - 30, 236), (90, 60, 40)); d.line((cx - 61, 156, cx - 61, 230), fill=(220, 180, 60, 255), width=4)   # shield
    if attack:
        limb(d, (cx + 48, 128), (cx + 70, 84), 24, 20, steel)
        d.polygon([(cx + 64, 84), (cx + 78, 84), (cx + 76, 0), (cx + 66, 0)], fill=(210, 214, 222, 255)); d.rectangle((cx + 54, 82, cx + 88, 90), fill=(220, 180, 60, 255))
    else:
        limb(d, (cx + 48, 128), (cx + 60, 196), 24, 20, steel)
        d.polygon([(cx + 54, 200), (cx + 68, 200), (cx + 70, 300), (cx + 58, 304)], fill=(210, 214, 222, 255)); d.rectangle((cx + 46, 194, cx + 80, 202), fill=(220, 180, 60, 255))
    blob(d, (cx - 26, 52, cx + 26, 112), steel)                                                         # great helm
    d.rectangle((cx - 18, 78, cx + 18, 84), fill=(20, 20, 26, 255)); d.rectangle((cx - 2, 70, cx + 2, 104), fill=(20, 20, 26, 255))
    d.polygon([(cx - 4, 52), (cx + 4, 52), (cx + 14, 20), (cx - 2, 30)], fill=red + (255,))            # plume
    return im


# ---------------------------------------------------------------- fire golem (foundry): cracked black rock, magma inside
def golem(attack):
    im, d = canvas(); rock = (64, 56, 54); cx = 120
    def crack(x0, y0, n):
        x, y = x0, y0
        for i in range(n):
            nx, ny = x + ((i * 37) % 11 - 5), y + 9
            d.line((x, y, nx, ny), fill=(255, 120, 10, 255), width=4); d.line((x, y, nx, ny), fill=(255, 220, 90, 255), width=2); x, y = nx, ny
    for s in (-1, 1):
        blob(d, (cx + s * 34 - 26, 220, cx + s * 34 + 26, 318), rock)
    blob(d, (cx - 74, 90, cx + 74, 236), rock)
    crack(cx - 30, 110, 10); crack(cx + 18, 120, 9); crack(cx, 160, 6)
    for s in (-1, 1):
        if attack:
            blob(d, (cx + s * 86 - 30, 20, cx + s * 86 + 30, 110), rock); blob(d, (cx + s * 80 - 30, 0, cx + s * 80 + 30, 50), sh(rock, 1.2))
        else:
            blob(d, (cx + s * 86 - 30, 100, cx + s * 86 + 30, 200), rock); blob(d, (cx + s * 90 - 32, 190, cx + s * 90 + 32, 250), sh(rock, 1.2))
    blob(d, (cx - 32, 46, cx + 32, 110), rock)
    eyes(d, cx, 76, 14, 6, (255, 140, 0))
    d.rectangle((cx - 16, 92, cx + 16, 100), fill=(255, 140, 20, 255))
    return im


# ---------------------------------------------------------------- harpy (sky): bird-woman, feathered wings, talons
def harpy(attack):
    im, d = canvas(); skin = (196, 150, 120); fea = (110, 80, 60); cx = 120
    for s in (-1, 1):
        for k in range(4):
            ang = math.radians((-60 if attack else -20) + k * 24)
            L = 120 - k * 12
            limb(d, (cx + s * 24, 120), (cx + s * 24 + s * math.cos(ang) * L, 120 + math.sin(ang) * L), 36 - k * 4, 10, sh(fea, 1 - k * 0.08))
    for s in (-1, 1):
        limb(d, (cx + s * 14, 210), (cx + s * 22, 262), 20, 14, fea); limb(d, (cx + s * 22, 262), (cx + s * 18, 306), 12, 10, (220, 190, 80))
        for t in (-8, 0, 8): d.line((cx + s * 18, 306, cx + s * 18 + t, 318), fill=(40, 30, 20, 255), width=3)
    blob(d, (cx - 30, 110, cx + 30, 220), skin); d.polygon([(cx - 30, 170), (cx + 30, 170), (cx + 24, 222), (cx - 24, 222)], fill=sh(fea, 0.9))
    blob(d, (cx - 24, 58, cx + 24, 116), skin)
    d.polygon([(cx - 26, 64), (cx + 26, 64), (cx + 34, 130), (cx + 18, 90), (cx - 18, 90), (cx - 34, 130)], fill=(60, 30, 40, 255))   # wild hair
    eyes(d, cx, 86, 10, 3, (255, 220, 40))
    d.polygon([(cx - 6, 94), (cx + 6, 94), (cx, 108 if attack else 102)], fill=(230, 200, 80, 255))   # beak-like mouth
    return im


# ---------------------------------------------------------------- grey alien (void): big head, black eyes, ray gun
def alien(attack):
    im, d = canvas(); skin = (170, 180, 176); cx = 120
    for s in (-1, 1):
        limb(d, (cx + s * 12, 200), (cx + s * 16, 258), 14, 11, skin); limb(d, (cx + s * 16, 258), (cx + s * 16, 310), 11, 9, skin)
        d.ellipse((cx + s * 16 - 12, 304, cx + s * 16 + 12, 318), fill=sh(skin, 0.7))
    blob(d, (cx - 26, 126, cx + 26, 214), (70, 80, 110))                                      # suit
    limb(d, (cx - 26, 136), (cx - 34, 210), 11, 9, skin)
    if attack:
        limb(d, (cx + 26, 136), (cx + 52, 150), 11, 9, skin); d.rectangle((cx + 50, 140, cx + 80, 152), fill=(90, 90, 100, 255))
        d.ellipse((cx + 76, 134, cx + 98, 158), fill=(120, 255, 160, 255))
    else:
        limb(d, (cx + 26, 136), (cx + 34, 210), 11, 9, skin); d.rectangle((cx + 28, 206, cx + 40, 236), fill=(90, 90, 100, 255))
    blob(d, (cx - 46, 30, cx + 46, 132), skin)                                                # huge head
    for s in (-1, 1):
        d.polygon([(cx + s * 8, 84), (cx + s * 38, 70), (cx + s * 32, 98), (cx + s * 12, 100)], fill=(10, 10, 14, 255))
        d.ellipse((cx + s * 26 - 3, 76, cx + s * 26 + 3, 82), fill=(220, 230, 255, 255))
    d.line((cx - 6, 118, cx + 6, 118), fill=(60, 60, 60, 255), width=2)
    return im


# ---------------------------------------------------------------- floating eye (void / alien spire)
def eye(attack):
    im, d = canvas(); cx = 120; cy = 140
    d.ellipse((cx - 40, 302, cx + 40, 318), fill=(10, 8, 12, 150))                             # shadow below
    for k in range(6):                                                                          # dangling tendrils
        x = cx - 50 + k * 20
        limb(d, (x, cy + 40), (x + (k % 2) * 10 - 5, cy + 120 + (k % 3) * 16), 12, 4, (120, 60, 90))
    blob(d, (cx - 70, cy - 70, cx + 70, cy + 70), (190, 120, 140))
    d.ellipse((cx - 50, cy - 46, cx + 50, cy + 46), fill=(245, 240, 230, 255))
    r = 34 if attack else 26
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(200, 40, 40, 255) if attack else (60, 170, 120, 255))
    d.ellipse((cx - r // 2, cy - r // 2, cx + r // 2, cy + r // 2), fill=(10, 10, 10, 255))
    d.ellipse((cx - 30, cy - 34, cx - 16, cy - 20), fill=(255, 255, 255, 255))
    return im


# ---------------------------------------------------------------- tentacle horror (alien spire / other world)
def horror(attack):
    im, d = canvas(); skin = (110, 70, 130); cx = 120
    for k in range(7):                                                                          # tentacle skirt
        x = cx - 72 + k * 24
        limb(d, (x, 220), (x + (k - 3) * 6, 316), 26, 10, sh(skin, 0.9 + (k % 2) * 0.15))
    blob(d, (cx - 66, 80, cx + 66, 240), skin)
    for s in (-1, 1):
        if attack:
            limb(d, (cx + s * 56, 120), (cx + s * 104, 60), 26, 12, skin); limb(d, (cx + s * 104, 60), (cx + s * 90, 10), 12, 6, skin)
        else:
            limb(d, (cx + s * 56, 130), (cx + s * 96, 190), 26, 12, skin); limb(d, (cx + s * 96, 190), (cx + s * 84, 240), 12, 6, skin)
    for ex, ey, r in ((cx - 26, 120, 9), (cx + 22, 112, 12), (cx, 150, 7), (cx - 36, 160, 5), (cx + 38, 150, 6)):
        d.ellipse((ex - r, ey - r, ex + r, ey + r), fill=(250, 240, 120, 255)); d.ellipse((ex - r // 2, ey - r // 2, ex + r // 2, ey + r // 2), fill=(20, 0, 20, 255))
    d.ellipse((cx - 30, 176, cx + 30, 214 if attack else 196), fill=(40, 0, 20, 255))
    for x in range(cx - 24, cx + 25, 8): d.polygon([(x, 178), (x + 6, 178), (x + 3, 190)], fill=(240, 236, 210, 255))
    return im


# ---------------------------------------------------------------- boss (horned demon lord; recoloured per boss floor)
def boss(attack, skin, armour, extra=()):
    im, d = canvas(); cx = 120
    if 'wings' in extra:
        for sd in (-1, 1):
            for k in range(4):
                ang = math.radians((-70 if attack else -35) + k * 22); L = 118 - k * 10
                limb(d, (cx + sd * 50, 110), (cx + sd * 50 + sd * math.cos(ang) * L, 110 + math.sin(ang) * L), 34, 10, sh(armour, 1.3 - k * 0.1))
    for s in (-1, 1):
        limb(d, (cx + s * 30, 210), (cx + s * 46, 266), 46, 36, skin)
        limb(d, (cx + s * 46, 266), (cx + s * 44, 312), 36, 30, skin)
        d.polygon([(cx + s * 44 - 24, 318), (cx + s * 44 + 24, 318), (cx + s * 44 + 16, 298), (cx + s * 44 - 16, 298)], fill=sh(skin, 0.5))
    blob(d, (cx - 70, 92, cx + 70, 230), skin)                                     # massive torso
    d.polygon([(cx - 48, 196), (cx + 48, 196), (cx + 40, 236), (cx - 40, 236)], fill=armour + (255,))   # belt plate
    d.ellipse((cx - 12, 204, cx + 12, 228), fill=(255, 200, 60, 255))
    for s in (-1, 1):                                                              # pauldrons with spikes
        blob(d, (cx + s * 70 - 30, 84, cx + s * 70 + 30, 132), armour)
        d.polygon([(cx + s * 70 - 8, 90), (cx + s * 86, 50), (cx + s * 70 + 8, 92)], fill=(230, 220, 190, 255))
    for s in (-1, 1):                                                              # arms; attack = both fists raised
        if attack:
            limb(d, (cx + s * 74, 112), (cx + s * 98, 66), 34, 28, skin); limb(d, (cx + s * 98, 66), (cx + s * 86, 24), 28, 24, skin)
            blob(d, (cx + s * 86 - 20, 4, cx + s * 86 + 20, 40), sh(skin, 1.05))
        else:
            limb(d, (cx + s * 74, 112), (cx + s * 92, 176), 34, 28, skin); limb(d, (cx + s * 92, 176), (cx + s * 86, 226), 28, 24, skin)
            blob(d, (cx + s * 86 - 20, 220, cx + s * 86 + 20, 256), sh(skin, 1.05))
    blob(d, (cx - 34, 46, cx + 34, 112), skin)                                     # head
    for s in (-1, 1):
        limb(d, (cx + s * 24, 58), (cx + s * 52, 30), 16, 10, (230, 220, 190)); limb(d, (cx + s * 52, 30), (cx + s * 50, 4), 10, 4, (230, 220, 190))
    if 'eye' in extra:          # one great eye instead of a face
        d.ellipse((cx - 24, 58, cx + 24, 98), fill=(245, 240, 230, 255)); d.ellipse((cx - 13, 65, cx + 13, 91), fill=(200, 30, 30, 255)); d.ellipse((cx - 6, 72, cx + 6, 84), fill=(0, 0, 0, 255))
    else:
        eyes(d, cx, 76, 13, 5, (255, 230, 40))
    d.polygon([(cx - 20, 94), (cx + 20, 94), (cx + 14, 106), (cx - 14, 106)], fill=(40, 6, 6, 255))
    for x in range(cx - 16, cx + 17, 8): d.polygon([(x, 94), (x + 6, 94), (x + 3, 102)], fill=(240, 236, 210, 255))
    if 'crown' in extra:
        d.polygon([(cx - 30, 54), (cx + 30, 54), (cx + 34, 24), (cx + 16, 40), (cx, 18), (cx - 16, 40), (cx - 34, 24)], fill=(230, 190, 60, 255))
        d.ellipse((cx - 5, 40, cx + 5, 50), fill=(200, 30, 60, 255))
    if 'tentacles' in extra:
        for k in range(5):
            x = cx - 30 + k * 15; limb(d, (x, 100), (x + (k - 2) * 8, 150), 10, 4, sh(skin, 0.9))
    if 'halo' in extra:
        d.ellipse((cx - 40, 0, cx + 40, 18), outline=(255, 230, 120, 255), width=6)
    return im


KINDS = {
    'rat': rat, 'flame': flame, 'imp': imp, 'skel': skel, 'ghoul': ghoul, 'angel': angel,
    'slime': slime, 'knight': knight, 'golem': golem, 'harpy': harpy, 'alien': alien, 'eye': eye, 'horror': horror,
    # one boss per zone (boss1 = floor 10 ... boss10 = floor 100): same brute, new colours and features
    'boss1': lambda a: boss(a, (90, 120, 60), (70, 60, 50)),                         # The Warden
    'boss2': lambda a: boss(a, (110, 120, 80), (60, 70, 50), ('crown',)),            # The Sewer King
    'boss3': lambda a: boss(a, (200, 196, 180), (60, 50, 70), ('crown', 'wings')),    # The Hollow Queen
    'boss4': lambda a: boss(a, (150, 156, 166), (120, 24, 28)),                      # The Iron Castellan
    'boss5': lambda a: boss(a, (70, 56, 50), (200, 90, 20)),                         # The Forgeheart
    'boss6': lambda a: boss(a, (120, 140, 200), (230, 230, 240), ('wings', 'halo')),  # The Storm Herald
    'boss7': lambda a: boss(a, (60, 120, 110), (90, 160, 150), ('wings',)),           # The Skywyrm
    'boss8': lambda a: boss(a, (40, 40, 70), (90, 60, 160), ('eye',)),               # The Void Archon
    'boss9': lambda a: boss(a, (110, 70, 130), (40, 150, 130), ('eye', 'tentacles')), # The Star-Eater
    'boss10': lambda a: boss(a, (150, 30, 30), (40, 34, 34), ('crown', 'wings')),     # The Spire Titan
}

if __name__ == '__main__':
    out = os.path.join(ROOT, 'art', 'monsters'); os.makedirs(out, exist_ok=True)
    for k, fn in KINDS.items():
        for f in (0, 1):
            fn(bool(f)).save(os.path.join(out, f'{k}_{f}.png'))
    print('drew', len(KINDS), 'monsters ->', out)
