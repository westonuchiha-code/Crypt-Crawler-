// ---------- menus, records, pause, death and victory, saves and checkpoints, changing floor ----------
function showMsg(t) {
  msgEl.textContent = t; msgEl.style.opacity = 1; msgT = 2.4;
  msgEl.style.top = ($('hud').getBoundingClientRect().bottom + 6) + 'px';   // always below the HUD, even when it wraps on narrow screens
}
function bossAlive() { return monsters.some(m => m.boss && !m.dead); }

// ---- arcade menu state: best run kept in localStorage (per browser) ----
function loadBest() { try { return JSON.parse(localStorage.getItem('cc_best')) || { floor: 0, kills: 0 }; } catch (e) { return { floor: 0, kills: 0 }; } }
function saveBest() {
  const b = loadBest(), isNew = level > b.floor || (level === b.floor && kills > b.kills);
  if (isNew) try { localStorage.setItem('cc_best', JSON.stringify({ floor: level, kills })); } catch (e) {}
  return isNew;
}
function showMenu(title, text, go, dead) {
  running = false; $('bossbar').style.display = 'none';
  if (document.pointerLockElement) { lockDropT = performance.now(); document.exitPointerLock(); }   // give the mouse back so the menu can be clicked
  if (title !== 'PAUSED' && !/CLEARED$/.test(title)) setAmbience(0);
  if (title === 'CRYPT CRAWLER') setMusic('title'); else if (title === 'SPIRE CONQUERED') setMusic('win');
  $('title').textContent = title; $('title').classList.toggle('dead', !!dead);
  $('tag').style.display = title === 'CRYPT CRAWLER' ? '' : 'none';
  introEl.textContent = text; $('go').textContent = go;
  const b = loadBest();
  $('hiscore').innerHTML = b.floor ? `TOP CLIMB &nbsp;<b>FLOOR ${b.floor}</b> &nbsp;·&nbsp; <b>${b.kills}</b> SLAIN` : 'TOP CLIMB &nbsp;<b>---</b>';
  const cp = (!dead && loadResume()) || loadCheckpoint(), canCont = cp && cp.floor > 1 && title !== 'SPIRE CONQUERED';
  if (canCont && !dead && title === 'CRYPT CRAWLER') $('go').textContent = `PRESS START · FLOOR ${cp.floor}`;
  $('newclimb').style.display = canCont ? '' : 'none'; $('quit').style.display = 'none'; paused = false; summary = false;
  overlay.style.display = 'flex'; menuShownAt = performance.now();
}
let menuShownAt = performance.now(), paused = false, summary = false, lockDropT = -1e9;   // lockDropT: when the game itself last let go of the mouse
// ---- zone results: shown when you take the stairs after a boss; PRESS START carries on to the next zone ----
let zoneStat = { t: 0, kills0: 0, hurt: 0, secrets: 0, secretsAll: 0 }, runT = 0;
// lifetime records, localStorage 'cc_stats': counters plus the best time for each zone and for a whole climb
// Achievements: kept with the lifetime records (cc_stats.ach = { id: when }); a line on screen when one unlocks.
const ACH = {
  boss1: ['Gravebreaker', 'Defeat the Warden'], boss5: ['Halfway up', 'Defeat the Forgeheart'], win: ['Spire conquered', 'Reach the other world'],
  hard: ['Glutton for punishment', 'Finish the climb on hard'], flawless: ['Untouchable', 'Clear a whole zone without dying'],
  sprint: ['Sprinter', 'Clear a zone in under eight minutes'], secrets: ['Nosy', 'Find every secret on a floor that hides two'],
  fists: ['Bare knuckles', 'Land the killing blow on a boss with your fists'], pod: ['Chain reaction', 'Kill three enemies with one pod'],
  armed: ['Fully armed', 'Carry all nine guns at once'], slayer: ['Slayer', 'Slay a thousand enemies in total']
};
let zoneDeaths = 0;                                            // deaths since this zone began (not reset by a retry)
function unlock(id) {
  const s = loadStats(); s.ach = s.ach || {};
  if (s.ach[id] || !ACH[id]) return;
  s.ach[id] = Date.now();
  try { localStorage.setItem('cc_stats', JSON.stringify(s)); } catch (e) {}
  sfx('power'); showMsg(`Achievement · ${ACH[id][0]}`);
}
function loadStats() { try { return Object.assign({ deaths: 0, kills: 0, secrets: 0, wins: 0, zoneBest: [], runBest: 0 }, JSON.parse(localStorage.getItem('cc_stats')) || {}); } catch (e) { return { deaths: 0, kills: 0, secrets: 0, wins: 0, zoneBest: [], runBest: 0 }; } }
function bumpStats(add, zone, zoneTime, runTime) {
  const s = loadStats();
  for (const k in add) s[k] = (s[k] || 0) + add[k];
  if (zone !== undefined && (!s.zoneBest[zone] || zoneTime < s.zoneBest[zone])) s.zoneBest[zone] = Math.round(zoneTime);
  if (runTime && (!s.runBest || runTime < s.runBest)) s.runBest = Math.round(runTime);
  try { localStorage.setItem('cc_stats', JSON.stringify(s)); } catch (e) {}
  if (s.kills >= 1000) unlock('slayer');
}
function showRecords(on) {
  const s = loadStats(), b = loadBest(), row = (a, v) => `<tr><td>${a}</td><td>${v}</td></tr>`;
  $('rectable').innerHTML = row('Highest floor', b.floor || '-') + row('Climbs completed', s.wins) + row('Fastest climb', s.runBest ? clock(s.runBest) : '-')
    + row('Enemies slain', s.kills) + row('Secrets found', s.secrets) + row('Deaths', s.deaths)
    + ZONES.map((z, i) => row(`Best time · ${z.name}`, s.zoneBest[i] ? clock(s.zoneBest[i]) : '-')).join('')
    + `<tr><td colspan="2" style="padding-top:14px;color:#ff8a3a;letter-spacing:3px">ACHIEVEMENTS ${Object.keys(s.ach || {}).length} OF ${Object.keys(ACH).length}</td></tr>`
    + Object.keys(ACH).map(id => row(`${ACH[id][0]} · <span style="color:#8a8078">${ACH[id][1]}</span>`, (s.ach || {})[id] ? '✓' : '')).join('');
  $('recpanel').classList.toggle('on', on); menuShownAt = performance.now();
}
const clock = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
function showSummary() {
  const z = ZONES[zoneOf(level)];
  bumpStats({ kills: kills - zoneStat.kills0, secrets: zoneStat.secrets }, zoneOf(level), zoneStat.t);
  if (zoneDeaths === 0) unlock('flawless');
  if (zoneStat.t < 480) unlock('sprint');
  showMenu(`${z.name.replace(/^THE /, '')} CLEARED`,
    `${z.boss} is dead · time ${clock(zoneStat.t)} · ${kills - zoneStat.kills0} slain · secrets ${zoneStat.secrets} of ${zoneStat.secretsAll} · damage taken ${Math.round(zoneStat.hurt)}`,
    `PRESS START · ${ZONES[zoneOf(level + 1)].name}`);
  $('newclimb').style.display = 'none'; summary = true;
}
// ---- pause: Esc or P in play (or losing the mouse lock, or switching away from the tab) ----
function pauseGame() {
  if (!running) return;
  running = false; paused = true; $('bossbar').style.display = 'none';
  $('title').textContent = 'PAUSED'; $('title').classList.remove('dead'); $('tag').style.display = 'none';
  introEl.textContent = level > 0 ? `Floor ${level} · ${ZONES[zoneOf(level)].name}` : 'The entrance';
  $('go').textContent = 'RESUME'; $('newclimb').style.display = 'none'; $('quit').style.display = '';
  overlay.style.display = 'flex'; menuShownAt = performance.now();
  for (const k in keys) keys[k] = false;
  if (document.pointerLockElement) document.exitPointerLock();
}
function resumeGame() {
  paused = false; running = true; overlay.style.display = 'none'; $('quit').style.display = 'none';
  try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
}
function die() {
  sfx('death'); clearResume(); bumpStats({ deaths: 1 }); zoneDeaths++;
  const rec = saveBest(), cp = loadCheckpoint();
  const zn = ZONES[zoneOf(Math.max(1, level))].name, inZone = level > 0 ? ((level - 1) % 10) + 1 : 0;
  showMenu('GAME OVER', `${rec ? 'NEW RECORD! ' : ''}Killed by ${P.killer || 'the Spire'} on floor ${level} · ${zn}, floor ${inZone} of 10 · ${kills} slain · ${clock(runT)} into the climb`,
    cp ? `CONTINUE FROM FLOOR ${cp.floor}? PRESS START` : 'CONTINUE? PRESS START', true);
}
function victory() {
  unlock('win'); if (opts.diff === 'hard') unlock('hard'); if (zoneDeaths === 0) unlock('flawless');
  saveBest(); clearCheckpoint(); bumpStats({ wins: 1, kills: kills - zoneStat.kills0, secrets: zoneStat.secrets + secrets.found }, zoneOf(level), zoneStat.t, runT);
  if (typeof THREE !== 'undefined') { try { startEnding(); return; } catch (e) { endActive = false; } }   // no Three.js / WebGL: straight to the menu
  victoryMenu();
}
function victoryMenu() {
  showMenu('SPIRE CONQUERED', `The Spire Titan is dead · all ${FINAL} floors · ${kills} slain · time ${clock(runT)}`, 'PRESS START TO CLIMB AGAIN');
}
// ---- checkpoints: entering a zone saves floor + loadout (localStorage 'cc_save'); CONTINUE restarts there ----
// A second save, 'cc_resume', is written on every floor so closing the game loses nothing; it restores the floor exactly
// (health, armour, timers). Dying deletes it, which is what sends you back to the zone checkpoint.
function saveResume() {
  try { localStorage.setItem('cc_resume', JSON.stringify({ floor: level, kills, owned: P.owned, ammo: P.ammo, weapon: P.weapon, armor: P.armor, hp: P.hp, runT, zoneStat })); } catch (e) {}
}
function loadResume() { try { return JSON.parse(localStorage.getItem('cc_resume')); } catch (e) { return null; } }
function clearResume() { try { localStorage.removeItem('cc_resume'); } catch (e) {} }
function saveCheckpoint() {
  try { localStorage.setItem('cc_save', JSON.stringify({ floor: level, kills, owned: P.owned, ammo: P.ammo, weapon: P.weapon, armor: P.armor })); } catch (e) {}
}
function loadCheckpoint() { try { return JSON.parse(localStorage.getItem('cc_save')); } catch (e) { return null; } }
function clearCheckpoint() { try { localStorage.removeItem('cc_save'); } catch (e) {} clearResume(); }
function nextLevel(afterSummary) {
  zoneStat.secrets += secrets.found; zoneStat.secretsAll += secrets.total; secrets = { total: 0, found: 0 };
  if (level > 0 && level % 10 === 0 && level < FINAL && !afterSummary) { showSummary(); return; }
  if (level % 10 === 0) { zoneStat = { t: 0, kills0: kills, hurt: 0, secrets: 0, secretsAll: 0 }; zoneDeaths = 0; }
  level++; setMusic(MUSIC_FOR(level)); setAmbience(level);
  sfx(level === 1 ? 'door' : 'stairs');
  P.maxHp = zoneMaxHp(level);
  P.hp = Math.min(P.maxHp, P.hp + Math.round(P.maxHp / 4));        // a breather on every staircase
  generate(level);
  const z = ZONES[zoneOf(level)];
  if (level === zoneStart(level)) {
    P.hp = P.maxHp; saveCheckpoint(); if (level > 1) sfx('power');
    showMsg(level === 1 ? `You step into the Spire · ${z.name}` : `${z.name} · checkpoint · max health ${P.maxHp} · weapons +${zoneOf(level) * 10}%`);
  } else if (level % 10 === 0) {
    saveCheckpoint();                                          // a second checkpoint at the boss's door, so losing to it does not cost the zone
    showMsg(`Floor ${level} · ${z.boss} awaits · checkpoint`);
  } else showMsg(`Floor ${level}`);
  saveResume();
}
function continueGame(cp, exact) {                           // exact: a resume save, restored as it was (no refill)
  kills = cp.kills || 0; zoneStat = { t: 0, kills0: kills, hurt: 0, secrets: 0, secretsAll: 0 };
  P = newPlayer(); Object.assign(P.owned, cp.owned); Object.assign(P.ammo, cp.ammo);
  for (const w in P.owned) if (!WEAPONS[w]) delete P.owned[w];          // a save from before the weapon change
  P.weapon = WEAPONS[cp.weapon] && P.owned[cp.weapon] ? cp.weapon : (WEAPON_ORDER.find(w => P.owned[w]) || 'fist'); P.armor = cp.armor || 0;
  level = cp.floor; P.maxHp = P.hp = zoneMaxHp(level); generate(level); setMusic(MUSIC_FOR(level)); setAmbience(level);
  // a retry never starts empty-handed: every gun unlocked by now is in your hands with at least a cache and a half of ammo,
  // so running dry before a checkpoint cannot turn into dying there over and over
  if (exact) { P.hp = Math.min(P.maxHp, cp.hp || P.maxHp); runT = cp.runT || 0; if (cp.zoneStat) zoneStat = cp.zoneStat; }
  else for (const w in WEAPON_FLOOR) if (level >= WEAPON_FLOOR[w]) { P.owned[w] = true; P.ammo[w] = Math.max(P.ammo[w], Math.round(CRATE_AMMO[w] * floorAmmo * 1.5)); }
  if (P.weapon === 'fist') P.weapon = WEAPON_ORDER.find(w => P.owned[w]) || 'fist';
  running = true; overlay.style.display = 'none';
  try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
  showMsg(`${ZONES[zoneOf(level)].name} · floor ${level}`);
}

