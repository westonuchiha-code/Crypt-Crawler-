# Crypt Crawler: hand-off

Read this first, then NOTES.md (running technical notes) and art/README.md (where each asset came from).

## What it is
A first-person retro dungeon crawler in the style of Doom, Wolfenstein 3D, Heretic, Hexen and Daggerfall. It is a **PC game**
(keyboard and mouse; aimed at Steam or itch.io one day) that runs in the browser from one HTML page. The user develops and
tests it from an Android phone, so the on-screen controller (rqpad.js) is **test scaffolding only, not part of the game**:
don't design for it, and it comes out before release. The game is still early; enemy art and balance come before polish.
- **The climb:** a Three.js intro shows a tower erupting from the ground, then you climb 100 floors in 10 zones.
- **Bosses:** one on every 10th floor.
- **Weapons:** you start with only your fists and find guns in crates.
- **Checkpoints:** saved at the start of each zone.
- **Ending (planned):** floor 100 breaks out onto an alien planet.

Live build: Claude artifact https://claude.ai/artifact/9JUAfvhSNJcQNMox1yB1pe (slug 43397ed7-28db-4541-a9f7-31e7b520c09b,
version 1794622178-40fd at hand-off). It's a multi-file artifact: index.html, assets.js, sounds.js and rqpad.js. If you can't publish to
that slug, make a new artifact with the same three files and give the user the link.

## Files
| File | What |
|---|---|
| index.html | The whole game (~2000 lines, one script in an IIFE). Raycaster, sprites, weapons, AI, menus, Three.js intro. |
| assets.js | **Generated; never edit by hand.** Base64 art: `ASSETS` (first-person weapons), `TILES` (64x64 surfaces), `MONSTERS` (enemy sprites). |
| rqpad.js | The user's own on-screen controller. **Use it exactly as it is; never edit or restyle it.** |
| tools/pack_assets.py | Builds assets.js from art/. Run after any art change. |
| tools/make_tiles.py | Makes the zone 4-10 tiles from the user's photo tiles (tint and painted detail). |
| tools/enemy_cast.py | The enemy cast: which sprite and which animation frames each enemy and boss uses. |
| tools/import_enemies.py | Copies the needed frames from Freedoom / Blasphemer checkouts into art/enemies. |
| tools/draw_monsters.py | Old: drew enemies in code (rejected). Kept for reference. |
| sounds.js | **Generated; never edit by hand.** Sound effects as MP3 data, built by tools/pack_sounds.py. |
| tools/sound_cast.py | Which sound plays for each game event and enemy. Edit this, then run tools/pack_sounds.py. |
| tools/balance.py | Prints the balance table per zone: enemy health, ammo margin, hits to die, healing. |
| tools/live.py | Smoke test: plays every weapon on several floors. Must print `errors: none`. |
| tools/shoot.py | Screenshot contact sheet of weapon animations. |
| tools/compose_weapons.py, render_monsters.py, mockup.py | Old pipelines (cut weapons, rejected 3D-model monsters). Kept for reference. |
| art/ | Source art. art/anarch is an unused CC0 pack. |

## Build and check (do this before every publish)
```
python3 tools/make_tiles.py      # only if tiles changed
python3 tools/pack_assets.py     # always after art changes
# syntax check of the inline script (does NOT catch load-order/TDZ errors):
python3 -c "import re;s=open('index.html').read();open('/tmp/i.js','w').write(max(re.findall(r'<script>(.*?)</script>',s,re.S),key=len))" && node --check /tmp/i.js
python3 tools/live.py            # must say: errors: none
```
- **Test setup:** the tools use Playwright with /usr/bin/google-chrome. Block three.min.js from the CDN, or serve
  three@0.128.0 locally (`npm i three@0.128.0`).
- **Disabling the controller:** add `#nopad` to the URL to turn off the on-screen pad in screenshots.
- **Test hook:** `window.__cc.eval(src)` runs code inside the game's scope, for example
  `__cc.eval("level=35; generate(35)")`.

## How the user wants to work (important)
- **Keep it short:** they're on a phone and watch their usage, so keep messages and token use lean.
- **Mock-ups for anything visual:** for a new look, art or weapon, render a screenshot or sheet first and show it before
  changing the published game. When they say "continue" or "make the best choice", you may go ahead, but still show
  the result.
- **First-person rules:** guns sit centred and are seen from behind, pointing at the crosshair. Never point them at the
  ceiling or sideways. Melee and magic come in from the right. Hands are big, realistic, with sleeves running off the
  bottom of the screen. They like the **photo-hand** look on the pistol, shotgun, fist, wand and lightning.
- **Damage must make sense:** fist is weaker than pistol, shotgun is brutal up close, and nothing one-shots on the pistol.
- **When they're angry:** they swear when frustrated. Own the mistake, fix it, and keep the reply short.
- **Rejected and removed, don't bring back without asking:** whip, crossbow, chaingun, sword (no art they liked), the
  arms-rig 3D hands, and the 3D megapack monsters (bad posed arms).

## Current state
- **Weapons:** fist, pistol, shotgun, wand (fireball) and lightning (chain). All but the fist use ammo. An empty gun leaves
  the weapon cycle until another crate brings it back. Guns unlock by depth: pistol on floor 1, shotgun 3, wand 6,
  lightning 9. The role of each weapon is written above the `WEAPONS` table.
- **Zones:** `ZONES`, `THEMES`, `ROSTERS` and `BOSS_HP` sit near the top of the script. Difficulty scales by zone
  (`hpMul`, `dmgMul`), never by raw floor number. Zones 6-10 have no ceiling and use open-sky panoramas (`skyPano`).
- **Enemies:** 13 regular kinds plus 10 bosses (boss1 to boss10), using Freedoom and Blasphemer sprites (BSD licence, the
  notice must ship with the game) with walk, attack, pain and death frames. The cast table is tools/enemy_cast.py.
- **Controls:** RQPad in dock layout. ✕ fire, □ next gun, △ map. Movement is analog with easing (`MOVE_SPEED`,
  `TURN_SPEED` and friends in `update`).
- **Menus:** arcade style (`showMenu`). The best run is saved in localStorage `cc_best`; the checkpoint in `cc_save`.

## Next steps
1. **Step 4, the ending:** done (see NOTES.md, "Ending"): passage, last door, the two moons, wide shot, SPIRE CONQUERED
   and a credit roll, then the menu.
2. **Unused buttons:** wire ○, L1/R1 (previous/next gun?), L2/R2 and START (pause menu). The user hasn't decided; ask.
3. **Balance:** first pass done (see NOTES.md, "Balance pass"; check with tools/balance.py). Still open: per-enemy stats
   and names to suit the new sprites, boss fights, and nothing new unlocks after floor 9.
4. **Before release:**
   - set RQPad `onlyOnTouch: true`
   - **remind the user:** the wall/floor/door textures are from a pack they bought on itch.io; they will look up its
     name and licence later (steps in CREDITS.md, "Reminder"). Everything else is on the in-game credits page.
   - consider bundling three.js so the intro doesn't depend on the CDN
