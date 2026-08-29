/* ============================================================
   Player - Movement, pathing, state
   ============================================================ */

class Player {
    constructor(sprite) {
        this.sprite = sprite;
        this.x = 1;
        this.y = 1;
        this.hp = 100;
        this.maxHp = 100;
        this.mana = 50;
        this.maxMana = 50;
        this.facing = 's'; // direction
        this.path = [];        // [{x,y}, ...]
        this.pathIndex = 0;
        this.moveSpeed = 4.5;  // tiles per second
        this.moving = false;
        this.onArrive = null;
        this.onMoveStep = null;
    }

    // Smooth move along path
    update(dt) {
        if (!this.path.length || this.pathIndex >= this.path.length) {
            this.moving = false;
            return;
        }
        this.moving = true;
        const target = this.path[this.pathIndex];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);
        const step = this.moveSpeed * dt;
        if (step >= dist) {
            this.x = target.x;
            this.y = target.y;
            this.pathIndex++;
            if (this.onMoveStep) this.onMoveStep(this.x, this.y);
            if (this.pathIndex >= this.path.length) {
                this.moving = false;
                const cb = this.onArrive;
                this.onArrive = null;
                if (cb) cb();
            }
        } else {
            this.x += (dx / dist) * step;
            this.y += (dy / dist) * step;
            if (Math.abs(dx) > Math.abs(dy)) {
                this.facing = dx > 0 ? 'e' : 'w';
            } else {
                this.facing = dy > 0 ? 's' : 'n';
            }
        }
    }

    setPath(path, onArrive) {
        this.path = path;
        this.pathIndex = 0;
        this.onArrive = onArrive;
    }

    cancelPath() {
        this.path = [];
        this.pathIndex = 0;
        this.moving = false;
        this.onArrive = null;
    }

    moveToTile(tx, ty, onArrive) {
        // Round current pos for path
        const fromX = Math.round(this.x);
        const fromY = Math.round(this.y);
        // If we're already at the target (snapped to tile), just fire callback
        if (fromX === tx && fromY === ty && !this.moving) {
            if (onArrive) onArrive();
            return;
        }
        const path = this.pathfinder.find(fromX, fromY, tx, ty);
        if (path && path.length > 1) {
            this.setPath(path, onArrive);
        } else if (path && path.length === 1) {
            this.x = tx; this.y = ty;
            this.moving = false;
            if (onArrive) onArrive();
        } else {
            // No path found
            if (onArrive) onArrive();
        }
    }

    setPathfinder(pf) {
        this.pathfinder = pf;
    }
}

window.Player = Player;
