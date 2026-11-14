// ---------- flow & input ----------
// ---- controllers (the browser Gamepad API, standard layout): left stick moves, right stick turns, RT or A fires,
// RB / LB next / previous weapon, Y map, Start pauses or confirms a menu, B backs out of a panel. Polled every frame. ----
// ---- menu navigation: every menu and panel works from the keyboard and from a controller, no pointer needed ----
// One item is selected (class .sel). Up / down move, left / right change a slider or a toggle, confirm presses it,
// back closes a panel or resumes from pause. Credits and records scroll with up / down.
let menuI = 0, menuBackI = 0;
const menuCtx = () => ['optpanel', 'keypanel', 'recpanel', 'credits'].find(id => $(id).classList.contains('on')) || 'menu';
function menuItems() {
  const c = menuCtx();
  if (c === 'optpanel') return ['optvol', 'optmus', 'optdiff', 'optfov', 'optpal', 'optsens', 'optfull', 'optclose'].map($);
  if (c === 'keypanel') return [...$('keytable').querySelectorAll('button'), $('keyreset'), $('keyclose')];
  if (c === 'recpanel') return [$('recclose')];
  if (c === 'credits') return [$('creditsclose')];
  return [...$('menu').querySelectorAll('button')].filter(el => el.style.display !== 'none');
}
function menuPaint() {
  document.querySelectorAll('.sel').forEach(el => el.classList.remove('sel'));
  if (overlay.style.display === 'none') return;
  const it = menuItems(); menuI = Math.max(0, Math.min(it.length - 1, menuI));
  if (it[menuI]) { it[menuI].classList.add('sel'); if (menuCtx() !== 'credits' && menuCtx() !== 'recpanel') it[menuI].scrollIntoView({ block: 'nearest' }); }
}
function menuNav(d) {
  const c = menuCtx();
  if (c === 'credits' || c === 'recpanel') { $(c).scrollTop += d * 48; return; }
  const n = menuItems().length; menuI = (menuI + d + n) % n; sfx('switch', 0.3); menuPaint();
}
function menuAdjust(d) {
  const el = menuItems()[menuI]; if (!el) return;
  if (el.type === 'range') { el.value = +el.value + d * (+el.step || 1) * (el.id === 'optfov' ? 3 : 1); el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); }
  else if (el.id === 'optdiff' || el.id === 'optpal' || el.id === 'optfull') el.click();
}
function menuActivate() {
  const el = menuItems()[menuI]; if (!el || el.type === 'range') return;
  if (el.id === 'go' && performance.now() - menuShownAt < (paused ? 250 : 900)) return;   // so a held fire button does not skip a menu
  el.click(); menuPaint();
}
function menuBack() {
  const c = menuCtx();
  if (c === 'optpanel') showOpts(false);
  else if (c === 'keypanel') { if (keyWait) { keyWait = null; drawKeys(); } else showKeys(false); }
  else if (c === 'recpanel') showRecords(false);
  else if (c === 'credits') showCredits(false);
  else if (paused && performance.now() - menuShownAt > 250) resumeGame();
  menuPaint();
}
const gp = { mx: 0, my: 0, look: 0, fire: false, was: {}, seen: false, navT: 0 };
function pollGamepad() {
  let pad = null;
  try { for (const g of (navigator.getGamepads ? navigator.getGamepads() : [])) if (g && g.connected) { pad = g; break; } } catch (e) {}
  if (!pad) { gp.mx = gp.my = gp.look = 0; gp.fire = false; return; }
  if (!gp.seen) { gp.seen = true; drawHelp(); }
  const ax = i => Math.abs(pad.axes[i] || 0) > 0.15 ? pad.axes[i] : 0, dn = i => !!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5));
  gp.mx = ax(0); gp.my = ax(1); gp.look = ax(2); gp.fire = dn(7) || dn(0);
  const hit = i => { const d = dn(i), h = d && !gp.was[i]; gp.was[i] = d; return h; };
  const start = hit(9), a = hit(0), b = hit(1), rb = hit(5), lb = hit(4), y = hit(3);
  if (start || a || b || rb) { audioInit(); musicUnlock(); }
  if (introActive) { if ((start || a) && canSkipIntro()) endIntro(); return; }
  if (endActive) { if ((start || a) && canSkipEnding()) finishEnding(); return; }
  if (running) {
    if (start) pauseGame();
    if (rb) cycleWeapon(1);
    if (lb) cycleWeapon(-1);
    if (y) cycleMap();
  } else if (overlay.style.display !== 'none') {             // a menu or a panel: d-pad or left stick, A, B, Start
    const up = dn(12) || gp.my < -0.5, down = dn(13) || gp.my > 0.5, left = dn(14) || gp.mx < -0.5, right = dn(15) || gp.mx > 0.5;
    const dir = up ? 'u' : down ? 'd' : left ? 'l' : right ? 'r' : '';
    const now = performance.now(), scrolling = menuCtx() === 'credits' || menuCtx() === 'recpanel';
    if (dir && (dir !== gp.navDir || now > gp.navT)) {       // first press at once, then repeat while held
      gp.navT = now + (scrolling ? 60 : dir === gp.navDir ? 130 : 320); gp.navDir = dir;
      if (dir === 'u') menuNav(-1); else if (dir === 'd') menuNav(1); else menuAdjust(dir === 'l' ? -1 : 1);
    }
    if (!dir) gp.navDir = '';
    if (keyWait) { if (b) menuBack(); return; }
    if (a) menuActivate();
    if (b) menuBack();
    if (start) { if (menuCtx() !== 'menu') menuBack(); else if (performance.now() - menuShownAt > (paused ? 250 : 900)) $('go').click(); }
  }
}
function resetGame() {
  level = 0; kills = 0; runT = 0; zoneStat = { t: 0, kills0: 0, hurt: 0, secrets: 0, secretsAll: 0 };
  P = newPlayer();
  generateEntrance();
  running = true;
  overlay.style.display = 'none';
  showMsg('Step through the door.');
  try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
}

const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
const WEAPON_KEYS = { Digit0: 'fist' }; WEAPON_ORDER.slice(0, 9).forEach((w, i) => { WEAPON_KEYS['Digit' + (i + 1)] = w; });   // 1-9 guns, 0 fists
addEventListener('keydown', e => {
  if (introActive) { if (['Space', 'Enter', 'Escape'].includes(e.code) && canSkipIntro()) endIntro(); return; }
  if (endActive) { if (['Space', 'Enter', 'Escape'].includes(e.code) && !e.repeat && canSkipEnding()) finishEnding(); return; }
  if (!running && overlay.style.display !== 'none') {         // a menu or a panel is up: the keyboard drives it
    e.preventDefault();
    if (keyWait) {                                            // controls panel, waiting for the key to bind
      if (e.code !== 'Escape' && !/^Digit/.test(e.code)) {
        const other = Object.keys(K).find(a => K[a] === e.code && a !== keyWait);
        if (other) K[other] = K[keyWait];
        K[keyWait] = e.code; opts.keys = Object.assign({}, K); saveOpts();
      }
      keyWait = null; drawKeys(); return;
    }
    const c = e.code;
    if (c === 'ArrowUp' || c === K.fwd) menuNav(-1);
    else if (c === 'ArrowDown' || c === K.back) menuNav(1);
    else if (c === 'ArrowLeft' || c === K.left || c === K.tl) menuAdjust(-1);
    else if (c === 'ArrowRight' || c === K.right || c === K.tr) menuAdjust(1);
    else if (e.repeat) return;
    else if (c === 'Enter' || c === 'Space' || c === K.fire) menuActivate();
    else if (c === 'Escape' || c === 'Backspace') menuBack();
    else if (c === K.full) toggleFullscreen();
    return;
  }
  if (PREVENT.has(e.code)) e.preventDefault();
  if (running && (e.code === 'Escape' || e.code === K.pause) && !e.repeat) { pauseGame(); return; }
  keys[e.code] = true;
  if (e.code === K.full && !e.repeat) toggleFullscreen();
  if (e.code === K.map && !e.repeat) cycleMap();
  if (e.code === K.next && !e.repeat && running) cycleWeapon();
  if (WEAPON_KEYS[e.code] && running && P.owned[WEAPON_KEYS[e.code]]) { P.weapon = WEAPON_KEYS[e.code]; showMsg(WEAPONS[P.weapon].name); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
// tap to skip the intro; ignore the press that started it and presses on the pad (its ✕ skips via the Space key)
let introStartedAt = 0;
const canSkipIntro = () => introActive && performance.now() - introStartedAt > 700;
addEventListener('pointerdown', e => { if (canSkipEnding() && !(e.target.closest && e.target.closest('.rqp-root'))) finishEnding(); });
addEventListener('pointerdown', e => { if (canSkipIntro() && !(e.target.closest && e.target.closest('.rqp-root'))) endIntro(); });
addEventListener('mousemove', e => {
  if (running && document.pointerLockElement === canvas) P.a += e.movementX * 0.0022 * opts.sens;
});
canvas.addEventListener('pointerdown', e => { if (running && e.pointerType === 'mouse') fire(); });
addEventListener('wheel', e => { if (running) cycleWeapon(e.deltaY < 0 ? -1 : 1); }, { passive: true });   // mouse wheel: next weapon
addEventListener('resize', resize);
addEventListener('rqpad:layout', resize);
showMenu('CRYPT CRAWLER', 'One hundred floors. Ten guardians. One way up.', 'START');
$('go').addEventListener('click', () => {
  audioInit(); sfx('switch');
  if (paused) { resumeGame(); return; }
  if (summary) {
    summary = false; running = true; overlay.style.display = 'none'; nextLevel(true);
    try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
    return;
  }
  const rs = loadResume(), cp = loadCheckpoint();
  if (rs && rs.floor > 1) { continueGame(rs, true); return; }   // pick up exactly where you left off
  if (cp && cp.floor > 1) { continueGame(cp); return; }      // a saved zone checkpoint beats starting over
  if (!introSeen) { introSeen = true; startIntro(); }
  else resetGame();
});
// settings sliders
$('optvol').value = Math.round(opts.vol * 100); $('optsens').value = Math.round(opts.sens * 100);
const saveOpts = () => { try { localStorage.setItem('cc_opts', JSON.stringify(opts)); } catch (e) {} };
$('optvol').addEventListener('input', e => { opts.vol = sndVolume = e.target.value / 100; if (sndMaster) sndMaster.gain.value = sndVolume; saveOpts(); });
$('optvol').addEventListener('change', () => { audioInit(); sfx('ewand'); });       // a test shot at the new volume
$('optsens').addEventListener('input', e => { opts.sens = e.target.value / 100; saveOpts(); });
// full screen (F by default, or the settings button). Browsers only allow it from a key press or click, and an
// embedding page can forbid it altogether, in which case nothing happens.
function toggleFullscreen() {
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else { const r = document.documentElement.requestFullscreen(); if (r && r.catch) r.catch(() => {}); }
  } catch (e) {}
}
$('optfull').addEventListener('click', e => { e.stopPropagation(); toggleFullscreen(); });
$('optpal').textContent = opts.pal === 'contrast' ? 'high contrast' : 'normal';
$('optpal').addEventListener('click', e => { e.stopPropagation(); opts.pal = opts.pal === 'contrast' ? 'normal' : 'contrast'; e.target.textContent = opts.pal === 'contrast' ? 'high contrast' : 'normal'; saveOpts(); });
$('optfov').value = opts.fov;
$('optfov').addEventListener('input', e => { setFov(+e.target.value); saveOpts(); });
$('optfov').addEventListener('click', e => e.stopPropagation());
$('optdiff').textContent = opts.diff;
$('optdiff').addEventListener('click', e => {
  e.stopPropagation();
  opts.diff = { easy: 'normal', normal: 'hard', hard: 'easy' }[opts.diff] || 'normal'; e.target.textContent = opts.diff; saveOpts();
  if (running || paused) showMsg(`Difficulty ${opts.diff}: from the next floor`);
});
$('optmus').value = Math.round(opts.music * 100);
$('optmus').addEventListener('input', e => { opts.music = e.target.value / 100; setMusic(musicKey || 'title'); saveOpts(); });
for (const id of ['optvol', 'optsens', 'optmus']) $(id).addEventListener('click', e => e.stopPropagation());
$('quit').addEventListener('click', e => {
  e.stopPropagation();
  showMenu('CRYPT CRAWLER', 'One hundred floors. Ten guardians. One way up.', 'START');
});
// the browser takes Esc itself to release the mouse, so losing the lock is how a pause usually arrives
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && running && performance.now() - lockDropT > 600) pauseGame(); });   // not when a menu released it
document.addEventListener('visibilitychange', () => { if (document.hidden && running) pauseGame(); });
// controls panel: click an action, press a key. A key already used by another action is swapped with it.
let keyWait = null;
function drawHelp() { $('help').textContent = `Keys: ${keyLabel(K.fwd)}${keyLabel(K.left)}${keyLabel(K.back)}${keyLabel(K.right)} move · ${keyLabel(K.tl)}/${keyLabel(K.tr)} or mouse turn · ${keyLabel(K.fire)} or click fires · 1-9 guns, 0 fists, ${keyLabel(K.next)} or wheel next · ${keyLabel(K.map)} map · ${keyLabel(K.full)} full screen · Esc pause  |  Menus: up / down choose · left / right change · Enter confirms · Esc back${gp.seen ? '  |  Controller: sticks move and turn · RT fire · RB/LB weapon · Y map · Start pause · A confirm · B back' : ''}`; }
function drawKeys() {
  setTimeout(menuPaint, 0);                                  // the table is rebuilt below: put the selection mark back
  $('keytable').innerHTML = Object.keys(KEY_NAMES).map(a => `<tr><td>${KEY_NAMES[a]}</td><td><button data-a="${a}" class="${keyWait === a ? 'wait' : ''}">${keyWait === a ? 'press a key' : keyLabel(K[a])}</button></td></tr>`).join('');
  drawHelp();
}
function showKeys(on) { keyWait = null; $('keypanel').classList.toggle('on', on); if (on) { menuBackI = menuI; menuI = 0; } else menuI = menuBackI; drawKeys(); menuPaint(); }
$('keysbtn').addEventListener('click', e => { e.stopPropagation(); showKeys(true); });
$('keyclose').addEventListener('click', e => { e.stopPropagation(); showKeys(false); });
$('keyreset').addEventListener('click', e => { e.stopPropagation(); Object.assign(K, KEY_DEFAULTS); opts.keys = {}; saveOpts(); keyWait = null; drawKeys(); });
$('keytable').addEventListener('click', e => { e.stopPropagation(); const a = e.target.dataset && e.target.dataset.a; if (a) { keyWait = a; drawKeys(); } });
$('keypanel').addEventListener('click', e => e.stopPropagation());
drawHelp();
function showOpts(on) { $('optpanel').classList.toggle('on', on); if (on) { menuBackI = menuI; menuI = 0; } else menuI = menuBackI; menuPaint(); }
$('optbtn').addEventListener('click', e => { e.stopPropagation(); showOpts(true); });
$('optclose').addEventListener('click', e => { e.stopPropagation(); showOpts(false); });
$('optpanel').addEventListener('click', e => e.stopPropagation());
// hovering a menu line with the mouse selects it, so mouse and keys never disagree about which line is live
$('menu').addEventListener('mouseover', e => { const it = menuItems(), k = it.indexOf(e.target); if (menuCtx() === 'menu' && k >= 0 && k !== menuI) { menuI = k; menuPaint(); } });
function showCredits(on) { $('credits').classList.toggle('on', on); if (on) { $('credits').scrollTop = 0; menuBackI = menuI; menuI = 0; } else menuI = menuBackI; menuPaint(); }
$('creditsbtn').addEventListener('click', e => { e.stopPropagation(); showCredits(true); });
$('records').addEventListener('click', e => { e.stopPropagation(); showRecords(true); });
$('recclose').addEventListener('click', e => { e.stopPropagation(); showRecords(false); });
$('creditsclose').addEventListener('click', e => { e.stopPropagation(); showCredits(false); });
$('newclimb').addEventListener('click', e => {               // wipe the checkpoint and start from the crypt
  e.stopPropagation(); clearCheckpoint(); $('newclimb').style.display = 'none';
  $('go').textContent = 'START';
});

