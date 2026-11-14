# src/: where the game is edited

`index.html` is **generated**. Edit the files here, then run `python3 tools/build.py` (tools/live.py does it for you).

- `index.template.html`: the page itself: styles, menus, credits text, script tags. `/*@GAME_SCRIPT@*/` marks where
  the game code goes.
- `game/*.js`: the game code, cut into sections and joined in name order. They are **not** modules: together they are
  one script in one scope (`01` opens `(() => {`, `15` closes it). A top-level `const` must still sit above the first
  line that runs it at load time, so mind the order when moving things between files.

| File | What is in it |
|---|---|
| 01-config.js | Zones, bosses, difficulty and balance formulas, the `WEAPONS` table and loot tables, canvas set-up |
| 02-textures-and-art.js | Drawn fallback textures, `THEMES`, sky panoramas, loading of enemy / item / prop / shot sprites, trap textures |
| 03-state.js | The game's variables (`P`, `monsters`, `items`, ...) and `newPlayer()` |
| 04-level-generation.js | `ROSTERS`, `KIND` (enemy stats), `BOSS_MOVES`, `spawnMonster`, `generate()` (rooms, arena, secrets, traps, locks, loot) |
| 05-collision.js | `solid`, `blocked`, `moveEnt`, `los` |
| 06-sound.js | Settings (`opts`), key bindings (`K`), sound effects (`sfx`, `sfxAt`, `msnd`), music (`setMusic`) |
| 07-gameplay.js | Menus, pause, records, zone results, death and victory, saves and checkpoints, pickups, `hurtMonster`, `fire()` |
| 08-combat-and-enemies.js | Player projectiles and special attacks, enemy shots, boss moves, enemy AI (`updateMonsters`), the per-frame `update()` |
| 09-rendering.js | Floor, ceiling and sky, walls, sprites |
| 10-held-weapons.js | The weapon in your hands, overlays (hit marker, minimap, HUD), `render()`, `resize()` |
| 11-intro.js / 12-ending.js | The two Three.js cutscenes |
| 13-menus-and-input.js | Keyboard and mouse, settings controls, controls / records / credits panels, full screen |
| 14-test-pad.js | The on-screen RQPad hook-up (test scaffolding; delete this file for release) |
| 15-boot.js | Start-up, the frame loop, the `__cc` test hook |

The section names are only roughly right: the code was cut where its old comment headers were, not reorganised.
