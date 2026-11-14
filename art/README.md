# Art sources and licenses
- `anarch/`: Anarch by drummyfish, CC0 / public domain.
- `weapons/`: "FPS Weapon Sprites" by Ragnar Random on OpenGameArt, CC0
  (sprites derived from works by quaternius). https://opengameart.org/content/fps-weapon-sprites
- `hands/`: from "Fantasy FPS Hands" by Ragnar Random on OpenGameArt (weaponstaff and weaponspell
  frames; "do as you will", credit appreciated). https://opengameart.org/content/fantasy-fps-hands
  The pack also has a raw.zip of the original hand photos (including a punch and a devil-horns spell).

## walls/
64x64 wall tiles, file name `<WALLS index>_<name>.png`, packed into assets.js as `window.WALL_TILES` by tools/pack_assets.py.
- 1_stone_blocks, 2_skull_catacomb: from the user's "Dungeon_Map.png" tile sheet.
- 3_sewer_brick: Modular PSX Sewer Kit (Bricks_NonLooping.png, downscaled).
- 4_wood_door: from the user's "Doors_Map.png" (left door, squashed to 64x64).
Check the original packs' licenses before a public release.

## monsters/ (now drawn by tools/draw_monsters.py; the megapack renders below were rejected and archived)
Enemy sprites rendered from the user's "PSX Horror-Fantasy Megapack" 3D models by tools/render_monsters.py
(idle pose = arms down, attack = arms raised), pixelated by tools/pack_assets.py into window.MONSTERS.
Kinds: rat=killer pig, flame=eyehead, imp=devil demon, skel=werewolf, ghoul=anomaly monster, angel=bloodwraith,
boss5=green cyclops, boss10=big abomination, boss15=elk demon. Check the pack's license before a public release.
