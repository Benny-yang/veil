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

// ── Response interceptor：401 token 失效時清除並導回登入頁 ──────────────────
// 只在「有帶 token 但被拒絕」時才重導，訪客無 token 呼叫受保護 API 不重導
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const hadToken = !!localStorage.getItem('veil_access_token')
            if (hadToken) {
                localStorage.removeItem('veil_access_token')
                localStorage.removeItem('veil_refresh_token')
                localStorage.removeItem('veil_user')
                window.location.href = '/auth'
            }
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
    changePassword: (data) => api.patch('/users/me/password', data),
    updateAvatar: (data) => api.put('/users/me/avatar', data),
    completeOnboarding: (data) => api.post('/users/me/onboarding', data),
    follow: (username) => api.post(`/users/${username}/follow`),
    unfollow: (username) => api.delete(`/users/${username}/follow`),
}

// ── Verification API ─────────────────────────────────────────────────────────
export const verificationApi = {
    getRealPersonStatus: () => api.get('/users/me/verification/real-person'),
    submitRealPerson: (data) => api.post('/users/me/verification/real-person', data),
}

// ── Media API ────────────────────────────────────────────────────────────────
export const mediaApi = {
    upload: (file) => {
        const form = new FormData()
        form.append('file', file)
        return api.post('/media/upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
        })
    },
}

// ── Post API ─────────────────────────────────────────────────────────────────
export const postApi = {
    getFeed: () => api.get('/feed'),
    getPost: (id) => api.get(`/posts/${id}`),
    getComments: (id) => api.get(`/posts/${id}/comments`),
    createPost: (data) => api.post('/posts', data),
    deletePost: (id) => api.delete(`/posts/${id}`),
    likePost: (id) => api.post(`/posts/${id}/like`),
    unlikePost: (id) => api.delete(`/posts/${id}/like`),
    addComment: (id, data) => api.post(`/posts/${id}/comments`, data),
    deleteComment: (postId, commentId) => api.delete(`/posts/${postId}/comments/${commentId}`),
}

// ── Work API ──────────────────────────────────────────────────────────────────
export const workApi = {
    getFeed: () => api.get('/feed'),
    getWorks: (username) => api.get(`/users/${username}/works`),
    getWork: (id) => api.get(`/works/${id}`),
    createWork: (data) => api.post('/users/me/works', data),
    updateWork: (id, data) => api.patch(`/works/${id}`, data),
    deleteWork: (id) => api.delete(`/works/${id}`),
    likeWork: (id) => api.post(`/works/${id}/like`),
    unlikeWork: (id) => api.delete(`/works/${id}/like`),
    getComments: (id) => api.get(`/works/${id}/comments`),
    addComment: (id, content) => api.post(`/works/${id}/comments`, { content }),
    deleteComment: (workId, commentId) => api.delete(`/works/${workId}/comments/${commentId}`),
}

// ── Zone API ──────────────────────────────────────────────────────────────────
export const zoneApi = {
    listZones: (params = {}) => api.get('/zones', { params }),
    getZone: (id) => api.get(`/zones/${id}`),
    createZone: (data) => api.post('/zones', data),
    updateZone: (id, data) => api.patch(`/zones/${id}`, data),
    deleteZone: (id) => api.delete(`/zones/${id}`),
    apply: (id, data) => api.post(`/zones/${id}/apply`, data),
    cancelApply: (id) => api.delete(`/zones/${id}/apply`),
    getMyZones: () => api.get('/users/me/zones'),
    getMyApplications: () => api.get('/users/me/applications'),
    getApplications: (zoneId) => api.get(`/zones/${zoneId}/applications`),
    reviewApplication: (zoneId, appId, action) => api.patch(`/zones/${zoneId}/applications/${appId}`, { action }),
    setCollector: (zoneId, applicationId) => api.post(`/zones/${zoneId}/set-collector`, { application_id: applicationId }),
}

// ── User extended ─────────────────────────────────────────────────────────────
export const userExtendedApi = {
    getFollowers: (username) => api.get(`/users/${username}/followers`),
    getFollowing: (username) => api.get(`/users/${username}/following`),
    getReviews: (username) => api.get(`/users/${username}/reviews`),
}


// ── Notification API ──────────────────────────────────────────────────────────
export const notifApi = {
    list: () => api.get('/notifications'),
    markRead: (id) => api.patch(`/notifications/${id}/read`),
    markReadAll: () => api.patch('/notifications/read-all'),
}

// ── Chat API ──────────────────────────────────────────────────────────────────
export const chatApi = {
    getZoneChats: () => api.get('/chats/zones'),
    getDmChats: () => api.get('/chats/dm'),
    createDm: (username) => api.post('/chats/dm', { username }),
    getMessages: (chatId) => api.get(`/chats/${chatId}/messages`),
    sendMessage: (chatId, content, type = 'text') => api.post(`/chats/${chatId}/messages`, { type, content }),
    markRead: (chatId) => api.patch(`/chats/${chatId}/read`),
    getTransaction: (chatId) => api.get(`/chats/${chatId}/transaction`),
    updateTransaction: (chatId, status) => api.patch(`/chats/${chatId}/transaction`, { status }),
}

export default api

