/* ============================================================
   InteractionManager - Tap, drag, path, container, pickup logic
   Bridges input -> world/player/inventory actions.
   ============================================================ */

class InteractionManager {
    constructor(engine) {
        this.engine = engine;
        this.world = engine.world;
        this.player = engine.player;
        this.inv = engine.inventory;
        this.input = engine.input;
        this.renderer = engine.renderer;
        this.pathfinder = new AStarPathfinder(this.world);
        this.activeContainer = null; // {obj, slots, callback}
    }

    // Try to find a free adjacent tile near (tx, ty). Returns {x, y} or null.
    findAdjacentFreeTile(tx, ty) {
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        for (const [dx, dy] of dirs) {
            const nx = tx + dx, ny = ty + dy;
            if (this.world.inBounds(nx, ny) && !this.world.isBlocked(nx, ny)) {
                return { x: nx, y: ny };
            }
        }
        return null;
    }

    // Handle a tap at screen (sx, sy) — returns true if consumed
    handleTap(sx, sy) {
        const { gx, gy } = this.renderer.screenToWorld(sx, sy);
        const tx = Math.floor(gx);
        const ty = Math.floor(gy);

        if (!this.world.inBounds(tx, ty)) return false;

        // Check for a pickup (item on the ground) — pick up immediately
        const pickup = this.world.objects.find(o => o.x === tx && o.y === ty && o.item);
        if (pickup) {
            const added = this.inv.addItem(pickup.item, 1);
            if (added > 0) {
                this.world.removeObject(pickup);
                const def = ITEM_DEFS[pickup.item];
                this.engine.log(`Picked up: ${def.name}`, 'good');
                this.engine.audio.pickup();
            } else {
                this.engine.log(`Inventory full. Cannot pick up: ${ITEM_DEFS[pickup.item].name}`, 'warn');
            }
            return true;
        }

        // If the player is next to a special object, try to interact
        const obj = this.world.getObjectAt(tx, ty);
        if (obj) {
            const adj = this.findAdjacentFreeTile(obj.x, obj.y);
            // If the player stands adjacent, interact directly
            const playerAdj =
                Math.abs(this.player.x - obj.x) + Math.abs(this.player.y - obj.y) === 1;
            if (playerAdj) {
                if (this.tryInteractWith(obj)) return true;
            } else {
                // Walk to adjacent free tile, then interact after arrival
                if (adj) {
                    this.player.moveToTile(adj.x, adj.y, () => {
                        if (this.world.getObjectAt(obj.x, obj.y) === obj) {
                            this.tryInteractWith(obj);
                        }
                    });
                    return true;
                }
            }
        }

        // Walk to tile
        if (!this.world.isBlocked(tx, ty)) {
            this.player.moveToTile(tx, ty);
            return true;
        }
        return false;
    }

    tryInteractWith(obj) {
        if (obj.type === 'chest') {
            this.openContainer(obj);
            return true;
        }
        if (obj.type === 'gate_locked') {
            this.tryUnlockGate(obj);
            return true;
        }
        if (obj.type === 'gate_open') {
            // Walk through
            this.engine.tryEscape();
            return true;
        }
        return false;
    }

    tryUnlockGate(gate) {
        if (this.inv.hasItem('key_iron')) {
            this.inv.consumeItem('key_iron', 1);
            gate.type = 'gate_open';
            gate.sprite = new OpenGateSprite();
            gate.solid = false;
            this.engine.log('Click! The iron key turns and the gate swings open.', 'good');
            this.engine.audio.unlock();
        } else {
            this.engine.log('The gate is locked. You need a key.', 'warn');
        }
    }

    openContainer(obj) {
        if (obj.looted) {
            this.engine.log('The chest is empty.', 'info');
            return;
        }
        this.activeContainer = {
            obj,
            slots: obj.inventory.slice(), // copy
        };
        this.engine.ui.openContainer(this.activeContainer);
    }

    // Move an object on the world map (called by drag handler)
    tryMoveObject(obj, fromX, fromY, toX, toY) {
        if (fromX === toX && fromY === toY) return false;
        // Find any object currently at target
        const destObj = this.world.getObjectAt(toX, toY);
        // Stacking: place on top of a same-type object
        if (destObj && destObj !== obj && destObj.type === obj.type && destObj.stackable) {
            const maxStack = destObj.maxStack || 3;
            const curStack = (destObj.stackLevel || 0) + 1;
            if (curStack < maxStack) {
                // Place this obj on top
                obj.x = toX; obj.y = toY;
                obj.stackLevel = curStack;
                this.engine.audio.move();
                return true;
            }
        }
        // Move to empty spot if not blocked
        if (!this.world.isBlocked(toX, toY) || (destObj && destObj === obj)) {
            obj.x = toX; obj.y = toY;
            obj.stackLevel = 0;
            this.engine.audio.move();
            return true;
        }
        return false;
    }

    // Called when the player moves — check for pickups
    checkPickup() {
        const px = Math.round(this.player.x), py = Math.round(this.player.y);
        // We need to copy because we'll be modifying the array
        const objs = this.world.getAllObjectsAt(px, py).slice();
        for (const o of objs) {
            if (o.item) {
                const added = this.inv.addItem(o.item, 1);
                if (added > 0) {
                    this.world.removeObject(o);
                    const def = ITEM_DEFS[o.item];
                    this.engine.log(`Picked up: ${def.name}`, 'good');
                    this.engine.audio.pickup();
                } else {
                    this.engine.log(`Inventory full. Cannot pick up: ${ITEM_DEFS[o.item].name}`, 'warn');
                    break; // don't keep trying if inv is full
                }
            }
        }
    }
}

// A* pathfinding on the grid
class AStarPathfinder {
    constructor(world) {
        this.world = world;
    }

    find(sx, sy, gx, gy) {
        if (sx === gx && sy === gy) return [];
        if (this.world.isBlocked(gx, gy)) {
            // Try to find a free neighbor
            const adj = this._adjacentFree(gx, gy);
            if (!adj) return null;
            gx = adj.x; gy = adj.y;
        }
        // Binary heap for efficient open set
        const heap = new MinHeap();
        const startNode = { x: sx, y: sy, g: 0, h: this._h(sx, sy, gx, gy), f: 0, parent: null };
        startNode.f = startNode.g + startNode.h;
        heap.push(startNode);
        const closed = new Set();
        const bestG = new Map();
        bestG.set(sx + ',' + sy, 0);

        const limit = 1000;
        let iter = 0;
        while (heap.size() && iter++ < limit) {
            const cur = heap.pop();
            const ckey = cur.x + ',' + cur.y;
            if (cur.x === gx && cur.y === gy) {
                const path = [];
                let c = cur;
                while (c) { path.unshift({ x: c.x, y: c.y }); c = c.parent; }
                return path;
            }
            if (closed.has(ckey)) continue;
            closed.add(ckey);
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                const nx = cur.x + dx, ny = cur.y + dy;
                if (!this.world.inBounds(nx, ny)) continue;
                const nkey = nx + ',' + ny;
                if (closed.has(nkey)) continue;
                if (this.world.isBlocked(nx, ny)) continue;
                const tentativeG = cur.g + 1;
                if (bestG.has(nkey) && bestG.get(nkey) <= tentativeG) continue;
                bestG.set(nkey, tentativeG);
                const node = { x: nx, y: ny, g: tentativeG, h: this._h(nx, ny, gx, gy), f: 0, parent: cur };
                node.f = node.g + node.h;
                heap.push(node);
            }
        }
        return null;
    }

    _h(x, y, gx, gy) { return Math.abs(x - gx) + Math.abs(y - gy); }
    _adjacentFree(x, y) {
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nx = x + dx, ny = y + dy;
            if (this.world.inBounds(nx, ny) && !this.world.isBlocked(nx, ny)) return { x: nx, y: ny };
        }
        return null;
    }
}

// Simple binary min-heap for A* priority queue
class MinHeap {
    constructor() { this.data = []; }
    size() { return this.data.length; }
    push(node) {
        this.data.push(node);
        this._siftUp(this.data.length - 1);
    }
    pop() {
        if (this.data.length === 0) return null;
        const top = this.data[0];
        const last = this.data.pop();
        if (this.data.length > 0) {
            this.data[0] = last;
            this._siftDown(0);
        }
        return top;
    }
    _siftUp(i) {
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.data[i].f < this.data[parent].f) {
                [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
                i = parent;
            } else break;
        }
    }
    _siftDown(i) {
        const n = this.data.length;
        while (true) {
            const l = 2 * i + 1, r = 2 * i + 2;
            let smallest = i;
            if (l < n && this.data[l].f < this.data[smallest].f) smallest = l;
            if (r < n && this.data[r].f < this.data[smallest].f) smallest = r;
            if (smallest !== i) {
                [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
                i = smallest;
            } else break;
        }
    }
}

window.InteractionManager = InteractionManager;
window.AStarPathfinder = AStarPathfinder;
