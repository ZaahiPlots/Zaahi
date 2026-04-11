/**
 * ZAAHI sound system — singleton on top of Web Audio API + an <audio>
 * element playlist for ambient music. One master switch turns everything
 * on/off; preference is persisted to localStorage.
 *
 * SFX are generated programmatically (no asset files needed — they're
 * synthesised live with OscillatorNode + AudioBufferSource white noise).
 *
 * Background music tracks live in /public/audio/. The playlist is the
 * MUSIC_TRACKS array below — when one track ends, the next starts;
 * after the last, we loop back to the first. Tracks that 404 or fail
 * to play (e.g. zero-byte placeholders) are silently skipped.
 */
"use client";

const STORAGE_KEY = "zaahi:sound:enabled";
// Founder spec 2026-04-12: 30% volume on the music master.
const MUSIC_TARGET = 0.30;
const CITY_TARGET = 0.08;

// Playlist — drop real MP3s into public/audio/ matching these names.
// Files that fail to load (404 / 0 bytes) are silently skipped.
const MUSIC_TRACKS = ["/audio/ambient.mp3", "/audio/ambient2.mp3"];

type Listener = (enabled: boolean) => void;

class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  // Music — playlist of <audio> elements, played sequentially in a loop.
  private musicEls: HTMLAudioElement[] = [];
  private musicIdx = 0;
  private musicPlaying = false;

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
    if (this.musicEls.length > 0) return;
    for (const src of MUSIC_TRACKS) {
      const el = new Audio(src);
      el.preload = "auto";
      el.volume = 0;
      // No `loop` — we manually advance to the next track when one
      // ends, so the playlist progresses sequentially.
      el.addEventListener("ended", () => {
        if (!this.enabled) return;
        this.advanceTrack();
      });
      // If a file errors out (404 / 0 bytes / decode fail), advance.
      el.addEventListener("error", () => {
        if (!this.enabled) return;
        this.advanceTrack();
      });
      this.musicEls.push(el);
    }
  }

  private advanceTrack() {
    if (this.musicEls.length === 0) return;
    this.musicIdx = (this.musicIdx + 1) % this.musicEls.length;
    void this.playCurrent();
  }

  private async playCurrent(): Promise<void> {
    const el = this.musicEls[this.musicIdx];
    if (!el) return;
    el.volume = MUSIC_TARGET;
    try {
      el.currentTime = 0;
      await el.play();
      this.musicPlaying = true;
    } catch {
      // 0-byte placeholder, autoplay block, or decode fail — try the
      // next track in the playlist. Bail after a full loop so we don't
      // spin forever on an all-empty playlist.
      const start = this.musicIdx;
      do {
        this.musicIdx = (this.musicIdx + 1) % this.musicEls.length;
        if (this.musicIdx === start) {
          this.musicPlaying = false;
          return;
        }
        const next = this.musicEls[this.musicIdx];
        try {
          next.volume = MUSIC_TARGET;
          next.currentTime = 0;
          await next.play();
          this.musicPlaying = true;
          return;
        } catch {
          /* keep trying */
        }
      } while (true);
    }
  }

  private stopMusic() {
    for (const el of this.musicEls) {
      try {
        el.pause();
      } catch {
        /* noop */
      }
    }
    this.musicPlaying = false;
  }

  async toggle(): Promise<void> {
    this.enabled = !this.enabled;
    localStorage.setItem(STORAGE_KEY, this.enabled ? "1" : "0");
    this.emit();
    this.ensureCtx();
    if (this.enabled) {
      this.ensureMusic();
      this.musicIdx = 0;
      void this.playCurrent();
    } else {
      this.stopMusic();
      this.stopCity();
    }
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

  // ───────── Public SFX (founder spec 2026-04-12) ─────────

  /**
   * Click on a parcel — cyberpunk "whoosh + click", ~150 ms total.
   *
   *   Layer 1: oscillator sweep 800 Hz → 200 Hz over 100 ms
   *   Layer 2: white-noise burst 50 ms (fires simultaneously)
   *
   * Both go through the master gain so the toggle button mutes them.
   */
  click() {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    // Layer 1 — oscillator sweep
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800, t0);
    osc.frequency.exponentialRampToValueAtTime(200, t0 + 0.1);
    oscGain.gain.value = 0;
    oscGain.gain.linearRampToValueAtTime(0.18, t0 + 0.005);
    oscGain.gain.linearRampToValueAtTime(0, t0 + 0.1);
    osc.connect(oscGain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.12);

    // Layer 2 — white-noise burst (50 ms)
    const burstLen = Math.max(1, Math.floor(ctx.sampleRate * 0.05));
    const buf = ctx.createBuffer(1, burstLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < burstLen; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1000;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    noiseGain.gain.linearRampToValueAtTime(0.14, t0 + 0.003);
    noiseGain.gain.linearRampToValueAtTime(0, t0 + 0.05);
    noiseSrc.connect(hp).connect(noiseGain).connect(this.master);
    noiseSrc.start(t0);
    noiseSrc.stop(t0 + 0.08);
  }

  /**
   * Hover on a parcel — light cyberpunk blip.
   *   Single tone 600 Hz, 50 ms, fade out.
   * Throttled to once every 80 ms so dragging across plots doesn't spam.
   */
  hover() {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastHoverAt < 80) return;
    this.lastHoverAt = now;
    this.blip({ freq: 600, durationMs: 50, type: "sine", gain: 0.08 });
  }

  /** Swoosh — kept for the side panel close transition. */
  swooshOpen() {
    this.noiseSweep({ durationMs: 120, fromFreq: 400, toFreq: 1600 });
  }
  swooshClose() {
    this.noiseSweep({ durationMs: 120, fromFreq: 1600, toFreq: 400 });
  }

  /**
   * Layer toggle (checkbox in the layers panel) — soft switch click.
   *   Single tone 400 Hz, 30 ms, sine.
   */
  toggleSfx() {
    this.blip({ freq: 400, durationMs: 30, type: "sine", gain: 0.12 });
  }

  /** Generic loud whoosh — kept for legacy callers. */
  whoosh() {
    this.noiseSweep({ durationMs: 200, fromFreq: 200, toFreq: 600, gain: 0.22 });
  }
}

export const sound = new SoundManager();
