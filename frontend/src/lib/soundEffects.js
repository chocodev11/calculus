/**
 * Duolingo-Tier Physical Modal Sound Synthesizer Engine
 * Recreates Ambrose Yu's authentic acoustic palette:
 * 1. Mallet Noise Transient (Broadband burst through bandpass filter for physical impact).
 * 2. Dynamic Pitch-Drop Envelope (Plucky woody/metallic attack transient in first 15-20ms).
 * 3. Modal Inharmonic Partials (Marimba 1:4:10 & Celesta 1:2.756:5.404 physical overtone ratios).
 * 4. Frequency-Dependent Damping & Resonance Envelopes.
 * 
 * Zero external audio files, 0ms network latency, ~2KB footprint.
 */

class DuolingoSoundEngine {
  constructor() {
    this.ctx = null
    this.enabled = true
    this.comboCount = 0
    this.noiseBuffer = null

    // Restore preference from localStorage if available
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('calculus_sfx_enabled')
      if (stored !== null) {
        this.enabled = stored === 'true'
      }
    }
  }

  /**
   * Initializes or resumes the Web Audio Context
   */
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
    if (this.ctx && !this.noiseBuffer) {
      this.createNoiseBuffer()
    }
    return this.ctx
  }

  /**
   * Pre-generates a 50ms white noise buffer for realistic physical mallet strike transients
   */
  createNoiseBuffer() {
    if (!this.ctx) return
    const length = Math.floor(this.ctx.sampleRate * 0.05)
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
    const channelData = this.noiseBuffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
      // White noise with exponential decay baked in
      channelData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.25))
    }
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

  resetCombo() {
    this.comboCount = 0
  }

  triggerHaptic(pattern = 15) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern)
      } catch {}
    }
  }

  /**
   * Layer 1: Physical Mallet Impact Strike
   * Generates the crisp mechanical click when a mallet hits wood or metal
   */
  playMalletStrike(ctx, startTime, centerFreq = 2200, duration = 0.012, gainPeak = 0.15) {
    if (!this.noiseBuffer) this.createNoiseBuffer()
    if (!this.noiseBuffer) return

    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = this.noiseBuffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(centerFreq, startTime)
    filter.Q.setValueAtTime(3.5, startTime)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(gainPeak, startTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

    noiseSource.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    noiseSource.start(startTime)
    noiseSource.stop(startTime + duration + 0.005)
  }

  /**
   * Synthesizes an authentic Celesta / Glockenspiel bell tone with modal inharmonic partials
   * Partials: f0 (fundamental), 2.756*f0 (strike mode), 5.404*f0 (bell shimmer)
   */
  playCelestaTone(ctx, freq, startTime, duration = 0.35, gainPeak = 0.24) {
    // 1. Initial Mallet Strike Transient
    this.playMalletStrike(ctx, startTime, Math.min(3600, freq * 3.5), 0.015, gainPeak * 0.6)

    // 2. Modal Partials
    const partials = [
      { ratio: 1.000, type: 'sine',     gainScale: 1.00, decayScale: 1.00, pitchDrop: 35 },
      { ratio: 2.756, type: 'triangle', gainScale: 0.40, decayScale: 0.45, pitchDrop: 15 },
      { ratio: 5.404, type: 'sine',     gainScale: 0.18, decayScale: 0.22, pitchDrop: 0  },
    ]

    partials.forEach(({ ratio, type, gainScale, decayScale, pitchDrop }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const partialFreq = freq * ratio

      osc.type = type

      // Dynamic Pitch Drop in first 18ms (Acoustic deflection)
      const startPitch = partialFreq * (1 + pitchDrop / 1200)
      osc.frequency.setValueAtTime(startPitch, startTime)
      osc.frequency.exponentialRampToValueAtTime(partialFreq, startTime + 0.018)

      // Frequency-dependent exponential decay
      const partialDur = duration * decayScale
      const peak = gainPeak * gainScale

      gain.gain.setValueAtTime(0.0001, startTime)
      gain.gain.linearRampToValueAtTime(peak, startTime + 0.004)
      gain.gain.exponentialRampToValueAtTime(0.00001, startTime + partialDur)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + partialDur + 0.01)
    })
  }

  /**
   * Synthesizes an authentic Acoustic Marimba wooden bar strike
   * Partials: f0 (warm fundamental), 4.00*f0 (tuned 2nd mode), 10.0*f0 (woody bite)
   */
  playMarimbaTone(ctx, freq, startTime, duration = 0.22, gainPeak = 0.26) {
    // 1. Heavy Wooden Mallet Thump
    this.playMalletStrike(ctx, startTime, 1400, 0.018, gainPeak * 0.75)

    // 2. Marimba Inharmonic Modes (1 : 4 : 10)
    const modes = [
      { ratio: 1.0, type: 'sine',     gain: 1.00, dur: duration,        pitchShift: 60 },
      { ratio: 4.0, type: 'triangle', gain: 0.35, dur: duration * 0.35, pitchShift: 20 },
      { ratio: 9.8, type: 'sine',     gain: 0.12, dur: duration * 0.15, pitchShift: 0  },
    ]

    modes.forEach(({ ratio, type, gain: modeGain, dur, pitchShift }) => {
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()
      const targetFreq = freq * ratio

      osc.type = type

      // Woody transient pitch drop
      osc.frequency.setValueAtTime(targetFreq * (1 + pitchShift / 1200), startTime)
      osc.frequency.exponentialRampToValueAtTime(targetFreq, startTime + 0.022)

      const peak = gainPeak * modeGain
      gainNode.gain.setValueAtTime(0.0001, startTime)
      gainNode.gain.linearRampToValueAtTime(peak, startTime + 0.003)
      gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + dur)

      osc.connect(gainNode)
      gainNode.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + dur + 0.01)
    })
  }

  /**
   * Duolingo-Signature Correct Chime ("berr-ding!")
   * Musical Interval: Ascending Major Third (F#5 -> A#5)
   * With Streak Escalation (shifts up incrementally if on a streak!)
   */
  success() {
    if (!this.enabled) return
    const ctx = this.initContext()
    if (!ctx) return

    this.comboCount += 1
    this.triggerHaptic([20, 25, 35])

    const now = ctx.currentTime

    // Streak Pitch Scaling (micro-shift up to +2 semitones on high streaks)
    const streakOffset = Math.min(4, Math.floor(this.comboCount / 2)) * 0.03
    const fSharp5 = 739.99 * (1 + streakOffset) // F#5
    const aSharp5 = 932.33 * (1 + streakOffset) // A#5

    // Note 1: F#5 (fast sixteenth note attack 100ms)
    this.playCelestaTone(ctx, fSharp5, now, 0.18, 0.22)

    // Note 2: A#5 (glorious ringing resolution 380ms)
    this.playCelestaTone(ctx, aSharp5, now + 0.078, 0.42, 0.28)

    // If streak milestone reached (5, 10, 15...), add electric sparkle shimmer
    if (this.comboCount > 0 && this.comboCount % 5 === 0) {
      this.streakZap(now + 0.15)
    }
  }

  /**
   * Duolingo-Signature Incorrect Chime ("bom-whomp")
   * Musical Interval: Descending Tritone (F#4 -> C4) with muffled acoustic low-end thud
   */
  error() {
    if (!this.enabled) return
    const ctx = this.initContext()
    if (!ctx) return

    this.comboCount = 0
    this.triggerHaptic([45, 50, 45])

    const now = ctx.currentTime

    // 1. Muffled Sub-Bass Thud (Sine dropping 160Hz -> 48Hz through Lowpass)
    const subOsc = ctx.createOscillator()
    const subFilter = ctx.createBiquadFilter()
    const subGain = ctx.createGain()

    subOsc.type = 'sine'
    subOsc.frequency.setValueAtTime(160, now)
    subOsc.frequency.exponentialRampToValueAtTime(48, now + 0.18)

    subFilter.type = 'lowpass'
    subFilter.frequency.setValueAtTime(280, now)
    subFilter.frequency.exponentialRampToValueAtTime(80, now + 0.18)

    subGain.gain.setValueAtTime(0.001, now)
    subGain.gain.linearRampToValueAtTime(0.32, now + 0.012)
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)

    subOsc.connect(subFilter)
    subFilter.connect(subGain)
    subGain.connect(ctx.destination)

    subOsc.start(now)
    subOsc.stop(now + 0.24)

    // 2. Descending Cartoon Tritone Slide (F#4 369.99Hz -> C4 261.63Hz)
    const triOsc = ctx.createOscillator()
    const triGain = ctx.createGain()

    triOsc.type = 'triangle'
    triOsc.frequency.setValueAtTime(369.99, now)
    triOsc.frequency.exponentialRampToValueAtTime(261.63, now + 0.16)

    triGain.gain.setValueAtTime(0.001, now)
    triGain.gain.linearRampToValueAtTime(0.20, now + 0.015)
    triGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.20)

    triOsc.connect(triGain)
    triGain.connect(ctx.destination)

    triOsc.start(now)
    triOsc.stop(now + 0.22)
  }

  /**
   * Authentic Marimba Pop when selecting an option
   */
  pop() {
    if (!this.enabled) return
    const ctx = this.initContext()
    if (!ctx) return

    this.triggerHaptic(18)
    const now = ctx.currentTime

    // Marimba note A5 (880Hz) with natural woody strike
    this.playMarimbaTone(ctx, 880, now, 0.14, 0.24)
  }

  /**
   * Crisp 2.5D Mechanical Button Switch Click
   */
  click() {
    if (!this.enabled) return
    const ctx = this.initContext()
    if (!ctx) return

    this.triggerHaptic(14)
    const now = ctx.currentTime

    // Dual micro-transient simulating key actuation + release
    this.playMalletStrike(ctx, now, 2800, 0.008, 0.18)

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(540, now)
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.028)

    gain.gain.setValueAtTime(0.14, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.032)
  }

  /**
   * Heart Crack / Damage Sound
   */
  heartLoss() {
    if (!this.enabled) return
    const ctx = this.initContext()
    if (!ctx) return

    this.triggerHaptic([60, 40, 60])
    const now = ctx.currentTime

    // 1. Heavy Heart Impact Thud
    this.playMalletStrike(ctx, now, 450, 0.03, 0.35)

    // 2. High-Frequency Glass Fracture Transient
    this.playMalletStrike(ctx, now + 0.005, 5200, 0.04, 0.22)
  }

  /**
   * Electric Sparkle / Combo Lightning Power-up
   */
  streakZap(startTime) {
    const ctx = this.initContext()
    if (!ctx) return

    const now = startTime || ctx.currentTime
    const notes = [1046.50, 1318.51, 1567.98, 2093.00] // C6, E6, G6, C7

    notes.forEach((freq, idx) => {
      this.playCelestaTone(ctx, freq, now + idx * 0.035, 0.18, 0.12)
    })
  }

  /**
   * Glorious Lesson Completion Fanfare
   * F# Major Pentatonic Cascade with Shimmering Bells
   */
  complete() {
    if (!this.enabled) return
    const ctx = this.initContext()
    if (!ctx) return

    this.comboCount = 0
    this.triggerHaptic([30, 40, 30, 40, 70])

    const now = ctx.currentTime
    const melody = [
      { freq: 369.99, time: 0.00, dur: 0.16, gain: 0.22 }, // F#4
      { freq: 466.16, time: 0.08, dur: 0.16, gain: 0.24 }, // A#4
      { freq: 554.37, time: 0.16, dur: 0.18, gain: 0.24 }, // C#5
      { freq: 739.99, time: 0.24, dur: 0.22, gain: 0.26 }, // F#5
      { freq: 932.33, time: 0.34, dur: 0.65, gain: 0.32 }, // A#5 (Triumphant Long Ring)
    ]

    melody.forEach(({ freq, time, dur, gain }) => {
      this.playCelestaTone(ctx, freq, now + time, dur, gain)
    })

    // Add high sparkle resonance
    setTimeout(() => {
      this.streakZap(now + 0.45)
    }, 450)
  }
}

export const soundFX = new DuolingoSoundEngine()
export default soundFX
