/* ============================================================
   WorldGrid - Tile-based world with collision and entities
   Diamond isometric grid. (0,0) is the back corner.
   ============================================================ */

class WorldGrid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        // 0 = floor, 1 = wall, 2 = door (locked gate)
        this.tiles = new Array(width * height).fill(0);
        this.decor = [];     // {x, y, sprite, type} — visual-only decoration (torches, etc.)
        this.objects = [];   // {x, y, sprite, type, solid, item?, onMove?, onTap?, heightOffset?}
        this.entities = [];  // {x, y, sprite, type, ...}
    }

    idx(x, y) { return y * this.width + x; }
    inBounds(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }

    getTile(x, y) {
        if (!this.inBounds(x, y)) return 1; // out of bounds is wall
        return this.tiles[this.idx(x, y)];
    }

    setTile(x, y, v) {
        if (!this.inBounds(x, y)) return;
        this.tiles[this.idx(x, y)] = v;
    }

    isBlocked(x, y) {
        if (!this.inBounds(x, y)) return true;
        if (this.getTile(x, y) === 1) return true; // wall
        // solid objects block
        for (const o of this.objects) {
            if (o.solid && o.x === x && o.y === y) return true;
        }
        return false;
    }

    getObjectAt(x, y) {
        // Stack aware: top item first (last added on top)
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const o = this.objects[i];
            if (o.x === x && o.y === y) return o;
        }
        return null;
    }

    getAllObjectsAt(x, y) {
        return this.objects.filter(o => o.x === x && o.y === y);
    }

    addObject(obj) {
        this.objects.push(obj);
    }

    removeObject(obj) {
        const i = this.objects.indexOf(obj);
        if (i >= 0) this.objects.splice(i, 1);
    }

    // For Y-sorting: returns a combined list of (gx, gy, heightOffset, drawFn)
    getRenderList(camera) {
        const list = [];
        // floor tiles handled separately by renderer (full pass)
        // walls
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.getTile(x, y) === 1) {
                    list.push({ x, y, sort: this._sortKey(x, y, 1.5), kind: 'wall' });
                }
            }
        }
        // decor (visual only, no shadow, lower than objects)
        for (const d of this.decor) {
            // Torches go above the wall height — sort after walls
            const z = d.type === 'torch' ? 1.5 : 0.5;
            list.push({ x: d.x, y: d.y, sort: this._sortKey(d.x, d.y, z), kind: 'decor', obj: d });
        }
        // objects (crates, chests, etc.)
        for (const o of this.objects) {
            const z = (o.stackLevel || 0) * 1.0; // stacking offset
            const sortZ = o.type === 'pickup' ? 0.2 : z + 0.5; // pickups sort lowest
            list.push({ x: o.x, y: o.y, sort: this._sortKey(o.x, o.y, sortZ), kind: 'object', obj: o, heightOffset: z });
        }
        // entities
        for (const e of this.entities) {
            list.push({ x: e.x, y: e.y, sort: this._sortKey(e.x, e.y, 0.6), kind: 'entity', obj: e });
        }
        list.sort((a, b) => a.sort - b.sort);
        return list;
    }

    _sortKey(x, y, zBias) {
        // Y-sort: tiles further "down" the screen (larger x+y) draw later
        // Bias by z so stacked objects draw after base
        return (x + y) * 1000 + zBias * 10;
    }
}

window.WorldGrid = WorldGrid;
