/**
 * Tiny WebAudio synthesiser. Every sound in the game is generated at
 * runtime — no audio files, no loading screen.
 */

type ToneOpts = {
  freq: number;
  to?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
};

const MUTE_KEY = 'roast-and-ruin.muted';

class Sfx {
  private ctx: AudioContext | null = null;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  /** Must be called from a user gesture before the browser will play anything. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private tone({ freq, to, dur = 0.12, type = 'sine', gain = 0.14, delay = 0 }: ToneOpts): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur = 0.2, gain = 0.1, delay = 0, filterHz = 1200): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + delay;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterHz;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start(t0);
  }

  hover(): void {
    this.tone({ freq: 520, dur: 0.04, type: 'triangle', gain: 0.04 });
  }

  click(): void {
    this.tone({ freq: 220, to: 160, dur: 0.07, type: 'square', gain: 0.06 });
  }

  arrive(): void {
    this.tone({ freq: 660, to: 880, dur: 0.14, type: 'sine', gain: 0.09 });
    this.tone({ freq: 990, dur: 0.1, type: 'sine', gain: 0.04, delay: 0.08 });
  }

  pour(): void {
    this.noise(0.5, 0.05, 0, 900);
    this.tone({ freq: 180, to: 120, dur: 0.4, type: 'sawtooth', gain: 0.03 });
  }

  perfect(): void {
    [660, 880, 1320].forEach((f, i) =>
      this.tone({ freq: f, dur: 0.16, type: 'triangle', gain: 0.09, delay: i * 0.055 }),
    );
  }

  good(): void {
    this.tone({ freq: 520, dur: 0.12, type: 'triangle', gain: 0.08 });
    this.tone({ freq: 660, dur: 0.12, type: 'triangle', gain: 0.06, delay: 0.07 });
  }

  burnt(): void {
    this.tone({ freq: 150, to: 70, dur: 0.25, type: 'sawtooth', gain: 0.07 });
    this.noise(0.2, 0.05, 0.02, 700);
  }

  coin(): void {
    this.tone({ freq: 1180, dur: 0.07, type: 'square', gain: 0.05 });
    this.tone({ freq: 1560, dur: 0.12, type: 'square', gain: 0.04, delay: 0.06 });
  }

  serve(): void {
    this.tone({ freq: 420, to: 620, dur: 0.1, type: 'sine', gain: 0.08 });
    this.coin();
  }

  leave(): void {
    this.tone({ freq: 300, to: 140, dur: 0.3, type: 'triangle', gain: 0.08 });
  }

  buy(): void {
    this.tone({ freq: 740, to: 980, dur: 0.1, type: 'square', gain: 0.06 });
    this.tone({ freq: 1240, dur: 0.12, type: 'square', gain: 0.04, delay: 0.07 });
  }

  swing(): void {
    this.noise(0.13, 0.07, 0, 2400);
    this.tone({ freq: 640, to: 260, dur: 0.1, type: 'triangle', gain: 0.03 });
  }

  hit(): void {
    this.noise(0.09, 0.12, 0, 500);
    this.tone({ freq: 120, to: 60, dur: 0.12, type: 'square', gain: 0.06 });
  }

  hurt(): void {
    this.tone({ freq: 240, to: 90, dur: 0.28, type: 'sawtooth', gain: 0.1 });
    this.noise(0.16, 0.1, 0, 800);
  }

  pickup(): void {
    this.tone({ freq: 880, to: 1320, dur: 0.09, type: 'sine', gain: 0.06 });
  }

  descend(): void {
    [440, 330, 247].forEach((f, i) =>
      this.tone({ freq: f, dur: 0.3, type: 'sine', gain: 0.07, delay: i * 0.12 }),
    );
    this.noise(0.6, 0.04, 0.1, 400);
  }

  death(): void {
    [330, 262, 196, 131].forEach((f, i) =>
      this.tone({ freq: f, dur: 0.4, type: 'triangle', gain: 0.09, delay: i * 0.14 }),
    );
  }

  dawn(): void {
    [392, 523, 659, 784].forEach((f, i) =>
      this.tone({ freq: f, dur: 0.5, type: 'sine', gain: 0.06, delay: i * 0.1 }),
    );
  }

  candleOut(): void {
    this.noise(0.3, 0.08, 0, 350);
    this.tone({ freq: 90, to: 50, dur: 0.4, type: 'sine', gain: 0.07 });
  }
}

export const sfx = new Sfx();
