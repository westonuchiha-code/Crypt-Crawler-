// ---------- the player: taking damage, pickups, weapons and every kind of attack ----------
function hurtPlayer(n, fx, fy) {                              // (fx, fy): where the hit came from, for the direction marker
  if (!running) return;
  if (P.ward > 0) return;
  if (fx !== undefined) { P.hitA = Math.atan2(fy - P.y, fx - P.x); P.hitT = 0.7; } else P.hitT = 0;
  zoneStat.hurt += n;
  if (P.armor > 0) { const soak = Math.min(P.armor, Math.ceil(n * ARMOUR_SOAK)); P.armor -= soak; n -= soak; }
  P.hp -= n; P.hurt = 0.3; sfx('hurt');
  if (P.hp <= 0) { P.hp = 0; die(); }
}
function giveWeapon(w) {
  const had = P.owned[w];
  const n = Math.round(CRATE_AMMO[w] * floorAmmo);
  P.owned[w] = true; P.ammo[w] += n;
  if (!had) P.weapon = w;
  if (Object.keys(WEAPON_FLOOR).every(g => P.owned[g])) unlock('armed');
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
function cycleWeapon(dir = 1) {
  sfx('switch', 0.6);
  const owned = WEAPON_ORDER.filter(w => P.owned[w]);
  const i = owned.indexOf(P.weapon);
  P.weapon = owned[(i + dir + owned.length) % owned.length];
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
    const k0 = kills;
    for (const o of monsters) if (!o.dead && Math.hypot(o.x - m.x, o.y - m.y) < 2.2) hurtMonster(o, 70, 1.2, 0.3, m.x, m.y);
    if (kills - k0 >= 3) unlock('pod');
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
      if (level === 10) unlock('boss1'); if (level === 50) unlock('boss5'); if (P.weapon === 'fist') unlock('fists');
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
function inCone(m, range, arc) {
  const ex = m.x - P.x, ey = m.y - P.y;
  if (Math.hypot(ex, ey) > range) return false;
  let diff = Math.atan2(ey, ex) - P.a;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  return Math.abs(diff) <= arc && los(P.x, P.y, m.x, m.y);
}
function meleeHit(w) {
  let n = 0;
  for (const m of monsters) {
    if (!m.dead && inCone(m, w.range, w.arc)) { hurtMonster(m, roll(w.dmg), w.knock, w.stun); n++; }
  }
  return n;
}
function spawnPlayerShot(w) {
  // shots leave from the weapon (a little right of the eye) and converge on the crosshair 5 cells ahead
  const dx = Math.cos(P.a), dy = Math.sin(P.a);
  const sx = P.x + dx * 0.4, sy = P.y + dy * 0.4;
  const aimX = P.x + dx * 5 - sx, aimY = P.y + dy * 5 - sy, al = Math.hypot(aimX, aimY);
  const a = Math.atan2(aimY, aimX) + (w.spread ? rnd(-w.spread, w.spread) : 0);
  pshots.push({ kind: 'magic', spr: w.spr, x: sx, y: sy, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, life: w.life || 1.6, t: 0,
    dmg: w.dmg, blast: w.blast || 0, blastDmg: w.blastDmg || 0, knock: w.knock || 0, bounce: w.bounce || 0, boom: w.boom || 'boom', dead: false });
}
function explode(s) {
  s.dead = true;
  if (s.blast > 0) {
    sfxAt(s.boom, s.x, s.y, s.blast < 1.2 ? 0.5 : 1);
    pshots.push({ kind: 'boom', x: s.x, y: s.y, vx: 0, vy: 0, life: 0.25, static: true, dead: false, size: s.blast });
    for (const m of monsters) {
      if (!m.dead && Math.hypot(m.x - s.x, m.y - s.y) < s.blast) hurtMonster(m, roll(s.blastDmg), s.knock, 0.2, s.x, s.y);
    }
  }
}
function updatePlayerShots(dt) {
  for (const s of pshots) {
    if (s.dead) continue;
    if (s.static) { s.life -= dt; if (s.life <= 0) s.dead = true; continue; }
    s.life -= dt; s.t += dt;
    const steps = 4;
    for (let k = 0; k < steps && !s.dead; k++) {
      const px = s.x, py = s.y;
      s.x += s.vx * dt / steps; s.y += s.vy * dt / steps;
      if (solid(s.x, s.y)) {
        if (s.bounce > 0) {                                  // firemace spheres skip off walls
          s.bounce--;
          if (!solid(px, s.y)) { s.vx = -s.vx; s.x = px; } else if (!solid(s.x, py)) { s.vy = -s.vy; s.y = py; } else { s.vx = -s.vx; s.vy = -s.vy; s.x = px; s.y = py; }
          continue;
        }
        explode(s); break;
      }
      for (const m of monsters) {
        if (!m.dead && Math.hypot(m.x - s.x, m.y - s.y) < 0.35) {
          hurtMonster(m, roll(s.dmg));
          explode(s);
          break;
        }
      }
    }
    if (!s.dead && s.life <= 0) s.dead = true;
  }
  pshots = pshots.filter(s => !s.dead);
}

// lightning: the first bolt hits the nearest enemy in front, then arcs to nearby enemies
function chainLightning(w) {
  let first = null, bd = Infinity;
  for (const m of monsters) {
    if (m.dead || !inCone(m, w.range, w.arc)) continue;
    const d = Math.hypot(m.x - P.x, m.y - P.y);
    if (d < bd) { bd = d; first = m; }
  }
  if (!first) {
    // no target: a short spark out in front
    bolts.push({ hand: true, ax: 0, ay: 0, bx: P.x + Math.cos(P.a) * 3, by: P.y + Math.sin(P.a) * 3, life: 0.12 });
    return;
  }
  const hit = new Set();
  let cur = first, from = { x: P.x + Math.cos(P.a) * 0.5, y: P.y + Math.sin(P.a) * 0.5 };
  for (let j = 0; j < w.jumps && cur; j++) {
    hit.add(cur);
    bolts.push({ hand: j === 0, ax: from.x, ay: from.y, bx: cur.x, by: cur.y, life: 0.2 });
    hurtMonster(cur, Math.round(roll(w.dmg) * Math.pow(w.falloff, j)), 0, w.stun);
    from = { x: cur.x, y: cur.y };
    let next = null, nd = Infinity;
    for (const m of monsters) {
      if (m.dead || hit.has(m)) continue;
      const d = Math.hypot(m.x - cur.x, m.y - cur.y);
      if (d < w.chain && d < nd && los(cur.x, cur.y, m.x, m.y)) { nd = d; next = m; }
    }
    cur = next;
  }
}

