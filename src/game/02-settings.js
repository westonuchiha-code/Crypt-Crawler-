// ---------- settings (saved per browser in localStorage 'cc_opts') and key bindings ----------
// opts: sound and music volume (0-1), mouse turn speed (1 = default), difficulty, field of view, key bindings
// Key bindings (settings -> controls). Stored in opts.keys; Esc, the digit keys and the arrow keys for moving are fixed.
const KEY_DEFAULTS = { fwd: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', tl: 'ArrowLeft', tr: 'ArrowRight', fire: 'Space', next: 'KeyQ', map: 'KeyM', pause: 'KeyP', full: 'KeyF' };
const KEY_NAMES = { fwd: 'Forward', back: 'Back', left: 'Step left', right: 'Step right', tl: 'Turn left', tr: 'Turn right', fire: 'Fire', next: 'Next weapon', map: 'Map', pause: 'Pause', full: 'Full screen' };
const keyLabel = c => c.replace(/^Key|^Digit/, '').replace('Arrow', '').replace('Left', '←').replace('Right', '→').replace('Up', '↑').replace('Down', '↓').toUpperCase();
const opts = Object.assign({ vol: 0.7, sens: 1, music: 0.4, diff: 'normal', keys: {}, fov: 67 }, (() => { try { return JSON.parse(localStorage.getItem('cc_opts')) || {}; } catch (e) { return {}; } })());
const K = Object.assign({}, KEY_DEFAULTS, opts.keys);          // the live bindings
const setFov = deg => { opts.fov = Math.max(55, Math.min(100, deg)); FOV_PLANE = Math.tan(opts.fov * Math.PI / 360); };
setFov(opts.fov);
let padFire = false;                                          // the test pad's fire button, whatever the keyboard binding
