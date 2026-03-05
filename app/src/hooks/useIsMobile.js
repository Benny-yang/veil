import { useState, useEffect, useMemo } from 'react'

const DEBOUNCE_MS = 150

/**
 * 回傳目前視窗是否為手機尺寸（< 768px）
 *
 * - 使用 matchMedia 監聽斷點變化（比 resize 精準）
 * - 加入 debounce 防抖，避免手機虛擬鍵盤彈出造成的
 *   瞬態 viewport 變化觸發 isMobile 抖動（會導致
 *   表單 input 元素被 remount 而失焦）
 * - SSR 安全：伺服器端回傳 false
 */
export default function useIsMobile(breakpoint = 768) {
    const mq = useMemo(
        () => typeof window !== 'undefined'
            ? window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
            : null,
        [breakpoint],
    )

    const [isMobile, setIsMobile] = useState(mq ? mq.matches : false)

    useEffect(() => {
        if (!mq) return

        let timerId = null

        const handler = (e) => {
            clearTimeout(timerId)
            timerId = setTimeout(() => setIsMobile(e.matches), DEBOUNCE_MS)
        }

        mq.addEventListener('change', handler)
        return () => {
            mq.removeEventListener('change', handler)
            clearTimeout(timerId)
        }
    }, [mq])

    return isMobile
}
