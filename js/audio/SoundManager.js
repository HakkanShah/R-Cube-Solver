// SoundManager.js - Audio/Sound Effects for Rubik's Cube
// Uses Web Audio API for low-latency, high-quality sound synthesis

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.volume = 0.5;
        this.initialized = false;
    }

    // Initialize audio context (must be called after user interaction)
    init() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('SoundManager initialized');
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.enabled = false;
        }
    }

    // Resume audio context if suspended (required by browsers)
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    // Set volume (0 to 1)
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    }

    // Toggle sound on/off
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    // Create a gain node with the current volume
    createGain(multiplier = 1) {
        const gain = this.audioContext.createGain();
        gain.gain.value = this.volume * multiplier;
        gain.connect(this.audioContext.destination);
        return gain;
    }

    // ===== CUBE MOVE SOUND =====
    // Satisfying mechanical click/twist sound for cube rotation
    playMoveSound() {
        if (!this.enabled || !this.audioContext) return;
        this.resume();

        const now = this.audioContext.currentTime;
        const gain = this.createGain(0.3);

        // Create a short "click" using noise burst
        const bufferSize = this.audioContext.sampleRate * 0.03; // 30ms
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate filtered noise for mechanical click
        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;
            // Envelope: quick attack, faster decay
            const envelope = Math.exp(-t * 30) * (1 - Math.exp(-t * 200));
            // Mix of noise and low frequency for "thunk"
            data[i] = (Math.random() * 2 - 1) * envelope * 0.6;
        }

        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = buffer;

        // Add a low-pass filter for a more mechanical sound
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;
        filter.Q.value = 1;

        noiseSource.connect(filter);
        filter.connect(gain);

        // Add a subtle "thump" oscillator
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.05);

        const oscGain = this.createGain(0.15);
        oscGain.gain.setValueAtTime(0.15 * this.volume, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(oscGain);

        noiseSource.start(now);
        noiseSource.stop(now + 0.03);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    // ===== SCRAMBLE SOUND =====
    // Rapid clicking sound for scramble animation
    playScrambleSound() {
        if (!this.enabled || !this.audioContext) return;
        this.resume();

        const now = this.audioContext.currentTime;
        const gain = this.createGain(0.15);

        // Quick burst
        const bufferSize = this.audioContext.sampleRate * 0.02;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;
            const envelope = Math.exp(-t * 50);
            data[i] = (Math.random() * 2 - 1) * envelope * 0.4;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 500;

        source.connect(filter);
        filter.connect(gain);
        source.start(now);
        source.stop(now + 0.02);
    }

    // ===== RESET/WHOOSH SOUND =====
    // Smooth whoosh sound when resetting the cube
    playResetSound() {
        if (!this.enabled || !this.audioContext) return;
        this.resume();

        const now = this.audioContext.currentTime;
        const duration = 0.4;

        // White noise with sweeping filter
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;
            // Bell curve envelope
            const envelope = Math.sin(t * Math.PI) * 0.5;
            data[i] = (Math.random() * 2 - 1) * envelope;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(2000, now + duration * 0.3);
        filter.frequency.exponentialRampToValueAtTime(400, now + duration);
        filter.Q.value = 2;

        const gain = this.createGain(0.25);

        source.connect(filter);
        filter.connect(gain);
        source.start(now);
        source.stop(now + duration);
    }

    // ===== SOLVED/SUCCESS SOUND =====
    // Celebratory chime when cube is solved
    playSolvedSound() {
        if (!this.enabled || !this.audioContext) return;
        this.resume();

        const now = this.audioContext.currentTime;

        // Play a pleasant ascending chord
        const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        const delays = [0, 0.08, 0.16, 0.24];

        frequencies.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = this.createGain(0.2);
            gain.gain.setValueAtTime(0, now + delays[i]);
            gain.gain.linearRampToValueAtTime(0.2 * this.volume, now + delays[i] + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delays[i] + 0.8);

            osc.connect(gain);
            osc.start(now + delays[i]);
            osc.stop(now + delays[i] + 0.8);
        });

        // Add a subtle shimmer
        const bufferSize = this.audioContext.sampleRate * 0.5;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;
            const envelope = Math.sin(t * Math.PI) * 0.15 * Math.exp(-t * 3);
            data[i] = (Math.random() * 2 - 1) * envelope;
        }

        const shimmerSource = this.audioContext.createBufferSource();
        shimmerSource.buffer = buffer;

        const shimmerFilter = this.audioContext.createBiquadFilter();
        shimmerFilter.type = 'highpass';
        shimmerFilter.frequency.value = 3000;

        const shimmerGain = this.createGain(0.3);

        shimmerSource.connect(shimmerFilter);
        shimmerFilter.connect(shimmerGain);
        shimmerSource.start(now);
        shimmerSource.stop(now + 0.5);
    }

    // ===== UI CLICK SOUND =====
    // Subtle click for button interactions
    playClickSound() {
        if (!this.enabled || !this.audioContext) return;
        this.resume();

        const now = this.audioContext.currentTime;

        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

        const gain = this.createGain(0.1);
        gain.gain.setValueAtTime(0.1 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    // ===== TAB SWITCH SOUND =====
    // Soft transition sound for tab switching
    playTabSound() {
        if (!this.enabled || !this.audioContext) return;
        this.resume();

        const now = this.audioContext.currentTime;

        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(900, now + 0.08);

        const gain = this.createGain(0.08);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08 * this.volume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    // ===== UNDO SOUND =====
    // Reverse/rewind sound effect
    playUndoSound() {
        if (!this.enabled || !this.audioContext) return;
        this.resume();

        const now = this.audioContext.currentTime;

        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);

        const gain = this.createGain(0.15);
        gain.gain.setValueAtTime(0.15 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    // ===== REDO SOUND =====
    // Forward sound effect
    playRedoSound() {
        if (!this.enabled || !this.audioContext) return;
        this.resume();

        const now = this.audioContext.currentTime;

        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);

        const gain = this.createGain(0.15);
        gain.gain.setValueAtTime(0.15 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    // ===== ERROR SOUND =====
    // Subtle error/warning sound
    playErrorSound() {
        if (!this.enabled || !this.audioContext) return;
        this.resume();

        const now = this.audioContext.currentTime;

        // Two-tone descending
        [400, 300].forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = this.createGain(0.12);
            gain.gain.setValueAtTime(0.12 * this.volume, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.1);

            osc.connect(gain);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.1);
        });
    }

    // ===== WARNING SOUND =====
    // Gentle notification sound for warnings
    playWarningSound() {
        if (!this.enabled || !this.audioContext) return;
        this.resume();

        const now = this.audioContext.currentTime;

        // Single gentle tone with slight wobble
        const osc = this.audioContext.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.setValueAtTime(550, now + 0.1);
        osc.frequency.setValueAtTime(500, now + 0.2);

        const gain = this.createGain(0.15);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15 * this.volume, now + 0.03);
        gain.gain.setValueAtTime(0.15 * this.volume, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    // ===== STEP/TUTORIAL SOUND =====
    // Soft notification for tutorial steps
    playStepSound() {
        if (!this.enabled || !this.audioContext) return;
        this.resume();

        const now = this.audioContext.currentTime;

        const osc = this.audioContext.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = 700;

        const gain = this.createGain(0.1);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1 * this.volume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.15);
    }
}

// Create and export singleton instance
const soundManager = new SoundManager();
export default soundManager;
