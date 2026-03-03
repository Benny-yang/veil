import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

/** Axios instance - 所有 API 呼叫的統一入口 */
const api = axios.create({ baseURL: API_BASE, timeout: 10000 })

// ── Request interceptor：自動帶入 access token ──────────────────────────────
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('veil_access_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// ── Response interceptor：401 自動清除 token 並導回登入頁 ──────────────────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('veil_access_token')
            localStorage.removeItem('veil_refresh_token')
            localStorage.removeItem('veil_user')
            window.location.href = '/auth'
        }
        return Promise.reject(error)
    }
)

// ── Auth API ────────────────────────────────────────────────────────────────
export const authApi = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    logout: () => api.post('/auth/logout'),
    me: () => api.get('/auth/me'),
}

// ── User API ────────────────────────────────────────────────────────────────
export const userApi = {
    getProfile: (username) => api.get(`/users/${username}`),
    getMe: () => api.get('/users/me'),
    updateMe: (data) => api.patch('/users/me', data),
    completeOnboarding: (data) => api.post('/users/me/onboarding', data),
    follow: (username) => api.post(`/users/${username}/follow`),
    unfollow: (username) => api.delete(`/users/${username}/follow`),
}

export default api
