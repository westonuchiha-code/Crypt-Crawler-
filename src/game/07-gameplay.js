// ---------- gameplay ----------
function showMsg(t) {
  msgEl.textContent = t; msgEl.style.opacity = 1; msgT = 2.4;
  msgEl.style.top = ($('hud').getBoundingClientRect().bottom + 6) + 'px';   // always below the HUD, even when it wraps on narrow screens
}
function bossAlive() { return monsters.some(m => m.boss && !m.dead); }

// ---- arcade menu state: best run kept in localStorage (per browser) ----
function loadBest() { try { return JSON.parse(localStorage.getItem('cc_best')) || { floor: 0, kills: 0 }; } catch (e) { return { floor: 0, kills: 0 }; } }
function saveBest() {
  const b = loadBest(), isNew = level > b.floor || (level === b.floor && kills > b.kills);
  if (isNew) try { localStorage.setItem('cc_best', JSON.stringify({ floor: level, kills })); } catch (e) {}
  return isNew;
}
function showMenu(title, text, go, dead) {
  running = false;
  if (document.pointerLockElement) { lockDropT = performance.now(); document.exitPointerLock(); }   // give the mouse back so the menu can be clicked
  if (title === 'CRYPT CRAWLER') setMusic('title'); else if (title === 'SPIRE CONQUERED') setMusic('win');
  $('title').textContent = title; $('title').classList.toggle('dead', !!dead);
  $('tag').style.display = title === 'CRYPT CRAWLER' ? '' : 'none';
  introEl.textContent = text; $('go').textContent = go;
  const b = loadBest();
  $('hiscore').innerHTML = b.floor ? `TOP CLIMB &nbsp;<b>FLOOR ${b.floor}</b> &nbsp;·&nbsp; <b>${b.kills}</b> SLAIN` : 'TOP CLIMB &nbsp;<b>---</b>';
  const cp = (!dead && loadResume()) || loadCheckpoint(), canCont = cp && cp.floor > 1 && title !== 'SPIRE CONQUERED';
  if (canCont && !dead && title === 'CRYPT CRAWLER') $('go').textContent = `PRESS START · FLOOR ${cp.floor}`;
  $('newclimb').style.display = canCont ? '' : 'none'; $('quit').style.display = 'none'; paused = false; summary = false;
  overlay.style.display = 'flex'; menuShownAt = performance.now();
}
let menuShownAt = performance.now(), paused = false, summary = false, lockDropT = -1e9;   // lockDropT: when the game itself last let go of the mouse
// ---- zone results: shown when you take the stairs after a boss; PRESS START carries on to the next zone ----
let zoneStat = { t: 0, kills0: 0, hurt: 0, secrets: 0, secretsAll: 0 }, runT = 0;
// lifetime records, localStorage 'cc_stats': counters plus the best time for each zone and for a whole climb
function loadStats() { try { return Object.assign({ deaths: 0, kills: 0, secrets: 0, wins: 0, zoneBest: [], runBest: 0 }, JSON.parse(localStorage.getItem('cc_stats')) || {}); } catch (e) { return { deaths: 0, kills: 0, secrets: 0, wins: 0, zoneBest: [], runBest: 0 }; } }
function bumpStats(add, zone, zoneTime, runTime) {
  const s = loadStats();
  for (const k in add) s[k] = (s[k] || 0) + add[k];
  if (zone !== undefined && (!s.zoneBest[zone] || zoneTime < s.zoneBest[zone])) s.zoneBest[zone] = Math.round(zoneTime);
  if (runTime && (!s.runBest || runTime < s.runBest)) s.runBest = Math.round(runTime);
  try { localStorage.setItem('cc_stats', JSON.stringify(s)); } catch (e) {}
}
function showRecords(on) {
  const s = loadStats(), b = loadBest(), row = (a, v) => `<tr><td>${a}</td><td>${v}</td></tr>`;
  $('rectable').innerHTML = row('Highest floor', b.floor || '-') + row('Climbs completed', s.wins) + row('Fastest climb', s.runBest ? clock(s.runBest) : '-')
    + row('Enemies slain', s.kills) + row('Secrets found', s.secrets) + row('Deaths', s.deaths)
    + ZONES.map((z, i) => row(`Best time · ${z.name}`, s.zoneBest[i] ? clock(s.zoneBest[i]) : '-')).join('');
  $('recpanel').classList.toggle('on', on); menuShownAt = performance.now();
}
const clock = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
function showSummary() {
  const z = ZONES[zoneOf(level)];
  bumpStats({ kills: kills - zoneStat.kills0, secrets: zoneStat.secrets }, zoneOf(level), zoneStat.t);
  showMenu(`${z.name.replace(/^THE /, '')} CLEARED`,
    `${z.boss} is dead · time ${clock(zoneStat.t)} · ${kills - zoneStat.kills0} slain · secrets ${zoneStat.secrets} of ${zoneStat.secretsAll} · damage taken ${Math.round(zoneStat.hurt)}`,
    `PRESS START · ${ZONES[zoneOf(level + 1)].name}`);
  $('newclimb').style.display = 'none'; summary = true;
}
// ---- pause: Esc or P in play (or losing the mouse lock, or switching away from the tab) ----
function pauseGame() {
  if (!running) return;
  running = false; paused = true;
  $('title').textContent = 'PAUSED'; $('title').classList.remove('dead'); $('tag').style.display = 'none';
  introEl.textContent = level > 0 ? `Floor ${level} · ${ZONES[zoneOf(level)].name}` : 'The entrance';
  $('go').textContent = 'RESUME'; $('newclimb').style.display = 'none'; $('quit').style.display = '';
  overlay.style.display = 'flex'; menuShownAt = performance.now();
  for (const k in keys) keys[k] = false;
  if (document.pointerLockElement) document.exitPointerLock();
}
function resumeGame() {
  paused = false; running = true; overlay.style.display = 'none'; $('quit').style.display = 'none';
  try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
}
function die() {
  sfx('death'); clearResume(); bumpStats({ deaths: 1 });
  const rec = saveBest(), cp = loadCheckpoint();
  showMenu('GAME OVER', `${rec ? 'NEW RECORD! ' : ''}Fell on floor ${level} · ${kills} slain`,
    cp ? `CONTINUE FROM FLOOR ${cp.floor}? PRESS START` : 'CONTINUE? PRESS START', true);
}
function victory() {
  saveBest(); clearCheckpoint(); bumpStats({ wins: 1, kills: kills - zoneStat.kills0, secrets: zoneStat.secrets + secrets.found }, zoneOf(level), zoneStat.t, runT);
  if (typeof THREE !== 'undefined') { try { startEnding(); return; } catch (e) { endActive = false; } }   // no Three.js / WebGL: straight to the menu
  victoryMenu();
}
function victoryMenu() {
  showMenu('SPIRE CONQUERED', `The Spire Titan is dead · all ${FINAL} floors · ${kills} slain · time ${clock(runT)}`, 'PRESS START TO CLIMB AGAIN');
}
function hurtPlayer(n, fx, fy) {                              // (fx, fy): where the hit came from, for the direction marker
  if (!running) return;
  if (P.ward > 0) return;
  if (fx !== undefined) { P.hitA = Math.atan2(fy - P.y, fx - P.x); P.hitT = 0.7; } else P.hitT = 0;
  zoneStat.hurt += n;
  if (P.armor > 0) { const soak = Math.min(P.armor, Math.ceil(n * ARMOUR_SOAK)); P.armor -= soak; n -= soak; }
  P.hp -= n; P.hurt = 0.3; sfx('hurt');
  if (P.hp <= 0) { P.hp = 0; die(); }
}
// ---- checkpoints: entering a zone saves floor + loadout (localStorage 'cc_save'); CONTINUE restarts there ----
// A second save, 'cc_resume', is written on every floor so closing the game loses nothing; it restores the floor exactly
// (health, armour, timers). Dying deletes it, which is what sends you back to the zone checkpoint.
function saveResume() {
  try { localStorage.setItem('cc_resume', JSON.stringify({ floor: level, kills, owned: P.owned, ammo: P.ammo, weapon: P.weapon, armor: P.armor, hp: P.hp, runT, zoneStat })); } catch (e) {}
}
function loadResume() { try { return JSON.parse(localStorage.getItem('cc_resume')); } catch (e) { return null; } }
function clearResume() { try { localStorage.removeItem('cc_resume'); } catch (e) {} }
function saveCheckpoint() {
  try { localStorage.setItem('cc_save', JSON.stringify({ floor: level, kills, owned: P.owned, ammo: P.ammo, weapon: P.weapon, armor: P.armor })); } catch (e) {}
}
function loadCheckpoint() { try { return JSON.parse(localStorage.getItem('cc_save')); } catch (e) { return null; } }
function clearCheckpoint() { try { localStorage.removeItem('cc_save'); } catch (e) {} clearResume(); }
function nextLevel(afterSummary) {
  zoneStat.secrets += secrets.found; zoneStat.secretsAll += secrets.total; secrets = { total: 0, found: 0 };
  if (level > 0 && level % 10 === 0 && level < FINAL && !afterSummary) { showSummary(); return; }
  if (level % 10 === 0) zoneStat = { t: 0, kills0: kills, hurt: 0, secrets: 0, secretsAll: 0 };
  level++; setMusic(MUSIC_FOR(level));
  sfx(level === 1 ? 'door' : 'stairs');
  P.maxHp = zoneMaxHp(level);
  P.hp = Math.min(P.maxHp, P.hp + Math.round(P.maxHp / 4));        // a breather on every staircase
  generate(level);
  const z = ZONES[zoneOf(level)];
  if (level === zoneStart(level)) {
    P.hp = P.maxHp; saveCheckpoint(); if (level > 1) sfx('power');
    showMsg(level === 1 ? `You step into the Spire · ${z.name}` : `${z.name} · checkpoint · max health ${P.maxHp} · weapons +${zoneOf(level) * 10}%`);
  } else if (level % 10 === 0) {
    saveCheckpoint();                                          // a second checkpoint at the boss's door, so losing to it does not cost the zone
    showMsg(`Floor ${level} · ${z.boss} awaits · checkpoint`);
  } else showMsg(`Floor ${level}`);
  saveResume();
}
function continueGame(cp, exact) {                           // exact: a resume save, restored as it was (no refill)
  kills = cp.kills || 0; zoneStat = { t: 0, kills0: kills, hurt: 0, secrets: 0, secretsAll: 0 };
  P = newPlayer(); Object.assign(P.owned, cp.owned); Object.assign(P.ammo, cp.ammo);
  for (const w in P.owned) if (!WEAPONS[w]) delete P.owned[w];          // a save from before the weapon change
  P.weapon = WEAPONS[cp.weapon] && P.owned[cp.weapon] ? cp.weapon : (WEAPON_ORDER.find(w => P.owned[w]) || 'fist'); P.armor = cp.armor || 0;
  level = cp.floor; P.maxHp = P.hp = zoneMaxHp(level); generate(level); setMusic(MUSIC_FOR(level));
  // a retry never starts empty-handed: every gun unlocked by now is in your hands with at least a cache and a half of ammo,
  // so running dry before a checkpoint cannot turn into dying there over and over
  if (exact) { P.hp = Math.min(P.maxHp, cp.hp || P.maxHp); runT = cp.runT || 0; if (cp.zoneStat) zoneStat = cp.zoneStat; }
  else for (const w in WEAPON_FLOOR) if (level >= WEAPON_FLOOR[w]) { P.owned[w] = true; P.ammo[w] = Math.max(P.ammo[w], Math.round(CRATE_AMMO[w] * floorAmmo * 1.5)); }
  if (P.weapon === 'fist') P.weapon = WEAPON_ORDER.find(w => P.owned[w]) || 'fist';
  running = true; overlay.style.display = 'none';
  try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
  showMsg(`${ZONES[zoneOf(level)].name} · floor ${level}`);
}
function giveWeapon(w) {
  const had = P.owned[w];
  const n = Math.round(CRATE_AMMO[w] * floorAmmo);
  P.owned[w] = true; P.ammo[w] += n;
  if (!had) P.weapon = w;
  showMsg(had ? `${WEAPONS[w].name}: +${n} ${AMMO_NAME[w]}` : `Found the ${WEAPONS[w].name}!`);
}
function pickupItem(kind) {
  sfx(kind === 'crate' ? 'weapon' : kind === 'fury' || kind === 'ward' ? 'power' : 'item');
  if (kind === 'potion') {
    P.hp = Math.min(P.maxHp, P.hp + potionHeal(level));
    showMsg(`Healing draught +${potionHeal(level)} HP`);
  } else if (kind === 'key') {
    P.keys = (P.keys || 0) + 1; showMsg('A key');
  } else if (kind === 'armour') {
    P.armor = Math.min(ARMOUR_MAX, P.armor + ARMOUR_PICKUP); showMsg(`Armour +${ARMOUR_PICKUP}`);
  } else if (kind === 'fury') {
    P.fury = FURY_TIME; showMsg(`Tome of fury · double damage for ${FURY_TIME} seconds`);
  } else if (kind === 'ward') {
    P.ward = WARD_TIME; showMsg(`Ward · nothing can hurt you for ${WARD_TIME} seconds`);
  } else if (kind === 'ammo') {
    for (const w in BOX_AMMO) if (level >= WEAPON_FLOOR[w]) P.ammo[w] += Math.round(BOX_AMMO[w] * floorAmmo);   // only guns unlocked so far
    showMsg('Ammo box');
  } else if (kind === 'drop') {                       // small ammo dropped by an enemy, for a random gun you can use on this floor
    const pool = Object.keys(WEAPON_FLOOR).filter(w => level >= WEAPON_FLOOR[w]);
    const w = pool[(Math.random() * pool.length) | 0];
    const n = Math.max(1, Math.round(BOX_AMMO[w] * floorAmmo / 2));
    P.ammo[w] += n; showMsg(`+${n} ${AMMO_NAME[w]}`);
  } else if (kind === 'crate') {
    // prefer a gun you do not have; otherwise any unlocked one (refill)
    const pool = Object.keys(WEAPON_FLOOR).filter(w => Math.max(1, level) >= WEAPON_FLOOR[w]);
    const missing = pool.filter(w => !P.owned[w]);
    const from = missing.length ? missing : pool;
    giveWeapon(from[(Math.random() * from.length) | 0]);
  }
}
// called after a shot: an empty gun leaves the cycle and you switch to the next one you have (fists at worst)
function dropIfEmpty(w) {
  if (!WEAPONS[w].ammo || P.ammo[w] > 0) return;
  P.owned[w] = false;
  const next = WEAPON_ORDER.find(o => P.owned[o]) || 'fist';
  P.weapon = next; P.owned.fist = true;
  showMsg(`${WEAPONS[w].name} is empty`);
}
function cycleWeapon() {
  sfx('switch', 0.6);
  const owned = WEAPON_ORDER.filter(w => P.owned[w]);
  const i = owned.indexOf(P.weapon);
  P.weapon = owned[(i + 1) % owned.length];
  showMsg(WEAPONS[P.weapon].name);
}

// knock shoves the enemy away from (fx, fy) (default: the player); stun freezes it briefly. Bosses mostly shrug both off.
function hurtMonster(m, dmg, knock = 0, stun = 0, fx = P.x, fy = P.y) {
  m.hp -= Math.round(dmg * wpnMul(level) * (P.fury > 0 ? 2 : 1)); m.hurt = 0.15; m.woke = true;
  if (m.hp > 0 && Math.random() < 0.6) msnd(m, 'pain', 0.8);
  if (knock) {
    const ex = m.x - fx, ey = m.y - fy, d = Math.hypot(ex, ey) || 1, k = knock * (m.boss ? 0.2 : m.heavy ? 0.4 : 1) * 6;
    m.kbx = (m.kbx || 0) + ex / d * k; m.kby = (m.kby || 0) + ey / d * k;
  }
  if (stun) m.stun = Math.max(m.stun || 0, stun * (m.boss ? 0.3 : 1));
  if (m.hp <= 0 && m.prop) {                                 // a pod bursts: hurts everything close, you included
    m.dead = true; m.dieT = 0; m.art = monArtKey(m); sfxAt('bigboom', m.x, m.y);
    pshots.push({ kind: 'boom', x: m.x, y: m.y, vx: 0, vy: 0, life: 0.25, static: true, dead: false, size: 2.2 });
    for (const o of monsters) if (!o.dead && Math.hypot(o.x - m.x, o.y - m.y) < 2.2) hurtMonster(o, 70, 1.2, 0.3, m.x, m.y);
    const pd = Math.hypot(P.x - m.x, P.y - m.y);
    if (pd < 2.2) hurtPlayer(Math.round(30 * dmgMul(level) * (1 - pd / 2.6)), m.x, m.y);
    return;
  }
  if (m.hp <= 0) {
    m.dead = true; m.dieT = 0; m.art = monArtKey(m); kills++; msnd(m, 'die');
    // enemies sometimes drop a little ammo; bosses always leave a weapon crate and an ammo box
    if (m.boss) { items.push({ x: m.x, y: m.y, kind: 'crate', taken: false }, { x: m.x + 0.3, y: m.y, kind: 'ammo', taken: false }, { x: m.x - 0.3, y: m.y, kind: 'armour', taken: false }); }
    else if (Math.random() < 0.3) items.push({ x: m.x, y: m.y, kind: 'drop', taken: false });
    if (m.boss) {
      if (level >= FINAL) pendingWin = 1.5;
      else showMsg(`${m.name} falls! The stairs unseal.`);
    } else showMsg('Slain!');
  }
}
function hitscan(ang, w) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  let best = null, bestAlong = Infinity;
  for (const m of monsters) {
    if (m.dead) continue;
    const ex = m.x - P.x, ey = m.y - P.y;
    const along = ex * dx + ey * dy;
    if (along <= 0.2) continue;
    const perp = Math.abs(ex * dy - ey * dx);
    const reach = (m.boss ? 0.5 : 0.18) + along * 0.08;
    if (perp > reach) continue;
    if (along < bestAlong && los(P.x, P.y, m.x, m.y)) { best = m; bestAlong = along; }
  }
  if (best) {
    // shotgun pellets lose power with distance (full inside w.near, 25% at w.far)
    const fall = w.near ? Math.max(0.25, Math.min(1, 1 - (bestAlong - w.near) / (w.far - w.near) * 0.75)) : 1;
    hurtMonster(best, Math.round(roll(w.dmg) * fall), (w.knock || 0) * fall, w.stun || 0);
  }
}
function fire() {
  if (!running || P.fire > 0) return;
  const w = WEAPONS[P.weapon];
  if (w.ammo && P.ammo[P.weapon] <= 0) { P.fire = 0.3; sfx('empty'); dropIfEmpty(P.weapon); return; }
  const used = P.weapon;
  if (w.ammo) P.ammo[used]--;
  P.fire = w.cool; P.anim = 1; P.animRate = 1 / (w.animDur || 0.4);
  if (w.type !== 'melee') sfx(P.weapon);
  if (w.type === 'hitscan') {
    P.flash = 0.09;
    for (let i = 0; i < w.pellets; i++) hitscan(P.a + (w.spread ? rnd(-w.spread, w.spread) : 0), w);
  } else if (w.type === 'melee') { P.swingT = 0; if (meleeHit(w) > 0) { P.hitFlash = 0.15; sfx('punch'); } else sfx('swing', 0.6); }
  else if (w.type === 'chain') chainLightning(w);
  else if (w.type === 'pierce') pierceBeam(w);
  else if (w.type === 'nova') novaBlast(w);
  else spawnPlayerShot(w);
  dropIfEmpty(used);
}

// Hellstaff: a beam along the aim line that hurts every enemy on it, up to the first wall.
function pierceBeam(w) {
  const dx = Math.cos(P.a), dy = Math.sin(P.a);
  let reach = 0.3; while (reach < w.range && !solid(P.x + dx * reach, P.y + dy * reach)) reach += 0.1;
  for (const m of monsters) {
    if (m.dead) continue;
    const ex = m.x - P.x, ey = m.y - P.y, along = ex * dx + ey * dy;
    if (along > 0.2 && along < reach && Math.abs(ex * dy - ey * dx) < (m.boss ? 0.5 : 0.25)) hurtMonster(m, roll(w.dmg), 0, w.stun);
  }
  bolts.push({ hand: true, ax: 0, ay: 0, bx: P.x + dx * reach, by: P.y + dy * reach, life: 0.09, col: '#ff5a3c' });
}
// The Big One: everything in sight within range takes the blast.
function novaBlast(w) {
  P.nova = 0.35; sfx('nova');
  for (const m of monsters) {
    if (!m.dead && Math.hypot(m.x - P.x, m.y - P.y) < w.range && los(P.x, P.y, m.x, m.y)) hurtMonster(m, roll(w.dmg), w.knock, 0.5);
  }
}
// One enemy projectile from m, `off` radians away from the line to the player (or at absolute angle `abs`).
function spawnShot(m, off = 0, dmgMulBy = 1, abs = null) {
  const a = abs === null ? Math.atan2(P.y - m.y, P.x - m.x) + off : abs;
  const sp = m.boss ? 4.2 : 3.2;
  shots.push({ x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 4, kind: m.shot, t: 0,
    dmg: Math.max(1, Math.round((m.boss ? (6 + 1.4 * zoneOf(level)) * DF().dmg : m.dmg) * dmgMulBy)) });   // bosses: 8 melee / 6 a shot in the crypt, 22 / 19 at the top   // a regular enemy's shot hits as hard as its claws
}
// A volley at the player: `burst` shots fanned out.
function volley(m) {
  m.atk = ATK_T; msnd(m, 'shot') || sfxAt('eshot', m.x, m.y, 0.8);
  const n = m.burst || 1;
  for (let i = 0; i < n; i++) spawnShot(m, (i - (n - 1) / 2) * 0.22, n > 2 ? 0.6 : n > 1 ? 0.55 : 1);   // a fan shares its damage out
}
// Boss extras, run every frame while it can see you (see BOSS_MOVES).
function bossMoves(m, dt, d) {
  const rage = m.hp < m.maxHp / 2 ? 0.7 : 1;                  // below half health everything comes faster
  if (m.ring && (m.ringT -= dt) <= 0) {
    m.ringT = m.ring[1] * rage; m.atk = ATK_T; msnd(m, 'shot') || sfxAt('eshot', m.x, m.y);
    for (let i = 0; i < m.ring[0]; i++) spawnShot(m, 0, 0.5, m.ph + i / m.ring[0] * Math.PI * 2);
    m.ph += 0.3;
  }
  if (m.summon && (m.sumT -= dt) <= 0) {
    m.sumT = m.summon[2] * rage;
    if (monsters.filter(o => o.minion && !o.dead).length < m.summon[1]) {
      for (let tries = 0; tries < 12; tries++) {
        const a = rnd(0, 6.28), x = m.x + Math.cos(a) * 1.4, y = m.y + Math.sin(a) * 1.4;
        if (blocked(x, y)) continue;
        const k = spawnMonster(x, y, m.summon[0], level); k.minion = true; k.woke = true; monsters.push(k);
        msnd(m, 'see', 0.8); break;
      }
    }
  }
  if (m.blink && (m.blinkT -= dt) <= 0 && d > 3) {
    m.blinkT = m.blink[0] * rage;
    for (let tries = 0; tries < 16; tries++) {
      const a = rnd(0, 6.28), x = P.x + Math.cos(a) * 3.2, y = P.y + Math.sin(a) * 3.2;
      if (blocked(x, y) || !los(x, y, P.x, P.y)) continue;
      m.x = x; m.y = y; m.mcool = 1.6; m.rcool = Math.max(m.rcool, 1.2); sfxAt('stairs', x, y); break;   // a beat to react after it appears
    }
  }
  if (m.streamN > 0 && (m.streamT -= dt) <= 0) { m.streamN--; m.streamT = m.stream[1]; m.atk = ATK_T; sfxAt('eshot', m.x, m.y, 0.6); spawnShot(m, rnd(-0.07, 0.07), 0.3); }
}
function updateShots(dt) {
  for (const s of shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; s.t += dt;
    if (solid(s.x, s.y)) { s.life = -1; continue; }
    if (Math.hypot(s.x - P.x, s.y - P.y) < 0.4) { s.life = -1; sfx('eboom', 0.7); hurtPlayer(s.dmg, s.x - s.vx, s.y - s.vy); }
  }
  shots = shots.filter(s => s.life > 0);
}
