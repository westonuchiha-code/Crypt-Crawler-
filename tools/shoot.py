"""Screenshot harness for Crypt Crawler held weapons.

Usage: python3 shoot.py [out.png] [weapons...]
Freezes the game update loop, then poses each weapon at several attack
phases and tiles the captures into one contact sheet (rows = weapons).
"""
import sys, io
from playwright.sync_api import sync_playwright
from PIL import Image

GAME = 'file:///home/claude/crypt-crawler/index.html#nopad'
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/sheet.png'
WEAPONS = sys.argv[2:] or ['fist', 'pistol', 'shotgun', 'wand', 'lightning']
# phases: (label, P.anim, P.swingT, P.flash)
PHASES = [('idle', 0, 9, 0), ('fire', 1, 0.05, 0.08), ('mid', 0.6, 0.2, 0), ('late', 0.25, 0.36, 0)]

SETUP = """{
  running = false; monsters = []; pshots = []; bolts = []; shots = [];
  P.x = 3.5; P.y = 5.5; P.a = -Math.PI / 2;
}"""
POSE = """{ const [w, anim, swingT, flash] = window.__pose;
  P.weapon = w; P.anim = anim; P.swingT = swingT; P.flash = flash; pshots = []; bolts = [];
  if (anim >= 1 && w === 'lightning') {
    monsters = [spawnMonster(3.5, 2.5, 'ghoul', 1)];
    chainLightning(WEAPONS.lightning);
  }
  if (w === 'crossbow' && anim > 0 && anim < 1) {
    spawnPlayerShot(WEAPONS.crossbow);
    const s = pshots[0]; s.x += s.vx * (1 - anim) * 0.25; s.y += s.vy * (1 - anim) * 0.25;
  }
  if (w === 'wand' && anim > 0 && anim < 1) spawnPlayerShot(WEAPONS.wand);
}"""

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 640, 'height': 400})
    pg.route('**/three.min.js', lambda r: r.abort())   # skip the 3D intro
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(GAME)
    pg.click('#go'); pg.wait_for_timeout(300)
    pg.evaluate('s => window.__cc.eval(s)', SETUP)
    rows = []
    for w in WEAPONS:
        row = []
        for label, anim, st, fl in PHASES:
            pg.evaluate('a => window.__pose = a', [w, anim, st, fl]); pg.evaluate('s => window.__cc.eval(s)', POSE)
            pg.wait_for_timeout(60)
            row.append(Image.open(io.BytesIO(pg.screenshot())).resize((320, 200)))
        rows.append(row)
    b.close()
    sheet = Image.new('RGB', (320 * len(PHASES), 200 * len(rows)))
    for r, row in enumerate(rows):
        for c, im in enumerate(row):
            sheet.paste(im, (c * 320, r * 200))
    sheet.save(OUT)
    print('saved', OUT, 'errors:', errs or 'none')
