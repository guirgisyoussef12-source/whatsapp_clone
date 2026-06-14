const BASE = '/api'

function getToken() {
  return localStorage.getItem('access')
}

async function request(method, path, body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) headers['Authorization'] = `Bearer ${getToken()}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  })

  if (res.status === 401) {
    // Try refresh
    const refreshed = await refreshToken()
    if (!refreshed) {
      localStorage.clear()
      window.location.href = '/login'
      return
    }
    headers['Authorization'] = `Bearer ${getToken()}`
    const retry = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    })
    if (!retry.ok) throw await retry.json()
    return retry.status === 204 ? null : retry.json()
  }

  if (!res.ok) throw await res.json()
  return res.status === 204 ? null : res.json()
}

async function refreshToken() {
  const refresh = localStorage.getItem('refresh')
  if (!refresh) return false
  try {
    const res = await fetch(`${BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return false
    const data = await res.json()
    localStorage.setItem('access', data.access)
    if (data.refresh) localStorage.setItem('refresh', data.refresh)
    return true
  } catch {
    return false
  }
}

// Auth
export const api = {
  register: (data) => request('POST', '/auth/register/', data, false),
  login: async (data) => {
    const res = await request('POST', '/auth/login/', data, false)
    localStorage.setItem('access', res.access)
    localStorage.setItem('refresh', res.refresh)
    return res
  },
  me: () => request('GET', '/auth/me/'),

  // Chats
  getChats: () => request('GET', '/chat/chats/'),
  createChat: (data) => request('POST', '/chat/chats/', data),
  getMessages: (chatId, page = 1) =>
    request('GET', `/chat/chats/${chatId}/messages/?page=${page}`),
  addMember: (chatId, userId) =>
    request('POST', `/chat/chats/${chatId}/add_member/`, { user_id: userId }),
  leaveChat: (chatId) => request('POST', `/chat/chats/${chatId}/leave/`),

  // Messages
  sendMessage: (chatId, content) =>
    request('POST', '/chat/messages/', { chat_id: chatId, content }),
  markReadBulk: (ids) =>
    request('POST', '/chat/messages/mark_read_bulk/', { message_ids: ids }),
  deleteMessage: (id) => request('DELETE', `/chat/messages/${id}/`),

  // Profile
  getProfile: () => request('GET', '/chat/profiles/me/'),
  updateProfile: (data) => request('PATCH', '/chat/profiles/me/', data),
}