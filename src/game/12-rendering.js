// ---------- rendering ----------
const FLOOR_A = [84, 74, 64], FLOOR_B = [66, 58, 50], CEIL_A = [40, 36, 52], CEIL_B = [30, 27, 40], STAIR_C = [70, 140, 255];
function rgbf(c, f) { return (255 << 24) | ((c[2] * f) << 16) | ((c[1] * f) << 8) | (c[0] * f); }
function sh(c, f) {
  const r = Math.min(255, (c & 255) * f);
  const g = Math.min(255, ((c >>> 8) & 255) * f);
  const b = Math.min(255, ((c >>> 16) & 255) * f);
  return (255 << 24) | (b << 16) | (g << 8) | r;
}

const skyCol = new Int32Array(480);            // one entry per buffer column, sized for the widest view (setView caps RW at 480)
function renderFloorCeil(dirX, dirY, planeX, planeY) {
  const rdx0 = dirX - planeX, rdy0 = dirY - planeY, rdx1 = dirX + planeX, rdy1 = dirY + planeY;
  const pulse = 0.8 + 0.2 * Math.sin(performance.now() / 300);
  if (SKY_PX) for (let x = 0; x < RW; x++) {
    const ang = P.a + Math.atan((2 * x / RW - 1) * fovPlane());
    skyCol[x] = ((((ang / (Math.PI * 2)) * SKY_W) % SKY_W + SKY_W) % SKY_W) | 0;
  }
  for (let y = 0; y < RH; y++) {
    const p = y - RH / 2;
    const isFloor = p > 0;
    const rowDist = (RH / 2) / Math.max(Math.abs(p), 0.5);
    const stepX = rowDist * (rdx1 - rdx0) / RW, stepY = rowDist * (rdy1 - rdy0) / RW;
    let wx = P.x + rowDist * rdx0, wy = P.y + rowDist * rdy0;
    const fog = Math.max(0, 1 - rowDist / 10);
    const row = y * RW;
    for (let x = 0; x < RW; x++) {
      const cx = Math.floor(wx), cy = Math.floor(wy);
      const inside = cx >= 0 && cy >= 0 && cx < W && cy < H;
      const t = inside ? map[cy * W + cx] : 1;
      const chk = (cx + cy) & 1;
      let c, k = fog;
      if (isFloor) {
        const trp = inside && trapAt && trapAt[cy * W + cx];
        if (trp) { pix[row + x] = sh(TRAP_TEX[trapUp(traps[trp - 1]) ? 1 : 0][(((wy - cy) * 64) & 63) * 64 + (((wx - cx) * 64) & 63)], k); wx += stepX; wy += stepY; continue; }
        if (t === STAIRS) {
          // stair treads running across the cell, with dark nosing lines
          c = chk ? [96, 90, 80] : [84, 78, 70];   // plain stone; the flight itself is the sprite
        }
        else if (FLOOR_TEX) { pix[row + x] = sh(FLOOR_TEX[(((wy - cy) * 64) & 63) * 64 + (((wx - cx) * 64) & 63)], k); wx += stepX; wy += stepY; continue; }
        else c = chk ? FLOOR_A : FLOOR_B;
      } else if (SKY_PX) {   // open sky: sample the panorama by ray angle (skyCol) and screen row, no fog
        pix[row + x] = SKY_PX[Math.min(SKY_H - 1, (y * SKY_H / (RH / 2)) | 0) * SKY_W + skyCol[x]]; wx += stepX; wy += stepY; continue;
      } else if (CEIL_TEX) { pix[row + x] = sh(CEIL_TEX[(((wy - cy) * 64) & 63) * 64 + (((wx - cx) * 64) & 63)], k * 0.75); wx += stepX; wy += stepY; continue; }
      else {
        c = chk ? CEIL_A : CEIL_B;
      }
      pix[row + x] = rgbf(c, Math.min(1, k));
      wx += stepX; wy += stepY;
    }
  }
}

function renderWalls(dirX, dirY, planeX, planeY) {
  for (let x = 0; x < RW; x++) {
    const camX = 2 * x / RW - 1;
    const rdx = dirX + planeX * camX, rdy = dirY + planeY * camX;
    let mx = Math.floor(P.x), my = Math.floor(P.y);
    const ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx);
    const ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
    let sx, sy, sdx, sdy;
    if (rdx < 0) { sx = -1; sdx = (P.x - mx) * ddx; } else { sx = 1; sdx = (mx + 1 - P.x) * ddx; }
    if (rdy < 0) { sy = -1; sdy = (P.y - my) * ddy; } else { sy = 1; sdy = (my + 1 - P.y) * ddy; }

    let side = 0, tile = 0;
    for (;;) {
      if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; }
      else { sdy += ddy; my += sy; side = 1; }
      tile = (mx >= 0 && my >= 0 && mx < W && my < H) ? map[my * W + mx] : 1;
      if (tile > 0 && tile !== STAIRS) break;
    }

    const perp = side === 0 ? (mx - P.x + (1 - sx) / 2) / rdx : (my - P.y + (1 - sy) / 2) / rdy;
    zBuf[x] = perp;

    const lineH = RH / perp;
    const rawStart = RH / 2 - lineH / 2;
    const y0 = Math.max(0, Math.floor(rawStart));
    const y1 = Math.min(RH - 1, Math.floor(RH / 2 + lineH / 2));

    let wallX = side === 0 ? P.y + perp * rdy : P.x + perp * rdx;
    wallX -= Math.floor(wallX);
    let texX = Math.floor(wallX * 64);
    if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) texX = 63 - texX;

    const tex = WALLS[tile];
    const step = 64 / lineH;
    let texPos = (y0 - rawStart) * step;
    const f = Math.max(0.04, 1 - perp / 12) * (side ? 0.66 : 1);
    for (let y = y0; y <= y1; y++) {
      const ty = Math.floor(texPos) & 63;
      texPos += step;
      pix[y * RW + x] = sh(tex[ty * 64 + texX], f);
    }
  }
}

const monArtKey = m => m.boss ? 'boss' + (zoneOf(level) + 1) : m.kind;   // boss1 ... boss10, one per zone
function renderSprites(dirX, dirY, planeX, planeY) {
  const list = [];
  for (const m of monsters) {
    const art = MON_PX[m.art || monArtKey(m)];
    if (art) {   // animated sprite: death frames (the last one stays as a corpse), else attack, pain flinch or walk cycle
      let f;
      if (m.dead) f = art.die[Math.min(art.die.length - 1, Math.floor((m.dieT || 0) * DIE_FPS))];
      else if (m.atk > 0) f = art.atk[Math.min(art.atk.length - 1, Math.floor((1 - m.atk / ATK_T) * art.atk.length))];
      else if (m.hurt > 0) f = art.pain;
      else f = art.walk[Math.floor((m.animT || 0) * WALK_FPS * Math.min(1.6, Math.max(0.7, m.speed))) % art.walk.length];
      list.push({ x: m.x, y: m.y, tex: art.frames[f], hurt: !m.dead && m.hurt > 0, mon: true, k: art.k,
        lift: m.fly && !m.dead ? 0.03 * Math.sin((m.animT || 0) * 3 + m.ph) : 0 });
    } else if (!m.dead) list.push({ x: m.x, y: m.y, tex: m.tex, hurt: m.hurt > 0, v: m.boss ? 0.05 : 0.12, scale: m.scale });
  }
  for (const it of items) if (!it.taken) {
    const art = ITEM_PX[it.kind];
    if (art) list.push({ x: it.x, y: it.y, tex: art.frames[Math.floor(performance.now() / 180) % art.frames.length], hurt: false, mon: true, k: art.k,
      lift: it.kind === 'fury' || it.kind === 'ward' || it.kind === 'key' ? 0.12 + 0.03 * Math.sin(performance.now() / 300) : 0 });      // power-ups hover
    else list.push({ x: it.x, y: it.y, tex: SPR[SPR[it.kind] ? it.kind : it.kind === 'drop' ? 'ammo' : it.kind === 'key' ? 'crate' : 'potion'], hurt: false, v: it.kind === 'drop' ? 0.38 : 0.3, scale: it.kind === 'drop' ? 0.5 : 0.8 });
  }
  for (const pr of props) {
    const art = PROP_PX[pr.kind];
    if (art) list.push({ x: pr.x, y: pr.y, tex: art.frames[Math.floor(performance.now() / 140) % art.frames.length], hurt: false, mon: true, k: art.k, lift: 0 });
  }
  for (const s of shots) {
    const art = SHOT_PX[s.kind];
    if (art) list.push({ x: s.x, y: s.y, tex: art.frames[Math.floor(s.t * 10) % art.frames.length], hurt: false, mon: true, k: art.k, lift: 0 });
    else list.push({ x: s.x, y: s.y, tex: SPR.fire, hurt: false, v: 0, scale: 0.5 });
  }
  for (const s of pshots) {
    if (s.kind === 'boom' && SHOT_PX.boom) {                 // explosion: three frames over its life, sized to the blast
      const ex = SHOT_PX.boom, f = Math.min(2, Math.floor((1 - s.life / 0.33) * 3)), fr = ex.frames[f < 0 ? 0 : f];
      list.push({ x: s.x, y: s.y, tex: fr, hurt: false, mon: true, k: ex.k * (s.size || 1.6) * 0.42, lift: 0.5 * (1 - (s.size || 1.6) * 0.42) });   // lift keeps it centred at eye height at any size
      continue;
    }
    const art = s.kind !== 'boom' && SHOT_PX[s.spr];
    if (art) { if ((s.x - P.x) ** 2 + (s.y - P.y) ** 2 > 0.6) list.push({ x: s.x, y: s.y, tex: art.frames[Math.floor(s.t * 12) % art.frames.length], hurt: false, mon: true, k: art.k, lift: 0 }); continue; }
    const tex = s.kind === 'boom' ? SPR.fire : SPR.magic;
    list.push({ x: s.x, y: s.y, tex, hurt: false, v: 0, scale: s.kind === 'boom' ? (s.size || 1.6) : 0.7, minD: s.kind === 'magic' ? 0.9 : 0.2 });
  }
  if (stairsPos && level > 0) list.push({ x: stairsPos.x, y: stairsPos.y, tex: SPR.stairs, hurt: false, v: 0.15, scale: 1 });
  for (const s of list) s.d = (s.x - P.x) ** 2 + (s.y - P.y) ** 2;
  list.sort((a, b) => b.d - a.d);

  const inv = 1 / (planeX * dirY - dirX * planeY);
  for (const s of list) {
    const sx = s.x - P.x, sy = s.y - P.y;
    const tx = inv * (dirY * sx - dirX * sy);
    const ty = inv * (-planeY * sx + planeX * sy);
    if (ty <= (s.minD || 0.2)) continue;
    if (s.mon) { drawMonsterSprite(s, tx, ty); continue; }
    const size = Math.floor(RH / ty * s.scale);
    if (size <= 0) continue;
    const scrX = Math.floor((RW / 2) * (1 + tx / ty));
    const top = Math.floor(RH / 2 - size / 2 + size * s.v);
    const x0 = Math.floor(scrX - size / 2), x1 = x0 + size;
    const y0 = Math.max(0, top), y1 = Math.min(RH - 1, top + size - 1);
    const fog = Math.max(0.12, 1 - ty / 12) * (s.hurt ? 1.7 : 1);
    for (let x = Math.max(0, x0); x < Math.min(RW, x1); x++) {
      if (ty >= zBuf[x]) continue;
      const tX = Math.floor((x - x0) * 32 / size);
      for (let y = y0; y <= y1; y++) {
        const tY = Math.floor((y - top) * 32 / size);
        const c = s.tex[tY * 32 + tX];
        if ((c >>> 24) < 128) continue;
        pix[y * RW + x] = sh(c, fog);
      }
    }
  }
}

// Tall monster sprite standing on the floor (floor line for distance ty is RH/2 + RH/(2*ty)).
// A struck enemy flashes: its own colours pushed towards white, never recoloured.
function hitTint(c, fog) {
  const r = Math.min(255, (c & 255) + 90), g = Math.min(255, (c >> 8 & 255) + 70), b = Math.min(255, (c >> 16 & 255) + 70);
  return sh((0xff000000 | r | g << 8 | b << 16) >>> 0, Math.min(1, fog * 1.25));
}
function drawMonsterSprite(s, tx, ty) {
  const t = s.tex, u = RH / ty * s.k, hpx = t.h * u, wpx = t.w * u;      // u: screen pixels per sprite pixel
  if (hpx < 1) return;
  const scrX = (RW / 2) * (1 + tx / ty);
  const top = RH / 2 + RH / (2 * ty) - t.oy * u - (s.lift || 0) * RH / ty, bottom = top + hpx, x0 = scrX - t.ox * u;
  const fog = Math.max(0.12, 1 - ty / 12);
  const ys = Math.max(0, Math.floor(top)), ye = Math.min(RH - 1, Math.floor(bottom));
  for (let x = Math.max(0, Math.floor(x0)); x < Math.min(RW, Math.ceil(x0 + wpx)); x++) {
    if (ty >= zBuf[x]) continue;
    let tX = Math.floor((x - x0) * t.w / wpx); if (tX < 0 || tX >= t.w) continue;
    for (let y = ys; y <= ye; y++) {
      const tY = Math.floor((y - top) * t.h / hpx); if (tY < 0 || tY >= t.h) continue;
      const c = t[tY * t.w + tX];
      if ((c >>> 24) < 128) continue;
      pix[y * RW + x] = s.hurt ? hitTint(c, fog) : sh(c, fog);
    }
  }
}

function drawHitFlash() {
  if (P.hitFlash <= 0) return;
  const k = P.hitFlash / 0.15, cx = RW / 2, cy = RH * 0.45;
  bctx.strokeStyle = `rgba(255,240,180,${k})`; bctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3 + 0.3;
    bctx.beginPath();
    bctx.moveTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4);
    bctx.lineTo(cx + Math.cos(a) * (4 + 7 * k), cy + Math.sin(a) * (4 + 7 * k));
    bctx.stroke();
  }
  bctx.lineWidth = 1;
}

// ---- lightning bolts and beams (drawn over the 3D view) ----
// project a world point to screen-x (returns null if behind the camera)
function projectX(x, y) {
  const dirX = Math.cos(P.a), dirY = Math.sin(P.a);
  const planeX = -dirY * fovPlane(), planeY = dirX * fovPlane();
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

