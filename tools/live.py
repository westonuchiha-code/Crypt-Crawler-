"""Smoke test: builds the page, then exercises every system once in a real browser and reports page errors.

Fires every weapon on three floors, then checks traps, dart walls, locked doors, secrets, pods, pickups, armour and
power-ups, difficulty, resume saves and checkpoints, pause, zone results, achievements, the boss bar, settings,
the victory fallback, every menu screen by keyboard alone and by controller alone, and that the pad-free release build loads. Must end with: errors: none
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
    # every menu screen must work from the keyboard alone and from a controller alone (no pointer)
    pg3 = b.new_page(viewport={'width': 960, 'height': 540}); pg3.route('**/three.min.js', lambda r: r.abort()); pg3.on('pageerror', lambda e: errs.append('menus: ' + str(e)))
    pg3.add_init_script("window.__pad = { connected: true, axes: [0,0,0,0], buttons: Array.from({length: 17}, () => ({ pressed: false, value: 0 })) }; navigator.getGamepads = () => [window.__pad];")
    pg3.goto('file://' + ROOT + '/index.html#nopad'); pg3.wait_for_timeout(1000)
    ev3 = lambda s: pg3.evaluate('s => window.__cc.eval(s)', s)
    key = lambda k: (pg3.keyboard.press(k), pg3.wait_for_timeout(50))
    def pad(i): pg3.evaluate(f"__pad.buttons[{i}].pressed = true"); pg3.wait_for_timeout(80); pg3.evaluate(f"__pad.buttons[{i}].pressed = false"); pg3.wait_for_timeout(80)
    screen = lambda: pg3.evaluate("['optpanel','keypanel','recpanel','credits'].find(id => document.getElementById(id).classList.contains('on')) || 'menu'")
    names = [x.strip() for x in pg3.evaluate("[...document.querySelectorAll('#menu button')].filter(b => b.style.display !== 'none').map(b => b.textContent).join('|')").split('|')]
    ok('title menu is start, options, controls, records, credits', names == ['START', 'OPTIONS', 'CONTROLS', 'RECORDS', 'CREDITS'])
    ok('nothing in the title menu overlaps', pg3.evaluate("(() => { const r = [...document.querySelectorAll('#title, #intro, #hiscore, #menu button')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect()).sort((a, b) => a.top - b.top); return r.every((x, i) => i === 0 || x.top >= r[i - 1].bottom - 6) && r[r.length - 1].bottom <= innerHeight; })()"))
    for i, want in enumerate(['optpanel', 'keypanel', 'recpanel', 'credits']):
        for _ in range(i + 1): key('ArrowDown')
        key('Enter'); a_ok = screen() == want; key('Escape'); b_ok = screen() == 'menu'
        for _ in range(i + 1): key('ArrowUp')
        ok(f'keyboard opens and closes {want}', a_ok and b_ok)
    key('ArrowDown'); key('Enter'); v0 = ev3("opts.music"); key('ArrowDown'); key('ArrowRight'); v1 = ev3("opts.music"); key('ArrowLeft'); key('Escape'); key('ArrowUp')
    ok('keyboard changes a setting', v1 > v0)
    for i, want in enumerate(['optpanel', 'keypanel', 'recpanel', 'credits']):
        for _ in range(i + 1): pad(13)
        pad(0); a_ok = screen() == want; pad(1); b_ok = screen() == 'menu'
        for _ in range(i + 1): pad(12)
        ok(f'controller opens and closes {want}', a_ok and b_ok)
    pad(13); pad(13); pad(13); pad(13); pad(0); pg3.evaluate("__pad.axes[1] = 1"); pg3.wait_for_timeout(400); pg3.evaluate("__pad.axes[1] = 0")
    ok('controller scrolls the credits', pg3.evaluate("document.getElementById('credits').scrollTop") > 100); pad(1)
    for _ in range(4): pad(12)
    ev3("introSeen = true"); pad(0); pg3.wait_for_timeout(200)
    ok('controller starts the game', ev3("running"))
    pad(9); pg3.wait_for_timeout(350); ok('controller pauses', ev3("paused")); pad(1); pg3.wait_for_timeout(100); ok('controller resumes with B', ev3("running"))
    # the release build (no on-screen pad) loads and runs
    subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'build.py'), '--release'], check=True, capture_output=True)
    pg2 = b.new_page(); pg2.on('pageerror', lambda e: errs.append('release: ' + str(e)))
    pg2.goto('file://' + ROOT + '/dist/index.html'); pg2.wait_for_timeout(400)
    ok('release build loads without the pad', pg2.evaluate("typeof RQPad === 'undefined' && typeof THREE === 'object' && typeof MONSTERS === 'object' && typeof __cc === 'object'"))
    print('kinds seen:', kinds)
    print('checks failed:', fails or 'none')
    print('errors:', (errs + fails) or 'none')
    b.close()
