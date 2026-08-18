import { describe, expect, it } from 'vitest'
import { sandboxCatalog, validateSandboxCatalog } from './catalog'

describe('sandbox catalog', () => {
  it('covers the first-release domains and archetype contract', () => {
    expect(new Set(sandboxCatalog.map(item => item.domainId))).toEqual(new Set(['logic', 'set', 'trigonometry']))
    expect(sandboxCatalog.length).toBeGreaterThanOrEqual(25)
    expect(validateSandboxCatalog()).toEqual([])
  })

  it('includes advanced multi-step work for each domain', () => {
    for (const domainId of ['logic', 'set', 'trigonometry'] as const) {
      expect(sandboxCatalog.some(item => item.domainId === domainId && item.levels.includes('advanced_application'))).toBe(true)
    }
  })
})
