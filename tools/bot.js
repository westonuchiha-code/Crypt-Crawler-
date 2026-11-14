// Test bot: plays the real game logic (update() at 30 ticks a second, no drawing) from floor 1 to 100 and keeps score.
// Loaded into the page by tools/bot.py through window.__cc.eval, so it sees the game's own variables.
// It is a mediocre player on purpose: it aims with a little error, strafes, backs off from melee, picks a sensible gun,
// grabs pickups, hunts every enemy, then takes the stairs. Its numbers compare zones with each other; they are not
// a prediction of how a person will do.
window.__bot = (function () {
  const DT = 1 / 30, D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const S = { deathFloors: {}, zones: [], t: 0, floorT: 0, zoneDeaths: 0, done: false, log: [] };
  const Z = () => (S.zones[zoneOf(Math.max(1, level))] = S.zones[zoneOf(Math.max(1, level))] ||
    { deaths: 0, floors: 0, time: 0, endHp: 0, fistTicks: 0, fightTicks: 0, timeouts: 0, assists: 0, dmgTaken: 0 });
  let path = [], pathT = 0, strafe = 1, strafeT = 0, wpnT = 0, lastX = 0, lastY = 0, stuckT = 0, lastHp = 100, assist = false;

  function bfs(goalFn, viaStairs) {                         // shortest path of cells from the player to the nearest goal cell
    const sx = Math.floor(P.x), sy = Math.floor(P.y), start = sy * W + sx;
    const prev = new Int32Array(W * H).fill(-1), q = [start]; prev[start] = start;
    const propAt = new Set(props.filter(p => p.solid).map(p => Math.floor(p.y) * W + Math.floor(p.x)));
    for (let i = 0; i < q.length; i++) {
      const c = q[i], x = c % W, y = (c / W) | 0;
      if (c !== start && goalFn(c, x, y)) { const out = []; for (let k = c; k !== start; k = prev[k]) out.push(k); return out.reverse(); }
      for (const [dx, dy] of D4) {
        const nx = x + dx, ny = y + dy, n = ny * W + nx; if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev[n] >= 0) continue;
        const t = map[n];
        const ok = t === 0 || (t === STAIRS && (viaStairs || goalFn(n, nx, ny))) || (t === LOCKED && P.keys > 0) || t === SECRET && false;
        if (ok && !propAt.has(n)) { prev[n] = c; q.push(n); }
      }
    }
    return null;
  }
  const cellOf = o => Math.floor(o.y) * W + Math.floor(o.x);
  function plan() {
    const foes = monsters.filter(m => !m.dead && !m.prop);
    const want = new Set(items.filter(i => !i.taken && (i.kind !== 'potion' || P.hp < P.maxHp * 0.8)).map(cellOf));
    let p = want.size ? bfs(c => want.has(c)) : null;
    if (!p && foes.length) { const fs = new Set(foes.map(cellOf)); p = bfs(c => fs.has(c)); }
    if (!p && !bossAlive()) p = bfs(c => map[c] === STAIRS);
    if (!p) { const fs = new Set(foes.map(cellOf)); p = bfs(c => fs.has(c), true) || bfs(c => map[c] === STAIRS); }
    return p || [];
  }
  function turnTo(a, rate) {
    let d = a - P.a; d = Math.atan2(Math.sin(d), Math.cos(d));
    const step = Math.max(-rate * DT, Math.min(rate * DT, d)); P.a += step; return Math.abs(d - step);
  }
  function pickWeapon(d, n, tgt) {
    const has = w => P.owned[w] && P.ammo[w] > 0;
    if (has('bfg') && n >= 4) return 'bfg';
    if (has('dshot') && d < 2.8) return 'dshot';
    if (has('rocket') && d > 3.5 && tgt.hp > 150) return 'rocket';
    for (const w of ['plasma', 'hstaff', 'mace', 'phoenix', 'claw', 'ewand', 'dshot', 'rocket', 'bfg']) {
      if (!has(w)) continue;
      if ((w === 'phoenix' || w === 'rocket') && d < 2.2) continue;
      if (w === 'mace' && d > 6) continue;
      return w;
    }
    return 'fist';
  }
  function tick() {
    for (const k of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) keys[k] = false;
    const foes = monsters.filter(m => !m.dead && !m.prop && Math.hypot(m.x - P.x, m.y - P.y) < 11 && los(P.x, P.y, m.x, m.y));
    const z = Z();
    if (foes.length) {
      foes.sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y));
      const t = foes[0], d = Math.hypot(t.x - P.x, t.y - P.y);
      if ((wpnT -= DT) <= 0) { wpnT = 0.5; P.weapon = pickWeapon(d, foes.length, t); }
      const fist = P.weapon === 'fist'; z.fightTicks++; if (fist) z.fistTicks++;
      const err = turnTo(Math.atan2(t.y - P.y, t.x - P.x) + Math.sin(S.t * 3.1) * 0.04, 5);
      if (err < (d < 3 ? 0.25 : 0.1) && (!fist || d < 1.4)) fire();
      if (fist) keys.KeyW = d > 1.1;
      else if (d < 3) keys.KeyS = true; else if (d > 7) keys.KeyW = true;
      if ((strafeT -= DT) <= 0) { strafeT = 0.5 + Math.random() * 0.7; strafe = -strafe; }
      if (!fist || d > 2) keys[strafe > 0 ? 'KeyD' : 'KeyA'] = true;
      path = []; pathT = 0;
    } else {
      if ((pathT -= DT) <= 0 || !path.length) { path = plan(); pathT = 0.4; }
      const here = props.find(p => p.solid && Math.floor(p.x) === Math.floor(P.x) && Math.floor(p.y) === Math.floor(P.y));
      if (here) {                                            // brushed into a pillar's cell: step out sideways before following the path
        const out = D4.map(([dx, dy]) => [Math.floor(P.x) + dx + 0.5, Math.floor(P.y) + dy + 0.5]).filter(([x, y]) => !blocked(x, y))
          .sort((a, b) => Math.hypot(a[0] - P.x, a[1] - P.y) - Math.hypot(b[0] - P.x, b[1] - P.y))[0];
        if (out) { if (turnTo(Math.atan2(out[1] - P.y, out[0] - P.x), 9) < 0.5) keys.KeyW = true; }
      } else if (items.some(i => !i.taken && cellOf(i) === cellOf(P) && (i.kind !== 'potion' || P.hp < P.maxHp * 0.8))) {
        const it = items.find(i => !i.taken && cellOf(i) === cellOf(P));   // a pickup in this very cell: walk onto it
        if (turnTo(Math.atan2(it.y - P.y, it.x - P.x), 9) < 0.25) keys.KeyW = true;
      } else if (path.length) {
        const c = path[0]; let tx = (c % W) + 0.5, ty = ((c / W) | 0) + 0.5;
        if (Math.hypot(tx - P.x, ty - P.y) < 0.3 && path.length > 1) path.shift();
        const it = path.length === 1 && items.find(i => !i.taken && cellOf(i) === c);
        if (it) { tx = it.x; ty = it.y; }                    // last step: onto the pickup itself, not the cell centre
        const err = turnTo(Math.atan2(ty - P.y, tx - P.x), 9);
        if (err < 0.25) keys.KeyW = true;
      }
      // a wall worth pushing? try any secret wall within reach, like a player hugging walls would
    }
    if (Math.hypot(P.x - lastX, P.y - lastY) > 0.02) { stuckT = 0; lastX = P.x; lastY = P.y; } else if ((stuckT += DT) > 2.5) { P.a += 1.3; stuckT = 1.5; pathT = 0; }
    const lvBefore = level;
    update(DT); S.t += DT; S.floorT += DT;
    if (P.hp < lastHp) z.dmgTaken += lastHp - P.hp; lastHp = P.hp;
    if (level !== lvBefore) floorDone(lvBefore);
    else if (S.floorT > 480) { z.timeouts++;
      const fl = monsters.filter(m => !m.dead && !m.prop), fs = new Set(fl.map(cellOf)), pl = plan();
      S.log.push(`timeout floor ${level}: foes ${fl.length} boss ${bossAlive()} keys ${P.keys} locked ${map.indexOf(LOCKED) >= 0} | plan ${pl.length} foePath ${(bfs(c => fs.has(c), true) || []).length} stairsPath ${(bfs(c => map[c] === STAIRS) || []).length} blockedHere ${blocked(P.x, P.y)} tile ${map[cellOf(P)]} visibleFoes ${fl.filter(m => los(P.x, P.y, m.x, m.y)).length} nearest ${fl.length ? Math.min(...fl.map(m => Math.hypot(m.x - P.x, m.y - P.y))).toFixed(1) : '-'} foeTiles ${[...new Set(fl.map(m => map[cellOf(m)]))]} at ${P.x.toFixed(2)},${P.y.toFixed(2)} a ${P.a.toFixed(2)} v ${(P.vx||0).toFixed(2)},${(P.vy||0).toFixed(2)} goal ${pl.length ? (pl[0] % W) + ',' + ((pl[0] / W) | 0) : '-'} itemsAt ${items.filter(i => !i.taken && Math.hypot(i.x - P.x, i.y - P.y) < 3).map(i => i.kind + '@' + i.x.toFixed(2) + ',' + i.y.toFixed(2)).join(' ')} propsNear ${props.filter(p => Math.hypot(p.x - P.x, p.y - P.y) < 2).map(p => p.kind + (p.solid ? 'S' : '') + '@' + p.x + ',' + p.y).join(' ')} weapon ${P.weapon} items ${items.filter(i => !i.taken).map(i => i.kind + (bfs(c => c === cellOf(i)) ? '' : '!')).join(',')}`); const lv = level; if (level >= FINAL) { S.done = true; return; } monsters.forEach(m => { m.dead = true; }); nextLevel(); floorDone(lv); }
    if (!running && summary) { const lv = level; $('go').click(); floorDone(lv); return; }     // zone results screen: press start
    if (!running) {                                          // died, or won
      if (level >= FINAL && !bossAlive() && P.hp > 0) { S.done = true; return; }
      z.deaths++; S.zoneDeaths++; S.deathFloors[level] = (S.deathFloors[level] || 0) + 1;
      const cp = loadCheckpoint();
      if (cp && cp.floor > 1) continueGame(cp); else { resetGame(); nextLevel(); }
      if (S.zoneDeaths >= 8) { assist = true; z.assists++; }  // hopelessly stuck: carry on with double health so later zones still get measured
      if (assist) { P.maxHp *= 2; P.hp = P.maxHp; }
      lastHp = P.hp; S.floorT = 0; path = [];
    }
  }
  function floorDone(lv) {
    const z = S.zones[zoneOf(lv)]; z.floors++; z.time += S.floorT; z.endHp += lastHp / P.maxHp; S.floorT = 0; path = []; lastHp = P.hp;
    if (lv % 10 === 0) { S.zoneDeaths = 0; assist = false; }
  }
  return {
    // start(floor): begin at that floor with every gun unlocked by then and two caches' worth of ammo each (a stand-in for a checkpoint)
    start(floor = 1) {
      try { localStorage.removeItem('cc_save'); } catch (e) {}
      resetGame();
      if (floor > 1) { level = floor - 1; for (const w in WEAPON_FLOOR) if (floor >= WEAPON_FLOOR[w]) { P.owned[w] = true; P.ammo[w] = CRATE_AMMO[w] * 2; } }
      nextLevel(); lastHp = P.hp;
    },
    run(ticks) { for (let i = 0; i < ticks && !S.done; i++) tick(); return { level, done: S.done, t: Math.round(S.t) }; },
    report() { return JSON.stringify({ deathFloors: S.deathFloors, zones: S.zones, log: S.log.slice(0, 30), secs: Math.round(S.t) }); }
  };
})();
