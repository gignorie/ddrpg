/* ============================================================
   AssetLoader - Loads generated PNG atlases and slices them
   into individual sprites at known cell positions.
   ============================================================ */

class AssetLoader {
    constructor() {
        this.images = {};  // path -> HTMLImageElement
        this.sliced = {};  // name -> Sprite (offscreen canvas with sub-image)
        this.loaded = false;
    }

    // Load a list of images. Returns a Promise.
    loadAll(manifest) {
        const promises = manifest.map(item => this.loadImage(item.path).then(() => {
            this.images[item.path] = item;
        }));
        return Promise.all(promises);
    }

    loadImage(path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => { this.images[path] = img; resolve(img); };
            img.onerror = (e) => reject(new Error('Failed to load ' + path));
            img.src = path;
        });
    }

    // Slice a rectangular region from a loaded image and return a Sprite
    slice(imagePath, x, y, w, h, padding = 0) {
        const img = this.images[imagePath];
        if (!img) return null;
        // Create a new sprite canvas of size (w, h)
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
        return this._canvasToSprite(canvas, w, h);
    }

    // Slice a grid of cells from an image
    sliceGrid(imagePath, startX, startY, cellW, cellH, cols, rows, gapX = 0, gapY = 0) {
        const result = [];
        for (let r = 0; r < rows; r++) {
            const row = [];
            for (let c = 0; c < cols; c++) {
                const x = startX + c * (cellW + gapX);
                const y = startY + r * (cellH + gapY);
                row.push(this.slice(imagePath, x, y, cellW, cellH));
            }
            result.push(row);
        }
        return result;
    }

    _canvasToSprite(canvas, w, h) {
        return {
            canvas,
            w, h,
            draw(ctx, sx, sy) {
                ctx.drawImage(canvas, sx - w / 2, sy - h);
            }
        };
    }
}

window.AssetLoader = AssetLoader;
