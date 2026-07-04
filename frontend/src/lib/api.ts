import axios from 'axios'

const api = axios.create({ baseURL: '' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('dd_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function register(email: string, password: string) {
  const { data } = await api.post('/api/auth/register', { email, password })
  if (!data.success) throw new Error(data.error)
  return data.data
}
export async function login(email: string, password: string) {
  const { data } = await api.post('/api/auth/login', { email, password })
  if (!data.success) throw new Error(data.error)
  return data.data
}

// ── Digests ───────────────────────────────────────────────────────────────────
export async function getDigest(date: string) {
  const { data } = await api.get(`/api/digest/${date}`)
  if (!data.success) throw new Error(data.error)
  return data.data
}
export async function listDigests(limit = 30, offset = 0) {
  const { data } = await api.get('/api/digests', { params: { limit, offset } })
  if (!data.success) throw new Error(data.error)
  return data.data
}
export async function generateDigest(date: string, force = false) {
  const { data } = await api.post('/api/generate-digest', { date, force })
  if (!data.success) throw new Error(data.error)
  return data.data
}

// ── Search ────────────────────────────────────────────────────────────────────
export async function searchDigests(q: string) {
  const { data } = await api.get('/api/search', { params: { q } })
  if (!data.success) throw new Error(data.error)
  return data.data
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export async function getProviderStats() {
  const { data } = await api.get('/api/stats/providers')
  if (!data.success) throw new Error(data.error)
  return data.data
}
export async function getProviderLogsByDate(date: string) {
  const { data } = await api.get(`/api/stats/providers/${date}`)
  if (!data.success) throw new Error(data.error)
  return data.data
}
export async function getCostStats() {
  const { data } = await api.get('/api/stats/costs')
  if (!data.success) throw new Error(data.error)
  return data.data
}

// ── Email ─────────────────────────────────────────────────────────────────────
export async function getEmailSettings() {
  try {
    const { data } = await api.get('/api/settings/email')
    return data.data ?? null
  } catch { return null }
}
export async function saveEmailSettings(email: string, enabled: boolean) {
  const { data } = await api.post('/api/settings/email', { email, enabled })
  if (!data.success) throw new Error(data.error)
}
export async function sendTestEmail() {
  const { data } = await api.post('/api/settings/email/test')
  if (!data.success) throw new Error(data.error)
  return data.message
}

// ── Cron ──────────────────────────────────────────────────────────────────────
export async function getCronStatus() {
  try {
    const { data } = await api.get('/api/cron/status')
    return data.data
  } catch { return null }
}

// ── Bookmarks ─────────────────────────────────────────────────────────────────
export async function getBookmarks() {
  const { data } = await api.get('/api/bookmarks')
  if (!data.success) throw new Error(data.error)
  return data.data
}
export async function addBookmark(date: string) {
  const { data } = await api.post(`/api/bookmarks/${date}`)
  if (!data.success) throw new Error(data.error)
}
export async function removeBookmark(date: string) {
  const { data } = await api.delete(`/api/bookmarks/${date}`)
  if (!data.success) throw new Error(data.error)
}
export async function checkBookmark(date: string) {
  try {
    const { data } = await api.get(`/api/bookmarks/check/${date}`)
    return data.data?.bookmarked ?? false
  } catch { return false }
}

// ── Reading History ───────────────────────────────────────────────────────────
export async function logView(date: string) {
  try { await api.post(`/api/history/${date}`) } catch { /* non-fatal */ }
}
export async function getHistory() {
  const { data } = await api.get('/api/history')
  if (!data.success) throw new Error(data.error)
  return data.data
}

// ── Ratings ───────────────────────────────────────────────────────────────────
export async function rateDigest(date: string, rating: 1 | -1, comment?: string) {
  const { data } = await api.post(`/api/ratings/${date}`, { rating, comment })
  if (!data.success) throw new Error(data.error)
}
export async function getDigestRating(date: string) {
  try {
    const { data } = await api.get(`/api/ratings/${date}`)
    return data.data
  } catch { return null }
}
export async function getMyRating(date: string) {
  try {
    const { data } = await api.get(`/api/ratings/${date}/mine`)
    return data.data
  } catch { return null }
}

// ── Compare ───────────────────────────────────────────────────────────────────
export async function compareDigests(date1: string, date2: string) {
  const { data } = await api.get('/api/digest/compare', { params: { date1, date2 } })
  if (!data.success) throw new Error(data.error)
  return data.data
}

// ── Health ────────────────────────────────────────────────────────────────────
export async function checkHealth() {
  try {
    const { data } = await api.get('/health')
    return data.status === 'ok'
  } catch { return false }
}
