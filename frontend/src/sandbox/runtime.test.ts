import { describe, expect, it } from 'vitest'
import { defaultSandboxRegistry, createSession, generateVariant, recompute, SeededRandom } from './index'
import { catalogFixtures, propositionFixture, setOperatorFixture, triangleFixture } from './fixtures'

describe('sandbox runtime', () => {
  it('creates a deterministic session and supports reset/undo', () => {
    const session = createSession(propositionFixture, defaultSandboxRegistry)
    expect(session.snapshot().derivedState.truthValue).toBe(false)
    session.dispatch({ type: 'set_control', controlId: 'p', value: true })
    session.dispatch({ type: 'set_control', controlId: 'q', value: true })
    expect(session.snapshot().derivedState.truthValue).toBe(false)
    session.dispatch({ type: 'undo' })
    expect(session.snapshot().derivedState.truthValue).toBe(true)
    session.dispatch({ type: 'reset' })
    expect(session.snapshot().derivedState.truthValue).toBe(false)
    expect(session.events().some(event => event.type === 'sandbox_loaded')).toBe(true)
  })

  it('keeps recompute pure and independent from rendering/session history', () => {
    const state = { assignment: { p: true, q: false }, completedRows: [] }
    const first = recompute(propositionFixture, state, defaultSandboxRegistry)
    const second = recompute(propositionFixture, state, defaultSandboxRegistry)
    expect(first).toEqual(second)
    expect(state).toEqual({ assignment: { p: true, q: false }, completedRows: [] })
  })

  it('runs set and triangle plugins through the same runtime contract', () => {
    const setSession = createSession(setOperatorFixture, defaultSandboxRegistry)
    expect(setSession.snapshot().derivedState.result).toEqual({ kind: 'finite_set', elements: [1, 2, 3, 4] })
    expect(setSession.snapshot().goals[0].reached).toBe(true)

    const triangleSession = createSession(triangleFixture, defaultSandboxRegistry)
    const triangle = triangleSession.snapshot().derivedState.triangle as { valid: boolean; sides: { c?: number } }
    expect(triangle.valid).toBe(true)
    expect(triangle.sides.c).toBeCloseTo(5)
    expect(triangleSession.snapshot().goals[0].reached).toBe(true)
  })

  it('replays seeded variants exactly', () => {
    const values = generateVariant('logic-seed', random => [random.integer(1, 10), random.pick(['p', 'q'])])
    const replay = generateVariant('logic-seed', random => [random.integer(1, 10), random.pick(['p', 'q'])])
    expect(replay).toEqual(values)
    expect(new SeededRandom(10).next()).toBe(new SeededRandom(10).next())
  })

  it('can instantiate every catalog archetype at each declared level', () => {
    expect(catalogFixtures.length).toBeGreaterThan(50)
    for (const fixture of catalogFixtures) {
      expect(() => createSession(fixture, defaultSandboxRegistry)).not.toThrow()
    }
  })
})
