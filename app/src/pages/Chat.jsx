import React, { useState, useRef, useEffect } from 'react'
import { Send, ChevronDown, ChevronUp, UserCheck, Star, Package, CreditCard, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'

// ─────────────────────────────────────────────────────────────────────────────
// 常數
// ─────────────────────────────────────────────────────────────────────────────
const TX_STEPS = [
    { key: 'pending_payment', label: '待付款', Icon: CreditCard },
    { key: 'paid', label: '已付款', Icon: CreditCard },
    { key: 'shipped', label: '待收貨', Icon: Package },
    { key: 'completed', label: '已完成', Icon: CheckCircle },
]
const TX_STEP_INDEX = Object.fromEntries(TX_STEPS.map((s, i) => [s.key, i]))

// 逾時天數設定
const TIMEOUT_DAYS = { pending_payment: 3, paid: 7, shipped: 14 }

// ─────────────────────────────────────────────────────────────────────────────
// Mock 資料
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_ZONE_CHATS = [
    {
        zoneId: 'z1', zoneTitle: '春季限定｜復古洋裝私藏',
        totalSlots: 3, collectorCount: 1,
        chats: [
            {
                id: 'zc1', peer: 'velvet_noir', avatarColor: '#E8DDD0',
                lastMsg: '想了解一下尺寸和狀態 🙏', status: '對話中', statusColor: '#C4A882', role: '買家',
                tx: null, unread: 2,
            },
            {
                id: 'zc2', peer: 'retro_rose', avatarColor: '#8C8479',
                lastMsg: '我剛付款了！', status: '收藏家', statusColor: '#4CAF50', role: '收藏家',
                // 模擬：已付款，逾時 10 天（超過 7 天門檻）→ 橘色警告顯示
                tx: { status: 'paid', updatedAt: Date.now() - 10 * 86400000, buyerReviewed: false, sellerReviewed: false },
                unread: 0,
            },

            {
                id: 'zc3', peer: 'silk_archive', avatarColor: '#E8DDD0',
                lastMsg: '收到了！太美了 ✨', status: '收藏家', statusColor: '#4CAF50', role: '收藏家',
                // 模擬：已完成，尚未評價
                tx: { status: 'completed', updatedAt: Date.now() - 2 * 86400000, buyerReviewed: true, sellerReviewed: false },
                unread: 1,
            },
        ],
    },
    {
        zoneId: 'z2', zoneTitle: '設計師包款｜經典釋出',
        totalSlots: 2, collectorCount: 0,
        chats: [
            {
                id: 'zc4', peer: 'lux_finder', avatarColor: '#C4A882',
                lastMsg: '請問有保卡嗎？', status: '對話中', statusColor: '#C4A882', role: '買家',
                tx: null, unread: 0,
            },
        ],
    },
]

const MOCK_DM_CHATS = [
    { id: 'dm1', peer: 'luna_closet', avatarColor: '#C4A882', lastMsg: '謝謝你的推薦～很喜歡！', time: '昨天', unread: 1 },
    { id: 'dm2', peer: 'velvet_archive', avatarColor: '#8C8479', lastMsg: '請問有在收古著嗎？', time: '2 天前', unread: 0 },
]

const INITIAL_MESSAGES = {
    zc1: [
        { id: 'm1', from: 'peer', text: '嗨！謝謝你的申請，想了解一下有哪些尺寸？', time: '下午 3:42' },
        { id: 'm2', from: 'me', text: '這件是 S 號，穿過一次，蕾絲完全沒有損傷。\n實品顏色比照片更好看哦 ✨', time: '下午 3:48' },
    ],
    zc2: [
        { id: 'm1', from: 'peer', text: '已付款！麻煩盡快寄出，感謝 🙏', time: '5 天前 下午 2:10' },
    ],
    zc3: [
        { id: 'm1', from: 'peer', text: '收到了！太美了 ✨', time: '3 天前' },
        { id: 'm2', from: 'me', text: '很高興你喜歡～歡迎成為私藏家 🎉', time: '3 天前' },
        { id: 'sys1', from: 'system', text: '✅ silk_archive 已被設為收藏家', time: '3 天前' },
        { id: 'sys2', from: 'system', text: '📦 交易已完成', time: '2 天前' },
    ],
    zc4: [
        { id: 'm1', from: 'peer', text: '請問有保卡嗎？', time: '下午 1:00' },
    ],
    dm1: [
        { id: 'm1', from: 'peer', text: '謝謝你的推薦～很喜歡！', time: '昨天 下午 5:00' },
        { id: 'm2', from: 'me', text: '太好了！穿出去一定很美 😊', time: '昨天 下午 5:10' },
    ],
    dm2: [
        { id: 'm1', from: 'peer', text: '請問有在收古著嗎？', time: '2 天前 下午 3:00' },
    ],
}

// ─────────────────────────────────────────────────────────────────────────────
// 工具函式
// ─────────────────────────────────────────────────────────────────────────────
function daysSince(ts) {
    return Math.floor((Date.now() - ts) / 86400000)
}
function isTimedOut(tx) {
    if (!tx || tx.status === 'completed') return false
    const limit = TIMEOUT_DAYS[tx.status]
    return limit ? daysSince(tx.updatedAt) >= limit : false
}
function nowTime() {
    return new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
}

// ─────────────────────────────────────────────────────────────────────────────
// ConfirmDialog（通用）
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmDialog({ icon, title, desc, confirmLabel, confirmColor = '#1C1A18', onConfirm, onCancel }) {
    return (
        <div onClick={onCancel} style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            backgroundColor: 'rgba(28,26,24,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(3px)',
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                width: 340, backgroundColor: '#FFFFFF', borderRadius: 16,
                padding: 28, display: 'flex', flexDirection: 'column', gap: 16,
                boxShadow: '0 16px 48px rgba(0,0,0,0.16)',
            }}>
                {icon && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {icon}
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>
                            {title}
                        </div>
                    </div>
                )}
                {!icon && (
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>
                        {title}
                    </div>
                )}
                <div style={{ fontSize: 13, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{ __html: desc }} />
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={onCancel} style={{
                        flex: 1, padding: '11px 0', borderRadius: 8,
                        border: '1px solid #E8DDD0', backgroundColor: '#FFFFFF',
                        fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif', color: '#8C8479', cursor: 'pointer',
                    }}>取消</button>
                    <button onClick={onConfirm} style={{
                        flex: 1, padding: '11px 0', borderRadius: 8, border: 'none',
                        backgroundColor: confirmColor, color: '#FFFFFF',
                        fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif',
                        fontWeight: 600, cursor: 'pointer',
                    }}>{confirmLabel}</button>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// ReviewModal（評價彈窗）
// ─────────────────────────────────────────────────────────────────────────────
function ReviewModal({ peerName, onSubmit, onSkip }) {
    const [score, setScore] = useState(0)
    const [hovered, setHovered] = useState(0)
    const [comment, setComment] = useState('')
    const isNegative = score > 0 && score <= 2

    return (
        <div onClick={onSkip} style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            backgroundColor: 'rgba(28,26,24,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(3px)',
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                width: 360, backgroundColor: '#FFFFFF', borderRadius: 16,
                padding: 28, display: 'flex', flexDirection: 'column', gap: 18,
                boxShadow: '0 16px 48px rgba(0,0,0,0.16)',
            }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>
                    評價 {peerName}
                </div>

                {/* 星評 */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    {[1, 2, 3, 4, 5].map(n => (
                        <button key={n}
                            onClick={() => setScore(n)}
                            onMouseEnter={() => setHovered(n)}
                            onMouseLeave={() => setHovered(0)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                        >
                            <Star
                                size={28} strokeWidth={1.5}
                                fill={(hovered || score) >= n ? '#C4A882' : 'none'}
                                color={(hovered || score) >= n ? '#C4A882' : '#D4CCC4'}
                            />
                        </button>
                    ))}
                </div>
                {score > 0 && (
                    <div style={{
                        textAlign: 'center', fontSize: 12, fontFamily: 'Noto Sans TC, sans-serif',
                        color: score <= 2 ? '#C0392B' : score <= 3 ? '#C4A882' : '#2D7A4A',
                    }}>
                        {['', '非常不推薦', '不推薦', '普通', '推薦', '非常推薦'][score]}
                    </div>
                )}

                {/* 差評警告 */}
                {isNegative && (
                    <div style={{
                        backgroundColor: '#FDF6F6', borderRadius: 8, padding: '10px 14px',
                        fontSize: 12, color: '#C0392B', fontFamily: 'Noto Sans TC, sans-serif',
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                    }}>
                        <AlertTriangle size={14} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 1 }} />
                        此評價將公開顯示，並會影響對方的信用評分。
                    </div>
                )}

                {/* 留言 */}
                <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="分享這次交易的心得（選填）"
                    rows={3}
                    style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box',
                        border: '1.5px solid #E8DDD0', fontSize: 13, resize: 'none', outline: 'none',
                        fontFamily: 'Noto Sans TC, sans-serif', color: '#1C1A18',
                        backgroundColor: '#F8F4EE',
                    }}
                />

                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={onSkip} style={{
                        flex: 1, padding: '11px 0', borderRadius: 8,
                        border: '1px solid #E8DDD0', backgroundColor: '#FFFFFF',
                        fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif', color: '#8C8479', cursor: 'pointer',
                    }}>略過</button>
                    <button
                        onClick={() => score > 0 && onSubmit(score, comment)}
                        style={{
                            flex: 1, padding: '11px 0', borderRadius: 8, border: 'none',
                            backgroundColor: score > 0 ? '#1C1A18' : '#D4CCC4',
                            color: '#F2EDE6', fontSize: 13,
                            fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600,
                            cursor: score > 0 ? 'pointer' : 'not-allowed',
                        }}
                    >送出評價</button>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// StepProgress（步驟進度條）
// ─────────────────────────────────────────────────────────────────────────────
function StepProgress({ txStatus }) {
    const currentIdx = TX_STEP_INDEX[txStatus] ?? -1
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {TX_STEPS.map((step, i) => {
                const done = i < currentIdx
                const active = i === currentIdx
                return (
                    <React.Fragment key={step.key}>
                        {/* 節點 */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: '50%',
                                backgroundColor: done ? '#C4A882' : active ? '#1C1A18' : '#E8DDD0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: active ? '0 0 0 3px rgba(28,26,24,0.12)' : 'none',
                                transition: 'all 0.3s',
                            }}>
                                <step.Icon size={13} color={done || active ? '#FFFFFF' : '#B0A89A'} strokeWidth={2} />
                            </div>
                            <span style={{
                                fontSize: 10, fontFamily: 'Noto Sans TC, sans-serif',
                                color: done ? '#C4A882' : active ? '#1C1A18' : '#B0A89A',
                                fontWeight: active ? 600 : 400,
                                whiteSpace: 'nowrap',
                            }}>{step.label}</span>
                        </div>
                        {/* 連接線 */}
                        {i < TX_STEPS.length - 1 && (
                            <div style={{
                                flex: 1, height: 2, marginBottom: 14,
                                backgroundColor: i < currentIdx ? '#C4A882' : '#E8DDD0',
                                transition: 'background-color 0.3s',
                            }} />
                        )}
                    </React.Fragment>
                )
            })}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TransactionBar（交易狀態列）
// viewerRole: 'seller' | 'buyer' (決定顯示哪個操作按鈕)
// ─────────────────────────────────────────────────────────────────────────────
function TransactionBar({ tx, peerName, viewerRole, onAction }) {
    const timedOut = isTimedOut(tx)
    const days = timedOut && tx ? daysSince(tx.updatedAt) : 0
    const isCompleted = tx.status === 'completed'

    // 決定當前操作按鈕
    const getAction = () => {
        if (isCompleted) {
            if (viewerRole === 'seller' && !tx.sellerReviewed)
                return { label: '★ 評價對方', type: 'review', color: '#C4A882' }
            if (viewerRole === 'buyer' && !tx.buyerReviewed)
                return { label: '★ 評價對方', type: 'review', color: '#C4A882' }
            return { label: '交易已完成', type: null, color: '#D4CCC4' }
        }
        if (tx.status === 'pending_payment' && viewerRole === 'buyer')
            return { label: '我已付款', type: 'pending_payment→paid', color: '#1C1A18' }
        if (tx.status === 'paid' && viewerRole === 'seller')
            return { label: '已寄出', type: 'paid→shipped', color: '#1C1A18' }
        if (tx.status === 'shipped' && viewerRole === 'buyer')
            return { label: '確認收貨', type: 'shipped→completed', color: '#2D7A4A' }
        // 另一方視角：等待中
        return null
    }

    const action = getAction()

    return (
        <div style={{
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #F0EBE3',
        }}>
            {/* 步驟進度 */}
            <div style={{ padding: '14px 24px 10px' }}>
                <StepProgress txStatus={tx.status} />
            </div>

            {/* 逾時警告 */}
            {timedOut && !isCompleted && (
                <div style={{
                    margin: '0 24px 10px',
                    backgroundColor: '#FFF8EE', borderRadius: 8,
                    padding: '8px 12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={13} color="#C4A882" strokeWidth={2} />
                        <span style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>
                            已超過 {days} 天未更新，你現在可以直接提交評價
                        </span>
                    </div>
                    <button onClick={() => onAction('force_review')} style={{
                        padding: '5px 12px', borderRadius: 6, border: '1px solid #E8DDD0',
                        backgroundColor: '#FFFFFF', fontSize: 11,
                        fontFamily: 'Noto Sans TC, sans-serif', color: '#8C8479', cursor: 'pointer',
                        whiteSpace: 'nowrap', flexShrink: 0,
                    }}>留下評價</button>
                </div>
            )}

            {/* 操作按鈕區 */}
            {action && (
                <div style={{ padding: '0 24px 14px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => action.type && onAction(action.type)}
                        style={{
                            padding: '9px 20px', borderRadius: 8, border: 'none',
                            backgroundColor: action.color, color: '#FFFFFF',
                            fontSize: 12, fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600,
                            cursor: action.type ? 'pointer' : 'not-allowed',
                            transition: 'opacity 0.15s',
                            opacity: action.type ? 1 : 0.7,
                        }}
                        onMouseEnter={e => { if (action.type) e.currentTarget.style.opacity = '0.85' }}
                        onMouseLeave={e => { if (action.type) e.currentTarget.style.opacity = '1' }}
                    >
                        {action.label}
                    </button>
                </div>
            )}

            {/* 等待對方 */}
            {!action && !isCompleted && (
                <div style={{
                    padding: '0 24px 14px', display: 'flex', justifyContent: 'flex-end',
                }}>
                    <span style={{ fontSize: 12, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif' }}>
                        等待 {peerName} 操作…
                    </span>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// ZoneClosedBanner
// ─────────────────────────────────────────────────────────────────────────────
function ZoneClosedBanner({ zoneTitle }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            backgroundColor: 'rgba(28,26,24,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(3px)',
        }}>
            <div style={{
                width: 340, backgroundColor: '#FFFFFF', borderRadius: 16,
                padding: 28, textAlign: 'center',
                boxShadow: '0 16px 48px rgba(0,0,0,0.16)',
                display: 'flex', flexDirection: 'column', gap: 12,
            }}>
                <div style={{ fontSize: 36 }}>🎉</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>
                    私藏名額已滿
                </div>
                <div style={{ fontSize: 13, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', lineHeight: 1.6 }}>
                    「{zoneTitle}」的收藏名額已全數確認，此私藏已自動結束。
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Bubble
// ─────────────────────────────────────────────────────────────────────────────
function Bubble({ msg, peerColor }) {
    const isMe = msg.from === 'me'
    if (msg.from === 'system') {
        return (
            <div style={{
                textAlign: 'center', fontSize: 11,
                color: '#2D7A4A', fontFamily: 'Noto Sans TC, sans-serif',
                backgroundColor: '#F0F9F2', borderRadius: 8,
                padding: '6px 14px', alignSelf: 'center',
            }}>
                {msg.text}
            </div>
        )
    }
    return (
        <div style={{ display: 'flex', gap: 10, flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
            {!isMe && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, backgroundColor: peerColor }} />
            )}
            <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', gap: 3, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{
                    backgroundColor: isMe ? '#C4A882' : '#FFFFFF',
                    borderRadius: isMe ? '12px 0 12px 12px' : '0 12px 12px 12px',
                    padding: '10px 14px', fontSize: 13,
                    color: isMe ? '#FFFFFF' : '#1C1A18',
                    fontFamily: 'Noto Sans TC, sans-serif', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                }}>
                    {msg.text}
                </div>
                <span style={{ fontSize: 10, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif' }}>
                    {msg.time}
                </span>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// SidebarTab
// ─────────────────────────────────────────────────────────────────────────────
function SidebarTab({ label, active, onClick }) {
    return (
        <button onClick={onClick} style={{
            flex: 1, padding: '9px 0', fontSize: 12,
            fontFamily: 'Noto Sans TC, sans-serif', fontWeight: active ? 600 : 400,
            color: active ? '#1C1A18' : '#8C8479',
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: active ? '2px solid #1C1A18' : '2px solid transparent',
            transition: 'all 0.15s',
        }}>
            {label}
        </button>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// ChatItem
// ─────────────────────────────────────────────────────────────────────────────
function ChatItem({ avatarLetter, avatarColor, title, subtitle, badge, badgeColor, unread, selected, onClick }) {
    return (
        <div onClick={onClick} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 20px', cursor: 'pointer',
            backgroundColor: selected ? '#F2EDE6' : 'transparent',
            borderBottom: '1px solid #F9F6F2', transition: 'background-color 0.15s',
        }}
            onMouseEnter={e => { if (!selected) e.currentTarget.style.backgroundColor = '#FAF7F4' }}
            onMouseLeave={e => { if (!selected) e.currentTarget.style.backgroundColor = 'transparent' }}
        >
            {/* 頭像（附未讀圓點） */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    backgroundColor: avatarColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: '#FFFFFF', fontWeight: 700,
                }}>
                    {avatarLetter}
                </div>
                {unread > 0 && (
                    <span style={{
                        position: 'absolute', top: -2, right: -2,
                        minWidth: 16, height: 16, borderRadius: 8,
                        backgroundColor: '#E07A5F', color: '#FFFFFF',
                        fontSize: 9, fontWeight: 700, lineHeight: '16px',
                        textAlign: 'center', fontFamily: 'Noto Sans TC, sans-serif',
                        border: '1.5px solid #FFFFFF', paddingBottom: 1,
                    }}>
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 13, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif',
                    fontWeight: unread > 0 ? 700 : 600,  // 未讀時加粗
                }}>
                    {title}
                </div>
                <div style={{
                    fontSize: 11, fontFamily: 'Noto Sans TC, sans-serif',
                    color: unread > 0 ? '#1C1A18' : '#8C8479',  // 未讀時深色
                    fontWeight: unread > 0 ? 500 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {subtitle}
                </div>
            </div>

            {badge && (
                <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                    backgroundColor: badgeColor, color: '#FFFFFF', flexShrink: 0,
                    fontFamily: 'Noto Sans TC, sans-serif',
                }}>
                    {badge}
                </span>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// ZoneGroupHeader（展開/縮合）
// ─────────────────────────────────────────────────────────────────────────────
function ZoneGroupHeader({ zone, isExpanded, onToggle }) {
    const isFull = zone.collectorCount >= zone.totalSlots
    return (
        <button onClick={onToggle} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px 8px 20px', backgroundColor: '#F8F4EE',
            border: 'none', borderBottom: isExpanded ? 'none' : '1px solid #F0EBE3',
            cursor: 'pointer', textAlign: 'left', transition: 'background-color 0.15s',
        }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F2EDE6'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F8F4EE'}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 11, fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600, color: '#8C8479',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {zone.zoneTitle}
                </div>
                <div style={{
                    fontSize: 10, marginTop: 2, fontFamily: 'Noto Sans TC, sans-serif',
                    color: isFull ? '#C0392B' : '#B0A89A', fontWeight: isFull ? 600 : 400,
                }}>
                    收藏家 {zone.collectorCount}/{zone.totalSlots}{isFull ? '  ·  已額滿' : ''}
                </div>
            </div>
            <div style={{ color: '#B0A89A', flexShrink: 0 }}>
                {isExpanded ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
            </div>
        </button>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Chat Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Chat() {
    const VIEWER_ROLE = 'seller' // 目前登入者角色（實際應從 auth 取得）

    const isMobile = useIsMobile()
    const [mobileView, setMobileView] = useState('list') // 'list' | 'chat'

    const [sidebarTab, setSidebarTab] = useState('zone')
    const [selectedId, setSelectedId] = useState('zc2') // 預選 zc2（已付款範例）
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState(INITIAL_MESSAGES)
    const [zoneChats, setZoneChats] = useState(INITIAL_ZONE_CHATS)
    const [expandedZones, setExpandedZones] = useState(() => new Set(INITIAL_ZONE_CHATS.map(z => z.zoneId)))

    // Dialog/Modal 狀態
    const [confirmCollector, setConfirmCollector] = useState(null)  // { chatId, zoneId, peerName }
    const [confirmTx, setConfirmTx] = useState(null)                // { chatId, zoneId, action, label, desc }
    const [reviewTarget, setReviewTarget] = useState(null)          // { chatId, peerName }
    const [closedZone, setClosedZone] = useState(null)

    const bottomRef = useRef(null)

    // ── Derived ──────────────────────────────────────────────────────────────
    function findZoneChat(id) {
        for (const z of zoneChats) {
            const c = z.chats.find(c => c.id === id)
            if (c) return { chat: c, zone: z }
        }
        return null
    }

    const currentMsgs = messages[selectedId] || []
    const zoneChatMeta = findZoneChat(selectedId)
    const dmChatMeta = MOCK_DM_CHATS.find(d => d.id === selectedId)
    const activeChatMeta = zoneChatMeta?.chat || dmChatMeta
    const peerColor = activeChatMeta?.avatarColor || '#C4A882'

    const isZoneChat = !!zoneChatMeta
    const canSetCollector = isZoneChat && zoneChatMeta.chat.status === '對話中'
    const hasTransaction = isZoneChat && !!zoneChatMeta.chat.tx

    // ── 傳送訊息 ─────────────────────────────────────────────────────────────
    const handleSend = () => {
        const text = input.trim()
        if (!text) return
        const newMsg = { id: Date.now().toString(), from: 'me', text, time: nowTime() }
        setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), newMsg] }))
        setInput('')
    }

    const selectTab = (tab) => {
        setSidebarTab(tab)
        setSelectedId(tab === 'zone' ? 'zc1' : 'dm1')
        if (isMobile) setMobileView('list')
    }

    const toggleZone = (zoneId) => {
        setExpandedZones(prev => {
            const next = new Set(prev)
            next.has(zoneId) ? next.delete(zoneId) : next.add(zoneId)
            return next
        })
    }

    // ── 設為收藏家 ───────────────────────────────────────────────────────────
    const confirmSetCollector = () => {
        if (!confirmCollector) return
        const { chatId, zoneId, peerName } = confirmCollector
        setConfirmCollector(null)

        let zoneClosed = false, closedTitle = ''
        setZoneChats(prev => prev.map(z => {
            if (z.zoneId !== zoneId) return z
            const newCount = z.collectorCount + 1
            if (newCount >= z.totalSlots) { zoneClosed = true; closedTitle = z.zoneTitle }
            return {
                ...z, collectorCount: newCount,
                chats: z.chats.map(c => c.id === chatId
                    ? {
                        ...c, status: '收藏家', statusColor: '#4CAF50', role: '收藏家',
                        tx: { status: 'pending_payment', updatedAt: Date.now(), buyerReviewed: false, sellerReviewed: false },
                    }
                    : c
                ),
            }
        }))

        addSysMsg(chatId, `✅ ${peerName} 已被設為收藏家`)
        addSysMsg(chatId, '💳 交易已建立，等待買家付款')

        if (zoneClosed) setTimeout(() => setClosedZone(closedTitle), 300)
    }

    // ── 交易狀態操作 ──────────────────────────────────────────────────────────
    const handleTxAction = (action) => {
        if (!zoneChatMeta) return
        const chatId = selectedId
        const zoneId = zoneChatMeta.zone.zoneId

        if (action === 'review' || action === 'force_review') {
            setReviewTarget({ chatId, peerName: zoneChatMeta.chat.peer })
            return
        }

        const TX_CONFIRM = {
            'pending_payment→paid': {
                label: '確認已付款',
                desc: '請確認你已完成付款。此操作無法撤銷，賣家將收到通知開始準備寄出商品。',
                color: '#1C1A18',
            },
            'paid→shipped': {
                label: '確認已寄出',
                desc: '請確認商品已交給物流，買家將收到通知準備收貨。',
                color: '#1C1A18',
            },
            'shipped→completed': {
                label: '確認收貨',
                desc: '確認商品已收到且無問題。確認後將觸發評價流程。',
                color: '#2D7A4A',
            },
        }
        const cfg = TX_CONFIRM[action]
        if (cfg) setConfirmTx({ chatId, zoneId, action, ...cfg })
    }

    const executeTxAction = () => {
        if (!confirmTx) return
        const { chatId, zoneId, action } = confirmTx
        setConfirmTx(null)

        const nextStatus = action.split('→')[1]
        const sysTexts = {
            paid: '💳 買家已確認付款，請準備寄出商品',
            shipped: '📦 賣家已寄出商品，請注意查收',
            completed: '🎉 交易完成！感謝你的參與',
        }

        setZoneChats(prev => prev.map(z => ({
            ...z,
            chats: z.chats.map(c => c.id === chatId
                ? { ...c, tx: { ...c.tx, status: nextStatus, updatedAt: Date.now() } }
                : c
            ),
        })))

        addSysMsg(chatId, sysTexts[nextStatus])

        // 完成後直接彈評價
        if (nextStatus === 'completed') {
            setTimeout(() => {
                setReviewTarget({ chatId, peerName: zoneChatMeta?.chat.peer || '' })
            }, 600)
        }
    }

    // ── 提交評價 ─────────────────────────────────────────────────────────────
    const submitReview = (score, comment) => {
        if (!reviewTarget) return
        const { chatId } = reviewTarget
        setReviewTarget(null)

        const stars = '★'.repeat(score) + '☆'.repeat(5 - score)
        addSysMsg(chatId, `${stars} 評價已送出（${score} 顆星）`)

        setZoneChats(prev => prev.map(z => ({
            ...z,
            chats: z.chats.map(c => c.id === chatId
                ? {
                    ...c, tx: {
                        ...c.tx,
                        sellerReviewed: VIEWER_ROLE === 'seller' ? true : c.tx?.sellerReviewed,
                        buyerReviewed: VIEWER_ROLE === 'buyer' ? true : c.tx?.buyerReviewed,
                    }
                }
                : c
            ),
        })))
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function addSysMsg(chatId, text) {
        setMessages(prev => ({
            ...prev,
            [chatId]: [...(prev[chatId] || []), { id: Date.now() + Math.random() + '', from: 'system', text, time: nowTime() }],
        }))
    }

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [currentMsgs])

    useEffect(() => {
        if (!closedZone) return
        const t = setTimeout(() => setClosedZone(null), 4000)
        return () => clearTimeout(t)
    }, [closedZone])

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ height: 'calc(100vh - 60px)', display: 'flex', backgroundColor: '#F2EDE6' }}>

            {/* ═══ SIDEBAR ═══ */}
            <div style={{
                width: isMobile ? '100%' : 300, flexShrink: 0, backgroundColor: '#FFFFFF',
                display: (isMobile && mobileView === 'chat') ? 'none' : 'flex',
                flexDirection: 'column', overflow: 'hidden',
                borderRight: '1px solid #F0EBE3',
            }}>
                <div style={{ padding: '16px 20px 0', borderBottom: '1px solid #F0EBE3' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1C1A18', margin: '0 0 12px', fontFamily: 'Noto Sans TC, sans-serif' }}>
                        對話
                    </h2>
                    <div style={{ display: 'flex' }}>
                        <SidebarTab label="私藏對話" active={sidebarTab === 'zone'} onClick={() => selectTab('zone')} />
                        <SidebarTab label="私訊" active={sidebarTab === 'dm'} onClick={() => selectTab('dm')} />
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {sidebarTab === 'zone' && zoneChats.map(zone => (
                        <div key={zone.zoneId}>
                            <ZoneGroupHeader
                                zone={zone}
                                isExpanded={expandedZones.has(zone.zoneId)}
                                onToggle={() => toggleZone(zone.zoneId)}
                            />
                            {expandedZones.has(zone.zoneId) && zone.chats.map(c => (
                                <ChatItem
                                    key={c.id}
                                    avatarLetter={c.peer[0].toUpperCase()}
                                    avatarColor={c.avatarColor}
                                    title={c.peer}
                                    subtitle={c.lastMsg}
                                    badge={c.tx ? (TX_STEPS[TX_STEP_INDEX[c.tx.status]]?.label || c.status) : c.status}
                                    badgeColor={c.tx
                                        ? (c.tx.status === 'completed' ? '#4CAF50' : '#C4A882')
                                        : c.statusColor}
                                    unread={c.unread || 0}
                                    selected={selectedId === c.id}
                                    onClick={() => {
                                        setSelectedId(c.id)
                                        // 清零未讀
                                        setZoneChats(prev => prev.map(z => ({
                                            ...z,
                                            chats: z.chats.map(ch => ch.id === c.id ? { ...ch, unread: 0 } : ch)
                                        })))
                                        if (isMobile) setMobileView('chat')
                                    }}
                                />
                            ))}
                        </div>
                    ))}

                    {sidebarTab === 'dm' && MOCK_DM_CHATS.map(d => (
                        <ChatItem
                            key={d.id}
                            avatarLetter={d.peer[0].toUpperCase()}
                            avatarColor={d.avatarColor}
                            title={d.peer} subtitle={d.lastMsg}
                            badge={d.time} badgeColor="#D4CCC4"
                            unread={d.unread || 0}
                            selected={selectedId === d.id}
                            onClick={() => {
                                setSelectedId(d.id)
                                d.unread = 0  // mock 直接清零
                                if (isMobile) setMobileView('chat')
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* ═══ CHAT MAIN ═══ */}
            {activeChatMeta && (
                <div style={{
                    flex: 1, display: (isMobile && mobileView === 'list') ? 'none' : 'flex',
                    flexDirection: 'column', minWidth: 0
                }}>

                    {/* Header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14,
                        backgroundColor: '#FFFFFF', padding: isMobile ? '12px 16px' : '14px 24px',
                        borderBottom: '1px solid #F0EBE3',
                    }}>
                        {/* 手機版返回按鈕 */}
                        {isMobile && (
                            <button onClick={() => setMobileView('list')} style={{
                                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                                color: '#1C1A18', display: 'flex', alignItems: 'center', flexShrink: 0,
                            }}>
                                <ArrowLeft size={20} strokeWidth={1.5} />
                            </button>
                        )}
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                            backgroundColor: peerColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, color: '#FFFFFF', fontWeight: 700,
                        }}>
                            {activeChatMeta.peer[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>
                                {activeChatMeta.peer}
                            </div>
                            <div style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>
                                {zoneChatMeta
                                    ? `${zoneChatMeta.zone.zoneTitle} · ${zoneChatMeta.chat.role}`
                                    : '私訊'}
                            </div>
                        </div>

                        {/* 收藏家 badge (若有交易則用 tx status) */}
                        {zoneChatMeta && !hasTransaction && (
                            <span style={{
                                fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 16,
                                backgroundColor: zoneChatMeta.chat.statusColor, color: '#FFFFFF',
                                fontFamily: 'Noto Sans TC, sans-serif',
                            }}>
                                {zoneChatMeta.chat.status}
                            </span>
                        )}

                        {/* 設為收藏家 */}
                        {canSetCollector && (
                            <button onClick={() => setConfirmCollector({
                                chatId: selectedId,
                                zoneId: zoneChatMeta.zone.zoneId,
                                peerName: zoneChatMeta.chat.peer,
                            })} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '8px 16px', borderRadius: 8, border: 'none',
                                backgroundColor: '#1C1A18', color: '#F2EDE6',
                                fontSize: 12, fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600,
                                cursor: 'pointer', flexShrink: 0,
                            }}>
                                <UserCheck size={14} strokeWidth={1.8} />
                                設為收藏家
                            </button>
                        )}
                    </div>

                    {/* Info Bar */}
                    {isZoneChat && !hasTransaction && (
                        <div style={{
                            padding: '9px 24px', backgroundColor: '#FFF8F0',
                            fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            borderBottom: '1px solid #F0EBE3',
                        }}>
                            <span>
                                {zoneChatMeta.chat.status === '收藏家'
                                    ? '🎉 此帳號已成為收藏家'
                                    : 'ℹ️ 對話確認後，可將買家設為收藏家以完成交易'}
                            </span>
                            <span style={{ fontWeight: 600, color: '#C4A882' }}>
                                收藏家 {zoneChatMeta.zone.collectorCount}/{zoneChatMeta.zone.totalSlots}
                            </span>
                        </div>
                    )}

                    {/* TransactionBar（成為收藏家後顯示） */}
                    {hasTransaction && (
                        <TransactionBar
                            tx={zoneChatMeta.chat.tx}
                            peerName={zoneChatMeta.chat.peer}
                            viewerRole={VIEWER_ROLE}
                            onAction={handleTxAction}
                        />
                    )}

                    {/* Messages */}
                    <div style={{
                        flex: 1, overflowY: 'auto', padding: 24,
                        display: 'flex', flexDirection: 'column', gap: 16,
                    }}>
                        {currentMsgs.map(msg => (
                            <Bubble key={msg.id} msg={msg} peerColor={peerColor} />
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input Bar */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        backgroundColor: '#FFFFFF', padding: '14px 24px',
                        borderTop: '1px solid #F0EBE3',
                    }}>
                        <div style={{
                            flex: 1, height: 40, borderRadius: 20, backgroundColor: '#F2EDE6',
                            display: 'flex', alignItems: 'center', padding: '0 16px',
                        }}>
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                placeholder="輸入訊息..."
                                style={{
                                    flex: 1, border: 'none', outline: 'none',
                                    backgroundColor: 'transparent',
                                    fontSize: 13, color: '#1C1A18',
                                    fontFamily: 'Noto Sans TC, sans-serif',
                                }}
                            />
                        </div>
                        <button onClick={handleSend} style={{
                            padding: '8px 16px', borderRadius: 20, border: 'none',
                            backgroundColor: input.trim() ? '#1C1A18' : '#D4CCC4',
                            color: '#F2EDE6', cursor: input.trim() ? 'pointer' : 'not-allowed',
                            fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 6, transition: 'background-color 0.15s',
                        }}>
                            <Send size={14} strokeWidth={1.5} />送出
                        </button>
                    </div>
                </div>
            )}
            {!activeChatMeta && !isMobile && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14 }}>
                    選擇一個對話
                </div>
            )}

            {/* ── Dialogs ─────────────────────────────────────────────── */}

            {/* 設為收藏家確認 */}
            {confirmCollector && (
                <ConfirmDialog
                    icon={<div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#F0F9F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserCheck size={18} color="#2D7A4A" strokeWidth={1.8} /></div>}
                    title="設為收藏家？"
                    desc={`確認將 <strong>${confirmCollector.peerName}</strong> 設為本私藏的收藏家。<br/>若收藏名額已滿，該私藏將自動結束。`}
                    confirmLabel="確認設定"
                    confirmColor="#2D7A4A"
                    onConfirm={confirmSetCollector}
                    onCancel={() => setConfirmCollector(null)}
                />
            )}

            {/* 交易操作確認 */}
            {confirmTx && (
                <ConfirmDialog
                    title={confirmTx.label}
                    desc={confirmTx.desc}
                    confirmLabel={confirmTx.label}
                    confirmColor={confirmTx.color}
                    onConfirm={executeTxAction}
                    onCancel={() => setConfirmTx(null)}
                />
            )}

            {/* 評價 Modal */}
            {reviewTarget && (
                <ReviewModal
                    peerName={reviewTarget.peerName}
                    onSubmit={submitReview}
                    onSkip={() => setReviewTarget(null)}
                />
            )}

            {/* 私藏結束 Banner */}
            {closedZone && <ZoneClosedBanner zoneTitle={closedZone} />}
        </div>
    )
}
