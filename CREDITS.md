# Crypt Crawler: credits and licences

Everything in the game that was not made for it. The in-game credits page (title menu, "credits") shows the same list;
keep the two in step. "Required" means the licence obliges us to ship the notice with the game.

| Used for | Work | By | Licence | Credit required? |
|---|---|---|---|---|
| Enemies and bosses | Freedoom sprites | Freedoom project contributors | BSD 3-clause | **Yes**: ship art/enemies/freedoom/COPYING.adoc |
| Enemies, bosses, pickups | Blasphemer sprites | Blasphemer project contributors | BSD 3-clause | **Yes**: ship art/enemies/blasphemer/COPYING.md |
| Sound effects | Freedoom and Blasphemer sounds (art/sounds) | same projects | BSD 3-clause | **Yes**: covered by the same two notices |
| Intro and ending scenes | three.js r128 | three.js authors | MIT | **Yes**: ship its licence text |
| Pistol, shotgun, fist | FPS Weapon Sprites | Ragnar Random (from Quaternius models) | CC0 | No (credited anyway) |
| Wand and lightning hands | Fantasy FPS Hands | Ragnar Random | "do as you will" | No (credit appreciated) |
| Walls, floors, doors | "Dungeon_Map.png" and "Doors_Map.png" tile sheets | paid itch.io pack (name to look up) | to check | **To confirm before release** |
| Sewer brick wall | Modular PSX Sewer Kit | itch.io (author to look up) | to check | **To confirm before release** |

Not shipped: art/anarch (CC0, unused) and rqpad.js (the developer's own on-screen pad, test scaffolding only).
Individual Freedoom and Blasphemer artists are listed in art/enemies/*/CREDITS*.

## Reminder for the developer (noted 2026-11-14)
The wall, floor and door textures come from a pack bought on itch.io. Credit is probably not required, but before release:
1. Find the pack's page in your itch.io library and note its name and author here.
2. Read its licence: is commercial use allowed, is credit required, and may the art be modified (the zone tiles are
   recoloured and repainted from it)?
3. Update the "Walls, floors and doors" lines in the in-game credits page (index.html, `#credits`) to match.
