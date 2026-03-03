import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, ChevronDown, ChevronUp, UserCheck, Star, Package, CreditCard, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'
import { chatApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

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
// 資料正規化工具
// ─────────────────────────────────────────────────────────────────────────────

function msgTime(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
}

/** 後端 ChatMessage → UI Bubble msg */
function normalizeMsg(m, myUserID) {
    return {
        id: m.id,
        from: m.sender_id === myUserID ? 'me' : (m.type === 'system' ? 'system' : 'peer'),
        text: m.content,
        time: msgTime(m.created_at),
    }
}

/** 後端 Chat（DM）→ sidebar list item */
function normalizeDMChat(chat, myUserID) {
    const peer = (chat.participants || []).find(p => p.user_id !== myUserID)
    const peerProfile = peer?.profile
    return {
        id: chat.id,
        peer: peerProfile?.username || peerProfile?.display_name || '對方',
        avatarUrl: peerProfile?.avatar_url || null,
        avatarColor: '#C4A882',
        lastMsg: '',
        time: '',
        unread: chat.unread_count ?? 0,
    }
}

/** 後端 Chat（Zone）→ zone group 結構 */
function normalizeZoneChats(chats, myUserID) {
    const zoneMap = {}
    for (const chat of chats) {
        const zoneId = chat.zone_id || 'unknown'
        const zoneTitle = chat.zone_title || '私藏'
        const peer = (chat.participants || []).find(p => p.user_id !== myUserID)
        const peerProfile = peer?.profile
        if (!zoneMap[zoneId]) {
            zoneMap[zoneId] = {
                zoneId,
                zoneTitle,
                totalSlots: chat.zone_total_slots ?? 0,
                collectorCount: chat.zone_collector_count ?? 0,
                chats: [],
            }
        }
        zoneMap[zoneId].chats.push({
            id: chat.id,
            peer: peerProfile?.username || peerProfile?.display_name || '對方',
            avatarUrl: peerProfile?.avatar_url || null,
            avatarColor: '#8C8479',
            lastMsg: '',
            status: '對話中',
            statusColor: '#C4A882',
            role: '買家',
            tx: null,
            unread: chat.unread_count ?? 0,
        })
    }
    return Object.values(zoneMap)
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Chat Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Chat() {
    const { currentUser } = useAuth()
    const myUserID = currentUser?.user_id || ''
    const VIEWER_ROLE = 'seller' // TODO: 從 Zone chat 的參與者角色動態判斷

    const isMobile = useIsMobile()
    const navigate = useNavigate()
    const [mobileView, setMobileView] = useState('list') // 'list' | 'chat'

    const [sidebarTab, setSidebarTab] = useState('zone')
    const [selectedId, setSelectedId] = useState(null)
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState({})      // chatId -> msg[]
    const [loadingMsgs, setLoadingMsgs] = useState(false)
    const [zoneChats, setZoneChats] = useState([])    // 後端資料後正規化
    const [dmChats, setDmChats] = useState([])        // 後端資料後正規化
    const [loadingList, setLoadingList] = useState(false)
    const [expandedZones, setExpandedZones] = useState(new Set())

    // Dialog/Modal 狀態
    const [confirmCollector, setConfirmCollector] = useState(null)
    const [confirmTx, setConfirmTx] = useState(null)
    const [reviewTarget, setReviewTarget] = useState(null)
    const [closedZone, setClosedZone] = useState(null)

    const bottomRef = useRef(null)

    // ── 載入 Zone / DM 列表 ───────────────────────────────────────────────────
    const loadList = useCallback(async () => {
        setLoadingList(true)
        try {
            if (sidebarTab === 'zone') {
                const res = await chatApi.getZoneChats()
                const raw = res.data.data || []
                const normalized = normalizeZoneChats(raw, myUserID)
                setZoneChats(normalized)
                setExpandedZones(new Set(normalized.map(z => z.zoneId)))
                if (!selectedId && normalized.length > 0 && normalized[0].chats.length > 0) {
                    setSelectedId(normalized[0].chats[0].id)
                }
            } else {
                const res = await chatApi.getDmChats()
                const raw = res.data.data || []
                const normalized = raw.map(c => normalizeDMChat(c, myUserID))
                setDmChats(normalized)
                if (!selectedId && normalized.length > 0) {
                    setSelectedId(normalized[0].id)
                }
            }
        } catch (e) {
            console.error('載入聊天列表失敗', e)
        } finally {
            setLoadingList(false)
        }
    }, [sidebarTab, myUserID, selectedId])

    useEffect(() => {
        if (myUserID) loadList()
    }, [sidebarTab, myUserID]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── 切換聊天室：載入訊息 + 標記已讀 ─────────────────────────────────────
    const loadMessages = useCallback(async (chatId) => {
        if (!chatId) return
        setLoadingMsgs(true)
        try {
            const res = await chatApi.getMessages(chatId)
            const raw = res.data.data || []
            setMessages(prev => ({ ...prev, [chatId]: raw.map(m => normalizeMsg(m, myUserID)) }))
            chatApi.markRead(chatId).catch(() => { })
        } catch (e) {
            console.error('載入訊息失敗', e)
        } finally {
            setLoadingMsgs(false)
        }
    }, [myUserID])

    useEffect(() => {
        if (selectedId) loadMessages(selectedId)
    }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps


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
    const dmChatMeta = dmChats.find(d => d.id === selectedId)
    const activeChatMeta = zoneChatMeta?.chat || dmChatMeta
    const peerColor = activeChatMeta?.avatarColor || '#C4A882'

    const isZoneChat = !!zoneChatMeta
    const canSetCollector = isZoneChat && zoneChatMeta.chat.status === '對話中'
    const hasTransaction = isZoneChat && !!zoneChatMeta.chat.tx

    // ── 傳送訊息（API） ────────────────────────────────────────────────────────
    const handleSend = async () => {
        const text = input.trim()
        if (!text || !selectedId) return
        // 樂觀更新
        const optimisticMsg = { id: `tmp-${Date.now()}`, from: 'me', text, time: nowTime() }
        setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), optimisticMsg] }))
        setInput('')
        try {
            await chatApi.sendMessage(selectedId, text)
        } catch (e) {
            console.error('送出訊息失敗', e)
        }
    }

    const selectTab = (tab) => {
        setSidebarTab(tab)
        setSelectedId(null)
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

    const executeTxAction = async () => {
        if (!confirmTx) return
        const { chatId, action } = confirmTx
        setConfirmTx(null)

        const nextStatus = action.split('→')[1]
        const sysTexts = {
            paid: '💳 買家已確認付款，請準備寄出商品',
            shipped: '📦 賣家已寄出商品，請注意查收',
            completed: '🎉 交易完成！感謝你的參與',
        }

        try {
            await chatApi.updateTransaction(chatId, nextStatus)
            // 樂觀更新本地 zone chat tx 狀態
            setZoneChats(prev => prev.map(z => ({
                ...z,
                chats: z.chats.map(c => c.id === chatId
                    ? { ...c, tx: { ...c.tx, status: nextStatus, updatedAt: Date.now() } }
                    : c
                ),
            })))
            addSysMsg(chatId, sysTexts[nextStatus])
            if (nextStatus === 'completed') {
                setTimeout(() => {
                    setReviewTarget({ chatId, peerName: findZoneChat(chatId)?.chat.peer || '' })
                }, 600)
            }
        } catch (e) {
            console.error('交易更新失敗', e)
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

                    {sidebarTab === 'dm' && dmChats.length === 0 && !loadingList && (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 13 }}>
                            還沒有私訊
                        </div>
                    )}

                    {sidebarTab === 'dm' && dmChats.map(d => (
                        <ChatItem
                            key={d.id}
                            avatarLetter={(d.peer || '?')[0].toUpperCase()}
                            avatarColor={d.avatarColor}
                            title={d.peer} subtitle={d.lastMsg || ''}
                            badge={d.time || ''} badgeColor="#D4CCC4"
                            unread={d.unread || 0}
                            selected={selectedId === d.id}
                            onClick={() => {
                                setSelectedId(d.id)
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
                            <div
                                onClick={() => navigate(`/profile/${activeChatMeta.peer}`)}
                                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                                style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif', cursor: 'pointer', display: 'inline-block' }}
                            >
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
