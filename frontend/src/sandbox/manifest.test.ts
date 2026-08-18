import { describe, expect, it } from 'vitest'
import { loadManifest, migrateManifest, validateManifest } from './manifest'
import { propositionFixture } from './fixtures'

describe('manifest contract', () => {
  it('accepts a valid manifest and rejects executable values', () => {
    expect(validateManifest(propositionFixture).valid).toBe(true)
    expect(validateManifest({ ...propositionFixture, config: { callback: () => true } }).valid).toBe(false)
  })

  it('migrates the bounded v0.1 envelope to v1', () => {
    const migrated = migrateManifest({ ...propositionFixture, schemaVersion: '0.1' }) as Record<string, unknown>
    expect(migrated.schemaVersion).toBe('1.0')
    expect(loadManifest(migrated).schemaVersion).toBe('1.0')
  })
})
