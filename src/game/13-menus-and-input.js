// ---------- flow & input ----------
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
  if ($('keypanel').classList.contains('on')) {              // controls panel: bind the waiting action, or close
    e.preventDefault();
    if (keyWait) {
      if (e.code !== 'Escape' && !/^Digit/.test(e.code)) {
        const other = Object.keys(K).find(a => K[a] === e.code && a !== keyWait);
        if (other) K[other] = K[keyWait];
        K[keyWait] = e.code; opts.keys = Object.assign({}, K); saveOpts();
      }
      keyWait = null; drawKeys();
    } else if (e.code === 'Escape') showKeys(false);
    return;
  }
  if ($('recpanel').classList.contains('on')) { if (['Escape', 'Enter', 'Space'].includes(e.code) && !e.repeat) { e.preventDefault(); showRecords(false); } return; }
  if ($('credits').classList.contains('on')) {               // credits page: its own keys, arrows scroll it
    if (['Escape', 'Enter', 'Space'].includes(e.code) && !e.repeat) { e.preventDefault(); showCredits(false); }
    return;
  }
  if (PREVENT.has(e.code)) e.preventDefault();
  // arcade start: Enter / Space / Escape (pad ✕ or START) on a menu; short delay so held fire does not skip GAME OVER
  if (!running && !introActive && overlay.style.display !== 'none' && ['Enter', 'Space', 'Escape'].includes(e.code)
      && !e.repeat && performance.now() - menuShownAt > (paused ? 250 : 900)) { $('go').click(); return; }
  if (running && (e.code === 'Escape' || e.code === K.pause) && !e.repeat) { pauseGame(); return; }
  keys[e.code] = true;
  if (e.code === K.full && !e.repeat) toggleFullscreen();
  if (e.code === K.map && !e.repeat) mapOn = !mapOn;
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
addEventListener('wheel', e => { if (running) cycleWeapon(); }, { passive: true });   // mouse wheel: next weapon
addEventListener('resize', resize);
addEventListener('rqpad:layout', resize);
showMenu('CRYPT CRAWLER', 'Erupt from the crypt, climb the Spire floor by floor, and slay the guardian on every tenth floor.', 'PRESS START');
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
  showMenu('CRYPT CRAWLER', 'Erupt from the crypt, climb the Spire floor by floor, and slay the guardian on every tenth floor.', 'PRESS START');
});
// the browser takes Esc itself to release the mouse, so losing the lock is how a pause usually arrives
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && running && performance.now() - lockDropT > 600) pauseGame(); });   // not when a menu released it
document.addEventListener('visibilitychange', () => { if (document.hidden && running) pauseGame(); });
// controls panel: click an action, press a key. A key already used by another action is swapped with it.
let keyWait = null;
function drawHelp() { $('help').textContent = `Keys: ${keyLabel(K.fwd)}${keyLabel(K.left)}${keyLabel(K.back)}${keyLabel(K.right)} move · ${keyLabel(K.tl)}/${keyLabel(K.tr)} or mouse turn · ${keyLabel(K.fire)} or click fires · 1-9 guns, 0 fists, ${keyLabel(K.next)} or wheel next · ${keyLabel(K.map)} map · ${keyLabel(K.full)} full screen · Esc pause`; }
function drawKeys() {
  $('keytable').innerHTML = Object.keys(KEY_NAMES).map(a => `<tr><td>${KEY_NAMES[a]}</td><td><button data-a="${a}" class="${keyWait === a ? 'wait' : ''}">${keyWait === a ? 'press a key' : keyLabel(K[a])}</button></td></tr>`).join('');
  drawHelp();
}
function showKeys(on) { keyWait = null; drawKeys(); $('keypanel').classList.toggle('on', on); menuShownAt = performance.now(); }
$('keysbtn').addEventListener('click', e => { e.stopPropagation(); showKeys(true); });
$('keyclose').addEventListener('click', e => { e.stopPropagation(); showKeys(false); });
$('keyreset').addEventListener('click', e => { e.stopPropagation(); Object.assign(K, KEY_DEFAULTS); opts.keys = {}; saveOpts(); keyWait = null; drawKeys(); });
$('keytable').addEventListener('click', e => { e.stopPropagation(); const a = e.target.dataset && e.target.dataset.a; if (a) { keyWait = a; drawKeys(); } });
$('keypanel').addEventListener('click', e => e.stopPropagation());
drawHelp();
function showCredits(on) { $('credits').classList.toggle('on', on); if (on) $('credits').scrollTop = 0; menuShownAt = performance.now(); }
$('creditsbtn').addEventListener('click', e => { e.stopPropagation(); showCredits(true); });
$('records').addEventListener('click', e => { e.stopPropagation(); showRecords(true); });
$('recclose').addEventListener('click', e => { e.stopPropagation(); showRecords(false); });
$('creditsclose').addEventListener('click', e => { e.stopPropagation(); showCredits(false); });
$('newclimb').addEventListener('click', e => {               // wipe the checkpoint and start from the crypt
  e.stopPropagation(); clearCheckpoint(); $('newclimb').style.display = 'none';
  $('go').textContent = 'PRESS START';
});

