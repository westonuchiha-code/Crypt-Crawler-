"""The enemy cast: which open-source sprite set each enemy kind uses, and which frames make up each animation.

Sprites come from Freedoom ('f') and Blasphemer ('b'), both BSD-3-Clause (see art/enemies/*/COPYING*; the notice must
ship with the game). Only the front-facing frames are kept, in art/enemies/<set>/<name>.png.
Each entry: set, 4-letter sprite prefix, world height of the idle frame in wall heights, then frame letters for
walk / attack / pain / death. tools/pack_assets.py reads this table; index.html plays the animations.
"""
CAST = {
    # kind:    (set, prefix, tall, walk,     attack, pain, death)
    'rat':    ('f', 'sarg', 0.62, 'ABCD',   'EFG',  'H',  'IJKLMN'),
    'ghoul':  ('b', 'mumm', 0.95, 'ABCD',   'EFG',  'H',  'IJKLMNOP'),
    'skel':   ('b', 'clnk', 0.95, 'ABCD',   'EFG',  'H',  'IJKLMNO'),
    'imp':    ('f', 'troo', 0.90, 'ABCD',   'EFG',  'H',  'IJKLM'),
    'flame':  ('f', 'skul', 0.55, 'AB',     'CD',   'E',  'FGHIJK'),
    'angel':  ('b', 'wzrd', 1.00, 'AB',     'CD',   'E',  'FGHIJKLM'),
    'slime':  ('b', 'beas', 0.75, 'ABCDEF', 'HI',   'G',  'RSTUVWXYZ'),
    'knight': ('b', 'knig', 1.05, 'ABCD',   'EFG',  'H',  'IJKLMNO'),
    'golem':  ('f', 'boss', 1.20, 'ABCD',   'EFG',  'H',  'IJKLMNO'),
    'harpy':  ('b', 'impx', 0.70, 'ABC',    'DEF',  'G',  'HIJKL'),
    'alien':  ('f', 'skel', 1.05, 'ABC',    'JK',   'L',  'MNOPQ'),
    'eye':    ('f', 'head', 0.85, 'A',      'BCD',  'E',  'GHIJKL'),
    'horror': ('f', 'fatt', 1.15, 'ABCDEF', 'GHI',  'J',  'KLMNOPQRST'),
    'boss1':  ('b', 'sor2', 1.70, 'MNOP',   'RST',  'Q',  'FEDCBA'),            # the Warden: a skeleton lord (dies by its rise played backwards)
    'boss2':  ('b', 'snke', 1.60, 'ABCD',   'EF',   'E',  'GHIJKLMNOP'),        # the Sewer King
    'boss3':  ('b', 'head', 1.90, 'A',      'B',    'A',  'CDEFGHI'),           # the Hollow Queen
    'boss4':  ('b', 'srcr', 1.70, 'ABCD',   'QRS',  'Q',  'EFGHIJKLMNOP'),      # the Iron Castellan
    'boss5':  ('b', 'mntr', 1.80, 'ABCD',   'VWX',  'E',  'FGHIJKLMNOPQRST'),   # the Forgeheart
    'boss6':  ('f', 'pain', 1.60, 'ABC',    'DEF',  'G',  'HIJKLM'),            # the Storm Herald
    'boss7':  ('f', 'bos2', 1.90, 'ABCD',   'EFG',  'H',  'IJKLMNO'),           # the Skywyrm
    'boss8':  ('f', 'spid', 1.60, 'ABCDEF', 'GH',   'I',  'JKLMNOPQRS'),        # the Void Archon
    'boss9':  ('f', 'vile', 2.00, 'ABC',    'GHIJKLMNOP', 'Q', 'RSTUVWXYZ'),    # the Star-Eater
    'boss10': ('f', 'cybr', 2.40, 'ABCD',   'EF',   'G',  'HIJKLMNOP'),         # the Spire Titan
}
# Enemy projectiles: name -> (set, the two flight frames, height in wall heights). Which enemy throws which is in
# index.html (KIND table, `shot:`). Packed as window.SHOTS.
SHOTS = {
    'fire':   ('f', ['bal1a0', 'bal1b0'], 0.20),       # serpentipede fireball
    'spit':   ('f', ['bal2a0', 'bal2b0'], 0.20),       # trilobite / mutant spit
    'heavy':  ('f', ['bal7a1a5', 'bal7b1b5'], 0.26),   # brute's bolt, most bosses
    'blob':   ('f', ['manfa1', 'manfb1'], 0.30),       # the horror's cannon shots
    'bolt':   ('f', ['plssa0', 'plssb0'], 0.18),       # wizard's and the Archon's energy bolts
    'rocket': ('f', ['fatba1', 'fatbb1'], 0.24),       # the Titan
}
# Pickups lying on the floor: game item kind -> (set, frames, height in wall heights). Packed as window.ITEMS.
ITEMS = {
    'potion': ('b', ['ptn1a0', 'ptn1b0', 'ptn1c0'], 0.26),
    'crate':  ('b', ['bagha0'], 0.34),                       # the weapon cache: a bag
    'ammo':   ('b', ['amg2a0', 'amg2b0', 'amg2c0'], 0.24),   # ammo chest
    'drop':   ('b', ['amg1a0'], 0.13),                       # small ammo dropped by an enemy
    'armour': ('b', ['shlda0'], 0.40),
    'fury':   ('b', ['pwbka0'], 0.30),                       # tome: double damage for a while
    'ward':   ('b', ['invua0', 'invub0', 'invuc0', 'invud0'], 0.34),   # cannot be hurt for a while
}
# First-person weapons: game weapon id -> (set, idle frame, firing sequence). Each step of the sequence is
# (fraction of the firing animation by which it ends, frames drawn on top of each other: weapon, then muzzle flash).
# Frames keep their original screen positions (the art is drawn for a 320x200 view). Packed as window.HELD.
HELD = {
    'ewand':   ('b', 'gwnda0', [(0.25, ['gwndb0']), (0.5, ['gwndc0']), (0.8, ['gwndd0'])]),
    'dshot':   ('f', 'sht2a0', [(0.08, ['sht2a0', 'sht2i0']), (0.16, ['sht2a0', 'sht2j0']), (0.28, ['sht2b0']), (0.40, ['sht2c0']),
                                (0.52, ['sht2d0']), (0.64, ['sht2e0']), (0.76, ['sht2f0']), (0.88, ['sht2g0']), (1.0, ['sht2h0'])]),
    'phoenix': ('b', 'phnxa0', [(0.2, ['phnxb0']), (0.5, ['phnxc0']), (0.85, ['phnxd0'])]),
    'claw':    ('b', 'blsra0', [(0.25, ['blsrc0']), (0.6, ['blsrd0']), (0.85, ['blsrc0'])]),
    'hstaff':  ('b', 'hroda0', [(0.3, ['hrode0']), (0.6, ['hrodf0']), (1.0, ['hrodg0'])]),
    'mace':    ('b', 'macea0', [(0.25, ['maceb0']), (0.5, ['macec0']), (0.75, ['maced0']), (1.0, ['macee0'])]),
    'plasma':  ('f', 'plsga0', [(0.4, ['plsfa0']), (0.7, ['plsfb0']), (1.0, ['plsgb0'])]),
    'rocket':  ('f', 'misga0', [(0.15, ['misgb0', 'misfa0']), (0.3, ['misgb0', 'misfb0']), (0.45, ['misgb0', 'misfc0']),
                                (0.6, ['misgb0', 'misfd0']), (1.0, ['misgb0'])]),
    'bfg':     ('f', 'bfgga0', [(0.3, ['bfggb0']), (0.5, ['bfgfa0']), (0.7, ['bfgfb0']), (1.0, ['bfggc0'])]),
}
def held_frames(w):
    s, idle, seq = HELD[w]
    return sorted({idle} | {n for _, names in seq for n in names})
SETS = {'f': 'freedoom', 'b': 'blasphemer'}
