import React, { useState } from 'react'
import { Heart, MessageCircle, X, Send, Share2, ChevronLeft, ChevronRight } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'

const MOCK_POSTS = [
    {
        id: 1,
        author: { name: 'shimmer_style', avatarColor: '#C4A882' },
        image: 'https://images.unsplash.com/photo-1680350024349-293ae872d5b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        images: [
            'https://images.unsplash.com/photo-1680350024349-293ae872d5b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
            'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
            'https://images.unsplash.com/photo-1469334031218-e382a71b716b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        ],
        imageHeight: 260,
        likes: 24, comments: 6, column: 0,
        desc: '這件手工真絲洋裝帶著些許週末的慵懶氣息，穿上它你就是那個房間裡最有故事的人。',
        tags: ['真絲', '洋裝', '二手'],
        mockComments: [
            { user: 'velvet_noir', text: '想了解這件的版型，請問是修身嗎？', time: '1小時前' },
            { user: 'silk_archive', text: '顏色太美了，這個米白很百搭！', time: '3小時前' },
        ]
    },
    {
        id: 2,
        author: { name: 'velvet_noir', avatarColor: '#8C8479' },
        image: 'https://images.unsplash.com/photo-1711113456756-40a80c23491c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        images: [
            'https://images.unsplash.com/photo-1711113456756-40a80c23491c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
            'https://images.unsplash.com/photo-1551028719-00167b16eac5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        ],
        imageHeight: 200,
        likes: 42, comments: 11, column: 1,
        desc: '皮質背心，穿過三季，依然如新。對的人才懂它的好。',
        tags: ['皮革', '背心', '秋冬'],
        mockComments: [
            { user: 'atelier_muse', text: '請問有S號嗎？', time: '30分鐘前' },
        ]
    },
    {
        id: 3,
        author: { name: 'atelier_muse', avatarColor: '#C4A882' },
        image: 'https://images.unsplash.com/photo-1712512343634-f64161d3daa6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 220,
        likes: 18, comments: 3, column: 2,
        desc: '一雙陪我走過無數城市的楔形鞋，尋找懂得欣賞的新主人。',
        tags: ['鞋', '楔形', '黑色'],
        mockComments: [
            { user: 'velvet_noir', text: '尺碼多少？', time: '5小時前' },
        ]
    },
    {
        id: 4,
        author: { name: 'silk_archive', avatarColor: '#E8DDD0' },
        image: 'https://images.unsplash.com/photo-1761369332487-777e59fa4bcf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 190,
        likes: 57, comments: 9, column: 3,
        desc: '色彩繽紛的絲巾收藏，每一條都是不同旅途的紀念。',
        tags: ['絲巾', '收藏', '彩色'],
        mockComments: [
            { user: 'shimmer_style', text: '這個配色太好看了！', time: '1小時前' },
        ]
    },
    {
        id: 5,
        author: { name: 'miro_velvet', avatarColor: '#C4A882' },
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 240,
        likes: 33, comments: 7, column: 4,
        desc: '經典風衣，永不過時的選擇。這一件陪了我三個秋天。',
        tags: ['風衣', '經典', '秋冬'],
        mockComments: [
            { user: 'silk_archive', text: '哪個品牌？', time: '2小時前' },
        ]
    },
    {
        id: 6,
        author: { name: 'juni_archive', avatarColor: '#8C8479' },
        image: 'https://images.unsplash.com/photo-1550614000-4b95d46660dc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 170,
        likes: 19, comments: 4, column: 0,
        desc: '尋找一個懂得欣賞丹寧落色的人。每一處磨白都是歷史。',
        tags: ['丹寧', '牛仔', 'vintage'],
        mockComments: [
            { user: 'miro_velvet', text: '這個落色太帥了！', time: '4小時前' },
        ]
    },
    {
        id: 7,
        author: { name: 'nora_cult', avatarColor: '#C4A882' },
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 280,
        likes: 88, comments: 22, column: 1,
        desc: '整套手工刺繡上衣，只穿過兩次。找一個真的懂設計的新主人。',
        tags: ['刺繡', '手工', '限量'],
        mockComments: [
            { user: 'velvet_noir', text: '太精緻了，價格？', time: '30分鐘前' },
        ]
    },
    {
        id: 8,
        author: { name: 'sora_dress', avatarColor: '#E8DDD0' },
        image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 210,
        likes: 45, comments: 8, column: 2,
        desc: '薄荷綠針織上衣，清爽百搭，穿出初夏感。',
        tags: ['針織', '薄荷', '夏季'],
        mockComments: [
            { user: 'nora_cult', text: '這個綠很特別！', time: '1小時前' },
        ]
    },
    {
        id: 9,
        author: { name: 'felix_mode', avatarColor: '#C4A882' },
        image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 250,
        likes: 61, comments: 14, column: 3,
        desc: '白色亞麻長褲，夏天的必需品。微微的自然皺褶是它的魅力。',
        tags: ['亞麻', '白色', '夏天'],
        mockComments: [
            { user: 'sora_dress', text: '好喜歡亞麻材質！', time: '3小時前' },
        ]
    },
    {
        id: 10,
        author: { name: 'aris_collect', avatarColor: '#8C8479' },
        image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 200,
        likes: 37, comments: 5, column: 4,
        desc: '限量印花短洋裝，設計師款。穿過一次，狀態完美。',
        tags: ['印花', '設計師', '限量'],
        mockComments: [
            { user: 'felix_mode', text: '哪個設計師？', time: '6小時前' },
        ]
    },
    {
        id: 11,
        author: { name: 'luna_closet', avatarColor: '#C4A882' },
        image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 230,
        likes: 52, comments: 16, column: 0,
        desc: '蕾絲邊衣領白色上衣，帶有法式浪漫的細節，特別的存在。',
        tags: ['蕾絲', '白色', '法式'],
        mockComments: [
            { user: 'aris_collect', text: '超美的細節！', time: '2小時前' },
        ]
    },
    {
        id: 12,
        author: { name: 'vigo_shop', avatarColor: '#E8DDD0' },
        image: 'https://images.unsplash.com/photo-1485518994671-4ced98a5ed15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 180,
        likes: 29, comments: 6, column: 1,
        desc: '素色寬版老爹T，穿起來就是隨性有型，怎麼配都好看。',
        tags: ['T-shirt', '寬版', '素色'],
        mockComments: [
            { user: 'luna_closet', text: '顏色好喜歡！', time: '1小時前' },
        ]
    },
]

// ── Post Detail Modal ─────────────────────────────────────────────────────────
function PostModal({ post, onClose }) {
    const [liked, setLiked] = useState(false)
    const [comment, setComment] = useState('')
    const [imgIdx, setImgIdx] = useState(0)
    const isMobile = useIsMobile()
    const images = post?.images || (post?.image ? [post.image] : [])
    if (!post) return null

    /* ── 手機版：Instagram 全螢幕設計 ─────────────────── */
    if (isMobile) {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                backgroundColor: '#000000',
                display: 'flex', flexDirection: 'column',
            }}>
                {/* 照片區：黑底 contain */}
                <div style={{
                    width: '100%', height: '52vw', maxHeight: 360, flexShrink: 0,
                    position: 'relative', backgroundColor: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <img src={images[imgIdx]} alt={post.author.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <button onClick={onClose} style={{
                        position: 'absolute', top: 12, right: 12, zIndex: 10,
                        background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%',
                        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#FFFFFF',
                    }}><X size={16} /></button>
                    {images.length > 1 && (
                        <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
                            {images.map((_, i) => (
                                <button key={i} onClick={() => setImgIdx(i)}
                                    style={{ width: i === imgIdx ? 16 : 6, height: 6, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0, backgroundColor: i === imgIdx ? '#FFFFFF' : 'rgba(255,255,255,0.45)', transition: 'all 0.2s' }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* 內容區：白底，可捲動 */}
                <div style={{ flex: 1, backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* 作者列 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #F0EBE3' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: post.author.avatarColor, flexShrink: 0 }} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>{post.author.name}</span>
                            <span style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>2 小時前</span>
                        </div>
                    </div>

                    {/* 說明 + 時間 */}
                    <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid #F0EBE3' }}>
                        <p style={{ margin: 0, fontSize: 13, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif', lineHeight: 1.7 }}>{post.desc}</p>
                        <div style={{ marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {post.tags.map(tag => (
                                <span key={tag} style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>#{tag}</span>
                            ))}
                        </div>
                    </div>

                    {/* 留言列表（可捲動） */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {post.mockComments.map((c, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#E8DDD0', flexShrink: 0, marginTop: 2 }} />
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontWeight: 600, fontSize: 12, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>{c.user}</span>
                                    <span style={{ fontSize: 13, color: '#3A3531', fontFamily: 'Noto Sans TC, sans-serif', marginLeft: 6 }}>{c.text}</span>
                                    <div style={{ fontSize: 10, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', marginTop: 2 }}>{c.time}</div>
                                </div>
                            </div>
                        ))}
                        {post.mockComments.length === 0 && (
                            <div style={{ fontSize: 12, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', textAlign: 'center', marginTop: 16 }}>還沒有留言，快來第一個留言</div>
                        )}
                    </div>

                    {/* 底部：actions + 輸入 */}
                    <div style={{ borderTop: '1px solid #F0EBE3' }}>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '10px 16px' }}>
                            <button onClick={() => setLiked(l => !l)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5, color: liked ? '#C4A882' : '#8C8479', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif' }}>
                                <Heart size={20} strokeWidth={1.5} fill={liked ? '#C4A882' : 'none'} />{post.likes + (liked ? 1 : 0)}
                            </button>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#8C8479', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif' }}>
                                <MessageCircle size={20} strokeWidth={1.5} />{post.comments}
                            </span>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#8C8479', marginLeft: 'auto' }}>
                                <Share2 size={18} strokeWidth={1.5} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 16px 20px', borderTop: '1px solid #F0EBE3' }}>
                            <input value={comment} onChange={e => setComment(e.target.value)} placeholder="留言..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif', color: '#1C1A18', backgroundColor: 'transparent' }} />
                            <button onClick={() => setComment('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: comment ? '#C4A882' : '#C8C0B4', padding: 0 }}>
                                <Send size={17} strokeWidth={1.5} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    /* ── 桌面版：1000x680 橫向 Modal ─────────────────── */
    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            backgroundColor: 'rgba(28,26,24,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                width: 1000, height: 680, backgroundColor: '#FFFFFF',
                borderRadius: 16, display: 'flex', overflow: 'hidden',
                boxShadow: '0 24px 60px rgba(0,0,0,0.2)', position: 'relative',
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: 16, right: 16, zIndex: 10,
                    background: 'rgba(28,26,24,0.5)', border: 'none',
                    borderRadius: '50%', width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#F2EDE6',
                }}><X size={16} /></button>

                {/* Left: Image Carousel */}
                <div style={{ width: 520, flexShrink: 0, overflow: 'hidden', borderRadius: '16px 0 0 16px', position: 'relative' }}>
                    <img src={images[imgIdx]} alt={post.author.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.2s' }} />
                    {images.length > 1 && (
                        <>
                            <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.85)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronLeft size={16} strokeWidth={1.5} color="#1C1A18" />
                            </button>
                            <button onClick={() => setImgIdx(i => (i + 1) % images.length)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.85)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronRight size={16} strokeWidth={1.5} color="#1C1A18" />
                            </button>
                            <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                                {images.map((_, i) => (
                                    <button key={i} onClick={() => setImgIdx(i)} style={{ width: i === imgIdx ? 18 : 7, height: 7, borderRadius: 4, border: 'none', cursor: 'pointer', padding: 0, backgroundColor: i === imgIdx ? '#FFFFFF' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }} />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Right: Info + Comments */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 24px 0 24px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: post.author.avatarColor, flexShrink: 0 }} />
                        <div>
                            <div style={{ fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14, fontWeight: 600, color: '#1C1A18' }}>{post.author.name}</div>
                            <div style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>2 小時前</div>
                        </div>
                    </div>
                    <p style={{ fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14, color: '#3A3531', lineHeight: 1.8, marginBottom: 12 }}>{post.desc}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                        {post.tags.map(tag => (
                            <span key={tag} style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', backgroundColor: '#F5F1EC', padding: '3px 10px', borderRadius: 20 }}>#{tag}</span>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid #EDE8E1', marginBottom: 14 }}>
                        <button onClick={() => setLiked(l => !l)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5, color: liked ? '#C4A882' : '#8C8479', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif' }}>
                            <Heart size={18} strokeWidth={1.5} fill={liked ? '#C4A882' : 'none'} />{post.likes + (liked ? 1 : 0)}
                        </button>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#8C8479', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif' }}>
                            <MessageCircle size={18} strokeWidth={1.5} />{post.comments}
                        </span>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#8C8479', marginLeft: 'auto' }}>
                            <Share2 size={17} strokeWidth={1.5} />
                        </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
                        {post.mockComments.map((c, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#E8DDD0', flexShrink: 0 }} />
                                <div>
                                    <span style={{ fontWeight: 600, fontSize: 12, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>{c.user}</span>
                                    <span style={{ fontSize: 12, color: '#3A3531', fontFamily: 'Noto Sans TC, sans-serif', marginLeft: 6 }}>{c.text}</span>
                                    <div style={{ fontSize: 10, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', marginTop: 2 }}>{c.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px solid #EDE8E1', paddingTop: 14, paddingBottom: 16 }}>
                        <input value={comment} onChange={e => setComment(e.target.value)} placeholder="留言..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif', color: '#1C1A18', backgroundColor: 'transparent' }} />
                        <button onClick={() => setComment('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: comment ? '#C4A882' : '#C8C0B4', padding: 0 }}>
                            <Send size={17} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({ post, onClick }) {
    const [liked, setLiked] = useState(false)

    return (
        <div
            className="rounded-lg overflow-hidden flex flex-col cursor-pointer"
            style={{
                backgroundColor: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                transition: 'box-shadow 0.2s'
            }}
            onClick={onClick}
        >
            <img src={post.image} alt={post.author.name}
                className="w-full object-cover" style={{ height: post.imageHeight }} />
            <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <div className="rounded-full flex-shrink-0"
                        style={{ width: 28, height: 28, backgroundColor: post.author.avatarColor }} />
                    <span style={{
                        fontSize: 13, fontWeight: 500, color: '#1C1A18',
                        fontFamily: 'Noto Sans TC, sans-serif'
                    }}>
                        {post.author.name}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={e => { e.stopPropagation(); setLiked(l => !l) }}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            display: 'flex', alignItems: 'center', gap: 5,
                            color: liked ? '#C4A882' : '#8C8479', fontSize: 12,
                            fontFamily: 'Noto Sans TC, sans-serif'
                        }}
                    >
                        <Heart size={15} strokeWidth={1.5} fill={liked ? '#C4A882' : 'none'} />
                        {post.likes + (liked ? 1 : 0)}
                    </button>
                    <span style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        color: '#8C8479', fontSize: 12, fontFamily: 'Noto Sans TC, sans-serif'
                    }}>
                        <MessageCircle size={15} strokeWidth={1.5} />
                        {post.comments}
                    </span>
                </div>
            </div>
        </div>
    )
}

// ── Home Page ─────────────────────────────────────────────────────────────────
export default function Home() {
    const [selectedPost, setSelectedPost] = useState(null)

    const columns = [[], [], [], [], []]
    MOCK_POSTS.forEach(post => { columns[post.column].push(post) })

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F5F1EC' }}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full"
                style={{ padding: '24px 60px' }}>
                {columns.map((col, i) => (
                    <div key={i} className="flex flex-col gap-3">
                        {col.map(post => (
                            <PostCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
                        ))}
                    </div>
                ))}
            </div>

            {/* Detail Modal */}
            {selectedPost && (
                <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />
            )}
        </div>
    )
}
