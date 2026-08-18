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
  let state = clone(plugin.createInitialState(manifest))
  let result = plugin.recompute(manifest, state)
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

  const recompute = (nextState: PrimitiveState) => {
    state = clone(nextState)
    result = plugin.recompute(manifest, state)
    return currentSnapshot()
  }

  const dispatch = (action: SandboxAction): SandboxSnapshot => {
    if (action.type === 'undo') {
      const previous = history.pop()
      if (!previous) return currentSnapshot()
      emit('undo')
      return recompute(previous)
    }

    if (action.type === 'reset') {
      history.push(clone(state))
      emit('reset')
      return recompute(plugin.createInitialState(manifest))
    }

    if (action.type === 'show_hint') {
      emit('hint_shown', action.hintId ? { hintId: action.hintId } : {})
      return currentSnapshot()
    }

    if (action.type === 'submit_step') {
      history.push(clone(state))
      emit('solution_step_submitted', { stepId: action.stepId, value: action.value })
      return recompute({ ...state, [`step:${action.stepId}`]: action.value })
    }

    if (action.type === 'select') {
      history.push(clone(state))
      emit('selection_changed', { targetId: action.targetId, value: action.value })
      return recompute({ ...state, [`selection:${action.targetId}`]: action.value })
    }

    const control = manifest.controls.find(item => item.id === action.controlId)
    if (!control) throw new Error(`Unknown control: ${action.controlId}`)
    const value = normalizeControlValue(control, action.value) as JsonValue
    history.push(clone(state))
    emit('control_changed', { controlId: action.controlId, value })
    return recompute({ ...state, [control.id]: value })
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
