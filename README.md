# Minecraft Clone

A browser-based, voxel sandbox game built from scratch with vanilla JavaScript and
[three.js](https://threejs.org/) (vendored locally — no CDN / network required).

> **Note on "1:1":** The real Minecraft is ~14 years of proprietary code and
> copyrighted assets (redstone, multiple dimensions, hundreds of items/mobs,
> villages, enchanting, brewing, etc.). This project is a faithful, playable
> *clone of the core experience* — not a literal copy of the original game.
> All textures and sounds here are generated procedurally in code.

## Play

Open `index.html` in any modern browser (Chrome/Firefox/Edge/Safari), or serve
the folder over HTTP and visit it. Click **Singleplayer** to start.

No build step, no install — it's plain HTML/CSS/JS.

## Features

- **Minecraft-style look & UI** — faithful procedural 16×16 block textures, a
  dirt-background title screen with beveled stone buttons, pixel hearts/hunger,
  a green XP bar with level, the hotbar selector frame, an inverted crosshair,
  and a classic gray inventory/crafting GUI.
- **Lighting engine** — per-block **skylight + block-light flood-fill** with
  **ambient occlusion**, baked into a custom GLSL shader. Torches/glowstone glow,
  caves go dark, and the day/night cycle dims the world *without* rebuilding meshes.
- **Infinite procedural terrain** — Perlin/FBM noise, 5 biomes (plains, forest,
  desert, mountains, snow), caves, ore veins, trees, flowers, water.
- **Chunked voxel world** (16×16×128) with face-culling and dynamic load/unload.
- **32 block types** with procedurally generated pixel-art textures.
- **Tools & tiers** — wood/stone/iron/diamond **pickaxe, axe, shovel, sword**.
  The right tool mines faster; ores/stone only drop when mined with a pickaxe.
- **Combat** — swing to attack mobs (sword does more damage), knockback, loot
  drops; mobs hit back with knockback and a red damage flash.
- **Real physics** — swept-AABB collision, gravity, jumping, swimming, fall damage.
- **Block interaction** — timed breaking with progress + particles, placing,
  dropped items you walk over to pick up.
- **First-person hand** showing the held block/tool, swing animation, view bobbing, sprint FOV.
- **Inventory + 3×3 crafting** with a real recipe system (planks, sticks, tools,
  torches, furnace…), plus a creative item/tool browser.
- **Animated mobs** — zombie, creeper (explodes!), skeleton, pig, cow, sheep with
  multi-part box models, walking animation, and day/night-weighted spawning.
- **Day/night cycle** with dynamic sky, sun, moon, stars.
- **World save/load** — modified chunks + seed + player/inventory persisted to
  localStorage; autosaves every 30s and on exit.
- **Procedural audio** (Web Audio API) — block sounds, footsteps, mobs, ambience.
- **Survival mechanics** — health, hunger, regen, death/respawn.
- **Mobile support** — auto-detects touch devices and shows an on-screen joystick,
  look-drag, and jump/break/place/fly/sneak/inventory buttons.

## Controls

### Desktop
| Action | Key |
| --- | --- |
| Move | `W` `A` `S` `D` |
| Jump | `Space` |
| Sprint | double-tap `W` or hold `Ctrl` |
| Sneak | `Shift` |
| Fly (creative) | `F`, then `Space` / `Shift` to go up/down |
| Break / Place | Left click / Right click |
| Select item | `1`–`9` or scroll wheel |
| Inventory | `E` |
| Chat / commands | `T` |
| Debug overlay | `F3` |
| Pause | `Esc` |

### Mobile (auto-detected)
- **Left thumb:** drag anywhere on the left to use the movement joystick.
- **Right thumb:** drag to look around; quick tap to place a block.
- **Buttons:** jump (▲), break (⛏, hold), place (⬛), fly-up (⤒),
  inventory (🎒), fly (✈), sneak (⬇). Tap a hotbar slot to select it.

### Chat commands
`/give <BLOCK> <count>` · `/tp <x> <y> <z>` · `/fly` · `/creative` · `/time day|night` · `/help`

## Project structure

```
index.html        Markup, HUD, menus, mobile controls, script loading
css/style.css     All styling (HUD, menus, inventory, mobile controls)
vendor/three.min.js  three.js r160 (vendored)
js/
  noise.js        Perlin / FBM noise
  blocks.js       Block + item/tool definitions, hardness, drops, mining tiers
  textures.js     Procedural texture-atlas generation (blocks + item icons)
  shaders.js      Custom voxel shader (baked sky/block light + AO + day uniform)
  chunk.js        Chunk storage, lighting flood-fill, mesh building (face culling + AO)
  world.js        Terrain generation, chunk management, raycasting, light queries
  player.js       Camera, movement, swept-AABB collision, break/place, tool mining
  inventory.js    Hotbar + inventory + stacking
  crafting.js     Crafting grid recipe matching (incl. tool recipes)
  entities.js     Animated multi-part mobs + AI + combat
  particles.js    Break particles + dropped-item entities
  handview.js     First-person held item/tool, swing, view bobbing
  mobile.js       Touch controls + auto-detection
  save.js         localStorage world persistence (seed + modified chunks)
  audio.js        Procedural sound effects (Web Audio API)
  sky.js          Day/night cycle, sun/moon/stars
  ui.js           HUD, inventory UI, chat, debug overlay
  game.js         Main loop wiring everything together
```
