/**
 * ZAAHI sound system — singleton on top of Web Audio API + a single
 * <audio> element for ambient music. One master switch turns everything
 * on/off; preference is persisted to localStorage.
 *
 * SFX are generated programmatically (no asset files). Background music
 * loads from /audio/ambient.mp3 (placeholder file may be empty — call
 * sites are guarded against playback failure).
 */
"use client";

const STORAGE_KEY = "zaahi:sound:enabled";
const MUSIC_TARGET = 0.15;
const CITY_TARGET = 0.08;

type Listener = (enabled: boolean) => void;

class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  // Music
  private musicEl: HTMLAudioElement | null = null;
  private musicSrc: MediaElementAudioSourceNode | null = null;
  private musicGain: GainNode | null = null;

  // City ambient (white noise → bandpass)
  private cityNoise: AudioBufferSourceNode | null = null;
  private cityGain: GainNode | null = null;
  private cityActive = false;

  // Hover throttle
  private lastHoverAt = 0;

  enabled = false;
  private listeners = new Set<Listener>();

  init() {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    this.enabled = stored === "1";
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.enabled);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const l of this.listeners) l(this.enabled);
  }

  /** Lazy AudioContext (must be created after a user gesture). */
  private ensureCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  private ensureMusic() {
    if (typeof window === "undefined") return;
    if (this.musicEl) return;
    const el = new Audio("/audio/ambient.mp3");
    el.loop = true;
    el.preload = "auto";
    el.volume = 0;
    this.musicEl = el;
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    try {
      this.musicSrc = ctx.createMediaElementSource(el);
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = 1;
      this.musicSrc.connect(this.musicGain).connect(this.master);
    } catch {
      // MediaElementSource can fail on some browsers — fall back to <audio>'s own volume.
    }
  }

  async toggle(): Promise<void> {
    this.enabled = !this.enabled;
    localStorage.setItem(STORAGE_KEY, this.enabled ? "1" : "0");
    this.emit();
    this.ensureCtx();
    if (this.enabled) {
      this.ensureMusic();
      if (this.musicEl) {
        try {
          await this.musicEl.play();
          this.fadeMusic(MUSIC_TARGET, 2000);
        } catch {
          // 0-byte placeholder or autoplay block — ignore
        }
      }
    } else {
      this.fadeMusic(0, 1000, () => this.musicEl?.pause());
      this.stopCity();
    }
  }

  private fadeMusic(target: number, ms: number, done?: () => void) {
    const el = this.musicEl;
    if (!el) return;
    const start = el.volume;
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      el.volume = start + (target - start) * k;
      if (k < 1) requestAnimationFrame(step);
      else done?.();
    };
    requestAnimationFrame(step);
  }

  // ───────── City ambient ─────────
  setCityAmbient(on: boolean) {
    if (!this.enabled) {
      if (this.cityActive) this.stopCity();
      return;
    }
    if (on && !this.cityActive) this.startCity();
    else if (!on && this.cityActive) this.stopCity();
  }

  private startCity() {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const bufLen = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 600;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(bp).connect(g).connect(this.master);
    src.start();
    g.gain.linearRampToValueAtTime(CITY_TARGET, ctx.currentTime + 1.5);
    this.cityNoise = src;
    this.cityGain = g;
    this.cityActive = true;
  }

  private stopCity() {
    const ctx = this.ctx;
    const src = this.cityNoise;
    const g = this.cityGain;
    if (!ctx || !src || !g) {
      this.cityActive = false;
      return;
    }
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    setTimeout(() => {
      try {
        src.stop();
      } catch {
        /* noop */
      }
    }, 850);
    this.cityNoise = null;
    this.cityGain = null;
    this.cityActive = false;
  }

  // ───────── SFX primitives ─────────
  private blip(opts: {
    freq: number;
    durationMs: number;
    type?: OscillatorType;
    gain?: number;
  }) {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const dur = opts.durationMs / 1000;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.value = opts.freq;
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(opts.gain ?? 0.15, ctx.currentTime + 0.005);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
    osc.connect(g).connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  private noiseSweep(opts: {
    durationMs: number;
    fromFreq: number;
    toFreq: number;
    gain?: number;
  }) {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const dur = opts.durationMs / 1000;
    const bufLen = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(opts.fromFreq, ctx.currentTime);
    bp.frequency.linearRampToValueAtTime(opts.toFreq, ctx.currentTime + dur);
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(opts.gain ?? 0.18, ctx.currentTime + 0.01);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
    src.connect(bp).connect(g).connect(this.master);
    src.start();
    src.stop(ctx.currentTime + dur + 0.05);
  }

  // ───────── Public SFX ─────────
  click() {
    this.blip({ freq: 800, durationMs: 50, type: "sine", gain: 0.18 });
  }
  hover() {
    const now = performance.now();
    if (now - this.lastHoverAt < 80) return;
    this.lastHoverAt = now;
    this.blip({ freq: 1200, durationMs: 20, type: "sine", gain: 0.05 });
  }
  swooshOpen() {
    this.noiseSweep({ durationMs: 120, fromFreq: 400, toFreq: 1600 });
  }
  swooshClose() {
    this.noiseSweep({ durationMs: 120, fromFreq: 1600, toFreq: 400 });
  }
  toggleSfx() {
    this.blip({ freq: 600, durationMs: 30, type: "sine", gain: 0.14 });
    setTimeout(() => this.blip({ freq: 900, durationMs: 30, type: "sine", gain: 0.14 }), 35);
  }
  whoosh() {
    this.noiseSweep({ durationMs: 200, fromFreq: 200, toFreq: 600, gain: 0.22 });
  }
}

export const sound = new SoundManager();
