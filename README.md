# DDRPG — 2.5D Isometric RPG Prototype

A mobile-first isometric dungeon crawler inspired by the deep world interactivity
of *Divine Divinity* (Larian Studios). Built with vanilla JavaScript + HTML5 Canvas.

## Run

```
python3 -m http.server 8080
```

Then open `http://localhost:8080/` in a mobile browser (or a desktop browser
with mobile emulation). The game is optimised for touch screens.

## Controls

| Action | Mobile | Desktop |
|---|---|---|
| Walk | Tap a tile | Tap a tile |
| Drag a movable object | Long-press a crate/barrel/stool, then drag | Long-press + drag |
| Open chest | Walk adjacent + tap | Walk adjacent + tap |
| Use quick-slot item | Tap the slot, or press 1–5 | Press 1–5 |
| Open inventory | Tap 🎒 button | Press `I` |
| Drag item to world | Drag from inventory onto the world | Drag from inventory |
| Action / Use | Tap "USE" button | — |

## Demo Goal

You wake up in a locked cell. To escape:

1. **Tap the chest** (lower-right area) to open it and grab the **Potion**, **Sword** and **Gold**.
2. **Long-press the crate at the back-right** (it has a yellow pulsing glow) and drag it aside to reveal a **hidden Iron Key**.
3. **Walk over the key** to pick it up.
4. **Walk next to the locked iron gate** (right wall) and tap it to unlock it.
5. **Tap the open gate** to walk through and escape.

## Architecture

```
js/
├── Sprites.js            # Procedural sprite definitions (fallback)
├── IsometricRenderer.js  # 2.5D isometric projection + Y-sort
├── WorldGrid.js          # Tile map with collision + object storage
├── InventorySystem.js    # Grid-based inventory + quickslots
├── InputManager.js       # Unified touch/mouse + long-press + drag
├── Player.js             # Player state and path-following
├── AudioManager.js       # Procedural SFX (Web Audio API)
├── InteractionManager.js # Tap → path → interact logic + A* pathfinder
├── UIManager.js          # HUD, inventory, container, tooltips
├── Engine.js             # Top-level coordinator and render loop
├── AssetLoader.js        # Loads PNG atlases asynchronously
└── AtlasAssets.js        # Slices atlas regions into game sprites
assets/
├── world_tileset.png     # Architecture, walls, floor textures
├── floor_tiles.png       # Seamless diamond floor tiles
├── props_columns.png     # Columns, doors, stairs, furniture, chests
├── lights_props.png      # Torches, barrels, crates, bones, decay
└── icons_ui.png          # Item icons, potions, weapons, UI frames
```

## Features Implemented

- **Isometric 2.5D rendering** with diamond grid projection and Y-sorting.
- **Tap-to-move pathfinding** with A* (binary-heap) that respects obstacles and
  wraps around movable objects.
- **Long-press + drag** to pick up and move world objects (crates, barrels, stools).
- **Object stacking** — drop one crate on top of another to stack.
- **Hidden item reveal** — moving a crate exposes a key hidden underneath.
- **Lootable containers** — tap a chest to open a drag-and-drop popup.
- **Item drag-and-drop** — between inventory, quickslots, and the world.
- **Item use/combine** — quickslot potions are consumed; the key is used on the gate.
- **HP / Mana orbs**, **quick-slot bar**, **action button** in a mobile-friendly HUD.
- **Slide-out inventory** with grid slots, item tooltips, stack/equip logic.
- **Virtual joystick** for one-handed movement on mobile.
- **Procedural sound effects** (Web Audio API) — no external files needed.
- **Responsive layout** that adapts to portrait phone, landscape, and desktop.
- **Win condition** with a "FREEDOM!" end screen.

## Tech Highlights

- Single-file game state stored on `window.engine` for easy debugging.
- Y-sort: `(x + y) * 1000 + zBias` ensures objects further "back" are drawn
  first, while stacked objects (positive `zBias`) draw on top.
- Sprites are procedurally drawn once into an offscreen canvas, then composited
  per frame with `drawImage` for performance.
- Generated art atlases (1408×768 PNG) are loaded asynchronously and sliced
  into individual sprites at known cell positions. Procedural sprites remain
  as a fallback if the atlases fail to load.
- Audio context is resumed on the first user gesture to satisfy browser policy.
- Pointer Events API used for unified touch + mouse + pen handling.
- No external dependencies — runs from any static file server.
