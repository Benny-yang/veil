import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutGrid, Search, Bookmark, Bell, Mail, Heart, MessageCircle, ClipboardCheck, X, User, LogOut } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'
import { useAuth } from '../context/AuthContext'
import { notifApi, chatApi } from '../services/api'



// 通知時間格式化
function formatTime(dateStr) {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '剛剛'
    if (mins < 60) return `${mins} 分鐘前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} 小時前`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} 天前`
    return new Date(dateStr).toLocaleDateString('zh-TW')
}

// 通知資料正規化（後端欄位 → 前端 UI 欄位）
function normalizeNotif(n) {
    const actor = n.actor
    return {
        id: n.id,
        type: n.type,
        read: n.read,
        avatar: actor?.avatar_url || null,
        user: actor?.username || null,
        text: n.message,
        meta: null,
        time: formatTime(n.created_at),
    }
}

const TYPE_CONFIG = {
    like: { Icon: Heart, color: '#E07A5F', bg: '#FEF0EC', label: '按讚' },
    comment: { Icon: MessageCircle, color: '#4A90D9', bg: '#EEF5FE', label: '留言' },
    zone_apply: { Icon: ClipboardCheck, color: '#C4A882', bg: '#FBF6EF', label: '申請' },
    zone_approved: { Icon: ClipboardCheck, color: '#2D7A4A', bg: '#EEF8F2', label: '通過' },
    zone_rejected: { Icon: ClipboardCheck, color: '#B0A89A', bg: '#F5F2EF', label: '未通過' },
}

// ─────────────────────────────────────────────────────────────────────────────
// 通知單行
// ─────────────────────────────────────────────────────────────────────────────
function NotifItem({ notif, onRead }) {
    const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.like
    const { Icon, color, bg } = cfg
    const navigate = useNavigate()

    return (
        <div
            onClick={() => onRead(notif.id)}
            style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 16px', cursor: 'pointer',
                backgroundColor: notif.read ? 'transparent' : '#FBF8F4',
                borderBottom: '1px solid #F0EBE3',
                transition: 'background-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F5F1EC'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = notif.read ? 'transparent' : '#FBF8F4'}
        >
            {/* 左側：用戶頭像 or 類型 icon */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
                {notif.avatar ? (
                    <img src={notif.avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        backgroundColor: bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Icon size={16} color={color} strokeWidth={1.8} />
                    </div>
                )}
                {/* 類型角標 */}
                {notif.avatar && (
                    <div style={{
                        position: 'absolute', bottom: -2, right: -2,
                        width: 16, height: 16, borderRadius: '50%',
                        backgroundColor: bg, border: '1.5px solid #FFFFFF',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Icon size={9} color={color} strokeWidth={2.5} />
                    </div>
                )}
            </div>

            {/* 文字內容 */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif', lineHeight: 1.5 }}>
                    {notif.user && (
                        <strong
                            style={{ fontWeight: 600, cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                            onClick={e => { e.stopPropagation(); onRead(notif.id); navigate(`/profile/${notif.user}`) }}
                        >{notif.user} </strong>
                    )}
                    {notif.text}
                </div>
                {notif.meta && (
                    <div style={{
                        fontSize: 11, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif',
                        marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {notif.meta}
                    </div>
                )}
                <div style={{ fontSize: 10, color: '#C4A882', fontFamily: 'Noto Sans TC, sans-serif', marginTop: 3 }}>
                    {notif.time}
                </div>
            </div>

            {/* 未讀圓點 */}
            {!notif.read && (
                <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    backgroundColor: '#C4A882', flexShrink: 0, marginTop: 5,
                }} />
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 通知彈窗
// ─────────────────────────────────────────────────────────────────────────────
function NotifPanel({ notifications, onRead, onReadAll, onClose }) {
    const unreadCount = notifications.filter(n => !n.read).length
    const isMobile = useIsMobile()

    return (
        <div style={{
            position: isMobile ? 'fixed' : 'absolute',
            top: isMobile ? 60 : 44,
            right: isMobile ? 8 : 0,
            width: isMobile ? Math.min(320, window.innerWidth - 16) : 340,
            backgroundColor: '#FFFFFF',
            borderRadius: 12, boxShadow: '0 8px 32px rgba(28,26,24,0.18)',
            border: '1px solid #F0EBE3',
            zIndex: 999, overflow: 'hidden',
        }}>
            {/* Panel Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px 12px',
                borderBottom: '1px solid #F0EBE3',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>
                        通知
                    </span>
                    {unreadCount > 0 && (
                        <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                            backgroundColor: '#C4A882', color: '#FFFFFF',
                            fontFamily: 'Noto Sans TC, sans-serif',
                        }}>
                            {unreadCount}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {unreadCount > 0 && (
                        <button onClick={onReadAll} style={{
                            fontSize: 11, color: '#C4A882', background: 'none', border: 'none',
                            cursor: 'pointer', fontFamily: 'Noto Sans TC, sans-serif', padding: 0,
                        }}>
                            全部已讀
                        </button>
                    )}
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#B0A89A', display: 'flex', alignItems: 'center',
                    }}>
                        <X size={16} strokeWidth={1.8} />
                    </button>
                </div>
            </div>

            {/* 通知列表 */}
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                    <div style={{
                        padding: '40px 20px', textAlign: 'center',
                        color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 13,
                    }}>
                        目前沒有通知
                    </div>
                ) : (
                    notifications.map(n => (
                        <NotifItem key={n.id} notif={n} onRead={onRead} />
                    ))
                )}
            </div>
        </div>
    )
}


// ─────────────────────────────────────────────────────────────────────────────
// 通知 Bell 按鈕（含彈窗邏輯）
// ─────────────────────────────────────────────────────────────────────────────
function NotifBell() {
    const [open, setOpen] = useState(false)
    const [notifications, setNotifications] = useState([])
    const ref = useRef(null)

    const unreadCount = notifications.filter(n => !n.read).length

    const load = useCallback(async () => {
        try {
            const res = await notifApi.list()
            const raw = res.data.data || []
            setNotifications(raw.map(normalizeNotif))
        } catch { /* 靜默失敗 */ }
    }, [])

    useEffect(() => {
        load()
        const timer = setInterval(load, 30000)
        return () => clearInterval(timer)
    }, [load])

    // 點外部關閉
    useEffect(() => {
        if (!open) return
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    const markRead = async (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        try { await notifApi.markRead(id) } catch { /* 靜默 */ }
    }

    const markReadAll = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        try { await notifApi.markReadAll() } catch { /* 靜默 */ }
    }

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(v => !v)}
                title="通知"
                style={{
                    color: open ? '#C4A882' : '#8C8479',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 0, position: 'relative',
                    display: 'flex', alignItems: 'center',
                    transition: 'color 0.2s',
                }}
                onMouseEnter={e => { if (!open) e.currentTarget.style.color = '#C4A882' }}
                onMouseLeave={e => { if (!open) e.currentTarget.style.color = '#8C8479' }}
            >
                <Bell size={20} strokeWidth={1.5} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: -3, right: -4,
                        minWidth: 14, height: 14, borderRadius: 7, paddingBottom: 1,
                        backgroundColor: '#C4A882', color: '#FFFFFF',
                        fontSize: 9, fontWeight: 700, lineHeight: '14px',
                        textAlign: 'center', fontFamily: 'Noto Sans TC, sans-serif',
                        border: '1.5px solid #3A3531',
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <NotifPanel
                    notifications={notifications}
                    onRead={markRead}
                    onReadAll={markReadAll}
                    onClose={() => setOpen(false)}
                />
            )}
        </div>
    )
}

// ── 動態未讀訊息數
function ChatBadge() {
    const [unread, setUnread] = useState(0)
    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const res = await chatApi.getDmChats()
                const chats = res.data.data || []
                const total = chats.reduce((sum, c) => sum + (c.unread_count ?? 0), 0)
                if (!cancelled) setUnread(total)
            } catch { /* 靜默 */ }
        }
        load()
        const timer = setInterval(load, 30000)
        return () => { cancelled = true; clearInterval(timer) }
    }, [])
    if (unread <= 0) return null
    return (
        <span style={{
            position: 'absolute', top: -3, right: -4,
            minWidth: 14, height: 14, borderRadius: 7, paddingBottom: 1,
            backgroundColor: '#E07A5F', color: '#FFFFFF',
            fontSize: 9, fontWeight: 700, lineHeight: '14px',
            textAlign: 'center', fontFamily: 'Noto Sans TC, sans-serif',
            border: '1.5px solid #3A3531',
        }}>{unread > 9 ? '9+' : unread}</span>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// AppNav
// ─────────────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
    { icon: LayoutGrid, to: '/home', label: '首頁' },
    { icon: Search, to: '/explore', label: '探索' },
]

// ── 手機版底部導覽列 ───────────────────────────────────────────────────────────
const MOBILE_NAV_ITEMS = [
    { icon: LayoutGrid, to: '/home', label: '首頁' },
    { icon: Search, to: '/explore', label: '探索' },
    { icon: Bookmark, to: '/collection', label: '私藏' },
    { icon: Mail, to: '/chat', label: '訊息', hasBadge: true },
    { icon: User, to: '/profile', label: '我' },
]

function MobileBottomNav() {
    const location = useLocation()
    const { currentUser } = useAuth()
    const username = currentUser?.username || ''

    const navItems = [
        { icon: LayoutGrid, to: '/home', label: '首頁' },
        { icon: Search, to: '/explore', label: '探索' },
        { icon: Bookmark, to: '/collection', label: '私藏' },
        { icon: Mail, to: '/chat', label: '訊息', hasBadge: true },
        { icon: User, to: username ? `/profile/${username}` : '/profile', label: '我' },
    ]

    return (
        <nav style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            height: 64, backgroundColor: '#3A3531',
            borderTop: '1px solid rgba(196,168,130,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-around',
            zIndex: 1000,
            paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
            {navItems.map(({ icon: Icon, to, label, hasBadge }) => {
                const isActive = location.pathname.startsWith(to === '/home' ? to : to)
                const color = isActive ? '#C4A882' : '#8C8479'
                return (
                    <Link key={label} to={to} style={{ textDecoration: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: 12 }}>
                            <Icon size={22} strokeWidth={1.5} color={color} />
                            {hasBadge && <ChatBadge />}
                        </div>
                    </Link>
                )
            })}
        </nav>
    )
}

export default function AppNav() {
    const location = useLocation()
    const isMobile = useIsMobile()

    return (
        <>
            {/* ── 桌面版：頂部 Nav ── */}
            <nav
                className="flex items-center justify-between px-8 sticky top-0 z-50"
                style={{
                    backgroundColor: '#3A3531',
                    height: 60,
                    borderBottom: '1px solid rgba(196,168,130,0.15)',
                }}
            >
                {/* Logo */}
                <Link
                    to="/home"
                    style={{
                        color: '#F2EDE6',
                        fontFamily: 'Cormorant Garamond, serif',
                        fontSize: 22,
                        letterSpacing: '0.2em',
                        fontWeight: 300,
                        textDecoration: 'none',
                    }}
                >
                    VEIL
                </Link>

                {/* 手機版頂部右側：只顯示通知 Bell */}
                {isMobile && <NotifBell />}

                {/* 桌面右側 Icons（手機隱藏） */}
                {!isMobile && (
                    <div className="flex items-center gap-5">
                        {NAV_ITEMS.map(({ icon: Icon, to, label }) => {
                            const isActive = location.pathname === to
                            return (
                                <Link
                                    key={to} to={to} title={label}
                                    style={{
                                        color: isActive ? '#C4A882' : '#8C8479',
                                        textDecoration: 'none', display: 'flex', alignItems: 'center',
                                        transition: 'color 0.2s',
                                    }}
                                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#C4A882' }}
                                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = isActive ? '#C4A882' : '#8C8479' }}
                                >
                                    <Icon size={20} strokeWidth={1.5} />
                                </Link>
                            )
                        })}
                        <NotifBell />
                        <Link
                            to="/chat" title="訊息"
                            style={{
                                color: location.pathname === '/chat' ? '#C4A882' : '#8C8479',
                                textDecoration: 'none', display: 'flex', alignItems: 'center',
                                position: 'relative', transition: 'color 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#C4A882'}
                            onMouseLeave={e => e.currentTarget.style.color = location.pathname === '/chat' ? '#C4A882' : '#8C8479'}
                        >
                            <Mail size={20} strokeWidth={1.5} />
                            <ChatBadge />
                        </Link>
                        <UserMenu />
                    </div>
                )}
            </nav>

            {/* ── 手機版：底部 Nav ── */}
            {isMobile && <MobileBottomNav />}
        </>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// UserMenu（大頭照 + 下拉選單）
// ─────────────────────────────────────────────────────────────────────────────
function UserMenu() {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)
    const navigate = useNavigate()
    const { logout, currentUser } = useAuth()

    const avatarUrl = currentUser?.avatar_url || null
    const displayName = currentUser?.username || ''

    useEffect(() => {
        if (!open) return
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    const MENU_ITEMS = [
        {
            icon: User, label: '我的主頁',
            onClick: () => { setOpen(false); navigate(displayName ? `/profile/${displayName}` : '/profile') },
        },
        {
            icon: Bookmark, label: '我的私藏',
            onClick: () => { setOpen(false); navigate('/collection') },
        },
    ]

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            {/* 大頭照按鈕 */}
            <button
                onClick={() => setOpen(v => !v)}
                style={{
                    width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
                    cursor: 'pointer', flexShrink: 0, padding: 0, border: 'none',
                    outline: open ? '2px solid #C4A882' : '1.5px solid rgba(196,168,130,0.4)',
                    outlineOffset: 1, transition: 'outline 0.2s',
                    backgroundColor: '#8C8479',
                }}
            >
                {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                    <User size={18} color="#F2EDE6" strokeWidth={1.5} style={{ display: 'block', margin: '7px auto' }} />
                )}
            </button>

            {/* 下拉選單 */}
            {open && (
                <div style={{
                    position: 'absolute', top: 42, right: 0,
                    width: 180, backgroundColor: '#FFFFFF',
                    borderRadius: 10, boxShadow: '0 8px 28px rgba(28,26,24,0.18)',
                    border: '1px solid #F0EBE3', overflow: 'hidden', zIndex: 999,
                }}>
                    {/* 使用者資訊 */}
                    <div style={{
                        padding: '12px 16px', borderBottom: '1px solid #F0EBE3',
                        display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#8C8479', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={14} color="#F2EDE6" strokeWidth={1.5} />
                            </div>
                        )}
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>
                            {displayName}
                        </span>
                    </div>

                    {/* 一般選項 */}
                    {MENU_ITEMS.map(({ icon: Icon, label, onClick }) => (
                        <button key={label} onClick={onClick} style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '11px 16px', border: 'none', backgroundColor: 'transparent',
                            cursor: 'pointer', fontSize: 13, color: '#1C1A18',
                            fontFamily: 'Noto Sans TC, sans-serif', textAlign: 'left',
                            transition: 'background-color 0.12s',
                        }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F4EE'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <Icon size={15} color="#8C8479" strokeWidth={1.8} />
                            {label}
                        </button>
                    ))}

                    {/* 分隔線 */}
                    <div style={{ height: 1, backgroundColor: '#F0EBE3', margin: '2px 0' }} />

                    {/* 登出 */}
                    <button onClick={() => { setOpen(false); logout() }} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '11px 16px', border: 'none', backgroundColor: 'transparent',
                        cursor: 'pointer', fontSize: 13, color: '#C0392B',
                        fontFamily: 'Noto Sans TC, sans-serif', textAlign: 'left',
                        transition: 'background-color 0.12s',
                    }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDF6F6'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <LogOut size={15} color="#C0392B" strokeWidth={1.8} />
                        登出
                    </button>
                </div>
            )}
        </div>
    )
}

