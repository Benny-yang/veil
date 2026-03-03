import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Clock, Users, MessageCircle, Edit2, ClipboardList, CheckCircle, XCircle, HelpCircle } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'
import { zoneApi, mediaApi } from '../services/api'


// ── Application Status Badge ──────────────────────────────────────────────────
function AppStatusBadge({ status }) {
    const MAP = {
        '審核中': { bg: '#E8DDD0', text: '#8C8479', Icon: HelpCircle },
        '已通過': { bg: '#D4EDDA', text: '#2D7A4A', Icon: CheckCircle },
        '未通過': { bg: '#FCE8E4', text: '#C0392B', Icon: XCircle },
    }
    const { bg, text, Icon } = MAP[status] || MAP['審核中']
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600,
            backgroundColor: bg, color: text,
            padding: '4px 10px', borderRadius: 4,
        }}>
            <Icon size={11} strokeWidth={2} />
            {status}
        </span>
    )
}

// ── Zone Status Badge ─────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const colors = {
        '進行中': { bg: '#C4A882', text: '#FFFFFF' },
        '已結束': { bg: '#D4CCC4', text: '#FFFFFF' },
    }
    const c = colors[status] || colors['進行中']
    return (
        <span style={{
            fontSize: 11, fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600,
            backgroundColor: c.bg, color: c.text,
            padding: '4px 10px', borderRadius: 4,
            display: 'inline-block',
        }}>
            {status}
        </span>
    )
}

// ── Zone Row (我開的) ─────────────────────────────────────────────────────────
function ZoneRow({ zone, tabKey, onReview, onChat, onEdit }) {
    const isEnded = tabKey === 'ended'
    const isMobile = useIsMobile()

    const actions = (
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            {!isEnded && (
                <button style={btnStyle('#FFFFFF', '#1C1A18', '#E8DDD0')}
                    onClick={onReview}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F5F1EC'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                    <ClipboardList size={13} strokeWidth={1.5} />審核申請
                </button>
            )}
            <button style={btnStyle('#FFFFFF', '#8C8479', '#E8DDD0')}
                onClick={onEdit}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F5F1EC'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
            >
                <Edit2 size={13} strokeWidth={1.5} />編輯
            </button>
            {!isEnded && (
                <button style={btnStyle('#C4A882', '#FFFFFF', 'none', true)}
                    onClick={onChat}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#B89970'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C4A882'}
                >
                    <MessageCircle size={13} strokeWidth={1.5} />對話
                </button>
            )}
        </div>
    )

    return (
        <div style={{
            backgroundColor: '#FFFFFF', borderRadius: 12,
            padding: isMobile ? 14 : 20,
            boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
            display: 'flex', flexDirection: 'column', gap: 12,
        }}>
            {/* 圖片 + 資訊（橫排） */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 20 }}>
                {/* Thumbnail */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                        width: isMobile ? 64 : 80, height: isMobile ? 64 : 80,
                        borderRadius: 8, overflow: 'hidden',
                        opacity: isEnded ? 0.6 : 1,
                    }}>
                        <img src={zone.image} alt={zone.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    {zone.pendingCount > 0 && (
                        <span style={{
                            position: 'absolute', top: -6, right: -6,
                            backgroundColor: '#E07A5F', color: '#FFFFFF',
                            fontSize: 10, fontWeight: 700,
                            fontFamily: 'Noto Sans TC, sans-serif',
                            padding: '2px 7px', borderRadius: 10,
                            whiteSpace: 'nowrap', lineHeight: 1.6,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                        }}>
                            {zone.pendingCount} 待審核
                        </span>
                    )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    <div style={{
                        fontSize: isMobile ? 14 : 15, fontWeight: 600,
                        color: isEnded ? '#8C8479' : '#1C1A18',
                        fontFamily: 'Noto Sans TC, sans-serif',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                        {zone.title}
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{
                            fontSize: 12, fontFamily: 'Noto Sans TC, sans-serif',
                            color: zone.timeUrgent ? '#C4A882' : '#8C8479',
                            display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                            <Clock size={11} strokeWidth={1.5} />
                            {zone.timeLeft}
                        </span>
                        <span style={{
                            fontSize: 12, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif',
                            display: 'flex', alignItems: 'center', gap: 4
                        }}>
                            <Users size={11} strokeWidth={1.5} />
                            {zone.applied} 已申請
                        </span>
                    </div>
                    <div style={{ alignSelf: 'flex-start' }}>
                        <StatusBadge status={zone.status} />
                    </div>
                </div>

                {/* 桌面版：actions 在同一行最右側 */}
                {!isMobile && actions}
            </div>

            {/* 手機版：actions 在卡片下方 */}
            {isMobile && actions}
        </div>
    )
}

// ── Application Row (我申請的) ────────────────────────────────────────────────
function ApplicationRow({ app, onCancel }) {
    const isPassed = app.appStatus === '已通過'
    const isPending = app.appStatus === '審核中'
    const isMobile = useIsMobile()

    const actions = (
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
            {isPassed && (
                <button style={{ ...btnStyle('#C4A882', '#FFFFFF', 'none', true), ...(isMobile ? { flex: 1, justifyContent: 'center' } : {}) }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#B89970'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C4A882'}
                >
                    <MessageCircle size={13} strokeWidth={1.5} />進入對話
                </button>
            )}
            {isPending && (
                <button onClick={onCancel} style={{ ...btnStyle('#FFFFFF', '#8C8479', '#E8DDD0'), ...(isMobile ? { flex: 1, justifyContent: 'center' } : {}) }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F5F1EC'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                    撤回申請
                </button>
            )}
            {!isPassed && (
                <button style={{ ...btnStyle('#FFFFFF', '#1C1A18', '#E8DDD0'), ...(isMobile ? { flex: 1, justifyContent: 'center' } : {}) }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F5F1EC'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                    查看私藏
                </button>
            )}
        </div>
    )

    return (
        <div style={{
            backgroundColor: '#FFFFFF', borderRadius: 12,
            padding: isMobile ? 14 : 20,
            boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
            borderLeft: isPassed ? '3px solid #2D7A4A' : isPending ? '3px solid #C4A882' : '3px solid #D4CCC4',
            display: 'flex', flexDirection: 'column', gap: 12,
        }}>
            {/* 圖片 + 資訊（橫排） */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 20 }}>
                {/* Thumbnail */}
                <div style={{
                    width: isMobile ? 64 : 80, height: isMobile ? 64 : 80,
                    borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                    opacity: app.appStatus === '未通過' ? 0.5 : 1,
                }}>
                    <img src={app.zoneImage} alt={app.zoneTitle}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    <div style={{
                        fontSize: isMobile ? 13 : 15, fontWeight: 600, color: '#1C1A18',
                        fontFamily: 'Noto Sans TC, sans-serif',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                        {app.zoneTitle}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <div style={{
                            width: 16, height: 16, borderRadius: '50%',
                            backgroundColor: app.sellerAvatarColor, flexShrink: 0
                        }} />
                        <span style={{ fontSize: 12, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>
                            {app.seller}
                        </span>
                        <span style={{ color: '#D4CCC4', fontSize: 12 }}>·</span>
                        <span style={{
                            fontSize: 12, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif',
                            display: 'flex', alignItems: 'center', gap: 3
                        }}>
                            <Clock size={10} strokeWidth={1.5} />
                            {app.timeLeft}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <AppStatusBadge status={app.appStatus} />
                        <span style={{ fontSize: 11, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif' }}>
                            申請於 {app.appliedAt}
                        </span>
                    </div>
                </div>

                {/* 桌面版：按鈕在右側 */}
                {!isMobile && actions}
            </div>

            {/* 手機版：按鈕在卡片底部 */}
            {isMobile && actions}
        </div>
    )
}

// ── Shared button style helper ────────────────────────────────────────────────
function btnStyle(bg, color, borderColor, filled = false) {
    return {
        padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
        border: filled ? 'none' : `1px solid ${borderColor}`,
        backgroundColor: bg, color,
        fontSize: 12, fontFamily: 'Noto Sans TC, sans-serif',
        fontWeight: filled ? 600 : 400,
        display: 'flex', alignItems: 'center', gap: 6,
        transition: 'background-color 0.15s',
    }
}

// ── Photo Upload Component ──────────────────────────────────────────────────────────────────
function PhotoUpload({ photos, coverId, onPhotosChange, onCoverChange }) {
    const inputRef = React.useRef()
    const photosRef = React.useRef(photos)   // always up-to-date
    const [hovered, setHovered] = React.useState(null)

    React.useEffect(() => { photosRef.current = photos }, [photos])

    const handleFiles = (e) => {
        const files = Array.from(e.target.files)
        const current = photosRef.current
        const remaining = 5 - current.length
        if (remaining <= 0) return
        const toAdd = files.slice(0, remaining)
        let pending = toAdd.length
        const accumulated = []

        toAdd.forEach(file => {
            const reader = new FileReader()
            reader.onload = ev => {
                // 同時保留 file 物件供上傳用
                accumulated.push({ id: Date.now() + Math.random(), url: ev.target.result, file })
                pending--
                if (pending === 0) {
                    const updated = [...photosRef.current, ...accumulated]
                    onPhotosChange(updated)
                    if (!coverId) onCoverChange(updated[0].id)
                }
            }
            reader.readAsDataURL(file)
        })
        e.target.value = ''
    }

    const removePhoto = (id, e) => {
        e.stopPropagation()
        const updated = photos.filter(p => p.id !== id)
        onPhotosChange(updated)
        if (coverId === id) onCoverChange(updated[0]?.id || '')
    }

    const tileStyle = {
        width: 100, height: 100, borderRadius: 8, overflow: 'hidden',
        position: 'relative', flexShrink: 0, cursor: 'pointer',
    }

    return (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {photos.map(photo => (
                <div key={photo.id} style={tileStyle}
                    onClick={() => onCoverChange(photo.id)}
                    onMouseEnter={() => setHovered(photo.id)}
                    onMouseLeave={() => setHovered(null)}
                >
                    <img src={photo.url} alt="" style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        outline: photo.id === coverId ? '2.5px solid #C4A882' : 'none',
                        outlineOffset: -2,
                    }} />
                    {/* Cover badge */}
                    {photo.id === coverId && (
                        <div style={{
                            position: 'absolute', bottom: 4, left: 4,
                            backgroundColor: '#C4A882', color: '#FFFFFF',
                            fontSize: 10, fontWeight: 600, padding: '2px 6px',
                            borderRadius: 4, fontFamily: 'Noto Sans TC, sans-serif',
                        }}>封面</div>
                    )}
                    {/* Remove button */}
                    {hovered === photo.id && (
                        <button onClick={e => removePhoto(photo.id, e)} style={{
                            position: 'absolute', top: 4, right: 4,
                            width: 20, height: 20, borderRadius: '50%',
                            backgroundColor: 'rgba(28,26,24,0.7)', color: '#FFFFFF',
                            border: 'none', cursor: 'pointer', fontSize: 12, lineHeight: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>×</button>
                    )}
                </div>
            ))}

            {/* Add tile */}
            {photos.length < 5 && (
                <div onClick={() => inputRef.current.click()} style={{
                    ...tileStyle,
                    backgroundColor: '#F8F4EE', border: '1.5px dashed #D4CCC4',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 4,
                }}>
                    <span style={{ fontSize: 20, color: '#B0A89A', lineHeight: 1 }}>+</span>
                    <span style={{ fontSize: 10, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif' }}>
                        {photos.length}/5
                    </span>
                </div>
            )}

            <input ref={inputRef} type="file" multiple accept="image/*"
                style={{ display: 'none' }} onChange={handleFiles} />
        </div>
    )
}

// ── Shared Zone Form Fields ────────────────────────────────────────────────────
// inputStyle shared helper
const zoneInputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box',
    border: '1.5px solid #E8DDD0', fontSize: 13,
    fontFamily: 'Noto Sans TC, sans-serif', color: '#1C1A18',
    outline: 'none', backgroundColor: '#F8F4EE',
    transition: 'border-color 0.2s',
}

function FieldLabel({ children, required }) {
    return (
        <div style={{
            fontSize: 14, fontWeight: 500, color: '#1C1A18',
            fontFamily: 'Noto Sans TC, sans-serif', marginBottom: 8
        }}>
            {children}{required && <span style={{ color: '#C4A882' }}> *</span>}
        </div>
    )
}

function ZoneFormFields({ values, onChange }) {
    const { title, desc, startDate, endDate, slots, creditMin, requireIntro } = values
    const focus = e => e.target.style.borderColor = '#C4A882'
    const blur = e => e.target.style.borderColor = '#E8DDD0'

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* 私藏標題 */}
            <div>
                <FieldLabel required>私藏標題</FieldLabel>
                <input value={title} onChange={e => onChange('title', e.target.value)}
                    placeholder="例：春季限定｜復古洋裝私藏"
                    style={zoneInputStyle} onFocus={focus} onBlur={blur} />
            </div>

            {/* 私藏描述 */}
            <div>
                <FieldLabel required>私藏描述</FieldLabel>
                <textarea value={desc} onChange={e => onChange('desc', e.target.value)}
                    placeholder="描述你的私藏內容，讓申請者了解你想出售的商品…"
                    rows={3} style={{ ...zoneInputStyle, resize: 'none' }}
                    onFocus={focus} onBlur={blur} />
            </div>

            {/* 私藏照片 */}
            <div>
                <FieldLabel>私藏照片</FieldLabel>
                <div style={{ fontSize: 11, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', marginBottom: 8 }}>
                    最多 5 張・點擊照片設為封面
                </div>
                <PhotoUpload
                    photos={values.photos || []}
                    coverId={values.coverId || ''}
                    onPhotosChange={newPhotos => onChange('photos', newPhotos)}
                    onCoverChange={id => onChange('coverId', id)}
                />
            </div>

            <div style={{ height: 1, backgroundColor: '#E8DDD0' }} />

            {/* 私藏時效 */}
            <div>
                <FieldLabel required>私藏時效</FieldLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input type="date" value={startDate} onChange={e => onChange('startDate', e.target.value)}
                        style={{ ...zoneInputStyle, flex: 1 }} onFocus={focus} onBlur={blur} />
                    <span style={{
                        fontSize: 13, color: '#8C8479', flexShrink: 0,
                        fontFamily: 'Noto Sans TC, sans-serif'
                    }}>至</span>
                    <input type="date" value={endDate} onChange={e => onChange('endDate', e.target.value)}
                        style={{ ...zoneInputStyle, flex: 1 }} onFocus={focus} onBlur={blur} />
                </div>
            </div>

            {/* 購買名額 */}
            <div>
                <FieldLabel required>購買名額</FieldLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="number" min="1" max="20" value={slots}
                        onChange={e => onChange('slots', e.target.value)}
                        style={{ ...zoneInputStyle, width: 100 }}
                        onFocus={focus} onBlur={blur} />
                    <span style={{ fontSize: 13, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>人</span>
                </div>
                <div style={{ fontSize: 11, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', marginTop: 4 }}>
                    達購買名額時私藏將自動關閉
                </div>
            </div>

            <div style={{ height: 1, backgroundColor: '#E8DDD0' }} />

            {/* 申請門檻 */}
            <div>
                <FieldLabel>申請門檻</FieldLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', width: 80 }}>
                            信用分數下限
                        </span>
                        <input type="number" min="0" max="100" value={creditMin}
                            onChange={e => onChange('creditMin', e.target.value)}
                            style={{ ...zoneInputStyle, width: 80 }}
                            onFocus={focus} onBlur={blur} />
                        <span style={{ fontSize: 13, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>
                            分以上
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 13, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', flex: 1 }}>
                            需填寫自我介紹
                        </span>
                        {/* Toggle */}
                        <div onClick={() => onChange('requireIntro', !requireIntro)} style={{
                            width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                            backgroundColor: requireIntro ? '#C4A882' : '#D4CCC4',
                            position: 'relative', transition: 'background-color 0.2s', flexShrink: 0,
                        }}>
                            <div style={{
                                position: 'absolute', top: 2,
                                left: requireIntro ? 22 : 2,
                                width: 20, height: 20, borderRadius: '50%',
                                backgroundColor: '#FFFFFF',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                transition: 'left 0.2s',
                            }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Edit Zone Modal ────────────────────────────────────────────────────────────
function EditZoneModal({ zone, onClose, onUpdated }) {
    const [values, setValues] = useState({
        title: zone.title, desc: zone.raw?.description || '', startDate: zone.raw?.starts_at ? new Date(zone.raw.starts_at).toISOString().split('T')[0] : '', endDate: zone.raw?.ends_at ? new Date(zone.raw.ends_at).toISOString().split('T')[0] : '',
        slots: String(zone.raw?.total_slots || 5), creditMin: String(zone.raw?.min_credit_score || 0), requireIntro: zone.raw?.require_intro || true,
        photos: (zone.raw?.photos || []).map(p => ({ id: p.id, url: p.url })),
        coverId: (zone.raw?.photos || []).find(p => p.is_cover)?.id || (zone.raw?.photos?.[0]?.id || ''),
    })
    const onChange = (k, v) => setValues(prev => ({ ...prev, [k]: v }))
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const handleSave = async () => {
        if (!values.title.trim()) return
        setSaving(true)
        try {
            // 新照片（有 file 物件）先上傳取得後端 URL；既有後端 URL 的直接保留
            const photoInputs = []
            for (const p of values.photos) {
                if (p.file) {
                    const res = await mediaApi.upload(p.file)
                    const url = res.data.data?.url || res.data.url
                    if (url) photoInputs.push({ url, is_cover: p.id === values.coverId })
                } else if (p.url && !p.url.startsWith('data:')) {
                    photoInputs.push({ id: p.id, url: p.url, is_cover: p.id === values.coverId })
                }
            }

            await zoneApi.updateZone(zone.id, {
                title: values.title,
                description: values.desc,
                starts_at: values.startDate ? new Date(values.startDate).toISOString() : null,
                ends_at: values.endDate ? new Date(values.endDate).toISOString() : null,
                total_slots: parseInt(values.slots || '1', 10),
                min_credit_score: parseInt(values.creditMin || '0', 10),
                require_intro: values.requireIntro,
                photos: photoInputs,
            })
            onUpdated?.()
            onClose()
        } catch { /* 保持 Modal 開啟 */ } finally { setSaving(false) }
    }

    const handleDelete = async () => {
        if (!window.confirm('確定要關閉此私藏？確定後申請者將無法再申請。')) return
        setDeleting(true)
        try {
            await zoneApi.deleteZone(zone.id)
            onUpdated?.()
            onClose()
        } catch { /* 保持 Modal 開啟 */ } finally { setDeleting(false) }
    }

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            backgroundColor: 'rgba(28,26,24,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)', overflowY: 'auto', padding: '40px 0',
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                width: 560, backgroundColor: '#FFFFFF', borderRadius: 16,
                padding: 36, display: 'flex', flexDirection: 'column', gap: 24,
                boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
                maxHeight: '90vh', overflowY: 'auto',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{
                        fontSize: 20, fontWeight: 600, color: '#1C1A18', margin: 0,
                        fontFamily: 'Noto Sans TC, sans-serif'
                    }}>編輯私藏</h2>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 20, color: '#8C8479', lineHeight: 1,
                    }}>×</button>
                </div>

                <ZoneFormFields values={values} onChange={onChange} />

                {/* Status (read-only) */}
                <div style={{
                    backgroundColor: '#F8F4EE', borderRadius: 8, padding: '10px 14px',
                    fontSize: 12, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif',
                    display: 'flex', justifyContent: 'space-between',
                }}>
                    <span>目前狀態</span>
                    <span style={{ fontWeight: 600, color: '#C4A882' }}>{zone.status}</span>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={onClose} style={{
                        flex: 1, padding: '13px 0', borderRadius: 8,
                        border: '1px solid #E8DDD0', backgroundColor: '#FFFFFF',
                        fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif', color: '#8C8479', cursor: 'pointer',
                    }}>取消</button>
                    <button onClick={handleSave} disabled={saving || !values.title.trim()} style={{
                        flex: 1, padding: '13px 0', borderRadius: 8, border: 'none',
                        backgroundColor: (values.title.trim() && !saving) ? '#1C1A18' : '#D4CCC4',
                        fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif',
                        fontWeight: 600, color: '#F2EDE6',
                        cursor: (values.title.trim() && !saving) ? 'pointer' : 'not-allowed',
                    }}>{saving ? '儲存中⋯' : '儲存變更'}</button>
                </div>

                {/* 關閉私藏 danger zone */}
                <div style={{ borderTop: '1px solid #F0EBE3', paddingTop: 14 }}>
                    <button onClick={handleDelete} disabled={deleting} style={{
                        width: '100%', padding: '12px 0', borderRadius: 8,
                        border: '1px solid #EDCFCF', backgroundColor: '#FDF6F6',
                        fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif',
                        color: deleting ? '#B0A89A' : '#C0392B', cursor: deleting ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.15s',
                    }}
                        onMouseEnter={e => { if (!deleting) e.currentTarget.style.backgroundColor = '#FAE8E8' }}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FDF6F6'}
                    >
                        {deleting ? '關閉中⋯' : '關閉私藏'}
                    </button>
                    <div style={{
                        fontSize: 11, color: '#B0A89A', textAlign: 'center',
                        fontFamily: 'Noto Sans TC, sans-serif', marginTop: 6,
                    }}>
                        關閉後申請者將無法再繼續申請，已通過的對話不受影響
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── New Zone Modal ─────────────────────────────────────────────────────────────
function NewZoneModal({ onClose, onCreated }) {
    const [values, setValues] = useState({
        title: '', desc: '', startDate: '', endDate: '',
        slots: '3', creditMin: '0', requireIntro: true, photos: [], coverId: '',
    })
    const onChange = (k, v) => setValues(prev => ({ ...prev, [k]: v }))
    const [saving, setSaving] = useState(false)

    const handleCreate = async () => {
        if (!values.title.trim()) return
        setSaving(true)
        try {
            // 1. 上傳新照片（有 file 物件的），已有後端 URL 的則保留
            const uploadedPhotos = []
            for (const p of values.photos) {
                if (p.file) {
                    // 新上傳的本地檔案
                    const res = await mediaApi.upload(p.file)
                    const url = res.data.data?.url || res.data.url
                    if (url) uploadedPhotos.push({ url, is_cover: p.id === values.coverId })
                } else if (p.url && !p.url.startsWith('data:')) {
                    // 已經是後端 URL（編輯時）
                    uploadedPhotos.push({ url: p.url, is_cover: p.id === values.coverId })
                }
            }

            await zoneApi.createZone({
                title: values.title,
                description: values.desc,
                ends_at: values.endDate ? new Date(values.endDate).toISOString() : null,
                total_slots: parseInt(values.slots || '1', 10),
                min_credit_score: parseInt(values.creditMin || '0', 10),
                photos: uploadedPhotos,
            })
            onCreated?.()
            onClose()
        } catch { /* 保持 Modal 開啟 */ } finally { setSaving(false) }
    }

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            backgroundColor: 'rgba(28,26,24,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)', overflowY: 'auto', padding: '40px 0',
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                width: 560, backgroundColor: '#FFFFFF', borderRadius: 16,
                padding: 36, display: 'flex', flexDirection: 'column', gap: 24,
                boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
                maxHeight: '90vh', overflowY: 'auto',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{
                        fontSize: 20, fontWeight: 600, color: '#1C1A18', margin: 0,
                        fontFamily: 'Noto Sans TC, sans-serif'
                    }}>開設新私藏</h2>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 20, color: '#8C8479', lineHeight: 1,
                    }}>×</button>
                </div>

                <ZoneFormFields values={values} onChange={onChange} />

                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={onClose} style={{
                        flex: 1, padding: '13px 0', borderRadius: 8,
                        border: '1px solid #E8DDD0', backgroundColor: '#FFFFFF',
                        fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif', color: '#8C8479', cursor: 'pointer',
                    }}>取消</button>
                    <button onClick={handleCreate} disabled={saving || !values.title.trim()} style={{
                        flex: 1, padding: '13px 0', borderRadius: 8, border: 'none',
                        backgroundColor: (values.title.trim() && !saving) ? '#1C1A18' : '#D4CCC4',
                        fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif',
                        fontWeight: 600, color: '#F2EDE6',
                        cursor: (values.title.trim() && !saving) ? 'pointer' : 'not-allowed',
                    }}>{saving ? '開設中⋯' : '開設私藏'}</button>
                </div>
                <div style={{
                    fontSize: 11, color: '#B0A89A', textAlign: 'center',
                    fontFamily: 'Noto Sans TC, sans-serif'
                }}>
                    開設後可隨時在管理頁面編輯或提前關閉
                </div>
            </div>
        </div>
    )
}

// ── 後端資料正規化 ─────────────────────────────────────────────────────────────
function normalizeZone(z) {
    const coverPhoto = (z.photos || []).find(p => p.is_cover) || (z.photos || [])[0]
    const endsAt = z.ends_at ? new Date(z.ends_at) : null
    const now = new Date()
    const isEnded = z.status === 'ended' || (endsAt && endsAt < now)
    let timeLeft = '已結束'
    if (!isEnded && endsAt) {
        const diffMs = endsAt - now
        const diffDays = Math.ceil(diffMs / 86400000)
        timeLeft = diffDays <= 1 ? '剩餘 1 天' : `剩餘 ${diffDays} 天`
    } else if (!isEnded) { timeLeft = '進行中' }
    return {
        id: z.id,
        title: z.title,
        image: coverPhoto?.url || '',
        timeLeft,
        timeUrgent: !isEnded && endsAt && (endsAt - now) < 86400000 * 2,
        applied: `${z.accepted_count ?? 0}/${z.total_slots ?? 0}`,
        pendingCount: z.pending_count ?? 0,
        status: isEnded ? '已結束' : '進行中',
        raw: z,
    }
}

function normalizeApp(a) {
    const zone = a.zone || {}
    const coverPhoto = (zone.photos || []).find(p => p.is_cover) || (zone.photos || [])[0]
    const endsAt = zone.ends_at ? new Date(zone.ends_at) : null
    const now = new Date()
    const STATUS_MAP = { pending: '審核中', approved: '已通過', rejected: '未通過' }
    const diffMs = endsAt ? endsAt - now : 0
    const diffDays = Math.ceil(diffMs / 86400000)
    const timeLeft = !endsAt ? '—' : diffMs < 0 ? '已結束' : diffDays <= 1 ? '剩餘 1 天' : `剩餘 ${diffDays} 天`
    // 時間正規化
    const appliedDate = new Date(a.applied_at)
    const diffApply = Date.now() - appliedDate.getTime()
    const applyDays = Math.floor(diffApply / 86400000)
    const appliedAt = applyDays === 0 ? '今天' : applyDays === 1 ? '1 天前' : `${applyDays} 天前`
    return {
        id: a.id,
        zoneId: a.zone_id,
        zoneTitle: zone.title || '私藏',
        zoneImage: coverPhoto?.url || '',
        seller: zone.seller?.username || '',
        sellerAvatarColor: '#C4A882',
        appliedAt,
        timeLeft,
        timeUrgent: endsAt && diffMs > 0 && diffMs < 86400000 * 2,
        appStatus: STATUS_MAP[a.status] || '審核中',
        raw: a,
    }
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PrivateCollection() {
    const navigate = useNavigate()
    const [mainTab, setMainTab] = useState('mine')    // 'mine' | 'applied'
    const [activeTab, setActiveTab] = useState('active')   // 'active' | 'ended'
    const [showNewModal, setShowNewModal] = useState(false)
    const [editingZone, setEditingZone] = useState(null)

    // 後端資料
    const [myZones, setMyZones] = useState([])       // normalizeZone[]
    const [myApps, setMyApps] = useState([])          // normalizeApp[]
    const [loading, setLoading] = useState(true)

    const isMine = mainTab === 'mine'

    // 視準展示 list
    const zones = myZones.filter(z =>
        activeTab === 'active' ? z.status === '進行中' : z.status === '已結束'
    )
    const activeCount = myZones.filter(z => z.status === '進行中').length
    const endedCount = myZones.filter(z => z.status === '已結束').length
    const MINE_TAB_CONFIG = [
        { key: 'active', label: '進行中', count: activeCount },
        { key: 'ended', label: '已結束', count: endedCount },
    ]

    const MAIN_TABS = [
        { key: 'mine', label: '我開的' },
        { key: 'applied', label: '我申請的' },
    ]

    // 載入資料
    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [zonesRes, appsRes] = await Promise.all([
                zoneApi.getMyZones(),
                zoneApi.getMyApplications(),
            ])
            setMyZones((zonesRes.data.data || []).map(normalizeZone))
            setMyApps((appsRes.data.data || []).map(normalizeApp))
        } catch { /* 保持空狀態 */ }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const isMobile = useIsMobile()

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F5F1EC' }}>
            <div style={{ padding: isMobile ? '20px 16px' : '40px 80px', display: 'flex', flexDirection: 'column', gap: 28 }}>

                {/* Header Row */}
                <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    justifyContent: 'space-between', gap: isMobile ? 12 : 20
                }}>
                    <h1 style={{
                        fontSize: 24, fontWeight: 600, color: '#1C1A18', margin: 0,
                        fontFamily: 'Noto Sans TC, sans-serif'
                    }}>
                        我的私藏
                    </h1>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        {/* New Zone Button */}
                        {isMine && (
                            <button onClick={() => setShowNewModal(true)} style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '10px 20px', borderRadius: 8, border: 'none',
                                backgroundColor: '#1C1A18', color: '#F2EDE6',
                                fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600,
                                cursor: 'pointer', transition: 'background-color 0.15s',
                            }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2D2926'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1C1A18'}
                            >
                                <Plus size={16} strokeWidth={2} />
                                開設新私藏
                            </button>
                        )}

                        {/* Main Tab Toggle */}
                        <div style={{ display: 'flex', border: '1px solid #E8DDD0', borderRadius: 20, overflow: 'hidden' }}>
                            {MAIN_TABS.map(t => (
                                <button key={t.key} onClick={() => setMainTab(t.key)} style={{
                                    padding: '8px 20px', fontSize: 13,
                                    fontFamily: 'Noto Sans TC, sans-serif',
                                    fontWeight: mainTab === t.key ? 600 : 400,
                                    backgroundColor: mainTab === t.key ? '#1C1A18' : 'transparent',
                                    color: mainTab === t.key ? '#F2EDE6' : '#8C8479',
                                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                                }}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── 我開的：Sub Tabs */}
                {isMine && (
                    <div style={{ display: 'flex', borderBottom: '1px solid #E8DDD0' }}>
                        {MINE_TAB_CONFIG.map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                                padding: '10px 20px', fontSize: 13,
                                fontFamily: 'Noto Sans TC, sans-serif',
                                fontWeight: activeTab === tab.key ? 600 : 400,
                                color: activeTab === tab.key ? '#F2EDE6' : '#8C8479',
                                backgroundColor: activeTab === tab.key ? '#1C1A18' : '#FFFFFF',
                                border: 'none', borderRadius: '8px 8px 0 0',
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}>
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>
                )}

                {/* ── 我申請的：Filter pills */}
                {!isMine && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        {['全部', '審核中', '已通過', '未通過'].map((f, i) => (
                            <button key={f} style={{
                                padding: '6px 18px', borderRadius: 20, fontSize: 12,
                                fontFamily: 'Noto Sans TC, sans-serif',
                                fontWeight: i === 0 ? 600 : 400,
                                backgroundColor: i === 0 ? '#1C1A18' : '#FFFFFF',
                                color: i === 0 ? '#F2EDE6' : '#1C1A18',
                                border: i === 0 ? 'none' : '1px solid #E8DDD0',
                                cursor: 'pointer',
                            }}>{f}</button>
                        ))}
                    </div>
                )}

                {/* ── List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14 }}>
                            載入中⋯
                        </div>
                    ) : isMine
                        ? zones.map(zone => (
                            <ZoneRow key={zone.id} zone={zone} tabKey={activeTab}
                                onReview={() => navigate(`/review/${zone.id}`)}
                                onChat={() => navigate('/chat')}
                                onEdit={() => setEditingZone(zone)}
                            />
                        ))
                        : myApps.map(app => <ApplicationRow key={app.id} app={app} onCancel={async () => {
                            try { await zoneApi.cancelApply(app.zoneId); loadData() } catch { }
                        }} />)
                    }

                    {isMine && zones.length === 0 && (
                        <div style={{
                            textAlign: 'center', padding: '80px 0',
                            color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14
                        }}>
                            目前沒有相關私藏
                        </div>
                    )}
                </div>
            </div>

            {showNewModal && <NewZoneModal onClose={() => setShowNewModal(false)} onCreated={loadData} />}
            {editingZone && <EditZoneModal zone={editingZone} onClose={() => setEditingZone(null)} onUpdated={loadData} />}
        </div>
    )
}
