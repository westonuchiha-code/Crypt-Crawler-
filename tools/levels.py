"""Level generation check: builds floors 1-100 several times each and proves every one can be finished.

Usage: python3 tools/levels.py [times per floor, default 4]
For each floor (scenery counted as walls): the stairs are reachable once the locked door is open, the key is reachable
without opening it, and every pickup and enemy can be reached (through the locked door and secret walls).
Must print zeros for keyBad, stairsBad and unreachable, and `errors: none`. Run after touching generate().
"""
import os, sys, subprocess
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'build.py')], check=True)
N = int(sys.argv[1]) if len(sys.argv) > 1 else 4
JS = r"""(function(N){
  const out = { floors: 0, locks: 0, secrets: 0, keyBad: 0, stairsBad: 0, unreachable: 0, msPerFloor: 0 };
  const reach = (sx, sy, pass) => { const seen = new Uint8Array(W * H), q = [sy * W + sx]; seen[q[0]] = 1;
    for (let i = 0; i < q.length; i++) { const c = q[i], x = c % W, y = (c / W) | 0;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const n = (y + dy) * W + x + dx, t = map[n];
        if (!seen[n] && (t === 0 || t === STAIRS || pass.includes(t)) && !props.some(p => p.solid && Math.floor(p.x) === x + dx && Math.floor(p.y) === y + dy)) { seen[n] = 1; q.push(n); } } }
    return seen; };
  for (let lv = 1; lv <= 100; lv++) for (let k = 0; k < N; k++) {
    P = newPlayer(); level = lv; const t0 = performance.now(); generate(lv); out.msPerFloor += performance.now() - t0; out.floors++; out.secrets += secrets.total;
    const sx = Math.floor(P.x), sy = Math.floor(P.y), st = map.indexOf(STAIRS);
    const lock = map.indexOf(LOCKED), key = items.find(i => i.kind === 'key');
    const closed = reach(sx, sy, []), open = reach(sx, sy, [LOCKED]), all = reach(sx, sy, [LOCKED, SECRET]);
    if (lock >= 0) { out.locks++; if (!key || !closed[Math.floor(key.y) * W + Math.floor(key.x)]) out.keyBad++; } else if (key) out.keyBad++;
    if (!open[st]) out.stairsBad++;
    for (const it of items) if (!all[Math.floor(it.y) * W + Math.floor(it.x)]) out.unreachable++;
    for (const m of monsters) if (!all[Math.floor(m.y) * W + Math.floor(m.x)] || solid(m.x, m.y)) out.unreachable++;
  }
  out.msPerFloor = Math.round(out.msPerFloor / out.floors); return out; })"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(); pg.route('**/three.min.js', lambda r: r.abort())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + ROOT + '/index.html#nopad'); pg.wait_for_timeout(900); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    r = pg.evaluate('s => window.__cc.eval(s)', JS + f'({N})')
    print(r)
    bad = [k for k in ('keyBad', 'stairsBad', 'unreachable') if r[k]]
    print('errors:', (errs + bad) or 'none')
    b.close()
