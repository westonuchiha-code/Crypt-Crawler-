// ---------- held weapons ----------
// Style rules (from the user's reference shots: Wolf3D, Doom, Hexen, Heretic, Daggerfall):
//  * BIG: weapons fill the bottom 35-50% of the 320x200 buffer.
//  * Guns and the crossbow are CENTRED and seen from behind: near end at the bottom edge,
//    far end (muzzle/bolt tip) up toward the crosshair. Melee and magic come from the RIGHT.
//  * Everything is outlined (dark 1px edge) with 2-3 tone shading, and real hands with a
//    sleeve running off the bottom edge.
//  * Each weapon draws in LOCAL coordinates: x relative to its own centre, y = 0 at the
//    bottom of the screen, negative y = up. drawHeldWeapon() translates and adds walk bob.
const OUT = '#1e140c';
const SK = '#d9a273', SKD = '#a8693f', SKL = '#f2c597', SLV = '#4a3626';
const RIGHT_X = RW / 2 + 62;               // screen x of right-hand weapons (wand, lightning)

function poly(pts, fill, line = OUT) {
  bctx.beginPath(); bctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) bctx.lineTo(pts[i], pts[i + 1]);
  bctx.closePath();
  if (line) { bctx.strokeStyle = line; bctx.lineWidth = 2; bctx.lineJoin = 'round'; bctx.stroke(); }
  bctx.fillStyle = fill; bctx.fill();
}
function ell(x, y, rx, ry, fill, line = OUT) {
  bctx.beginPath(); bctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (line) { bctx.strokeStyle = line; bctx.lineWidth = 2; bctx.stroke(); }
  bctx.fillStyle = fill; bctx.fill();
}
function box(x, y, w, h, fill) { bctx.fillStyle = fill; bctx.fillRect(x, y, w, h); }
function flash(x, y, size) {               // red/orange/yellow muzzle starburst
  if (P.flash <= 0) return;
  const layers = [['#d8321a', 1], ['#ff9a20', 0.68], ['#fff2a0', 0.36]];
  for (const [col, k] of layers) {
    bctx.fillStyle = col; bctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const ang = i * Math.PI / 8, r = (i % 2 ? 0.55 : 0.8 + Math.random() * 0.4) * size * k;
      bctx.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.85);
    }
    bctx.closePath(); bctx.fill();
  }
}
// right fist, back of the hand to the camera, forearm and sleeve running off the bottom edge.
// (x, y) = middle of the fist; bottom = local y of the screen's bottom edge.
function drawBigFist(x, y, bottom = 0) {
  poly([x - 14, y + 6, x + 14, y + 6, x + 32, bottom + 4, x - 2, bottom + 4], SKD);   // forearm
  if (bottom - y > 26) poly([x - 6, bottom - 14, x + 34, bottom - 14, x + 40, bottom + 4, x - 8, bottom + 4], SLV);
  poly([x - 19, y - 12, x - 8, y - 17, x + 8, y - 17, x + 18, y - 12, x + 19, y + 8, x - 18, y + 10], SK);
  poly([x - 18, y + 4, x + 19, y + 3, x + 19, y + 8, x - 18, y + 10], SKD, null);   // underside shadow
  for (const k of [-12, -4, 4, 12]) ell(x + k, y - 14, 4.2, 3, SKL);                // knuckles
  for (const k of [-8, 0, 8]) box(x + k - 0.5, y - 11, 1, 13, SKD);                 // finger creases
  poly([x - 22, y - 6, x - 12, y - 9, x - 10, y + 4, x - 21, y + 6], SK);            // thumb
  box(x - 20, y - 5, 4, 3, SKL);
}

// open casting hand for lightning; palmPoint() (screen coords) is also where bolts start (see drawBolts)
function palmPoint() { return [RW / 2, RH - (P.weapon === 'hstaff' ? 62 : 90)]; }   // where the claw's bolts and the hellstaff's beam leave the weapon
// ---------- sprite-art weapons ----------
// Pistol, shotgun, fist, wand and lightning hand use pixelated photo-hand frames from assets.js
// (built by tools/pack_assets.py from art/). Each frame is a 160x90 image drawn bottom-aligned
// at 2x, so it fills the 320-wide buffer exactly as authored. At rest a weapon shows `idle`.
// While P.anim runs 1 -> 0 it steps through `seq` = [[untilProgress, frameIndex], ...],
// where progress = 1 - P.anim. `glow` adds an orange halo behind a muzzle-flash frame.
const ART = {   // photo art: only the fist is left (frame sequence over the swing)
  fist:      { idle: 0, seq: [[0.2, 1], [0.5, 2], [0.78, 1]] }
};
const artImgs = {};
if (window.ASSETS) for (const k in ASSETS) artImgs[k] = ASSETS[k].frames.map(src => { const im = new Image(); im.src = src; return im; });
function artReady(w) { const f = artImgs[w]; return !!(f && ART[w] && f.every(im => im.complete && im.naturalWidth > 0)); }
function artFrame(w) {
  const q = ART[w];
  if (P.anim <= 0.001) return q.idle;
  const pr = 1 - P.anim;
  for (const [u, f] of q.seq) if (pr < u) return f;
  return q.idle;
}
function artTip(w) { const i = artFrame(w), t = ASSETS[w].tips[i]; return [t[0] * 2, RH - 180 + t[1] * 2]; }
function drawArtWeapon(w) {
  const i = artFrame(w), q = ART[w], a = P.anim, [tx, ty] = artTip(w);
  bctx.imageSmoothingEnabled = false;
  const gl = q.glow && q.glow[i];
  if (gl) {                                              // halo behind the baked-in muzzle flash
    bctx.fillStyle = 'rgba(255,150,40,0.55)'; bctx.beginPath(); bctx.arc(tx, ty + 6, gl, 0, Math.PI * 2); bctx.fill();
    bctx.fillStyle = 'rgba(255,230,120,0.7)'; bctx.beginPath(); bctx.arc(tx, ty + 6, gl * 0.5, 0, Math.PI * 2); bctx.fill();
  }
  bctx.drawImage(artImgs[w][i], 0, RH - 180, RW, 180);
}

// Pack weapons (window.HELD, from tools/enemy_cast.py): frames sit at their original 320x200 screen positions,
// slid down by `shift` so the idle frame meets the bottom edge, then scaled about the bottom centre (`scale`).
const heldImgs = {};
if (window.HELD) for (const w in HELD) { heldImgs[w] = {}; for (const n in HELD[w].frames) { const im = new Image(); im.src = HELD[w].frames[n][0]; heldImgs[w][n] = im; } }
function heldReady(w) { const f = heldImgs[w]; return !!f && Object.values(f).every(im => im.complete && im.naturalWidth > 0); }
function drawPackWeapon(w) {
  const Hd = HELD[w], pr = 1 - P.anim;
  let names = [Hd.idle];
  if (P.anim > 0.001) for (const [u, n] of Hd.seq) if (pr < u) { names = n; break; }
  bctx.imageSmoothingEnabled = false;
  bctx.save(); bctx.translate(RW / 2, RH); bctx.scale(Hd.scale, Hd.scale); bctx.translate(-RW / 2, -RH + Hd.shift);
  for (const n of names) bctx.drawImage(heldImgs[w][n], Hd.frames[n][1], Hd.frames[n][2]);
  bctx.restore();
}
// walk bob: weapons sway as the player moves (Doom/Wolf3D style)
let bobPh = 0, bobAmt = 0, bobLX = 0, bobLY = 0;
function drawHeldWeapon(cx, base, rec) {
  const a = P.anim;
  const mv = Math.min(0.2, Math.hypot(P.x - bobLX, P.y - bobLY)); bobLX = P.x; bobLY = P.y;
  bobAmt += (Math.min(1, mv / 0.05) - bobAmt) * 0.12; bobPh += mv * 9;   // sway grows with walking speed
  const bx = Math.round(Math.sin(bobPh) * 6 * bobAmt), by = Math.round(Math.abs(Math.cos(bobPh)) * 5 * bobAmt);
  const kick = P.flash > 0 ? 7 : 0;
  bctx.save(); bctx.translate(bx, by);
  if (heldReady(P.weapon)) drawPackWeapon(P.weapon);
  else if (artReady(P.weapon)) {
    drawArtWeapon(P.weapon);
  } else { bctx.save(); bctx.translate(RIGHT_X, RH); drawBigFist(0, -40); bctx.restore(); }   // no art loaded: a drawn fist for every weapon
  bctx.restore();
}
function drawOverlays() {
  // weapon in hand
  const cx = RW / 2, base = RH, rec = P.flash > 0 ? 5 : 0;
  drawHeldWeapon(cx, base, rec);
  // damage tint
  if (P.hurt > 0) {
    bctx.fillStyle = `rgba(200,0,0,${Math.min(0.45, P.hurt * 1.5)})`;
    bctx.fillRect(0, 0, RW, RH);
  }
  if (P.nova > 0) { bctx.fillStyle = `rgba(150,255,170,${Math.min(0.7, P.nova * 2)})`; bctx.fillRect(0, 0, RW, RH); }   // the Big One's flash
  if (P.hitT > 0) {                                          // red wedge on a ring round the crosshair, pointing at whatever hit you
    const rel = P.hitA - P.a - Math.PI / 2, cx = RW / 2, cy = RH / 2, R = 62;
    bctx.save(); bctx.translate(cx + Math.cos(rel) * R, cy + Math.sin(rel) * R * 0.8); bctx.rotate(rel);
    bctx.fillStyle = `rgba(255,40,30,${Math.min(0.9, P.hitT * 2)})`;
    bctx.beginPath(); bctx.moveTo(10, 0); bctx.lineTo(-4, -13); bctx.lineTo(0, 0); bctx.lineTo(-4, 13); bctx.closePath(); bctx.fill();
    bctx.restore();
  }
  drawHitFlash();
  drawBolts();
  // minimap
  if (mapOn && level > 0) {
    const cs = 2, ox = 4, oy = 4;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!explored[y * W + x]) continue;
      const t = map[y * W + x];
      bctx.fillStyle = t === STAIRS ? '#e8d9a0' : t === LOCKED ? '#e0a020' : (t > 0 ? '#8a8a8a' : '#2e2e35');
      bctx.fillRect(ox + x * cs, oy + y * cs, cs, cs);
    }
    const colors = { potion: '#4f4', crate: '#e0b737', ammo: '#aab', drop: '#aab', armour: '#8cf', fury: '#f80', ward: '#fff', key: '#fd0' };
    for (const tr of traps) if (explored[tr.y * W + tr.x]) { bctx.fillStyle = '#a33'; bctx.fillRect(ox + tr.x * cs, oy + tr.y * cs, cs, cs); }
    for (const it of items) {
      const i = Math.floor(it.y) * W + Math.floor(it.x);
      if (explored[i]) { bctx.fillStyle = colors[it.kind]; bctx.fillRect(ox + Math.floor(it.x) * cs, oy + Math.floor(it.y) * cs, cs, cs); }
    }
    for (const m of monsters) {
      if (m.dead || m.prop) continue;
      const i = Math.floor(m.y) * W + Math.floor(m.x);
      if (explored[i]) { bctx.fillStyle = m.boss ? '#c0f' : '#f44'; bctx.fillRect(ox + Math.floor(m.x) * cs, oy + Math.floor(m.y) * cs, cs, cs); }
    }
    bctx.fillStyle = '#ffe14d';
    bctx.fillRect(ox + P.x * cs - 1, oy + P.y * cs - 1, 2, 2);
    for (let k = 1; k <= 4; k++)
      bctx.fillRect(ox + (P.x + Math.cos(P.a) * k * 0.6) * cs, oy + (P.y + Math.sin(P.a) * k * 0.6) * cs, 1, 1);
  }
}

function render() {
  const dirX = Math.cos(P.a), dirY = Math.sin(P.a);
  const planeX = -dirY * FOV_PLANE, planeY = dirX * FOV_PLANE;
  renderFloorCeil(dirX, dirY, planeX, planeY);
  renderWalls(dirX, dirY, planeX, planeY);
  renderSprites(dirX, dirY, planeX, planeY);
  bctx.putImageData(img, 0, 0);
  drawOverlays();

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const s = Math.min(canvas.width / RW, canvas.height / RH);
  const dw = RW * s, dh = RH * s;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buf, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
}

// The game draws only in the space RQPad leaves free (its side panels take the rest).
function resize() {
  const s = (window.RQPad && RQPad.stage) || { x: 0, y: 0, width: innerWidth, height: innerHeight };
  canvas.width = Math.max(1, Math.floor(s.width));
  canvas.height = Math.max(1, Math.floor(s.height));
  const hud = document.getElementById('hud');
  hud.style.left = (s.x + 12) + 'px';
  hud.style.right = (innerWidth - s.x - s.width + 12) + 'px';
  Object.assign($('bossbar').style, { left: s.x + 'px', right: (innerWidth - s.x - s.width) + 'px', top: (s.y + 66) + 'px' });
  const ov = document.getElementById('overlay');   // title screen sits in the same free area
  ov.style.left = s.x + 'px'; ov.style.right = (innerWidth - s.x - s.width) + 'px';
  ov.style.top = s.y + 'px'; ov.style.bottom = (innerHeight - s.y - s.height) + 'px';
  // intro: largest 16:9 box inside the free area, so the cutscene never sits under the pad
  const iw = Math.min(s.width, s.height * 16 / 9), ih = iw * 9 / 16;
  Object.assign(introCanvas.style, { left: (s.x + (s.width - iw) / 2) + 'px', top: (s.y + (s.height - ih) / 2) + 'px',
    width: iw + 'px', height: ih + 'px', transform: 'none' });
  const il = s.x + (s.width - iw) / 2, it = s.y + (s.height - ih) / 2;
  Object.assign($('endtitle').style, { left: il + 'px', width: iw + 'px', top: (it + ih * 0.07) + 'px', fontSize: (iw * 0.085) + 'px' });   // sized from the picture, not the screen: the pad narrows it
  Object.assign($('endroll').style, { left: il + 'px', width: iw + 'px', top: (it + ih * 0.3) + 'px', height: (ih * 0.66) + 'px', fontSize: Math.max(9, iw * 0.027) + 'px' });
  Object.assign(capEl.style, { left: s.x + 'px', right: (innerWidth - s.x - s.width) + 'px',
    top: 'auto', bottom: (innerHeight - (s.y + (s.height + ih) / 2) + ih * 0.08) + 'px' });
}

