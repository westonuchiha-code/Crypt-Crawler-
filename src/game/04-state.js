// ---------- state ----------
const keys = {};
const touchState = { joyX: 0, joyY: 0 };   // filled from RQPad.state.move in rqpad.js
let W = 0, H = 0, map, explored, P, monsters = [], items = [], shots = [], pshots = [], bolts = [], stairsPos = null;
let darts = [];                                               // dart walls: { x, y, dx, dy, t } firing down a corridor
let traps = [], trapAt = null, trapHurtT = 0;                // spike traps: list, lookup by cell (index + 1), hurt throttle
let props = [], secrets = { total: 0, found: 0 }, lockMsgT = 0;   // scenery, this floor's secret rooms, 'locked' message throttle
let level = 0, kills = 0, running = false, msgT = 0, mapOn = true;
let pendingWin = 0, sealMsgT = 0, introActive = false, introSeen = false, endActive = false;
const newPlayer = () => ({
  x: 3.5, y: 4.5, a: -Math.PI / 2, hp: 100, maxHp: 100, fire: 0, flash: 0, hurt: 0, anim: 0, swingT: 9, hitFlash: 0,
  weapon: 'fist', owned: { fist: true },                      // you start with bare fists; guns come from weapon crates
  ammo: Object.fromEntries(Object.keys(WEAPON_FLOOR).map(w => [w, 0])), armor: 0, fury: 0, ward: 0, nova: 0
});

