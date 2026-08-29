/* ============================================================
   AtlasAssets - Slice generated PNG atlases into game sprites
   Each atlas is 1408x768. Sprites are sliced by hand-tuned rects
   based on the actual generated images.
   ============================================================ */

class AtlasAssets {
    constructor(loader) {
        this.loader = loader;
        this.sprites = {};   // name -> sprite
        this.loaded = false;
    }

    // Build all sprites. Must be called after loader has loaded images.
    build() {
        if (!this.loader.images['assets/world_tileset.png']) {
            return false;
        }

        // ---------- World tileset (1408x768) ----------
        // Looking at the image: top row = architecture (4 towers, 3 archways, 1 wall)
        // Approx cell size 176x256, with parchment borders.
        // We'll define regions relative to the parchment grid.

        const T = 'assets/world_tileset.png';
        const ts = this.loader.images[T];

        // Wall segments (top-right region) — 4 wall variants
        // The top-left has 4 towers (large), middle has 3 archways + tomb, right has 1 wall
        // Estimate: each cell is roughly 176x256 starting around y=70

        // Floor tiles (rows 3-4 of tileset) — 8x4 floor variants
        // Row 3 (y~400): cobblestone + bone, cobblestone + weapons, blood floor, plain, runic tile1, runic tile2, runic tile3, runic tile4
        // Row 4 (y~560): green moss, runic green, runic circle, runic detail, 4 corner walls with torch

        // We'll define rough bounds for each cell.
        // Format: { x, y, w, h, name }
        const regions = [
            // Architecture row 1 (y=72-328)
            { path: T, x: 32,   y: 72,  w: 160, h: 256, name: 'tower_1' },
            { path: T, x: 208,  y: 72,  w: 160, h: 256, name: 'tower_2' },
            { path: T, x: 384,  y: 72,  w: 160, h: 256, name: 'tower_3' },
            { path: T, x: 560,  y: 72,  w: 160, h: 256, name: 'tower_4' },
            // Archways
            { path: T, x: 736,  y: 72,  w: 160, h: 256, name: 'arch_1' },
            { path: T, x: 912,  y: 72,  w: 160, h: 256, name: 'arch_2' },
            { path: T, x: 1088, y: 72,  w: 160, h: 256, name: 'arch_3' },
            // Wall
            { path: T, x: 1264, y: 72,  w: 128, h: 256, name: 'wall_seg' },

            // Tomb blocks (middle of second sub-row)
            { path: T, x: 736,  y: 360, w: 160, h: 144, name: 'tomb_1' },
            { path: T, x: 912,  y: 360, w: 160, h: 144, name: 'tomb_2' },
            { path: T, x: 1088, y: 360, w: 160, h: 144, name: 'tomb_3' },
            { path: T, x: 1264, y: 360, w: 128, h: 144, name: 'tomb_4' },

            // Floor row 1 (y=520)
            { path: T, x: 32,   y: 520, w: 160, h: 160, name: 'floor_bone_1' },
            { path: T, x: 208,  y: 520, w: 160, h: 160, name: 'floor_bone_2' },
            { path: T, x: 384,  y: 520, w: 160, h: 160, name: 'floor_blood_1' },
            { path: T, x: 560,  y: 520, w: 160, h: 160, name: 'floor_plain_1' },
            { path: T, x: 736,  y: 520, w: 160, h: 160, name: 'floor_runic_1' },
            { path: T, x: 912,  y: 520, w: 160, h: 160, name: 'floor_runic_2' },
            { path: T, x: 1088, y: 520, w: 160, h: 160, name: 'floor_runic_3' },
            { path: T, x: 1264, y: 520, w: 128, h: 160, name: 'floor_runic_4' },

            // Floor row 2 (y=696) — mossy
            { path: T, x: 32,   y: 696, w: 160, h: 64,  name: 'floor_moss_1' },
            { path: T, x: 208,  y: 696, w: 160, h: 64,  name: 'floor_moss_2' },
            { path: T, x: 384,  y: 696, w: 160, h: 64,  name: 'floor_circle_1' },
            { path: T, x: 560,  y: 696, w: 160, h: 64,  name: 'floor_circle_2' },
            { path: T, x: 736,  y: 696, w: 160, h: 64,  name: 'corner_torch_1' },
            { path: T, x: 912,  y: 696, w: 160, h: 64,  name: 'corner_torch_2' },
            { path: T, x: 1088, y: 696, w: 160, h: 64,  name: 'corner_torch_3' },
            { path: T, x: 1264, y: 696, w: 128, h: 64,  name: 'corner_torch_4' },
        ];

        // ---------- Props & columns (1408x768) ----------
        const P = 'assets/props_columns.png';
        regions.push(
            // Row 1 (y=72): 2 columns, 2 doors, 2 gibbets, 1 rack
            { path: P, x: 32,   y: 72,  w: 160, h: 192, name: 'column_1' },
            { path: P, x: 208,  y: 72,  w: 160, h: 192, name: 'column_2' },
            { path: P, x: 384,  y: 72,  w: 160, h: 192, name: 'door_spiked' },
            { path: P, x: 560,  y: 72,  w: 160, h: 192, name: 'door_iron' },
            { path: P, x: 736,  y: 72,  w: 160, h: 192, name: 'gibbet_empty' },
            { path: P, x: 912,  y: 72,  w: 160, h: 192, name: 'gibbet_skull' },
            { path: P, x: 1088, y: 72,  w: 160, h: 192, name: 'torture_rack' },
            { path: P, x: 1264, y: 72,  w: 128, h: 192, name: 'placeholder_1' },

            // Row 2 (y=296): 2 columns, 2 stairs, bench, altar, chest
            { path: P, x: 32,   y: 296, w: 160, h: 192, name: 'column_3' },
            { path: P, x: 208,  y: 296, w: 160, h: 192, name: 'column_4' },
            { path: P, x: 384,  y: 296, w: 160, h: 192, name: 'stair_1' },
            { path: P, x: 560,  y: 296, w: 160, h: 192, name: 'stair_2' },
            { path: P, x: 736,  y: 296, w: 160, h: 192, name: 'bench' },
            { path: P, x: 912,  y: 296, w: 160, h: 192, name: 'altar' },
            { path: P, x: 1088, y: 296, w: 160, h: 192, name: 'chest_closed_p' },
            { path: P, x: 1264, y: 296, w: 128, h: 192, name: 'placeholder_2' },

            // Row 3 (y=520): 2 lanterns, 2 gargoyles, chest, chest open, wardrobe
            { path: P, x: 32,   y: 520, w: 160, h: 192, name: 'lantern_1' },
            { path: P, x: 208,  y: 520, w: 160, h: 192, name: 'lantern_2' },
            { path: P, x: 384,  y: 520, w: 160, h: 192, name: 'gargoyle_1' },
            { path: P, x: 560,  y: 520, w: 160, h: 192, name: 'gargoyle_2' },
            { path: P, x: 736,  y: 520, w: 160, h: 192, name: 'barrel_p' },
            { path: P, x: 912,  y: 520, w: 160, h: 192, name: 'chest_open_p' },
            { path: P, x: 1088, y: 520, w: 160, h: 192, name: 'wardrobe' },
            { path: P, x: 1264, y: 520, w: 128, h: 192, name: 'placeholder_3' },
        );

        // ---------- Icons & UI (1408x768) ----------
        const I = 'assets/icons_ui.png';
        regions.push(
            // Row 1 — weapons/shields (y=40, h=180)
            { path: I, x: 32,   y: 40,  w: 160, h: 180, name: 'icon_longsword' },
            { path: I, x: 208,  y: 40,  w: 160, h: 180, name: 'icon_dagger' },
            { path: I, x: 384,  y: 40,  w: 160, h: 180, name: 'icon_runic_sword' },
            { path: I, x: 560,  y: 40,  w: 160, h: 180, name: 'icon_scimitar' },
            { path: I, x: 736,  y: 40,  w: 160, h: 180, name: 'icon_shield_wood' },
            { path: I, x: 912,  y: 40,  w: 160, h: 180, name: 'icon_shield_iron' },
            { path: I, x: 1088, y: 40,  w: 160, h: 180, name: 'icon_shield_heraldic' },
            { path: I, x: 1264, y: 40,  w: 128, h: 180, name: 'icon_shield_purple' },

            // Row 2 — armor, bows, potions, gold, books, scrolls (y=240)
            { path: I, x: 32,   y: 240, w: 160, h: 180, name: 'icon_helm' },
            { path: I, x: 208,  y: 240, w: 160, h: 180, name: 'icon_horned_helm' },
            { path: I, x: 384,  y: 240, w: 160, h: 180, name: 'icon_bow' },
            { path: I, x: 560,  y: 240, w: 160, h: 180, name: 'icon_crossbow' },
            { path: I, x: 736,  y: 240, w: 160, h: 180, name: 'icon_potion_hp' },
            { path: I, x: 912,  y: 240, w: 160, h: 180, name: 'icon_potion_mana' },
            { path: I, x: 1088, y: 240, w: 160, h: 180, name: 'icon_spellbook' },
            { path: I, x: 1264, y: 240, w: 128, h: 180, name: 'icon_scroll' },

            // Row 3 — UI (y=440)
            { path: I, x: 32,   y: 440, w: 160, h: 200, name: 'ui_portrait_frame' },
            { path: I, x: 208,  y: 440, w: 160, h: 200, name: 'ui_orbs' },
            { path: I, x: 384,  y: 440, w: 160, h: 200, name: 'ui_inventory_banner' },
            { path: I, x: 560,  y: 440, w: 160, h: 200, name: 'ui_minimap' },
            { path: I, x: 736,  y: 440, w: 160, h: 200, name: 'ui_dialog' },
        );

        // ---------- Floor tiles (1408x768) ----------
        const F = 'assets/floor_tiles.png';
        regions.push(
            { path: F, x: 32,   y: 72,  w: 160, h: 160, name: 'tile_cobble_moss' },
            { path: F, x: 208,  y: 72,  w: 160, h: 160, name: 'tile_grate_wet' },
            { path: F, x: 384,  y: 72,  w: 160, h: 160, name: 'tile_runic_glow_1' },
            { path: F, x: 560,  y: 72,  w: 160, h: 160, name: 'tile_blood_floor' },
            { path: F, x: 736,  y: 72,  w: 160, h: 160, name: 'tile_cobble_2' },
            { path: F, x: 912,  y: 72,  w: 160, h: 160, name: 'tile_grate_2' },
            { path: F, x: 1088, y: 72,  w: 160, h: 160, name: 'tile_runic_glow_2' },
            { path: F, x: 1264, y: 72,  w: 128, h: 160, name: 'tile_blood_2' },
        );

        // ---------- Lights & props (1408x768) ----------
        const L = 'assets/lights_props.png';
        regions.push(
            // Top row lights
            { path: L, x: 32,   y: 72,  w: 160, h: 160, name: 'sconce_1' },
            { path: L, x: 208,  y: 72,  w: 160, h: 160, name: 'sconce_2' },
            { path: L, x: 384,  y: 72,  w: 160, h: 160, name: 'sconce_3' },
            { path: L, x: 560,  y: 72,  w: 160, h: 160, name: 'sconce_4' },
            { path: L, x: 736,  y: 72,  w: 160, h: 160, name: 'brazier_1' },
            { path: L, x: 912,  y: 72,  w: 160, h: 160, name: 'brazier_2' },
            { path: L, x: 1088, y: 72,  w: 160, h: 160, name: 'chandelier' },
            { path: L, x: 1264, y: 72,  w: 128, h: 160, name: 'crystal_1' },

            // Middle props
            { path: L, x: 32,   y: 280, w: 160, h: 160, name: 'barrel_sealed' },
            { path: L, x: 208,  y: 280, w: 160, h: 160, name: 'barrel_broken' },
            { path: L, x: 384,  y: 280, w: 160, h: 160, name: 'crate_plain' },
            { path: L, x: 560,  y: 280, w: 160, h: 160, name: 'crate_iron' },
            { path: L, x: 736,  y: 280, w: 160, h: 160, name: 'book_stack' },
            { path: L, x: 912,  y: 280, w: 160, h: 160, name: 'weapon_pile' },
            { path: L, x: 1088, y: 280, w: 160, h: 160, name: 'mushroom' },
            { path: L, x: 1264, y: 280, w: 128, h: 160, name: 'broken_chair' },

            // Bottom row decay
            { path: L, x: 32,   y: 488, w: 160, h: 160, name: 'cobweb_1' },
            { path: L, x: 208,  y: 488, w: 160, h: 160, name: 'cobweb_2' },
            { path: L, x: 384,  y: 488, w: 160, h: 160, name: 'bone_pile' },
            { path: L, x: 560,  y: 488, w: 160, h: 160, name: 'skull' },
            { path: L, x: 736,  y: 488, w: 160, h: 160, name: 'cloak' },
            { path: L, x: 912,  y: 488, w: 160, h: 160, name: 'statue_fragment' },
            { path: L, x: 1088, y: 488, w: 160, h: 160, name: 'tree_root' },
            { path: L, x: 1264, y: 488, w: 128, h: 160, name: 'crystal_2' },
        );

        // Slice all regions
        for (const r of regions) {
            const img = this.loader.images[r.path];
            if (!img) continue;
            const canvas = document.createElement('canvas');
            canvas.width = r.w;
            canvas.height = r.h;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
            const w = r.w, h = r.h;
            this.sprites[r.name] = {
                canvas, w: r.w, h: r.h,
                draw(ctx2, sx, sy) { ctx2.drawImage(canvas, sx - w / 2, sy - h); }
            };
        }

        this.loaded = true;
        return true;
    }

    get(name) {
        return this.sprites[name];
    }
}

window.AtlasAssets = AtlasAssets;
