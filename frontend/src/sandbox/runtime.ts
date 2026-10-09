import { loadManifest, normalizeControlValue } from './manifest'
import { assertPluginManifest, type CapabilityRegistry } from './registry'
import type {
  JsonObject,
  JsonValue,
  PrimitiveState,
  RecomputeResult,
  RuntimeEvent,
  RuntimeHooks,
  SandboxAction,
  SandboxManifest,
  SandboxSnapshot,
} from './types'
import { snapshotFromResult } from './registry'

function eventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `event-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function sessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export interface SandboxSession {
  readonly manifest: SandboxManifest
  readonly id: string
  snapshot(): SandboxSnapshot
  dispatch(action: SandboxAction): SandboxSnapshot
  events(): RuntimeEvent[]
}

export function recompute(
  rawManifest: unknown,
  state: PrimitiveState,
  registry: CapabilityRegistry,
): RecomputeResult {
  const manifest = loadManifest(rawManifest)
  const plugin = assertPluginManifest(manifest, registry)
  return plugin.recompute(manifest, structuredClone(state))
}

export function createSession(
  rawManifest: unknown,
  registry: CapabilityRegistry,
  hooks: RuntimeHooks = {},
): SandboxSession {
  const manifest = loadManifest(rawManifest)
  const plugin = assertPluginManifest(manifest, registry)
  const id = sessionId()
  let result = plugin.recompute(manifest, clone(plugin.createInitialState(manifest)))
  let state = result.state
  const history: PrimitiveState[] = []
  const emitted: RuntimeEvent[] = []
  let sequence = 0

  const emit = (type: string, payload: JsonObject = {}) => {
    const event: RuntimeEvent = {
      id: eventId(),
      sessionId: id,
      manifestId: manifest.id,
      manifestVersion: manifest.version,
      type,
      sequence: sequence++,
      payload: clone(payload),
      occurredAt: new Date().toISOString(),
    }
    emitted.push(event)
    hooks.onEvent?.(clone(event))
  }

  const currentSnapshot = (): SandboxSnapshot => snapshotFromResult(manifest, result, history.length)

  // Plugins may normalize state (e.g. record visited rows), so their output becomes the source of truth.
  const recompute = (nextState: PrimitiveState) => {
    result = plugin.recompute(manifest, clone(nextState))
    state = result.state
    return currentSnapshot()
  }

  // State captured before the first transient update of a gesture; one undo returns to it.
  let gestureBase: PrimitiveState | null = null

  // Recompute first: when a plugin throws, state, history and the event log stay untouched.
  const commit = (nextState: PrimitiveState, transient: boolean | undefined, type: string, payload: JsonObject) => {
    const before = gestureBase ?? clone(state)
    recompute(nextState)
    if (transient) {
      gestureBase = before
      return currentSnapshot()
    }
    history.push(before)
    gestureBase = null
    emit(type, payload)
    return currentSnapshot()
  }

  const dispatch = (action: SandboxAction): SandboxSnapshot => {
    if (action.type === 'undo') {
      const previous = gestureBase ?? history[history.length - 1]
      if (!previous) return currentSnapshot()
      recompute(previous)
      if (gestureBase) gestureBase = null
      else history.pop()
      emit('undo')
      return currentSnapshot()
    }

    if (action.type === 'reset') {
      return commit(plugin.createInitialState(manifest), false, 'reset', {})
    }

    if (action.type === 'show_hint') {
      emit('hint_shown', action.hintId ? { hintId: action.hintId } : {})
      return currentSnapshot()
    }

    if (action.type === 'submit_step') {
      return commit({ ...state, [`step:${action.stepId}`]: action.value }, false, 'solution_step_submitted', { stepId: action.stepId, value: action.value })
    }

    if (action.type === 'select') {
      return commit({ ...state, [`selection:${action.targetId}`]: action.value }, false, 'selection_changed', { targetId: action.targetId, value: action.value })
    }

    if (action.type === 'manipulate') {
      if (!plugin.manipulableKeys?.includes(action.key)) throw new Error(`Scene key is not manipulable: ${action.key}`)
      return commit({ ...state, [action.key]: action.value }, action.transient, 'scene_manipulated', { key: action.key, value: action.value })
    }

    const control = manifest.controls.find(item => item.id === action.controlId)
    if (!control) throw new Error(`Unknown control: ${action.controlId}`)
    const value = normalizeControlValue(control, action.value) as JsonValue
    return commit({ ...state, [control.id]: value }, action.transient, 'control_changed', { controlId: action.controlId, value })
  }

  emit('sandbox_loaded')

  return {
    manifest,
    id,
    snapshot: currentSnapshot,
    dispatch,
    events: () => clone(emitted),
  }
}
