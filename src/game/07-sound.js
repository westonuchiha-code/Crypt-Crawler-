// ---------- sound (Web Audio; effects from sounds.js, cast in tools/sound_cast.py) ----------
// sfx(key) plays at full volume; sfxAt(key, x, y) fades with distance and pans left/right of where you face.
// Enemy sounds go through msnd(m, 'see' | 'atk' | 'shot' | 'pain' | 'die' | 'act'). Everything is a no-op until
// the first key press or click, when browsers allow audio to start.
const SND = {}, sndLast = {};
let actx = null, sndMaster = null, sndVolume = opts.vol, actT = 4;
function audioInit() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC || !window.SOUNDS) return;
  actx = new AC(); sndMaster = actx.createGain(); sndMaster.gain.value = sndVolume; sndMaster.connect(actx.destination);
  for (const file in SOUNDS) {
    const bin = atob(SOUNDS[file].split(',')[1]), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    actx.decodeAudioData(bytes.buffer, buf => { SND[file] = buf; }, () => {});
  }
}
function sfx(key, vol = 1, pan = 0) {
  const buf = actx && window.SOUND_KEYS && SND[SOUND_KEYS[key]];
  if (!buf || vol <= 0.02) return false;
  const now = actx.currentTime;
  if (now - (sndLast[key] || -1) < 0.05) return true;         // the same sound twice in one instant only gets louder
  sndLast[key] = now;
  const src = actx.createBufferSource(), g = actx.createGain();
  src.buffer = buf; src.playbackRate.value = 0.96 + Math.random() * 0.08; g.gain.value = vol;
  src.connect(g);
  if (pan && actx.createStereoPanner) { const p = actx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(sndMaster); }
  else g.connect(sndMaster);
  src.start();
  return true;
}
function sfxAt(key, x, y, vol = 1) {
  const dx = x - P.x, dy = y - P.y, d = Math.hypot(dx, dy);
  const a = Math.atan2(dy, dx) - P.a;
  return sfx(key, vol * Math.max(0, 1 - d / 16) ** 1.5, d > 0.5 ? Math.sin(a) * 0.7 : 0);
}
const msnd = (m, ev, vol = 1) => !!window.SOUND_KEYS && sfxAt((m.art || monArtKey(m)) + '_' + ev, m.x, m.y, vol * (m.boss ? 1.3 : 1));
addEventListener('keydown', audioInit); addEventListener('pointerdown', audioInit);
// ---- music: looping tracks in music/<key>.mp3 (tools/pack_music.py), streamed by an <audio> element so only the
// track in use is downloaded. setMusic(key) switches; nothing plays until the first key press or click. ----
const musicEl = new Audio(); musicEl.loop = true; musicEl.preload = 'none';
let musicKey = '', musicOK = false;
const MUSIC_FOR = lv => lv <= 0 ? 'title' : lv % 10 === 0 ? 'boss' : 'zone' + (1 + (zoneOf(lv) >> 1));   // zones share a track in pairs
function setMusic(key) {
  if (key !== musicKey) { musicKey = key; musicEl.src = 'music/' + key + '.mp3'; }
  musicEl.volume = opts.music;
  if (musicOK && opts.music > 0) { const p = musicEl.play(); if (p && p.catch) p.catch(() => {}); } else musicEl.pause();
}
const musicUnlock = () => { if (!musicOK) { musicOK = true; setMusic(musicKey || 'title'); } };
addEventListener('keydown', musicUnlock); addEventListener('pointerdown', musicUnlock);

