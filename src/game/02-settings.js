// ---------- settings (saved per browser in localStorage 'cc_opts') and key bindings ----------
// opts: sound and music volume (0-1), mouse turn speed (1 = default), difficulty, field of view, key bindings
// Key bindings (settings -> controls). Stored in opts.keys; Esc, the digit keys and the arrow keys for moving are fixed.
const KEY_DEFAULTS = { fwd: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', tl: 'ArrowLeft', tr: 'ArrowRight', fire: 'Space', next: 'KeyQ', map: 'KeyM', pause: 'KeyP', full: 'KeyF' };
const KEY_NAMES = { fwd: 'Forward', back: 'Back', left: 'Step left', right: 'Step right', tl: 'Turn left', tr: 'Turn right', fire: 'Fire', next: 'Next weapon', map: 'Map', pause: 'Pause', full: 'Full screen' };
const keyLabel = c => c.replace(/^Key|^Digit/, '').replace('Arrow', '').replace('Left', '←').replace('Right', '→').replace('Up', '↑').replace('Down', '↓').toUpperCase();
const opts = Object.assign({ vol: 0.7, sens: 1, music: 0.4, diff: 'normal', keys: {}, fov: 67, pal: 'normal' }, (() => { try { return JSON.parse(localStorage.getItem('cc_opts')) || {}; } catch (e) { return {}; } })());
// Map and marker colours. The high-contrast set avoids telling things apart by red against green alone
// (enemies orange, potions blue, traps magenta) and brightens the hit wedge.
const PALS = {
  normal: { you: '#ffe14d', foe: '#f44', boss: '#c0f', stairs: '#e8d9a0', lock: '#e0a020', key: '#fd0', secret: '#4dd', trap: '#a33',
    potion: '#4f4', crate: '#e0b737', ammo: '#aab', drop: '#aab', armour: '#8cf', fury: '#f80', ward: '#fff', hit: '255,40,30' },
  contrast: { you: '#ffffff', foe: '#ff9d00', boss: '#ff3df2', stairs: '#fff27a', lock: '#b57a00', key: '#ffe600', secret: '#00e5ff', trap: '#e040fb',
    potion: '#3aa0ff', crate: '#c9a227', ammo: '#b8bcc8', drop: '#b8bcc8', armour: '#9be7ff', fury: '#ffd08a', ward: '#ffffff', hit: '255,235,60' }
};
const PAL = () => PALS[opts.pal] || PALS.normal;
const K = Object.assign({}, KEY_DEFAULTS, opts.keys);          // the live bindings
const setFov = deg => { opts.fov = Math.max(55, Math.min(100, deg)); FOV_PLANE = Math.tan(opts.fov * Math.PI / 360); };
setFov(opts.fov);
let padFire = false;                                          // the test pad's fire button, whatever the keyboard binding
