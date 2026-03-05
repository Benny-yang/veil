import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import useIsMobile from '../hooks/useIsMobile'

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * 建立 matchMedia mock，模擬 change 事件觸發
 */
function createMatchMediaMock(initialMatches = false) {
    const listeners = []

    const mql = {
        matches: initialMatches,
        media: '',
        addEventListener: vi.fn((_, handler) => listeners.push(handler)),
        removeEventListener: vi.fn((_, handler) => {
            const idx = listeners.indexOf(handler)
            if (idx !== -1) listeners.splice(idx, 1)
        }),
        /** 模擬觸發 change 事件 */
        _fire(matches) {
            mql.matches = matches
            listeners.forEach(fn => fn({ matches }))
        },
        _listeners: listeners,
    }

    return mql
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('useIsMobile', () => {
    let originalMatchMedia

    beforeEach(() => {
        originalMatchMedia = window.matchMedia
        vi.useFakeTimers()
    })

    afterEach(() => {
        window.matchMedia = originalMatchMedia
        vi.useRealTimers()
    })

    it('初始值應與 matchMedia.matches 一致（手機尺寸）', () => {
        const mql = createMatchMediaMock(true)
        window.matchMedia = vi.fn(() => mql)

        const { result } = renderHook(() => useIsMobile())
        expect(result.current).toBe(true)
    })

    it('初始值應與 matchMedia.matches 一致（桌面尺寸）', () => {
        const mql = createMatchMediaMock(false)
        window.matchMedia = vi.fn(() => mql)

        const { result } = renderHook(() => useIsMobile())
        expect(result.current).toBe(false)
    })

    it('change 事件觸發後，debounce 時間內不會更新', () => {
        const mql = createMatchMediaMock(false)
        window.matchMedia = vi.fn(() => mql)

        const { result } = renderHook(() => useIsMobile())
        expect(result.current).toBe(false)

        // 觸發 change，但尚未超過 debounce 時間
        act(() => mql._fire(true))
        expect(result.current).toBe(false) // 還在 debounce 中

        // 推進 100ms（仍不足 150ms）
        act(() => vi.advanceTimersByTime(100))
        expect(result.current).toBe(false)

        // 推進到 150ms → debounce 結束
        act(() => vi.advanceTimersByTime(50))
        expect(result.current).toBe(true)
    })

    it('快速連續觸發 change 事件，只有最後一次生效', () => {
        const mql = createMatchMediaMock(false)
        window.matchMedia = vi.fn(() => mql)

        const { result } = renderHook(() => useIsMobile())

        // 模擬虛擬鍵盤造成的快速抖動：false → true → false → true
        act(() => {
            mql._fire(true)   // t=0
        })
        act(() => {
            vi.advanceTimersByTime(30)
            mql._fire(false)  // t=30
        })
        act(() => {
            vi.advanceTimersByTime(30)
            mql._fire(true)   // t=60
        })

        // 還在 debounce 中，值不應改變
        expect(result.current).toBe(false)

        // 推進到最後一次觸發後 150ms
        act(() => vi.advanceTimersByTime(150))
        expect(result.current).toBe(true)
    })

    it('unmount 後應清除 listener 和 timer', () => {
        const mql = createMatchMediaMock(false)
        window.matchMedia = vi.fn(() => mql)

        const { unmount } = renderHook(() => useIsMobile())

        expect(mql.addEventListener).toHaveBeenCalledTimes(1)

        unmount()

        expect(mql.removeEventListener).toHaveBeenCalledTimes(1)
        expect(mql._listeners).toHaveLength(0)
    })

    it('支援自訂 breakpoint', () => {
        const mql = createMatchMediaMock(true)
        window.matchMedia = vi.fn((query) => {
            mql.media = query
            return mql
        })

        renderHook(() => useIsMobile(1024))
        expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 1023px)')
    })
})
