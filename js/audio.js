// ==========================================
// Imperium der Zeitalter – 2.5D Audio & Voice Engine
// ==========================================

class SoundSystem {
    constructor() {
        this.enabled = true;
        this.musicEnabled = false;
        this.ctx = null;
        this.noiseBuffer = null;
        this.reverbNode = null;
        this.musicTimer = null;
        this.musicStep = 0;
        this.combatIntensity = 0;
        this.voiceCooldown = 0;

        // Sound effect dispatch table
        this.soundHandlers = {
            click: (now, pan, v) => this.playClick(now, pan, v),
            bell: (now, pan, v) => this.playBell(now, pan, v),
            cathedral_bell: (now, pan, v) => this.playCathedralBell(now, pan, v),
            wololo: (now, pan, v) => this.playWololo(now, pan, v),
            heal: (now, pan, v) => this.playHeal(now, pan, v),
            spear: (now, pan, v) => this.playSpear(now, pan, v),
            javelin: (now, pan, v) => this.playJavelin(now, pan, v),
            horse: (now, pan, v) => this.playHorse(now, pan, v),
            order: (now, pan, v) => this.playOrder(now, pan, v),
            attack_order: (now, pan, v) => this.playAttackOrder(now, pan, v),
            woodchop: (now, pan, v) => this.playWoodchop(now, pan, v),
            pickaxe: (now, pan, v) => this.playPickaxe(now, pan, v),
            build: (now, pan, v) => this.playBuild(now, pan, v),
            sword: (now, pan, v) => this.playSword(now, pan, v),
            bow: (now, pan, v) => this.playBow(now, pan, v),
            siege: (now, pan, v) => this.playSiege(now, pan, v),
            fanfare: (now, pan, v) => this.playFanfare(now, pan, v),
            horn: (now, pan, v) => this.playHorn(now, pan, v)
        };
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
                this.createNoiseBuffer();
                this.createReverb();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => { });
        }
    }

    createNoiseBuffer() {
        if (!this.ctx) return;
        const sr = this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, sr * 1.0, sr);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffer = buffer;
    }

    createReverb() {
        if (!this.ctx) return;
        try {
            const sr = this.ctx.sampleRate;
            const length = Math.floor(sr * 1.4);
            const impulse = this.ctx.createBuffer(2, length, sr);
            for (let ch = 0; ch < 2; ch++) {
                const chData = impulse.getChannelData(ch);
                for (let i = 0; i < length; i++) {
                    chData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
                }
            }
            this.reverbNode = this.ctx.createConvolver();
            this.reverbNode.buffer = impulse;
            const wetGain = this.ctx.createGain();
            wetGain.gain.value = 0.28;
            this.reverbNode.connect(wetGain);
            wetGain.connect(this.ctx.destination);
        } catch (e) { }
    }

    connectOut(node, useReverb = true, pan = 0, volMult = 1) {
        if (!this.ctx) return;
        let target = node;
        if (volMult !== 1) {
            const g = this.ctx.createGain();
            g.gain.value = volMult;
            node.connect(g);
            target = g;
        }
        if (pan !== 0 && this.ctx.createStereoPanner) {
            try {
                const panner = this.ctx.createStereoPanner();
                panner.pan.value = Math.max(-1, Math.min(1, pan));
                target.connect(panner);
                target = panner;
            } catch (e) { }
        }
        target.connect(this.ctx.destination);
        if (useReverb && this.reverbNode) {
            target.connect(this.reverbNode);
        }
    }

    speak(text, { pitch = 1.0, rate = 1.0, volume = 0.85 } = {}) {
        if (!this.enabled || !window.speechSynthesis) return;
        const now = performance.now();
        if (now - this.voiceCooldown < 700) return;
        this.voiceCooldown = now;
        try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = 'de-DE';
            utter.pitch = pitch;
            utter.rate = rate;
            utter.volume = volume;
            window.speechSynthesis.speak(utter);
        } catch (e) { }
    }

    playNoiseBurst(duration, filterFreq, filterType, gainVal, Q = 1.0, pan = 0) {
        if (!this.ctx || !this.noiseBuffer) return;
        const now = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.setValueAtTime(filterFreq, now);
        filter.Q.setValueAtTime(Q, now);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(gainVal, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        src.connect(filter);
        filter.connect(gain);
        this.connectOut(gain, true, pan);
        src.start(now);
        src.stop(now + duration);
    }

    // --- Individual Modular Sound Synthesizers ---
    playClick(now, pan, volMult) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(640, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.05);
        g.gain.setValueAtTime(0.11 * volMult, now);
        g.gain.exponentialRampToValueAtTime(0.003, now + 0.05);
        osc.connect(g); this.connectOut(g, false, pan);
        osc.start(now); osc.stop(now + 0.05);
    }

    playBell(now, pan, volMult) {
        [523.25, 1046.5, 1567.98].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            g.gain.setValueAtTime((0.1 / (i + 1)) * volMult, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
            osc.connect(g); this.connectOut(g, true, pan);
            osc.start(now); osc.stop(now + 0.75);
        });
    }

    playCathedralBell(now, pan, volMult) {
        [130.81, 261.63, 392.00, 523.25, 783.99].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = i % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.linearRampToValueAtTime(freq * 0.992, now + 2.8);
            g.gain.setValueAtTime((0.24 / (i * 0.6 + 1)) * volMult, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 2.8);
            osc.connect(g); this.connectOut(g, true, pan);
            osc.start(now); osc.stop(now + 2.8);
        });
        this.playNoiseBurst(0.18, 420, 'lowpass', 0.22, 1.2, pan);
    }

    playWololo(now, pan, volMult) {
        const tones = [
            { f: 440, dur: 0.28, del: 0 },
            { f: 587.33, dur: 0.35, del: 0.25 },
            { f: 392.00, dur: 0.30, del: 0.58 },
            { f: 523.25, dur: 0.55, del: 0.85 }
        ];
        tones.forEach(t => {
            const st = now + t.del;
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(t.f, st);
            osc.frequency.linearRampToValueAtTime(t.f * 1.04, st + t.dur * 0.5);
            osc.frequency.linearRampToValueAtTime(t.f, st + t.dur);
            g.gain.setValueAtTime(0.14 * volMult, st);
            g.gain.exponentialRampToValueAtTime(0.002, st + t.dur);
            osc.connect(g); this.connectOut(g, true, pan);
            osc.start(st); osc.stop(st + t.dur);
        });
    }

    playHeal(now, pan, volMult) {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
            const st = now + idx * 0.08;
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, st);
            g.gain.setValueAtTime(0.09 * volMult, st);
            g.gain.exponentialRampToValueAtTime(0.002, st + 0.45);
            osc.connect(g); this.connectOut(g, true, pan);
            osc.start(st); osc.stop(st + 0.45);
        });
    }

    playSpear(now, pan, volMult) {
        this.playNoiseBurst(0.07, 2800, 'bandpass', 0.16, 3.2, pan);
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.09);
        g.gain.setValueAtTime(0.14 * volMult, now);
        g.gain.exponentialRampToValueAtTime(0.002, now + 0.09);
        osc.connect(g); this.connectOut(g, false, pan);
        osc.start(now); osc.stop(now + 0.09);
    }

    playJavelin(now, pan, volMult) {
        this.playNoiseBurst(0.12, 1750, 'bandpass', 0.15, 2.0, pan);
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.12);
        g.gain.setValueAtTime(0.1 * volMult, now);
        g.gain.exponentialRampToValueAtTime(0.003, now + 0.12);
        osc.connect(g); this.connectOut(g, false, pan);
        osc.start(now); osc.stop(now + 0.12);
    }

    playHorse(now, pan, volMult) {
        [0, 0.09, 0.22].forEach(delay => {
            setTimeout(() => {
                if (this.enabled) this.playNoiseBurst(0.06, 520 + Math.random() * 200, 'bandpass', 0.14 * volMult, 3.0, pan);
            }, delay * 1000);
        });
    }

    playOrder(now, pan, volMult) {
        this.playNoiseBurst(0.08, 180, 'lowpass', 0.18 * volMult, 1, pan);
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(390, now + 0.13);
        g.gain.setValueAtTime(0.13 * volMult, now);
        g.gain.exponentialRampToValueAtTime(0.004, now + 0.14);
        osc.connect(g); this.connectOut(g, true, pan);
        osc.start(now); osc.stop(now + 0.14);
    }

    playAttackOrder(now, pan, volMult) {
        [220, 330].forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sawtooth';
            const st = now + idx * 0.06;
            osc.frequency.setValueAtTime(f, st);
            g.gain.setValueAtTime(0.11 * volMult, st);
            g.gain.exponentialRampToValueAtTime(0.003, st + 0.24);
            osc.connect(g); this.connectOut(g, true, pan);
            osc.start(st); osc.stop(st + 0.24);
        });
        this.playNoiseBurst(0.12, 220, 'lowpass', 0.2 * volMult, 1, pan);
    }

    playWoodchop(now, pan, volMult) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(58, now + 0.08);
        g.gain.setValueAtTime(0.18 * volMult, now);
        g.gain.exponentialRampToValueAtTime(0.004, now + 0.08);
        osc.connect(g); this.connectOut(g, false, pan);
        osc.start(now); osc.stop(now + 0.08);
        this.playNoiseBurst(0.055, 950, 'bandpass', 0.12 * volMult, 2.5, pan);
    }

    playPickaxe(now, pan, volMult) {
        [1680, 2520, 3340].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 60, now);
            g.gain.setValueAtTime((0.065 / (i + 1)) * volMult, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc.connect(g); this.connectOut(g, true, pan);
            osc.start(now); osc.stop(now + 0.16);
        });
        this.playNoiseBurst(0.04, 3000, 'highpass', 0.08 * volMult, 1, pan);
    }

    playBuild(now, pan, volMult) {
        [0, 0.11].forEach(offset => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(210, now + offset);
            osc.frequency.exponentialRampToValueAtTime(95, now + offset + 0.065);
            g.gain.setValueAtTime(0.1 * volMult, now + offset);
            g.gain.exponentialRampToValueAtTime(0.004, now + offset + 0.065);
            osc.connect(g); this.connectOut(g, false, pan);
            osc.start(now + offset); osc.stop(now + offset + 0.065);
        });
    }

    playSword(now, pan, volMult) {
        this.playNoiseBurst(0.09, 3400, 'bandpass', 0.14 * volMult, 3.5, pan);
        [1120, 1780].forEach(f => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f + (Math.random() - 0.5) * 120, now);
            osc.frequency.exponentialRampToValueAtTime(340, now + 0.11);
            g.gain.setValueAtTime(0.06 * volMult, now);
            g.gain.exponentialRampToValueAtTime(0.002, now + 0.11);
            osc.connect(g); this.connectOut(g, true, pan);
            osc.start(now); osc.stop(now + 0.11);
        });
    }

    playBow(now, pan, volMult) {
        this.playNoiseBurst(0.11, 1950, 'bandpass', 0.11 * volMult, 2.0, pan);
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(390, now);
        osc.frequency.exponentialRampToValueAtTime(115, now + 0.12);
        g.gain.setValueAtTime(0.11 * volMult, now);
        g.gain.exponentialRampToValueAtTime(0.003, now + 0.12);
        osc.connect(g); this.connectOut(g, false, pan);
        osc.start(now); osc.stop(now + 0.12);
    }

    playSiege(now, pan, volMult) {
        this.playNoiseBurst(0.45, 320, 'lowpass', 0.32 * volMult, 0.8, pan);
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(135, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.45);
        g.gain.setValueAtTime(0.26 * volMult, now);
        g.gain.exponentialRampToValueAtTime(0.004, now + 0.45);
        osc.connect(g); this.connectOut(g, true, pan);
        osc.start(now); osc.stop(now + 0.45);
    }

    playFanfare(now, pan, volMult) {
        const notes = [293.66, 369.99, 440.00, 587.33, 880.00];
        notes.forEach((freq, idx) => {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.type = 'sawtooth';
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1800;
            const start = now + idx * 0.095;
            o.frequency.setValueAtTime(freq, start);
            g.gain.setValueAtTime(0.11 * volMult, start);
            g.gain.exponentialRampToValueAtTime(0.003, start + 0.55);
            o.connect(filter); filter.connect(g);
            this.connectOut(g, true, pan);
            o.start(start); o.stop(start + 0.55);
        });
    }

    playHorn(now, pan, volMult) {
        [146.83, 220.00].forEach((freq, i) => {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.type = 'sawtooth';
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(650, now);
            filter.frequency.linearRampToValueAtTime(1200, now + 0.4);
            o.frequency.setValueAtTime(freq * 0.96, now);
            o.frequency.linearRampToValueAtTime(freq, now + 0.25);
            g.gain.setValueAtTime((0.12 / (i + 1)) * volMult, now);
            g.gain.exponentialRampToValueAtTime(0.003, now + 0.85);
            o.connect(filter); filter.connect(g);
            this.connectOut(g, true, pan);
            o.start(now); o.stop(now + 0.85);
        });
    }

    play(type, pan = 0, volMult = 1) {
        if (!this.enabled) return;
        try {
            this.init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const handler = this.soundHandlers[type];
            if (handler) {
                handler(now, pan, volMult);
            }
        } catch (e) { }
    }

    toggleMusic() {
        this.init();
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) {
            const lutePeace = [293.66, 349.23, 440.00, 392.00, 329.63, 392.00, 440.00, 523.25, 587.33, 440.00, 392.00, 349.23, 329.63, 293.66, 261.63, 293.66];
            const bassPeace = [146.83, 146.83, 146.83, 130.81, 164.81, 164.81, 174.61, 130.81, 146.83, 146.83, 130.81, 174.61, 164.81, 146.83, 130.81, 146.83];
            const warNotes = [146.83, 174.61, 196.00, 220.00, 146.83, 164.81, 174.61, 130.81];

            this.musicTimer = setInterval(() => {
                if (!this.musicEnabled || !this.ctx) return;
                const now = this.ctx.currentTime;
                const isWar = this.combatIntensity > 0.35;
                const notes = isWar ? warNotes : lutePeace;
                const bass = bassPeace;
                const step = this.musicStep % notes.length;
                this.musicStep++;

                const osc = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                osc.type = isWar ? 'sawtooth' : 'triangle';
                osc.frequency.setValueAtTime(notes[step], now);
                g.gain.setValueAtTime(isWar ? 0.08 : 0.065, now);
                g.gain.exponentialRampToValueAtTime(0.002, now + (isWar ? 0.22 : 0.38));
                osc.connect(g);
                this.connectOut(g, true);
                osc.start(now); osc.stop(now + (isWar ? 0.22 : 0.38));

                if (step % 2 === 0) {
                    const bOsc = this.ctx.createOscillator();
                    const bGain = this.ctx.createGain();
                    bOsc.type = 'sine';
                    bOsc.frequency.setValueAtTime(bass[step % bass.length], now);
                    bGain.gain.setValueAtTime(isWar ? 0.075 : 0.055, now);
                    bGain.gain.exponentialRampToValueAtTime(0.002, now + 0.65);
                    bOsc.connect(bGain);
                    this.connectOut(bGain, true);
                    bOsc.start(now); bOsc.stop(now + 0.65);
                }

                if (isWar || step % 4 === 0 || step % 4 === 3) {
                    this.playNoiseBurst(isWar ? 0.09 : 0.07, isWar ? 120 : (step % 4 === 0 ? 160 : 320), 'lowpass', isWar ? 0.08 : 0.055);
                }
            }, 340);
        } else if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
        return this.musicEnabled;
    }
}

if (typeof window !== 'undefined') window.SoundSystem = SoundSystem;
if (typeof global !== 'undefined') global.SoundSystem = SoundSystem;
