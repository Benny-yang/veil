import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Clock, Users, Star, ChevronLeft, ChevronRight, ArrowLeft, CheckCircle } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'
import { useAuth } from '../context/AuthContext'
import { zoneApi } from '../services/api'
import { normalizeZone, timeLeftText, isUrgent } from '../utils/normalizers'


// ── 申請送出成功 Modal ────────────────────────────────────────────────────────
function SubmittedModal({ onClose, onGoMessages }) {
    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                backgroundColor: 'rgba(28,26,24,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '90vw', maxWidth: 420, backgroundColor: '#FFFFFF',
                    borderRadius: 16, padding: '40px 36px',
                    display: 'flex', flexDirection: 'column', gap: 24,
                    boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <div style={{ position: 'relative', width: 56, height: 56 }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: '50%',
                            backgroundColor: '#C4A882', opacity: 0.15, position: 'absolute'
                        }} />
                        <CheckCircle size={28} color="#C4A882" strokeWidth={1.5}
                            style={{ position: 'absolute', top: 14, left: 14 }} />
                    </div>
                    <h2 style={{
                        fontSize: 22, fontWeight: 600, color: '#1C1A18',
                        fontFamily: 'Noto Sans TC, sans-serif', margin: 0
                    }}>
                        申請已送出 ✓
                    </h2>
                </div>
                <p style={{
                    fontSize: 14, color: '#8C8479', textAlign: 'center', lineHeight: 1.8,
                    fontFamily: 'Noto Sans TC, sans-serif', margin: 0
                }}>
                    你的申請已成功送出！<br />
                    賣家將會審核你的自我介紹，<br />
                    審核通過後即可開始對話。<br /><br />
                    注意：通過審核不代表成為買家，<br />
                    賣家會在對話中決定。
                </p>
                <div style={{ height: 1, backgroundColor: '#E8DDD0' }} />
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1, padding: '11px 0', borderRadius: 8, cursor: 'pointer',
                            border: '1px solid #E8DDD0', backgroundColor: '#FFFFFF',
                            fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif', color: '#8C8479',
                        }}
                    >
                        繼續探索
                    </button>
                    <button
                        onClick={onGoMessages}
                        style={{
                            flex: 1, padding: '11px 0', borderRadius: 8, cursor: 'pointer',
                            border: 'none', backgroundColor: '#1C1A18',
                            fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif',
                            fontWeight: 600, color: '#F2EDE6',
                        }}
                    >
                        前往我的申請
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Zone Detail Page ──────────────────────────────────────────────────────────
export default function ZoneDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [zone, setZone] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [imgIdx, setImgIdx] = useState(0)
    const [intro, setIntro] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [showModal, setShowModal] = useState(false)
    const { currentUser } = useAuth()
    const isMobile = useIsMobile()
    const [isOwner, setIsOwner] = useState(false)
    const [hasApplied, setHasApplied] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const res = await zoneApi.getZone(id)
            const raw = res.data.data || res.data
            setZone(normalizeZone(raw))

            if (currentUser?.id) {
                setIsOwner(raw.seller_id === currentUser.id)
                try {
                    const appsRes = await zoneApi.getMyApplications()
                    const myApps = appsRes.data.data || []
                    setHasApplied(myApps.some(a => a.zone_id === id))
                } catch { /* 未登入或 API 失敗不影響頁面顯示 */ }
            }
        } catch {
            setError('載入私藏失敗，請稍後再試')
        } finally {
            setLoading(false)
        }
    }, [id, currentUser])

    useEffect(() => { load() }, [load])

    const handleSubmit = async () => {
        if (!intro.trim() || submitting) return
        setSubmitting(true)
        setSubmitError('')
        try {
            await zoneApi.apply(id, { intro: intro.trim() })
            setSubmitted(true)
            setShowModal(true)
        } catch (err) {
            const errorCode = err.response?.data?.error?.code
            if (errorCode === 'MONTHLY_LIMIT_EXCEEDED') {
                setSubmitError(err.response?.data?.error?.message || '本月申請次數已達上限，請完成真人驗證以解除限制')
            } else {
                setSubmitError(err.response?.data?.error?.message || '申請失敗，請稍後再試')
            }
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#F5F1EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 14, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>載入中⋯</span>
            </div>
        )
    }

    if (error || !zone) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#F5F1EC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <span style={{ fontSize: 14, color: '#E07A5F', fontFamily: 'Noto Sans TC, sans-serif' }}>{error || '找不到此私藏'}</span>
                <Link to="/explore" style={{ fontSize: 13, color: '#C4A882', fontFamily: 'Noto Sans TC, sans-serif' }}>返回探索</Link>
            </div>
        )
    }

    const images = zone.images.length > 0 ? zone.images : [null]

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F5F1EC' }}>
            <div style={{
                display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 0 : 48,
                padding: isMobile ? 0 : '40px 80px',
                height: isMobile ? 'auto' : 'calc(100vh - 60px)',
                overflow: isMobile ? 'auto' : 'hidden',
                maxWidth: isMobile ? '100%' : 1100,
                margin: '0 auto',
            }}>
                {/* ── 左側：圖片 ─────────────────────────────────────────────── */}
                <div style={isMobile
                    ? { width: '100%', flexShrink: 0, position: 'relative', backgroundColor: '#F0EBE3', borderRadius: 0 }
                    : { width: 420, flexShrink: 0, position: 'relative', borderRadius: 12, overflow: 'hidden', backgroundColor: '#F0EBE3', alignSelf: 'flex-start' }
                }>
                    {images[imgIdx] ? (
                        <img src={images[imgIdx]} alt={zone.title} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} />
                    ) : (
                        <div style={{ width: '100%', aspectRatio: '3/4', backgroundColor: '#E8DDD0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B0A89A', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif' }}>無封面</div>
                    )}

                    {images.length > 1 && (
                        <>
                            <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.85)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronLeft size={18} strokeWidth={1.5} color="#1C1A18" />
                            </button>
                            <button onClick={() => setImgIdx(i => (i + 1) % images.length)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.85)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronRight size={18} strokeWidth={1.5} color="#1C1A18" />
                            </button>
                            <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
                                {images.map((_, i) => (
                                    <button key={i} onClick={() => setImgIdx(i)} style={{ width: i === imgIdx ? 20 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: i === imgIdx ? '#FFFFFF' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s', padding: 0 }} />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* ── 右側：資訊 ─────────────────────────────────────────────── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, overflowY: isMobile ? 'visible' : 'auto', padding: isMobile ? '20px 16px 100px' : '0 0 24px', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
                    <Link to="/explore" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8C8479', textDecoration: 'none', fontFamily: 'Noto Sans TC, sans-serif' }}>
                        <ArrowLeft size={13} strokeWidth={1.5} />返回探索
                    </Link>

                    <h1 style={{ fontSize: 26, fontWeight: 600, color: '#1C1A18', margin: 0, fontFamily: 'Noto Sans TC, sans-serif', lineHeight: 1.4 }}>
                        {zone.title}
                    </h1>

                    {/* 賣家資訊列 */}
                    <Link to={`/profile/${zone.seller.name}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                        {zone.seller.avatar ? (
                            <img src={zone.seller.avatar} alt={zone.seller.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                            <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: zone.seller.avatarColor, flexShrink: 0 }} />
                        )}
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {zone.seller.name}
                                {zone.seller.rating != null && (
                                    <span style={{ fontSize: 12, color: '#C4A882', fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 400, display: 'flex', alignItems: 'center', gap: 3 }}>
                                        <Star size={11} fill="#C4A882" strokeWidth={0} color="#C4A882" />
                                        {Number(zone.seller.rating).toFixed(1)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </Link>

                    <div style={{ height: 1, backgroundColor: '#E8DDD0' }} />

                    {/* Meta 數字 */}
                    <div style={{ display: 'flex', gap: 40 }}>
                        {zone.timeLeft && (
                            <div>
                                <div style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', marginBottom: 4 }}>截止時間</div>
                                <div style={{ fontSize: 14, color: zone.timeUrgent ? '#C4A882' : '#1C1A18', fontWeight: zone.timeUrgent ? 600 : 400, fontFamily: 'Noto Sans TC, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Clock size={13} strokeWidth={1.5} />{zone.timeLeft}
                                </div>
                            </div>
                        )}
                        <div>
                            <div style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', marginBottom: 4 }}>名額</div>
                            <div style={{ fontSize: 14, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Users size={13} strokeWidth={1.5} />{zone.slots}
                            </div>
                        </div>
                        {zone.threshold && (
                            <div>
                                <div style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', marginBottom: 4 }}>信用門檻</div>
                                <div style={{ fontSize: 14, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>≥ {zone.threshold}</div>
                            </div>
                        )}
                    </div>

                    {zone.description && (
                        <p style={{ fontSize: 14, color: '#3A3531', lineHeight: 1.8, margin: 0, fontFamily: 'Noto Sans TC, sans-serif' }}>
                            {zone.description}
                        </p>
                    )}

                    <div style={{ height: 1, backgroundColor: '#E8DDD0' }} />

                    {/* 申請表單 */}
                    {isOwner ? (
                        <div style={{
                            padding: '14px 16px', borderRadius: 8,
                            backgroundColor: '#FFFFFF', border: '1px solid #E8DDD0',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                        }}>
                            <div style={{ fontSize: 13, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>
                                這是你的私藏
                            </div>
                            <button
                                onClick={() => navigate(`/review/${id}`)}
                                style={{
                                    padding: '10px 24px', borderRadius: 8, border: 'none',
                                    backgroundColor: '#1C1A18', color: '#F2EDE6',
                                    fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif',
                                    fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                前往審核申請
                            </button>
                        </div>
                    ) : hasApplied || submitted ? (
                        <div style={{
                            padding: '14px 16px', borderRadius: 8,
                            backgroundColor: '#FFFFFF', border: '1px solid #E8DDD0',
                            display: 'flex', alignItems: 'center', gap: 10,
                            fontSize: 13, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif'
                        }}>
                            <CheckCircle size={16} color="#C4A882" strokeWidth={1.5} />
                            申請已送出，等待賣家審核中
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>申請進入此私藏</div>
                            <div style={{ fontSize: 12, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>請填寫自我介紹，讓賣家認識你</div>
                            <textarea
                                value={intro}
                                onChange={e => setIntro(e.target.value)}
                                placeholder="例：我是一個對日系復古風有濃厚興趣的買家，最近在尋找…"
                                rows={4}
                                style={{
                                    width: '100%', padding: '14px 16px',
                                    fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif',
                                    color: '#1C1A18', lineHeight: 1.7,
                                    border: '1.5px solid #E8DDD0', borderRadius: 8,
                                    resize: 'none', outline: 'none',
                                    backgroundColor: '#FFFFFF', boxSizing: 'border-box',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={e => e.target.style.borderColor = '#C4A882'}
                                onBlur={e => e.target.style.borderColor = '#E8DDD0'}
                            />
                            {submitError && (
                                <div style={{ fontSize: 12, color: '#E07A5F', fontFamily: 'Noto Sans TC, sans-serif' }}>{submitError}</div>
                            )}
                            <button
                                onClick={handleSubmit}
                                disabled={!intro.trim() || submitting}
                                style={{
                                    width: '100%', padding: '12px 0', borderRadius: 8, border: 'none',
                                    backgroundColor: (intro.trim() && !submitting) ? '#1C1A18' : '#D4CCC4',
                                    color: '#F2EDE6', fontSize: 14,
                                    fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600,
                                    cursor: (intro.trim() && !submitting) ? 'pointer' : 'not-allowed',
                                    transition: 'background-color 0.2s',
                                }}
                            >
                                {submitting ? '送出中⋯' : '送出申請'}
                            </button>
                        </div>
                    )}

                    <p style={{ fontSize: 11, color: '#8C8479', lineHeight: 1.7, margin: 0, fontFamily: 'Noto Sans TC, sans-serif' }}>
                        注意：通過審核不代表成為買家，賣家會在對話中決定。
                    </p>
                </div>
            </div>

            {showModal && (
                <SubmittedModal
                    onClose={() => { setShowModal(false); navigate('/explore') }}
                    onGoMessages={() => { setShowModal(false); navigate('/collection') }}
                />
            )}
        </div>
    )
}
