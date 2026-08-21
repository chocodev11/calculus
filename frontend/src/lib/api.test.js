import { afterEach, describe, expect, it, vi } from 'vitest'
import api, { ApiError, normalizeListPayload } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('API response contracts', () => {
  it('accepts the current bare-array response and legacy envelopes', () => {
    const slides = [{ id: 1 }]

    expect(normalizeListPayload(slides, 'slides')).toBe(slides)
    expect(normalizeListPayload({ data: slides }, 'slides')).toBe(slides)
    expect(normalizeListPayload({ items: slides }, 'slides')).toBe(slides)
    expect(normalizeListPayload({ data: { items: slides } }, 'slides')).toBe(slides)
    expect(normalizeListPayload({ data: { slides } }, 'slides')).toBe(slides)
  })

  it('raises a structured error for an invalid list payload', () => {
    expect(() => normalizeListPayload({ data: null }, 'slides')).toThrow(ApiError)
    expect(() => normalizeListPayload({ data: null }, 'slides')).toThrow('slides không đúng định dạng')
  })

  it('preserves HTTP status and endpoint for API failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'database unavailable' }),
    }))

    await expect(api.get('/steps/1/slides', { redirectOnUnauthorized: false }))
      .rejects.toMatchObject({
        name: 'ApiError',
        status: 500,
        endpoint: '/steps/1/slides',
        message: 'database unavailable',
      })
  })

  it('does not redirect while a caller handles unauthorized state locally', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'token expired' }),
    }))

    await expect(api.get('/steps/1', { redirectOnUnauthorized: false }))
      .rejects.toMatchObject({ name: 'ApiError', status: 401, endpoint: '/steps/1' })
  })
})
