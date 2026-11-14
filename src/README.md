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
| 02-settings.js | `opts` (volume, music, mouse speed, difficulty, field of view), key bindings `K` |
| 03-textures-and-art.js | Drawn fallback textures, `THEMES`, sky panoramas, loading of enemy / item / prop / shot sprites, trap textures |
| 04-state.js | The game's variables (`P`, `monsters`, `items`, ...) and `newPlayer()` |
| 05-level-generation.js | `ROSTERS`, `KIND` (enemy stats), `BOSS_MOVES`, `spawnMonster`, `generate()` (rooms, arena, secrets, traps, locks, loot) |
| 06-collision.js | `solid`, `blocked`, `moveEnt`, `los` |
| 07-sound.js | Sound effects (`sfx`, `sfxAt`, `msnd`) and music (`setMusic`) |
| 08-menus-and-saves.js | Menus, records, zone results, pause, death and victory, resume saves and checkpoints, `nextLevel` |
| 09-player-actions.js | Taking damage, pickups, `hurtMonster`, `fire()` and every attack type, player projectiles |
| 10-enemies.js | Enemy shots, boss moves, the chase map (`updateFlow`), enemy AI (`updateMonsters`) |
| 11-update.js | The per-frame `update()`: input, movement, traps, doors, pickups, stairs |
| 12-rendering.js | Floor, ceiling and sky, walls, sprites, lightning bolts |
| 13-held-weapons-and-hud.js | The weapon in your hands, overlays (hit marker, minimap, HUD), `render()`, `resize()` |
| 14-intro.js / 15-ending.js | The two Three.js cutscenes |
| 16-input-and-panels.js | Keyboard and mouse, settings controls, controls / records / credits panels, full screen |
| 17-test-pad.js | The on-screen RQPad hook-up: test scaffolding, left out of `tools/build.py --release` |
| 18-boot.js | Start-up, the frame loop, the `__cc` test hook |
