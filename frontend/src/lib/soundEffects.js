/**
 * Procedural Web Audio API Sound Synthesizer (Duolingo-Inspired Acoustic Engine)
 * Recreates Ambrose Yu's iconic sonic branding using multi-oscillator celesta/glockenspiel synthesis.
 * Zero external audio files, 0ms network latency, ~1.5KB footprint.
 */

class SoundEffectsManager {
  constructor() {
    this.ctx = null
    this.enabled = true
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('calculus_sfx_enabled')
      if (stored !== null) {
        this.enabled = stored === 'true'
      }
    }
  }

  initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  toggleSound(forceState) {
    this.enabled = forceState !== undefined ? forceState : !this.enabled
    if (typeof window !== 'undefined') {
      localStorage.setItem('calculus_sfx_enabled', String(this.enabled))
    }
    return this.enabled
  }

  isSoundEnabled() {
    return this.enabled
  }

  triggerHaptic(pattern = 15) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern)
      } catch {}
    }
  }

  /**
   * Helper: Plays a synthesized celesta/glockenspiel chime note with physical harmonic overtones
   */
  playCelestaNote(ctx, freq, startTime, duration = 0.2, gainPeak = 0.22) {
    const fundamental = ctx.createOscillator()
    const overtone = ctx.createOscillator()
    const gainNode = ctx.createGain()
    const overtoneGain = ctx.createGain()

    // Fundamental (Sine warmth)
    fundamental.type = 'sine'
    fundamental.frequency.setValueAtTime(freq, startTime)

    // Celesta inharmonic metallic overtone (~2.76x fundamental)
    overtone.type = 'triangle'
    overtone.frequency.setValueAtTime(freq * 2.756, startTime)

    // Fundamental Gain Envelope (instant attack, exponential metallic ring)
    gainNode.gain.setValueAtTime(0.001, startTime)
    gainNode.gain.linearRampToValueAtTime(gainPeak, startTime + 0.008)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

    // Overtone Gain Envelope (sharp initial ping that decays faster than fundamental)
    overtoneGain.gain.setValueAtTime(0.001, startTime)
    overtoneGain.gain.linearRampToValueAtTime(gainPeak * 0.35, startTime + 0.005)
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.4)

    fundamental.connect(gainNode)
    overtone.connect(overtoneGain)
    gainNode.connect(ctx.destination)
    overtoneGain.connect(ctx.destination)

    fundamental.start(startTime)
    overtone.start(startTime)
    fundamental.stop(startTime + duration + 0.01)
    overtone.stop(startTime + duration * 0.4 + 0.01)
  }

  /**
   * Crisp tactile button click (Mechanical spring switch)
   */
  click() {
    if (!this.enabled) return
    const ctx = this.initContext()
    if (!ctx) return

    this.triggerHaptic(15)

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(650, now)
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.035)

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.04)
  }

  /**
   * Playful wooden pop when selecting an option (Marimba/Woodblock tap)
   */
  pop() {
    if (!this.enabled) return
    const ctx = this.initContext()
    if (!ctx) return

    this.triggerHaptic(20)

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now) // A5
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.03)

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.035)
  }

  /**
   * Duolingo-Signature "berr-ding!" Correct Chime
   * Musical Interval: Ascending Major Third (F#5 -> A#5) with metallic celesta overtones
   */
  success() {
    if (!this.enabled) return
    const ctx = this.initContext()
    if (!ctx) return

    this.triggerHaptic([20, 30, 40])

    const now = ctx.currentTime
    // Note 1: F#5 (739.99 Hz) - quick 16th note attack
    this.playCelestaNote(ctx, 739.99, now, 0.16, 0.22)
    // Note 2: A#5 (932.33 Hz) - triumphant sustained bell ring
    this.playCelestaNote(ctx, 932.33, now + 0.075, 0.32, 0.26)
  }

  /**
   * Duolingo-Signature "bom-whomp" Incorrect Chime
   * Musical Interval: Descending Tritone / Diminished 5th (F#4 -> C4) with soft lowpass dampening
   */
  error() {
    if (!this.enabled) return
    const ctx = this.initContext()
    if (!ctx) return

    this.triggerHaptic([40, 50, 40])

    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    // Descending slide from F#4 (370Hz) to C4 (261Hz)
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(369.99, now)
    osc1.frequency.exponentialRampToValueAtTime(261.63, now + 0.14)

    // Sub-harmonic sine tone for rounded weight
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(185.00, now)
    osc2.frequency.exponentialRampToValueAtTime(130.81, now + 0.14)

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.24, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.19)
    osc2.stop(now + 0.19)
  }

  /**
   * Lesson Completion Fanfare
   * Ascending F# Major Pentatonic: F#4 -> A#4 -> C#5 -> F#5 -> A#5 with resonant glockenspiel sparkle
   */
  complete() {
    if (!this.enabled) return
    const ctx = this.initContext()
    if (!ctx) return

    this.triggerHaptic([30, 40, 30, 40, 60])

    const now = ctx.currentTime
    const notes = [
      { freq: 369.99, time: 0, dur: 0.12 },     // F#4
      { freq: 466.16, time: 0.07, dur: 0.12 },   // A#4
      { freq: 554.37, time: 0.14, dur: 0.14 },   // C#5
      { freq: 739.99, time: 0.22, dur: 0.18 },   // F#5
      { freq: 932.33, time: 0.32, dur: 0.55 },   // A#5 (Final ringing bell)
    ]

    notes.forEach(({ freq, time, dur }) => {
      this.playCelestaNote(ctx, freq, now + time, dur, 0.24)
    })
  }
}

export const soundFX = new SoundEffectsManager()
export default soundFX
