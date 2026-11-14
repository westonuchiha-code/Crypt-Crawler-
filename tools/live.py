"""Smoke test: builds the page, then exercises every system once in a real browser and reports page errors.

Fires every weapon on three floors, then checks traps, dart walls, locked doors, secrets, pods, pickups, armour and
power-ups, difficulty, resume saves and checkpoints, pause, zone results, achievements, the boss bar, settings,
the victory fallback, and that the pad-free release build loads. Must end with: errors: none
(The cutscenes have their own test, tools/cutscenes.py; balance and level generation have tools/bot.py.)
"""
import os, sys, subprocess
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'build.py')], check=True)   # test what src/ says, not a stale page
fails = []
def ok(name, cond):
    if not cond: fails.append(name); print('FAIL', name)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 640, 'height': 400})
    pg.route('**/three.min.js', lambda r: r.abort())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + ROOT + '/index.html#nopad'); pg.click('#go'); pg.wait_for_timeout(300)
    ev = lambda s: pg.evaluate('s => window.__cc.eval(s)', s)
    # every weapon, on an early, a middle and a late floor
    for lv in [1, 46, 96]:
        ev(f"level = {lv}; generate({lv}); P.hp = 9999;")
        for w in ['ewand','dshot','phoenix','claw','hstaff','mace','plasma','rocket','bfg','fist']:
            ev(f"P.owned.{w} = true; P.ammo.{w} = 9; P.weapon = '{w}'; monsters.push(spawnMonster(P.x + Math.cos(P.a)*2, P.y + Math.sin(P.a)*2, 'imp', 1)); P.fire = 0; fire();")
            pg.wait_for_timeout(250)
    kinds = ev("[...new Set(monsters.map(m => m.kind))].join(',')")
    # a floor that has a trap, a dart wall, a locked door and a secret
    ok('floor with trap, darts, lock and secret found', ev("""(function(){ for (let k = 0; k < 400; k++) { P = newPlayer(); level = 24; generate(24);
        if (traps.length && darts.length && map.indexOf(LOCKED) >= 0 && map.indexOf(SECRET) >= 0 && items.some(i => i.kind === 'key')) return true; } return false; })()"""))
    ev("monsters = []; running = true;")
    ok('spikes hurt', ev("(function(){ const t = traps[0]; P.x = t.x + .5; P.y = t.y + .5; t.ph = -performance.now() / 1000 + 0.1; P.hp = P.maxHp; trapHurtT = 0; update(1 / 30); return P.hp < P.maxHp; })()"))
    ok('dart wall fires and the dart hits', ev("(function(){ const d = darts[0]; shots = []; P.x = d.x + .5 + d.dx * 2.5; P.y = d.y + .5 + d.dy * 2.5; P.hp = P.maxHp; d.t = 0; for (let i = 0; i < 40; i++) update(1 / 30); return P.hp < P.maxHp; })()"))
    face = "(function(t){ const c = map.indexOf(t), x = c % W, y = (c / W) | 0; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) if (!solid(x + .5 + dx, y + .5 + dy)) { P.x = x + .5 + dx * 0.9; P.y = y + .5 + dy * 0.9; P.a = Math.atan2(-dy, -dx); P.vx = P.vy = 0; return; } })"
    ev(face + "(LOCKED)"); ev("P.keys = 0; update(1 / 30)")
    ok('locked door stays shut without the key', ev("map.indexOf(LOCKED) >= 0"))
    ev("pickupItem('key'); update(1 / 30)")
    ok('locked door opens with the key', ev("map.indexOf(LOCKED) < 0 && P.keys === 0"))
    n0 = ev("secrets.found"); ev(face + "(SECRET)"); ev("update(1 / 30)")   # (the page's own frame loop may open it first; either way it must open once)
    ok('secret wall opens', ev("secrets.found") == n0 + 1)
    ok('pod bursts and hurts what is near', ev("(function(){ const a = spawnMonster(P.x + 1, P.y, 'pod', 24), g = spawnMonster(P.x + 1.4, P.y, 'ghoul', 24); monsters.push(a, g); P.ward = 0; P.hp = P.maxHp; hurtMonster(a, 99); return a.dead && g.hp < g.maxHp && P.hp < P.maxHp; })()"))
    ok('armour soaks half', ev("(function(){ P.ward = 0; P.armor = 0; P.hp = P.maxHp; pickupItem('armour'); hurtPlayer(20); return P.hp === P.maxHp - 10 && P.armor === 40; })()"))
    ok('ward blocks, fury doubles', ev("(function(){ pickupItem('ward'); const h = P.hp; hurtPlayer(50); P.ward = 0; const m = spawnMonster(P.x + 3, P.y, 'knight', 24); P.fury = 0; hurtMonster(m, 10); const d1 = m.maxHp - m.hp; pickupItem('fury'); hurtMonster(m, 10); const d2 = m.maxHp - m.hp - d1; P.fury = 0; return P.hp === h && d2 === d1 * 2; })()"))
    ok('difficulty scales enemies', ev("(function(){ const f = d => { opts.diff = d; const m = spawnMonster(1, 1, 'knight', 35); return m.hp * 1000 + m.dmg; }; const e = f('easy'), n = f('normal'), h = f('hard'); opts.diff = 'normal'; return e < n && n < h; })()"))
    # saves: resume restores exactly, death falls back to the checkpoint with a refill
    ev("level = 30; nextLevel(true); running = true; P.hp = 61; P.armor = 30; P.ammo.ewand = 3; kills = 44; saveResume();")
    ok('resume save restores the floor exactly', ev("(function(){ const rs = loadResume(); P = newPlayer(); continueGame(rs, true); return level === 31 && P.hp === 61 && P.armor === 30 && P.ammo.ewand === 3 && kills === 44; })()"))
    ev("hurtPlayer(99999)"); pg.wait_for_timeout(100)
    ok('death shows game over and clears the resume save', pg.inner_text('#title') == 'GAME OVER' and ev("loadResume() === null"))
    ok('mouse is released on the menu', pg.evaluate("document.pointerLockElement === null"))
    ev("continueGame(loadCheckpoint())")
    ok('checkpoint retry is on floor 31, full health, with ammo', ev("level === 31 && P.hp === P.maxHp && P.owned.dshot && P.ammo.dshot > 0 && running"))
    # pause and settings
    pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
    ok('Esc pauses', ev("paused && !running") and pg.inner_text('#title') == 'PAUSED')
    ev("resumeGame()"); ok('resume', ev("running && !paused"))
    ok('field of view setting', ev("(function(){ setFov(90); const a = FOV_PLANE; setFov(67); return a > 0.99 && a < 1.01 && FOV_PLANE < 0.67; })()"))
    # boss floor: arena, bar, kill, zone results, achievement
    ev("level = 9; nextLevel(true); running = true; monsters = monsters.filter(m => m.boss); const bb = monsters[0]; bb.woke = true; bb.stun = 99; update(1 / 30);")
    ok('boss bar shows for an alerted boss', pg.evaluate("getComputedStyle(document.getElementById('bossbar')).display") == 'flex' and pg.inner_text('#bossname') == 'THE WARDEN')
    ev("hurtMonster(monsters[0], 99999); update(1 / 30)")
    ok('boss bar hides when the boss dies', pg.evaluate("getComputedStyle(document.getElementById('bossbar')).display") == 'none')
    ok('achievement unlocked for the first boss', pg.evaluate("!!((JSON.parse(localStorage.getItem('cc_stats')) || {}).ach || {}).boss1"))
    ev("nextLevel()"); pg.wait_for_timeout(100)
    ok('zone results screen', pg.inner_text('#title') == 'CRYPT CLEARED' and ev("summary && !running"))
    pg.wait_for_timeout(950); pg.keyboard.press('Enter'); pg.wait_for_timeout(150)
    ok('start goes on to floor 11', ev("level === 11 && running"))
    ev("victory()")   # Three.js is blocked here, so the ending falls back to the menu
    ok('victory menu', pg.inner_text('#title') == 'SPIRE CONQUERED')
    # the release build (no on-screen pad) loads and runs
    subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'build.py'), '--release'], check=True, capture_output=True)
    pg2 = b.new_page(); pg2.on('pageerror', lambda e: errs.append('release: ' + str(e)))
    pg2.goto('file://' + ROOT + '/dist/index.html'); pg2.wait_for_timeout(400)
    ok('release build loads without the pad', pg2.evaluate("typeof RQPad === 'undefined' && typeof THREE === 'object' && typeof MONSTERS === 'object' && typeof __cc === 'object'"))
    print('kinds seen:', kinds)
    print('checks failed:', fails or 'none')
    print('errors:', (errs + fails) or 'none')
    b.close()
