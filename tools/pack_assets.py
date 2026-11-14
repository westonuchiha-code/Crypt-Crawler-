"""Builds assets.js (loaded by index.html) from the source art in art/.

Run from the project folder:  python3 tools/pack_assets.py

Held-weapon art is 160x90 pixelated frames, drawn bottom-aligned at 2x (so they cover the
320-wide game buffer). Two kinds of source:
  * art/weapons/*.png : 320x180 photo-style frames (pistol, shotgun, punch). They are
    downscaled to 160x90, palette-reduced and outlined so they match the hand sheets.
  * art/hands/*.png   : 160x90 hand sheets with 3 frames side by side (wand, lightning).
    The frames are split apart and re-aligned so the sleeve ends at the same spot.
assets.js exposes window.ASSETS = { name: { frames: [dataURI...], tips: [[x,y]...] } }.
`tips` is the topmost point of each frame (wand tip / fingertips), in 160x90 pixel coords.
Art in art/anarch/ is CC0 (Anarch by drummyfish) and is not packed yet.
"""
import base64, io, json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, 'art')
W, H = 160, 90
OUTLINE = (10, 8, 14, 255)
ANCHOR_X, ANCHOR_Y = 146, 89      # where hand-sheet sleeves end (bottom-right), in 160x90 coords


def load(path): return Image.open(path).convert('RGBA')


def hard_alpha(im, th=110):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= th else (0, 0, 0, 0)
    return im


def outline(im):
    """1px dark border around the silhouette, skipping bright (muzzle flash) neighbours."""
    px = im.load(); out = im.copy(); o = out.load()
    for y in range(im.height):
        for x in range(im.width):
            if px[x, y][3]: continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < im.width and 0 <= ny < im.height and px[nx, ny][3]:
                    r, g, b, _ = px[nx, ny]
                    if 0.3 * r + 0.59 * g + 0.11 * b < 170: o[x, y] = OUTLINE
                    break
    return out


def lum(r, g, b): return 0.3 * r + 0.59 * g + 0.11 * b


def is_skin(r, g, b):
    """Mid-bright, not flash-coloured: in these frames that means skin (guns and sleeves are dark)."""
    return 70 <= lum(r, g, b) <= 235 and r - b <= 45 and not (r > 215 and b < 130)


def skin_mean(images):
    px = [p[:3] for im in images for p in im.getdata() if p[3] > 200 and is_skin(*p[:3])]
    return [sum(c[i] for c in px) / len(px) for i in range(3)]


def grade_skin(frames, target):
    """Recolour skin pixels onto the target tone, keeping each pixel's own shading."""
    src_l = lum(*skin_mean(frames)); tgt_l = lum(*target)
    gain = max(0.6, min(1.5, tgt_l / src_l)); tone = [c / tgt_l for c in target]
    print('  skin grade: gain', round(gain, 2))
    for f in frames:
        px = f.load()
        for y in range(f.height):
            for x in range(f.width):
                r, g, b, a = px[x, y]
                if a and is_skin(r, g, b):
                    L = lum(r, g, b) * gain
                    px[x, y] = tuple(min(255, int(L * t)) for t in tone) + (255,)


def pixelate_group(paths, colors=48, target_skin=None):
    """Downscale 320x180 frames to 160x90 and quantise them to one shared palette."""
    frames = []
    for p in paths:
        im = load(p).convert('RGBa').resize((W, H), Image.BOX).convert('RGBA')   # premultiplied: no dark fringes
        frames.append(hard_alpha(im))
    if target_skin: grade_skin(frames, target_skin)
    # shared palette from all opaque pixels
    pix = [f.getpixel((x, y))[:3] for f in frames for y in range(H) for x in range(W) if f.getpixel((x, y))[3]]
    strip = Image.new('RGB', (len(pix), 1)); strip.putdata(pix)
    pal = strip.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE)
    res = []
    for f in frames:
        q = f.convert('RGB').quantize(palette=pal, dither=Image.NONE).convert('RGBA')
        q.putalpha(f.getchannel('A'))
        res.append(outline(q))
    return res


def split_strip(im, n=3):
    """Cut a hand sheet into n frames by connected shape (frames can overlap in columns).
    The n biggest shapes are the frame bodies; small shapes (fingertips etc.) join the nearest body."""
    import numpy as np
    from scipy import ndimage
    alpha = np.array(im.getchannel('A')) > 0
    lab, k = ndimage.label(alpha, structure=np.ones((3, 3)))
    if k < n:
        w = im.width; print('  split: only', k, 'shapes, using equal parts')
        return [im.crop((i * w // n, 0, (i + 1) * w // n, im.height)) for i in range(n)]
    boxes = ndimage.find_objects(lab)
    sizes = ndimage.sum(alpha, lab, range(1, k + 1))
    bodies = sorted((int(i) + 1 for i in np.argsort(sizes)[-n:]), key=lambda l: boxes[l - 1][1].start)
    groups = {b: [b] for b in bodies}
    def gap(a, b):
        (ay, ax), (by, bx) = boxes[a - 1], boxes[b - 1]
        dx = max(0, max(ax.start, bx.start) - min(ax.stop, bx.stop)); dy = max(0, max(ay.start, by.start) - min(ay.stop, by.stop))
        return dx + dy
    for l in range(1, k + 1):
        if l not in groups: groups[min(bodies, key=lambda b: gap(l, b))].append(l)
    frames = []
    for b in bodies:
        mask = np.isin(lab, groups[b])
        arr = np.array(im); arr[~mask] = 0
        f = Image.fromarray(arr, 'RGBA'); frames.append(f.crop(f.getchannel('A').getbbox()))
    print('  split:', [len(groups[b]) for b in bodies], 'shapes per frame')
    return frames


def align_to_anchor(frame):
    """Place a cropped frame on a 160x90 canvas so its sleeve end sits at (ANCHOR_X, ANCHOR_Y)."""
    frame = hard_alpha(frame.copy())
    px = frame.load(); w, h = frame.size
    ys = [y for y in range(h) for x in range(w) if px[x, y][3]]
    bottom = max(ys)
    right = max(x for y in range(max(0, bottom - 3), bottom + 1) for x in range(w) if px[x, y][3])
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    canvas.alpha_composite(frame, (ANCHOR_X - right, ANCHOR_Y - bottom))
    return canvas


def tip_of(im):
    px = im.load(); ys = [y for y in range(H) for x in range(W) if px[x, y][3]]
    top = min(ys); xs = [x for y in range(top, top + 2) for x in range(W) if px[x, y][3]]
    return [round(sum(xs) / len(xs)), top]


def data_uri(im):
    buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()


TARGET_SKIN = skin_mean([load(os.path.join(ART, 'hands', n + '.png')) for n in ('wand', 'lightning', 'spare_cast')])
print('target skin', [round(c) for c in TARGET_SKIN])
assets = {}
for name, prefix, n in (('pistol', 'pistol', 5), ('shotgun', 'shotgun', 5), ('fist', 'punch', 3)):
    paths = [os.path.join(ART, 'weapons', f'{prefix}{i}.png') for i in range(1, n + 1)]
    frames = pixelate_group(paths, target_skin=TARGET_SKIN)
    if name == 'fist': FIST_FRAMES = frames
    assets[name] = {'frames': [data_uri(f) for f in frames], 'tips': [tip_of(f) for f in frames]}
    print(name, len(frames), 'frames, tips', assets[name]['tips'])
for name in ('wand', 'lightning'):
    frames = [align_to_anchor(f) for f in split_strip(load(os.path.join(ART, 'hands', name + '.png')))]
    assets[name] = {'frames': [data_uri(f) for f in frames], 'tips': [tip_of(f) for f in frames]}
    print(name, len(frames), 'frames, tips', assets[name]['tips'])

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import compose_weapons
for name, frames in compose_weapons.build(FIST_FRAMES).items():
    assets[name] = {'frames': [data_uri(f) for f in frames], 'tips': compose_weapons.tips_for(frames)}
    print(name, len(frames), 'frames (composed)')

out = os.path.join(ROOT, 'assets.js')
with open(out, 'w') as fh:
    fh.write('// GENERATED by tools/pack_assets.py from art/. Do not edit by hand.\n')
    fh.write('window.ASSETS = ' + json.dumps(assets) + ';\n')
    # 64x64 surface tiles: art/tiles/<name>.png -> window.TILES[name]; the game's THEMES table picks walls/floor/ceiling per floor
    tiles = {}
    for f in sorted(os.listdir(os.path.join(ROOT, 'art', 'tiles'))):
        if f.endswith('.png'):
            im = Image.open(os.path.join(ROOT, 'art', 'tiles', f)).convert('RGB').resize((64, 64), Image.BOX)
            tiles[f[:-4]] = data_uri(im)
    fh.write('window.TILES = ' + json.dumps(tiles) + ';\n')
    # enemy sprites: art/monsters/<kind>_<0 idle|1 attack>.png (from tools/render_monsters.py) -> window.MONSTERS
    # Both frames are cropped to one shared box (feet at the bottom) and pixelated so the idle body is 64 px tall.
    mons, mdir = {}, os.path.join(ROOT, 'art', 'monsters')
    kinds = sorted({f.rsplit('_', 1)[0] for f in os.listdir(mdir) if f.endswith('.png')}) if os.path.isdir(mdir) else []
    for kind in kinds:
        fr = [Image.open(os.path.join(mdir, f'{kind}_{i}.png')).convert('RGBA') for i in (0, 1)]
        idle_bb = fr[0].getbbox()
        bbs = [f.getbbox() for f in fr]
        box = (min(b[0] for b in bbs), min(b[1] for b in bbs), max(b[2] for b in bbs), max(b[3] for b in bbs))
        k = 64 / (idle_bb[3] - idle_bb[1])
        size = (max(1, round((box[2] - box[0]) * k)), max(1, round((box[3] - box[1]) * k)))
        frames_px = []
        for f in fr:
            c = f.crop(box)
            # premultiplied downscale so edges do not pick up black fringes, then hard alpha + 1 px dark outline
            pm = Image.new('RGBA', c.size); px = c.load(); pp = pm.load()
            for y in range(c.height):
                for x in range(c.width):
                    r, g, bl, a = px[x, y]; pp[x, y] = (r * a // 255, g * a // 255, bl * a // 255, a)
            sm = pm.resize(size, Image.BOX); sp = sm.load()
            for y in range(size[1]):
                for x in range(size[0]):
                    r, g, bl, a = sp[x, y]
                    if a < 110: sp[x, y] = (0, 0, 0, 0)
                    else:
                        m = 255 / a * 1.15          # un-premultiply, slightly brighter for the dark dungeon
                        sp[x, y] = (min(255, int(r * m)), min(255, int(g * m)), min(255, int(bl * m)), 255)
            o = sm.copy(); op = o.load()
            for y in range(size[1]):
                for x in range(size[0]):
                    if sp[x, y][3] == 0 and any(0 <= x + dx < size[0] and 0 <= y + dy < size[1] and sp[x + dx, y + dy][3]
                                                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                        op[x, y] = (12, 8, 10, 255)
            frames_px.append(o)
        frames_px[0].save(f'/tmp/mon_{kind}.png')
        mons[kind] = {'frames': [data_uri(o) for o in frames_px], 'tall': round(size[1] / 64, 3)}
        print('monster', kind, size)
    fh.write('window.MONSTERS = ' + json.dumps(mons) + ';\n')
print('wrote', out, os.path.getsize(out) // 1024, 'KB')

# preview sheet (2x, dark background) for eyeballing the frames
names = list(assets); cols = max(len(assets[n]['frames']) for n in names)
sheet = Image.new('RGB', (W * 2 * cols // 2, H * len(names)), (46, 50, 68))
for r, n in enumerate(names):
    for c, uri in enumerate(assets[n]['frames']):
        im = Image.open(io.BytesIO(base64.b64decode(uri.split(',')[1]))).convert('RGBA')
        bg = Image.new('RGBA', (W, H), (46, 50, 68, 255)); bg.alpha_composite(im)
        sheet.paste(bg.convert('RGB'), (c * W, r * H))
sheet.save('/tmp/asset_preview.png'); print('preview /tmp/asset_preview.png')
