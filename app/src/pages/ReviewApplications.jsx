import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, Users, CheckCircle, XCircle, MessageCircle } from 'lucide-react'
import { zoneApi } from '../services/api'

const font = 'Noto Sans TC, sans-serif'

// ── 信用分數條 ────────────────────────────────────────────────────────────────
function CreditBar({ score }) {
    const color = score >= 90 ? '#4CAF50' : score >= 75 ? '#C4A882' : '#E07A5F'
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 80, height: 4, backgroundColor: '#E8DDD0', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(score, 100)}%`, height: '100%', backgroundColor: color, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 12, color, fontFamily: font, fontWeight: 600 }}>{score}</span>
        </div>
    )
}

// ── 申請人卡片 ────────────────────────────────────────────────────────────────
function ApplicantCard({ applicant, onApprove, onReject, loading }) {
    const isApproved = applicant.status === 'approved'
    const isRejected = applicant.status === 'rejected'
    const isDone = isApproved || isRejected
    const navigate = useNavigate()

    return (
        <div style={{
            backgroundColor: '#FFFFFF', borderRadius: 12,
            padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
            boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
            borderLeft: isApproved ? '3px solid #4CAF50' : isRejected ? '3px solid #D4CCC4' : '3px solid #C4A882',
            opacity: isRejected ? 0.65 : 1,
        }}>
            {/* 申請人 Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                    onClick={() => navigate(`/profile/${applicant.name}`)}
                    style={{
                        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                        backgroundColor: applicant.avatarColor, overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, color: '#FFFFFF', fontWeight: 700, cursor: 'pointer',
                    }}
                >
                    {applicant.avatar
                        ? <img src={applicant.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (applicant.name?.[0] || '?').toUpperCase()
                    }
                </div>
                <div style={{ flex: 1 }}>
                    <div
                        onClick={() => navigate(`/profile/${applicant.name}`)}
                        onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                        style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', fontFamily: font, cursor: 'pointer', display: 'inline-block' }}
                    >{applicant.name}</div>
                    <div style={{ fontSize: 11, color: '#8C8479', fontFamily: font, marginTop: 2 }}>
                        申請於 {applicant.appliedAt}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 11, color: '#8C8479', fontFamily: font }}>信用評分</span>
                    <CreditBar score={applicant.creditScore} />
                </div>
            </div>

            {/* 自我介紹 */}
            <div style={{
                fontSize: 13, color: '#3A3531', fontFamily: font,
                lineHeight: 1.7, backgroundColor: '#FAFAF9', borderRadius: 8, padding: '10px 14px',
            }}>
                {applicant.intro}
            </div>

            {/* 操作按鈕 */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                {isDone ? (
                    <span style={{ fontSize: 12, fontFamily: font, color: isApproved ? '#4CAF50' : '#8C8479', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isApproved ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {isApproved ? '已通過審核' : '已拒絕'}
                    </span>
                ) : (
                    <>
                        <button onClick={() => onReject(applicant.id)} disabled={loading} style={{ padding: '8px 18px', borderRadius: 8, cursor: 'pointer', border: '1px solid #E8DDD0', backgroundColor: '#FFFFFF', fontSize: 12, fontFamily: font, color: '#8C8479', display: 'flex', alignItems: 'center', gap: 5, transition: 'background-color 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F5F1EC'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                        >
                            <XCircle size={13} strokeWidth={1.5} />拒絕
                        </button>
                        <button onClick={() => onApprove(applicant.id)} disabled={loading} style={{ padding: '8px 18px', borderRadius: 8, cursor: 'pointer', border: 'none', backgroundColor: '#C4A882', fontSize: 12, fontFamily: font, fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 5, transition: 'background-color 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#B89970'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C4A882'}
                        >
                            <CheckCircle size={13} strokeWidth={1.5} />通過 → 開啟對話
                        </button>
                    </>
                )}
                {isApproved && (
                    <button onClick={() => navigate('/chat')} style={{ padding: '8px 18px', borderRadius: 8, cursor: 'pointer', border: 'none', backgroundColor: '#1C1A18', fontSize: 12, fontFamily: font, fontWeight: 600, color: '#F2EDE6', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <MessageCircle size={13} strokeWidth={1.5} />進入對話
                    </button>
                )}
            </div>
        </div>
    )
}

// ── 後端資料正規化 ────────────────────────────────────────────────────────────
function normalizeApp(a) {
    return {
        id: a.id,
        name: a.applicant?.username || a.user?.username || '',
        avatar: a.applicant?.avatar_url || a.user?.avatar_url || null,
        avatarColor: a.applicant?.avatar_color || '#C4A882',
        intro: a.message || a.intro || '',
        appliedAt: a.created_at
            ? new Date(a.created_at).toLocaleDateString('zh-TW') : '',
        creditScore: a.applicant?.credit_score ?? a.credit_score ?? 50,
        status: a.status || 'pending',
    }
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ReviewApplications() {
    const { zoneId } = useParams()
    const navigate = useNavigate()
    const [zoneMeta, setZoneMeta] = useState(null)
    const [applicants, setApplicants] = useState([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        if (!zoneId) return
        setLoading(true)
        setError('')
        try {
            const [zoneRes, appsRes] = await Promise.all([
                zoneApi.getZone(zoneId),
                zoneApi.getApplications(zoneId),
            ])
            const z = zoneRes.data.data || zoneRes.data
            setZoneMeta({
                title: z.title || '私藏',
                applied: z.filled_slots ?? 0,
                slots: z.total_slots ?? 0,
                timeLeft: z.ends_at ? `${Math.ceil((new Date(z.ends_at) - new Date()) / 86400000)} 天後截止` : '無期限',
            })
            const apps = appsRes.data.data || []
            setApplicants(apps.map(normalizeApp))
        } catch (err) {
            setError(err.response?.data?.error?.message || '載入失敗，請稍後再試')
        } finally {
            setLoading(false)
        }
    }, [zoneId])

    useEffect(() => { load() }, [load])

    const handleApprove = async (appId) => {
        setActionLoading(true)
        try {
            await zoneApi.reviewApplication(zoneId, appId, 'approve')
            setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status: 'approved' } : a))
        } catch { /* 失敗不改變本地狀態 */ }
        finally { setActionLoading(false) }
    }

    const handleReject = async (appId) => {
        setActionLoading(true)
        try {
            await zoneApi.reviewApplication(zoneId, appId, 'reject')
            setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status: 'rejected' } : a))
        } catch { /* 失敗不改變本地狀態 */ }
        finally { setActionLoading(false) }
    }

    const pending = applicants.filter(a => a.status === 'pending').length
    const approved = applicants.filter(a => a.status === 'approved').length

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#F5F1EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 14, color: '#8C8479', fontFamily: font }}>載入中⋯</span>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F5F1EC' }}>
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 40px' }}>
                <button onClick={() => navigate('/collection')} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8C8479', fontFamily: font }}>
                    <ArrowLeft size={14} strokeWidth={1.5} />返回我的私藏
                </button>

                {error ? (
                    <div style={{ fontSize: 14, color: '#E07A5F', fontFamily: font }}>{error}</div>
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div>
                                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1A18', margin: '0 0 6px', fontFamily: font }}>
                                    {zoneMeta?.title}
                                </h1>
                                <div style={{ display: 'flex', gap: 20 }}>
                                    <span style={{ fontSize: 12, color: '#8C8479', fontFamily: font, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Clock size={11} strokeWidth={1.5} />{zoneMeta?.timeLeft}
                                    </span>
                                    <span style={{ fontSize: 12, color: '#8C8479', fontFamily: font, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Users size={11} strokeWidth={1.5} />{zoneMeta?.applied}/{zoneMeta?.slots} 名額
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <span style={{ fontSize: 12, padding: '5px 14px', borderRadius: 20, backgroundColor: '#E07A5F20', color: '#E07A5F', fontFamily: font, fontWeight: 600 }}>待審核 {pending}</span>
                                <span style={{ fontSize: 12, padding: '5px 14px', borderRadius: 20, backgroundColor: '#4CAF5020', color: '#4CAF50', fontFamily: font, fontWeight: 600 }}>已通過 {approved}</span>
                            </div>
                        </div>

                        <div style={{ height: 1, backgroundColor: '#E8DDD0', margin: '20px 0 24px' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {applicants.length === 0 ? (
                                <div style={{ padding: '40px 0', textAlign: 'center', color: '#B0A89A', fontFamily: font, fontSize: 14 }}>目前沒有申請</div>
                            ) : (
                                applicants.map(ap => (
                                    <ApplicantCard key={ap.id} applicant={ap}
                                        onApprove={handleApprove} onReject={handleReject} loading={actionLoading} />
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
