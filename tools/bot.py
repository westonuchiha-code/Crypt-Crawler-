"""Let the test bot (tools/bot.js) play the whole climb and print how each zone went.

Usage: python3 tools/bot.py [runs] [first floor] [average|weak] [last floor] [easy|normal|hard]      (default 3 full climbs, average skill)
Columns: deaths per climb; hp% = average health left at the end of a floor; time = game seconds per floor;
fist% = share of fighting done with fists (ammo ran out); hit = damage taken per floor; t/o = floors the bot could not
finish in 8 minutes (a sign of a soft-lock); assist = times it needed double health to get through.
The bot is a fixed, mediocre player: use it to compare zones and catch spikes or bugs, not to predict a human.
"""
import sys, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
runs = int(sys.argv[1]) if len(sys.argv) > 1 else 3
first = int(sys.argv[2]) if len(sys.argv) > 2 else 1      # optional: start every climb at this floor
skill = sys.argv[3] if len(sys.argv) > 3 else 'average'  # or 'weak': slow aim, no dodging, poor gun choice
last = int(sys.argv[4]) if len(sys.argv) > 4 else 100     # stop after this floor
diff = sys.argv[5] if len(sys.argv) > 5 else 'normal'     # easy | normal | hard
deaths_at = {}
wtot, wmeta = {}, {}
tot, logs = [None] * 10, []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for r in range(runs):
        pg = b.new_page(); pg.route('**/three.min.js', lambda rt: rt.abort())
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('file://' + ROOT + '/index.html#nopad'); pg.click('#go'); pg.wait_for_timeout(300)
        ev = lambda s: pg.evaluate('s => window.__cc.eval(s)', s)
        ev(open(os.path.join(ROOT, 'tools', 'bot.js')).read()); ev(f"__bot.start({first}, '{skill}', '{diff}')")
        for _ in range(4000):
            st = ev('__bot.run(3000)')
            if st['done'] or errs or st['level'] > last: break
        rep = json.loads(ev('__bot.report()')); logs += rep['log'] + errs
        wmeta = rep
        for w, d in rep['weapons'].items():
            t = wtot.setdefault(w, dict(shots=0, dmg=0, kills=0, ticks=0))
            for k in t: t[k] += d[k]
        for k, v in rep['deathFloors'].items(): deaths_at[int(k)] = deaths_at.get(int(k), 0) + v
        print(f'run {r + 1}: reached floor {st["level"]}, done={st["done"]}, {rep["secs"] // 60} game minutes', file=sys.stderr)
        for i, z in enumerate(rep['zones']):
            if z: tot[i] = {k: (tot[i][k] if tot[i] else 0) + v for k, v in z.items()}
        pg.close()
    b.close()
print('zone deaths  hp%  time  fist%   hit  t/o assist')
for i, z in enumerate(tot):
    if not z: continue
    f = max(1, z['floors'])
    print(f"{i + 1:>4} {z['deaths'] / runs:>6.1f} {100 * z['endHp'] / f:>4.0f} {z['time'] / f:>5.0f} {100 * z['fistTicks'] / max(1, z['fightTicks']):>5.0f} {z['dmgTaken'] / f:>5.0f} {z['timeouts']:>4} {z['assists']:>6}")
if wtot:
    allt = sum(t['ticks'] for t in wtot.values()) or 1
    print('weapon     shots  dmg/shot  assumed  dps-in-use  use%  kills      (dmg/shot is before the zone bonus; "assumed" is AMMO_DMG)')
    for w in ['fist', 'ewand', 'dshot', 'phoenix', 'claw', 'hstaff', 'mace', 'plasma', 'rocket', 'bfg']:
        t = wtot.get(w)
        if not t or not t['shots']: continue
        print(f"{w:<9} {t['shots']:>6} {t['dmg'] / t['shots']:>9.1f} {wmeta['ammoDmg'].get(w, 0):>8} {t['dmg'] / max(1, t['ticks']) * 30:>11.1f} {100 * t['ticks'] / allt:>5.0f} {t['kills']:>6}")
print('deaths by floor:', ' '.join(f'{k}:{v}' for k, v in sorted(deaths_at.items())) or 'none')
for l in sorted(set(logs))[:20]: print(' ', l[:520])
