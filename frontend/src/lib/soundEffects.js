const STORAGE_KEYS = Object.freeze({
  sfxEnabled: 'calculus_sfx_enabled',
  hapticsEnabled: 'calculus_haptics_enabled',
  sfxVolume: 'calculus_sfx_volume',
})

const DEFAULT_SFX_VOLUME = 0.7

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

  success() {
    this.comboCount += 1
    this.triggerHaptic([20, 25, 35])
    if (!this.sfxEnabled) return

    const ctx = this.initContext()
    if (!ctx) return

    const now = ctx.currentTime
    const streakOffset = Math.min(4, Math.floor(this.comboCount / 2)) * 0.03
    const fSharp5 = 739.99 * (1 + streakOffset)
    const aSharp5 = 932.33 * (1 + streakOffset)

    this.playCelestaTone(ctx, fSharp5, now, 0.18, 0.22)
    this.playCelestaTone(ctx, aSharp5, now + 0.078, 0.42, 0.28)

    if (this.comboCount === 5) this.combo5(now + 0.15)
    if (this.comboCount === 10) this.combo10(now + 0.15)
  }

  error() {
    this.comboCount = 0
    this.triggerHaptic([45, 50, 45])
    if (!this.sfxEnabled) return

    const ctx = this.initContext()
    if (!ctx) return

    const now = ctx.currentTime

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
    subGain.connect(this.outputNode(ctx))

    subOsc.start(now)
    subOsc.stop(now + 0.24)

    const triOsc = ctx.createOscillator()
    const triGain = ctx.createGain()

    triOsc.type = 'triangle'
    triOsc.frequency.setValueAtTime(369.99, now)
    triOsc.frequency.exponentialRampToValueAtTime(261.63, now + 0.16)

    triGain.gain.setValueAtTime(0.001, now)
    triGain.gain.linearRampToValueAtTime(0.20, now + 0.015)
    triGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.20)

    triOsc.connect(triGain)
    triGain.connect(this.outputNode(ctx))

    triOsc.start(now)
    triOsc.stop(now + 0.22)
  }

  pop() {
    this.triggerHaptic(18)
    if (!this.sfxEnabled) return

    const ctx = this.initContext()
    if (!ctx) return
    this.playMarimbaTone(ctx, 880, ctx.currentTime, 0.14, 0.24)
  }

  click() {
    this.triggerHaptic(14)
    if (!this.sfxEnabled) return

    const ctx = this.initContext()
    if (!ctx) return
    const now = ctx.currentTime

    this.playMalletStrike(ctx, now, 2800, 0.008, 0.18)

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(540, now)
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.028)
    gain.gain.setValueAtTime(0.14, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028)

    osc.connect(gain)
    gain.connect(this.outputNode(ctx))
    osc.start(now)
    osc.stop(now + 0.032)
  }

  heartLoss() {
    this.triggerHaptic([60, 40, 60])
    if (!this.sfxEnabled) return

    const ctx = this.initContext()
    if (!ctx) return
    const now = ctx.currentTime

    this.playMalletStrike(ctx, now, 450, 0.03, 0.35)
    this.playMalletStrike(ctx, now + 0.005, 5200, 0.04, 0.22)
  }

  playCombo(notes, startTime, gainPeak = 0.12) {
    if (!this.sfxEnabled) return

    const ctx = this.initContext()
    if (!ctx) return
    const now = startTime ?? ctx.currentTime

    notes.forEach((freq, index) => {
      this.playCelestaTone(ctx, freq, now + index * 0.035, 0.18, gainPeak)
    })
  }

  streakZap(startTime) {
    this.playCombo([1046.50, 1318.51, 1567.98, 2093.00], startTime)
  }

  combo5(startTime) {
    this.triggerHaptic([25, 30, 45])
    this.playCombo([1046.50, 1318.51, 1567.98, 2093.00], startTime, 0.11)
  }

  combo10(startTime) {
    this.triggerHaptic([30, 35, 50, 65])
    this.playCombo([783.99, 987.77, 1174.66, 1567.98, 2093.00], startTime, 0.13)
  }

  perfect() {
    this.triggerHaptic([30, 40, 30, 50, 80])
    if (!this.sfxEnabled) return

    const ctx = this.initContext()
    if (!ctx) return
    const now = ctx.currentTime
    this.playCelestaTone(ctx, 739.99, now, 0.2, 0.24)
    this.playCombo([932.33, 1108.73, 1479.98, 1864.66], now + 0.12, 0.14)
  }

  mathSnap() {
    this.triggerHaptic(8)
    if (!this.sfxEnabled) return

    const ctx = this.initContext()
    if (!ctx) return
    this.playMalletStrike(ctx, ctx.currentTime, 1800, 0.006, 0.08)
  }

  complete() {
    this.comboCount = 0
    this.triggerHaptic([30, 40, 30, 40, 70])
    if (!this.sfxEnabled) return

    const ctx = this.initContext()
    if (!ctx) return

    const now = ctx.currentTime
    const melody = [
      { freq: 369.99, time: 0.00, dur: 0.16, gain: 0.22 },
      { freq: 466.16, time: 0.08, dur: 0.16, gain: 0.24 },
      { freq: 554.37, time: 0.16, dur: 0.18, gain: 0.24 },
      { freq: 739.99, time: 0.24, dur: 0.22, gain: 0.26 },
      { freq: 932.33, time: 0.34, dur: 0.65, gain: 0.32 },
    ]

    melody.forEach(({ freq, time, dur, gain }) => {
      this.playCelestaTone(ctx, freq, now + time, dur, gain)
    })

    // Schedule the sparkle on the audio timeline so mute/volume changes remain immediate.
    this.playCombo([1046.50, 1318.51, 1567.98, 2093.00], now + 0.45, 0.11)
  }
}

export const soundFX = new DuolingoSoundEngine()
export default soundFX
