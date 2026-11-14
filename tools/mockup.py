"""Mock-up sheet of weapon options on a dark dungeon-ish backdrop. Does NOT touch assets.js or the game.
Usage: python3 tools/mockup.py /tmp/mockup.png"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.argv = [sys.argv[0]] + sys.argv[1:]
from PIL import Image, ImageDraw
import compose_weapons as cw
# the processed fist frame, rebuilt the same way pack_assets does
import importlib.util, io, base64
spec = importlib.util.spec_from_file_location('pa', os.path.join(os.path.dirname(__file__), 'pack_assets.py'))
import json, re
src = open(os.path.join(os.path.dirname(__file__), '..', 'assets.js')).read()
data = json.loads(src[src.index('{'):src.rindex('}') + 1])
fist = Image.open(io.BytesIO(base64.b64decode(data['fist']['frames'][0].split(',')[1]))).convert('RGBA')
def bg():
    im = Image.new('RGBA', (160, 90), (30, 30, 40, 255)); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 160, 28], fill=(24, 24, 34)); d.rectangle([0, 28, 160, 52], fill=(58, 58, 66)); d.rectangle([0, 52, 160, 90], fill=(70, 62, 52))
    d.line([(76, 40), (84, 40)], fill=(255, 255, 255, 200)); d.line([(80, 36), (80, 44)], fill=(255, 255, 255, 200))   # crosshair
    return im
cells = [('Crossbow A: no hands (Hexen)', cw.crossbow(fist, 'none')[0]),
         ('Crossbow B: right hand under the stock', cw.crossbow(fist, 'under')[0]),
         ('Chaingun A: no hands (Doom)', cw.chaingun(fist, 'none')[1]),
         ('Chaingun B: both hands under the gun', cw.chaingun(fist, 'under')[1])]
S = 3; sheet = Image.new('RGB', (160 * S * 2, 90 * S * 2), (0, 0, 0))
for i, (label, fr) in enumerate(cells):
    b = bg(); b.alpha_composite(fr)
    b = b.resize((160 * S, 90 * S), Image.NEAREST); ImageDraw.Draw(b).text((6, 4), label, fill=(255, 255, 160))
    sheet.paste(b.convert('RGB'), ((i % 2) * 160 * S, (i // 2) * 90 * S))
sheet.save(sys.argv[1] if len(sys.argv) > 1 else '/tmp/mockup.png'); print('saved')
