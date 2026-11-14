// ---------- the per-frame update: input, movement, traps, doors, pickups, stairs ----------
// ---- movement feel ----
// Sticks are analog with a dead zone and a response curve; speed and turning ease in and out instead of snapping.
const MOVE_SPEED = 3.0, MOVE_ACCEL = 14, MOVE_DECEL = 18;   // cells/s, and how fast velocity catches up
const TURN_SPEED = 3.0, TURN_ACCEL = 16;                    // rad/s at full tilt
const DEAD = 0.12;
const stickCurve = v => { const a = Math.abs(v); if (a < DEAD) return 0; const t = (a - DEAD) / (1 - DEAD); return Math.sign(v) * t * t * 0.4 + Math.sign(v) * t * 0.6; };
function update(dt) {
  // turning: keys or right stick, curved so small tilts aim finely, smoothed so it ramps rather than jerks
  const look = (window.RQPad && RQPad.state.look.x) || 0;      // the test pad's right stick, when the pad is there
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
      if (secrets.total >= 2 && secrets.found === secrets.total) unlock('secrets');
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

