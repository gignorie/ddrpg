/* ============================================================
   AudioManager - Procedural SFX via Web Audio API
   No external files needed.
   ============================================================ */

class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.3;
    }

    _ensure() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.enabled = false;
        }
    }

    resume() {
        this._ensure();
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    _play(generator) {
        if (!this.enabled) return;
        this._ensure();
        if (!this.ctx) return;
        try { generator(this.ctx); } catch (e) { /* ignore */ }
    }

    // Simple tone
    tone(freq, dur = 0.1, type = 'sine', vol = 1) {
        this._play(ctx => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = type;
            o.frequency.value = freq;
            o.connect(g);
            g.connect(ctx.destination);
            g.gain.setValueAtTime(this.volume * vol, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
            o.start();
            o.stop(ctx.currentTime + dur);
        });
    }

    // Sweep
    sweep(fromFreq, toFreq, dur = 0.2, type = 'sine', vol = 1) {
        this._play(ctx => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = type;
            o.connect(g);
            g.connect(ctx.destination);
            const t = ctx.currentTime;
            g.gain.setValueAtTime(this.volume * vol, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.frequency.setValueAtTime(fromFreq, t);
            o.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
            o.start();
            o.stop(t + dur);
        });
    }

    // Noise burst
    noise(dur = 0.1, vol = 0.5, filterFreq = 1000) {
        this._play(ctx => {
            const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
            const src = ctx.createBufferSource();
            src.buffer = buf;
            const f = ctx.createBiquadFilter();
            f.type = 'lowpass';
            f.frequency.value = filterFreq;
            const g = ctx.createGain();
            g.gain.setValueAtTime(this.volume * vol, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
            src.connect(f); f.connect(g); g.connect(ctx.destination);
            src.start();
        });
    }

    // SFX presets
    pickup() {
        this.sweep(400, 900, 0.15, 'sine', 0.6);
        setTimeout(() => this.sweep(700, 1200, 0.1, 'sine', 0.4), 80);
    }

    move() {
        this.noise(0.05, 0.2, 400);
    }

    unlock() {
        this.sweep(300, 800, 0.15, 'square', 0.4);
        setTimeout(() => this.sweep(600, 1200, 0.15, 'sine', 0.5), 150);
    }

    drop() {
        this.tone(200, 0.1, 'triangle', 0.4);
    }

    use() {
        this.sweep(500, 1000, 0.2, 'sine', 0.5);
    }

    error() {
        this.tone(150, 0.15, 'square', 0.4);
    }

    win() {
        this.sweep(400, 600, 0.2, 'sine', 0.5);
        setTimeout(() => this.sweep(600, 800, 0.2, 'sine', 0.5), 200);
        setTimeout(() => this.sweep(800, 1200, 0.4, 'sine', 0.6), 400);
    }
}

window.AudioManager = AudioManager;
