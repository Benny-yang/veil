import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
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
    const [currentUser, setCurrentUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)   // 驗證 token 期間顯示 loading

    /** App 啟動時驗證 token 是否仍然有效 */
    useEffect(() => {
        const token = localStorage.getItem('veil_access_token')
        if (!token) {
            // 沒有 token，直接結束 loading（未登入）
            setCurrentUser(null)
            setIsLoading(false)
            return
        }
        // 呼叫後端驗證 token，取得最新的 user 資料
        authApi.me()
            .then(res => {
                const user = res.data.data || res.data
                setCurrentUser(user)
                localStorage.setItem('veil_user', JSON.stringify(user))
            })
            .catch(() => {
                // token 無效或過期：清除所有資料
                localStorage.removeItem('veil_access_token')
                localStorage.removeItem('veil_refresh_token')
                localStorage.removeItem('veil_user')
                setCurrentUser(null)
            })
            .finally(() => setIsLoading(false))
    }, [])

    /** 登入成功後呼叫：儲存 tokens + user，更新 state */
    const login = useCallback((tokens, user) => {
        localStorage.setItem('veil_access_token', tokens.accessToken)
        localStorage.setItem('veil_refresh_token', tokens.refreshToken)
        localStorage.setItem('veil_user', JSON.stringify(user))
        setCurrentUser(user)
    }, [])

    /** 更新 currentUser 中的 profile 資料（如大頭照、顯示名稱）*/
    const updateProfile = useCallback((patch) => {
        setCurrentUser(prev => {
            if (!prev) return prev
            const updated = { ...prev, ...patch }
            localStorage.setItem('veil_user', JSON.stringify(updated))
            return updated
        })
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
        <AuthContext.Provider value={{ currentUser, isLoading, login, logout, updateProfile }}>
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
