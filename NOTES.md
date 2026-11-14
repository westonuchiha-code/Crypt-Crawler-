# Crypt Crawler: notes for whoever works on this next

The whole game is in `index.html`. It's published as artifact slug
`43397ed7-28db-4541-a9f7-31e7b520c09b`. Republish with `publish_files`, passing the
latest version as `base_version`.

## Before every publish
1. **Syntax:** extract the inline script and run `node --check` on it.
2. **Runtime:** run `python3 tools/live.py`. It plays every weapon on floors 1, 4 and 6
   and prints page errors. It must say `errors: none`.
   `node --check` can't catch load-order bugs. For example, a top-level `const` that
   reads another `const` declared further down kills the whole game.
3. **Visuals:** run `python3 tools/shoot.py /tmp/sheet.png [weapons...]`, then open the
   PNG. Rows are weapons and columns are idle / fire / mid / late attack.
   Check the picture before telling the user it looks right.

The tools use the system Chrome (`/usr/bin/google-chrome`) with Playwright, and skip the
Three.js intro.

## Structure
- The game code sits inside an IIFE. Tools reach its state through the test hook
  `window.__cc.eval("...")` at the bottom of the script.
- The game renders into a 320x200 buffer (`RW`, `RH`) through `bctx`, then scales it up.
  Pixel sizes in the code are buffer pixels.
- Weapons are defined in `WEAPONS` / `WEAPON_ORDER` / `WEAPON_KEYS`. Their type
  (`hitscan`, `melee`, `arrow`, `fireball`, `chain`) picks the attack code in `fire()`.
- Monsters: sprites are drawn by hand into 32x32 canvases (`ratTex`, `flameTex`, `demonTex`,
  `angelTex`, ...) and registered in `SPR`. Stats are in `spawnMonster`, and the mix per
  floor is in `pickKind(lv)`.

## Held-weapon rules (the user cares a lot about these: check them with tools/shoot.py)
- **Match the user's references:** Wolfenstein 3D, Doom, Hexen, Heretic, Daggerfall.
- **Size:** weapons are BIG and fill the bottom 35-50% of the 320x200 buffer.
- **Placement:** guns and the crossbow are **centred** and seen from behind. The near end is at
  the bottom edge and the muzzle or bolt tip ends just below the crosshair. Melee and magic
  (sword, wand, lightning hand) come from the **right**.
- **Drawing:** shapes have a dark 1px outline (`poly`, `ell` with `OUT`) and 2-3 tone
  shading. Use the shared palettes (`SK*` skin, `MT*` metal, `WD*` wood, `SLV` sleeve) and
  real hands: `drawBigFist`, plus a sleeve running off the bottom edge.
- **Coordinates:** each `draw*Art` function works in local units, with x relative to the
  weapon's centre, y = 0 at the bottom of the screen and negative y going up.
  `drawHeldWeapon` handles translation and walk bob, and shrinks the centred guns slightly.
- **Motion:** weapons bob while walking, guns kick and flash when firing, the shotgun pumps,
  and the chaingun barrels spin.
- **Never** draw a weapon or projectile side-on or pointing at the ceiling.
- **Sword:** a Daggerfall-style keyframed slash (`SWORD_IDLE/WINDUP/HIT`, `drawSword`,
  `HELD_S`). The fist follows the grip.
- **Lightning:** bolts start at `palmPoint()`, the glow above the casting hand.
- **Crossbow bolts in flight** are drawn along their path by `drawArrowShots`, not as
  sprites.

## Art pipeline (sprite weapons)
- **Source art lives in `art/`:** `art/weapons/` (photo-style pistol, shotgun and punch frames),
  `art/hands/` (the user's 3-frame hand sheets: wand, lightning, plus `spare_cast.png` and
  `open_hands.png`, not used yet), and `art/anarch/` (CC0 Anarch pack: monsters, walls,
  items; not used yet).
- **`python3 tools/pack_assets.py` builds `assets.js`.** It pixelates the photo frames to 160x90,
  recolours the skin to match the hand sheets, outlines them, splits and aligns the hand sheets,
  and writes the frames and their tip points. **Never edit `assets.js` by hand, and never
  Read it** (it is one giant base64 blob). Edit the packer or the source art and re-run it.
- **`index.html` loads `assets.js` with a script tag.** The artifact must be published with both
  files: `publish_files` with `index.html` and `assets.js`.
- **In-game use:** the `ART` table maps each weapon to its idle frame and attack frame sequence
  (`drawArtWeapon`). The wand orb, the lightning charge and the pistol/shotgun muzzle halo are
  drawn on top at each frame's tip. Lightning bolts start at the current frame's fingertips.
- **Fallback:** if `assets.js` fails to load, the older vector-drawn weapons (`draw*Art`) are
  used. Every weapon now has sprite art. Pistol, shotgun, fist, wand and lightning come from
  the CC0 photo packs. Sword, crossbow and chaingun are composed in `tools/compose_weapons.py`:
  drawn pixel weapons gripped by the pack's photo fist. The whip was removed.
- **Adding or changing a sprite weapon:** add frames to `art/` (or compose them in
  `tools/compose_weapons.py`), add a group in `tools/pack_assets.py`, add an entry to `ART`, then run `tools/shoot.py`.
- **Fist** is a melee weapon on key 6, always owned. Keys: 1 pistol, 2 shotgun, 3 wand, 4 lightning, 5 fist. Sword cut too. Crossbow, chaingun and whip were CUT (user did not like them).

- The all-weapons test loadout is gone: the player starts with fists only (see Loot below).
`newPlayer()` currently starts with every weapon and large ammo, for testing. Before
release, set the `owned` flags back to `false` (except pistol, sword and lightning) and the
ammo to 0.

## Wall tiles
Walls 1-3 and the door (4) use photo tiles from art/walls (see art/README.md). They are packed into assets.js
(`window.WALL_TILES`) and copied over the drawn `WALLS[i]` pixel arrays when they load; if assets.js is missing the
drawn walls stay. To change a wall, replace the PNG and rerun `python3 tools/pack_assets.py`.

## Themes, menus, intro
- `THEMES` (index.html) picks wall/door/floor/ceiling tiles by floor: entrance, crypt (1-5), sewers (6-10), catacombs (11+).
  Tiles live in art/tiles/<name>.png and are packed into assets.js as `window.TILES`. Floor/ceiling are texture-cast in renderFloorCeil.
- Menus are arcade style: `showMenu(title, text, goLabel, dead)`; best run is kept in localStorage `cc_best`.
  Enter/Space/Escape (pad ✕ or START) presses PRESS START after a 0.9 s guard.
- The Three.js intro uses the same TILES as textures (`texMat`), plus sunset sun, hemisphere light and two torches on the door group.
  To test the intro offline, serve three r128 locally (CDN is blocked in the build sandbox): npm i three@0.128.0.

## Enemy sprites
`MONSTERS` in assets.js (art/monsters, 2 frames: idle, attack) replace the drawn 32x32 SPR monsters when loaded.
drawMonsterSprite() stands them on the floor; m.atk > 0 shows the attack frame (set when a monster hits or shoots);
walking mirrors the frame on alternate steps and adds a small hop (phase from position, no state). Height: MON_H * scale
(bosses x2.1). Boss art is 'boss' + level (5, 10, 15), falling back to boss10. To re-render: see tools/render_monsters.py.
- 2026-11-12: the user rejected the megapack monster sprites ("they look bad"). art/monsters was moved out of the
  project (archived at /home/claude/archive/monsters_megapack), so MONSTERS is empty and the drawn SPR sprites are used.
  The MON_PX / drawMonsterSprite code stays and works for any future art/monsters/<kind>_0/1.png set.
- 2026-11-13: enemies are now hand-drawn in code by tools/draw_monsters.py (art/monsters/<kind>_0 idle, _1 attack),
  pixelated by pack_assets.py. Edit a monster's function there, then rerun draw_monsters.py and pack_assets.py.

## Weapon balance (2026-11-13)
Enemy HP: rat 30, flame 45, imp 55, ghoul 60+4*lv, skel 70+5*lv, angel 90+6*lv, bosses 700/1100/1600 (pistol: rat 3 shots).
WEAPONS dmg is [min,max] rolled per hit; `knock` shoves (bosses 20%), `stun` freezes (bosses 30%), shotgun pellets fall off
between `near` and `far`. The role of each weapon is written above the WEAPONS table; keep them distinct when tuning.

## Loot (step 1 of the 100-floor plan, 2026-11-13)
Start: fists only. Every gun uses ammo (lightning too). One weapon crate per floor gives a gun you lack (WEAPON_FLOOR
unlocks: pistol 1, shotgun 3, wand 6, lightning 9) plus CRATE_AMMO, or refills one you have. Ammo boxes add BOX_AMMO to
every pool, owned or not. Enemies drop a small ammo pickup ('drop') 30% of the time; bosses drop a crate and a box.
dropIfEmpty(): a gun at 0 ammo leaves the cycle (P.owned false) until another crate gives it back.
Plan: 2) 100 floors in 10 zones, checkpoint per zone, boss every 10th floor; 3) new zone looks/enemies; 4) space + alien-planet ending.

## The climb: 100 floors (step 2, 2026-11-13)
`ZONES` (top of the script) lists the 10 zones: name, boss, THEMES index. Boss on every 10th floor (BOSS_HP 600 + 300*zone).
Difficulty is by zone: hpMul/dmgMul, monster count and speed use zoneOf(level), never the raw floor number.
Checkpoint: entering floor 1, 11, 21 ... saves {floor, kills, owned, ammo} to localStorage 'cc_save' and refills HP.
PRESS START / CONTINUE resumes there (continueGame); "new climb" erases it; winning on floor 100 clears it.
Zones 4-10 reuse tile mixes and the 3 boss sprites cycle; step 3 gives each zone its own tiles, enemies and boss.
- Zone looks (step 3a): tools/make_tiles.py derives zone 4-10 tiles from the user's tiles (tint + painted detail).
  Themes with `sky:` have no ceiling: skyPano(kind) draws a 1536x100 panorama ('day', 'dusk', 'space', 'alien'),
  sampled by ray angle in renderFloorCeil. Next: per-zone enemies and bosses (step 3b), then the ending (step 4).
- Enemies per zone (step 3b): ROSTERS lists [kind, weight] per zone; new kinds slime, knight, golem, harpy, alien, eye,
  horror (stats in spawnMonster, art in tools/draw_monsters.py). Bosses: art boss1..boss10, one per zone.

## Ending (step 4, 2026-11-14)
`victory()` -> `startEnding()` (Three.js, shares the intro canvas and renderer via `getRenderer3()`) -> `finishEnding()` ->
`victoryMenu()`. Without Three.js/WebGL it goes straight to the menu. Shots are keyed in `END_CAM`, captions in `END_CAPS`,
credit roll text in `END_CREDITS`; the scene is built once in `buildEnding()` (seeded, so it is the same every time).
Skippable after 2.5 s (tap, or pad ✕). Test: serve three r128 locally, then `__cc.eval("victory()")` and set `ending.t`.

## Enemy art (2026-11-14): Freedoom + Blasphemer sprites, animated
The user rejected the code-drawn enemies. All 13 kinds and 10 bosses now use real sprite sets (see art/README.md for the
licence duty). tools/enemy_cast.py is the one table to edit: kind -> sprite set, prefix, height in wall heights, and the
frame letters for walk / attack / pain / death. tools/pack_assets.py packs them as palette PNGs into `MONSTERS`
(`k`, `walk`, `atk`, `pain`, `die`, `frames: [uri, ox, oy]`). In index.html: `MON_PX`, `monArtKey`, the frame choice in
`renderSprites`, and `drawMonsterSprite` (anchored at each frame's origin, so floaters hover and corpses lie flat).
Dead monsters stay in `monsters` as corpses (`m.dead`, `m.dieT`, last death frame) until the next floor is generated.
`m.scale`, the old lunge/swell and tools/draw_monsters.py are no longer used for anything but the no-assets fallback.
pack_assets.py needs Pillow, numpy and scipy. To look at enemies in game, spawn them with `__cc.eval` and screenshot.

## Balance pass, floors 1-100 (2026-11-14)
Before: ammo covered 2.2x the enemies' health in the crypt but 0.3x in zone 10, and a 100 HP player died in 5-6 hits there.
Now (formulas sit under `hpMul` at the top of index.html; `python3 tools/balance.py` prints the table per zone):
- Max health is 100 + 10 per zone (`zoneMaxHp`), set on every staircase; stairs heal a quarter of it.
- Potions heal 35 + 4 per zone, and floors hold 2, then 3 (zone 4+), then 4 (zone 8+).
- Ammo is sized per floor in `generate()`: `floorAmmo` multiplies crates, boxes and drops so the floor holds about
  `AMMO_RATIO` (1.9 falling to 1.3) times its enemies' total health in ammo damage. Never below x1, so zones 1-2 are unchanged.
- Enemy health grows 12% per zone (was 15%). Ranged enemies' shots now deal that enemy's own damage (was a flat 4).
- The HUD shows `HP n/max`.
Result: ammo/health margin 2.5 -> 1.3 and hits-to-die 24 -> 11 from zone 1 to 10. Not touched: weapon stats, boss health,
enemy rosters, and per-enemy stats (some no longer match their new sprites, e.g. 'rat' is a flesh worm).

## Credits page (2026-11-14)
Title menu -> "credits" opens `#credits` inside the overlay (`showCredits`; Esc / Enter / Space close it). It lists every
outside resource and carries the full Freedoom, Blasphemer and three.js licence texts. CREDITS.md at the repo root is the
master list, including which credits are legally required and two texture sources still unknown. Update both together.

## Sound (2026-11-14)
Effects only, no music yet. Sources: Freedoom and Blasphemer .wav files in art/sounds (BSD-3, same notices as the sprites).
tools/sound_cast.py maps game keys to files (`GENERAL` events; `KINDS` per enemy: see / atk / pain / die / act / shot);
`python3 tools/pack_sounds.py` (needs ffmpeg) writes sounds.js, which must be published with the other files.
In index.html: `audioInit()` starts Web Audio on the first key press or click and decodes everything; `sfx(key)`,
`sfxAt(key, x, y)` (distance fade and left/right pan) and `msnd(monster, event)`. `sndVolume` is the master volume
(no settings screen yet). Enemies cry out when they first see you (`m.woke`), and one nearby enemy growls every few seconds.
The sounds were chosen by name, not by ear: expect some to need swapping once the user has listened.
