// ---------- player melee & projectiles ----------
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
    sfxAt(s.boom, s.x, s.y);
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
// project a world point to screen-x (returns null if behind the camera)
function projectX(x, y) {
  const dirX = Math.cos(P.a), dirY = Math.sin(P.a);
  const planeX = -dirY * FOV_PLANE, planeY = dirX * FOV_PLANE;
  const inv = 1 / (planeX * dirY - dirX * planeY);
  const sx = x - P.x, sy = y - P.y;
  const tx = inv * (dirY * sx - dirX * sy);
  const ty = inv * (-planeY * sx + planeX * sy);
  return ty > 0.2 ? RW / 2 * (1 + tx / ty) : null;
}
// draw one jagged bolt between two screen points: blue glow, white core, impact flash
function drawJaggedBolt(x1, y1, x2, y2, col) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;                 // perpendicular: jitter across the bolt, not along it
  const amp = Math.min(9, len * 0.1);
  const pts = [[x1, y1]];
  for (let i = 1; i < 10; i++) {
    const t = i / 10, off = rnd(-1, 1) * amp;
    pts.push([x1 + dx * t + nx * off, y1 + dy * t + ny * off]);
  }
  pts.push([x2, y2]);
  const stroke = (col, lw) => {
    bctx.strokeStyle = col; bctx.lineWidth = lw;
    bctx.beginPath(); bctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) bctx.lineTo(pts[i][0], pts[i][1]);
    bctx.stroke();
  };
  stroke(col ? col + '88' : 'rgba(80,160,255,0.45)', 3);
  stroke('#f4fbff', 1);
  bctx.fillStyle = 'rgba(190,225,255,0.7)';
  bctx.beginPath(); bctx.arc(x2, y2, 2.5, 0, Math.PI * 2); bctx.fill();
}
function drawBolts() {
  for (const b of bolts) {
    const y2 = RH / 2;
    const x2 = projectX(b.bx, b.by);
    if (x2 === null) continue;
    let x1, y1;
    if (b.hand) { [x1, y1] = palmPoint(); }   // from the casting hand's fingertips
    else {
      x1 = projectX(b.ax, b.ay);
      if (x1 === null) continue;
      y1 = y2;
    }
    drawJaggedBolt(x1, y1, x2, y2, b.col);
  }
  bctx.lineWidth = 1;
}

// Chase map: steps from every open cell to the player's cell, redone a few times a second. Enemies that have noticed
// you follow it downhill when they lose sight of you, so they come round corners instead of forgetting you.
let flow = null, flowT = 0;
function updateFlow() {
  if (!flow || flow.length !== W * H) flow = new Int16Array(W * H);
  flow.fill(-1);
  const start = Math.floor(P.y) * W + Math.floor(P.x), q = [start]; flow[start] = 0;
  const propCells = new Set(props.filter(p => p.solid).map(p => Math.floor(p.y) * W + Math.floor(p.x)));
  for (let i = 0; i < q.length; i++) {
    const c = q[i], d = flow[c] + 1; if (d > 40) break;
    for (const n of [c + 1, c - 1, c + W, c - W]) {
      if (n < 0 || n >= flow.length || flow[n] >= 0) continue;
      const t = map[n]; if ((t !== 0 && t !== STAIRS) || propCells.has(n)) continue;
      flow[n] = d; q.push(n);
    }
  }
}
function updateMonsters(dt) {
  if ((flowT -= dt) <= 0) { flowT = 0.25; updateFlow(); }
  for (const m of monsters) {
    if (m.dead) { m.dieT += dt; continue; }               // corpses only play out their death frames
    m.hurt -= dt; m.mcool -= dt; m.rcool -= dt; m.atk = (m.atk || 0) - dt; m.animT = (m.animT || 0) + dt;
    if (m.prop) continue;                                   // pods just sit there
    if (m.kbx || m.kby) {                                   // knockback slides out over ~0.2 s
      moveEnt(m, m.kbx * dt, m.kby * dt);
      const decay = Math.max(0, 1 - 9 * dt); m.kbx *= decay; m.kby *= decay;
      if (Math.abs(m.kbx) + Math.abs(m.kby) < 0.05) m.kbx = m.kby = 0;
    }
    if (m.stun > 0) { m.stun -= dt; continue; }             // stunned: no moving or attacking
    const ex = P.x - m.x, ey = P.y - m.y, d = Math.hypot(ex, ey) || 1;
    const spd = (0.85 + 0.04 * zoneOf(level) + 0.01 * ((level - 1) % 10)) * m.speed * dt;
    if (m.lungeT > 0) {                                     // mid-charge: straight on, three times as fast
      m.lungeT -= dt; moveEnt(m, m.lx * spd * 3, m.ly * spd * 3);
      if (d <= (m.boss ? 1.6 : 1.0) && m.mcool <= 0) { m.mcool = 1.0; m.atk = ATK_T; m.lungeT = 0; msnd(m, 'atk'); hurtPlayer(m.dmg, m.x, m.y); }
      continue;
    }
    if (d < 11 && los(m.x, m.y, P.x, P.y)) {
      if (!m.woke) { m.woke = true; msnd(m, 'see'); }       // first sight of you: its alert cry
      if (m.boss) bossMoves(m, dt, d);
      if (m.ranged && m.rcool <= 0 && d > 2.2) {
        m.rcool = m.boss ? 2.1 - 0.07 * zoneOf(level) : 2.6;        // early bosses shoot less often: every 2.1 s in the crypt, 1.5 s at the top
        if (m.stream) { m.streamN = m.stream[0]; m.streamT = 0; m.rcool = 1.6 + m.stream[0] * m.stream[1]; }
        else volley(m);
      }
      if (m.lunge && (m.lungeCd -= dt) <= 0 && d > 2.2 && d < 7) {
        m.lungeCd = m.boss ? rnd(4.5, 6.5) : rnd(2.5, 4.5); m.lungeT = 0.45; m.lx = ex / d; m.ly = ey / d; msnd(m, 'atk', 0.8);
      }
      const reach = m.boss ? 1.3 : 0.9;
      const dir = d > Math.max(reach, m.keep) ? 1 : (m.keep && d < m.keep - 1.2 ? -0.6 : 0);   // close in, hold, or back off
      const wv = m.weave ? Math.sin(m.animT * 2.2 + m.ph) * m.weave : 0;                       // sideways drift
      if (dir || wv) moveEnt(m, (ex / d * dir - ey / d * wv) * spd, (ey / d * dir + ex / d * wv) * spd);
      if (d <= (m.boss ? 1.6 : 1.0) && m.mcool <= 0) { m.mcool = 1.0; m.atk = ATK_T; msnd(m, 'atk'); hurtPlayer(m.dmg, m.x, m.y); }
    } else if (m.woke && flow[Math.floor(m.y) * W + Math.floor(m.x)] > 0) {   // lost sight of you: follow the chase map
      const c = Math.floor(m.y) * W + Math.floor(m.x); let best = c;
      for (const n of [c + 1, c - 1, c + W, c - W]) if (flow[n] >= 0 && flow[n] < flow[best]) best = n;
      const tx = (best % W) + 0.5 - m.x, ty = ((best / W) | 0) + 0.5 - m.y, tl = Math.hypot(tx, ty) || 1;
      moveEnt(m, tx / tl * spd, ty / tl * spd);
    } else {
      m.wander -= dt;
      if (m.wander <= 0) { m.wander = rnd(1, 3); m.wa = rnd(0, Math.PI * 2); }
      moveEnt(m, Math.cos(m.wa) * spd * 0.4, Math.sin(m.wa) * spd * 0.4);
    }
  }
}

// ---- movement feel ----
// Sticks are analog with a dead zone and a response curve; speed and turning ease in and out instead of snapping.
const MOVE_SPEED = 3.0, MOVE_ACCEL = 14, MOVE_DECEL = 18;   // cells/s, and how fast velocity catches up
const TURN_SPEED = 3.0, TURN_ACCEL = 16;                    // rad/s at full tilt
const DEAD = 0.12;
const stickCurve = v => { const a = Math.abs(v); if (a < DEAD) return 0; const t = (a - DEAD) / (1 - DEAD); return Math.sign(v) * t * t * 0.4 + Math.sign(v) * t * 0.6; };
function update(dt) {
  // turning: keys or right stick, curved so small tilts aim finely, smoothed so it ramps rather than jerks
  const look = RQPad.state.look.x || 0;
  const turnIn = Math.abs(look) > DEAD ? stickCurve(look) : (keys[K.tr] ? 1 : 0) - (keys[K.tl] ? 1 : 0);
  P.turnV = (P.turnV || 0) + (turnIn * TURN_SPEED - (P.turnV || 0)) * Math.min(1, TURN_ACCEL * dt);
  P.a += P.turnV * dt;
  const dx = Math.cos(P.a), dy = Math.sin(P.a);
  const rx = -dy, ry = dx;

  // moving: when the left stick is held, use it alone (the pad also presses WASD past ~35% tilt; mixing them
  // made it snap to full speed). Keyboard keeps full-speed digital input.
  let f, s;
  const jx = touchState.joyX, jy = touchState.joyY, jm = Math.hypot(jx, jy);
  if (jm > DEAD) {
    const k = stickCurve(Math.min(1, jm)) / jm;          // analog: tilt sets speed, direction stays exact
    f = -jy * k; s = jx * k;
  } else {
    f = (keys[K.fwd] || keys.ArrowUp ? 1 : 0) - (keys[K.back] || keys.ArrowDown ? 1 : 0);
    s = (keys[K.right] ? 1 : 0) - (keys[K.left] ? 1 : 0);
    const l = Math.hypot(f, s); if (l > 1) { f /= l; s /= l; }
  }
  const tvx = (dx * f + rx * s) * MOVE_SPEED, tvy = (dy * f + ry * s) * MOVE_SPEED;
  const rate = (f || s ? MOVE_ACCEL : MOVE_DECEL) * dt;
  P.vx = (P.vx || 0) + (tvx - (P.vx || 0)) * Math.min(1, rate);
  P.vy = (P.vy || 0) + (tvy - (P.vy || 0)) * Math.min(1, rate);
  if (Math.abs(P.vx) + Math.abs(P.vy) > 0.001) {
    const ox = P.x, oy = P.y;
    moveEnt(P, P.vx * dt, P.vy * dt);
    if (P.x === ox) P.vx *= 0.5;     // bumping a wall bleeds that axis instead of storing speed against it
    if (P.y === oy) P.vy *= 0.5;
  }

  P.fire -= dt; P.flash -= dt; P.hurt -= dt; msgT -= dt; sealMsgT -= dt; P.fury -= dt; P.ward -= dt; P.nova -= dt; P.hitT = (P.hitT || 0) - dt;
  P.anim = Math.max(0, P.anim - dt * (P.animRate || 2.5));
  P.swingT += dt;
  P.hitFlash = Math.max(0, P.hitFlash - dt);
  for (const b of bolts) b.life -= dt;
  bolts = bolts.filter(b => b.life > 0);
  if (msgT <= 0) msgEl.style.opacity = 0;
  if (keys[K.fire] || padFire) fire();

  updateMonsters(dt);
  actT -= dt;                                                 // now and then something nearby growls
  if (actT <= 0) {
    actT = rnd(2.5, 6);
    const near = monsters.filter(m => !m.dead && !m.prop && Math.hypot(m.x - P.x, m.y - P.y) < 10);
    if (near.length) msnd(near[(Math.random() * near.length) | 0], 'act', 0.7);
  }
  updateShots(dt);
  updatePlayerShots(dt);
  if (pendingWin > 0) { pendingWin -= dt; if (pendingWin <= 0) { victory(); return; } }
  if (!running) return;

  for (const it of items) {
    if (!it.taken && Math.hypot(it.x - P.x, it.y - P.y) < 0.55) { it.taken = true; pickupItem(it.kind); }
  }
  items = items.filter(i => !i.taken);

  lockMsgT -= dt; trapHurtT -= dt; zoneStat.t += dt; runT += dt;
  for (const d of darts) {                                   // dart walls: a dart every 2.4 s while you are near
    if ((d.t -= dt) > 0) continue;
    d.t = 2.4;
    const ox = d.x + 0.5 + d.dx * 0.7, oy = d.y + 0.5 + d.dy * 0.7;
    if (Math.hypot(ox - P.x, oy - P.y) > 10) continue;
    sfxAt('swing', ox, oy, 0.8);
    shots.push({ x: ox, y: oy, vx: d.dx * 6, vy: d.dy * 6, life: 3, kind: 'spit', t: 0, dmg: Math.round(6 * dmgMul(level)) });
  }
  for (const tr of traps) {                                  // spikes: a scrape of metal as they come out, and they bite
    const up = trapUp(tr);
    if (up && !tr.was) sfxAt('swing', tr.x + 0.5, tr.y + 0.5, 0.7);
    tr.was = up;
    if (up && trapHurtT <= 0 && Math.floor(P.x) === tr.x && Math.floor(P.y) === tr.y) { trapHurtT = 0.6; hurtPlayer(Math.round(TRAP_DMG * dmgMul(level))); showMsg('Spikes!'); }
  }
  if (level > 0) {                                           // walk into a locked door or a secret wall while facing it
    const ax = Math.floor(P.x + Math.cos(P.a) * 0.62), ay = Math.floor(P.y + Math.sin(P.a) * 0.62), at = ay * W + ax, t = map[at];
    if (t === LOCKED) {
      if (P.keys > 0) { P.keys--; map[at] = 0; sfx('door'); showMsg('The door opens'); }
      else if (lockMsgT <= 0) { lockMsgT = 2.5; sfx('noway'); showMsg('Locked. The key is somewhere on this floor'); }
    } else if (t === SECRET) {
      map[at] = 0; secrets.found++; sfx('power'); showMsg(`A secret room! (${secrets.found} of ${secrets.total})`);
    }
  }
  if (level === 0) {
    if (Math.hypot(P.x - 3.5, P.y - 1.5) < 1.1) { nextLevel(); return; }
  } else if (map[Math.floor(P.y) * W + Math.floor(P.x)] === STAIRS && level < FINAL) {
    if (!bossAlive()) { nextLevel(); return; }
    if (sealMsgT <= 0) { showMsg('Sealed until the guardian falls'); sealMsgT = 3; sfx('noway'); }
  }

  if (level > 0) {
    const cx = Math.floor(P.x), cy = Math.floor(P.y);
    for (let yy = cy - 4; yy <= cy + 4; yy++) for (let xx = cx - 4; xx <= cx + 4; xx++) {
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && Math.hypot(xx - P.x, yy - P.y) <= 4.2)
        explored[yy * W + xx] = 1;
    }
  }

  hpfill.style.width = (P.hp / P.maxHp * 100) + '%';
  const wdef = WEAPONS[P.weapon];
  const ammoTxt = wdef.ammo ? P.ammo[P.weapon] : '∞';
  const b = monsters.find(m => m.boss && !m.dead);
  const floorTxt = level === 0 ? 'ENTRANCE' : `FLOOR ${level} · ${ZONES[zoneOf(level)].name.replace('THE ', '')}`;
  const extra = (P.keys > 0 ? ' · KEY' : '') + (P.armor > 0 ? ` · ARMOUR ${P.armor}` : '') + (P.fury > 0 ? ` · FURY ${Math.ceil(P.fury)}s` : '') + (P.ward > 0 ? ` · WARD ${Math.ceil(P.ward)}s` : '');
  stats.textContent = `HP ${Math.ceil(P.hp)}/${P.maxHp}${extra} · ${floorTxt} · ${wdef.name} ${ammoTxt} · SLAIN ${kills}${b ? ` · ${b.name} ${b.hp}/${b.maxHp}` : ''}`;
}

