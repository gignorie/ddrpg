/* ============================================================
   IsometricRenderer - 2.5D isometric projection & Y-sorting
   Diamond grid projection: tile at (x, y) maps to screen coords
   ============================================================ */

const ISO_TILE_W = 64;   // tile width in pixels (diamond width)
const ISO_TILE_H = 32;   // tile height in pixels (diamond half-height)

class IsometricRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camX = 0;       // world (grid) camera offset, in tile units
        this.camY = 0;
        this.viewW = 0;
        this.viewH = 0;
        this.dpr = window.devicePixelRatio || 1;
        this.resize();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.viewW = rect.width;
        this.viewH = rect.height;
        this.canvas.width = Math.floor(rect.width * this.dpr);
        this.canvas.height = Math.floor(rect.height * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.ctx.imageSmoothingEnabled = false;
    }

    // Convert grid (gx, gy) -> screen pixel (sx, sy), centered
    worldToScreen(gx, gy, gz = 0) {
        const sx = (gx - gy) * (ISO_TILE_W / 2) + this.viewW / 2 - this.camX;
        const sy = (gx + gy) * (ISO_TILE_H / 2) + this.viewH / 2 - this.camY - gz * ISO_TILE_H;
        return { sx, sy };
    }

    // Convert screen pixel (sx, sy) -> grid (gx, gy) floor
    screenToWorld(sx, sy) {
        // Inverse the isometric projection
        const ax = sx - this.viewW / 2 + this.camX;
        const ay = sy - this.viewH / 2 + this.camY;
        const gx = (ax / (ISO_TILE_W / 2) + ay / (ISO_TILE_H / 2)) / 2;
        const gy = (ay / (ISO_TILE_H / 2) - ax / (ISO_TILE_W / 2)) / 2;
        return { gx, gy };
    }

    centerOn(gx, gy) {
        // Camera position that puts (gx, gy) in center of view
        // worldToScreen formula: sx = (gx-gy)*32 + viewW/2 - camX
        // set sx = viewW/2, so camX = (gx-gy)*32
        this.camX = (gx - gy) * (ISO_TILE_W / 2);
        this.camY = (gx + gy) * (ISO_TILE_H / 2);
    }

    followSmoothly(targetGx, targetGy, dt) {
        const targetCamX = (targetGx - targetGy) * (ISO_TILE_W / 2);
        const targetCamY = (targetGx + targetGy) * (ISO_TILE_H / 2);
        const lerp = 1 - Math.exp(-8 * dt);
        this.camX += (targetCamX - this.camX) * lerp;
        this.camY += (targetCamY - this.camY) * lerp;
    }

    // Begin a frame: clear with background
    beginFrame() {
        this.ctx.clearRect(0, 0, this.viewW, this.viewH);
    }

    // Draw a diamond (floor) tile
    drawFloorTile(gx, gy, color, variant = 0) {
        const { sx, sy } = this.worldToScreen(gx, gy);
        const ctx = this.ctx;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + ISO_TILE_W / 2, sy + ISO_TILE_H / 2);
        ctx.lineTo(sx, sy + ISO_TILE_H);
        ctx.lineTo(sx - ISO_TILE_W / 2, sy + ISO_TILE_H / 2);
        ctx.closePath();
        ctx.fill();

        // Add a subtle variant pattern (small lines / dots) for visual interest
        if (variant) {
            ctx.strokeStyle = 'rgba(0,0,0,0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (variant === 1) {
                // crack lines
                ctx.moveTo(sx - 10, sy + 6);
                ctx.lineTo(sx + 4, sy + 14);
                ctx.lineTo(sx + 12, sy + 22);
            } else if (variant === 2) {
                // tile seam
                ctx.moveTo(sx - ISO_TILE_W / 2 + 2, sy + ISO_TILE_H / 2);
                ctx.lineTo(sx + ISO_TILE_W / 2 - 2, sy + ISO_TILE_H / 2);
            }
            ctx.stroke();
        }

        // Subtle edge highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + ISO_TILE_W / 2, sy + ISO_TILE_H / 2);
        ctx.stroke();
    }

    // Draw a wall block (taller, for cell walls)
    drawWall(gx, gy, height = 1.5, wallColor = '#3a2a1a', topColor = '#5a4a2e') {
        const baseZ = 0;
        const { sx, sy } = this.worldToScreen(gx, gy, baseZ);
        const topSy = sy - height * ISO_TILE_H;
        const ctx = this.ctx;

        // Front-left face
        ctx.fillStyle = wallColor;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + ISO_TILE_W / 2, sy + ISO_TILE_H / 2);
        ctx.lineTo(sx + ISO_TILE_W / 2, topSy + ISO_TILE_H / 2);
        ctx.lineTo(sx, topSy);
        ctx.closePath();
        ctx.fill();

        // Front-right face (slightly darker)
        ctx.fillStyle = this._darken(wallColor, 0.78);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - ISO_TILE_W / 2, sy + ISO_TILE_H / 2);
        ctx.lineTo(sx - ISO_TILE_W / 2, topSy + ISO_TILE_H / 2);
        ctx.lineTo(sx, topSy);
        ctx.closePath();
        ctx.fill();

        // Top face
        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.moveTo(sx, topSy);
        ctx.lineTo(sx + ISO_TILE_W / 2, topSy + ISO_TILE_H / 2);
        ctx.lineTo(sx, topSy + ISO_TILE_H);
        ctx.lineTo(sx - ISO_TILE_W / 2, topSy + ISO_TILE_H / 2);
        ctx.closePath();
        ctx.fill();

        // Brick lines (subtle)
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        const wallPxH = sy - topSy;
        const courses = Math.max(1, Math.floor(wallPxH / 16));
        for (let i = 1; i < courses; i++) {
            const ratio = i / courses;
            const y = topSy + wallPxH * ratio;
            ctx.beginPath();
            ctx.moveTo(sx - ISO_TILE_W / 2 * (1 - ratio), y);
            ctx.lineTo(sx + ISO_TILE_W / 2 * (1 - ratio), y);
            ctx.stroke();
        }
    }

    // Draw a sprite (character / object) at (gx, gy) with optional z (height)
    drawSprite(gx, gy, sprite, heightOffset = 0, shadowScale = 1) {
        const { sx, sy } = this.worldToScreen(gx, gy, heightOffset);
        const ctx = this.ctx;

        // Shadow ellipse (drawn first, on the ground)
        if (shadowScale > 0) {
            const shadowY = sy + ISO_TILE_H / 2;
            const shadowH = (sprite.h || 48) * 0.18 * shadowScale;
            const shadowW = (sprite.w || 32) * 0.5 * shadowScale;
            const grad = ctx.createRadialGradient(sx, shadowY, 0, sx, shadowY, shadowW);
            grad.addColorStop(0, 'rgba(0,0,0,0.45)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(sx, shadowY, shadowW, shadowH, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw the sprite. sprite.draw(ctx, sx, sy) is the convention
        if (sprite.draw) {
            sprite.draw(ctx, sx, sy);
        } else if (sprite.image) {
            const w = sprite.w || sprite.image.width;
            const h = sprite.h || sprite.image.height;
            ctx.drawImage(sprite.image, sx - w / 2, sy - h);
        }
    }

    // Highlight a tile (hover / target indicator)
    drawTileHighlight(gx, gy, color = 'rgba(201,164,76,0.5)', pulse = 0) {
        const { sx, sy } = this.worldToScreen(gx, gy);
        const ctx = this.ctx;
        const r = ISO_TILE_W / 2;
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + r, sy + ISO_TILE_H / 2);
        ctx.lineTo(sx, sy + ISO_TILE_H);
        ctx.lineTo(sx - r, sy + ISO_TILE_H / 2);
        ctx.closePath();
        ctx.fill();
        if (pulse > 0) {
            const expand = pulse * 6;
            ctx.globalAlpha = 1 - pulse;
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(201,164,76,0.8)';
            ctx.beginPath();
            ctx.moveTo(sx, sy - expand);
            ctx.lineTo(sx + r + expand, sy + ISO_TILE_H / 2);
            ctx.lineTo(sx, sy + ISO_TILE_H + expand);
            ctx.lineTo(sx - r - expand, sy + ISO_TILE_H / 2);
            ctx.closePath();
            ctx.stroke();
        }
        ctx.restore();
    }

    _darken(hex, factor) {
        const c = hex.replace('#', '');
        const r = Math.floor(parseInt(c.substr(0, 2), 16) * factor);
        const g = Math.floor(parseInt(c.substr(2, 2), 16) * factor);
        const b = Math.floor(parseInt(c.substr(4, 2), 16) * factor);
        return `rgb(${r},${g},${b})`;
    }
}

// Export
window.IsometricRenderer = IsometricRenderer;
