export type BgmMode = 'title' | 'explore' | 'combat' | 'boss';

export type SfxType =
  | 'sword'
  | 'heavy_axe'
  | 'dagger'
  | 'staff'
  | 'unarmed'
  | 'sever_limb'
  | 'coin_flip'
  | 'coin_land'
  | 'step'
  | 'loot'
  | 'ritual'
  | 'ui_move'
  | 'ui_confirm'
  | 'explosion'
  | 'heal'
  | 'hurt'
  | 'miss'
  | 'enemy_alert';

export interface AudioVisualSettings {
  bgmVolume: number; // 0..1
  sfxVolume: number; // 0..1
  muted: boolean;
  screenShakeEnabled: boolean;
  filmGrainEnabled: boolean;
}

const SETTINGS_STORAGE_KEY = 'vaelis_audio_settings_v1';

const DEFAULT_SETTINGS: AudioVisualSettings = {
  bgmVolume: 0.45,
  sfxVolume: 0.75,
  muted: false,
  screenShakeEnabled: true,
  filmGrainEnabled: true,
};

function loadStoredSettings(): AudioVisualSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AudioVisualSettings>;
    return {
      bgmVolume:
        typeof parsed.bgmVolume === 'number'
          ? Math.max(0, Math.min(1, parsed.bgmVolume))
          : DEFAULT_SETTINGS.bgmVolume,
      sfxVolume:
        typeof parsed.sfxVolume === 'number'
          ? Math.max(0, Math.min(1, parsed.sfxVolume))
          : DEFAULT_SETTINGS.sfxVolume,
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_SETTINGS.muted,
      screenShakeEnabled:
        typeof parsed.screenShakeEnabled === 'boolean'
          ? parsed.screenShakeEnabled
          : DEFAULT_SETTINGS.screenShakeEnabled,
      filmGrainEnabled:
        typeof parsed.filmGrainEnabled === 'boolean'
          ? parsed.filmGrainEnabled
          : DEFAULT_SETTINGS.filmGrainEnabled,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private isTabHidden: boolean = false;

  private settings: AudioVisualSettings = loadStoredSettings();
  private currentBgmMode: BgmMode | null = null;
  private currentLowMind: boolean = false;
  private bgmIntervalIds: number[] = [];
  private bgmNodes: AudioNode[] = [];
  private bgmStep: number = 0;

  get muted(): boolean {
    return this.settings.muted;
  }

  set muted(val: boolean) {
    this.updateSettings({ muted: val });
  }

  getSettings(): AudioVisualSettings {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<AudioVisualSettings>): AudioVisualSettings {
    this.settings = {
      ...this.settings,
      ...partial,
      bgmVolume:
        partial.bgmVolume !== undefined
          ? Math.max(0, Math.min(1, partial.bgmVolume))
          : this.settings.bgmVolume,
      sfxVolume:
        partial.sfxVolume !== undefined
          ? Math.max(0, Math.min(1, partial.sfxVolume))
          : this.settings.sfxVolume,
    };
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
      } catch {
        // Ignore storage quota errors
      }
    }
    this.syncGains();
    if (!this.settings.muted && !this.isTabHidden && this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.getSettings();
  }

  private syncGains() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const silenced = this.settings.muted || this.isTabHidden;
    const effectiveBgm = silenced ? 0 : this.settings.bgmVolume * 0.42;
    const effectiveSfx = silenced ? 0 : this.settings.sfxVolume;
    if (this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(effectiveBgm, now, 0.05);
    }
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(effectiveSfx, now, 0.02);
    }
  }

  public setTabHidden(hidden: boolean) {
    this.isTabHidden = hidden;
    this.syncGains();
    if (!this.ctx) return;
    if (hidden) {
      if (this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    } else if (!this.settings.muted && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private ensureCtx(allowWhenMuted = false): AudioContext | null {
    if (this.isTabHidden) return null;
    if ((!allowWhenMuted && this.settings.muted) || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterFilter = this.ctx.createBiquadFilter();
      this.masterFilter.type = 'lowpass';
      this.masterFilter.frequency.value = 3100;
      this.masterFilter.Q.value = 0.7;
      this.masterFilter.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.bgmGain.connect(this.masterFilter);
      this.sfxGain.connect(this.masterFilter);
      this.syncGains();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buf;
    return buf;
  }

  public unlockAndResume() {
    if (this.isTabHidden) return;
    this.ensureCtx(true);
    if (this.currentBgmMode) {
      const mode = this.currentBgmMode;
      const low = this.currentLowMind;
      if (this.bgmNodes.length === 0 && this.bgmIntervalIds.length === 0) {
        this.currentBgmMode = null;
        this.playBgm(mode, { mind: low ? 20 : 100 });
      }
    }
  }

  public stopBgm() {
    for (const id of this.bgmIntervalIds) {
      window.clearInterval(id);
    }
    this.bgmIntervalIds = [];
    for (const node of this.bgmNodes) {
      try {
        if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore already stopped nodes
      }
    }
    this.bgmNodes = [];
    this.currentBgmMode = null;
  }

  public playBgm(mode: BgmMode, opts?: { mind?: number }) {
    const lowMind = (opts?.mind ?? 100) < 30;
    if (
      this.currentBgmMode === mode &&
      this.currentLowMind === lowMind &&
      (this.bgmNodes.length > 0 || this.bgmIntervalIds.length > 0)
    ) {
      return;
    }
    this.stopBgm();
    this.currentBgmMode = mode;
    this.currentLowMind = lowMind;

    if (typeof window === 'undefined') return;
    const ctx = this.ensureCtx(true);
    if (!ctx || !this.bgmGain) return;
    this.syncGains();
    this.bgmStep = 0;

    if (mode === 'title') {
      // Gothic Phrygian Organ & Cathedral Drone (D2, A2, Eb3)
      const freqs = [73.42, 110.0, 146.83];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const g = ctx.createGain();
        osc.type = idx === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.value = f;
        filter.type = 'lowpass';
        filter.frequency.value = idx === 0 ? 220 : 420;
        g.gain.value = idx === 0 ? 0.22 : 0.14;
        osc.connect(filter);
        filter.connect(g);
        g.connect(this.bgmGain!);
        osc.start();
        this.bgmNodes.push(osc, filter, g);
      });

      const titleChords = [
        [146.83, 174.61, 220.0], // Dm
        [155.56, 196.0, 233.08], // Eb
        [130.81, 164.81, 196.0], // C
        [146.83, 155.56, 220.0], // D phrygian tension
      ];
      const id = window.setInterval(() => {
        if (!this.ctx || !this.bgmGain || this.settings.muted || this.isTabHidden || this.ctx.state !== 'running') return;
        const chord = titleChords[this.bgmStep % titleChords.length];
        this.bgmStep++;
        const now = this.ctx.currentTime;
        chord.forEach((freq) => {
          const osc = this.ctx!.createOscillator();
          const filter = this.ctx!.createBiquadFilter();
          const g = this.ctx!.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(520, now);
          g.gain.setValueAtTime(0.001, now);
          g.gain.linearRampToValueAtTime(0.06, now + 0.9);
          g.gain.exponentialRampToValueAtTime(0.001, now + 3.4);
          osc.connect(filter);
          filter.connect(g);
          g.connect(this.bgmGain!);
          osc.start(now);
          osc.stop(now + 3.5);
        });
      }, 3600);
      this.bgmIntervalIds.push(id);
      return;
    }

    if (mode === 'explore') {
      // Deep dungeon drone + sweeping subterranean wind + occasional water drop + low-mind heartbeat/detune
      const drone = ctx.createOscillator();
      const droneFilter = ctx.createBiquadFilter();
      const droneGain = ctx.createGain();
      drone.type = 'sawtooth';
      drone.frequency.value = lowMind ? 51.9 : 55.0;
      if (lowMind) {
        drone.detune.value = -14;
      }
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = lowMind ? 260 : 165;
      droneGain.gain.value = 0.24;
      drone.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(this.bgmGain);
      drone.start();
      this.bgmNodes.push(drone, droneFilter, droneGain);

      // Wind noise bed
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = this.getNoiseBuffer(ctx);
      noiseSrc.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 340;
      windFilter.Q.value = 2.4;
      const windLfo = ctx.createOscillator();
      const windLfoGain = ctx.createGain();
      windLfo.frequency.value = 0.12;
      windLfoGain.gain.value = 180;
      windLfo.connect(windLfoGain);
      windLfoGain.connect(windFilter.frequency);
      const windGain = ctx.createGain();
      windGain.gain.value = 0.09;
      noiseSrc.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(this.bgmGain);
      noiseSrc.start();
      windLfo.start();
      this.bgmNodes.push(noiseSrc, windFilter, windLfo, windLfoGain, windGain);

      if (lowMind) {
        // Unstable phantom detuned drone + 60-BPM heartbeat pulse
        const eerieOsc = ctx.createOscillator();
        const eerieGain = ctx.createGain();
        eerieOsc.type = 'sine';
        eerieOsc.frequency.value = 113.5;
        eerieGain.gain.value = 0.08;
        eerieOsc.connect(eerieGain);
        eerieGain.connect(this.bgmGain);
        eerieOsc.start();
        this.bgmNodes.push(eerieOsc, eerieGain);
      }

      const id = window.setInterval(() => {
        if (!this.ctx || !this.bgmGain || this.settings.muted || this.isTabHidden || this.ctx.state !== 'running') return;
        const now = this.ctx.currentTime;
        this.bgmStep++;
        if (lowMind) {
          // Heartbeat lub-dub every second
          [0, 0.22].forEach((offset, idx) => {
            const hb = this.ctx!.createOscillator();
            const hg = this.ctx!.createGain();
            hb.type = 'sine';
            hb.frequency.setValueAtTime(idx === 0 ? 58 : 48, now + offset);
            hb.frequency.exponentialRampToValueAtTime(24, now + offset + 0.14);
            hg.gain.setValueAtTime(idx === 0 ? 0.26 : 0.18, now + offset);
            hg.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);
            hb.connect(hg);
            hg.connect(this.bgmGain!);
            hb.start(now + offset);
            hb.stop(now + offset + 0.17);
          });
        }
        // Subtle water drop every 3s
        if (this.bgmStep % 3 === 0) {
          const drop = this.ctx.createOscillator();
          const dg = this.ctx.createGain();
          drop.type = 'sine';
          const pitch = 920 + Math.random() * 440;
          drop.frequency.setValueAtTime(pitch, now);
          drop.frequency.exponentialRampToValueAtTime(pitch * 1.45, now + 0.07);
          dg.gain.setValueAtTime(0.06, now);
          dg.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
          drop.connect(dg);
          dg.connect(this.bgmGain);
          drop.start(now);
          drop.stop(now + 0.17);
        }
        // Distant iron chain chime every 7s
        if (this.bgmStep % 7 === 0) {
          [311.13, 466.16].forEach((cf, i) => {
            const chain = this.ctx!.createOscillator();
            const cg = this.ctx!.createGain();
            chain.type = 'triangle';
            chain.frequency.setValueAtTime(cf, now + i * 0.08);
            cg.gain.setValueAtTime(0.04, now + i * 0.08);
            cg.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.45);
            chain.connect(cg);
            cg.connect(this.bgmGain!);
            chain.start(now + i * 0.08);
            chain.stop(now + i * 0.08 + 0.46);
          });
        }
      }, 1000);
      this.bgmIntervalIds.push(id);
      return;
    }

    // COMBAT & BOSS MODE: Driving war drums + dark Phrygian bass & brass
    const isBoss = mode === 'boss';
    const intervalMs = isBoss ? 220 : 250;
    const bassPattern = isBoss
      ? [73.42, 73.42, 77.78, 73.42, 98.0, 87.31, 77.78, 65.41]
      : [73.42, 73.42, 87.31, 73.42, 77.78, 73.42, 110.0, 98.0];

    const id = window.setInterval(() => {
      if (!this.ctx || !this.bgmGain || this.settings.muted || this.isTabHidden || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const step = this.bgmStep++;

      // War drum kick on beats 0, 2, 4, 6 (double-time on boss)
      if (step % 2 === 0 || (isBoss && step % 4 === 3)) {
        const kick = this.ctx.createOscillator();
        const kg = this.ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(isBoss ? 125 : 108, now);
        kick.frequency.exponentialRampToValueAtTime(32, now + 0.12);
        kg.gain.setValueAtTime(isBoss ? 0.34 : 0.26, now);
        kg.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        kick.connect(kg);
        kg.connect(this.bgmGain);
        kick.start(now);
        kick.stop(now + 0.15);
      }

      // Metallic snare / anvil hit on offbeats
      if (step % 4 === 2) {
        const sn = this.ctx.createBufferSource();
        sn.buffer = this.getNoiseBuffer(this.ctx);
        const sf = this.ctx.createBiquadFilter();
        sf.type = 'highpass';
        sf.frequency.value = 1100;
        const sg = this.ctx.createGain();
        sg.gain.setValueAtTime(isBoss ? 0.14 : 0.1, now);
        sg.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        sn.connect(sf);
        sf.connect(sg);
        sg.connect(this.bgmGain);
        sn.start(now);
        sn.stop(now + 0.09);
      }

      // Gritty bass ostinato
      const bassFreq = bassPattern[step % bassPattern.length];
      const bass = this.ctx.createOscillator();
      const bf = this.ctx.createBiquadFilter();
      const bg = this.ctx.createGain();
      bass.type = 'sawtooth';
      bass.frequency.setValueAtTime(bassFreq, now);
      bf.type = 'lowpass';
      bf.frequency.setValueAtTime(isBoss ? 360 : 280, now);
      bg.gain.setValueAtTime(0.14, now);
      bg.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
      bass.connect(bf);
      bf.connect(bg);
      bg.connect(this.bgmGain);
      bass.start(now);
      bass.stop(now + 0.22);

      // Boss choir/organ stab every 8 steps
      if (isBoss && step % 8 === 0) {
        const stabs = step % 16 === 0 ? [146.83, 220.0, 233.08] : [155.56, 196.0, 293.66];
        stabs.forEach((f) => {
          const choir = this.ctx!.createOscillator();
          const cf = this.ctx!.createBiquadFilter();
          const cg = this.ctx!.createGain();
          choir.type = 'sawtooth';
          choir.frequency.setValueAtTime(f, now);
          cf.type = 'lowpass';
          cf.frequency.setValueAtTime(840, now);
          cg.gain.setValueAtTime(0.075, now);
          cg.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
          choir.connect(cf);
          cf.connect(cg);
          cg.connect(this.bgmGain!);
          choir.start(now);
          choir.stop(now + 0.86);
        });
      }
    }, intervalMs);
    this.bgmIntervalIds.push(id);
  }

  public playSfx(type: SfxType, opts?: { isCrit?: boolean; legPenalty?: number }) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;

    if (type === 'step') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = (opts?.legPenalty || 0) > 0 ? 64 : 92 + (Math.random() * 14 - 7);
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.055);
      g.gain.setValueAtTime(0.09, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.065);
      return;
    }

    if (type === 'ui_move') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.025);
      g.gain.setValueAtTime(0.06, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.03);
      return;
    }

    if (type === 'ui_confirm') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(560, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.05);
      g.gain.setValueAtTime(0.08, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.07);
      return;
    }

    if (type === 'sword') {
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);
      const nf = ctx.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.setValueAtTime(1600, now);
      nf.frequency.exponentialRampToValueAtTime(520, now + 0.14);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(opts?.isCrit ? 0.22 : 0.14, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(this.sfxGain);
      noise.start(now);
      noise.stop(now + 0.16);

      const ring = ctx.createOscillator();
      const rg = ctx.createGain();
      ring.type = 'triangle';
      ring.frequency.setValueAtTime(opts?.isCrit ? 1280 : 940, now);
      ring.frequency.exponentialRampToValueAtTime(410, now + 0.16);
      rg.gain.setValueAtTime(0.11, now);
      rg.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
      ring.connect(rg);
      rg.connect(this.sfxGain);
      ring.start(now);
      ring.stop(now + 0.18);
      return;
    }

    if (type === 'heavy_axe') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.26);
      g.gain.setValueAtTime(0.28, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.29);

      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);
      const nf = ctx.createBiquadFilter();
      nf.type = 'lowpass';
      nf.frequency.value = 650;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.2, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(this.sfxGain);
      noise.start(now);
      noise.stop(now + 0.23);
      return;
    }

    if (type === 'dagger') {
      [0, 0.05].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(idx === 0 ? 1850 : 2100, now + delay);
        osc.frequency.exponentialRampToValueAtTime(480, now + delay + 0.08);
        g.gain.setValueAtTime(0.11, now + delay);
        g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.09);
        osc.connect(g);
        g.connect(this.sfxGain!);
        osc.start(now + delay);
        osc.stop(now + delay + 0.095);
      });
      return;
    }

    if (type === 'staff') {
      [440, 659.25, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.035);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + idx * 0.035 + 0.28);
        g.gain.setValueAtTime(0.09, now + idx * 0.035);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.29);
        osc.connect(g);
        g.connect(this.sfxGain!);
        osc.start(now + idx * 0.035);
        osc.stop(now + idx * 0.035 + 0.3);
      });
      return;
    }

    if (type === 'unarmed') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.11);
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.13);
      return;
    }

    if (type === 'sever_limb') {
      [210, 140, 75].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        osc.frequency.exponentialRampToValueAtTime(26, now + idx * 0.04 + 0.16);
        g.gain.setValueAtTime(0.2, now + idx * 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.17);
        osc.connect(g);
        g.connect(this.sfxGain!);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.18);
      });
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);
      const nf = ctx.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.value = 950;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.18, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(this.sfxGain);
      noise.start(now);
      noise.stop(now + 0.23);
      return;
    }

    if (type === 'coin_flip') {
      [2200, 3150, 2600].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.045);
        g.gain.setValueAtTime(0.09, now + idx * 0.045);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.14);
        osc.connect(g);
        g.connect(this.sfxGain!);
        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.15);
      });
      return;
    }

    if (type === 'coin_land') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1680, now);
      osc.frequency.exponentialRampToValueAtTime(1120, now + 0.14);
      g.gain.setValueAtTime(0.14, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.17);
      return;
    }

    if (type === 'loot') {
      [392, 523.25, 659.25].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.055);
        g.gain.setValueAtTime(0.11, now + idx * 0.055);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.22);
        osc.connect(g);
        g.connect(this.sfxGain!);
        osc.start(now + idx * 0.055);
        osc.stop(now + idx * 0.055 + 0.24);
      });
      return;
    }

    if (type === 'ritual') {
      [110, 164.81, 220, 329.63].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = idx === 0 ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(f, now);
        g.gain.setValueAtTime(idx === 0 ? 0.12 : 0.08, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
        osc.connect(g);
        g.connect(this.sfxGain!);
        osc.start(now);
        osc.stop(now + 0.75);
      });
      return;
    }

    if (type === 'explosion') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(22, now + 0.32);
      g.gain.setValueAtTime(0.26, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.35);
      return;
    }

    if (type === 'heal') {
      [330, 440, 554.37].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        g.gain.setValueAtTime(0.11, now + idx * 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.24);
        osc.connect(g);
        g.connect(this.sfxGain!);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.25);
      });
      return;
    }

    if (type === 'enemy_alert') {
      // Short sharp survival-horror detection sting (metal dissonance + high spike)
      [880, 1244.5, 1318.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = idx === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.018);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.12, now + idx * 0.018 + 0.09);
        g.gain.setValueAtTime(idx === 0 ? 0.14 : 0.11, now + idx * 0.018);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.018 + 0.18);
        osc.connect(g);
        g.connect(this.sfxGain!);
        osc.start(now + idx * 0.018);
        osc.stop(now + idx * 0.018 + 0.19);
      });
      return;
    }

    if (type === 'miss') {
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);
      const nf = ctx.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.setValueAtTime(900, now);
      nf.frequency.exponentialRampToValueAtTime(260, now + 0.16);
      nf.Q.value = 1.6;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.13, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(this.sfxGain);
      noise.start(now);
      noise.stop(now + 0.18);
      return;
    }

    // hurt
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(46, now + 0.18);
    g.gain.setValueAtTime(0.19, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  // Backward-compatible legacy helpers
  playStep(legPenalty: number = 0) {
    this.playSfx('step', { legPenalty });
  }

  playSlash(isCrit: boolean = false) {
    this.playSfx('sword', { isCrit });
  }

  playSever() {
    this.playSfx('sever_limb');
  }

  playExplosion() {
    this.playSfx('explosion');
  }

  playHealOrChime() {
    this.playSfx('heal');
  }

  playHurt() {
    this.playSfx('hurt');
  }
}

export const sfx = new SoundEngine();
