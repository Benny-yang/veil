import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Users, Star } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'
import { zoneApi } from '../services/api'
import { normalizeZone, timeLeftText, isUrgent } from '../utils/normalizers'

// 分類常數
const CATEGORIES = [
    { key: '', label: '全部' },
    { key: 'top', label: '上身' },
    { key: 'bottom', label: '下著' },
    { key: 'intimate', label: '貼身衣物' },
    { key: 'sock', label: '著用足飾' },
    { key: 'shoe', label: '鞋類' },
    { key: 'other', label: '其他' },
]

const CATEGORY_LABEL = {
    top: '上衣', bottom: '下著', intimate: '內衣',
    sock: '襪子', shoe: '鞋子', other: '其他',
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
                    <img src={zone.image} alt={zone.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
    const [activeCategory, setActiveCategory] = useState('')
    const [zones, setZones] = useState([])
    const [loading, setLoading] = useState(true)    // 初次載入 → 顯示 skeleton
    const [fetching, setFetching] = useState(false) // 切換 tab → 保留舊資料
    const [error, setError] = useState('')
    const navigate = useNavigate()
    const isMobile = useIsMobile()

    const load = useCallback(async (category) => {
        setFetching(true)
        setError('')
        try {
            const params = category ? { category } : {}
            const res = await zoneApi.listZones(params)
            const data = res.data.data || []
            setZones(data.filter(z => z.status === 'active').map(normalizeZone))
        } catch (err) {
            setError(err.response?.data?.error?.message || '載入失敗，請稍後再試')
        } finally {
            setFetching(false)
            setLoading(false)
        }
    }, [])

    useEffect(() => { load(activeCategory) }, [load, activeCategory])

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F5F1EC' }}>
            <div style={{ padding: isMobile ? '24px 16px' : '40px 48px', display: 'flex', flexDirection: 'column', gap: 28 }}>

                <h1 style={{ fontSize: 24, fontWeight: 600, color: '#1C1A18', margin: 0, fontFamily: 'Noto Sans TC, sans-serif' }}>
                    探索私藏
                </h1>

                {/* 分類 tab */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.key}
                            onClick={() => setActiveCategory(cat.key)}
                            style={{
                                padding: '7px 20px', borderRadius: 20, fontSize: 12,
                                fontFamily: 'Noto Sans TC, sans-serif',
                                fontWeight: activeCategory === cat.key ? 600 : 400,
                                color: activeCategory === cat.key ? '#F2EDE6' : '#1C1A18',
                                backgroundColor: activeCategory === cat.key ? '#1C1A18' : '#FFFFFF',
                                border: activeCategory === cat.key ? 'none' : '1px solid #E8DDD0',
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                        >
                            {cat.label}
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
                ) : zones.length === 0 && !fetching ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14 }}>
                        目前沒有此分類的私藏
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                        gap: isMobile ? 12 : 20,
                        opacity: fetching ? 0.5 : 1,
                        transition: 'opacity 0.15s',
                        pointerEvents: fetching ? 'none' : 'auto',
                    }}>
                        {zones.map(zone => (
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
