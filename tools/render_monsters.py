"""Render enemy sprites from the PSX Horror-Fantasy Megapack models (user-supplied, 3D .glb, T-pose only).

Not part of the normal build: needs three.js (npm i three in /tmp/r) and the models copied to /tmp/r/m2,
plus /tmp/r/mon.html (a tiny three.js page exposing renderPose). Output: art/monsters/<kind>_<frame>.png
(full-size renders; tools/pack_assets.py pixelates them). Frame 0 = idle (arms down), 1 = attack (arms raised to smash).
Both frames of a monster share one camera, so they line up (feet at the same place, same scale).
"""
import json, base64, io, os, socketserver, http.server, functools, threading
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MONSTERS = {   # game kind -> model file (without .glb)
    'rat': 'killer_pig_killerpiggodot', 'flame': 'eyehead_eyeheadgodot', 'imp': 'devil_demon_devildemongodot',
    'skel': 'werewolf_werewolfgodot', 'ghoul': 'anomalymonster_anomalygodot', 'angel': 'bloodwraith_bloodwraithgodot',
    'boss5': 'green_cyclope_greencyclopegodot', 'boss10': 'bigabomination_bigabominationgodot', 'boss15': 'elkdemon_elkdemongodot'}
# Arms hang naturally at the sides (z 0.65). Raised-arm or spread-claw attack poses looked broken from the front
# (user rejected them), so the attack frame is the same pose; the game makes them lunge instead.
IDLE = {"CC_Base_L_Upperarm": [0, 0, -0.65], "CC_Base_R_Upperarm": [0, 0, 0.65]}
ATTACK = IDLE

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

def main():
    out = os.path.join(ROOT, 'art', 'monsters'); os.makedirs(out, exist_ok=True)
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Q, directory='/tmp/r'))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
        pg = b.new_page(viewport={'width': 400, 'height': 520})
        pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/mon.html'); pg.wait_for_function('document.title==="ready"')
        for kind, model in MONSTERS.items():
            fix = None
            for f, pose in enumerate([IDLE, ATTACK]):
                r = pg.evaluate('a => renderPose(a[0], a[1], 0.3, a[2])', [model, pose, fix]); fix = r['fix']
                Image.open(io.BytesIO(base64.b64decode(r['url'].split(',')[1]))).save(os.path.join(out, f'{kind}_{f}.png'))
            print(kind, 'ok')
        b.close()

if __name__ == '__main__':
    main()
