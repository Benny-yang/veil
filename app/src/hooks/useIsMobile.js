import { useState, useEffect } from 'react'

/**
 * 回傳目前視窗是否為手機尺寸（< 768px）
 * 使用 SSR 安全寫法：初始值依視窗大小決定
 */
export default function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
    )

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < breakpoint)
        const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
        mq.addEventListener('change', handler)
        handler()
        return () => mq.removeEventListener('change', handler)
    }, [breakpoint])

    return isMobile
}
