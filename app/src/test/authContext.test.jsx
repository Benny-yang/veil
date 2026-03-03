import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext'
import * as apiModule from '../services/api'

// Mock authApi
vi.mock('../services/api', () => ({
    authApi: {
        logout: vi.fn().mockResolvedValue({}),
        me: vi.fn().mockRejectedValue({ response: { status: 401 } }),
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

function renderWithAuth() {
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
        vi.clearAllMocks()
        // me() 預設回傳 401
        apiModule.authApi.me.mockRejectedValue({ response: { status: 401 } })
    })

    it('初始 currentUser 為 null（無 localStorage token）', async () => {
        const ctx = renderWithAuth()
        await waitFor(() => expect(ctx.currentUser).toBeNull())
    })

    it('login() 設定 currentUser 並存入 localStorage', async () => {
        const ctx = renderWithAuth()
        await waitFor(() => expect(ctx.currentUser).toBeNull()) // 等初始化完成

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

    it('updateProfile() 部分更新 currentUser 並同步 localStorage', async () => {
        const ctx = renderWithAuth()
        await waitFor(() => expect(ctx.currentUser).toBeNull())

        const fakeUser = { id: '1', username: 'benny', avatar_url: null }
        act(() => {
            ctx.login({ accessToken: 'tok', refreshToken: 'ref' }, fakeUser)
        })
        act(() => {
            ctx.updateProfile({ avatar_url: 'https://cdn.example.com/avatar.png' })
        })

        const stored = JSON.parse(localStorageMock.getItem('veil_user'))
        expect(stored.avatar_url).toBe('https://cdn.example.com/avatar.png')
        expect(stored.username).toBe('benny')
    })

    it('updateProfile() 在無登入狀態下不更新（currentUser 為 null）', async () => {
        const ctx = renderWithAuth()
        await waitFor(() => expect(ctx.currentUser).toBeNull())

        act(() => {
            ctx.updateProfile({ avatar_url: 'https://cdn.example.com/avatar.png' })
        })
        expect(ctx.currentUser).toBeNull()
        expect(localStorageMock.getItem('veil_user')).toBeNull()
    })

    it('有效 token：authApi.me() 成功時設定 currentUser', async () => {
        const fakeUser = { id: '1', username: 'benny', avatar_url: 'https://img.example.com/a.png' }
        apiModule.authApi.me.mockResolvedValueOnce({ data: { data: fakeUser } })

        localStorageMock.setItem('veil_access_token', 'valid-token')

        let ctx
        render(
            <MemoryRouter>
                <AuthProvider>
                    <AuthConsumer onMount={(c) => { ctx = c }} />
                </AuthProvider>
            </MemoryRouter>
        )

        await waitFor(() => expect(ctx?.currentUser?.username).toBe('benny'))
    })
})
