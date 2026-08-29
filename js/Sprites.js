/* ============================================================
   Sprites - Procedurally drawn sprites (no external assets)
   Each sprite is drawn via canvas commands
   ============================================================ */

class Sprite {
    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.canvas = document.createElement('canvas');
        this.canvas.width = w;
        this.canvas.height = h;
        this.ctx = this.canvas.getContext('2d');
        this.built = false;
    }

    draw(ctx, sx, sy) {
        if (!this.built) {
            this._build();
            this.built = true;
        }
        ctx.drawImage(this.canvas, sx - this.w / 2, sy - this.h);
    }

    _build() { /* override */ }
}

// ===== Player =====
class PlayerSprite extends Sprite {
    constructor() {
        super(40, 60);
    }
    _build() {
        const c = this.ctx;
        // Cape
        c.fillStyle = '#6a1a1a';
        c.beginPath();
        c.moveTo(10, 12);
        c.lineTo(30, 12);
        c.lineTo(34, 50);
        c.lineTo(20, 56);
        c.lineTo(6, 50);
        c.closePath();
        c.fill();
        // Cape trim
        c.fillStyle = '#3a0808';
        c.fillRect(6, 48, 28, 4);

        // Body
        c.fillStyle = '#3a4a5a';
        c.fillRect(10, 18, 20, 26);
        // Belt
        c.fillStyle = '#5a3a1a';
        c.fillRect(10, 32, 20, 4);
        c.fillStyle = '#c9a44c';
        c.fillRect(18, 33, 4, 3);
        // Body shading
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.fillRect(24, 18, 6, 14);

        // Arms
        c.fillStyle = '#d6b48a';
        c.fillRect(4, 22, 8, 20);
        c.fillRect(28, 22, 8, 20);
        // Hands
        c.fillStyle = '#c6a478';
        c.beginPath();
        c.arc(8, 44, 4, 0, Math.PI * 2);
        c.arc(32, 44, 4, 0, Math.PI * 2);
        c.fill();

        // Legs
        c.fillStyle = '#2a1e0e';
        c.fillRect(12, 44, 6, 16);
        c.fillRect(22, 44, 6, 16);
        // Boots
        c.fillStyle = '#1a0e05';
        c.fillRect(11, 56, 8, 4);
        c.fillRect(21, 56, 8, 4);

        // Head
        c.fillStyle = '#d6b48a';
        c.beginPath();
        c.arc(20, 12, 9, 0, Math.PI * 2);
        c.fill();
        // Hair
        c.fillStyle = '#5a3a1a';
        c.beginPath();
        c.arc(20, 9, 9, Math.PI, Math.PI * 2);
        c.fill();
        c.fillRect(11, 8, 18, 4);
        // Eyes
        c.fillStyle = '#000';
        c.fillRect(16, 12, 2, 2);
        c.fillRect(22, 12, 2, 2);
        // Mouth
        c.fillStyle = '#7a3a2a';
        c.fillRect(18, 16, 4, 1);
        // Helmet rim
        c.fillStyle = '#8a7a4a';
        c.fillRect(11, 4, 18, 3);
        c.fillStyle = '#5a4a2a';
        c.fillRect(11, 4, 18, 1);
    }
}

// ===== Wooden Crate =====
class CrateSprite extends Sprite {
    constructor() {
        super(40, 40);
    }
    _build() {
        const c = this.ctx;
        // Front face
        c.fillStyle = '#8a5a2a';
        c.fillRect(2, 8, 36, 30);
        // Top
        c.fillStyle = '#b07a3a';
        c.beginPath();
        c.moveTo(2, 8);
        c.lineTo(8, 2);
        c.lineTo(38, 2);
        c.lineTo(32, 8);
        c.closePath();
        c.fill();
        // Right side
        c.fillStyle = '#5a3a1a';
        c.beginPath();
        c.moveTo(32, 8);
        c.lineTo(38, 2);
        c.lineTo(38, 32);
        c.lineTo(32, 38);
        c.closePath();
        c.fill();
        // Wood grain
        c.strokeStyle = '#5a3a1a';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(8, 14); c.lineTo(8, 36);
        c.moveTo(20, 8); c.lineTo(20, 38);
        c.moveTo(32, 8); c.lineTo(32, 38);
        c.stroke();
        // Horizontal planks
        c.strokeStyle = '#5a3a1a';
        c.beginPath();
        c.moveTo(2, 18); c.lineTo(32, 18);
        c.moveTo(2, 28); c.lineTo(32, 28);
        c.stroke();
        // Metal bands
        c.fillStyle = '#3a3a3a';
        c.fillRect(2, 14, 30, 2);
        c.fillRect(2, 30, 30, 2);
        c.fillStyle = '#1a1a1a';
        c.fillRect(2, 14, 30, 1);
        c.fillRect(2, 30, 30, 1);
    }
}

// ===== Barrel =====
class BarrelSprite extends Sprite {
    constructor() {
        super(32, 44);
    }
    _build() {
        const c = this.ctx;
        // Body
        c.fillStyle = '#7a4a2a';
        c.beginPath();
        c.ellipse(16, 22, 13, 18, 0, 0, Math.PI * 2);
        c.fill();
        // Top
        c.fillStyle = '#a06a3a';
        c.beginPath();
        c.ellipse(16, 6, 13, 4, 0, 0, Math.PI * 2);
        c.fill();
        // Bands
        c.fillStyle = '#3a2a1a';
        c.fillRect(4, 12, 24, 2);
        c.fillRect(4, 22, 24, 2);
        c.fillRect(4, 32, 24, 2);
        // Highlight
        c.fillStyle = 'rgba(255,255,255,0.1)';
        c.beginPath();
        c.ellipse(13, 18, 4, 12, 0, 0, Math.PI * 2);
        c.fill();
    }
}

// ===== Chest (lootable) =====
class ChestSprite extends Sprite {
    constructor() {
        super(44, 32);
    }
    _build() {
        const c = this.ctx;
        // Bottom body
        c.fillStyle = '#6a3a1a';
        c.fillRect(2, 16, 40, 14);
        // Top lid
        c.fillStyle = '#8a4a2a';
        c.beginPath();
        c.moveTo(2, 16);
        c.lineTo(2, 8);
        c.quadraticCurveTo(2, 2, 22, 2);
        c.quadraticCurveTo(42, 2, 42, 8);
        c.lineTo(42, 16);
        c.closePath();
        c.fill();
        // Lid top (lighter)
        c.fillStyle = '#a06a3a';
        c.beginPath();
        c.moveTo(2, 8);
        c.quadraticCurveTo(2, 2, 22, 2);
        c.quadraticCurveTo(42, 2, 42, 8);
        c.closePath();
        c.fill();
        // Metal bands
        c.fillStyle = '#2a2a2a';
        c.fillRect(2, 15, 40, 2);
        c.fillRect(2, 27, 40, 2);
        c.fillRect(20, 2, 4, 14);
        c.fillRect(20, 16, 4, 14);
        // Lock
        c.fillStyle = '#c9a44c';
        c.fillRect(20, 12, 4, 6);
        c.fillStyle = '#5a4a2c';
        c.fillRect(21, 14, 2, 3);
        // Highlight
        c.fillStyle = 'rgba(255,255,255,0.15)';
        c.fillRect(4, 9, 36, 1);
    }
}

// ===== Iron Gate (locked) =====
class IronGateSprite extends Sprite {
    constructor() {
        super(48, 80);
    }
    _build() {
        const c = this.ctx;
        // Frame
        c.fillStyle = '#2a2a2a';
        c.fillRect(0, 0, 48, 80);
        c.fillStyle = '#1a1a1a';
        c.fillRect(0, 0, 48, 4);
        c.fillRect(0, 76, 48, 4);
        // Bars
        c.fillStyle = '#4a4a4a';
        for (let i = 0; i < 7; i++) {
            c.fillRect(3 + i * 6, 4, 4, 72);
        }
        // Cross bar
        c.fillRect(0, 35, 48, 6);
        c.fillRect(0, 50, 48, 4);
        // Highlights
        c.fillStyle = 'rgba(255,255,255,0.15)';
        for (let i = 0; i < 7; i++) {
            c.fillRect(3 + i * 6, 4, 1, 72);
        }
        // Lock mechanism
        c.fillStyle = '#c9a44c';
        c.beginPath();
        c.arc(24, 40, 5, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#5a4a2c';
        c.fillRect(22, 38, 4, 4);
    }
}

// ===== Iron Gate (open) =====
class OpenGateSprite extends Sprite {
    constructor() {
        super(48, 80);
    }
    _build() {
        const c = this.ctx;
        // Frame
        c.fillStyle = '#2a2a2a';
        c.fillRect(0, 0, 48, 80);
        c.fillRect(0, 0, 48, 4);
        c.fillRect(0, 76, 48, 4);
        // Open gate (bars pushed to sides)
        c.fillStyle = '#4a4a4a';
        for (let i = 0; i < 4; i++) {
            c.fillRect(3 + i * 4, 4, 3, 72);
        }
        for (let i = 0; i < 4; i++) {
            c.fillRect(32 + i * 4, 4, 3, 72);
        }
        c.fillStyle = 'rgba(255,255,255,0.1)';
        for (let i = 0; i < 4; i++) {
            c.fillRect(3 + i * 4, 4, 1, 72);
            c.fillRect(32 + i * 4, 4, 1, 72);
        }
        // Welcome light beam (subtle)
        const grad = c.createLinearGradient(0, 0, 48, 0);
        grad.addColorStop(0, 'rgba(255,220,150,0)');
        grad.addColorStop(0.5, 'rgba(255,220,150,0.15)');
        grad.addColorStop(1, 'rgba(255,220,150,0)');
        c.fillStyle = grad;
        c.fillRect(0, 0, 48, 80);
    }
}

// ===== Stool =====
class StoolSprite extends Sprite {
    constructor() {
        super(28, 28);
    }
    _build() {
        const c = this.ctx;
        // Top
        c.fillStyle = '#8a5a2a';
        c.beginPath();
        c.ellipse(14, 10, 12, 4, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#a06a3a';
        c.beginPath();
        c.ellipse(14, 9, 10, 3, 0, Math.PI, 0);
        c.fill();
        // Legs
        c.fillStyle = '#5a3a1a';
        c.fillRect(4, 12, 3, 14);
        c.fillRect(21, 12, 3, 14);
        c.fillRect(13, 13, 3, 14);
        c.fillStyle = '#3a2a1a';
        c.beginPath();
        c.arc(5, 27, 2, 0, Math.PI * 2);
        c.arc(23, 27, 2, 0, Math.PI * 2);
        c.arc(14, 28, 2, 0, Math.PI * 2);
        c.fill();
    }
}

// ===== Floor torch =====
class TorchSprite extends Sprite {
    constructor() {
        super(12, 36);
    }
    _build() {
        const c = this.ctx;
        // Stick
        c.fillStyle = '#5a3a1a';
        c.fillRect(5, 18, 3, 18);
        // Flame outer
        c.fillStyle = '#ff8a3a';
        c.beginPath();
        c.moveTo(6, 18);
        c.quadraticCurveTo(0, 8, 6, 0);
        c.quadraticCurveTo(12, 8, 6, 18);
        c.fill();
        // Flame inner
        c.fillStyle = '#ffd060';
        c.beginPath();
        c.moveTo(6, 14);
        c.quadraticCurveTo(2, 8, 6, 4);
        c.quadraticCurveTo(10, 8, 6, 14);
        c.fill();
    }
}

// ===== Key (item icon) =====
class KeyIcon extends Sprite {
    constructor() {
        super(32, 32);
    }
    _build() {
        const c = this.ctx;
        c.strokeStyle = '#f0c860';
        c.fillStyle = '#f0c860';
        c.lineWidth = 4;
        // Ring
        c.beginPath();
        c.arc(11, 16, 7, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.arc(11, 16, 3, 0, Math.PI * 2);
        c.fillStyle = '#1a140a';
        c.fill();
        c.strokeStyle = '#f0c860';
        // Shaft
        c.beginPath();
        c.moveTo(18, 16);
        c.lineTo(30, 16);
        c.stroke();
        // Teeth
        c.fillStyle = '#f0c860';
        c.fillRect(25, 16, 3, 5);
        c.fillRect(28, 16, 3, 4);
    }
}

// ===== Potion (item icon) =====
class PotionIcon extends Sprite {
    constructor(color1 = '#5a8aff', color2 = '#a0c0ff') {
        super(32, 32);
        this.color1 = color1;
        this.color2 = color2;
    }
    _build() {
        const c = this.ctx;
        // Bottle outline
        c.fillStyle = '#1a0a05';
        c.beginPath();
        c.moveTo(12, 4);
        c.lineTo(20, 4);
        c.lineTo(20, 11);
        c.quadraticCurveTo(28, 15, 28, 21);
        c.quadraticCurveTo(28, 30, 16, 30);
        c.quadraticCurveTo(4, 30, 4, 21);
        c.quadraticCurveTo(4, 15, 12, 11);
        c.closePath();
        c.fill();
        // Liquid
        c.fillStyle = this.color1;
        c.beginPath();
        c.moveTo(9, 17);
        c.quadraticCurveTo(7, 19, 7, 21);
        c.quadraticCurveTo(7, 28, 16, 28);
        c.quadraticCurveTo(25, 28, 25, 21);
        c.quadraticCurveTo(25, 19, 23, 17);
        c.closePath();
        c.fill();
        // Highlight
        c.fillStyle = this.color2;
        c.beginPath();
        c.ellipse(12, 22, 2, 4, 0, 0, Math.PI * 2);
        c.fill();
        // Cork
        c.fillStyle = '#8a5a2a';
        c.fillRect(12, 3, 8, 4);
        c.fillStyle = '#6a3a1a';
        c.fillRect(12, 3, 8, 1);
    }
}

// ===== Sword (item icon) =====
class SwordIcon extends Sprite {
    constructor() {
        super(32, 32);
    }
    _build() {
        const c = this.ctx;
        c.save();
        c.translate(16, 16);
        c.rotate(-Math.PI / 4);
        // Blade
        c.fillStyle = '#d0d0e0';
        c.beginPath();
        c.moveTo(0, -14);
        c.lineTo(3, -14);
        c.lineTo(3, 8);
        c.lineTo(0, 8);
        c.closePath();
        c.fill();
        // Blade shine
        c.fillStyle = '#ffffff';
        c.fillRect(0.5, -12, 1, 18);
        // Crossguard
        c.fillStyle = '#c9a44c';
        c.fillRect(-5, 8, 13, 3);
        // Handle
        c.fillStyle = '#5a3a1a';
        c.fillRect(-0.5, 11, 4, 6);
        // Pommel
        c.fillStyle = '#f0d090';
        c.beginPath();
        c.arc(1.5, 19, 2, 0, Math.PI * 2);
        c.fill();
        c.restore();
    }
}

// ===== Coin / gold (item icon) =====
class CoinIcon extends Sprite {
    constructor() {
        super(32, 32);
    }
    _build() {
        const c = this.ctx;
        c.fillStyle = '#c9a44c';
        c.beginPath();
        c.arc(16, 16, 12, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#8a6a2c';
        c.beginPath();
        c.arc(16, 16, 10, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#f0d090';
        c.beginPath();
        c.arc(16, 16, 9, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#8a6a2c';
        c.font = 'bold 14px serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('$', 16, 16);
        // shine
        c.fillStyle = 'rgba(255,255,255,0.4)';
        c.beginPath();
        c.ellipse(12, 11, 3, 1.5, -0.5, 0, Math.PI * 2);
        c.fill();
    }
}

// Item database — combines icon + metadata
const ITEM_DEFS = {
    key_iron: {
        name: 'Iron Key',
        type: 'Key',
        desc: 'A sturdy iron key. It might open a lock around here.',
        iconClass: KeyIcon,
        emoji: '🗝️',
        atlasKey: null, // No matching key icon in atlas
        stackable: false,
        useVerb: 'Unlock',
    },
    potion_health: {
        name: 'Health Potion',
        type: 'Consumable',
        desc: 'Restores 50 HP. Tastes vaguely of cherries.',
        iconClass: () => new PotionIcon('#5a8aff', '#a0c0ff'),
        emoji: '🧪',
        atlasKey: 'icon_potion_hp',
        stackable: true,
        useVerb: 'Drink',
        onUse: (player) => { player.hp = Math.min(player.maxHp, player.hp + 50); return `+50 HP`; },
    },
    potion_mana: {
        name: 'Mana Potion',
        type: 'Consumable',
        desc: 'Restores 30 Mana. Smells of mint.',
        iconClass: () => new PotionIcon('#1a3a8b', '#3a6ad6'),
        emoji: '💧',
        atlasKey: 'icon_potion_mana',
        stackable: true,
        useVerb: 'Drink',
        onUse: (player) => { player.mana = Math.min(player.maxMana, player.mana + 30); return `+30 Mana`; },
    },
    sword_iron: {
        name: 'Iron Sword',
        type: 'Weapon',
        desc: 'A simple but reliable iron blade. +5 ATK.',
        iconClass: SwordIcon,
        emoji: '⚔️',
        atlasKey: 'icon_longsword',
        stackable: false,
        useVerb: 'Equip',
    },
    gold_coin: {
        name: 'Gold Coin',
        type: 'Currency',
        desc: 'Shiny gold. Currency of the realm.',
        iconClass: CoinIcon,
        emoji: '🪙',
        atlasKey: null, // no direct match, but could map later
        stackable: true,
    },
    dagger: {
        name: 'Rusted Dagger',
        type: 'Weapon',
        desc: 'A pitted blade. +2 ATK.',
        iconClass: SwordIcon,
        emoji: '🗡️',
        atlasKey: 'icon_dagger',
        stackable: false,
    },
    spellbook: {
        name: 'Ancient Spellbook',
        type: 'Quest',
        desc: 'A tome of forgotten magics. May be useful.',
        iconClass: () => new KeyIcon(),
        emoji: '📕',
        atlasKey: 'icon_spellbook',
        stackable: false,
    },
    scroll: {
        name: 'Runic Scroll',
        type: 'Consumable',
        desc: 'A scroll inscribed with arcane runes.',
        iconClass: () => new KeyIcon(),
        emoji: '📜',
        atlasKey: 'icon_scroll',
        stackable: true,
    },
};

window.Sprite = Sprite;
window.PlayerSprite = PlayerSprite;
window.CrateSprite = CrateSprite;
window.BarrelSprite = BarrelSprite;
window.ChestSprite = ChestSprite;
window.IronGateSprite = IronGateSprite;
window.OpenGateSprite = OpenGateSprite;
window.StoolSprite = StoolSprite;
window.TorchSprite = TorchSprite;
window.KeyIcon = KeyIcon;
window.PotionIcon = PotionIcon;
window.SwordIcon = SwordIcon;
window.CoinIcon = CoinIcon;
window.ITEM_DEFS = ITEM_DEFS;
