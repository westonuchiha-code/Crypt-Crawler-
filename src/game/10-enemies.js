// ---------- enemies: their shots, boss moves, the chase map and the AI ----------
// One enemy projectile from m, `off` radians away from the line to the player (or at absolute angle `abs`).
function spawnShot(m, off = 0, dmgMulBy = 1, abs = null) {
  const T = m.foe || P;                                       // whoever it is fighting: you, or an enemy it has a grudge against
  const a = abs === null ? Math.atan2(T.y - m.y, T.x - m.x) + off : abs;
  const sp = m.boss ? 4.2 : 3.2;
  shots.push({ x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 4, kind: m.shot, t: 0, owner: m,
    dmg: Math.max(1, Math.round((m.boss ? (6 + 1.4 * zoneOf(level)) * bossDmgK() : m.dmg) * dmgMulBy)) });   // bosses: 8 melee / 6 a shot in the crypt, 22 / 19 at the top   // a regular enemy's shot hits as hard as its claws
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
  if (m.phase2 && !m.p2 && m.hp < m.maxHp / 2) {              // second phase: new moves, announced with a blast in every direction
    m.p2 = true; Object.assign(m, m.phase2); m.ringT = m.ring ? m.ring[1] : 9; m.stun = 0;
    for (let i = 0; i < 18; i++) spawnShot(m, 0, 0.5, i / 18 * Math.PI * 2);
    P.nova = 0.22; P.novaCol = '255,220,200'; msnd(m, 'see', 1.2); showMsg(m.phase2Msg || `${m.name} is enraged`);
  }
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
    if (Math.hypot(s.x - P.x, s.y - P.y) < 0.4) { s.life = -1; sfx('eboom', 0.7); hurtPlayer(s.dmg, s.x - s.vx, s.y - s.vy, foeName(s.owner)); continue; }
    if (s.owner) for (const o of monsters) {                  // enemy shots hit other enemies too (never their own kind)
      if (o.dead || o === s.owner || o.kind === s.owner.kind || Math.hypot(o.x - s.x, o.y - s.y) > (o.boss ? 0.5 : 0.3)) continue;
      s.life = -1; monsterHurt(o, s.dmg, s.owner); break;
    }
  }
  shots = shots.filter(s => s.life > 0);
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
    if (m.grudge && (m.grudge.dead || (m.grudgeT -= dt) <= 0 || !los(m.x, m.y, m.grudge.x, m.grudge.y))) m.grudge = null;
    const T = m.grudge || P; m.foe = m.grudge;                 // its target this frame
    const hit = () => { if (T === P) hurtPlayer(m.dmg, m.x, m.y, foeName(m)); else monsterHurt(T, m.dmg, m); };
    const ex = T.x - m.x, ey = T.y - m.y, d = Math.hypot(ex, ey) || 1;
    const spd = (0.85 + 0.04 * zoneOf(level) + 0.01 * ((level - 1) % 10)) * m.speed * dt;
    if (m.lungeT > 0) {                                     // mid-charge: straight on, three times as fast
      m.lungeT -= dt; moveEnt(m, m.lx * spd * 3, m.ly * spd * 3);
      if (d <= (m.boss ? 1.6 : 1.0) && m.mcool <= 0) { m.mcool = 1.0; m.atk = ATK_T; m.lungeT = 0; msnd(m, 'atk'); hit(); }
      continue;
    }
    if (d < 11 && los(m.x, m.y, T.x, T.y)) {
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
      if (d <= (m.boss ? 1.6 : 1.0) && m.mcool <= 0) { m.mcool = 1.0; m.atk = ATK_T; msnd(m, 'atk'); hit(); }
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

