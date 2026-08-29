/* ============================================================
   UIManager - DOM HUD, inventory panel, container popup
   Wires the InventorySystem to the on-screen widgets.
   ============================================================ */

class UIManager {
    constructor(engine) {
        this.engine = engine;
        this.inv = engine.inventory;
        this.player = engine.player;

        // Elements
        this.els = {
            startScreen: document.getElementById('start-screen'),
            startBtn: document.getElementById('start-btn'),
            inventory: document.getElementById('inventory'),
            invGrid: document.getElementById('inv-grid'),
            invClose: document.getElementById('inv-close'),
            invBtn: document.getElementById('inv-btn'),
            container: document.getElementById('container'),
            containerGrid: document.getElementById('container-grid'),
            containerTitle: document.getElementById('container-title'),
            takeAll: document.getElementById('take-all'),
            containerClose: document.getElementById('container-close'),
            quickslots: document.getElementById('quickslots'),
            hpOrb: document.querySelector('.orb.hp .fill'),
            hpLabel: document.querySelector('.orb.hp .label'),
            manaOrb: document.querySelector('.orb.mana .fill'),
            manaLabel: document.querySelector('.orb.mana .label'),
            log: document.getElementById('log'),
            tooltip: document.getElementById('tooltip'),
            actionBtn: document.getElementById('action-btn'),
            winScreen: document.getElementById('win-screen'),
            winRestart: document.getElementById('win-restart'),
        };

        this.invOpen = false;
        this.activeContainer = null;
        this.drag = null; // {src:'inv'|'quick'|'container', idx, item}

        this._buildInventoryGrid();
        this._buildQuickSlots();
        this._bind();
        this.inv.onChange = () => { this._renderInventory(); this._renderQuickSlots(); };
        this._renderInventory();
        this._renderQuickSlots();
        this._renderOrbs();
    }

    _bind() {
        this.els.invBtn.addEventListener('click', () => this.toggleInventory());
        this.els.invClose.addEventListener('click', () => this.closeInventory());
        this.els.takeAll.addEventListener('click', () => this._takeAllFromContainer());
        this.els.containerClose.addEventListener('click', () => this.closeContainer());
        this.els.actionBtn.addEventListener('click', () => this._onActionButton());
        this.els.winRestart.addEventListener('click', () => location.reload());
    }

    showStartScreen(show) {
        this.els.startScreen.classList.toggle('hide', !show);
    }

    toggleInventory() {
        if (this.invOpen) this.closeInventory();
        else this.openInventory();
    }

    openInventory() {
        this.invOpen = true;
        this.els.inventory.classList.add('open');
        this._renderInventory();
    }

    closeInventory() {
        this.invOpen = false;
        this.els.inventory.classList.remove('open');
    }

    _buildInventoryGrid() {
        this.els.invGrid.innerHTML = '';
        for (let i = 0; i < this.inv.size(); i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            slot.dataset.idx = i;
            slot.addEventListener('pointerdown', (e) => this._invPointerDown(e, i));
            this.els.invGrid.appendChild(slot);
        }
    }

    _buildQuickSlots() {
        this.els.quickslots.innerHTML = '';
        for (let i = 0; i < this.inv.quickSlots.length; i++) {
            const slot = document.createElement('div');
            slot.className = 'qslot';
            slot.dataset.idx = i;
            slot.innerHTML = `<div class="key">${i + 1}</div>`;
            slot.addEventListener('pointerdown', (e) => this._quickPointerDown(e, i));
            this.els.quickslots.appendChild(slot);
        }
    }

    _itemEl(item) {
        if (!item) return '';
        const def = ITEM_DEFS[item.itemId];
        // If atlas is loaded, use sprite rendering via background-image
        let iconHtml = '';
        if (this.engine.atlas && def.atlasKey) {
            const sprite = this.engine.atlas.get(def.atlasKey);
            if (sprite) {
                // Set as background using data URL of the sprite canvas
                try {
                    const dataUrl = sprite.canvas.toDataURL('image/png');
                    iconHtml = `<div class="item-icon" style="background-image:url('${dataUrl}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>`;
                } catch (e) {
                    iconHtml = `<div class="item-icon">${def.emoji}</div>`;
                }
            } else {
                iconHtml = `<div class="item-icon">${def.emoji}</div>`;
            }
        } else {
            iconHtml = `<div class="item-icon">${def.emoji}</div>`;
        }
        return iconHtml + (item.count > 1 ? `<div class="count">${item.count}</div>` : '');
    }

    _renderInventory() {
        const slots = this.els.invGrid.children;
        for (let i = 0; i < this.inv.size(); i++) {
            const s = this.inv.getSlot(i);
            slots[i].innerHTML = '';
            slots[i].classList.toggle('filled', !!s);
            if (s) slots[i].innerHTML = this._itemEl(s);
        }
    }

    _renderQuickSlots() {
        const slots = this.els.quickslots.children;
        for (let i = 0; i < this.inv.quickSlots.length; i++) {
            const s = this.inv.getQuick(i);
            slots[i].innerHTML = `<div class="key">${i + 1}</div>`;
            slots[i].classList.toggle('filled', !!s);
            if (s) {
                const def = ITEM_DEFS[s.itemId];
                slots[i].innerHTML = `<div class="key">${i + 1}</div><div class="item-icon">${def.emoji}</div><div class="count">${s.count}</div>`;
            }
        }
    }

    _renderOrbs() {
        const hpPct = (this.player.hp / this.player.maxHp) * 100;
        const manaPct = (this.player.mana / this.player.maxMana) * 100;
        this.els.hpOrb.style.height = hpPct + '%';
        this.els.manaOrb.style.height = manaPct + '%';
        this.els.hpLabel.textContent = Math.ceil(this.player.hp);
        this.els.manaLabel.textContent = Math.ceil(this.player.mana);
    }

    // ---------- Drag and drop for inventory ----------
    _invPointerDown(e, idx) {
        const slot = this.inv.getSlot(idx);
        if (!slot) return;
        e.preventDefault();
        this._startDrag('inv', idx, slot, e);
    }

    _quickPointerDown(e, idx) {
        const slot = this.inv.getQuick(idx);
        if (!slot) return;
        e.preventDefault();
        this._startDrag('quick', idx, slot, e);
    }

    _startDrag(src, idx, item, e) {
        this.drag = { src, idx, item: { ...item }, offsetX: 0, offsetY: 0 };
        // Create a floating ghost
        const ghost = document.createElement('div');
        ghost.id = 'drag-ghost';
        const def = ITEM_DEFS[item.itemId];
        ghost.innerHTML = `<div class="item-icon" style="font-size:32px;">${def.emoji}</div>${item.count > 1 ? `<div class="count">${item.count}</div>` : ''}`;
        ghost.style.cssText = `
            position: fixed; pointer-events: none; z-index: 1000;
            width: 48px; height: 48px;
            background: rgba(60,45,25,0.9); border: 1px solid #c9a44c;
            border-radius: 4px; display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.6);
            left: 0; top: 0;
        `;
        document.body.appendChild(ghost);
        this.drag.ghost = ghost;
        this._moveGhost(e.clientX, e.clientY);

        const onMove = (ev) => {
            this._moveGhost(ev.clientX, ev.clientY);
            this._highlightDropTarget(ev.clientX, ev.clientY);
        };
        const onUp = (ev) => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            this._endDrag(ev.clientX, ev.clientY);
        };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    }

    _moveGhost(cx, cy) {
        if (!this.drag) return;
        const g = this.drag.ghost;
        if (g) g.style.transform = `translate(${cx - 24}px, ${cy - 24}px)`;
    }

    _highlightDropTarget(cx, cy) {
        // clear previous
        document.querySelectorAll('.inv-slot.dragover').forEach(el => el.classList.remove('dragover'));
        const el = document.elementFromPoint(cx, cy);
        if (el && el.classList && el.classList.contains('inv-slot')) {
            el.classList.add('dragover');
        }
    }

    _endDrag(cx, cy) {
        if (this.drag) {
            if (this.drag.ghost) this.drag.ghost.remove();
        }
        document.querySelectorAll('.inv-slot.dragover').forEach(el => el.classList.remove('dragover'));
        if (!this.drag) return;

        const el = document.elementFromPoint(cx, cy);
        if (!el) { this.drag = null; return; }

        // Drop on inventory slot
        if (el.classList.contains('inv-slot')) {
            const targetIdx = parseInt(el.dataset.idx, 10);
            this._dropOnInv(targetIdx);
        }
        // Drop on quickbar
        else if (el.classList.contains('qslot')) {
            const targetIdx = parseInt(el.dataset.idx, 10);
            this._dropOnQuick(targetIdx);
        }
        // Drop on canvas (drop to world)
        else if (el.id === 'game-canvas' || el.tagName === 'CANVAS') {
            this._dropOnWorld(cx, cy);
        }
        this.drag = null;
    }

    _dropOnInv(targetIdx) {
        const { src, idx, item } = this.drag;
        if (src === 'inv') {
            if (idx === targetIdx) return;
            // swap or stack
            const target = this.inv.getSlot(targetIdx);
            if (!target) {
                this.inv.slots[targetIdx] = { ...item };
                this.inv.slots[idx] = null;
            } else if (target.itemId === item.itemId && ITEM_DEFS[item.itemId].stackable) {
                target.count += item.count;
                this.inv.slots[idx] = null;
            } else {
                this.inv.swapSlots(idx, targetIdx);
            }
            this.inv._emit();
            this.engine.audio.move();
        } else if (src === 'quick') {
            this.inv.moveFromQuick(idx, targetIdx);
        } else if (src === 'container') {
            this._moveContainerToInv(idx, targetIdx);
        }
    }

    _dropOnQuick(targetIdx) {
        const { src, idx, item } = this.drag;
        if (src === 'inv') {
            this.inv.moveToQuick(idx, targetIdx);
        } else if (src === 'quick') {
            // swap quickslots
            const a = this.inv.quickSlots[idx];
            const b = this.inv.quickSlots[targetIdx];
            this.inv.quickSlots[idx] = b;
            this.inv.quickSlots[targetIdx] = a;
            this.inv._emit();
        }
    }

    _dropOnWorld(cx, cy) {
        const { src, idx, item } = this.drag;
        if (src === 'quick') {
            // drop a single instance from quickslot into world
            const r = this.engine.canvas.getBoundingClientRect();
            const sx = cx - r.left, sy = cy - r.top;
            this.engine.dropItemAtScreen(sx, sy, item.itemId);
            this.inv.removeQuick(idx, 1);
            this.engine.audio.drop();
        } else if (src === 'inv') {
            // drop a single instance from inventory
            const def = ITEM_DEFS[item.itemId];
            if (def.stackable) {
                this.engine.dropItemAtInventoryStack(idx);
            } else {
                this.engine.dropItemFromInventory(idx);
            }
            this.engine.audio.drop();
        }
    }

    // ---------- Container popup ----------
    openContainer(container) {
        this.activeContainer = container;
        this.els.container.classList.add('open');
        this.els.containerTitle.textContent = 'Wooden Chest';
        this._renderContainer();
    }

    closeContainer() {
        this.els.container.classList.remove('open');
        if (this.activeContainer) {
            // If all slots are empty, mark as looted
            const allEmpty = this.activeContainer.slots.every(s => !s);
            if (allEmpty) {
                this.activeContainer.obj.looted = true;
            }
        }
        this.activeContainer = null;
    }

    _renderContainer() {
        if (!this.activeContainer) return;
        this.els.containerGrid.innerHTML = '';
        const slots = this.activeContainer.slots;
        // Always 12 slots (4x3)
        const total = 12;
        for (let i = 0; i < total; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            slot.dataset.idx = i;
            const item = slots[i];
            if (item) {
                slot.classList.add('filled');
                const def = ITEM_DEFS[item.itemId];
                slot.innerHTML = `<div class="item-icon">${def.emoji}</div>${item.count > 1 ? `<div class="count">${item.count}</div>` : ''}`;
                // Hint: "Tap to take, drag to move"
                slot.title = 'Tap to take · drag to move';
            }
            // pointerdown starts a drag OR a tap-to-take
            slot.addEventListener('pointerdown', (e) => {
                if (!item) return;
                e.preventDefault();
                this._containerSlotDown(i, item, e);
            });
            slot.addEventListener('pointermove', (e) => {
                if (!item) return;
                this._showItemTooltip(item, e.clientX, e.clientY);
            });
            slot.addEventListener('pointerleave', () => this._hideTooltip());
            this.els.containerGrid.appendChild(slot);
        }
    }

    // Distinguish tap vs long-press in container slot
    _containerSlotDown(idx, item, e) {
        const startX = e.clientX, startY = e.clientY;
        const t = setTimeout(() => {
            // Long-press: start drag-to-move
            this._containerLongPress = true;
            this._startContainerDrag(idx, item, e);
        }, 250);
        const onMove = (ev) => {
            const dx = ev.clientX - startX, dy = ev.clientY - startY;
            if (Math.hypot(dx, dy) > 8) {
                // Became a drag — start drag immediately
                clearTimeout(t);
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                if (!this._containerLongPress) this._startContainerDrag(idx, item, e);
            }
        };
        const onUp = (ev) => {
            clearTimeout(t);
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            if (!this._containerLongPress && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 8) {
                // It was a quick tap — take one to inventory
                this._takeOneFromContainer(idx);
            }
            this._containerLongPress = false;
        };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    }

    _takeOneFromContainer(fromIdx) {
        const container = this.activeContainer;
        if (!container) return;
        const slots = container.slots;
        const original = container.obj.inventory;
        const item = slots[fromIdx];
        if (!item) return;
        const added = this.inv.addItem(item.itemId, 1);
        if (added === 0) {
            this.engine.log('Inventory full.', 'warn');
            return;
        }
        // Decrement the container slot in BOTH copy and original
        const newCount = item.count - 1;
        if (newCount <= 0) {
            slots[fromIdx] = null;
            original[fromIdx] = null;
        } else {
            slots[fromIdx] = { itemId: item.itemId, count: newCount };
            original[fromIdx] = { itemId: item.itemId, count: newCount };
        }
        this.inv._emit();
        this._renderContainer();
        this.engine.audio.pickup();
        if (slots.every(s => !s)) {
            this.closeContainer();
        }
    }

    _startContainerDrag(idx, item, e) {
        this.drag = { src: 'container', idx, item: { ...item } };
        const ghost = document.createElement('div');
        ghost.id = 'drag-ghost';
        const def = ITEM_DEFS[item.itemId];
        ghost.innerHTML = `<div class="item-icon" style="font-size:28px;">${def.emoji}</div>${item.count > 1 ? `<div class="count">${item.count}</div>` : ''}`;
        ghost.style.cssText = `
            position: fixed; pointer-events: none; z-index: 1000;
            width: 44px; height: 44px;
            background: rgba(60,45,25,0.9); border: 1px solid #c9a44c;
            border-radius: 4px; display: flex; align-items: center; justify-content: center;
            left: 0; top: 0;
        `;
        document.body.appendChild(ghost);
        this.drag.ghost = ghost;
        this._moveGhost(e.clientX, e.clientY);
        const onMove = (ev) => {
            this._moveGhost(ev.clientX, ev.clientY);
            this._highlightDropTarget(ev.clientX, ev.clientY);
        };
        const onUp = (ev) => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            this._endContainerDrag(ev.clientX, ev.clientY);
        };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    }

    _endContainerDrag(cx, cy) {
        if (this.drag && this.drag.ghost) this.drag.ghost.remove();
        document.querySelectorAll('.inv-slot.dragover').forEach(el => el.classList.remove('dragover'));
        if (!this.drag) return;
        const { idx, item } = this.drag;
        const el = document.elementFromPoint(cx, cy);
        if (!el) { this.drag = null; return; }
        if (el.classList.contains('inv-slot')) {
            const targetIdx = parseInt(el.dataset.idx, 10);
            if (this.els.containerGrid.contains(el)) {
                this._moveContainerSlot(idx, targetIdx, item);
            } else {
                this._moveContainerToInv(idx, targetIdx);
            }
        } else if (el.classList.contains('qslot')) {
            const targetIdx = parseInt(el.dataset.idx, 10);
            this._moveContainerToQuick(idx, targetIdx);
        }
        this.drag = null;
    }

    _moveContainerSlot(from, to, item) {
        const container = this.activeContainer;
        if (!container) return;
        const slots = container.slots;
        const original = container.obj.inventory;
        if (from === to) return;
        const target = slots[to];
        const targetOrig = original[to];
        if (!target) {
            slots[to] = { ...item };
            original[to] = { ...item };
            slots[from] = null;
            original[from] = null;
        } else if (target.itemId === item.itemId && ITEM_DEFS[item.itemId].stackable) {
            const newCount = target.count + item.count;
            target.count = newCount;
            targetOrig.count = newCount;
            slots[from] = null;
            original[from] = null;
        } else {
            // swap
            slots[to] = { ...item };
            slots[from] = target;
            original[to] = { ...item };
            original[from] = { ...target };
        }
        this._renderContainer();
        this.engine.audio.move();
    }

    _moveContainerToInv(fromIdx, invIdx) {
        const container = this.activeContainer;
        if (!container) return;
        const slots = container.slots;
        const original = container.obj.inventory;
        const item = slots[fromIdx];
        if (!item) return;
        const target = this.inv.getSlot(invIdx);
        if (!target) {
            const copy = { ...item };
            this.inv.slots[invIdx] = copy;
            slots[fromIdx] = null;
            original[fromIdx] = null;
        } else if (target.itemId === item.itemId && ITEM_DEFS[item.itemId].stackable) {
            target.count += item.count;
            slots[fromIdx] = null;
            original[fromIdx] = null;
        } else {
            const origTarget = { ...target };
            this.inv.slots[invIdx] = { ...item };
            slots[fromIdx] = origTarget;
            original[fromIdx] = origTarget;
        }
        this.inv._emit();
        this._renderContainer();
        this.engine.audio.move();
    }

    _moveContainerToQuick(fromIdx, quickIdx) {
        const container = this.activeContainer;
        if (!container) return;
        const slots = container.slots;
        const original = container.obj.inventory;
        const item = slots[fromIdx];
        if (!item) return;
        this.inv.quickSlots[quickIdx] = { itemId: item.itemId, count: 1 };
        const def = ITEM_DEFS[item.itemId];
        if (def.stackable && item.count > 1) {
            const newCount = item.count - 1;
            const updated = { itemId: item.itemId, count: newCount };
            slots[fromIdx] = updated;
            original[fromIdx] = { ...updated };
        } else {
            slots[fromIdx] = null;
            original[fromIdx] = null;
        }
        this.inv._emit();
        this._renderContainer();
        this.engine.audio.move();
    }

    _takeAllFromContainer() {
        if (!this.activeContainer) return;
        const slots = this.activeContainer.slots;
        const original = this.activeContainer.obj.inventory;
        const inv = this.inv;
        let totalTook = 0;
        for (let i = 0; i < slots.length; i++) {
            const item = slots[i];
            if (!item) continue;
            const def = ITEM_DEFS[item.itemId];
            if (!def) continue;
            // Add to inventory (one at a time to handle stacks & non-stacks uniformly)
            let took = 0;
            for (let n = 0; n < item.count; n++) {
                if (inv.addItem(item.itemId, 1) >= 1) took++;
                else break; // inventory full
            }
            if (took >= item.count) {
                slots[i] = null;
                original[i] = null;
            } else if (took > 0) {
                const newCount = item.count - took;
                slots[i] = { itemId: item.itemId, count: newCount };
                original[i] = { itemId: item.itemId, count: newCount };
            }
            totalTook += took;
        }
        inv._emit();
        this._renderContainer();
        if (totalTook > 0) {
            this.engine.audio.pickup();
            this.engine.log(`Took ${totalTook} item${totalTook > 1 ? 's' : ''} from chest.`, 'good');
        }
        if (slots.every(s => !s)) {
            this.closeContainer();
        }
    }

    // ---------- Tooltip ----------
    _showItemTooltip(item, cx, cy) {
        const def = ITEM_DEFS[item.itemId];
        if (!def) return;
        this.els.tooltip.innerHTML = `
            <div class="t-name">${def.emoji} ${def.name}</div>
            <div class="t-type">${def.type}</div>
            <div class="t-desc">${def.desc}</div>
        `;
        this.els.tooltip.style.display = 'block';
        // Position
        const rect = this.els.tooltip.getBoundingClientRect();
        const w = rect.width || 200;
        const h = rect.height || 80;
        let x = cx + 14, y = cy + 14;
        if (x + w > window.innerWidth) x = cx - w - 14;
        if (y + h > window.innerHeight) y = cy - h - 14;
        this.els.tooltip.style.left = x + 'px';
        this.els.tooltip.style.top = y + 'px';
    }

    _hideTooltip() {
        this.els.tooltip.style.display = 'none';
    }

    // ---------- Action button (consume/use selected) ----------
    _onActionButton() {
        // Use first usable item in quickbar
        for (let i = 0; i < this.inv.quickSlots.length; i++) {
            const s = this.inv.quickSlots[i];
            if (!s) continue;
            const def = ITEM_DEFS[s.itemId];
            if (def.type === 'Consumable' && def.onUse) {
                const result = def.onUse(this.player);
                this.inv.removeQuick(i, 1);
                this.engine.log(`Used ${def.name}. ${result}`, 'good');
                this._renderOrbs();
                this.engine.audio.use();
                return;
            }
        }
        // If nothing to use, open inventory
        this.toggleInventory();
    }

    // ---------- Quickbar use (1..5) ----------
    useQuickSlot(i) {
        const s = this.inv.quickSlots[i];
        if (!s) return;
        const def = ITEM_DEFS[s.itemId];
        if (def.onUse) {
            const result = def.onUse(this.player);
            this.inv.removeQuick(i, 1);
            this.engine.log(`Used ${def.name}. ${result}`, 'good');
            this._renderOrbs();
            this.engine.audio.use();
        }
    }

    // ---------- Log ----------
    log(text, kind = 'info') {
        const div = document.createElement('div');
        div.className = 'log-msg';
        if (kind === 'good') div.style.borderLeftColor = '#4aff6a';
        if (kind === 'warn') div.style.borderLeftColor = '#ff8a3a';
        if (kind === 'bad') div.style.borderLeftColor = '#ff3a3a';
        div.textContent = text;
        this.els.log.appendChild(div);
        setTimeout(() => div.remove(), 4500);
    }

    showWin() {
        this.els.winScreen.classList.add('show');
    }
}

window.UIManager = UIManager;
