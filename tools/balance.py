"""Balance table: for each zone, what a floor asks of the player and what it gives back (averaged over generated floors).

foes / foeHP: enemies on a floor and their total health.  ammoDmg: damage the floor's ammo can deal; ammo/HP is the margin.
avgHit: average enemy hit.  hits2die: max health / avgHit.  heal: potions plus the stair heal, also shown in hits.
Run after any change to enemy stats, rosters, loot or the formulas at the top of index.html.
"""
from playwright.sync_api import sync_playwright
JS = r"""
(function(){
  const DPA = { pistol: 12, shotgun: 40, wand: 40, lightning: 25 };   // rough damage per unit of ammo in real play
  const rows = [];
  for (let z = 0; z < 10; z++) {
    const acc = { n: 0, hp: 0, ammo: 0, hit: 0, heal: 0, boss: 0, maxHp: 0 }, N = 12;
    for (let k = 0; k < N; k++) {
      const lv = z * 10 + 2 + (k % 8);          // non-boss floors 2..9 of the zone
      P = newPlayer(); level = lv; if (typeof zoneMaxHp === "function") P.maxHp = zoneMaxHp(lv);
      generate(lv);
      const ms = monsters.filter(m => !m.boss);
      acc.n += ms.length; acc.hp += ms.reduce((a, m) => a + m.hp, 0);
      acc.hit += ms.reduce((a, m) => a + m.dmg, 0) / ms.length;
      const am = typeof floorAmmo !== "undefined" ? floorAmmo : 1;
      const pool = Object.keys(WEAPON_FLOOR).filter(w => lv >= WEAPON_FLOOR[w]);
      const crate = pool.reduce((a, w) => a + Math.round(CRATE_AMMO[w] * am) * DPA[w], 0) / pool.length;
      const box = pool.reduce((a, w) => a + Math.round(BOX_AMMO[w] * am) * DPA[w], 0);
      const drop = pool.reduce((a, w) => a + Math.max(1, Math.round(BOX_AMMO[w] * am / 2)) * DPA[w], 0) / pool.length;
      for (const it of items) acc.ammo += it.kind === 'crate' ? crate : it.kind === 'ammo' ? box : 0;
      acc.ammo += ms.length * 0.3 * drop;
      const pot = typeof potionHeal === 'function' ? potionHeal(lv) : 35;
      acc.heal += items.filter(i => i.kind === 'potion').length * pot + Math.round(P.maxHp / 4);
      acc.maxHp += P.maxHp;
    }
    for (const k in acc) acc[k] /= N;
    rows.push([z + 1, acc.n.toFixed(1), Math.round(acc.hp), Math.round(acc.ammo), (acc.ammo / acc.hp).toFixed(2), acc.hit.toFixed(1),
      Math.round(acc.maxHp), (acc.maxHp / acc.hit).toFixed(1), Math.round(acc.heal), (acc.heal / acc.hit).toFixed(1), BOSS_HP[(z + 1) * 10]].join('\t'));
  }
  return rows.join('\n');
})()
"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(); pg.route('**/three.min.js', lambda r: r.abort())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + ROOT + '/index.html#nopad'); pg.click('#go'); pg.wait_for_timeout(300)
    print('zone\tfoes\tfoeHP\tammoDmg\tammo/HP\tavgHit\tmaxHP\thits2die\theal\thealHits\tbossHP')
    print(pg.evaluate('s => window.__cc.eval(s)', JS)); print('errors:', errs or 'none'); b.close()
