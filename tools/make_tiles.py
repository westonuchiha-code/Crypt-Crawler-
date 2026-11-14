"""Derive zone tiles (zones 4-10) from the user's photo tiles in art/tiles by recolouring and painting detail.
Writes new 64x64 PNGs into art/tiles; pack with tools/pack_assets.py. Re-runnable (outputs are overwritten).
"""
import os, random, math
from PIL import Image, ImageDraw, ImageEnhance, ImageOps, ImageChops, ImageFilter

T = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'art', 'tiles')
load = lambda n: Image.open(os.path.join(T, n + '.png')).convert('RGB').resize((64, 64))
save = lambda im, n: im.save(os.path.join(T, n + '.png'))


def tint(im, rgb, amount):
    """Colourise: keep the photo's light and dark, pull its colour toward rgb."""
    g = ImageOps.grayscale(im)
    col = ImageOps.colorize(g, (0, 0, 0), rgb)
    return Image.blend(im, col, amount)


def bright(im, k): return ImageEnhance.Brightness(im).enhance(k)


def sky_scene(d, box, top, bot, stars=0, cloud=False, seed=1):
    x0, y0, x1, y1 = box; rnd = random.Random(seed)
    for y in range(y0, y1):
        t = (y - y0) / max(1, y1 - y0 - 1)
        d.line((x0, y, x1 - 1, y), fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    for _ in range(stars):
        d.point((rnd.randrange(x0, x1), rnd.randrange(y0, y1)), fill=(255, 255, 240))
    if cloud:
        for cx, cy, r in ((x0 + 8, y1 - 10, 7), (x0 + 15, y1 - 12, 8), (x0 + 22, y1 - 9, 6)):
            d.ellipse((cx - r, cy - r // 2, cx + r, cy + r // 2), fill=(240, 244, 250))


def window(frame, top, bot, stars=0, cloud=False, seed=1):
    """Arched window in a stone (or metal) wall, looking out at a sky."""
    im = frame.copy(); d = ImageDraw.Draw(im)
    sky = Image.new('RGB', (64, 64)); sky_scene(ImageDraw.Draw(sky), (0, 0, 64, 64), top, bot, stars, cloud, seed)
    mask = Image.new('L', (64, 64), 0); md = ImageDraw.Draw(mask)
    md.rectangle((18, 22, 45, 56), fill=255); md.ellipse((18, 8, 45, 36), fill=255)
    im.paste(sky, (0, 0), mask)
    edge = mask.filter(ImageFilter.MaxFilter(3)); edge = ImageChops.subtract(edge, mask)
    im.paste((30, 26, 24), (0, 0), edge)
    d.rectangle((16, 56, 47, 59), fill=(70, 66, 60))          # sill
    d.line((31, 10, 31, 56), fill=(40, 36, 34)); d.line((18, 34, 45, 34), fill=(40, 36, 34))   # mullions
    return im


def main():
    random.seed(4)
    stone, arches, plaster, panel, rust, bars, moss, flag, cob, skull = (load(n) for n in (
        'stone_blocks', 'stone_arches', 'cracked_plaster', 'dark_panel', 'rust', 'iron_bars', 'mossy_relief', 'flagstone', 'cobbles', 'skull_catacomb'))

    # zone 4 castle halls: warm stone with red-and-gold banners, red carpet floor
    b = bright(tint(stone, (190, 150, 110), 0.35), 1.05); d = ImageDraw.Draw(b)
    d.rectangle((20, 4, 44, 50), fill=(130, 18, 22)); d.rectangle((22, 4, 42, 48), fill=(160, 28, 30))
    d.polygon([(20, 50), (44, 50), (32, 60)], fill=(130, 18, 22))
    d.rectangle((20, 4, 44, 7), fill=(210, 170, 60)); d.ellipse((27, 20, 37, 30), fill=(210, 170, 60))
    save(b, 'castle_banner')
    save(bright(tint(stone, (190, 150, 110), 0.35), 1.05), 'castle_stone')
    save(bright(tint(cob, (150, 20, 24), 0.8), 0.95), 'carpet')     # plain worn red; trim lines tiled into road markings

    # zone 5 foundry: black iron, glowing lava cracks, metal grate floor
    lv = bright(panel, 0.6); d = ImageDraw.Draw(lv)
    for _ in range(9):
        x, y = random.randrange(64), random.randrange(64)
        for _ in range(12):
            nx, ny = x + random.randint(-7, 7), y + random.randint(2, 8)
            d.line((x, y, nx, ny), fill=(255, 110, 0), width=3); d.line((x, y, nx, ny), fill=(255, 220, 90), width=1)
            x, y = nx % 64, ny % 64
    save(lv, 'lava_iron')
    save(bright(tint(rust, (120, 60, 30), 0.3), 0.8), 'foundry_rust')
    g = Image.new('RGB', (64, 64), (24, 22, 22)); d = ImageDraw.Draw(g)
    for i in range(0, 64, 8):
        d.rectangle((i, 0, i + 3, 63), fill=(78, 74, 70)); d.rectangle((0, i, 63, i + 2), fill=(66, 62, 58))
    save(g, 'grate')

    # zone 6-7 sky tower / upper air: pale marble, windows onto day sky, then dusk with first stars
    marble = bright(tint(plaster, (225, 230, 240), 0.55), 1.25)
    save(marble, 'marble')
    save(window(marble, (110, 160, 230), (200, 225, 250), cloud=True), 'window_day')
    save(bright(tint(plaster, (150, 140, 190), 0.5), 0.95), 'dusk_marble')
    save(window(bright(tint(plaster, (150, 140, 190), 0.5), 0.95), (20, 18, 60), (210, 110, 120), stars=10, seed=3), 'window_dusk')
    save(bright(tint(flag, (200, 205, 220), 0.5), 1.15), 'marble_floor')

    # zone 8 void: steel hull panels, portholes to deep space, deck plating
    hull = bright(tint(panel, (110, 130, 170), 0.55), 1.15); d = ImageDraw.Draw(hull)
    for x, y in ((4, 4), (59, 4), (4, 59), (59, 59)): d.ellipse((x - 2, y - 2, x + 2, y + 2), fill=(170, 180, 200))
    d.rectangle((0, 30, 63, 33), fill=(60, 70, 90))
    save(hull, 'hull')
    port = hull.copy(); d = ImageDraw.Draw(port)
    d.ellipse((12, 8, 52, 48), fill=(80, 90, 110)); d.ellipse((16, 12, 48, 44), fill=(4, 4, 16))
    r = random.Random(9)
    for _ in range(18): d.point((r.randrange(19, 46), r.randrange(15, 42)), fill=(255, 255, 255))
    d.ellipse((30, 26, 40, 36), fill=(90, 140, 220))   # distant planet
    save(port, 'porthole')
    deck = bright(tint(bars, (100, 115, 140), 0.5), 1.0)
    save(deck, 'deck')

    # zone 9 alien spire: teal organic relief with glowing veins
    al = bright(tint(moss, (40, 170, 150), 0.7), 1.1); d = ImageDraw.Draw(al)
    for _ in range(4):
        x, y = random.randrange(64), 0
        while y < 64:
            nx = x + random.randint(-4, 4); d.line((x, y, nx, y + 6), fill=(140, 255, 210), width=1); x, y = nx, y + 6
    save(al, 'alien_wall')
    save(bright(tint(skull, (60, 150, 130), 0.7), 0.9), 'alien_bones')
    save(bright(tint(cob, (40, 120, 110), 0.65), 0.9), 'alien_floor')

    # zone 10 the other world: red-orange alien rock
    save(bright(tint(stone, (200, 80, 40), 0.65), 1.0), 'red_rock')
    save(bright(tint(moss, (200, 90, 50), 0.65), 1.0), 'red_relief')
    save(bright(tint(cob, (170, 70, 40), 0.6), 0.9), 'red_ground')
    print('tiles written to', T)


if __name__ == '__main__':
    main()
