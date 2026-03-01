import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Users, Star } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'

const MOCK_ZONES = [
    {
        id: '1',
        title: '春季限定｜復古洋裝專區',
        image: 'https://images.unsplash.com/photo-1771480302965-a26383ff802c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        seller: { name: 'shimmer_style', avatarColor: '#C4A882', rating: 4.8 },
        timeLeft: '剩餘 2 天',
        timeUrgent: false,
        slots: '3/5',
        threshold: '3.5',
        filter: 'expiring',
    },
    {
        id: '2',
        title: '設計師包款｜經典釋出',
        image: 'https://images.unsplash.com/photo-1760292395982-9cf1604ffd30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        seller: { name: 'velvet_noir', avatarColor: '#8C8479', rating: 4.5 },
        timeLeft: '剩餘 5 天',
        timeUrgent: false,
        slots: '1/3',
        threshold: '4.0',
        filter: 'available',
    },
    {
        id: '3',
        title: '絲質襯衫收藏｜限量三件',
        image: 'https://images.unsplash.com/photo-1761896898277-5141377f2a12?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        seller: { name: 'silk_archive', avatarColor: '#E8DDD0', rating: 4.9 },
        timeLeft: '剩餘 12 小時',
        timeUrgent: true,
        slots: '2/3',
        threshold: null,
        filter: 'expiring',
    },
    {
        id: '4',
        title: '皮革外套特選｜秋冬限定',
        image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        seller: { name: 'nora_cult', avatarColor: '#C4A882', rating: 4.7 },
        timeLeft: '剩餘 3 天',
        timeUrgent: false,
        slots: '4/5',
        threshold: '4.0',
        filter: 'available',
    },
    {
        id: '5',
        title: '日本帶回純棉上衣 × 4',
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        seller: { name: 'miro_velvet', avatarColor: '#C4A882', rating: 4.6 },
        timeLeft: '剩餘 7 天',
        timeUrgent: false,
        slots: '2/4',
        threshold: '3.0',
        filter: 'available',
    },
    {
        id: '6',
        title: '法式蕾絲裙組合｜買家限定',
        image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        seller: { name: 'luna_closet', avatarColor: '#C4A882', rating: 5.0 },
        timeLeft: '剩餘 18 小時',
        timeUrgent: true,
        slots: '1/2',
        threshold: '4.5',
        filter: 'trusted',
    },
]

const FILTERS = [
    { key: 'all', label: '全部' },
    { key: 'expiring', label: '即將截止' },
    { key: 'available', label: '名額充足' },
    { key: 'trusted', label: '高信用賣家' },
]

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
            {/* Cover image */}
            <div style={{ position: 'relative', height: 280, overflow: 'hidden' }}>
                <img
                    src={zone.image}
                    alt={zone.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
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

            {/* Card body */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h3 style={{
                    fontSize: 14, fontWeight: 600, color: '#1C1A18', margin: 0,
                    fontFamily: 'Noto Sans TC, sans-serif', lineHeight: 1.4
                }}>
                    {zone.title}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        backgroundColor: zone.seller.avatarColor, flexShrink: 0
                    }} />
                    <span style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>
                        {zone.seller.name}
                    </span>
                    <span style={{ fontSize: 11, color: '#C4A882', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Star size={9} fill="#C4A882" strokeWidth={0} />
                        {zone.seller.rating.toFixed(1)}
                    </span>
                </div>

                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{
                        fontSize: 11, fontFamily: 'Noto Sans TC, sans-serif',
                        color: zone.timeUrgent ? '#C4A882' : '#8C8479',
                        fontWeight: zone.timeUrgent ? 600 : 400,
                        display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                        <Clock size={10} strokeWidth={1.5} />
                        {zone.timeLeft}
                    </span>
                    <span style={{
                        fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif',
                        display: 'flex', alignItems: 'center', gap: 3
                    }}>
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

export default function Explore() {
    const [activeFilter, setActiveFilter] = useState('all')
    const navigate = useNavigate()
    const isMobile = useIsMobile()

    const filtered = activeFilter === 'all'
        ? MOCK_ZONES
        : MOCK_ZONES.filter(z => z.filter === activeFilter)

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F5F1EC' }}>
            <div style={{ padding: isMobile ? '24px 16px' : '40px 48px', display: 'flex', flexDirection: 'column', gap: 28 }}>

                <h1 style={{
                    fontSize: 24, fontWeight: 600, color: '#1C1A18', margin: 0,
                    fontFamily: 'Noto Sans TC, sans-serif'
                }}>
                    探索私藏
                </h1>

                {/* Filters */}
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

                {/* Zone Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 12 : 20 }}>
                    {filtered.map(zone => (
                        <ZoneCard
                            key={zone.id}
                            zone={zone}
                            onClick={() => navigate(`/zones/${zone.id}`)}
                        />
                    ))}
                </div>

                {filtered.length === 0 && (
                    <div style={{
                        textAlign: 'center', padding: '80px 0',
                        color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14
                    }}>
                        目前沒有符合條件的私藏區
                    </div>
                )}
            </div>
        </div>
    )
}
