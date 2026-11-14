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

## enemies/ (the enemy and boss sprites in the game)
Front-facing frames from two open-source game-art projects, both under the 3-clause BSD licence (commercial use is fine):
- `enemies/freedoom/`: Freedoom, https://github.com/freedoom/freedoom (commit 21d783c). Licence: COPYING.adoc, authors: CREDITS.
- `enemies/blasphemer/`: Blasphemer, https://github.com/Blasphemer/blasphemer (commit 5d858ad). Licence: COPYING.md, authors: CREDITS.md.
**The licence text of both must ship with the game** (a licences file or screen) when it is released.
`offsets.txt` in each folder gives every frame's origin (the point that stands on the floor). Which sprite plays which
enemy, and which frames are walk / attack / pain / death, is in tools/enemy_cast.py. To pull different sprites:
tools/import_enemies.py, then tools/pack_assets.py.
Earlier enemy art (megapack 3D renders, then code-drawn sprites from tools/draw_monsters.py) was rejected and removed.
