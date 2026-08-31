/**
 * SCADA Web Audio Service
 * Provides browser-synthesized audio alert tones for industrial alarms and events.
 * Uses Web Audio API without needing external asset dependencies.
 */

export type AlarmAudioProfile = 'industrial' | 'siren' | 'beeps' | 'modern';

class ScadaAudioService {
  private ctx: AudioContext | null = null;
  private isUnlocked = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Unlocks Web Audio on first user interaction to satisfy browser autoplay policies
   */
  public unlockAudio(): void {
    if (this.isUnlocked) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.isUnlocked = true;
      }).catch(() => {});
    } else {
      this.isUnlocked = true;
    }
  }

  /**
   * Play browser-synthesized alarm alert based on alarm severity
   */
  public playAlarmAlert(
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' = 'HIGH',
    volume: number = 0.7,
    profile: AlarmAudioProfile = 'industrial'
  ): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      const clampedVol = Math.max(0.05, Math.min(1.0, volume)) * 0.35; // Master attenuation to prevent harsh clipping
      masterGain.gain.setValueAtTime(clampedVol, now);
      masterGain.connect(ctx.destination);

      if (severity === 'CRITICAL') {
        this.playCriticalAlarm(ctx, masterGain, now, profile);
      } else if (severity === 'HIGH') {
        this.playHighAlarm(ctx, masterGain, now, profile);
      } else {
        this.playNoticeChime(ctx, masterGain, now);
      }
    } catch (err) {
      console.warn('Unable to play browser SCADA audio alert:', err);
    }
  }

  /**
   * Critical Priority: Urgent alternating dual-tone industrial siren
   */
  private playCriticalAlarm(
    ctx: AudioContext,
    masterGain: GainNode,
    startTime: number,
    profile: AlarmAudioProfile
  ): void {
    if (profile === 'siren') {
      // Modulated frequency siren (800Hz <-> 1200Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';

      osc.frequency.setValueAtTime(800, startTime);
      osc.frequency.linearRampToValueAtTime(1200, startTime + 0.25);
      osc.frequency.linearRampToValueAtTime(800, startTime + 0.5);
      osc.frequency.linearRampToValueAtTime(1200, startTime + 0.75);
      osc.frequency.linearRampToValueAtTime(800, startTime + 1.0);

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(0.8, startTime + 0.05);
      gain.gain.setValueAtTime(0.8, startTime + 0.95);
      gain.gain.linearRampToValueAtTime(0.001, startTime + 1.05);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 1.05);
      return;
    }

    // Default Industrial / Beeps: High-urgency triple pulses
    const pulseCount = 3;
    const pulseDuration = 0.14;
    const gap = 0.08;

    for (let i = 0; i < pulseCount; i++) {
      const pStart = startTime + i * (pulseDuration + gap);
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const pGain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(950, pStart);
      osc2.frequency.setValueAtTime(1420, pStart);

      pGain.gain.setValueAtTime(0.001, pStart);
      pGain.gain.linearRampToValueAtTime(0.7, pStart + 0.02);
      pGain.gain.setValueAtTime(0.7, pStart + pulseDuration - 0.03);
      pGain.gain.linearRampToValueAtTime(0.001, pStart + pulseDuration);

      osc1.connect(pGain);
      osc2.connect(pGain);
      pGain.connect(masterGain);

      osc1.start(pStart);
      osc2.start(pStart);
      osc1.stop(pStart + pulseDuration);
      osc2.stop(pStart + pulseDuration);
    }
  }

  /**
   * High Priority: Dual-tone warning double-beep
   */
  private playHighAlarm(
    ctx: AudioContext,
    masterGain: GainNode,
    startTime: number,
    _profile: AlarmAudioProfile
  ): void {
    const tones = [
      { freq: 760, duration: 0.16, delay: 0 },
      { freq: 940, duration: 0.20, delay: 0.22 },
    ];

    tones.forEach(({ freq, duration, delay }) => {
      const pStart = startTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, pStart);

      gain.gain.setValueAtTime(0.001, pStart);
      gain.gain.linearRampToValueAtTime(0.8, pStart + 0.02);
      gain.gain.setValueAtTime(0.8, pStart + duration - 0.04);
      gain.gain.linearRampToValueAtTime(0.001, pStart + duration);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(pStart);
      osc.stop(pStart + duration);
    });
  }

  /**
   * Medium/Low/Info: Gentle notification chime
   */
  private playNoticeChime(
    ctx: AudioContext,
    masterGain: GainNode,
    startTime: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, startTime);
    osc.frequency.exponentialRampToValueAtTime(880, startTime + 0.15);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.6, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + 0.35);
  }

  /**
   * Test chime for verifying browser sound
   */
  public playTestSound(volume: number = 0.7): void {
    this.playAlarmAlert('HIGH', volume, 'industrial');
  }
}

export const scadaAudio = new ScadaAudioService();
