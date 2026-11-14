"""Copy the sprite frames the cast needs out of Freedoom and Blasphemer checkouts into art/enemies/.

Usage: python3 tools/import_enemies.py <freedoom dir> <blasphemer dir>
  git clone --depth 1 https://github.com/freedoom/freedoom      (art here taken at commit 21d783c)
  git clone --depth 1 https://github.com/Blasphemer/blasphemer  (commit 5d858ad)
Keeps only front-facing frames (rotation 1 or 0) of the prefixes in tools/enemy_cast.py, as PNG, plus each sprite's
origin (the point that stands on the floor) in offsets.txt and the projects' licence and credit files.
Run tools/pack_assets.py afterwards.
"""
import sys, os, re, glob, shutil, struct
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from enemy_cast import CAST, SETS, SHOTS, ITEMS, HELD, held_frames, PROPS

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = {'f': sys.argv[1], 'b': sys.argv[2]}
OFFS = {'f': 'buildcfg.txt', 'b': 'wadinfo.txt'}
def grab(f):
    """Origin stored in a PNG's grAb chunk (how some Blasphemer sprites carry it), or None."""
    d = open(f, 'rb').read(); i = 8
    while f.endswith('.png') and i < len(d):
        n, t = struct.unpack('>I4s', d[i:i + 8])
        if t == b'grAb': return tuple(str(v) for v in struct.unpack('>ii', d[i + 8:i + 16]))
        i += 12 + n

for s, name in SETS.items():
    out = os.path.join(ROOT, 'art', 'enemies', name)
    shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
    offs = {}
    for line in open(os.path.join(SRC[s], OFFS[s]), errors='replace'):
        p = re.split(r'[;#]', line)[0].split()
        if len(p) >= 3 and re.fullmatch(r'-?\d+', p[1]) and re.fullmatch(r'-?\d+', p[2]): offs[p[0].lower()] = (p[1], p[2])
    kept = []
    for pre in sorted({c[1] for c in CAST.values() if c[0] == s}):
        for f in sorted(glob.glob(os.path.join(SRC[s], 'sprites', pre + '*'))):
            b, ext = os.path.splitext(os.path.basename(f))
            if ext not in ('.png', '.gif') or len(b) < 6 or not b[4].isalpha() or b[5] not in '10': continue
            g = grab(f)
            if g and b not in offs: offs[b] = g
            Image.open(f).convert('RGBA').save(os.path.join(out, b + '.png'), optimize=True); kept.append(b)
    named = list(SHOTS.values()) + list(ITEMS.values()) + list(PROPS.values()) + [(HELD[w][0], held_frames(w)) for w in HELD]
    for sh in named:                                            # projectile, pickup and held-weapon frames are named outright
        for b in sh[1] if sh[0] == s else []:
            Image.open(sorted(glob.glob(os.path.join(SRC[s], 'sprites', b + '.*')))[-1]).convert('RGBA').save(os.path.join(out, b + '.png'), optimize=True); kept.append(b)
    with open(os.path.join(out, 'offsets.txt'), 'w') as fh:
        for b in kept:
            if b in offs: fh.write(f'{b} {offs[b][0]} {offs[b][1]}\n')
            else: print('no offset (will use bottom centre):', name, b)
    for f in glob.glob(os.path.join(SRC[s], 'COPYING*')) + glob.glob(os.path.join(SRC[s], 'CREDITS*')):
        if not re.search('LEVELS|MUSIC', f): shutil.copy(f, out)
    print(name, len(kept), 'frames')
