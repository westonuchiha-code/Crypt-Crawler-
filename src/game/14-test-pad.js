// ---------- phone controls: RQPad (rqpad.js) ----------
// Left stick -> movement, right stick -> turn, A -> fire (sends Space), X -> cycle gun, Y -> minimap.
RQPad.install({
  layout: 'dock',                  // default Switch-style layout: controller halves on the sides, game in the middle
  onlyOnTouch: false,              // test build: always shown; set true for release
  glyphs: 'playstation',
  labels: { A: 'FIRE', B: '', X: 'GUN', Y: 'MAP', L1: '', R1: '', L2: '', R2: '', START: 'MENU', SELECT: '' },
  keys: { moveKeys: 'wasd' }       // arrows would also turn the view, so only WASD is sent
});
RQPad.onStick = (which, x, y) => { if (which === 'move') { touchState.joyX = x; touchState.joyY = -y; } };
RQPad.onButton = (name, down) => {
  if (name === 'A') padFire = down;
  if (!down) return;
  if (name === 'X' && running) cycleWeapon();
  if (name === 'Y') mapOn = !mapOn;
}

