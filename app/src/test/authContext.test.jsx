import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext'

// Mock authApi
vi.mock('../services/api', () => ({
    authApi: {
        logout: vi.fn().mockResolvedValue({}),
    },
}))

// ── localStorage mock ─────────────────────────────────────────────────────────
const localStorageMock = (() => {
    let store = {}
    return {
        getItem: (key) => store[key] ?? null,
        setItem: (key, val) => { store[key] = String(val) },
        removeItem: (key) => { delete store[key] },
        clear: () => { store = {} },
    }
})()

Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
})

// ── Helper: 測試用 Consumer ────────────────────────────────────────────────────
function AuthConsumer({ onMount }) {
    const ctx = useAuth()
    onMount?.(ctx)
    return null
}

function renderWithAuth(onMount) {
    let result
    render(
        <MemoryRouter>
            <AuthProvider>
                <AuthConsumer onMount={(ctx) => { result = ctx }} />
            </AuthProvider>
        </MemoryRouter>
    )
    return result
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('AuthContext', () => {
    beforeEach(() => {
        localStorageMock.clear()
    })

    it('初始 currentUser 為 null（無 localStorage 資料）', () => {
        const ctx = renderWithAuth()
        expect(ctx.currentUser).toBeNull()
    })

    it('login() 設定 currentUser 並存入 localStorage', () => {
        const ctx = renderWithAuth()
        const fakeUser = { id: '1', username: 'benny', avatar_url: null }

        act(() => {
            ctx.login(
                { accessToken: 'access-tok', refreshToken: 'refresh-tok' },
                fakeUser
            )
        })

        expect(localStorageMock.getItem('veil_access_token')).toBe('access-tok')
        expect(localStorageMock.getItem('veil_refresh_token')).toBe('refresh-tok')
        expect(JSON.parse(localStorageMock.getItem('veil_user'))).toEqual(fakeUser)
    })

    it('updateProfile() 部分更新 currentUser 並同步 localStorage', () => {
        const ctx = renderWithAuth()
        const fakeUser = { id: '1', username: 'benny', avatar_url: null }

        act(() => {
            ctx.login({ accessToken: 'tok', refreshToken: 'ref' }, fakeUser)
        })

        act(() => {
            ctx.updateProfile({ avatar_url: 'https://cdn.example.com/avatar.png' })
        })

        const stored = JSON.parse(localStorageMock.getItem('veil_user'))
        expect(stored.avatar_url).toBe('https://cdn.example.com/avatar.png')
        expect(stored.username).toBe('benny') // 其他欄位保留
    })

    it('updateProfile() 在無登入狀態下不更新（currentUser 為 null）', () => {
        const ctx = renderWithAuth()
        // 不呼叫 login，currentUser 為 null
        act(() => {
            ctx.updateProfile({ avatar_url: 'https://cdn.example.com/avatar.png' })
        })
        expect(ctx.currentUser).toBeNull()
        expect(localStorageMock.getItem('veil_user')).toBeNull()
    })

    it('loadUserFromStorage：有 localStorage 資料時初始化 currentUser', () => {
        const fakeUser = { id: '1', username: 'benny', avatar_url: 'https://img.example.com/a.png' }
        localStorageMock.setItem('veil_user', JSON.stringify(fakeUser))

        let ctx
        render(
            <MemoryRouter>
                <AuthProvider>
                    <AuthConsumer onMount={(c) => { ctx = c }} />
                </AuthProvider>
            </MemoryRouter>
        )
        expect(ctx.currentUser).toEqual(fakeUser)
    })
})
