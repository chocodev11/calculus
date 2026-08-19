const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';
// Helper to get token from localStorage
const getToken = () => {
  try {
    const authStorage = localStorage.getItem('auth-storage')
    if (authStorage) {
      const parsed = JSON.parse(authStorage)
      return parsed?.state?.token
    }
  } catch (e) {
    console.error('Error reading token:', e)
  }
  return null
}

const formatErrorDetail = (detail) => {
  if (typeof detail === 'string') return detail

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (!item || typeof item !== 'object') return String(item)

        const location = Array.isArray(item.loc)
          ? item.loc.filter((part) => part !== 'body').join('.')
          : ''
        const message = item.msg || item.message || 'Dữ liệu không hợp lệ'
        return location ? `${location}: ${message}` : message
      })
      .filter(Boolean)
      .join('; ')
  }

  if (detail && typeof detail === 'object') {
    return detail.message || detail.msg || 'Request failed'
  }

  return 'Request failed'
}

const api = {
  async get(endpoint) {
    const token = getToken()
    const headers = {
      'Content-Type': 'application/json',
    }
    // include user's timezone offset in minutes (minutes to add to UTC to get local time)
    try {
      const tzOffset = -new Date().getTimezoneOffset()
      headers['x-user-tz-offset'] = String(tzOffset)
    } catch (e) {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${API_BASE}${endpoint}`, { headers, credentials: 'include' })
    
    if (res.status === 401) {
      if (token) {
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
      }
      throw new Error('Unauthorized')
    }
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Request failed' }))
      console.error(`[api] GET ${endpoint} failed:`, error)
      throw new Error(formatErrorDetail(error.detail))
    }
    
    const data = await res.json()
    console.debug(`[api] GET ${endpoint} response:`, data)
    return data
  },

  async post(endpoint, data) {
    const token = getToken()
    const headers = {
      'Content-Type': 'application/json',
    }
    try {
      const tzOffset = -new Date().getTimezoneOffset()
      headers['x-user-tz-offset'] = String(tzOffset)
    } catch (e) {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      credentials: 'include'
    })

    if (res.status === 401 && !endpoint.includes('/auth/')) {
      if (token) {
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
      }
      throw new Error('Unauthorized')
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Request failed' }))
      throw new Error(formatErrorDetail(error.detail))
    }

    return await res.json()
  },

  async put(endpoint, data) {
    const token = getToken()
    const headers = {
      'Content-Type': 'application/json',
    }
    try {
      const tzOffset = -new Date().getTimezoneOffset()
      headers['x-user-tz-offset'] = String(tzOffset)
    } catch (e) {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
      credentials: 'include'
    })

    if (res.status === 401 && !endpoint.includes('/auth/')) {
      if (token) {
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
      }
      throw new Error('Unauthorized')
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Request failed' }))
      throw new Error(formatErrorDetail(error.detail))
    }

    return await res.json()
  },

  async delete(endpoint) {
    const token = getToken()
    const headers = {
      'Content-Type': 'application/json',
    }
    try {
      const tzOffset = -new Date().getTimezoneOffset()
      headers['x-user-tz-offset'] = String(tzOffset)
    } catch (e) {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers,
      credentials: 'include'
    })

    if (res.status === 401 && !endpoint.includes('/auth/')) {
      if (token) {
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
      }
      throw new Error('Unauthorized')
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Request failed' }))
      throw new Error(formatErrorDetail(error.detail))
    }

    return await res.json()
  }
}

export default api
