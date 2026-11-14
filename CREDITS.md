# Crypt Crawler: credits and licences

Everything in the game that was not made for it. The in-game credits page (title menu, "credits") shows the same list;
keep the two in step. "Required" means the licence obliges us to ship the notice with the game.

| Used for | Work | By | Licence | Credit required? |
|---|---|---|---|---|
| Enemies, bosses, scenery | Freedoom sprites | Freedoom project contributors | BSD 3-clause | **Yes**: ship art/enemies/freedoom/COPYING.adoc |
| Enemies, bosses, pickups, scenery | Blasphemer sprites | Blasphemer project contributors | BSD 3-clause | **Yes**: ship art/enemies/blasphemer/COPYING.md |
| Sound effects | Freedoom and Blasphemer sounds (art/sounds) | same projects | BSD 3-clause | **Yes**: covered by the same two notices |
| Music | Freedoom MIDI tracks (art/music), rendered to MP3 | Freedoom project contributors | BSD 3-clause | **Yes**: covered by the Freedoom notice |
| Music instruments | FluidR3 GM soundfont (used to render the MP3s; not shipped itself) | Frank Wen | MIT | Credit given; the soundfont file is not distributed |
| Intro and ending scenes | three.js r128 | three.js authors | MIT | **Yes**: ship its licence text |
| Guns, staffs, wands | Freedoom and Blasphemer weapon sprites | same projects | BSD 3-clause | **Yes**: covered by the same two notices |
| Fist | FPS Weapon Sprites | Ragnar Random (from Quaternius models) | CC0 | No (credited anyway) |
| Walls, floors, doors | "Dungeon_Map.png" and "Doors_Map.png" tile sheets | paid itch.io pack (name to look up) | to check | **To confirm before release** |
| Sewer brick wall | Modular PSX Sewer Kit (comp3interactive.itch.io/modular-psx-sewer-kit) | Comp-3 Interactive | **not stated on its page** (see note) | **Ask the author before release** |

No longer used in the game (kept in art/ for reference): the photo pistol and shotgun, and the Fantasy FPS Hands wand and
lightning hands. Not shipped: art/anarch (CC0, unused) and rqpad.js (the developer's own on-screen pad, test scaffolding only).
Individual Freedoom and Blasphemer artists are listed in art/enemies/*/CREDITS*.

## Reminder for the developer (noted 2026-11-14)
The wall, floor and door textures come from a pack bought on itch.io. Credit is probably not required, but before release:
1. Find the pack's page in your itch.io library and note its name and author here.
2. Read its licence: is commercial use allowed, is credit required, and may the art be modified (the zone tiles are
   recoloured and repainted from it)?
3. Update the "Walls, floors and doors" lines in the in-game credits page (index.html, `#credits`) to match.

### Modular PSX Sewer Kit: what is known (looked up 2026-11-15)
- Author: Comp-3 Interactive. Paid pack (minimum 5.99 GBP); the developer has bought it.
- Its itch.io page has no licence section; commenters have asked for one, and a question about commercial use on the
  demo page had no visible reply.
- For a sibling pack (Modular PSX Architecture Kit) the same author wrote in the comments: CC0, do what you want apart
  from reselling or reskin-reselling, no attribution required, fine for commercial projects. Nothing confirms the Sewer
  Kit has the same terms, though it is likely.
- This was found by web search; the pack's page itself could not be opened from the build machine.
- The developer's purchase is confirmed (itch.io shows "You own this asset pack", bought for 5.99 GBP).
- The downloaded zip was checked on 2026-11-15: 107 files (textures, meshes, a Unity package, Blender and Photoshop
  sources) and **no licence, readme or terms file** anywhere in it, including inside the Unity package.
- **To settle it:** ask Comp-3 Interactive in a comment on the pack's page whether it may be used, modified, in a
  commercial game, and whether credit is wanted. The game credits them by name in the meantime.
- Still unidentified: the pack that "Dungeon_Map.png" and "Doors_Map.png" came from (most walls, floors and doors).
