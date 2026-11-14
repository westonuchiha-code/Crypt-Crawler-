(() => {
const RW = 320, RH = 200;                     // internal low-res buffer, scaled up to the window
let FOV_PLANE = 0.66;                         // tan(half the horizontal field of view); set from the settings (opts.fov, degrees)
const STAIRS = 9, DOOR = 4, LOCKED = 5, SECRET = 6, DARTS = 7, FINAL = 100;   // map tiles: 0 floor, 1-3 walls, 4 door, 5 locked door, 6 secret wall, 7 dart wall
// ---- the climb: 100 floors in 10 zones of 10; each zone ends with its boss on floor 10, 20 ... 100 ----
// theme = index into THEMES (surface tiles); zones 4-10 reuse tile mixes until they get their own art (plan step 3).
const ZONES = [
  { name: 'THE CRYPT',          boss: 'THE WARDEN',          theme: 1 },
  { name: 'THE SEWERS',         boss: 'THE SEWER KING',      theme: 2 },
  { name: 'THE CATACOMBS',      boss: 'THE HOLLOW QUEEN',    theme: 3 },
  { name: 'THE CASTLE HALLS',   boss: 'THE IRON CASTELLAN',  theme: 4 },
  { name: 'THE FOUNDRY',        boss: 'THE FORGEHEART',      theme: 5 },
  { name: 'THE SKY TOWER',      boss: 'THE STORM HERALD',    theme: 6 },
  { name: 'THE UPPER AIR',      boss: 'THE SKYWYRM',         theme: 7 },
  { name: 'THE VOID',           boss: 'THE VOID ARCHON',     theme: 8 },
  { name: 'THE ALIEN SPIRE',    boss: 'THE STAR-EATER',      theme: 9 },
  { name: 'THE OTHER WORLD',    boss: 'THE SPIRE TITAN',     theme: 10 }
];
const zoneOf = lv => Math.min(ZONES.length - 1, Math.max(0, Math.ceil(lv / 10) - 1));
const zoneStart = lv => zoneOf(lv) * 10 + 1;
const BOSS_NAMES = {}, BOSS_HP = {};
ZONES.forEach((z, i) => { BOSS_NAMES[(i + 1) * 10] = z.boss; BOSS_HP[(i + 1) * 10] = 600 + 300 * i; });   // 600 ... 3300
// difficulty grows per zone (not per floor, which would explode by floor 100), plus a little within each zone
// Difficulty (settings, `opts.diff`): scales enemy damage and health and how much ammo a floor holds. It takes effect
// from the next floor generated. Normal is the tuning the test bot was balanced on.
const DIFFS = { easy: { dmg: 0.7, hp: 0.85, ammo: 1.2 }, normal: { dmg: 1, hp: 1, ammo: 1 }, hard: { dmg: 1.3, hp: 1.15, ammo: 0.9 } };
const DF = () => DIFFS[opts.diff] || DIFFS.normal;
const bossDmgK = () => opts.diff === 'hard' ? 1.18 : DF().dmg;   // on hard, bosses hit 18% harder (not 30%) and keep normal health: they were the wall
const hpMul = lv => (1 + 0.12 * zoneOf(lv) + 0.01 * ((lv - 1) % 10)) * DF().hp;
// ---- balance: what the climb gives back (tools/balance.py prints the whole table, zone by zone) ----
// The player toughens a little each zone, potions keep pace, and each floor's ammo is sized to the enemies on it:
// about AMMO_RATIO times their total health in ammo damage, generous in the crypt and tighter near the top.
const zoneMaxHp = lv => 100 + 10 * zoneOf(lv);                      // 100 in the crypt ... 190 in the other world
const potionHeal = lv => 35 + 4 * zoneOf(lv);
const potionCount = lv => 2 + (zoneOf(lv) >= 3) + (zoneOf(lv) >= 7);
const AMMO_RATIO = lv => (1.9 - 0.04 * zoneOf(lv)) * DF().ammo;                 // 1.9 ... 1.55
const AMMO_DMG = { ewand: 12, dshot: 37, phoenix: 33, claw: 27, hstaff: 12, mace: 9, plasma: 10, rocket: 80, bfg: 270 };   // damage one unit of ammo really deals, as measured by the test bot (misses and all); sizes each floor's ammo
const wpnMul = lv => 1 + 0.1 * zoneOf(lv);                          // your weapons hit 10% harder for every zone climbed
const ARMOUR_MAX = 100, ARMOUR_PICKUP = 50, ARMOUR_SOAK = 0.5;      // armour takes half of each hit until it is gone
const FURY_TIME = 20, WARD_TIME = 8;                                // double damage / cannot be hurt, in seconds
let floorAmmo = 1;                                                  // this floor's ammo multiplier, set in generate()
const dmgMul = lv => (1 + 0.10 * zoneOf(lv)) * DF().dmg;
// Damage is [min, max] per hit, before the zone bonus (wpnMul). knock = shove back (cells), stun = seconds the enemy
// cannot move or attack; bosses take 20% knock and 30% stun. One job each:
//  fist      always there: weak, but shoves and staggers so you can make space
//  ewand     the starter: steady, accurate single shots
//  dshot     7 pellets; brutal within 2.5 cells, fading to 25% by 8; big knockback; slow reload
//  phoenix   fireball: direct hit plus splash on everything within 1.6 cells
//  claw      chain lightning: weaker hits that jump to 3 enemies and stun them
//  hstaff    rapid beam that passes through every enemy in the line
//  mace      sprays spheres that bounce off walls: fills corridors, wasteful in the open
//  plasma    very fast stream of bolts: the best sustained damage on one target
//  rocket    slow, huge blast
//  bfg       one core clears the room: hits everything you can see within 9 cells
const WEAPONS = {
  fist:    { name: 'FIST',            type: 'melee',    cool: 0.55, dmg: [8, 12],  range: 1.5, arc: 0.7, knock: 1.6, stun: 0.45, ammo: false, animDur: 0.5 },
  ewand:   { name: 'ELVEN WAND',      type: 'hitscan',  cool: 0.34, dmg: [10, 14], pellets: 1, spread: 0.01, stun: 0.08, ammo: true, animDur: 0.3 },
  dshot:   { name: 'DOUBLE SHOTGUN',  type: 'hitscan',  cool: 0.95, dmg: [7, 11],  pellets: 7, spread: 0.12, near: 2.5, far: 8, knock: 0.45, stun: 0.12, ammo: true, animDur: 0.9 },
  phoenix: { name: 'PHOENIX ROD',     type: 'fireball', cool: 0.75, dmg: [30, 40], speed: 8, blast: 1.9, blastDmg: [16, 22], knock: 1.0, ammo: true, animDur: 0.6, spr: 'fire' },
  claw:    { name: 'DRAGON CLAW',     type: 'chain',    cool: 0.5,  dmg: [16, 22], range: 6, arc: 0.35, chain: 3.2, jumps: 3, falloff: 0.75, stun: 0.4, ammo: true, animDur: 0.6 },
  hstaff:  { name: 'HELLSTAFF',       type: 'pierce',   cool: 0.17, dmg: [11, 14], range: 12, stun: 0.05, ammo: true, animDur: 0.2 },
  mace:    { name: 'FIREMACE',        type: 'fireball', cool: 0.16, dmg: [12, 16], speed: 7, spread: 0.1, bounce: 3, life: 2.4, ammo: true, animDur: 0.3, spr: 'spit' },
  plasma:  { name: 'PLASMA RIFLE',    type: 'fireball', cool: 0.12, dmg: [13, 17], speed: 14, ammo: true, animDur: 0.14, spr: 'bolt' },
  rocket:  { name: 'ROCKET LAUNCHER', type: 'fireball', cool: 0.9,  dmg: [65, 85], speed: 9, blast: 2.5, blastDmg: [40, 55], knock: 1.6, ammo: true, animDur: 0.6, spr: 'rocket', boom: 'bigboom' },
  bfg:     { name: 'THE BIG ONE',     type: 'nova',     cool: 1.6,  dmg: [150, 210], range: 9, knock: 1.5, ammo: true, animDur: 1.1 }
};
// Loot. A weapon cache holds one gun (deeper floors unlock more) plus its starting ammo; an ammo chest stocks every gun
// unlocked so far. When a gun runs dry it leaves your weapon cycle until you find another cache.
const WEAPON_FLOOR = { ewand: 1, dshot: 3, phoenix: 6, claw: 9, hstaff: 16, mace: 26, plasma: 46, rocket: 66, bfg: 86 };   // first floor each gun can appear on
const CRATE_AMMO = { ewand: 24, dshot: 8, phoenix: 8, claw: 10, hstaff: 40, mace: 50, plasma: 60, rocket: 6, bfg: 2 };
const BOX_AMMO =   { ewand: 12, dshot: 4, phoenix: 3, claw: 3,  hstaff: 14, mace: 16, plasma: 20, rocket: 2, bfg: 1 };
const AMMO_NAME = { ewand: 'crystals', dshot: 'shells', phoenix: 'flame orbs', claw: 'charges', hstaff: 'runes', mace: 'spheres', plasma: 'cells', rocket: 'rockets', bfg: 'cores' };
const roll = d => Array.isArray(d) ? Math.round(rnd(d[0], d[1])) : d;
const WEAPON_ORDER = ['ewand', 'dshot', 'phoenix', 'claw', 'hstaff', 'mace', 'plasma', 'rocket', 'bfg', 'fist'];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const buf = document.createElement('canvas');
buf.width = RW; buf.height = RH;
const bctx = buf.getContext('2d');
const img = bctx.createImageData(RW, RH);
const pix = new Uint32Array(img.data.buffer);
const zBuf = new Float32Array(RW);

const $ = id => document.getElementById(id);
const overlay = $('overlay'), msgEl = $('msg'), hpfill = $('hpfill'), stats = $('stats'), introEl = $('intro');
const introCanvas = $('intro3d'), capEl = $('caption'), flashEl = $('flash');

const rnd = (a, b) => a + Math.random() * (b - a);
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function toPixels(c) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const out = new Uint32Array(c.width * c.height);
  for (let i = 0, j = 0; i < out.length; i++, j += 4)
    out[i] = (d[j] | (d[j + 1] << 8) | (d[j + 2] << 16) | (d[j + 3] << 24)) >>> 0;
  return out;
}

