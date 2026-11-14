"""The sound cast: which Freedoom ('f') or Blasphemer ('b') sound effect plays for each game event and enemy.

Both sets are BSD-3-Clause, like the enemy sprites (see CREDITS.md). tools/pack_sounds.py copies the files named here
into art/sounds/<set>/ and packs them into sounds.js; index.html plays them by the keys on the left.
Enemy keys are '<kind>_<event>': see (first notices you), atk (melee), shot (ranged; falls back to 'eshot'),
pain, die, act (idle growl now and then). Leave an event out and that enemy is silent for it.
"""
GENERAL = {
    'punch': 'f:dspunch', 'swing': 'f:dsskeswg', 'empty': 'f:dsswtchx',
    # one per weapon id (WEAPONS in index.html)
    'ewand': 'b:gldhit', 'dshot': 'f:dsdshtgn', 'phoenix': 'b:phosht', 'claw': 'b:blssht', 'hstaff': 'b:hrnsht',
    'mace': 'b:lobsht', 'plasma': 'f:dsplasma', 'rocket': 'f:dsrlaunc', 'bfg': 'f:dsbfg',
    'boom': 'b:phohit', 'bigboom': 'f:dsbarexp', 'nova': 'f:dsrxplod',
    'eshot': 'f:dsfirsht', 'eboom': 'f:dsfirxpl',
    'hurt': 'f:dsplpain', 'death': 'f:dspldeth', 'noway': 'f:dsnoway',
    'item': 'f:dsitemup', 'weapon': 'f:dswpnup', 'power': 'f:dsgetpow',
    'door': 'f:dsdoropn', 'stairs': 'f:dspstart', 'switch': 'f:dsswtchn',
}
#            see           atk           pain          die           act           shot
KINDS = {
    'rat':    ('f:dssgtsit', 'f:dssgtatk', 'f:dsdmpain', 'f:dssgtdth', 'f:dsdmact',  None),
    'ghoul':  ('b:mumsit',   'b:mumat1',   'b:mumpai',   'b:mumdth',   None,         None),
    'skel':   ('b:clksit',   'b:clkatk',   'b:clkpai',   'b:clkdth',   'b:clkact',   None),
    'imp':    ('f:dsbgsit1', 'f:dsclaw',   'f:dspopain', 'f:dsbgdth1', 'f:dsbgact',  None),
    'flame':  ('f:dssklatk', 'f:dssklatk', 'f:dsdmpain', 'f:dsfirxpl', None,         None),
    'angel':  ('b:wizsit',   'b:wizatk',   'b:wizpai',   'b:wizdth',   'b:wizact',   'b:wizatk'),
    'slime':  ('b:bstsit',   'b:bstatk',   'b:bstpai',   'b:bstdth',   'b:bstact',   None),
    'knight': ('b:kgtsit',   'b:kgtatk',   'b:kgtpai',   'b:kgtdth',   None,         None),
    'golem':  ('f:dsbrssit', 'f:dsclaw',   'f:dsdmpain', 'f:dsbrsdth', 'f:dsdmact',  None),
    'harpy':  ('b:impsit',   'b:impat1',   'b:imppai',   'b:impdth',   None,         None),
    'alien':  ('f:dsskesit', 'f:dsskepch', 'f:dspopain', 'f:dsskedth', 'f:dsskeact', 'f:dsskeatk'),
    'eye':    ('f:dscacsit', 'f:dsclaw',   'f:dsdmpain', 'f:dscacdth', 'f:dsdmact',  None),
    'horror': ('f:dsmansit', 'f:dsmanatk', 'f:dsmnpain', 'f:dsmandth', 'f:dsposact', None),
    'boss1':  ('b:sorsit',   'b:soratk',   'b:sorpai',   'b:sordexp',  'b:soract',   'b:sorzap'),
    'boss2':  ('b:snksit',   'b:snkatk',   'b:snkpai',   'b:snkdth',   'b:snkact',   'b:snkatk'),
    'boss3':  ('b:hedsit',   'b:hedat1',   'b:hedpai',   'b:heddth',   'b:hedact',   'b:hedat2'),
    'boss4':  ('b:sbtact',   'b:kgtat2',   'b:sbtpai',   'b:sbtdth',   None,         'b:kgtat2'),
    'boss5':  ('b:minsit',   'b:minat1',   'b:minpai',   'b:mindth',   'b:minact',   'b:minat2'),
    'boss6':  ('f:dspesit',  'f:dssklatk', 'f:dspepain', 'f:dspedth',  'f:dsdmact',  None),
    'boss7':  ('f:dskntsit', 'f:dsclaw',   'f:dsdmpain', 'f:dskntdth', 'f:dsdmact',  None),
    'boss8':  ('f:dsspisit', 'f:dsclaw',   'f:dsdmpain', 'f:dsspidth', 'f:dsbspact', 'f:dsshotgn'),
    'boss9':  ('f:dsvilsit', 'f:dsvilatk', 'f:dsvipain', 'f:dsvildth', 'f:dsvilact', 'f:dsflamst'),
    'boss10': ('f:dscybsit', 'f:dshoof',   'f:dsdmpain', 'f:dscybdth', 'f:dshoof',   'f:dsrlaunc'),
}
EVENTS = ('see', 'atk', 'pain', 'die', 'act', 'shot')
SETS = {'f': 'freedoom', 'b': 'blasphemer'}


def all_keys():
    """{game key: 'set:file'} for every sound the game can ask for."""
    out = dict(GENERAL)
    for kind, row in KINDS.items():
        for ev, src in zip(EVENTS, row):
            if src: out[f'{kind}_{ev}'] = src
    return out
