/* ============================================================
   InputManager - Unified touch + mouse + keyboard
   Implements: tap, long-press, drag, joystick
   ============================================================ */

class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.pointers = new Map(); // id -> {sx, sy, startX, startY, startT, moved, target}
        this.pressed = false;
        this.primaryId = null;
        this.tapThreshold = 12;     // px
        this.longPressMs = 350;
        this.longPressTimer = null;
        this.lastTap = null;        // {t, sx, sy}
        this.doubleTapMs = 280;

        // Callbacks
        this.onTap = null;          // (sx, sy) — quick tap
        this.onLongPressStart = null; // (sx, sy)
        this.onLongPressEnd = null;   // (sx, sy, dropped)
        this.onDragStart = null;    // (sx, sy)
        this.onDragMove = null;     // (sx, sy, dx, dy)
        this.onDragEnd = null;      // (sx, sy, dx, dy, dropped)
        this.onHover = null;        // (sx, sy)
        this.onJoystick = null;     // (dx, dy) normalized -1..1
        this.onJoystickEnd = null;  // ()
        this.onSwipe = null;        // (dir)

        this.bind();
    }

    bind() {
        const c = this.canvas;
        c.addEventListener('pointerdown', e => this._down(e), { passive: false });
        c.addEventListener('pointermove', e => this._move(e), { passive: false });
        c.addEventListener('pointerup',   e => this._up(e),   { passive: false });
        c.addEventListener('pointercancel', e => this._up(e), { passive: false });
        c.addEventListener('contextmenu', e => e.preventDefault());
        c.addEventListener('selectstart', e => e.preventDefault());
        c.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
        // Suppress double-tap zoom and other gestures on the canvas
        c.addEventListener('gesturestart', e => e.preventDefault());
        c.addEventListener('gesturechange', e => e.preventDefault());
        c.addEventListener('gestureend', e => e.preventDefault());
    }

    _localXY(e) {
        const r = this.canvas.getBoundingClientRect();
        return { sx: e.clientX - r.left, sy: e.clientY - r.top };
    }

    _down(e) {
        e.preventDefault();
        const { sx, sy } = this._localXY(e);
        if (this.primaryId === null) {
            this.primaryId = e.pointerId;
            this.pointers.set(e.pointerId, {
                sx, sy, startX: sx, startY: sy, startT: performance.now(),
                moved: false, target: null, longPressFired: false,
            });
            this.canvas.setPointerCapture(e.pointerId);
            this._startLongPress(sx, sy);
        }
    }

    _startLongPress(sx, sy) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = setTimeout(() => {
            const p = this.pointers.get(this.primaryId);
            if (p && !p.moved && this.onLongPressStart) {
                p.longPressFired = true;
                this.onLongPressStart(sx, sy);
            }
        }, this.longPressMs);
    }

    _move(e) {
        if (!this.pointers.has(e.pointerId)) return;
        const p = this.pointers.get(e.pointerId);
        const { sx, sy } = this._localXY(e);
        const dx = sx - p.startX, dy = sy - p.startY;
        const dist = Math.hypot(dx, dy);

        if (!p.moved && dist > this.tapThreshold) {
            p.moved = true;
            clearTimeout(this.longPressTimer);
            if (p.longPressFired && this.onLongPressEnd) {
                this.onLongPressEnd(p.startX, p.startY, false);
            }
            if (this.onDragStart) this.onDragStart(p.startX, p.startY, p);
        }

        if (p.moved) {
            if (this.onDragMove) this.onDragMove(sx, sy, dx, dy, p);
        }

        p.sx = sx; p.sy = sy;
    }

    _up(e) {
        if (!this.pointers.has(e.pointerId)) return;
        const p = this.pointers.get(e.pointerId);
        const { sx, sy } = this._localXY(e);
        clearTimeout(this.longPressTimer);

        if (p.moved) {
            const dx = sx - p.startX, dy = sy - p.startY;
            if (this.onDragEnd) this.onDragEnd(sx, sy, dx, dy, p);
        } else {
            // Tap
            if (p.longPressFired) {
                if (this.onLongPressEnd) this.onLongPressEnd(sx, sy, true);
            } else {
                if (this.onTap) this.onTap(sx, sy);
                // Double-tap detection
                if (this.lastTap &&
                    performance.now() - this.lastTap.t < this.doubleTapMs &&
                    Math.hypot(sx - this.lastTap.sx, sy - this.lastTap.sy) < 30) {
                    if (this.onSwipe) this.onSwipe('double-tap');
                }
                this.lastTap = { t: performance.now(), sx, sy };
            }
        }

        this.pointers.delete(e.pointerId);
        if (this.primaryId === e.pointerId) this.primaryId = null;
    }

    // Convert a screen coordinate to local (for outside handlers like UI)
    screenToCanvas(sx, sy) {
        const r = this.canvas.getBoundingClientRect();
        return { sx: sx - r.left, sy: sy - r.top };
    }
}

class Joystick {
    constructor(el, stickEl) {
        this.el = el;
        this.stick = stickEl;
        this.active = false;
        this.pointerId = null;
        this.originX = 0;
        this.originY = 0;
        this.dx = 0; this.dy = 0;
        this.radius = 40;
        this.onChange = null;
        this.onEnd = null;
        this._bind();
    }

    _bind() {
        const start = (e) => {
            e.preventDefault();
            const t = e.touches ? e.touches[0] : e;
            this.pointerId = e.pointerId !== undefined ? e.pointerId : 'touch';
            this.originX = t.clientX;
            this.originY = t.clientY;
            this.active = true;
            if (e.pointerId !== undefined) this.el.setPointerCapture(e.pointerId);
        };
        const move = (e) => {
            if (!this.active) return;
            e.preventDefault();
            const t = e.touches ? e.touches[0] : e;
            let dx = t.clientX - this.originX;
            let dy = t.clientY - this.originY;
            const dist = Math.hypot(dx, dy);
            if (dist > this.radius) {
                dx = (dx / dist) * this.radius;
                dy = (dy / dist) * this.radius;
            }
            this.dx = dx / this.radius;
            this.dy = dy / this.radius;
            this.stick.style.transform = `translate(${dx}px, ${dy}px)`;
            if (this.onChange) this.onChange(this.dx, this.dy);
        };
        const end = (e) => {
            if (!this.active) return;
            this.active = false;
            this.dx = 0; this.dy = 0;
            this.stick.style.transform = 'translate(0, 0)';
            if (this.onEnd) this.onEnd();
        };

        this.el.addEventListener('pointerdown', start);
        this.el.addEventListener('pointermove', move);
        this.el.addEventListener('pointerup', end);
        this.el.addEventListener('pointercancel', end);
        this.el.addEventListener('pointerleave', end);
    }
}

window.InputManager = InputManager;
window.Joystick = Joystick;
