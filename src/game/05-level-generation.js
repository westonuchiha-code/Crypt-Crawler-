// ---------- level generation ----------
// which monster a random room gets on this floor
// Each zone has its own enemy mix: [kind, weight]. Early floors of the crypt hold back the tougher kinds.
const ROSTERS = [
  [['rat', 4], ['ghoul', 3], ['skel', 2], ['imp', 2], ['flame', 1]],                  // crypt
  [['slime', 4], ['rat', 4], ['ghoul', 2], ['imp', 2]],                               // sewers
  [['skel', 4], ['ghoul', 3], ['flame', 2], ['angel', 1]],                            // catacombs
  [['knight', 4], ['skel', 2], ['imp', 2], ['angel', 1]],                             // castle halls
  [['golem', 2], ['flame', 4], ['imp', 2], ['knight', 2]],                            // foundry
  [['harpy', 4], ['angel', 3], ['flame', 2], ['knight', 1]],                          // sky tower
  [['harpy', 4], ['angel', 3], ['golem', 1], ['eye', 1], ['trooper', 2]],             // upper air
  [['alien', 3], ['eye', 2], ['trooper', 3], ['sarge', 2], ['harpy', 1]],             // the void
  [['horror', 2], ['eye', 2], ['alien', 2], ['gunner', 2], ['spider', 1], ['harpy', 2]],   // alien spire
  [['horror', 2], ['alien', 2], ['eye', 1], ['spider', 2], ['gunner', 1], ['golem', 1], ['slime', 2], ['skel', 2]]   // the other world
];
// Scenery per zone: [standing props (block movement), props hung from the ceiling (roofed zones only)].
const ZONE_PROPS = [
  [['srtc', 'brpl'], ['skh1']], [['barl', 'srtc'], ['mos1']], [['srtc', 'stgs'], ['skh1', 'hcor']], [['kfr1', 'smpl'], ['chdl']],
  [['fcan', 'kfr1'], []], [['smpl', 'cbra'], []], [['smpl', 'tblu'], []], [['col1', 'elec', 'tblu'], []],
  [['col3', 'tgrn', 'elec'], []], [['stgl', 'tre2', 'tred'], []]
];
function pickKind(lv) {
  let list = ROSTERS[zoneOf(lv)];
  if (lv < 4) list = list.filter(([k]) => k === 'rat' || k === 'ghoul');             // gentle start while you only have fists
  const total = list.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of list) { if ((r -= w) < 0) return k; }
  return list[0][0];
}
// What each enemy is. hp / dmg are base values (scaled per zone); speed 1 is a walk.
//  ranged: throws `shot` projectiles (burst = how many, fanned out); keep: ranged enemies hold about this distance
//  lunge: charges in a straight line now and then; weave: drifts side to side (flyers); fly: bobs in the air
//  heavy: mostly shrugs off knockback
const KIND = {
  rat:    { hp: 30,  speed: 1.5, dmg: 3,  lunge: true },                                              // flesh worm: weak, darts at you
  ghoul:  { hp: 65,  speed: 0.75, dmg: 6 },                                                           // hooded dead: slow, steady
  skel:   { hp: 75,  speed: 1.35, dmg: 6,  weave: 0.35 },                                             // sabreclaw: quick slasher
  imp:    { hp: 55,  speed: 1.0, dmg: 4,  ranged: true, shot: 'fire' },                               // serpentipede: fireballs, then claws
  flame:  { hp: 40,  speed: 1.0, dmg: 4,  ranged: true, shot: 'fire', keep: 3, weave: 0.6, fly: true },
  angel:  { hp: 95,  speed: 0.9, dmg: 6,  ranged: true, shot: 'bolt', burst: 3, keep: 4.5, weave: 0.4, fly: true },   // wizard: fan of three
  slime:  { hp: 70,  speed: 1.0, dmg: 6,  lunge: true },                                              // red beast: pounces
  knight: { hp: 120, speed: 0.9, dmg: 9,  heavy: true },                                              // undead warrior: armoured
  golem:  { hp: 170, speed: 0.65, dmg: 9,  ranged: true, shot: 'heavy', heavy: true },                // steel brute: slow, hits hard both ways
  harpy:  { hp: 40,  speed: 1.7, dmg: 5,  lunge: true, weave: 0.7, fly: true },                       // gargoyle: swoops
  alien:  { hp: 65,  speed: 1.1, dmg: 6,  ranged: true, shot: 'spit' },
  eye:    { hp: 85,  speed: 0.7, dmg: 6,  ranged: true, shot: 'spit', keep: 3.5, weave: 0.3, fly: true },
  horror: { hp: 170, speed: 0.6, dmg: 9,  ranged: true, shot: 'blob', burst: 2, keep: 4, heavy: true },      // twin cannons
  trooper:{ hp: 50,  speed: 1.0, dmg: 5,  ranged: true, shot: 'bolt', keep: 3 },                      // dead soldier: plinks from range
  sarge:  { hp: 75,  speed: 1.0, dmg: 5,  ranged: true, shot: 'spit', burst: 3 },                     // shotgun soldier: a fan up close
  gunner: { hp: 95,  speed: 0.9, dmg: 5,  ranged: true, shot: 'bolt', burst: 3, keep: 3.5, heavy: true },   // heavy gunner: tight bursts
  spider: { hp: 150, speed: 0.8, dmg: 7,  ranged: true, shot: 'bolt', burst: 2, keep: 4, heavy: true }, // machine spider
  pod:    { hp: 15,  speed: 0, dmg: 0, prop: true }                                                   // explosive pod: not an enemy, bursts when shot
};
// Each zone's boss has its own moves on top of walking at you and shooting:
//  burst: shots per volley; ring: [shots, every s] fired in all directions; stream: [shots, gap s] rapid fire in place of a volley
//  summon: [kind, most alive, every s]; lunge: charges; blink: [every s] vanishes and reappears beside you
//  phase2: changes applied once, at half health (with phase2Msg, a burst of shots in every direction and a flash)
const BOSS_MOVES = [
  { shot: 'bolt',   summon: ['ghoul', 2, 12] },                              // the Warden raises the dead
  { shot: 'spit',   burst: 3 },                                             // the Sewer King spits a fan
  { shot: 'bolt',   ring: [6, 7], fly: true,                               // the Hollow Queen: rings of bolts,
    phase2: { summon: ['flame', 3, 8] }, phase2Msg: 'The Hollow Queen screams, and burning skulls answer' },   // then skulls
  { shot: 'heavy',  lunge: true },                                          // the Iron Castellan charges
  { shot: 'fire',   burst: 3, lunge: true,                                  // the Forgeheart: charges and fans fire,
    phase2: { burst: 5, speed: 0.95 }, phase2Msg: 'The Forgeheart burns white-hot' },                        // then wider fans, faster
  { shot: 'fire',   summon: ['flame', 4, 7], fly: true, weave: 0.4 },       // the Storm Herald spits out flames
  { shot: 'heavy',  burst: 2, ring: [6, 8] },                               // the Skywyrm
  { shot: 'bolt',   stream: [6, 0.2],                                      // the Void Archon: a hose of bolts,
    phase2: { stream: [8, 0.18], blink: [9] }, phase2Msg: 'The Void Archon slips out of step with the world' },   // then it teleports
  { shot: 'fire',   blink: [10], ring: [8, 8] },                            // the Star-Eater steps through space
  { shot: 'rocket', burst: 3, summon: ['horror', 1, 20], ring: [10, 9],
    phase2: { burst: 4, speed: 1.0, ring: [14, 7], stream: null }, phase2Msg: 'The Titan tears off its armour and comes for you' }    // the Spire Titan: rockets, rings and reinforcements
];
// What each enemy is called when it kills you (bosses use their own names).
const FOE_NAME = { rat: 'a flesh worm', ghoul: 'a hooded ghoul', skel: 'a sabreclaw', imp: 'a serpentipede', flame: 'a burning skull',
  angel: 'a wizard', slime: 'a red beast', knight: 'an undead knight', golem: 'a steel brute', harpy: 'a gargoyle', alien: 'a mutant',
  eye: 'a floating horror', horror: 'a cannon horror', trooper: 'a dead trooper', sarge: 'a shotgun sergeant', gunner: 'a heavy gunner',
  spider: 'a machine spider' };
const foeName = m => !m ? 'a dart' : m.boss ? m.name : FOE_NAME[m.kind] || 'something';
const SPR_FALLBACK = { trooper: 'imp', sarge: 'imp', gunner: 'imp', spider: 'ghoul', slime: 'ghoul', knight: 'skel', golem: 'ghoul', harpy: 'imp', alien: 'imp', eye: 'flame', horror: 'ghoul' };
function spawnMonster(x, y, kind, lv) {
  const m = { x, y, kind, dead: false, hurt: 0, mcool: 0, rcool: rnd(1, 2.5), wander: 0, wa: 0, ph: rnd(0, 6.28),
    boss: false, name: '', ranged: false, scale: 1, speed: 1, dmg: 5, hp: 55, maxHp: 55, tex: SPR.ghoul,
    shot: 'fire', burst: 1, keep: 0, weave: 0, lungeCd: rnd(2, 4), lungeT: 0, animT: 0 };
  if (kind === 'boss') Object.assign(m, { boss: true, name: BOSS_NAMES[lv], hp: Math.round(BOSS_HP[lv] * (opts.diff === 'hard' ? 1 : DF().hp)), tex: SPR.boss, scale: 2.4, speed: 0.75,
    dmg: Math.round((8 + 1.6 * zoneOf(lv)) * bossDmgK()), ranged: true, heavy: true, ringT: 3, sumT: 5, blinkT: 4 }, BOSS_MOVES[zoneOf(lv)]);
  else {
    Object.assign(m, KIND[kind] || KIND.ghoul, { tex: SPR[SPR_FALLBACK[kind] || kind] || SPR.ghoul });
    if (!m.prop) { m.hp = Math.round(m.hp * hpMul(lv)); m.dmg = Math.round(m.dmg * dmgMul(lv)); }     // zone scaling for regular enemies
  }
  m.maxHp = m.hp;
  return m;
}

// Floor 0: the entrance hall. The tower door sits at the far end.
function generateEntrance() {
  applyTheme(0);
  W = H = 7;
  map = new Uint8Array(W * H).fill(2);
  for (let y = 2; y <= 5; y++) for (let x = 1; x <= 5; x++) map[y * W + x] = 0;
  map[1 * W + 3] = DOOR;
  monsters = []; items = []; shots = []; pshots = []; floorAmmo = 1; props = []; secrets = { total: 0, found: 0 }; traps = []; trapAt = null; darts = [];
  explored = new Uint8Array(W * H).fill(1);
  P.x = 3.5; P.y = 4.5; P.a = -Math.PI / 2;
}

function generate(lv) {
  applyTheme(lv);
  W = H = (Math.min(41, 17 + lv * 4) | 1);
  const idx = (x, y) => y * W + x;
  map = new Uint8Array(W * H).fill(1);

  // rooms of varied size, placed without touching, then joined by corridors
  const rooms = [];
  const target = Math.min(14, 6 + Math.floor(lv / 2));
  for (let tries = 0; tries < 300 && rooms.length < target; tries++) {
    const w = 4 + ((Math.random() * 5) | 0), h = 4 + ((Math.random() * 5) | 0);
    const x0 = 1 + ((Math.random() * (W - w - 2)) | 0), y0 = 1 + ((Math.random() * (H - h - 2)) | 0);
    const x1 = x0 + w - 1, y1 = y0 + h - 1;
    const clash = rooms.some(r => !(x1 + 2 < r.x0 || r.x1 + 2 < x0 || y1 + 2 < r.y0 || r.y1 + 2 < y0));
    if (clash) continue;
    rooms.push({ x0, y0, x1, y1, cx: (x0 + x1) >> 1, cy: (y0 + y1) >> 1 });
  }
  let arena = null;
  if (BOSS_NAMES[lv]) {                                      // a boss floor ends in an 11 x 11 arena: the last room in the chain, stairs in the middle
    for (let tries = 0; tries < 400 && !arena; tries++) {
      const x0 = 2 + ((Math.random() * (W - 15)) | 0), y0 = 2 + ((Math.random() * (H - 15)) | 0), x1 = x0 + 10, y1 = y0 + 10;
      const r0 = rooms[0];
      if (Math.hypot(x0 + 5 - r0.cx, y0 + 5 - r0.cy) < 14) continue;          // well away from where you start
      for (let i = rooms.length - 1; i > 0; i--) { const r = rooms[i]; if (!(x1 + 2 < r.x0 || r.x1 + 2 < x0 || y1 + 2 < r.y0 || r.y1 + 2 < y0)) rooms.splice(i, 1); }
      const r = rooms[0]; if (!(x1 + 2 < r.x0 || r.x1 + 2 < x0 || y1 + 2 < r.y0 || r.y1 + 2 < y0)) continue;
      arena = { x0, y0, x1, y1, cx: x0 + 5, cy: y0 + 5, arena: true }; rooms.push(arena);
    }
  }
  for (const r of rooms) for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) map[idx(x, y)] = 0;

  // L-shaped corridor between two room centres
  const carve = (ax, ay, bx, by) => {
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) map[idx(x, ay)] = 0;
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) map[idx(bx, y)] = 0;
  };
  // chain every room to the next so everything is reachable, then add a few extra loops
  for (let i = 1; i < rooms.length; i++) carve(rooms[i - 1].cx, rooms[i - 1].cy, rooms[i].cx, rooms[i].cy);
  for (let i = 0; i < rooms.length; i++) {
    if (Math.random() > 0.35) continue;
    const j = (Math.random() * rooms.length) | 0;
    if (j !== i) carve(rooms[i].cx, rooms[i].cy, rooms[j].cx, rooms[j].cy);
  }

  // big halls get pillars set off the centre lines, so corridors still run through
  for (const r of rooms) {
    const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1;
    if (w >= 7 && h >= 7 && (r.arena || Math.random() < 0.6)) {      // the arena always has its four pillars for cover
      for (const [px, py] of [[r.x0 + 2, r.y0 + 2], [r.x1 - 2, r.y0 + 2], [r.x0 + 2, r.y1 - 2], [r.x1 - 2, r.y1 - 2]]) map[idx(px, py)] = 1;
    }
  }

  for (let i = 0; i < map.length; i++) if (map[i] === 1) map[i] = 1 + ((Math.random() * 3) | 0);

  // stairs at the farthest reachable cell from the start (BFS)
  const sRoom = rooms[0];                      // the player starts in the first room
  const start = idx(sRoom.cx, sRoom.cy);
  const dist = new Int32Array(W * H).fill(-1);
  const q = [start]; dist[start] = 0; let far = start;
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi];
    if (dist[c] > dist[far]) far = c;
    const x = c % W, y = (c / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = idx(nx, ny);
      if (map[n] === 0 && dist[n] < 0) { dist[n] = dist[c] + 1; q.push(n); }
    }
  }
  if (arena) far = idx(arena.cx, arena.cy);
  map[far] = STAIRS;
  stairsPos = { x: (far % W) + 0.5, y: ((far / W) | 0) + 0.5 };

  // ---- floor variety: secret rooms, scenery, a locked door with its key ----
  const reserved = new Set();                                // cells that loot and enemies must not be dropped on
  const isOpen = (x, y) => { const t = map[idx(x, y)]; return t === 0 || t === STAIRS; };
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  props = []; secrets = { total: 0, found: 0 }; P.keys = 0; opened = [];
  const secretLoot = [];
  for (let n = 0, want = (Math.random() * 3) | 0, tries = 0; n < want && tries < 400; tries++) {   // 0-2 closets hidden behind a wall you can push open
    const x = 2 + ((Math.random() * (W - 4)) | 0), y = 2 + ((Math.random() * (H - 4)) | 0);
    if (map[idx(x, y)] < 1 || map[idx(x, y)] > 3) continue;
    const open = D4.filter(([dx, dy]) => isOpen(x + dx, y + dy));
    if (open.length !== 1) continue;
    const dx = -open[0][0], dy = -open[0][1];                // dig away from the open side
    const cells = [[x + dx, y + dy], [x + 2 * dx, y + 2 * dy], [x + 2 * dx + dy, y + 2 * dy + dx], [x + 2 * dx - dy, y + 2 * dy - dx]];
    const mine = new Set(cells.map(([cx, cy]) => idx(cx, cy))); mine.add(idx(x, y));
    const ok = cells.every(([cx, cy]) => cx > 1 && cy > 1 && cx < W - 2 && cy < H - 2 && map[idx(cx, cy)] >= 1 && map[idx(cx, cy)] <= 3 &&
      [-1, 0, 1].every(ay => [-1, 0, 1].every(ax => mine.has(idx(cx + ax, cy + ay)) || !isOpen(cx + ax, cy + ay) && map[idx(cx + ax, cy + ay)] !== SECRET)));
    if (!ok || Math.hypot(x - rooms[0].cx, y - rooms[0].cy) < 4) continue;
    for (const [cx, cy] of cells) { map[idx(cx, cy)] = 0; reserved.add(idx(cx, cy)); }
    map[idx(x, y)] = SECRET; n++; secrets.total++;
    const pool = ['armour', 'potion', 'potion', 'drop', 'drop', lv >= 6 ? (Math.random() < 0.5 ? 'fury' : 'ward') : 'armour'];
    for (let k = 1; k < 3; k++) secretLoot.push({ x: cells[k][0] + 0.5, y: cells[k][1] + 0.5, kind: pool[(Math.random() * pool.length) | 0], taken: false });
  }
  const zp = ZONE_PROPS[zoneOf(lv)], roofed = !(THEMES.find(t => lv <= t.upTo) || {}).sky;
  for (const r of rooms) {                                   // torches, pillars and the like, one cell in from the corners
    if (r.x1 - r.x0 < 4 || r.y1 - r.y0 < 4) continue;
    for (const [px, py] of [[r.x0 + 1, r.y0 + 1], [r.x1 - 1, r.y0 + 1], [r.x0 + 1, r.y1 - 1], [r.x1 - 1, r.y1 - 1]]) {
      if (map[idx(px, py)] !== 0 || Math.random() < 0.45) continue;
      props.push({ x: px + 0.5, y: py + 0.5, kind: zp[0][(Math.random() * zp[0].length) | 0], solid: true }); reserved.add(idx(px, py));
    }
    if (roofed && zp[1].length && Math.random() < 0.5) {
      const hx = r.cx + (Math.random() < 0.5 ? -1 : 1), hy = r.cy + (Math.random() < 0.5 ? -1 : 1);
      props.push({ x: hx + 0.5, y: hy + 0.5, kind: zp[1][(Math.random() * zp[1].length) | 0], solid: false });
    }
  }
  traps = []; trapAt = new Uint8Array(W * H);                // spike traps in corridors, from floor 7
  for (let n = 0, want = lv >= 7 ? (Math.random() * 4) | 0 : 0, tries = 0; n < want && tries < 300; tries++) {
    const x = 2 + ((Math.random() * (W - 4)) | 0), y = 2 + ((Math.random() * (H - 4)) | 0), c = idx(x, y);
    if (map[c] !== 0 || reserved.has(c) || dist[c] < 6) continue;
    const ew = !isOpen(x - 1, y) && !isOpen(x + 1, y) && isOpen(x, y - 1) && isOpen(x, y + 1);
    const ns = !isOpen(x, y - 1) && !isOpen(x, y + 1) && isOpen(x - 1, y) && isOpen(x + 1, y);
    if ((!ew && !ns) || traps.some(t => Math.abs(t.x - x) + Math.abs(t.y - y) < 4)) continue;
    traps.push({ x, y, ph: Math.random() * TRAP_CYCLE, was: false }); trapAt[c] = traps.length; reserved.add(c); n++;
  }
  darts = [];                                                // dart walls from floor 12: a wall cell looking down a straight run of 4+ cells
  for (let n = 0, want = lv >= 12 ? (Math.random() * 3) | 0 : 0, tries = 0; n < want && tries < 400; tries++) {
    const x = 2 + ((Math.random() * (W - 4)) | 0), y = 2 + ((Math.random() * (H - 4)) | 0);
    if (map[idx(x, y)] < 1 || map[idx(x, y)] > 3) continue;
    const open = D4.filter(([dx, dy]) => isOpen(x + dx, y + dy));
    if (open.length !== 1) continue;
    const [dx, dy] = open[0]; let run = 0;
    while (run < 12 && isOpen(x + dx * (run + 1), y + dy * (run + 1))) run++;
    if (run < 4 || dist[idx(x + dx, y + dy)] < 6 || darts.some(d => Math.abs(d.x - x) + Math.abs(d.y - y) < 6)) continue;
    map[idx(x, y)] = DARTS; darts.push({ x, y, dx, dy, t: 1 + Math.random() * 2 }); n++;
  }
  // locked door: a corridor cell that cuts the stairs off from the start (as near the stairs as possible) or, failing
  // that, one that seals off a side area as a vault with extra loot; either way the key stays on your side
  let keyCells = null;
  if (lv >= 3 && !BOSS_NAMES[lv] && Math.random() < 0.9) {      // only about one floor in four has a spot that works
    const reach = (block) => {
      const seen = new Uint8Array(W * H), qq = [start]; seen[start] = 1;
      for (let qi = 0; qi < qq.length; qi++) {
        const c = qq[qi], x = c % W, y = (c / W) | 0;
        for (const [dx, dy] of D4) { const n = idx(x + dx, y + dy); if (!seen[n] && n !== block && isOpen(x + dx, y + dy)) { seen[n] = 1; qq.push(n); } }
      }
      return seen;
    };
    let best = -1, bestSeen = null;
    for (let c = 0; c < map.length; c++) {
      if (map[c] !== 0 || c === start || dist[c] < 8 || dist[c] <= (best < 0 ? 0 : dist[best])) continue;
      const x = c % W, y = (c / W) | 0;
      const ew = !isOpen(x - 1, y) && !isOpen(x + 1, y) && isOpen(x, y - 1) && isOpen(x, y + 1);
      const ns = !isOpen(x, y - 1) && !isOpen(x, y + 1) && isOpen(x - 1, y) && isOpen(x + 1, y);
      if (!ew && !ns) continue;                              // only where a door fits: walls on both sides
      const seen = reach(c);
      if (!seen[far]) { best = c; bestSeen = seen; }
    }
    if (best < 0) {                                          // no way to gate the stairs: look for a vault instead
      const all = reach(-1); let total = 0, cut = 0; for (let i = 0; i < all.length; i++) total += all[i];
      for (let c = 0; c < map.length; c++) {
        if (map[c] !== 0 || c === start || dist[c] < 6) continue;
        const x = c % W, y = (c / W) | 0;
        const ew = !isOpen(x - 1, y) && !isOpen(x + 1, y) && isOpen(x, y - 1) && isOpen(x, y + 1);
        const ns = !isOpen(x, y - 1) && !isOpen(x, y + 1) && isOpen(x - 1, y) && isOpen(x + 1, y);
        if (!ew && !ns) continue;
        const seen = reach(c); let n = 0; for (let i = 0; i < seen.length; i++) n += seen[i];
        const lost = total - n - 1;
        if (lost >= 12 && lost <= total * 0.4 && lost > cut) { cut = lost; best = c; bestSeen = seen; }
      }
      if (best >= 0) {                                       // stock the vault
        const inside = []; for (let i = 0; i < map.length; i++) if (map[i] === 0 && all[i] && !bestSeen[i] && i !== best && !reserved.has(i)) inside.push(i);
        for (const kind of ['armour', lv >= 6 ? 'fury' : 'potion', 'potion']) {
          const c = inside.splice((Math.random() * inside.length) | 0, 1)[0];
          if (c !== undefined) { secretLoot.push({ x: (c % W) + 0.5, y: ((c / W) | 0) + 0.5, kind, taken: false }); reserved.add(c); }
        }
      }
    }
    if (best >= 0) { map[best] = LOCKED; keyCells = bestSeen; }
  }

  // free floor cells away from the spawn
  const free = [];
  for (let i = 0; i < map.length; i++) {
    if (map[i] !== 0 || reserved.has(i)) continue;
    const x = i % W, y = (i / W) | 0;
    if (Math.hypot(x - sRoom.cx, y - sRoom.cy) > 6) free.push(i);
  }
  const take = () => {
    const k = (Math.random() * free.length) | 0;
    const i = free[k]; free[k] = free[free.length - 1]; free.pop();
    return i;
  };
  const cellXY = c => [(c % W) + 0.5, ((c / W) | 0) + 0.5];

  items = secretLoot; shots = []; pshots = [];
  if (keyCells) {                                            // the key: somewhere you can reach without the door, not too close to the start
    const cand = free.filter(i => keyCells[i]), far2 = cand.filter(i => dist[i] > 6);
    const pick = (far2.length ? far2 : cand)[(Math.random() * (far2.length ? far2 : cand).length) | 0];
    if (pick === undefined) map[map.indexOf(LOCKED)] = 0;    // nowhere to put it: no lock after all
    else { free.splice(free.indexOf(pick), 1); const [kx, ky] = cellXY(pick); items.push({ x: kx, y: ky, kind: 'key', taken: false }); }
  }
  const addItem = (kind) => { if (!free.length) return; const [x, y] = cellXY(take()); items.push({ x, y, kind, taken: false }); };
  for (let i = 0; i < potionCount(lv); i++) addItem('potion');
  addItem('crate');                                   // one weapon crate per floor
  addItem('ammo'); if (Math.random() < 0.5) addItem('ammo');
  if (lv >= 4 && (BOSS_NAMES[lv] || Math.random() < 0.35 + 0.04 * zoneOf(lv))) addItem('armour');
  if (lv >= 6 && (BOSS_NAMES[lv] || Math.random() < 0.22)) addItem(Math.random() < 0.6 ? 'fury' : 'ward');   // always one for a boss

  monsters = [];
  // the zone boss guards the stairs on every tenth floor
  if (BOSS_NAMES[lv] && free.length) {
    const sx = far % W, sy = (far / W) | 0;
    let bi = -1, bd = Infinity;
    for (const i of free) {
      const d = Math.hypot((i % W) - sx, ((i / W) | 0) - sy);
      if (d < bd) { bd = d; bi = i; }
    }
    free.splice(free.indexOf(bi), 1);
    const [bx, by] = cellXY(bi);
    monsters.push(spawnMonster(bx, by, 'boss', lv));
  }

  const nm = Math.round(Math.min(20, 5 + ((lv - 1) % 10) * 0.6 + zoneOf(lv) * 1.3) * (BOSS_NAMES[lv] ? 0.6 : 1));   // fewer on a boss floor: the boss is the fight   // ramps inside each zone, and zone by zone
  // Most enemies come in packs of 2-4 sharing a room (a mix from the zone's roster); about a quarter roam alone.
  const inRoom = r => free.filter(c => { const x = c % W, y = (c / W) | 0; return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1; });
  const packRooms = rooms.slice(1).filter(r => !r.arena);
  for (let left = nm; left > 0 && free.length;) {
    const cells = packRooms.length && Math.random() < 0.75 ? inRoom(packRooms[(Math.random() * packRooms.length) | 0]) : [];
    const size = cells.length >= 2 ? Math.min(left, cells.length, 2 + ((Math.random() * 3) | 0)) : 1;
    for (let k = 0; k < size; k++, left--) {
      let c;
      if (size > 1) { c = cells.splice((Math.random() * cells.length) | 0, 1)[0]; free.splice(free.indexOf(c), 1); } else c = take();
      const [x, y] = cellXY(c);
      monsters.push(spawnMonster(x, y, pickKind(lv), lv));
    }
  }

  for (let i = 0, n = lv >= 5 ? (Math.random() * 4) | 0 : 0; i < n && free.length; i++) {   // explosive pods
    const [x, y] = cellXY(take()); monsters.push(spawnMonster(x, y, 'pod', lv));
  }
  // size this floor's ammo to what stands on it: unscaled, the floor would hold `base` damage worth of ammo
  const pool = Object.keys(WEAPON_FLOOR).filter(w => lv >= WEAPON_FLOOR[w]);
  const boxDmg = pool.reduce((a, w) => a + BOX_AMMO[w] * AMMO_DMG[w], 0);
  const crateDmg = pool.reduce((a, w) => a + CRATE_AMMO[w] * AMMO_DMG[w], 0) / pool.length;
  const base = items.reduce((a, it) => a + (it.kind === 'crate' ? crateDmg : it.kind === 'ammo' ? boxDmg : 0), 0)
    + monsters.length * 0.3 * boxDmg / 2 / pool.length;
  floorAmmo = Math.max(1, monsters.reduce((a, m) => a + (m.prop ? 0 : m.hp), 0) * AMMO_RATIO(lv) / base) / wpnMul(lv);   // stronger weapons need fewer rounds

  explored = new Uint8Array(W * H);
  P.x = sRoom.cx + 0.5; P.y = sRoom.cy + 0.5; P.a = 0;
}

