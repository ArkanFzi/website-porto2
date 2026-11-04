// Procedural Web Audio Engine (Zero external audio file dependencies)
// Synthesizes tactile mechanical Leica clicks, F1 telemetry drone, and scroll revs in real-time.

class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private muted: boolean = true;
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("af_audio_muted");
      this.muted = saved !== null ? saved === "true" : true;
    }
  }

  private initContext() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (typeof window !== "undefined") {
      localStorage.setItem("af_audio_muted", String(muted));
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.4, this.ctx.currentTime, 0.05);
    }
    if (!muted) {
      this.initContext();
      this.startDrone();
      this.playClick(880, 0.03);
    } else {
      this.stopDrone();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // Tactical mechanical click (Leica shutter / Pit-wall switch)
  public playClick(freq = 1400, duration = 0.018) {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // AudioContext dropped
    }
  }

  // F1 Subsonic Telemetry Drone
  public startDrone() {
    if (this.muted || this.droneOsc) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    try {
      this.droneOsc = this.ctx.createOscillator();
      this.droneGain = this.ctx.createGain();

      this.droneOsc.type = "triangle";
      this.droneOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // 55Hz (A1) subsonic

      this.droneGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.droneGain.gain.linearRampToValueAtTime(0.025, this.ctx.currentTime + 1.2);

      this.droneOsc.connect(this.droneGain);
      this.droneGain.connect(this.masterGain);

      this.droneOsc.start();
    } catch {
      // Audio error
    }
  }

  public stopDrone() {
    if (this.droneOsc && this.droneGain && this.ctx) {
      try {
        this.droneGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);
        setTimeout(() => {
          this.droneOsc?.stop();
          this.droneOsc?.disconnect();
          this.droneOsc = null;
        }, 300);
      } catch {
        this.droneOsc = null;
      }
    }
  }

  // Speed modulation for scroll velocity
  public updateScrollVelocity(velocity: number) {
    if (this.muted || !this.droneOsc || !this.ctx) return;
    const absVel = Math.min(Math.abs(velocity), 15);
    const targetFreq = 55 + absVel * 8.5; // Frequency revs up slightly with speed
    this.droneOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
  }
}

export const audioEngine = new WebAudioEngine();
export default audioEngine;
