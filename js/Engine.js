/* ============================================================
   Engine - Top-level coordinator. Wires world, player, input,
   rendering, UI, audio. Owns the main update/render loop.
   ============================================================ */

class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new IsometricRenderer(canvas);
        this.world = new WorldGrid(11, 9);
        this.player = new Player(new PlayerSprite());
        this.player.setPathfinder(new AStarPathfinder(this.world));
        this.inventory = new InventorySystem(5, 4);
        this.audio = new AudioManager();
        this.input = new InputManager(canvas);

        this.dragObject = null;     // currently-dragged world object
        this.hoverTile = null;
        this.lastTime = 0;
        this.running = false;
        this.targetHighlight = null;
        this.pulseT = 0;

        this._setupWorld();
        this._setupInput();
        this._setupUI();
    }

    // ---------- World setup ----------
    _setupWorld() {
        // Build a small dungeon room
        // Tile map: 0=floor, 1=wall, 2=exit (open gate)
        const W = this.world.width, H = this.world.height;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const isEdge = (x === 0 || y === 0 || x === W - 1 || y === H - 1);
                this.world.setTile(x, y, isEdge ? 1 : 0);
            }
        }
        // Carve an entry (top) so the player can walk in (visual opening)
        this.world.setTile(5, 0, 0);
        // The locked iron gate is on the right side — wall with a hole
        // We model it as a regular floor tile but with a "gate" object on top
        // Actually, we'll make the gate take a tile, blocking until opened
        // First, the gate is on the right wall: replace (10, 4) wall with floor, and put a gate there
        this.world.setTile(10, 4, 0); // opening
        // But the gate object itself will block movement
        this.world.addObject({
            x: 10, y: 4,
            type: 'gate_locked',
            sprite: new IronGateSprite(),
            solid: true,
            heightOffset: 0,
        });

        // Floor variants (subtle visual variation)
        this.floorVariants = [];
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                if (this.world.getTile(x, y) === 0) {
                    this.floorVariants.push({ x, y, v: Math.floor(Math.random() * 3) });
                }
            }
        }

        // Decor — torches on walls (placed on inner edge of wall tiles)
        this.world.decor.push({ x: 1, y: 0, sprite: new TorchSprite(), type: 'torch' });
        this.world.decor.push({ x: 9, y: 0, sprite: new TorchSprite(), type: 'torch' });
        this.world.decor.push({ x: 1, y: 8, sprite: new TorchSprite(), type: 'torch' });
        this.world.decor.push({ x: 9, y: 8, sprite: new TorchSprite(), type: 'torch' });

        // Crates (2 movable)
        this.world.addObject({
            x: 4, y: 3,
            type: 'crate',
            sprite: new CrateSprite(),
            solid: true,
            stackable: true,
            maxStack: 3,
            heightOffset: 0,
        });
        // Crate hiding a key underneath
        this.world.addObject({
            x: 7, y: 6,
            type: 'crate',
            sprite: new CrateSprite(),
            solid: true,
            stackable: true,
            maxStack: 3,
            heightOffset: 0,
            hidesItem: 'key_iron',  // when moved, the key is revealed
        });
        // A barrel
        this.world.addObject({
            x: 2, y: 5,
            type: 'barrel',
            sprite: new BarrelSprite(),
            solid: true,
            stackable: false,
        });
        // A stool (decorative movable)
        this.world.addObject({
            x: 6, y: 2,
            type: 'stool',
            sprite: new StoolSprite(),
            solid: true,
            stackable: false,
        });
        // Chest with loot
        const chest = {
            x: 8, y: 4,
            type: 'chest',
            sprite: new ChestSprite(),
            solid: true,
            heightOffset: 0,
            looted: false,
            inventory: [
                { itemId: 'potion_health', count: 1 },
                { itemId: 'sword_iron', count: 1 },
                { itemId: 'gold_coin', count: 5 },
                null, null, null, null, null, null, null, null, null, null
            ],
        };
        this.world.addObject(chest);

        // Start the player at the entry
        this.player.x = 5;
        this.player.y = 1;
        // Center camera on player
        this.renderer.centerOn(this.player.x, this.player.y);
    }

    // ---------- Input wiring ----------
    _setupInput() {
        this.input.onTap = (sx, sy) => {
            // Hide the start screen if visible
            this.ui.showStartScreen(false);
            // If a container is open, ignore world tap (container handles own drag)
            if (this.ui.activeContainer) return;
            // If we were dragging an object, finish the move
            if (this.dragObject) {
                this._finishObjectDrag(sx, sy, true);
                return;
            }
            // If the inventory is open and user taps outside, close it
            if (this.ui.invOpen) {
                this.ui.closeInventory();
                return;
            }
            this.audio.resume();
            this.interaction.handleTap(sx, sy);
        };

        this.input.onLongPressStart = (sx, sy) => {
            // Try to pick up a world object for dragging
            const { gx, gy } = this.renderer.screenToWorld(sx, sy);
            const tx = Math.floor(gx), ty = Math.floor(gy);
            // Check for object at this tile
            const objs = this.world.getAllObjectsAt(tx, ty);
            // pick top movable
            const movable = objs.find(o => o.type === 'crate' || o.type === 'barrel' || o.type === 'stool');
            if (movable) {
                // If it's stacked, top-level only is movable (simplification)
                if (movable.stackLevel && movable.stackLevel > 0) return;
                this.dragObject = movable;
                this.dragOffset = { dx: gx - movable.x, dy: gy - movable.y };
                this.log(`Picked up ${movable.type}. Drag to move.`, 'info');
            }
        };

        this.input.onLongPressEnd = (sx, sy, dropped) => {
            // dropped=false means the long-press transitioned into a drag (don't finalize yet)
            // dropped=true means finger lifted (finalize the move)
            if (this.dragObject && dropped) {
                this._finishObjectDrag(sx, sy, true);
            }
        };

        this.input.onDragStart = (sx, sy) => {
            // If we didn't start an object drag with long-press, this is a camera-drag (handled by view)
            this.dragStartedWorld = true;
        };

        this.input.onDragMove = (sx, sy, dx, dy) => {
            if (this.dragObject) {
                const { gx, gy } = this.renderer.screenToWorld(sx, sy);
                const targetX = Math.floor(gx - this.dragOffset.dx);
                const targetY = Math.floor(gy - this.dragOffset.dy);
                this.dragObjectDragTarget = { x: targetX, y: targetY };
            } else {
                // Pan the camera by drag
                this.renderer.camX -= dx;
                this.renderer.camY -= dy;
                this.cameraManualOffset = true;
                // Reset start so the next move event gives a delta from here
                if (this.input.primaryId !== null) {
                    const p = this.input.pointers.get(this.input.primaryId);
                    if (p) { p.startX = sx; p.startY = sy; }
                }
            }
        };

        this.input.onDragEnd = (sx, sy) => {
            this.dragStartedWorld = false;
            if (this.dragObject) {
                this._finishObjectDrag(sx, sy, true);
            }
        };

        // Joystick
        const joy = new Joystick(
            document.getElementById('joystick'),
            document.querySelector('#joystick .stick')
        );
        joy.onChange = (dx, dy) => {
            if (this.player.moving) return;
            // Convert to grid direction (8-way)
            if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) return;
            let mx = 0, my = 0;
            if (Math.abs(dx) > Math.abs(dy)) {
                mx = dx > 0 ? 1 : -1;
            } else {
                my = dy > 0 ? 1 : -1;
            }
            const tx = Math.round(this.player.x) + mx;
            const ty = Math.round(this.player.y) + my;
            if (this.world.inBounds(tx, ty) && !this.world.isBlocked(tx, ty)) {
                this.player.setPath([{ x: this.player.x, y: this.player.y }, { x: tx, y: ty }], () => {
                    this.interaction.checkPickup();
                });
            }
        };
        this.joystick = joy;
    }

    _finishObjectDrag(sx, sy, dropped) {
        if (!this.dragObject) return;
        const { gx, gy } = this.renderer.screenToWorld(sx, sy);
        const targetX = Math.floor(gx - (this.dragOffset?.dx || 0));
        const targetY = Math.floor(gy - (this.dragOffset?.dy || 0));
        const fromX = this.dragObject.x, fromY = this.dragObject.y;
        if (this.interaction.tryMoveObject(this.dragObject, fromX, fromY, targetX, targetY)) {
            // Reveal hidden item if this was a hiding crate
            if (this.dragObject.hidesItem && this.dragObject.type === 'crate') {
                // After first move, drop the hidden item
                const def = ITEM_DEFS[this.dragObject.hidesItem];
                this.world.addObject({
                    x: fromX, y: fromY,
                    type: 'pickup',
                    sprite: this.makeItemSprite(this.dragObject.hidesItem),
                    item: this.dragObject.hidesItem,
                    solid: false,
                });
                this.dragObject.hidesItem = null;
                this.dragObject.hintShown = true;
                this.log(`A hidden ${def.name} is revealed!`, 'good');
            }
        }
        this.dragObject = null;
        this.dragObjectDragTarget = null;
    }

    // ---------- UI setup ----------
    _setupUI() {
        this.ui = new UIManager(this);
        this.interaction = new InteractionManager(this);
        this.ui.engine = this;
        // Start button
        document.getElementById('start-btn').addEventListener('click', () => {
            this.audio.resume();
            this.ui.showStartScreen(false);
        });
        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'i' || e.key === 'I') { this.ui.toggleInventory(); e.preventDefault(); }
            if (e.key === 'Escape') { this.ui.closeInventory(); this.ui.closeContainer(); }
            if (/^[1-5]$/.test(e.key)) {
                this.ui.useQuickSlot(parseInt(e.key, 10) - 1);
            }
        });
    }

    // Helper to make a sprite instance for a dropped item
    makeItemSprite(itemId) {
        const def = ITEM_DEFS[itemId];
        if (!def) return null;
        const Cls = def.iconClass;
        if (!Cls) return null;
        try { return new Cls(); } catch (e) { return null; }
    }

    // ---------- Drop items to world ----------
    dropItemAtScreen(sx, sy, itemId) {
        const { gx, gy } = this.renderer.screenToWorld(sx, sy);
        const tx = Math.floor(gx), ty = Math.floor(gy);
        if (!this.world.inBounds(tx, ty)) return;
        if (this.world.isBlocked(tx, ty)) return;
        const def = ITEM_DEFS[itemId];
        if (!def) return;
        this.world.addObject({
            x: tx, y: ty,
            type: 'pickup',
            sprite: this.makeItemSprite(itemId),
            item: itemId,
            solid: false,
        });
    }

    dropItemFromInventory(idx) {
        const slot = this.inventory.getSlot(idx);
        if (!slot) return;
        const def = ITEM_DEFS[slot.itemId];
        // Find an empty tile adjacent to player
        const px = Math.round(this.player.x), py = Math.round(this.player.y);
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        let placed = false;
        for (const [dx, dy] of dirs) {
            const tx = px + dx, ty = py + dy;
            if (this.world.inBounds(tx, ty) && !this.world.isBlocked(tx, ty)) {
                this.world.addObject({
                    x: tx, y: ty,
                    type: 'pickup',
                    sprite: this.makeItemSprite(slot.itemId),
                    item: slot.itemId,
                    solid: false,
                });
                this.inventory.removeAt(idx, 1);
                placed = true;
                break;
            }
        }
        if (!placed) this.log('No space to drop here.', 'warn');
    }

    dropItemAtInventoryStack(idx) {
        // Drop a single instance of a stack
        const slot = this.inventory.getSlot(idx);
        if (!slot) return;
        const def = ITEM_DEFS[slot.itemId];
        const px = Math.round(this.player.x), py = Math.round(this.player.y);
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        for (const [dx, dy] of dirs) {
            const tx = px + dx, ty = py + dy;
            if (this.world.inBounds(tx, ty) && !this.world.isBlocked(tx, ty)) {
                this.world.addObject({
                    x: tx, y: ty,
                    type: 'pickup',
                    sprite: this.makeItemSprite(slot.itemId),
                    item: slot.itemId,
                    solid: false,
                });
                this.inventory.removeAt(idx, 1);
                return;
            }
        }
        this.log('No space to drop here.', 'warn');
    }

    log(text, kind = 'info') {
        this.ui.log(text, kind);
    }

    // ---------- Load generated atlas assets ----------
    async loadAtlasAssets() {
        const loader = new AssetLoader();
        const manifest = [
            { path: 'assets/world_tileset.png' },
            { path: 'assets/props_columns.png' },
            { path: 'assets/icons_ui.png' },
            { path: 'assets/floor_tiles.png' },
            { path: 'assets/lights_props.png' },
        ];
        await loader.loadAll(manifest);
        const atlas = new AtlasAssets(loader);
        const ok = atlas.build();
        if (!ok) throw new Error('Atlas build failed');
        this.atlas = atlas;
        this._applyAtlasSprites();
        this.log('Art atlas loaded.', 'good');
    }

    // Replace world object sprites with sliced atlas sprites
    _applyAtlasSprites() {
        const atlas = this.atlas;
        if (!atlas) return;

        // Wall — keep procedural (the atlas walls are decorative, not the corner pillars we use)
        // Floor — use cobblestone variants
        this._atlasFloor = {
            cobble: atlas.get('tile_cobble_moss'),
            cobble2: atlas.get('tile_cobble_2'),
            grate: atlas.get('tile_grate_wet'),
            runic: atlas.get('tile_runic_glow_1'),
            blood: atlas.get('tile_blood_floor'),
        };

        // Player — keep procedural (the atlas is for environment, not characters)
        // Objects
        for (const obj of this.world.objects) {
            if (obj.type === 'crate') {
                const s = atlas.get('crate_iron') || atlas.get('crate_plain');
                if (s) obj.sprite = s;
            } else if (obj.type === 'barrel') {
                const s = atlas.get('barrel_sealed') || atlas.get('barrel_p');
                if (s) obj.sprite = s;
            } else if (obj.type === 'chest') {
                const s = atlas.get('chest_closed_p');
                if (s) obj.sprite = s;
            } else if (obj.type === 'stool') {
                const s = atlas.get('broken_chair') || atlas.get('bench');
                if (s) obj.sprite = s;
            } else if (obj.type === 'gate_locked') {
                const s = atlas.get('door_iron') || atlas.get('door_spiked');
                if (s) obj.sprite = s;
            } else if (obj.type === 'gate_open') {
                // Open gate — atlas doesn't have one, keep procedural
            }
        }

        // Decor torches — use sconce sprites
        for (const d of this.world.decor) {
            if (d.type === 'torch') {
                const s = atlas.get('sconce_1') || atlas.get('sconce_2');
                if (s) d.sprite = s;
            }
        }
    }

    // ---------- Win condition ----------
    tryEscape() {
        // Player must be on the open gate tile to escape
        const gate = this.world.objects.find(o => o.type === 'gate_open');
        if (!gate) return false;
        const px = Math.round(this.player.x), py = Math.round(this.player.y);
        if (px === gate.x && py === gate.y) {
            this._win();
            return true;
        }
        // If they tap the open gate from adjacent, walk onto it
        if (Math.abs(px - gate.x) + Math.abs(py - gate.y) === 1) {
            this.player.moveToTile(gate.x, gate.y, () => this._win());
            return true;
        }
        return false;
    }

    _win() {
        this.log('You escaped the dungeon!', 'good');
        this.audio.win();
        setTimeout(() => this.ui.showWin(), 600);
    }

    // ---------- Main loop ----------
    start() {
        this.running = true;
        this.lastTime = performance.now();
        this._loop();
    }

    _loop() {
        if (!this.running) return;
        const now = performance.now();
        const dt = Math.min(0.05, (now - this.lastTime) / 1000);
        this.lastTime = now;
        this.update(dt);
        this.render();
        requestAnimationFrame(() => this._loop());
    }

    update(dt) {
        const wasMoving = this.player.moving;
        this.player.update(dt);
        this.pulseT += dt;
        // Camera follow: if the player is moving, follow them (overrides manual)
        if (this.player.moving) {
            this.cameraManualOffset = false;
            this.renderer.followSmoothly(this.player.x, this.player.y, dt);
        } else if (!this.cameraManualOffset) {
            this.renderer.followSmoothly(this.player.x, this.player.y, dt);
        }
        // If player is moving along path, do pickup checks at tile-center crossings
        if (this.player.moving) {
            const rx = Math.round(this.player.x), ry = Math.round(this.player.y);
            if (rx !== this._lastPickupTile?.x || ry !== this._lastPickupTile?.y) {
                this._lastPickupTile = { x: rx, y: ry };
                this.interaction.checkPickup();
            }
        } else if (wasMoving && !this.player.moving) {
            // Just stopped: check pickup at final tile
            this.interaction.checkPickup();
        }
        // Pulse target highlight
        if (this.targetHighlight) {
            this.targetHighlight.t += dt;
            if (this.targetHighlight.t > 1) this.targetHighlight = null;
        }
    }

    render() {
        this.renderer.beginFrame();
        const r = this.renderer;

        // 1) Draw all floor tiles
        if (this._atlasFloor && this._atlasFloor.cobble) {
            // Use atlas floor tiles — randomly distribute variants
            for (const fv of this.floorVariants) {
                const variants = [
                    this._atlasFloor.cobble,
                    this._atlasFloor.cobble2,
                    this._atlasFloor.grate,
                    this._atlasFloor.runic,
                    this._atlasFloor.blood,
                ];
                const sprite = variants[fv.v % variants.length];
                if (sprite) {
                    // Draw the atlas tile as a diamond (rotated/positioned)
                    const { sx, sy } = r.worldToScreen(fv.x, fv.y, 0);
                    const ctx = r.ctx;
                    // Diamond shape: (sx, sy) top, etc.
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(sx + 32, sy + 16);
                    ctx.lineTo(sx, sy + 32);
                    ctx.lineTo(sx - 32, sy + 16);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(sprite.canvas, sx - 32, sy - 32, 64, 64);
                    ctx.restore();
                } else {
                    const baseColor = ((fv.x + fv.y) % 2 === 0) ? '#3a322a' : '#36302a';
                    r.drawFloorTile(fv.x, fv.y, baseColor, fv.v);
                }
            }
        } else {
            for (const fv of this.floorVariants) {
                const baseColor = ((fv.x + fv.y) % 2 === 0) ? '#3a322a' : '#36302a';
                r.drawFloorTile(fv.x, fv.y, baseColor, fv.v);
            }
        }

        // 2) Build render list including the player for proper Y-sort
        const list = this.world.getRenderList();
        // Insert the player at the right position
        const playerSortKey = (this.player.x + this.player.y) * 1000 + 0.7;
        const playerItem = { x: this.player.x, y: this.player.y, sort: playerSortKey, kind: 'player' };
        let inserted = false;
        const allItems = [];
        for (const it of list) allItems.push(it);
        for (let i = 0; i < allItems.length; i++) {
            if (playerSortKey < allItems[i].sort) {
                allItems.splice(i, 0, playerItem);
                inserted = true;
                break;
            }
        }
        if (!inserted) allItems.push(playerItem);

        for (const item of allItems) {
            if (item.kind === 'wall') {
                r.drawWall(item.x, item.y, 1.5);
            } else if (item.kind === 'decor') {
                // Decor: draw at wall height (so torches stick out of walls)
                const h = item.obj.type === 'torch' ? 1.5 : 0;
                r.drawSprite(item.x, item.y, item.obj.sprite, h, 0.5);
            } else if (item.kind === 'object') {
                const obj = item.obj;
                if (this.dragObject === obj && this.dragObjectDragTarget) {
                    // Draw original tile as a "ghost" outline
                    r.drawTileHighlight(obj.x, obj.y, 'rgba(255,220,80,0.3)');
                    r.drawSprite(this.dragObjectDragTarget.x, this.dragObjectDragTarget.y, obj.sprite, 0, 1);
                    r.drawTileHighlight(this.dragObjectDragTarget.x, this.dragObjectDragTarget.y, 'rgba(201,164,76,0.45)');
                } else {
                    if (obj.type === 'pickup') {
                        // Dropped items: center on the tile (so it sits on the floor)
                        const { sx, sy } = r.worldToScreen(obj.x, obj.y, 0);
                        if (obj.sprite && obj.sprite.draw) {
                            // Draw shadow first
                            const ctx = r.ctx;
                            const grad = ctx.createRadialGradient(sx, sy + 6, 0, sx, sy + 6, 14);
                            grad.addColorStop(0, 'rgba(0,0,0,0.55)');
                            grad.addColorStop(1, 'rgba(0,0,0,0)');
                            ctx.fillStyle = grad;
                            ctx.beginPath();
                            ctx.ellipse(sx, sy + 6, 14, 5, 0, 0, Math.PI * 2);
                            ctx.fill();
                            // Draw the icon — sprite.draw positions top at sy - h,
                            // so the icon's bottom sits at sy. We want the center of the
                            // icon at the tile's center, which is sy + ISO_TILE_H/2.
                            obj.sprite.draw(r.ctx, sx, sy + 6);
                        }
                    } else {
                        r.drawSprite(obj.x, obj.y, obj.sprite, 0, 1);
                    }
                }
                // Hidden item indicator
                if (obj.hidesItem) {
                    r.drawTileHighlight(obj.x, obj.y, 'rgba(255,220,80,0.4)', (Math.sin(this.pulseT * 3) + 1) * 0.5);
                }
            } else if (item.kind === 'entity') {
                r.drawSprite(item.obj.x, item.obj.y, item.obj.sprite, 0, 1);
            } else if (item.kind === 'player') {
                r.drawSprite(this.player.x, this.player.y, this.player.sprite, 0, 1);
            }
        }

        // 3) Path preview (if any target set)
        if (this.targetHighlight) {
            r.drawTileHighlight(this.targetHighlight.x, this.targetHighlight.y, 'rgba(201,164,76,0.5)', this.targetHighlight.t);
        }

        // 4) Drag-object indicator at original tile (so user sees what's being held)
        if (this.dragObject) {
            r.drawTileHighlight(this.dragObject.x, this.dragObject.y, 'rgba(255,220,80,0.5)');
        }

        // 5) Floor edge vignette: subtle dark corners
        const ctx = r.ctx;
        const grad = ctx.createRadialGradient(r.viewW / 2, r.viewH / 2, r.viewW / 3, r.viewW / 2, r.viewH / 2, r.viewW / 1.2);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.45)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, r.viewW, r.viewH);
    }
}

window.Engine = Engine;
