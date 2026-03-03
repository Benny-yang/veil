import React, { createContext, useContext, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

/** 從 localStorage 讀取初始 user 狀態 */
function loadUserFromStorage() {
    try {
        const raw = localStorage.getItem('veil_user')
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export function AuthProvider({ children }) {
    const navigate = useNavigate()
    const [currentUser, setCurrentUser] = useState(loadUserFromStorage)

    /** 登入成功後呼叫：儲存 tokens + user，更新 state */
    const login = useCallback((tokens, user) => {
        localStorage.setItem('veil_access_token', tokens.accessToken)
        localStorage.setItem('veil_refresh_token', tokens.refreshToken)
        localStorage.setItem('veil_user', JSON.stringify(user))
        setCurrentUser(user)
    }, [])

    /** 登出：清除所有本地資料並導回 /auth */
    const logout = useCallback(async () => {
        try {
            await authApi.logout()
        } catch { /* 無論後端是否成功，前端都清除 */ }
        localStorage.removeItem('veil_access_token')
        localStorage.removeItem('veil_refresh_token')
        localStorage.removeItem('veil_user')
        setCurrentUser(null)
        navigate('/auth')
    }, [navigate])

    return (
        <AuthContext.Provider value={{ currentUser, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

/** Hook - 在任何子元件中取得 auth 狀態 */
export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}
