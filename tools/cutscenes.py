"""Play the intro and the ending end to end (with WebGL, three.js loaded) and check they hand over correctly.

Usage: python3 tools/cutscenes.py [sheet.png]
Steps each cutscene through its whole length in simulated time, then also checks that it can be skipped.
With a path, saves a contact sheet of frames from both. Must print: errors: none
"""
import os, sys, subprocess
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'build.py')], check=True)
shots = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 640, 'height': 360})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + ROOT + '/index.html#nopad'); pg.wait_for_timeout(500)
    ev = lambda s: pg.evaluate('s => window.__cc.eval(s)', s)
    snap = lambda: (pg.wait_for_timeout(120), shots.append(pg.screenshot()))
    ok = lambda name, cond: print(('ok   ' if cond else 'FAIL ') + name) or (cond or errs.append('check failed: ' + name))
    ok('three.js loaded', pg.evaluate("typeof THREE") == 'object')
    # intro: the first PRESS START plays it, and it ends in the entrance hall
    pg.click('#go'); pg.wait_for_timeout(300)
    ok('intro started', ev("introActive") is True)
    for i in range(16 * 20 + 10):
        if not ev("introActive"): break
        ev("stepIntro(0.05)")
        if i % 60 == 30: snap()
    ok('intro finished into the game', ev("!introActive && running && level === 0"))
    ok('intro caption hidden', pg.evaluate("getComputedStyle(document.getElementById('caption')).display") == 'none')
    # intro skip
    ev("introSeen = false; showMenu('CRYPT CRAWLER', '', 'START')"); pg.wait_for_timeout(950); pg.click('#go'); pg.wait_for_timeout(800)
    pg.keyboard.press('Space'); pg.wait_for_timeout(200)
    ok('intro skipped with a key', ev("!introActive && running"))
    # ending: victory() plays it, then the SPIRE CONQUERED menu
    ev("level = 100; kills = 321; runT = 5400; victory()"); pg.wait_for_timeout(300)
    ok('ending started', ev("endActive") is True)
    for i in range(32 * 20 + 10):
        if not ev("endActive"): break
        ev("stepEnding(0.05)")
        if i % 110 == 55: snap()
    ok('ending finished into the victory menu', ev("!endActive && !running") and pg.inner_text('#title') == 'SPIRE CONQUERED')
    ok('credits roll hidden afterwards', pg.evaluate("getComputedStyle(document.getElementById('endroll')).display") == 'none')
    # ending skip (guarded for 2.5 s)
    ev("victory()"); pg.wait_for_timeout(600); pg.keyboard.press('Space'); pg.wait_for_timeout(150)
    ok('ending ignores a key in the first 2.5 s', ev("endActive") is True)
    pg.wait_for_timeout(2200); pg.keyboard.press('Space'); pg.wait_for_timeout(200)
    ok('ending skipped with a key after that', ev("!endActive"))
    print('errors:', errs or 'none')
    b.close()
if len(sys.argv) > 1 and shots:
    import io
    from PIL import Image
    ims = [Image.open(io.BytesIO(s)) for s in shots]; w, h = ims[0].size
    sheet = Image.new('RGB', (w * 4, h * ((len(ims) + 3) // 4)))
    for i, im in enumerate(ims): sheet.paste(im, ((i % 4) * w, (i // 4) * h))
    sheet.save(sys.argv[1]); print('sheet', sys.argv[1])
