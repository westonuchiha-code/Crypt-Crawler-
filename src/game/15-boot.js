// ---------- boot ----------
P = newPlayer();
generateEntrance();
resize();
let last = performance.now();
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  if (introActive) {
    stepIntro(dt);
  } else if (endActive) {
    stepEnding(dt);
  } else {
    if (running) update(dt);
    render();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Test hook: lets screenshot tooling (tools/shoot.py) run code inside this scope, e.g.
// window.__cc.eval("P.weapon = 'sword'"). Unused during normal play.
window.__cc = { eval: src => eval(src) };
})();
