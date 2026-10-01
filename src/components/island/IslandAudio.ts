// Every sound is synthesized with WebAudio, so the island ships no audio files.

export type Sfx = 'step-grass' | 'step-wood' | 'cast' | 'plop' | 'bite' | 'catch' | 'pat' | 'rustle' | 'fire' | 'sign' | 'click';

// A gentle C-major pentatonic music box, two octaves.
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
const PHRASES = [
  [0, 2, 4, 2, 3, -1, 2, -1],
  [4, 5, 4, 2, 3, 2, 0, -1],
  [2, 4, 5, 7, 6, 4, 5, -1],
  [3, 2, 0, 2, 1, -1, 0, -1],
];
const BASS = [130.81, 174.61, 196.0, 130.81];

export class IslandAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private reverb: DelayNode | null = null;
  private noise: AudioBuffer | null = null;
  private timers: number[] = [];
  private enabled = false;
  private beat = 0;

  get on(): boolean {
    return this.enabled;
  }

  async enable(): Promise<void> {
    if (this.enabled) return;
    this.enabled = true;
    if (!this.context) this.build();
    const context = this.context!;
    await context.resume().catch(() => undefined);
    this.master!.gain.cancelScheduledValues(context.currentTime);
    this.master!.gain.setTargetAtTime(0.9, context.currentTime, 0.4);
    this.startAmbience();
  }

  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers = [];
    const context = this.context;
    if (!context || !this.master) return;
    this.master.gain.setTargetAtTime(0, context.currentTime, 0.15);
    this.later(() => {
      if (!this.enabled) void context.suspend().catch(() => undefined);
    }, 700);
  }

  dispose(): void {
    this.disable();
    void this.context?.close().catch(() => undefined);
    this.context = null;
  }

  // Animalese-style babble: each letter gets its own little chirp pitch.
  blip(char: string, index: number): void {
    const context = this.ready();
    if (!context || !/[a-z0-9]/i.test(char)) return;
    const code = char.toLowerCase().charCodeAt(0);
    const vowel = 'aeiou'.includes(char.toLowerCase());
    const pitch = 620 * Math.pow(2, ((code * 7) % 12) / 24) * (index % 5 === 0 ? 1.12 : 1);
    const now = context.currentTime;
    const length = vowel ? 0.075 : 0.05;
    const voice = context.createOscillator();
    voice.type = 'square';
    voice.frequency.setValueAtTime(pitch * 1.06, now);
    voice.frequency.exponentialRampToValueAtTime(pitch * 0.94, now + length);
    const body = context.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(pitch / 2, now);
    const formant = context.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.value = vowel ? 1500 : 2300;
    formant.Q.value = 1.4;
    const gain = this.envelope(now, 0.006, length, 0.11);
    voice.connect(formant).connect(gain);
    body.connect(gain);
    gain.connect(this.master!);
    [voice, body].forEach((osc) => {
      osc.start(now);
      osc.stop(now + length + 0.05);
    });
  }

  play(sfx: Sfx): void {
    const context = this.ready();
    if (!context) return;
    const now = context.currentTime;
    switch (sfx) {
      case 'step-grass':
        this.noiseHit(now, 0.045, 'lowpass', 700 + Math.random() * 300, 0.05);
        break;
      case 'step-wood':
        this.tone(now, 'triangle', 240 + Math.random() * 30, 180, 0.06, 0.07);
        this.noiseHit(now, 0.03, 'bandpass', 1400, 0.03);
        break;
      case 'cast':
        this.sweep(now, 0.35, 900, 3200, 0.05);
        break;
      case 'plop':
        this.tone(now, 'sine', 520, 160, 0.18, 0.16);
        this.noiseHit(now + 0.02, 0.12, 'lowpass', 1200, 0.05);
        break;
      case 'bite':
        [0, 0.16].forEach((offset) => this.tone(now + offset, 'sine', 380, 700, 0.11, 0.12));
        break;
      case 'catch':
        [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => this.bell(now + i * 0.09, f, 0.12, 0.9));
        this.bell(now + 0.5, 1567.98, 0.1, 1.4);
        break;
      case 'pat':
        this.tone(now, 'sine', 900, 1500, 0.09, 0.12);
        this.tone(now + 0.1, 'sine', 1200, 1900, 0.1, 0.1);
        break;
      case 'rustle':
        for (let i = 0; i < 7; i++) this.noiseHit(now + i * 0.05 + Math.random() * 0.03, 0.08, 'highpass', 2500 + Math.random() * 2000, 0.05);
        break;
      case 'fire':
        this.noiseHit(now, 0.25, 'lowpass', 500, 0.12);
        for (let i = 0; i < 5; i++) this.noiseHit(now + 0.05 + Math.random() * 0.3, 0.02, 'highpass', 3000, 0.08);
        break;
      case 'sign':
        this.tone(now, 'triangle', 330, 300, 0.08, 0.09);
        this.tone(now + 0.08, 'triangle', 300, 280, 0.08, 0.07);
        break;
      case 'click':
        this.tone(now, 'sine', 700, 980, 0.05, 0.08);
        break;
    }
  }

  private build(): void {
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new Context();
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = 0;
    const soften = context.createBiquadFilter();
    soften.type = 'lowpass';
    soften.frequency.value = 7000;
    this.master.connect(soften).connect(context.destination);

    // A short feedback delay stands in for a reverb and makes the music box feel roomy.
    this.reverb = context.createDelay(1);
    this.reverb.delayTime.value = 0.31;
    const feedback = context.createGain();
    feedback.gain.value = 0.32;
    const tone = context.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2200;
    this.reverb.connect(tone).connect(feedback).connect(this.reverb);
    tone.connect(this.master);

    this.music = context.createGain();
    this.music.gain.value = 0.55;
    this.music.connect(this.master);
    this.music.connect(this.reverb);

    const length = context.sampleRate * 2;
    this.noise = context.createBuffer(1, length, context.sampleRate);
    const data = this.noise.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < length; i++) {
      brown = (brown + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = brown * 3.5 + (Math.random() * 2 - 1) * 0.25;
    }

    // Wind: looping soft noise that swells slowly.
    const wind = context.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    const windFilter = context.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 420;
    const windGain = context.createGain();
    windGain.gain.value = 0.05;
    const swell = context.createOscillator();
    swell.frequency.value = 0.07;
    const swellDepth = context.createGain();
    swellDepth.gain.value = 0.035;
    swell.connect(swellDepth).connect(windGain.gain);
    wind.connect(windFilter).connect(windGain).connect(this.master);
    wind.start();
    swell.start();
  }

  private startAmbience(): void {
    this.beat = 0;
    this.later(() => this.musicStep(), 600);
    this.later(() => this.crackle(), 300);
    this.later(() => this.bird(), 3000 + Math.random() * 4000);
  }

  private musicStep(): void {
    const context = this.ready();
    if (!context) return;
    const phrase = PHRASES[Math.floor(this.beat / 8) % PHRASES.length];
    const index = phrase[this.beat % 8];
    const now = context.currentTime;
    if (index >= 0) this.bell(now, SCALE[index], 0.09, 1.6, this.music!);
    if (this.beat % 8 === 0) this.bell(now, BASS[Math.floor(this.beat / 8) % BASS.length], 0.07, 2.6, this.music!);
    this.beat++;
    // Rest for a breath after every four phrases so it never feels like a loop.
    const rest = this.beat % 32 === 0 ? 4200 : 0;
    this.later(() => this.musicStep(), 520 + rest);
  }

  private crackle(): void {
    const context = this.ready();
    if (!context) return;
    this.noiseHit(context.currentTime, 0.015 + Math.random() * 0.02, 'highpass', 2000 + Math.random() * 2500, 0.012 + Math.random() * 0.02);
    this.later(() => this.crackle(), 60 + Math.random() * 380);
  }

  private bird(): void {
    const context = this.ready();
    if (!context) return;
    const now = context.currentTime;
    const base = 2600 + Math.random() * 900;
    const chirps = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < chirps; i++) this.tone(now + i * 0.13, 'sine', base, base * 1.35, 0.07, 0.025);
    this.later(() => this.bird(), 6000 + Math.random() * 9000);
  }

  private ready(): AudioContext | null {
    return this.enabled && this.context && this.master ? this.context : null;
  }

  private later(callback: () => void, ms: number): void {
    const timer = window.setTimeout(() => {
      this.timers = this.timers.filter((t) => t !== timer);
      callback();
    }, ms);
    this.timers.push(timer);
  }

  private envelope(start: number, attack: number, decay: number, peak: number): GainNode {
    const gain = this.context!.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
    return gain;
  }

  private tone(start: number, type: OscillatorType, from: number, to: number, length: number, peak: number): void {
    const context = this.context!;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + length);
    osc.connect(this.envelope(start, 0.008, length, peak)).connect(this.master!);
    osc.start(start);
    osc.stop(start + length + 0.05);
  }

  private bell(start: number, frequency: number, peak: number, decay: number, out: AudioNode = this.master!): void {
    const context = this.context!;
    const gain = this.envelope(start, 0.005, decay, peak);
    gain.connect(out);
    [1, 2.0, 3.01].forEach((ratio, i) => {
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency * ratio;
      const partial = context.createGain();
      partial.gain.value = [1, 0.28, 0.1][i];
      osc.connect(partial).connect(gain);
      osc.start(start);
      osc.stop(start + decay + 0.1);
    });
  }

  private sweep(start: number, length: number, from: number, to: number, peak: number): void {
    const context = this.context!;
    const source = context.createBufferSource();
    source.buffer = this.noise;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(to, start + length);
    source.connect(filter).connect(this.envelope(start, 0.05, length, peak)).connect(this.master!);
    source.start(start, Math.random());
    source.stop(start + length + 0.1);
  }

  private noiseHit(start: number, length: number, type: BiquadFilterType, frequency: number, peak: number): void {
    const context = this.context!;
    const source = context.createBufferSource();
    source.buffer = this.noise;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    source.connect(filter).connect(this.envelope(start, 0.004, length, peak)).connect(this.master!);
    source.start(start, Math.random() * 1.5);
    source.stop(start + length + 0.05);
  }
}
