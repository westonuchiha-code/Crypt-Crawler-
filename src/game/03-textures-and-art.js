// ---------- procedural textures ----------
function makeWall(hue, sat, light, mortar, bw, bh) {
  const c = mk(64, 64), g = c.getContext('2d');
  g.fillStyle = mortar; g.fillRect(0, 0, 64, 64);
  for (let y = 0, row = 0; y < 64; y += bh, row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < 64; x += bw) {
      g.fillStyle = `hsl(${hue + rnd(-4, 4)},${sat + rnd(-5, 5)}%,${light + rnd(-6, 6)}%)`;
      g.fillRect(x + off + 1, y + 1, bw - 2, bh - 2);
    }
  }
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(0,0,0,${rnd(0, 0.22)})`;
    g.fillRect(rnd(0, 62), rnd(0, 62), 2, 2);
  }
  return toPixels(c);
}
function doorTex() {
  const c = mk(64, 64), g = c.getContext('2d');
  g.fillStyle = '#4a2b15'; g.fillRect(0, 0, 64, 64);
  for (let x = 0; x < 64; x += 8) {
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, 0, 1, 64);
    g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x + 2, 0, 2, 64);
  }
  g.fillStyle = '#2a2a30'; g.fillRect(0, 14, 64, 3); g.fillRect(0, 40, 64, 3);
  g.fillStyle = '#c9a227'; g.fillRect(0, 0, 64, 2); g.fillRect(0, 0, 2, 64); g.fillRect(62, 0, 2, 64);
  g.beginPath(); g.arc(32, 27, 4, 0, Math.PI * 2); g.fill();
  return toPixels(c);
}
function monsterTex(body, horns) {
  const c = mk(32, 32), g = c.getContext('2d');
  if (horns) {
    g.fillStyle = '#e8e0c8';
    g.beginPath(); g.moveTo(8, 9); g.lineTo(5, 1); g.lineTo(12, 7); g.fill();
    g.beginPath(); g.moveTo(24, 9); g.lineTo(27, 1); g.lineTo(20, 7); g.fill();
  }
  g.fillStyle = body; g.beginPath(); g.ellipse(16, 14, 9, 10, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(9, 22, 5, 8); g.fillRect(18, 22, 5, 8);
  g.fillStyle = '#000'; g.fillRect(10, 12, 4, 4); g.fillRect(18, 12, 4, 4);
  g.fillStyle = '#f22'; g.fillRect(11, 13, 2, 2); g.fillRect(19, 13, 2, 2);
  g.fillStyle = '#300'; g.fillRect(12, 20, 8, 2);
  return toPixels(c);
}
// ---- placeholder monster sprites (32x32, drawn by hand) ----
function ratTex() {
  const c = mk(32, 32), g = c.getContext('2d');
  g.strokeStyle = '#7d5f5f'; g.lineWidth = 1.5;               // tail hanging down behind
  g.beginPath(); g.moveTo(16, 29); g.quadraticCurveTo(29, 30, 27, 17); g.stroke();
  g.fillStyle = '#4a3a3a'; g.fillRect(9, 25, 3, 5); g.fillRect(20, 25, 3, 5);   // feet
  g.fillStyle = '#6e5a58'; g.beginPath(); g.ellipse(16, 21, 9, 7, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#8f7a76'; g.beginPath(); g.ellipse(16, 22, 5, 3, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#6e5a58';
  g.beginPath(); g.arc(9, 9, 3.5, 0, Math.PI * 2); g.arc(23, 9, 3.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#c98a84';
  g.beginPath(); g.arc(9, 9, 1.8, 0, Math.PI * 2); g.arc(23, 9, 1.8, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#6e5a58'; g.beginPath(); g.ellipse(16, 14, 7, 6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#7e6a68'; g.beginPath(); g.ellipse(16, 18, 3, 2, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f22'; g.fillRect(12, 12, 2, 2); g.fillRect(18, 12, 2, 2);
  g.fillStyle = '#000'; g.fillRect(15, 17, 2, 1);
  g.fillStyle = '#f0ecd8'; g.fillRect(15, 19, 1, 2); g.fillRect(16, 19, 1, 2);   // big front teeth
  return toPixels(c);
}
function flameTex() {
  // a fireball with a face: flickering tongues on top, glowing core, angry eyes, jagged mouth
  const c = mk(32, 32), g = c.getContext('2d');
  g.fillStyle = '#ff7a1a';
  g.beginPath(); g.moveTo(6, 16); g.lineTo(9, 4); g.lineTo(12, 13); g.lineTo(16, 1); g.lineTo(20, 13); g.lineTo(23, 4); g.lineTo(26, 16); g.closePath(); g.fill();
  const grd = g.createRadialGradient(16, 18, 2, 16, 18, 13);
  grd.addColorStop(0, '#fff7a0'); grd.addColorStop(0.55, '#ff8a20'); grd.addColorStop(1, 'rgba(255,60,0,0.6)');
  g.fillStyle = grd; g.beginPath(); g.ellipse(16, 18, 11, 11, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a0800'; g.fillRect(9, 13, 5, 1); g.fillRect(18, 13, 5, 1);   // brows
  g.fillRect(10, 15, 3, 4); g.fillRect(19, 15, 3, 4);                          // eyes
  g.fillStyle = '#fff7a0'; g.fillRect(11, 16, 1, 1); g.fillRect(20, 16, 1, 1); // glints
  g.fillStyle = '#3a0800';
  g.beginPath(); g.moveTo(11, 23); g.lineTo(21, 23); g.lineTo(19, 26); g.lineTo(16, 24); g.lineTo(13, 26); g.closePath(); g.fill();
  return toPixels(c);
}
function demonTex() {
  // Doom-style imp: hunched, bone horns, spined shoulders, clawed arms, glowing yellow eyes
  const c = mk(32, 32), g = c.getContext('2d');
  g.fillStyle = '#d9d0b4';
  g.beginPath(); g.moveTo(9, 9); g.lineTo(6, 1); g.lineTo(13, 7); g.fill();
  g.beginPath(); g.moveTo(23, 9); g.lineTo(26, 1); g.lineTo(19, 7); g.fill();
  g.fillStyle = '#4a2010';
  g.beginPath(); g.moveTo(6, 12); g.lineTo(1, 9); g.lineTo(7, 16); g.fill();
  g.beginPath(); g.moveTo(26, 12); g.lineTo(31, 9); g.lineTo(25, 16); g.fill();
  g.fillStyle = '#7a3520'; g.beginPath(); g.ellipse(16, 16, 10, 9, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#8a4028'; g.fillRect(4, 16, 4, 11); g.fillRect(24, 16, 4, 11);
  g.fillStyle = '#e8e0c8'; g.fillRect(3, 27, 2, 3); g.fillRect(5, 27, 2, 3); g.fillRect(25, 27, 2, 3); g.fillRect(27, 27, 2, 3);
  g.fillStyle = '#4a2010'; g.fillRect(9, 23, 5, 8); g.fillRect(18, 23, 5, 8);
  g.fillStyle = '#ffd21a'; g.fillRect(10, 11, 4, 3); g.fillRect(18, 11, 4, 3);
  g.fillStyle = '#1a0500'; g.fillRect(12, 20, 8, 3);
  g.fillStyle = '#f0e8d0'; g.fillRect(13, 20, 1, 2); g.fillRect(15, 20, 1, 2); g.fillRect(17, 20, 1, 2); g.fillRect(19, 20, 1, 2);
  return toPixels(c);
}
function angelTex() {
  // winged figure in a white robe with a gold halo, Megami Tensei-style
  const c = mk(32, 32), g = c.getContext('2d');
  g.fillStyle = '#e8ecf4';
  g.beginPath(); g.moveTo(12, 14); g.lineTo(1, 3); g.lineTo(2, 9); g.lineTo(0, 14); g.lineTo(4, 20); g.lineTo(10, 22); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(20, 14); g.lineTo(31, 3); g.lineTo(30, 9); g.lineTo(32, 14); g.lineTo(28, 20); g.lineTo(22, 22); g.closePath(); g.fill();
  g.fillStyle = '#b8c2d6';
  g.beginPath(); g.moveTo(10, 16); g.lineTo(3, 11); g.lineTo(6, 19); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(22, 16); g.lineTo(29, 11); g.lineTo(26, 19); g.closePath(); g.fill();
  g.strokeStyle = '#ffe27a'; g.lineWidth = 1; g.beginPath(); g.ellipse(16, 3, 6, 2, 0, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#f4f1e6'; g.beginPath(); g.moveTo(12, 12); g.lineTo(20, 12); g.lineTo(23, 30); g.lineTo(9, 30); g.closePath(); g.fill();
  g.fillStyle = '#c9a227'; g.fillRect(15, 12, 2, 18);
  g.fillStyle = '#f0d2b0'; g.beginPath(); g.arc(16, 9, 4, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#d8c9a8'; g.fillRect(12, 5, 8, 2);
  g.fillStyle = '#4aa8ff'; g.fillRect(14, 9, 1, 1); g.fillRect(17, 9, 1, 1);
  g.fillStyle = '#f0d2b0'; g.fillRect(9, 14, 2, 8); g.fillRect(21, 14, 2, 8);
  return toPixels(c);
}
function potionTex() {
  const c = mk(32, 32), g = c.getContext('2d');
  g.fillStyle = '#bbb'; g.fillRect(13, 4, 6, 5);
  g.fillStyle = '#8a5a2b'; g.fillRect(12, 2, 8, 3);
  g.fillStyle = '#d12c2c'; g.beginPath(); g.arc(16, 21, 8, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(12, 18, 2, 5);
  return toPixels(c);
}
function crateTex() {
  const c = mk(32, 32), g = c.getContext('2d');
  g.fillStyle = '#7a4e22'; g.fillRect(4, 8, 24, 20);
  g.fillStyle = '#4a2e12'; g.fillRect(4, 8, 24, 2); g.fillRect(4, 26, 24, 2);
  g.fillStyle = '#e0b737'; g.fillRect(4, 15, 24, 2);
  g.fillStyle = '#ffe27a'; g.fillRect(14, 12, 4, 4);
  return toPixels(c);
}
function ammoTex() {
  const c = mk(32, 32), g = c.getContext('2d');
  for (let i = 0; i < 3; i++) {
    g.fillStyle = '#c0c4cc'; g.fillRect(6 + i * 7, 10, 4, 14);
    g.fillStyle = '#c99a2a'; g.fillRect(6 + i * 7, 10, 4, 4);
  }
  return toPixels(c);
}
function arrowTex() {
  // a bolt flying away from the player: shaft stands upright, steel point at the top, red fletching at the back
  const c = mk(32, 32), g = c.getContext('2d');
  g.fillStyle = '#c8a878'; g.fillRect(15, 9, 2, 20);                 // wooden shaft
  g.fillStyle = '#e0c8a0'; g.fillRect(15, 9, 1, 20);                 // lit edge
  g.fillStyle = '#d8d8e0';
  g.beginPath(); g.moveTo(16, 1); g.lineTo(20, 9); g.lineTo(12, 9); g.closePath(); g.fill();   // steel head
  g.fillStyle = '#a8a8b0'; g.fillRect(15, 3, 1, 6);                  // head shading
  g.fillStyle = '#d33';
  g.beginPath(); g.moveTo(15, 22); g.lineTo(8, 30); g.lineTo(15, 27); g.closePath(); g.fill();   // left fletching
  g.beginPath(); g.moveTo(17, 22); g.lineTo(24, 30); g.lineTo(17, 27); g.closePath(); g.fill();  // right fletching
  return toPixels(c);
}
function magicTex() {
  const c = mk(32, 32), g = c.getContext('2d');
  const grd = g.createRadialGradient(16, 16, 1, 16, 16, 15);
  grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.4, '#c060ff'); grd.addColorStop(1, 'rgba(120,0,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
  return toPixels(c);
}
function stairsTex() {
  // a flight seen head-on: each step is a band across the view, the far steps higher and narrower
  const c = mk(32, 32), g = c.getContext('2d');
  g.fillStyle = '#1a1714'; g.fillRect(6, 6, 20, 26);          // dark stairwell behind the steps
  for (let i = 0; i < 5; i++) {
    const w = 28 - i * 4, x = (32 - w) / 2, y = 29 - i * 5;
    const shade = 150 - i * 14;
    g.fillStyle = `rgb(${shade},${shade - 6},${shade - 16})`;
    g.fillRect(x, y, w, 4);                                   // riser face
    g.fillStyle = `rgb(${shade + 40},${shade + 36},${shade + 24})`;
    g.fillRect(x, y - 1, w, 1);                               // lit tread edge
  }
  g.fillStyle = '#3a3428';
  g.fillRect(1, 6, 1, 24); g.fillRect(30, 6, 1, 24);          // side walls
  return toPixels(c);
}
function fireTex() {
  const c = mk(32, 32), g = c.getContext('2d');
  const grd = g.createRadialGradient(16, 16, 2, 16, 16, 15);
  grd.addColorStop(0, '#fff7a0'); grd.addColorStop(0.5, '#ff8a20'); grd.addColorStop(1, 'rgba(255,60,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
  return toPixels(c);
}
const WALLS = [null,
  makeWall(14, 42, 30, '#2a1812', 16, 8),
  makeWall(215, 6, 42, '#17191d', 32, 16),
  makeWall(98, 20, 26, '#0c160c', 16, 16),
  doorTex()];
// ---- surface themes: photo tiles from assets.js (art/tiles, packed by tools/pack_assets.py) ----
// Each theme names the tiles for wall types 1-3, the door, the floor and the ceiling. Missing tiles keep the drawn ones.
const THEMES = [
  { upTo: 0,  walls: ['stone_blocks', 'stone_arches', 'stone_blocks'], door: 'wood_door', floor: 'flagstone', ceil: 'dark_panel' },   // entrance
  { upTo: 10, walls: ['stone_blocks', 'stone_arches', 'skull_catacomb'], door: 'wood_door', floor: 'flagstone', ceil: 'dark_panel' }, // crypt
  { upTo: 20, walls: ['sewer_brick', 'sewer_corridor', 'cracked_plaster'], door: 'iron_door', floor: 'cobbles', ceil: 'rust' },      // sewers
  { upTo: 30, walls: ['skull_catacomb', 'iron_bars', 'stone_blocks'], door: 'iron_door', floor: 'cobbles', ceil: 'mossy_relief' }, // catacombs
  { upTo: 40, walls: ['castle_stone', 'castle_banner', 'stone_arches'], door: 'wood_door', floor: 'carpet', ceil: 'dark_panel' },   // castle halls
  { upTo: 50, walls: ['foundry_rust', 'lava_iron', 'iron_bars'], door: 'iron_door', floor: 'grate', ceil: 'rust' },                // foundry
  { upTo: 60, walls: ['marble', 'window_day', 'marble'], door: 'wood_door', floor: 'marble_floor', sky: 'day' },                    // sky tower: no roof
  { upTo: 70, walls: ['dusk_marble', 'window_dusk', 'dusk_marble'], door: 'iron_door', floor: 'marble_floor', sky: 'dusk' },        // upper air: stars come out
  { upTo: 80, walls: ['hull', 'porthole', 'hull'], door: 'iron_door', floor: 'deck', sky: 'space' },                                 // the void: open space above
  { upTo: 90, walls: ['alien_wall', 'alien_bones', 'porthole'], door: 'iron_door', floor: 'alien_floor', sky: 'space' },             // alien spire
  { upTo: 999, walls: ['red_rock', 'red_relief', 'red_rock'], door: 'iron_door', floor: 'red_ground', sky: 'alien' }                // the other world
];
const TILEPX = {};                     // name -> Uint32Array(64*64) once decoded
WALLS[LOCKED] = new Uint32Array(4096); WALLS[SECRET] = new Uint32Array(4096); WALLS[DARTS] = new Uint32Array(4096);   // derived from the theme in applyTheme()
const DRAWN = WALLS.map(w => w && w.slice());   // procedural fallbacks
let FLOOR_TEX = null, CEIL_TEX = null, themeLv = 0, SKY_PX = null;
// ---- open-sky panoramas for the high zones (no ceiling). 1536 x 100 strip wrapped round the player, drawn once ----
const SKY_W = 1536, SKY_H = 100, SKIES = {};   // wide enough that stars stay round (66° view = ~280 px of strip)
function skyPano(kind) {
  if (SKIES[kind]) return SKIES[kind];
  const c = mk(SKY_W, SKY_H), g = c.getContext('2d');
  const grad = (stops) => { const l = g.createLinearGradient(0, 0, 0, SKY_H); stops.forEach(([o, col]) => l.addColorStop(o, col)); g.fillStyle = l; g.fillRect(0, 0, SKY_W, SKY_H); };
  let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stars = (n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(255,255,240,${a * (0.4 + r() * 0.6)})`; g.fillRect(r() * SKY_W | 0, r() * SKY_H * 0.9 | 0, 1, 1); } };
  const disc = (x, y, rad, col, ring) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); if (ring) { g.strokeStyle = ring; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, rad * 1.8, rad * 0.45, -0.3, 0, 7); g.stroke(); } };
  if (kind === 'day') {
    grad([[0, '#3d6fc4'], [0.7, '#8fb8ea'], [1, '#d8e6f4']]);
    for (let i = 0; i < 30; i++) { const x = r() * SKY_W, y = 40 + r() * 50, w = 20 + r() * 40; g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(x, y, w, w * 0.28, 0, 0, 7); g.fill(); }
  } else if (kind === 'dusk') {
    grad([[0, '#0c0b2a'], [0.55, '#3b2a6a'], [0.85, '#c0607a'], [1, '#f2a070']]); stars(480, 0.8);
    disc(1140, 30, 7, '#f4f0dc');
  } else if (kind === 'space') {
    grad([[0, '#02020a'], [1, '#0a0a22']]); stars(1500, 1);
    g.fillStyle = 'rgba(120,80,200,0.10)'; for (let x = 0; x < SKY_W; x += 2) g.fillRect(x, 30 + Math.sin(x / 40) * 18, 2, 26);   // milky band
    disc(420, 45, 22, '#4a7fd8'); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(404, 40, 26, 4);   // the Earth, far below now
    disc(1200, 24, 9, '#c9b28a', '#e6d8b0');
  } else {   // alien: red sky, two moons, a ringed giant
    grad([[0, '#2a0610'], [0.6, '#8a2a20'], [1, '#e08850']]); stars(240, 0.5);
    disc(270, 34, 26, '#d8a070', '#f0c890'); disc(900, 22, 8, '#f6e6d0'); disc(990, 40, 5, '#b8d0e8');
  }
  return (SKIES[kind] = toPixels(c));
}
function applyTheme(lv) {
  themeLv = lv;
  const t = THEMES.find(t => lv <= t.upTo) || THEMES[THEMES.length - 1];
  const names = [null, ...t.walls, t.door];
  for (let i = 1; i < names.length; i++) WALLS[i].set(TILEPX[names[i]] || DRAWN[i]);
  for (let i = 0; i < 4096; i++) {                           // locked door: the door, gilded, with a lock plate; secret wall: wall 1 a shade darker
    const d = WALLS[DOOR][i], x = i & 63, y = i >> 6, plate = x > 24 && x < 39 && y > 24 && y < 41, hole = x > 29 && x < 34 && y > 29 && y < 37;
    const r = d & 255, g = d >> 8 & 255, b = d >> 16 & 255;
    WALLS[LOCKED][i] = hole ? 0xff101010 : plate ? 0xff30b0e0 : (0xff000000 | Math.min(255, r * 1.2 + 40) | Math.min(255, g * 1.05 + 18) << 8 | (b * 0.55) << 16) >>> 0;
    const w = WALLS[1][i];
    const slot = y > 26 && y < 38 && (x > 12 && x < 22 || x > 27 && x < 37 || x > 42 && x < 52), rim = y > 24 && y < 40 && x > 10 && x < 54;   // dart wall: three dark slots in an iron band
    WALLS[DARTS][i] = slot ? 0xff080808 : rim ? 0xff5a5450 : w;
    WALLS[SECRET][i] = (0xff000000 | ((w & 255) * 0.85) | ((w >> 8 & 255) * 0.85) << 8 | ((w >> 16 & 255) * 0.85) << 16) >>> 0;
  }
  FLOOR_TEX = TILEPX[t.floor] || null; CEIL_TEX = TILEPX[t.ceil] || null; SKY_PX = t.sky ? skyPano(t.sky) : null;
}
if (window.TILES) for (const k in TILES) {
  const im = new Image();
  im.onload = () => { const c = mk(64, 64); c.getContext('2d').drawImage(im, 0, 0, 64, 64); TILEPX[k] = toPixels(c); applyTheme(themeLv); };
  im.src = TILES[k];
}
const SPR = {
  ghoul: monsterTex('#5f8f3a'), skel: monsterTex('#c9c3b0'),
  imp: demonTex(), rat: ratTex(), flame: flameTex(), angel: angelTex(), boss: monsterTex('#6d2fa0', true),
  potion: potionTex(), crate: crateTex(), ammo: ammoTex(), fire: fireTex(), stairs: stairsTex(), arrow: arrowTex(), magic: magicTex()
};

// Enemy sprites (Freedoom and Blasphemer art, packed into assets.js as window.MONSTERS by tools/pack_assets.py).
// MON_PX[kind] = { frames: [Uint32Array with .w .h .ox .oy], k, walk, atk, pain, die } once every frame has decoded;
// (ox, oy) is the point of the frame that stands on the floor and k is wall heights per sprite pixel.
// The drawn 32x32 SPR sprites stay as the fallback when assets.js is missing.
const MON_PX = {};
if (window.MONSTERS) for (const k in MONSTERS) {
  const M = MONSTERS[k], frames = []; let left = M.frames.length;
  M.frames.forEach(([src, ox, oy], i) => {
    const im = new Image();
    im.onload = () => {
      const c = mk(im.width, im.height); c.getContext('2d').drawImage(im, 0, 0);
      const px = toPixels(c); px.w = im.width; px.h = im.height; px.ox = ox; px.oy = oy; frames[i] = px;
      if (--left === 0) MON_PX[k] = { frames, k: M.k, walk: M.walk, atk: M.atk, pain: M.pain, die: M.die };
    };
    im.src = src;
  });
}
// Small sprite sets: enemy projectiles (window.SHOTS, centred at eye height) and pickups (window.ITEMS, on the floor).
const SHOT_PX = {}, ITEM_PX = {};
function loadSet(SET, DST, onFloor) {
  if (SET) for (const k in SET) {
    const S = SET[k], frames = []; let left = S.frames.length;
    S.frames.forEach((src, i) => {
      const im = new Image();
      im.onload = () => {
        const c = mk(im.width, im.height); c.getContext('2d').drawImage(im, 0, 0);
        const px = toPixels(c); px.w = im.width; px.h = im.height; px.ox = im.width / 2;
        px.oy = S.hang ? 1 / S.k : onFloor ? im.height : im.height / 2 + 0.5 / S.k; frames[i] = px;   // hung from the ceiling, stood on the floor, or at eye height
        if (--left === 0) DST[k] = { frames, k: S.k };
      };
      im.src = src;
    });
  }
}
const PROP_PX = {};
loadSet(window.SHOTS, SHOT_PX, false); loadSet(window.ITEMS, ITEM_PX, true); loadSet(window.PROPS, PROP_PX, true);
const ATK_T = 0.4, DIE_FPS = 9, WALK_FPS = 6;   // attack animation length (s), death and walk frame rates

// Spike traps: an iron plate set in a corridor floor. The spikes are out for TRAP_UP seconds of every TRAP_CYCLE
// (each trap has its own offset); standing on one while they are out hurts.
const TRAP_CYCLE = 3.2, TRAP_UP = 1.2, TRAP_DMG = 8;
const trapUp = tr => ((performance.now() / 1000 + tr.ph) % TRAP_CYCLE) < TRAP_UP;
function trapTex(up) {
  const c = mk(64, 64), g = c.getContext('2d');
  g.fillStyle = '#2b2a2e'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#4a474c'; g.fillRect(3, 3, 58, 58);
  g.fillStyle = '#18171a'; g.fillRect(0, 0, 64, 2); g.fillRect(0, 62, 64, 2); g.fillRect(0, 0, 2, 64); g.fillRect(62, 0, 2, 64);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const cx = 10 + x * 15, cy = 10 + y * 15;
    g.fillStyle = '#0c0b0d'; g.beginPath(); g.arc(cx, cy, 4, 0, 7); g.fill();
    if (up) { g.fillStyle = '#d9dde4'; g.beginPath(); g.moveTo(cx - 4, cy + 3); g.lineTo(cx, cy - 7); g.lineTo(cx + 4, cy + 3); g.fill();
      g.fillStyle = '#8a1c14'; g.fillRect(cx - 1, cy - 6, 2, 3); }
  }
  return toPixels(c);
}
const TRAP_TEX = [trapTex(false), trapTex(true)];

