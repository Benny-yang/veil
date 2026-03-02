import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, Users, CheckCircle, XCircle, MessageCircle } from 'lucide-react'

// ── Mock Data ─────────────────────────────────────────────────────────────────
const ZONE_META = {
    title: '春季限定｜復古洋裝私藏',
    applied: 3,
    slots: 5,
    timeLeft: '剩餘 2 天',
}

const MOCK_APPLICANTS = [
    {
        id: 'ap1',
        name: 'velvet_noir',
        avatarColor: '#E8DDD0',
        intro: '我對復古風格很有熱情，一直在尋找有質感的賣家🙇 希望有機會認識你！',
        appliedAt: '2 小時前',
        creditScore: 92,
        status: 'pending',
    },
    {
        id: 'ap2',
        name: 'retro_rose',
        avatarColor: '#C4A882',
        intro: '平時很喜歡日本帶回的古著，對品質非常在意，期待這次合作！',
        appliedAt: '5 小時前',
        creditScore: 87,
        status: 'pending',
    },
    {
        id: 'ap3',
        name: 'lux_finder',
        avatarColor: '#8C8479',
        intro: '有多年二手市場經驗，能清楚描述商品狀態，交易安心。',
        appliedAt: '1 天前',
        creditScore: 95,
        status: 'approved',
    },
]

// ── Credit Score Bar ────────────────────────────────────────────────────────
function CreditBar({ score }) {
    const color = score >= 90 ? '#4CAF50' : score >= 75 ? '#C4A882' : '#E07A5F'
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 80, height: 4, backgroundColor: '#E8DDD0', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${score}%`, height: '100%', backgroundColor: color, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 12, color, fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600 }}>
                {score}
            </span>
        </div>
    )
}

// ── Applicant Card ─────────────────────────────────────────────────────────
function ApplicantCard({ applicant, onApprove, onReject }) {
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
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                    onClick={() => navigate(`/profile/${applicant.name}`)}
                    style={{
                        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                        backgroundColor: applicant.avatarColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, color: '#FFFFFF', fontWeight: 700,
                        cursor: 'pointer',
                    }}
                >
                    {applicant.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                    <div
                        onClick={() => navigate(`/profile/${applicant.name}`)}
                        onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                        style={{
                            fontSize: 14, fontWeight: 600, color: '#1C1A18',
                            fontFamily: 'Noto Sans TC, sans-serif',
                            cursor: 'pointer', display: 'inline-block',
                        }}
                    >{applicant.name}</div>
                    <div style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', marginTop: 2 }}>
                        申請於 {applicant.appliedAt}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>信用評分</span>
                    <CreditBar score={applicant.creditScore} />
                </div>
            </div>

            {/* Intro */}
            <div style={{
                fontSize: 13, color: '#3A3531', fontFamily: 'Noto Sans TC, sans-serif',
                lineHeight: 1.7, backgroundColor: '#FAFAF9', borderRadius: 8,
                padding: '10px 14px',
            }}>
                {applicant.intro}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                {isDone ? (
                    <span style={{
                        fontSize: 12, fontFamily: 'Noto Sans TC, sans-serif',
                        color: isApproved ? '#4CAF50' : '#8C8479',
                        display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                        {isApproved ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {isApproved ? '已通過審核' : '已拒絕'}
                    </span>
                ) : (
                    <>
                        <button onClick={() => onReject(applicant.id)} style={{
                            padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
                            border: '1px solid #E8DDD0', backgroundColor: '#FFFFFF',
                            fontSize: 12, fontFamily: 'Noto Sans TC, sans-serif', color: '#8C8479',
                            display: 'flex', alignItems: 'center', gap: 5,
                            transition: 'background-color 0.15s',
                        }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F5F1EC'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                        >
                            <XCircle size={13} strokeWidth={1.5} />
                            拒絕
                        </button>
                        <button onClick={() => onApprove(applicant.id)} style={{
                            padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
                            border: 'none', backgroundColor: '#C4A882',
                            fontSize: 12, fontFamily: 'Noto Sans TC, sans-serif',
                            fontWeight: 600, color: '#FFFFFF',
                            display: 'flex', alignItems: 'center', gap: 5,
                            transition: 'background-color 0.15s',
                        }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#B89970'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C4A882'}
                        >
                            <CheckCircle size={13} strokeWidth={1.5} />
                            通過 → 開啟對話
                        </button>
                    </>
                )}
                {isApproved && (
                    <button style={{
                        padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
                        border: 'none', backgroundColor: '#1C1A18',
                        fontSize: 12, fontFamily: 'Noto Sans TC, sans-serif',
                        fontWeight: 600, color: '#F2EDE6',
                        display: 'flex', alignItems: 'center', gap: 5,
                        transition: 'background-color 0.15s',
                    }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2D2926'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1C1A18'}
                    >
                        <MessageCircle size={13} strokeWidth={1.5} />
                        進入對話
                    </button>
                )}
            </div>
        </div>
    )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ReviewApplications() {
    const navigate = useNavigate()
    const [applicants, setApplicants] = useState(MOCK_APPLICANTS)

    const pending = applicants.filter(a => a.status === 'pending').length
    const approved = applicants.filter(a => a.status === 'approved').length

    const handleApprove = (id) => {
        setApplicants(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a))
    }
    const handleReject = (id) => {
        setApplicants(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a))
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F5F1EC' }}>
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 40px' }}>

                {/* Back */}
                <button onClick={() => navigate('/collection')} style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28,
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif',
                }}>
                    <ArrowLeft size={14} strokeWidth={1.5} />
                    返回我的私藏
                </button>

                {/* Zone Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                        <h1 style={{
                            fontSize: 22, fontWeight: 700, color: '#1C1A18', margin: '0 0 6px',
                            fontFamily: 'Noto Sans TC, sans-serif'
                        }}>{ZONE_META.title}</h1>
                        <div style={{ display: 'flex', gap: 20 }}>
                            <span style={{
                                fontSize: 12, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif',
                                display: 'flex', alignItems: 'center', gap: 4
                            }}>
                                <Clock size={11} strokeWidth={1.5} />{ZONE_META.timeLeft}
                            </span>
                            <span style={{
                                fontSize: 12, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif',
                                display: 'flex', alignItems: 'center', gap: 4
                            }}>
                                <Users size={11} strokeWidth={1.5} />
                                {ZONE_META.applied}/{ZONE_META.slots} 已申請
                            </span>
                        </div>
                    </div>
                    {/* Summary Pills */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{
                            fontSize: 12, padding: '5px 14px', borderRadius: 20,
                            backgroundColor: '#E07A5F20', color: '#E07A5F',
                            fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600
                        }}>
                            待審核 {pending}
                        </span>
                        <span style={{
                            fontSize: 12, padding: '5px 14px', borderRadius: 20,
                            backgroundColor: '#4CAF5020', color: '#4CAF50',
                            fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600
                        }}>
                            已通過 {approved}
                        </span>
                    </div>
                </div>

                <div style={{ height: 1, backgroundColor: '#E8DDD0', margin: '20px 0 24px' }} />

                {/* Applicant list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {applicants.map(ap => (
                        <ApplicantCard key={ap.id} applicant={ap}
                            onApprove={handleApprove} onReject={handleReject} />
                    ))}
                </div>
            </div>
        </div>
    )
}
