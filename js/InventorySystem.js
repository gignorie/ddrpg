/* ============================================================
   InventorySystem - Grid-based inventory with drag-and-drop
   Plus quick-slot bar (5 hotbar slots) and container support.
   ============================================================ */

class InventorySystem {
    constructor(cols = 5, rows = 4) {
        this.cols = cols;
        this.rows = rows;
        this.slots = new Array(cols * rows).fill(null); // {itemId, count, equipped?}
        this.quickSlots = new Array(5).fill(null);
        this.maxStack = 99;
        this.onChange = null;
        this.dragData = null; // { source: 'inv'|'quick'|'world', index, item }
    }

    size() { return this.cols * this.rows; }

    idx(x, y) { return y * this.cols + x; }

    coord(i) { return { x: i % this.cols, y: Math.floor(i / this.cols) }; }

    getSlot(i) { return this.slots[i]; }

    getQuick(i) { return this.quickSlots[i]; }

    setQuick(i, item) {
        this.quickSlots[i] = item;
        this._emit();
    }

    addItem(itemId, count = 1) {
        const def = ITEM_DEFS[itemId];
        if (!def) return 0;
        let remaining = count;

        // First, stack into existing stacks (if stackable)
        if (def.stackable) {
            for (let i = 0; i < this.slots.length && remaining > 0; i++) {
                const s = this.slots[i];
                if (s && s.itemId === itemId && s.count < this.maxStack) {
                    const can = Math.min(this.maxStack - s.count, remaining);
                    s.count += can;
                    remaining -= can;
                }
            }
        }
        // Then, fill empty slots
        for (let i = 0; i < this.slots.length && remaining > 0; i++) {
            if (!this.slots[i]) {
                const add = def.stackable ? Math.min(remaining, this.maxStack) : 1;
                this.slots[i] = { itemId, count: add };
                remaining -= add;
            }
        }
        this._emit();
        return count - remaining; // returns how many were actually added
    }

    removeAt(index, count = 1) {
        const s = this.slots[index];
        if (!s) return 0;
        const removed = Math.min(s.count, count);
        s.count -= removed;
        if (s.count <= 0) this.slots[index] = null;
        this._emit();
        return removed;
    }

    removeQuick(i) {
        const q = this.quickSlots[i];
        if (!q) return 0;
        const removed = Math.min(q.count, 1);
        q.count -= removed;
        if (q.count <= 0) this.quickSlots[i] = null;
        this._emit();
        return removed;
    }

    hasItem(itemId, count = 1) {
        let total = 0;
        for (const s of this.slots) {
            if (s && s.itemId === itemId) total += s.count;
        }
        for (const s of this.quickSlots) {
            if (s && s.itemId === itemId) total += s.count;
        }
        return total >= count;
    }

    consumeItem(itemId, count = 1) {
        let remaining = count;
        for (let i = 0; i < this.slots.length && remaining > 0; i++) {
            const s = this.slots[i];
            if (s && s.itemId === itemId) {
                const r = Math.min(s.count, remaining);
                s.count -= r;
                remaining -= r;
                if (s.count <= 0) this.slots[i] = null;
            }
        }
        for (let i = 0; i < this.quickSlots.length && remaining > 0; i++) {
            const s = this.quickSlots[i];
            if (s && s.itemId === itemId) {
                const r = Math.min(s.count, remaining);
                s.count -= r;
                remaining -= r;
                if (s.count <= 0) this.quickSlots[i] = null;
            }
        }
        this._emit();
        return remaining === 0;
    }

    // Returns first matching index or -1
    findItem(itemId) {
        for (let i = 0; i < this.slots.length; i++) {
            const s = this.slots[i];
            if (s && s.itemId === itemId) return i;
        }
        return -1;
    }

    swapSlots(i, j) {
        const a = this.slots[i];
        const b = this.slots[j];
        this.slots[i] = b;
        this.slots[j] = a;
        this._emit();
    }

    // Move from slot to quick slot
    moveToQuick(invIndex, quickIndex) {
        const s = this.slots[invIndex];
        if (!s) return;
        const existing = this.quickSlots[quickIndex];
        this.quickSlots[quickIndex] = { itemId: s.itemId, count: 1 };
        // If item is non-stackable, decrement from inv
        const def = ITEM_DEFS[s.itemId];
        if (!def.stackable) {
            this.removeAt(invIndex, 1);
        }
        this._emit();
    }

    moveFromQuick(quickIndex, invIndex) {
        const s = this.quickSlots[quickIndex];
        if (!s) return;
        // Move to inventory
        const target = this.slots[invIndex];
        if (!target) {
            this.slots[invIndex] = { itemId: s.itemId, count: 1 };
        } else if (target.itemId === s.itemId) {
            target.count += 1;
        } else {
            // swap
            this.slots[invIndex] = { itemId: s.itemId, count: 1 };
        }
        this.removeQuick(quickIndex, 1);
        this._emit();
    }

    totalCount() {
        let n = 0;
        for (const s of this.slots) if (s) n++;
        return n;
    }

    _emit() {
        if (this.onChange) this.onChange();
    }
}

window.InventorySystem = InventorySystem;
