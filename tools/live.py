"""Live smoke test: plays each weapon for real (loop running, monsters ahead) and reports page errors."""
import os, sys, subprocess
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'build.py')], check=True)   # test what src/ says, not a stale page
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 640, 'height': 400})
    pg.route('**/three.min.js', lambda r: r.abort())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + ROOT + '/index.html#nopad'); pg.click('#go'); pg.wait_for_timeout(300)
    ev = lambda s: pg.evaluate('s => window.__cc.eval(s)', s)
    for lv in [1, 46, 96]:
        ev(f"level = {lv}; generate({lv}); P.hp = 9999;")
        for w in ['ewand','dshot','phoenix','claw','hstaff','mace','plasma','rocket','bfg','fist']:
            ev(f"P.owned.{w} = true; P.ammo.{w} = 9; P.weapon = '{w}'; monsters.push(spawnMonster(P.x + Math.cos(P.a)*2, P.y + Math.sin(P.a)*2, 'imp', 1)); P.fire = 0; fire();")
            pg.wait_for_timeout(250)
    ev("victory()")   # Three.js is blocked here, so the ending falls back to the menu
    print('victory menu:', pg.inner_text('#title'))
    print('kinds seen:', ev("[...new Set(monsters.map(m => m.kind))].join(',')"))
    print('errors:', errs or 'none')
    b.close()
