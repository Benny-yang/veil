import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Clock, Users, Star, ChevronLeft, ChevronRight, ArrowLeft, CheckCircle } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'

// ── Shared zone data (ideally from a store/API, here hardcoded for mock) ──────
export const ZONES_DATA = [
    {
        id: '1',
        title: '春季限定｜復古洋裝私藏',
        images: [
            'https://images.unsplash.com/photo-1771480302965-a26383ff802c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=900',
            'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=900',
            'https://images.unsplash.com/photo-1469334031218-e382a71b716b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=900',
        ],
        seller: { name: 'shimmer_style', avatarColor: '#C4A882', rating: 4.8, memberSince: '2022/3' },
        timeLeft: '剩餘 2 天 14 小時',
        timeUrgent: false,
        slots: '3/5',
        threshold: '3.5',
        description: '春天就是要復古！這次私藏的洋裝都是我從各地帶回的限量款，每一件都有它自己的故事。喜歡有品味、懂得欣賞設計的買家，一起交流。',
        items: ['1940s 風格荷葉邊洋裝 × 2', '法式碎花傘裙 × 1', '手工蕾絲領上衣 × 3'],
    },
    {
        id: '2',
        title: '設計師包款｜經典釋出',
        images: [
            'https://images.unsplash.com/photo-1760292395982-9cf1604ffd30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=900',
            'https://images.unsplash.com/photo-1584917865442-de89df76afd3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=900',
        ],
        seller: { name: 'velvet_noir', avatarColor: '#8C8479', rating: 4.5, memberSince: '2021/9' },
        timeLeft: '剩餘 5 天',
        timeUrgent: false,
        slots: '1/3',
        threshold: '4.0',
        description: '整理衣櫃發現這幾個包款其實很少拿出來，決定找好的主人。都是真品，有保證書和購買憑證可查。',
        items: ['Celine Mini Trio × 1', 'Loewe 小牛皮手拿包 × 1', 'Acne Studios 肩背包 × 1'],
    },
    {
        id: '3',
        title: '絲質襯衫收藏｜限量三件',
        images: [
            'https://images.unsplash.com/photo-1761896898277-5141377f2a12?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=900',
        ],
        seller: { name: 'silk_archive', avatarColor: '#E8DDD0', rating: 4.9, memberSince: '2023/1' },
        timeLeft: '剩餘 12 小時',
        timeUrgent: true,
        slots: '2/3',
        threshold: null,
        description: '三件從日本帶回的純絲上衣，非常輕薄透氣。穿過 1-2 次，狀態接近全新。',
        items: ['白色絲質長袖 × 1', '奶油色V領絲質 × 1', '薰衣草紫絲質 × 1'],
    },
    {
        id: '4',
        title: '皮革外套特選｜秋冬限定',
        images: [
            'https://images.unsplash.com/photo-1551028719-00167b16eac5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=900',
        ],
        seller: { name: 'nora_cult', avatarColor: '#C4A882', rating: 4.7, memberSince: '2022/6' },
        timeLeft: '剩餘 3 天',
        timeUrgent: false,
        slots: '4/5',
        threshold: '4.0',
        description: '秋冬必備皮革外套，每一件都有它獨特的紋路和質感，選過才知道差別。',
        items: ['真皮騎士外套 × 2', '義大利小羊皮外套 × 1', '短版皮革夾克 × 2'],
    },
    {
        id: '5',
        title: '日本帶回純棉上衣 × 4',
        images: [
            'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=900',
        ],
        seller: { name: 'miro_velvet', avatarColor: '#C4A882', rating: 4.6, memberSince: '2021/12' },
        timeLeft: '剩餘 7 天',
        timeUrgent: false,
        slots: '2/4',
        threshold: '3.0',
        description: '上次去日本帶回的幾件棉質上衣，日本品質真的完全不一樣，厚度和手感都超好。',
        items: ['無印良品純棉長袖 × 2', 'Comoli 棉麻上衣 × 1', '古著棉T × 1'],
    },
    {
        id: '6',
        title: '法式蕾絲裙組合｜買家限定',
        images: [
            'https://images.unsplash.com/photo-1469334031218-e382a71b716b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=900',
        ],
        seller: { name: 'luna_closet', avatarColor: '#C4A882', rating: 5.0, memberSince: '2020/8' },
        timeLeft: '剩餘 18 小時',
        timeUrgent: true,
        slots: '1/2',
        threshold: '4.5',
        description: '從巴黎帶回的蕾絲裙，只有懂的人才知道它的珍貴。高信用買家優先。',
        items: ['蕾絲邊中裙 × 1', '法式蕾絲上衣 × 1'],
    },
]

// ── Submitted Confirmation Modal ──────────────────────────────────────────────
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
                {/* Icon */}
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

                <p style={{
                    fontSize: 12, color: '#8C8479', textAlign: 'center', margin: 0,
                    fontFamily: 'Noto Sans TC, sans-serif'
                }}>
                    狀態：審核中 ·&nbsp;
                    <span style={{ color: '#C4A882' }}>等待賣家回覆</span>
                </p>

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
    const zone = ZONES_DATA.find(z => z.id === id) || ZONES_DATA[0]

    const [imgIdx, setImgIdx] = useState(0)
    const [intro, setIntro] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [showModal, setShowModal] = useState(false)

    const handleSubmit = () => {
        if (!intro.trim()) return
        setSubmitted(true)
        setShowModal(true)
    }

    const isMobile = useIsMobile()

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F5F1EC' }}>
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 0 : 48,
                padding: isMobile ? 0 : '40px 80px',
                height: isMobile ? 'auto' : 'calc(100vh - 60px)',
                overflow: isMobile ? 'auto' : 'hidden',
                maxWidth: isMobile ? '100%' : 1100,
                margin: '0 auto',
            }}>
                {/* ── Left/Top: Hero Images ─────────────────────────────────── */}
                <div style={isMobile
                    ? { width: '100%', height: '56vw', maxHeight: 340, flexShrink: 0, position: 'relative', overflow: 'hidden' }
                    : { width: 420, flexShrink: 0, position: 'relative', borderRadius: 12, overflow: 'hidden' }
                }>
                    <img
                        src={zone.images[imgIdx]}
                        alt={zone.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />

                    {/* Prev / Next arrows */}
                    {zone.images.length > 1 && (
                        <>
                            <button
                                onClick={() => setImgIdx(i => (i - 1 + zone.images.length) % zone.images.length)}
                                style={{
                                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                    width: 40, height: 40, borderRadius: '50%',
                                    backgroundColor: 'rgba(255,255,255,0.85)', border: 'none',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <ChevronLeft size={18} strokeWidth={1.5} color="#1C1A18" />
                            </button>
                            <button
                                onClick={() => setImgIdx(i => (i + 1) % zone.images.length)}
                                style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    width: 40, height: 40, borderRadius: '50%',
                                    backgroundColor: 'rgba(255,255,255,0.85)', border: 'none',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <ChevronRight size={18} strokeWidth={1.5} color="#1C1A18" />
                            </button>

                            {/* Dot indicators */}
                            <div style={{
                                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                                display: 'flex', gap: 8
                            }}>
                                {zone.images.map((_, i) => (
                                    <button key={i} onClick={() => setImgIdx(i)}
                                        style={{
                                            width: i === imgIdx ? 20 : 8, height: 8,
                                            borderRadius: 4, border: 'none', cursor: 'pointer',
                                            backgroundColor: i === imgIdx ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                                            transition: 'all 0.2s', padding: 0,
                                        }}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* ── Right/Below: Info Panel ───────────────────────────────── */}
                <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column', gap: 20,
                    overflowY: isMobile ? 'visible' : 'auto',
                    padding: isMobile ? '20px 16px 100px' : '0 0 24px',
                }}>
                    {/* Back link */}
                    <Link to="/explore" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 12, color: '#8C8479', textDecoration: 'none',
                        fontFamily: 'Noto Sans TC, sans-serif',
                    }}>
                        <ArrowLeft size={13} strokeWidth={1.5} />
                        返回探索
                    </Link>

                    {/* Title */}
                    <h1 style={{
                        fontSize: 26, fontWeight: 600, color: '#1C1A18', margin: 0,
                        fontFamily: 'Noto Sans TC, sans-serif', lineHeight: 1.4
                    }}>
                        {zone.title}
                    </h1>

                    {/* Seller row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            backgroundColor: zone.seller.avatarColor, flexShrink: 0
                        }} />
                        <div>
                            <div style={{
                                fontSize: 14, fontWeight: 600, color: '#1C1A18',
                                fontFamily: 'Noto Sans TC, sans-serif',
                                display: 'flex', alignItems: 'center', gap: 6
                            }}>
                                {zone.seller.name}
                                <span style={{
                                    fontSize: 12, color: '#C4A882',
                                    fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 400,
                                    display: 'flex', alignItems: 'center', gap: 3
                                }}>
                                    <Star size={11} fill="#C4A882" strokeWidth={0} color="#C4A882" />
                                    {zone.seller.rating.toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div style={{ height: 1, backgroundColor: '#E8DDD0' }} />

                    {/* Meta grid */}
                    <div style={{ display: 'flex', gap: 40 }}>
                        <div>
                            <div style={{
                                fontSize: 11, color: '#8C8479',
                                fontFamily: 'Noto Sans TC, sans-serif', marginBottom: 4
                            }}>
                                截止時間
                            </div>
                            <div style={{
                                fontSize: 14, color: zone.timeUrgent ? '#C4A882' : '#1C1A18',
                                fontWeight: zone.timeUrgent ? 600 : 400,
                                fontFamily: 'Noto Sans TC, sans-serif',
                                display: 'flex', alignItems: 'center', gap: 4
                            }}>
                                <Clock size={13} strokeWidth={1.5} />
                                {zone.timeLeft}
                            </div>
                        </div>
                        <div>
                            <div style={{
                                fontSize: 11, color: '#8C8479',
                                fontFamily: 'Noto Sans TC, sans-serif', marginBottom: 4
                            }}>
                                剩餘名額
                            </div>
                            <div style={{
                                fontSize: 14, color: '#1C1A18',
                                fontFamily: 'Noto Sans TC, sans-serif',
                                display: 'flex', alignItems: 'center', gap: 4
                            }}>
                                <Users size={13} strokeWidth={1.5} />
                                {zone.slots}
                            </div>
                        </div>
                        {zone.threshold && (
                            <div>
                                <div style={{
                                    fontSize: 11, color: '#8C8479',
                                    fontFamily: 'Noto Sans TC, sans-serif', marginBottom: 4
                                }}>
                                    信用門檻
                                </div>
                                <div style={{
                                    fontSize: 14, color: '#1C1A18',
                                    fontFamily: 'Noto Sans TC, sans-serif'
                                }}>
                                    ≥ {zone.threshold}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <p style={{
                        fontSize: 14, color: '#3A3531', lineHeight: 1.8, margin: 0,
                        fontFamily: 'Noto Sans TC, sans-serif'
                    }}>
                        {zone.description}
                    </p>

                    {/* Items list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {zone.items.map((item, i) => (
                            <div key={i} style={{
                                fontSize: 13, color: '#3A3531',
                                fontFamily: 'Noto Sans TC, sans-serif',
                                display: 'flex', alignItems: 'center', gap: 8
                            }}>
                                <span style={{
                                    width: 4, height: 4, borderRadius: '50%',
                                    backgroundColor: '#C4A882', display: 'inline-block', flexShrink: 0
                                }} />
                                {item}
                            </div>
                        ))}
                    </div>

                    <div style={{ height: 1, backgroundColor: '#E8DDD0' }} />

                    {/* Application form */}
                    {!submitted ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{
                                fontSize: 14, fontWeight: 600, color: '#1C1A18',
                                fontFamily: 'Noto Sans TC, sans-serif'
                            }}>
                                申請進入此私藏
                            </div>
                            <div style={{
                                fontSize: 12, color: '#8C8479',
                                fontFamily: 'Noto Sans TC, sans-serif'
                            }}>
                                請填寫自我介紹，讓賣家認識你
                            </div>
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
                            <button
                                onClick={handleSubmit}
                                disabled={!intro.trim()}
                                style={{
                                    width: '100%', padding: '12px 0', borderRadius: 8, border: 'none',
                                    backgroundColor: intro.trim() ? '#1C1A18' : '#D4CCC4',
                                    color: '#F2EDE6', fontSize: 14,
                                    fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600,
                                    cursor: intro.trim() ? 'pointer' : 'not-allowed',
                                    transition: 'background-color 0.2s',
                                }}
                            >
                                送出申請
                            </button>
                        </div>
                    ) : (
                        <div style={{
                            padding: '14px 16px', borderRadius: 8,
                            backgroundColor: '#FFFFFF', border: '1px solid #E8DDD0',
                            display: 'flex', alignItems: 'center', gap: 10,
                            fontSize: 13, color: '#8C8479',
                            fontFamily: 'Noto Sans TC, sans-serif'
                        }}>
                            <CheckCircle size={16} color="#C4A882" strokeWidth={1.5} />
                            申請已送出，等待賣家審核中
                        </div>
                    )}

                    {/* Status hint */}
                    <p style={{
                        fontSize: 11, color: '#8C8479', lineHeight: 1.7, margin: 0,
                        fontFamily: 'Noto Sans TC, sans-serif'
                    }}>
                        注意：通過審核不代表成為買家，賣家會在對話中決定。
                    </p>
                </div>
            </div>

            {/* Submission Success Modal */}
            {showModal && (
                <SubmittedModal
                    onClose={() => setShowModal(false)}
                    onGoMessages={() => setShowModal(false)}
                />
            )}
        </div>
    )
}
