const STORAGE_KEYS = Object.freeze({
  sfxEnabled: 'calculus_sfx_enabled',
  hapticsEnabled: 'calculus_haptics_enabled',
  sfxVolume: 'calculus_sfx_volume',
})

const DEFAULT_SFX_VOLUME = 0.7

const CALCULUS_PITCH = Object.freeze({
  d4: 293.66,
  g4: 392.00,
  d5: 587.33,
  g5: 783.99,
  d6: 1174.66,
})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function readStoredValue(key) {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(key)
}

function writeStoredValue(key, value) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, String(value))
  }
}

/**
 * Central sound vocabulary for the learner UI and lesson interactions.
 * Keep event names semantic so callers do not need to know synthesis method names.
 */
export const SOUND_EVENT_MATRIX = Object.freeze({
  tap: { method: 'click', category: 'interaction' },
  select: { method: 'pop', category: 'interaction' },
  correct: { method: 'success', category: 'feedback' },
  incorrect: { method: 'error', category: 'feedback' },
  'heart-loss': { method: 'heartLoss', category: 'penalty' },
  'combo-5': { method: 'combo5', category: 'milestone' },
  'combo-10': { method: 'combo10', category: 'milestone' },
  perfect: { method: 'perfect', category: 'milestone' },
  'lesson-complete': { method: 'complete', category: 'completion' },
  'math-snap': { method: 'mathSnap', category: 'math-interaction' },
})

class DuolingoSoundEngine {
  constructor() {
    this.ctx = null
    this.masterGain = null
    this.sfxEnabled = readStoredValue(STORAGE_KEYS.sfxEnabled) !== 'false'
    this.hapticsEnabled = readStoredValue(STORAGE_KEYS.hapticsEnabled) !== 'false'
    const storedVolume = readStoredValue(STORAGE_KEYS.sfxVolume)
    const parsedVolume = storedVolume === null ? NaN : Number(storedVolume)
    this.sfxVolume = Number.isFinite(parsedVolume)
      ? clamp(parsedVolume, 0, 1)
      : DEFAULT_SFX_VOLUME
    this.comboCount = 0
    this.noiseBuffer = null
  }

  /**
   * Initializes or resumes the Web Audio Context and routes all voices through
   * one master gain node before they reach the device output.
   */
  initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx()
          this.masterGain = this.ctx.createGain()
          this.masterGain.gain.value = this.sfxEnabled ? this.sfxVolume : 0
          this.masterGain.connect(this.ctx.destination)
        } catch {
          this.ctx = null
          this.masterGain = null
          return null
        }
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

  updateMasterGain() {
    if (!this.ctx || !this.masterGain) return

    const now = this.ctx.currentTime
    const target = this.sfxEnabled ? this.sfxVolume : 0
    this.masterGain.gain.cancelScheduledValues(now)
    this.masterGain.gain.setTargetAtTime(target, now, 0.01)
  }

  outputNode(ctx) {
    return this.masterGain || ctx.destination
  }

  /**
   * Pre-generates a 50ms white noise buffer for realistic physical mallet strike transients.
   */
  createNoiseBuffer() {
    if (!this.ctx) return
    const length = Math.floor(this.ctx.sampleRate * 0.05)
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
    const channelData = this.noiseBuffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
      channelData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.25))
    }
  }

  setSfxEnabled(forceState) {
    this.sfxEnabled = Boolean(forceState)
    writeStoredValue(STORAGE_KEYS.sfxEnabled, this.sfxEnabled)
    this.updateMasterGain()
    return this.sfxEnabled
  }

  toggleSfx(forceState) {
    const nextState = forceState === undefined ? !this.sfxEnabled : forceState
    return this.setSfxEnabled(nextState)
  }

  toggleSound(forceState) {
    return this.toggleSfx(forceState)
  }

  // Compatibility alias for existing preview integrations.
  setSoundEnabled(forceState) {
    return this.toggleSfx(forceState)
  }

  isSoundEnabled() {
    return this.sfxEnabled
  }

  isSfxEnabled() {
    return this.sfxEnabled
  }

  setHapticsEnabled(forceState) {
    this.hapticsEnabled = Boolean(forceState)
    writeStoredValue(STORAGE_KEYS.hapticsEnabled, this.hapticsEnabled)
    return this.hapticsEnabled
  }

  toggleHaptics(forceState) {
    const nextState = forceState === undefined ? !this.hapticsEnabled : forceState
    return this.setHapticsEnabled(nextState)
  }

  isHapticsEnabled() {
    return this.hapticsEnabled
  }

  setSfxVolume(value) {
    const numericValue = Number(value)
    if (Number.isFinite(numericValue)) {
      this.sfxVolume = clamp(numericValue, 0, 1)
      writeStoredValue(STORAGE_KEYS.sfxVolume, this.sfxVolume)
      this.updateMasterGain()
    }
    return this.sfxVolume
  }

  getSfxVolume() {
    return this.sfxVolume
  }

  resetCombo() {
    this.comboCount = 0
  }

  play(eventName) {
    const event = SOUND_EVENT_MATRIX[eventName]
    if (!event) return false

    const handler = this[event.method]
    if (typeof handler !== 'function') return false

    handler.call(this)
    return true
  }

  triggerHaptic(pattern = 15) {
    if (!this.hapticsEnabled) return
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern)
      } catch {}
    }
  }

  /**
   * Layer 1: Physical Mallet Impact Strike.
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
    gain.connect(this.outputNode(ctx))

    noiseSource.start(startTime)
    noiseSource.stop(startTime + duration + 0.005)
  }

  playChalkTick(ctx, startTime, centerFreq = 2600, duration = 0.008, gainPeak = 0.12) {
    this.playMalletStrike(ctx, startTime, centerFreq, duration, gainPeak)
  }

  /**
   * Synthesizes a celesta / glockenspiel bell tone with modal inharmonic partials.
   */
  playCelestaTone(ctx, freq, startTime, duration = 0.35, gainPeak = 0.24) {
    this.playMalletStrike(ctx, startTime, Math.min(3600, freq * 3.5), 0.015, gainPeak * 0.6)

    const partials = [
      { ratio: 1.000, type: 'sine', gainScale: 1.00, decayScale: 1.00, pitchDrop: 35 },
      { ratio: 2.756, type: 'triangle', gainScale: 0.40, decayScale: 0.45, pitchDrop: 15 },
      { ratio: 5.404, type: 'sine', gainScale: 0.18, decayScale: 0.22, pitchDrop: 0 },
    ]

    partials.forEach(({ ratio, type, gainScale, decayScale, pitchDrop }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const partialFreq = freq * ratio

      osc.type = type
      const startPitch = partialFreq * (1 + pitchDrop / 1200)
      osc.frequency.setValueAtTime(startPitch, startTime)
      osc.frequency.exponentialRampToValueAtTime(partialFreq, startTime + 0.018)

      const partialDur = duration * decayScale
      const peak = gainPeak * gainScale
      gain.gain.setValueAtTime(0.0001, startTime)
      gain.gain.linearRampToValueAtTime(peak, startTime + 0.004)
      gain.gain.exponentialRampToValueAtTime(0.00001, startTime + partialDur)

      osc.connect(gain)
      gain.connect(this.outputNode(ctx))

      osc.start(startTime)
      osc.stop(startTime + partialDur + 0.01)
    })
  }

  /**
   * Synthesizes a marimba-like wooden bar strike.
   */
  playMarimbaTone(ctx, freq, startTime, duration = 0.22, gainPeak = 0.26) {
    this.playMalletStrike(ctx, startTime, 1400, 0.018, gainPeak * 0.75)

    const modes = [
      { ratio: 1.0, type: 'sine', gain: 1.00, dur: duration, pitchShift: 60 },
      { ratio: 4.0, type: 'triangle', gain: 0.35, dur: duration * 0.35, pitchShift: 20 },
      { ratio: 9.8, type: 'sine', gain: 0.12, dur: duration * 0.15, pitchShift: 0 },
    ]

    modes.forEach(({ ratio, type, gain: modeGain, dur, pitchShift }) => {
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()
      const targetFreq = freq * ratio

      osc.type = type
      osc.frequency.setValueAtTime(targetFreq * (1 + pitchShift / 1200), startTime)
      osc.frequency.exponentialRampToValueAtTime(targetFreq, startTime + 0.022)

      const peak = gainPeak * modeGain
      gainNode.gain.setValueAtTime(0.0001, startTime)
      gainNode.gain.linearRampToValueAtTime(peak, startTime + 0.003)
      gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + dur)

      osc.connect(gainNode)
      gainNode.connect(this.outputNode(ctx))

      osc.start(startTime)
      osc.stop(startTime + dur + 0.01)
    })
  }

  playConvergenceMotif(
    ctx,
    startTime,
    notes,
    { duration = 0.16, spacing = 0.075, gainPeak = 0.16, tone = 'wood' } = {},
  ) {
    notes.forEach((freq, index) => {
      const noteStart = startTime + index * spacing
      if (tone === 'celesta') {
        this.playCelestaTone(ctx, freq, noteStart, duration, gainPeak)
      } else {
        this.playMarimbaTone(ctx, freq, noteStart, duration, gainPeak)
      }
    })
  }

  success() {
    this.comboCount += 1
    this.triggerHaptic([20, 25, 35])
    if (!this.sfxEnabled) return

    const ctx = this.initContext()
    if (!ctx) return

    const now = ctx.currentTime
    this.playConvergenceMotif(ctx, now, [CALCULUS_PITCH.d4, CALCULUS_PITCH.g4], {
      duration: 0.16,
      spacing: 0.075,
      gainPeak: 0.16,
    })

    if (this.comboCount === 5) this.combo5(now + 0.17)
    if (this.comboCount === 10) this.combo10(now + 0.17)
  }

  error() {
    this.comboCount = 0
    this.triggerHaptic([45, 50, 45])
    if (!this.sfxEnabled) return

    const ctx = this.initContext()
    if (!ctx) return

    const now = ctx.currentTime

    this.playChalkTick(ctx, now, 950, 0.014, 0.05)

    const osc = ctx.createOscillator()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(CALCULUS_PITCH.g4, now)
    osc.frequency.exponentialRampToValueAtTime(CALCULUS_PITCH.d4, now + 0.11)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1800, now)
    filter.frequency.exponentialRampToValueAtTime(700, now + 0.13)

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.12, now + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.outputNode(ctx))

    osc.start(now)
    osc.stop(now + 0.17)
  }

  pop() {
    this.triggerHaptic(18)
    if (!this.sfxEnabled) return

    const ctx = this.initContext()
    if (!ctx) return
    this.playMarimbaTone(ctx, CALCULUS_PITCH.d4, ctx.currentTime, 0.10, 0.16)
  }

  click() {
    this.triggerHaptic(14)
    if (!this.sfxEnabled) return

    const ctx = this.initContext()
    if (!ctx) return
    const now = ctx.currentTime

    this.playChalkTick(ctx, now, 2800, 0.008, 0.12)
  }

  heartLoss() {
    this.triggerHaptic([60, 40, 60])
    if (!this.sfxEnabled) return

    const ctx = this.initContext()
    if (!ctx) return
    const now = ctx.currentTime

    this.playMalletStrike(ctx, now, 620, 0.018, 0.16)
    this.playChalkTick(ctx, now + 0.008, 3000, 0.02, 0.10)
  }

  playCombo(notes, startTime, gainPeak = 0.12) {
    if (!this.sfxEnabled) return

    const ctx = this.initContext()
    if (!ctx) return
    const now = startTime ?? ctx.currentTime

    this.playConvergenceMotif(ctx, now, notes, {
      duration: 0.18,
      spacing: 0.035,
      gainPeak,
      tone: 'celesta',
    })
  }

  streakZap(startTime) {
    this.playCombo([CALCULUS_PITCH.d5, CALCULUS_PITCH.g5, CALCULUS_PITCH.d6], startTime)
  }

  combo5(startTime) {
    this.triggerHaptic([25, 30, 45])
    this.playCombo([CALCULUS_PITCH.g5, CALCULUS_PITCH.d5], startTime, 0.10)
  }

  combo10(startTime) {
    this.triggerHaptic([30, 35, 50, 65])
    this.playCombo([CALCULUS_PITCH.d5, CALCULUS_PITCH.g5, CALCULUS_PITCH.d6], startTime, 0.12)
  }

  perfect() {
    this.triggerHaptic([30, 40, 30, 50, 80])
    if (!this.sfxEnabled) return

    const ctx = this.initContext()
    if (!ctx) return
    const now = ctx.currentTime
    this.playConvergenceMotif(ctx, now, [CALCULUS_PITCH.d4, CALCULUS_PITCH.g4, CALCULUS_PITCH.d5], {
      duration: 0.20,
      spacing: 0.085,
      gainPeak: 0.17,
      tone: 'celesta',
    })
    this.playCelestaTone(ctx, CALCULUS_PITCH.d6, now + 0.29, 0.45, 0.13)
  }

  mathSnap() {
    this.triggerHaptic(8)
    if (!this.sfxEnabled) return

    const ctx = this.initContext()
    if (!ctx) return
    this.playChalkTick(ctx, ctx.currentTime, 1800, 0.006, 0.08)
  }

  complete() {
    this.comboCount = 0
    this.triggerHaptic([30, 40, 30, 40, 70])
    if (!this.sfxEnabled) return

    const ctx = this.initContext()
    if (!ctx) return

    const now = ctx.currentTime
    this.playConvergenceMotif(ctx, now, [CALCULUS_PITCH.d4, CALCULUS_PITCH.g4, CALCULUS_PITCH.d5], {
      duration: 0.18,
      spacing: 0.09,
      gainPeak: 0.18,
      tone: 'celesta',
    })
    this.playCelestaTone(ctx, CALCULUS_PITCH.g5, now + 0.30, 0.25, 0.15)
    this.playCelestaTone(ctx, CALCULUS_PITCH.d5, now + 0.42, 0.55, 0.24)
    this.playCelestaTone(ctx, CALCULUS_PITCH.d6, now + 0.44, 0.42, 0.08)
  }
}

export const soundFX = new DuolingoSoundEngine()
export default soundFX
