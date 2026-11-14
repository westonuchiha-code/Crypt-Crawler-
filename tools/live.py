"""Live smoke test: plays each weapon for real (loop running, monsters ahead) and reports page errors."""
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 640, 'height': 400})
    pg.route('**/three.min.js', lambda r: r.abort())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/crypt-crawler/index.html#nopad'); pg.click('#go'); pg.wait_for_timeout(300)
    ev = lambda s: pg.evaluate('s => window.__cc.eval(s)', s)
    for lv in [1, 4, 6]:
        ev(f"level = {lv}; generate({lv}); P.hp = 9999;")
        for w in ['pistol','shotgun','wand','lightning']:
            ev(f"P.weapon = '{w}'; monsters.push(spawnMonster(P.x + Math.cos(P.a)*2, P.y + Math.sin(P.a)*2, 'imp', 1)); P.fire = 0; fire();")
            pg.wait_for_timeout(250)
    print('kinds seen:', ev("[...new Set(monsters.map(m => m.kind))].join(',')"))
    print('errors:', errs or 'none')
    b.close()
