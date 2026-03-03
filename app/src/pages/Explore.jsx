import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Users, Star } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'
import { zoneApi } from '../services/api'

// 計算距離到期的描述文字
function timeLeftText(endsAt) {
    if (!endsAt) return null
    const diff = new Date(endsAt) - new Date()
    if (diff <= 0) return '已截止'
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(hours / 24)
    if (hours < 24) return `剩餘 ${hours} 小時`
    return `剩餘 ${days} 天`
}

function isUrgent(endsAt) {
    if (!endsAt) return false
    const diff = new Date(endsAt) - new Date()
    return diff > 0 && diff < 24 * 3600000
}

// 後端資料正規化
function normalizeZone(z) {
    const accepted = z.accepted_count ?? 0
    const total = z.total_slots ?? 0
    const cover = (z.images && z.images[0]?.url) || z.cover_url || null
    return {
        id: z.id,
        title: z.title || '無標題',
        image: cover,
        seller: {
            name: z.seller?.username || z.seller_username || '',
            avatar: z.seller?.avatar_url || null,
            avatarColor: z.seller?.avatar_color || '#C4A882',
            rating: z.seller?.rating ?? null,
        },
        timeLeft: timeLeftText(z.ends_at),
        timeUrgent: isUrgent(z.ends_at),
        slots: `${accepted}/${total}`,
        slotsLeft: total - accepted,
        threshold: z.min_credit_score ? String(z.min_credit_score) : null,
        status: z.status,
    }
}

const FILTERS = [
    { key: 'all', label: '全部' },
    { key: 'expiring', label: '即將截止' },
    { key: 'available', label: '名額充足' },
    { key: 'high_credit', label: '高信用賣家' },
]

function applyFilter(zones, key) {
    if (key === 'all') return zones
    if (key === 'expiring') return zones.filter(z => z.timeUrgent)
    if (key === 'available') return zones.filter(z => z.slotsLeft > 1)
    if (key === 'high_credit') return zones.filter(z => z.threshold && Number(z.threshold) >= 4.0)
    return zones
}

function ZoneCard({ zone, onClick }) {
    return (
        <div
            onClick={onClick}
            style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                display: 'flex',
                flexDirection: 'column',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'
            }}
        >
            <div style={{ position: 'relative', height: 280, overflow: 'hidden', backgroundColor: '#F0EBE3' }}>
                {zone.image ? (
                    <img src={zone.image} alt={zone.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B0A89A', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif' }}>
                        無封面
                    </div>
                )}
                {zone.timeUrgent && (
                    <span style={{
                        position: 'absolute', top: 12, left: 12,
                        backgroundColor: '#C4A882', color: '#FFFFFF',
                        fontSize: 10, fontFamily: 'Noto Sans TC, sans-serif',
                        fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                    }}>
                        即將截止
                    </span>
                )}
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h3 style={{
                    fontSize: 14, fontWeight: 600, color: '#1C1A18', margin: 0,
                    fontFamily: 'Noto Sans TC, sans-serif', lineHeight: 1.4
                }}>
                    {zone.title}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {zone.seller.avatar ? (
                        <img src={zone.seller.avatar} alt={zone.seller.name}
                            style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                        <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: zone.seller.avatarColor, flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>
                        {zone.seller.name}
                    </span>
                    {zone.seller.rating != null && (
                        <span style={{ fontSize: 11, color: '#C4A882', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Star size={9} fill="#C4A882" strokeWidth={0} />
                            {zone.seller.rating.toFixed(1)}
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {zone.timeLeft && (
                        <span style={{
                            fontSize: 11, fontFamily: 'Noto Sans TC, sans-serif',
                            color: zone.timeUrgent ? '#C4A882' : '#8C8479',
                            fontWeight: zone.timeUrgent ? 600 : 400,
                            display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                            <Clock size={10} strokeWidth={1.5} />
                            {zone.timeLeft}
                        </span>
                    )}
                    <span style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Users size={10} strokeWidth={1.5} />
                        {zone.slots} 名額
                    </span>
                    {zone.threshold && (
                        <span style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>
                            {`信用 ≥ ${zone.threshold}`}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

function SkeletonZone() {
    return (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <div style={{ height: 280, backgroundColor: '#F0EBE3' }} />
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ height: 16, width: '70%', backgroundColor: '#F0EBE3', borderRadius: 4 }} />
                <div style={{ height: 12, width: '40%', backgroundColor: '#F0EBE3', borderRadius: 4 }} />
            </div>
        </div>
    )
}

export default function Explore() {
    const [activeFilter, setActiveFilter] = useState('all')
    const [zones, setZones] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const navigate = useNavigate()
    const isMobile = useIsMobile()

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const res = await zoneApi.listZones()
            const data = res.data.data || []
            setZones(data.filter(z => z.status === 'active').map(normalizeZone))
        } catch (err) {
            setError(err.response?.data?.error?.message || '載入失敗，請稍後再試')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const filtered = applyFilter(zones, activeFilter)

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F5F1EC' }}>
            <div style={{ padding: isMobile ? '24px 16px' : '40px 48px', display: 'flex', flexDirection: 'column', gap: 28 }}>

                <h1 style={{ fontSize: 24, fontWeight: 600, color: '#1C1A18', margin: 0, fontFamily: 'Noto Sans TC, sans-serif' }}>
                    探索私藏
                </h1>

                <div style={{ display: 'flex', gap: 10 }}>
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setActiveFilter(f.key)}
                            style={{
                                padding: '7px 20px', borderRadius: 20, fontSize: 12,
                                fontFamily: 'Noto Sans TC, sans-serif',
                                fontWeight: activeFilter === f.key ? 600 : 400,
                                color: activeFilter === f.key ? '#F2EDE6' : '#1C1A18',
                                backgroundColor: activeFilter === f.key ? '#1C1A18' : '#FFFFFF',
                                border: activeFilter === f.key ? 'none' : '1px solid #E8DDD0',
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 12 : 20 }}>
                        {Array.from({ length: 4 }).map((_, i) => <SkeletonZone key={i} />)}
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: '#E07A5F', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14 }}>
                        {error}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14 }}>
                        目前沒有符合條件的私藏區
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 12 : 20 }}>
                        {filtered.map(zone => (
                            <ZoneCard
                                key={zone.id}
                                zone={zone}
                                onClick={() => navigate(`/zones/${zone.id}`)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
