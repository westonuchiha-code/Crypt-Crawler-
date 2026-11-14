# Crypt Crawler: technical notes (current state)

Read HANDOFF.md first. This file says how the game works now. The day-by-day log it replaced, with the reasoning and
measurements behind each change, is in docs/notes-history.md.

## Layout and build
- **Edit src/, never index.html.** `python3 tools/build.py` joins src/index.template.html and src/game/01..18-*.js into
  index.html (src/README.md lists what is in each file). The files share one scope, so a top-level `const` must sit
  above the first line that runs it at load time.
- `python3 tools/build.py --release` writes dist/: the game without the on-screen test pad, with LICENSES.txt.
  desktop/ wraps dist/ in Electron (desktop/README.md).
- Generated, never hand-edited: index.html, assets.js (tools/pack_assets.py), sounds.js (tools/pack_sounds.py),
  music/*.mp3 (tools/pack_music.py). three.min.js is three r128, bundled.
- The page renders into a 320x200 buffer (`RW`, `RH`) and scales it up; sizes in drawing code are buffer pixels.
- `window.__cc.eval(src)` runs code in the game's scope (tests use it).

## Checks (the user cannot play-test often: verify with these, do not hand work back)
| Command | What it proves |
|---|---|
| `python3 tools/live.py` | Builds, fires every weapon on three floors, then about 40 checks across every system, including every menu by keyboard alone and by controller alone. Must end `errors: none`. |
| `python3 tools/bot.py [runs] [first] [average\|weak] [last] [easy\|normal\|hard]` | A bot plays the real game logic. Per zone: deaths, damage taken per floor, stalls; per weapon: real damage per shot and per second. |
| `python3 tools/levels.py [n]` | Generates floors 1-100 n times each and proves every one can be finished: key, stairs, loot and enemies reachable. |
| `python3 tools/tour.py <folder>` | About 74 screenshots of the whole game (bot-played fights, bosses, cutscenes, staged set pieces, every weapon, menus). For looking at, not pass/fail. |
| `python3 tools/cutscenes.py [sheet.png]` | Intro and ending end to end with WebGL, and their skip rules. |
| `python3 tools/balance.py` | Static table: enemy health, ammo margin, hits to die, healing per zone. |
- The bot's results swing between runs; use two or three runs and compare zones, not absolute numbers.
- When writing checks: the page's own frame loop keeps running between evals, so read "before" values first.
- Tools need Playwright with /usr/bin/google-chrome; packers need Pillow, numpy, scipy, ffmpeg, and for music
  fluidsynth with the FluidR3_GM soundfont.

## The climb
- 100 floors in 10 zones (`ZONES`, `THEMES`); a boss on every 10th floor in an 11x11 arena with the stairs in the middle.
  Zones 6-10 have no ceiling (`skyPano`).
- `generate(lv)` (05-level-generation.js): rooms and corridors, then secrets (0-2 closets behind a `SECRET` wall), scenery
  (`ZONE_PROPS`), spike traps (floor 7+), dart walls (floor 12+, tile `DARTS`), a locked door (`LOCKED`) with its key on
  your side, loot, explosive pods (floor 5+), and enemies in packs of 2-4. Bigger rooms get shapes (corners cut off for an
  eight-sided room, or filled in for a cross; the arena is eight-sided) and about one room in eight is a great hall.
  Solid scenery is added one piece at a time and dropped if it would cut anything off (a pillar once sealed a doorway).
  tools/levels.py proves reachability; 800 floors passed.
- Saves (localStorage): `cc_resume` every floor (exact state; deleted on death), `cc_save` checkpoint at each zone start
  and each boss floor (a retry refills every unlocked gun to at least 1.5 caches), `cc_best`, `cc_stats` (records and
  achievements), `cc_opts` (settings).
- Flow: title -> intro (first start) -> entrance -> floors; stairs after a boss show zone results; floor 100's boss ->
  ending cutscene -> SPIRE CONQUERED. Death -> recap -> continue from the checkpoint.

## Player, weapons, loot
- `WEAPONS` (01-config.js): fist plus nine guns unlocking at floors 1, 3, 6, 9, 16, 26, 46, 66, 86 (`WEAPON_FLOOR`). Roles
  are in the comment above the table. Attack types: hitscan, melee, chain, pierce, nova, fireball (with `blast`, `bounce`,
  `spread`). An empty gun leaves the cycle until a cache returns it.
- Growth: max health 100 + 10 per zone; all damage +10% per zone (`wpnMul`); potions heal more and are more numerous.
- Ammo is sized per floor: `floorAmmo` scales caches, chests and drops so the floor holds `AMMO_RATIO` (1.9 falling to
  1.55) times its enemies' health in ammo damage, using `AMMO_DMG` (damage per unit of ammo **as measured by the bot**).
  Re-measure with tools/bot.py after changing a weapon and update `AMMO_DMG`.
- Pickups: potion, weapon cache, ammo chest, drop, armour (soaks half), fury (double damage 20 s), ward (no damage 8 s), key.
- Killing spree: 3+ kills within 3.5 s of each other heal 3 each.

## Enemies
- `KIND` (stats and traits: ranged, shot, burst, keep, lunge, weave, fly, heavy), `ROSTERS` per zone, `BOSS_MOVES` per
  boss (burst, ring, stream, summon, lunge, blink, and `phase2` applied once at half health; four bosses have one).
- Scaling by zone, never by raw floor: `hpMul` 12%, `dmgMul` 12.5% per zone; bosses 8 melee / 6 per shot in zone 1 to
  22 / 19 in zone 10. `DIFFS` (easy / normal / hard) scales damage, health and ammo; on hard bosses use gentler numbers.
- AI (10-enemies.js): chase and attack the target (the player, or a 6 s `grudge` against an enemy that shot it), follow
  the chase map (`updateFlow`) round corners once alerted, wander otherwise.
- Art and sound: tables in tools/enemy_cast.py (`CAST`, `SHOTS`, `ITEMS`, `PROPS`, `HELD`) and tools/sound_cast.py.
  tools/import_enemies.py copies frames from Freedoom / Blasphemer checkouts into art/enemies.

## Presentation
- Sprites are drawn by `drawMonsterSprite` anchored at each frame's origin (enemies, corpses, shots, items, props).
- Held weapons: `HELD` frames at native 320x200 positions (`drawPackWeapon`); the fist is the one photo sprite left.
- HUD: health bar and text line, boss bar, hit-direction wedge, map (off / corner / full with legend), `PAL()` colours
  (normal or high contrast).
- Sound: `sfx`, `sfxAt`, `msnd`; music by `<audio>` (`setMusic`, zones share tracks in pairs); ambience per zone
  (`ZONE_AMB`). All chosen by file name and checked by machine, not by ear.
- Menus: one vertical list (`#menu`: start / continue, new climb, options, controls, records, credits, quit) used by
  the title, pause, game over, zone results and victory (`showMenu`, `pauseGame`). Options, controls, records and
  credits are full-page `.panel`s with a BACK line. **Everything is driven by keyboard and controller, no pointer
  needed** (`menuItems`, `menuNav`, `menuAdjust`, `menuActivate`, `menuBack` in 16-input-and-panels.js): up / down
  choose, left / right change a slider or toggle, confirm, back; credits and records scroll. The mouse works too.
  The user was emphatic (2026-11-15): this is a PC game; nothing may depend on touch, and the title screen must look
  like a normal title screen with nothing overlapping.
- Input: keyboard and mouse, any standard controller (`pollGamepad`), and the RQPad on-screen pad for phone testing.

## Screenshot review of 2026-11-15 (what tools/tour.py turned up, all fixed)
- The view was a fixed 320x200 buffer letterboxed into the window: black bars at the sides on 16:9. Now `setView()`
  sizes the buffer's width to the window (280-480 wide, height 200) and `fovPlane()` widens the view to match.
  Anything that assumed 320 wide was corrected (held weapons, the fist art, the sky column table).
- The single HUD text line wrapped over the minimap once armour and timers were showing. The HUD is now four corners:
  health and armour top left, floor and kills top right, key and timers bottom left, weapon and ammo bottom right.
- Explosions were one flat orange disc scaled to the blast; they are now three Freedoom explosion frames (`SHOTS.boom`).
- The phoenix rod's firing frame was a white burst over a third of the screen: that frame is no longer used.
- The Big One's and the boss-phase flash washed the whole screen green for too long: now brief, lighter, pale for bosses.
- A struck enemy was recoloured (neon yellow or blue); `hitTint` now only pushes its own colours towards white.
- Menu subtitles sat under the title's glow; the high score showed on the pause menu. Fixed.
- three.js warned about `flatShading` on Lambert materials: removed.
- Not changed: dart-wall projectiles reuse the blue "spit" sprite and do not look like darts.

## Known gaps
- Never heard or hand-played by the person who wrote most of it: sound choices, music choices, weapon feel, boss feel,
  controller feel are all unverified by a human.
- No desktop installer has been built or tried on Windows or macOS; no Steam features.
- Normal difficulty costs the average bot no deaths; whether that is right for people is undecided.
