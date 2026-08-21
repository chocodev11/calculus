const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

export class ApiError extends Error {
  constructor(message, { status = 0, endpoint = '', payload = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.endpoint = endpoint
    this.payload = payload
  }
}

export function formatErrorDetail(detail) {
  if (typeof detail === 'string') return detail

  if (Array.isArray(detail)) {
    return detail
      .map(item => {
        if (typeof item === 'string') return item
        if (!item || typeof item !== 'object') return String(item)
        const location = Array.isArray(item.loc)
          ? item.loc.filter(part => part !== 'body').join('.')
          : ''
        const message = item.msg || item.message || 'Dữ liệu không hợp lệ'
        return location ? `${location}: ${message}` : message
      })
      .filter(Boolean)
      .join('; ')
  }

  if (detail && typeof detail === 'object') {
    if (detail.message || detail.msg) return detail.message || detail.msg
    if (detail.code && detail.errors) {
      return `${detail.code}: ${formatErrorDetail(detail.errors)}`
    }
    if (detail.code) return detail.code
    return 'Request thất bại'
  }

  return 'Request thất bại'
}

export function normalizeListPayload(payload, label = 'danh sách') {
  if (Array.isArray(payload)) return payload
  const candidates = [
    payload?.data,
    payload?.data?.items,
    payload?.data?.slides,
    payload?.items,
    payload?.slides,
  ]
  const list = candidates.find(Array.isArray)
  if (list) return list
  throw new ApiError(`API trả về ${label} không đúng định dạng`, {
    status: 200,
    payload,
  })
}

function getToken() {
  if (typeof localStorage === 'undefined') return null
  try {
    const authStorage = localStorage.getItem('auth-storage')
    if (!authStorage) return null
    return JSON.parse(authStorage)?.state?.token || null
  } catch (error) {
    console.error('Error reading token:', error)
    return null
  }
}

function shouldRedirectUnauthorized(endpoint, options) {
  return options.redirectOnUnauthorized !== false && !endpoint.includes('/auth/')
}

function redirectToLogin() {
  if (typeof localStorage !== 'undefined') localStorage.removeItem('auth-storage')
  if (typeof window !== 'undefined') window.location.href = '/login'
}

async function request(method, endpoint, body, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  try {
    headers['x-user-tz-offset'] = String(-new Date().getTimezoneOffset())
  } catch {
    // Timezone is optional metadata and must never break the request.
  }
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      credentials: 'include',
      signal: options.signal,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError('Không thể kết nối tới máy chủ', { endpoint, payload: error })
  }

  const payload = await response.json().catch(() => null)
  if (response.status === 401) {
    if (shouldRedirectUnauthorized(endpoint, options)) redirectToLogin()
    throw new ApiError('Phiên đăng nhập đã hết hạn', { status: 401, endpoint, payload })
  }
  if (!response.ok) {
    const detail = payload?.detail ?? payload?.error ?? payload
    throw new ApiError(formatErrorDetail(detail), {
      status: response.status,
      endpoint,
      payload,
    })
  }
  return payload
}

const api = {
  get(endpoint, options) {
    return request('GET', endpoint, undefined, options)
  },
  post(endpoint, data, options) {
    return request('POST', endpoint, data, options)
  },
  put(endpoint, data, options) {
    return request('PUT', endpoint, data, options)
  },
  patch(endpoint, data, options) {
    return request('PATCH', endpoint, data, options)
  },
  delete(endpoint, options) {
    return request('DELETE', endpoint, undefined, options)
  },
}

export default api
