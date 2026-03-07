import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, userApi } from '../services/api'

const AuthContext = createContext(null)

/**
 * 將 /users/me 回傳的嵌套結構攤平：
 * { id, email, profile: { username, ... } } → { id, email, username, ... }
 * 同時保留 appeal_deadline 等頂層欄位
 */
function flattenUser(raw) {
    if (!raw) return raw
    if (!raw.profile) return raw // 已是攤平格式（來自 authApi.me / login）
    const { profile, ...rest } = raw
    return { ...rest, ...profile }
}

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
    const [isLoading, setIsLoading] = useState(true)   // 驗證 token 期間顯示 loading

    /** 判斷帳號是否處於停權狀態 */
    const isSuspended = currentUser?.suspended_until
        ? new Date(currentUser.suspended_until) > new Date()
        : false

    /** App 啟動時驗證 token 是否仍然有效 */
    useEffect(() => {
        const token = localStorage.getItem('veil_access_token')
        if (!token) {
            // 沒有 token，直接結束 loading（未登入）
            setCurrentUser(null)
            setIsLoading(false)
            return
        }
        // 呼叫後端驗證 token，取得最新的 user 資料（含申訴資訊）
        userApi.getMe()
            .then(res => {
                const user = flattenUser(res.data.data || res.data)
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

        // 立即以完整的 /users/me 更新（含 appeal_deadline 等停權相關資訊）
        userApi.getMe()
            .then(res => {
                const fullUser = flattenUser(res.data.data || res.data)
                setCurrentUser(fullUser)
                localStorage.setItem('veil_user', JSON.stringify(fullUser))
            })
            .catch(() => { /* 靜默失敗，已有初始 user 資料 */ })
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

    /** 清除 session（不導頁）：供訪客模式、強制登出等場景使用 */
    const clearSession = useCallback(async () => {
        try { await authApi.logout() } catch { /* 即使後端失敗也繼續清除前端 */ }
        localStorage.removeItem('veil_access_token')
        localStorage.removeItem('veil_refresh_token')
        localStorage.removeItem('veil_user')
        setCurrentUser(null)
    }, [])

    /** 登出：清除 session 並導回 /auth */
    const logout = useCallback(async () => {
        await clearSession()
        navigate('/auth')
    }, [clearSession, navigate])

    return (
        <AuthContext.Provider value={{ currentUser, isLoading, isSuspended, login, logout, clearSession, updateProfile }}>
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
