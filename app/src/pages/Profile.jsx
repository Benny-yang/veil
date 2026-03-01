import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, UserPlus, Mail, Star, X, Heart, MessageCircle, Send, BadgeCheck, Share2, ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'

// ─────────────────────────────────────────────────────────────────────────────
// 當前登入者（實際應從 auth context 取得）
// ─────────────────────────────────────────────────────────────────────────────
const CURRENT_USER_ID = 'my_account'

// ─────────────────────────────────────────────────────────────────────────────
// Mock 使用者資料
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_USERS = {
    'my_account': {
        id: 'my_account',
        name: 'my_account',
        displayName: 'Aria Chen',
        verified: true,
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=240&h=240&fit=crop&crop=face',
        bio: '品味是一種語言，衣著是一種態度。分享那些曾伴我走過的美麗舊衣。\n每一件物品都有它的故事，我只是暫時的守護者。',
        followers: 284, following: 93, dealCount: 37,
        rating: 4.9,
    },
    'velvet_noir': {
        id: 'velvet_noir',
        name: 'velvet_noir',
        displayName: 'Velvet Noir',
        verified: true,
        avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=240&h=240&fit=crop&crop=face',
        bio: '古著愛好者，專注尋找被遺忘的優雅。\n每一件物品都有它的故事，我只是暫時的守護者。',
        followers: 512, following: 142, dealCount: 88,
        rating: 4.7,
    },
    'shimmer_style': {
        id: 'shimmer_style',
        name: 'shimmer_style',
        displayName: 'shimmer_style',
        verified: false,
        avatar: 'https://images.unsplash.com/photo-1734669579642-a228b8feb994?w=240&h=240&fit=crop&crop=face',
        bio: '復古愛好者 ✨ 專注收藏 50-80 年代的洋裝與飾品。\n每一件物品都有它的故事，我只是暫時的守護者。',
        followers: 1204, following: 97, dealCount: 56,
        rating: 4.8,
    },
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock 作品圖片（對齊設計稿的圖片）
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_WORKS = {
    'my_account': [
        { id: 'p1', image: 'https://images.unsplash.com/photo-1680350024349-293ae872d5b4?w=500&fit=crop', images: ['https://images.unsplash.com/photo-1680350024349-293ae872d5b4?w=800&fit=crop', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&fit=crop'], desc: '這件手工真絲洋裝帶著些許週末的慵懶氣息，穿上它你就是那個房間裡最有故事的人。', tags: ['真絲', '洋裝', '二手'], likes: 24, comments: 6, mockComments: [{ user: 'velvet_noir', text: '請問是修身嗎？', time: '1小時前' }, { user: 'silk_archive', text: '顏色太美了！', time: '3小時前' }] },
        { id: 'p2', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&fit=crop', images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&fit=crop'], desc: '經典風衣，永不過時的選擇。這一件陪了我三個秋天。', tags: ['風衣', '經典', '秋冬'], likes: 33, comments: 7, mockComments: [{ user: 'luna_closet', text: '好想要！', time: '30分鐘前' }] },
        { id: 'p3', image: 'https://images.unsplash.com/photo-1717249882700-7b2cf84e5e70?w=500&fit=crop', images: ['https://images.unsplash.com/photo-1717249882700-7b2cf84e5e70?w=800&fit=crop'], desc: '蕾絲邊衣領白色上衣，帶有法式浪漫的細節。', tags: ['蕾絲', '白色', '法式'], likes: 52, comments: 16, mockComments: [{ user: 'retro_rose', text: '超美！', time: '2小時前' }] },
        { id: 'p4', image: 'https://images.unsplash.com/photo-1550614000-4b95d46660dc?w=500&fit=crop', images: ['https://images.unsplash.com/photo-1550614000-4b95d46660dc?w=800&fit=crop'], desc: '尋找懂得欣賞丹寧落色的人，每一處磨白都是歷史。', tags: ['丹寧', 'vintage'], likes: 19, comments: 4, mockComments: [] },
        { id: 'p5', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=500&fit=crop', images: ['https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&fit=crop'], desc: '限量印花短洋裝，設計師款，穿過一次，狀態完美。', tags: ['印花', '設計師', '限量'], likes: 37, comments: 5, mockComments: [{ user: 'velvet_noir', text: '哪個設計師？', time: '6小時前' }] },
        { id: 'p6', image: 'https://images.unsplash.com/photo-1485518994671-4ced98a5ed15?w=500&fit=crop', images: ['https://images.unsplash.com/photo-1485518994671-4ced98a5ed15?w=800&fit=crop'], desc: '素色寬版老爹T，怎麼配都好看。', tags: ['T-shirt', '寬版'], likes: 29, comments: 6, mockComments: [{ user: 'luna_closet', text: '顏色好喜歡！', time: '1小時前' }] },
    ],
    'velvet_noir': [
        { id: 'v1', image: 'https://images.unsplash.com/photo-1711113456756-40a80c23491c?w=500&fit=crop', images: ['https://images.unsplash.com/photo-1711113456756-40a80c23491c?w=800&fit=crop'], desc: '皮質背心，穿過三季，依然如新。對的人才懂它的好。', tags: ['皮革', '背心', '秋冬'], likes: 42, comments: 11, mockComments: [{ user: 'atelier_muse', text: '請問有S號嗎？', time: '30分鐘前' }] },
        { id: 'v2', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500&fit=crop', images: ['https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&fit=crop'], desc: '整套手工刺繡上衣，只穿過兩次。', tags: ['刺繡', '手工', '限量'], likes: 88, comments: 22, mockComments: [{ user: 'velvet_noir', text: '太精緻了！', time: '30分鐘前' }] },
        { id: 'v3', image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=500&fit=crop', images: ['https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&fit=crop'], desc: '薄荷綠針織上衣，清爽百搭，穿出初夏感。', tags: ['針織', '薄荷', '夏季'], likes: 45, comments: 8, mockComments: [] },
    ],
    'shimmer_style': [
        { id: 's1', image: 'https://images.unsplash.com/photo-1716957600755-e85798771681?w=500&fit=crop', images: ['https://images.unsplash.com/photo-1716957600755-e85798771681?w=800&fit=crop'], desc: '復古洋裝，50年代風格，九成新。', tags: ['復古', '洋裝'], likes: 61, comments: 14, mockComments: [{ user: 'luna_closet', text: '好喜歡這個年代的剪裁！', time: '1小時前' }] },
        { id: 's2', image: 'https://images.unsplash.com/photo-1740319256347-0cf3d86f7af8?w=500&fit=crop', images: ['https://images.unsplash.com/photo-1740319256347-0cf3d86f7af8?w=800&fit=crop'], desc: '收藏多年的銀質飾品組合。', tags: ['飾品', '銀色', '收藏'], likes: 37, comments: 9, mockComments: [] },
        { id: 's3', image: 'https://images.unsplash.com/photo-1763256614589-199db7a3bd51?w=500&fit=crop', images: ['https://images.unsplash.com/photo-1763256614589-199db7a3bd51?w=800&fit=crop'], desc: '古著眼鏡，鏡框完整無損。', tags: ['眼鏡', '古著'], likes: 28, comments: 3, mockComments: [] },
        { id: 's4', image: 'https://images.unsplash.com/photo-1771730896799-d008769ec54a?w=500&fit=crop', images: ['https://images.unsplash.com/photo-1771730896799-d008769ec54a?w=800&fit=crop'], desc: '70年代印花上衣，顏色鮮豔如新。', tags: ['70s', '印花'], likes: 55, comments: 7, mockComments: [] },
        { id: 's5', image: 'https://images.unsplash.com/photo-1645199431596-b7da6a10a01b?w=500&fit=crop', images: ['https://images.unsplash.com/photo-1645199431596-b7da6a10a01b?w=800&fit=crop'], desc: '復古絲巾，多種配法。', tags: ['絲巾', '配件'], likes: 43, comments: 12, mockComments: [] },
        { id: 's6', image: 'https://images.unsplash.com/photo-1722340319300-be1d71f4e6f3?w=500&fit=crop', images: ['https://images.unsplash.com/photo-1722340319300-be1d71f4e6f3?w=800&fit=crop'], desc: '手工刺繡手提包，法國跳蚤市場淘到的。', tags: ['手提包', '刺繡', '手工'], likes: 31, comments: 5, mockComments: [] },
        { id: 's7', image: 'https://images.unsplash.com/photo-1650779404110-314dad1f67a4?w=500&fit=crop', images: ['https://images.unsplash.com/photo-1650779404110-314dad1f67a4?w=800&fit=crop'], desc: '陶瓷掛飾系列，每一件都是手工。', tags: ['陶瓷', '掛飾', '手工'], likes: 19, comments: 2, mockComments: [] },
        { id: 's8', image: 'https://images.unsplash.com/photo-1627234553051-3d60e738b534?w=500&fit=crop', images: ['https://images.unsplash.com/photo-1627234553051-3d60e738b534?w=800&fit=crop'], desc: '皮革腰帶，純手工縫製，質感極好。', tags: ['皮革', '腰帶', '手工'], likes: 67, comments: 18, mockComments: [{ user: 'velvet_noir', text: '在哪裡做的？太厲害了！', time: '3小時前' }] },
    ],
}

// ─────────────────────────────────────────────────────────────────────────────
// 共用元件（比照 PrivateCollection 的 PhotoUpload / FieldLabel）
// ─────────────────────────────────────────────────────────────────────────────
const workInputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box',
    border: '1.5px solid #E8DDD0', fontSize: 13,
    fontFamily: 'Noto Sans TC, sans-serif', color: '#1C1A18',
    outline: 'none', backgroundColor: '#F8F4EE',
    transition: 'border-color 0.2s',
}

function WFieldLabel({ children, required }) {
    return (
        <div style={{ fontSize: 14, fontWeight: 500, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif', marginBottom: 8 }}>
            {children}{required && <span style={{ color: '#C4A882' }}> *</span>}
        </div>
    )
}

function WorkPhotoUpload({ photos, coverId, onPhotosChange, onCoverChange }) {
    const inputRef = React.useRef()
    const photosRef = React.useRef(photos)
    const [hovered, setHovered] = React.useState(null)

    React.useEffect(() => { photosRef.current = photos }, [photos])

    const handleFiles = (e) => {
        const files = Array.from(e.target.files)
        const remaining = 5 - photosRef.current.length
        if (remaining <= 0) return
        const toAdd = files.slice(0, remaining)
        let pending = toAdd.length
        const accumulated = []
        toAdd.forEach(file => {
            const reader = new FileReader()
            reader.onload = ev => {
                accumulated.push({ id: Date.now() + Math.random(), url: ev.target.result })
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
                    {photo.id === coverId && (
                        <div style={{
                            position: 'absolute', bottom: 4, left: 4,
                            backgroundColor: '#C4A882', color: '#FFFFFF',
                            fontSize: 10, fontWeight: 600, padding: '2px 6px',
                            borderRadius: 4, fontFamily: 'Noto Sans TC, sans-serif',
                        }}>封面</div>
                    )}
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

// ─────────────────────────────────────────────────────────────────────────────
// 新增作品 Modal（比照 NewZoneModal 樣式）
// ─────────────────────────────────────────────────────────────────────────────
function AddWorkModal({ onClose }) {
    const [values, setValues] = React.useState({
        title: '', desc: '', tags: '', photos: [], coverId: '',
    })
    const onChange = (k, v) => setValues(prev => ({ ...prev, [k]: v }))
    const focus = e => e.target.style.borderColor = '#C4A882'
    const blur = e => e.target.style.borderColor = '#E8DDD0'
    const canSubmit = values.title.trim() && values.photos.length > 0

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 2000,
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
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1C1A18', margin: 0, fontFamily: 'Noto Sans TC, sans-serif' }}>
                        新增作品
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8C8479', lineHeight: 1 }}>×</button>
                </div>

                {/* 表單 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* 標題 */}
                    <div>
                        <WFieldLabel required>作品標題</WFieldLabel>
                        <input value={values.title} onChange={e => onChange('title', e.target.value)}
                            placeholder="例：春季復古洋裝｜手工真絲"
                            style={workInputStyle} onFocus={focus} onBlur={blur} />
                    </div>

                    {/* 描述 */}
                    <div>
                        <WFieldLabel>作品描述</WFieldLabel>
                        <textarea value={values.desc} onChange={e => onChange('desc', e.target.value)}
                            placeholder="描述這件作品的故事、材質、狀況…"
                            rows={3} style={{ ...workInputStyle, resize: 'none' }}
                            onFocus={focus} onBlur={blur} />
                    </div>

                    {/* 照片 */}
                    <div>
                        <WFieldLabel>私藏照片</WFieldLabel>
                        <div style={{ fontSize: 11, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', marginBottom: 8 }}>
                            最多 5 張・點擊照片設為封面
                        </div>
                        <WorkPhotoUpload
                            photos={values.photos}
                            coverId={values.coverId}
                            onPhotosChange={v => onChange('photos', v)}
                            onCoverChange={v => onChange('coverId', v)}
                        />
                    </div>

                    <div style={{ height: 1, backgroundColor: '#E8DDD0' }} />

                    {/* 標籤 */}
                    <div>
                        <WFieldLabel>標籤</WFieldLabel>
                        <input value={values.tags} onChange={e => onChange('tags', e.target.value)}
                            placeholder="如：洋裝, 復古, 二手"
                            style={workInputStyle} onFocus={focus} onBlur={blur} />
                        <div style={{ fontSize: 11, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', marginTop: 4 }}>
                            用逗號分隔多個標籤
                        </div>
                    </div>
                </div>

                {/* 操作按鈕 */}
                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={onClose} style={{
                        flex: 1, padding: '13px 0', borderRadius: 8,
                        border: '1px solid #E8DDD0', backgroundColor: '#FFFFFF',
                        fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif', color: '#8C8479', cursor: 'pointer',
                    }}>取消</button>
                    <button onClick={onClose} disabled={!canSubmit} style={{
                        flex: 1, padding: '13px 0', borderRadius: 8, border: 'none',
                        backgroundColor: canSubmit ? '#1C1A18' : '#D4CCC4',
                        fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif',
                        fontWeight: 600, color: '#F2EDE6',
                        cursor: canSubmit ? 'pointer' : 'not-allowed',
                    }}>發布作品</button>
                </div>
                <div style={{ fontSize: 11, color: '#B0A89A', textAlign: 'center', fontFamily: 'Noto Sans TC, sans-serif' }}>
                    發布後可隨時在個人頁面編輯或刪除
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 作品詳細 Modal（與 Home PostModal 相同樣式）
// ─────────────────────────────────────────────────────────────────────────────
function WorkModal({ work, user, onClose }) {
    const [liked, setLiked] = useState(false)
    const [comment, setComment] = useState('')
    const [imgIdx, setImgIdx] = useState(0)
    const isMobile = useIsMobile()
    const images = work?.images?.length ? work.images : (work?.image ? [work.image] : [])
    if (!work) return null

    /* ── 手機版：Instagram 全螢幕設計 ─────────────────── */
    if (isMobile) {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                backgroundColor: '#000000',
                display: 'flex', flexDirection: 'column',
            }}>
                {/* 照片區：黑底 contain */}
                <div style={{
                    width: '100%', height: '52vw', maxHeight: 360, flexShrink: 0,
                    position: 'relative', backgroundColor: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <img
                        src={images[imgIdx]} alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                    {/* Close X */}
                    <button onClick={onClose} style={{
                        position: 'absolute', top: 12, right: 12, zIndex: 10,
                        background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%',
                        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#FFFFFF',
                    }}><X size={16} /></button>
                    {/* 多圖點指示 */}
                    {images.length > 1 && (
                        <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
                            {images.map((_, i) => (
                                <button
                                    key={i} onClick={() => setImgIdx(i)}
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
                        <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                            <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>{user.displayName || user.name}</span>
                            <span style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Star size={10} color="#C4A882" fill="#C4A882" strokeWidth={0} />{user.rating}
                            </span>
                        </div>
                    </div>

                    {/* 說明 + 時間 */}
                    <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid #F0EBE3' }}>
                        <p style={{ margin: 0, fontSize: 13, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif', lineHeight: 1.7 }}>{work.desc}</p>
                        <div style={{ marginTop: 4, fontSize: 11, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif' }}>2 小時前</div>
                    </div>

                    {/* 留言列表（可捲動） */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {(work.mockComments || []).map((c, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#E8DDD0', flexShrink: 0, marginTop: 2 }} />
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontWeight: 600, fontSize: 12, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>{c.user}</span>
                                    <span style={{ fontSize: 13, color: '#3A3531', fontFamily: 'Noto Sans TC, sans-serif', marginLeft: 6 }}>{c.text}</span>
                                    <div style={{ fontSize: 10, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', marginTop: 2 }}>{c.time}</div>
                                </div>
                            </div>
                        ))}
                        {(!work.mockComments || work.mockComments.length === 0) && (
                            <div style={{ fontSize: 12, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', textAlign: 'center', marginTop: 16 }}>還沒有留言，快來第一個留言</div>
                        )}
                    </div>

                    {/* 底部：actions + 輸入 */}
                    <div style={{ borderTop: '1px solid #F0EBE3' }}>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '10px 16px' }}>
                            <button onClick={() => setLiked(l => !l)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5, color: liked ? '#C4A882' : '#8C8479', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif' }}>
                                <Heart size={20} strokeWidth={1.5} fill={liked ? '#C4A882' : 'none'} />{work.likes + (liked ? 1 : 0)}
                            </button>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#8C8479', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif' }}>
                                <MessageCircle size={20} strokeWidth={1.5} />{work.comments}
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
            position: 'fixed', inset: 0, zIndex: 2000,
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
                    background: 'rgba(28,26,24,0.5)', border: 'none', borderRadius: '50%',
                    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#F2EDE6',
                }}><X size={16} /></button>

                {/* Left: Image */}
                <div style={{ width: 520, flexShrink: 0, overflow: 'hidden', borderRadius: '16px 0 0 16px', position: 'relative' }}>
                    <img src={images[imgIdx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.2s' }} />
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
                        <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                            <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                            <div style={{ fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14, fontWeight: 600, color: '#1C1A18' }}>{user.displayName || user.name}</div>
                            <div style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>2 小時前</div>
                        </div>
                    </div>
                    <p style={{ fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14, color: '#3A3531', lineHeight: 1.8, marginBottom: 12 }}>{work.desc}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                        {(work.tags || []).map(tag => (
                            <span key={tag} style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', backgroundColor: '#F5F1EC', padding: '3px 10px', borderRadius: 20 }}>#{tag}</span>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid #EDE8E1', marginBottom: 14 }}>
                        <button onClick={() => setLiked(l => !l)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5, color: liked ? '#C4A882' : '#8C8479', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif' }}>
                            <Heart size={18} strokeWidth={1.5} fill={liked ? '#C4A882' : 'none'} />{work.likes + (liked ? 1 : 0)}
                        </button>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#8C8479', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif' }}>
                            <MessageCircle size={18} strokeWidth={1.5} />{work.comments}
                        </span>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#8C8479', marginLeft: 'auto' }}>
                            <Share2 size={17} strokeWidth={1.5} />
                        </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
                        {(work.mockComments || []).map((c, i) => (
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

// ─────────────────────────────────────────────────────────────────────────────
// 粉絲 / 追蹤名單 Modal
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_FOLLOWERS = [
    { id: 'f1', name: 'velvet_noir', displayName: 'Velvet Noir', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face' },
    { id: 'f2', name: 'retro_rose', displayName: 'Retro Rose', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face' },
    { id: 'f3', name: 'shimmer_style', displayName: 'shimmer_style', avatar: 'https://images.unsplash.com/photo-1734669579642-a228b8feb994?w=80&h=80&fit=crop&crop=face' },
    { id: 'f4', name: 'luna_closet', displayName: 'Luna Closet', avatar: 'https://images.unsplash.com/photo-1649919073950-7c5ef1ea5af3?w=80&h=80&fit=crop&crop=face' },
    { id: 'f5', name: 'silk_archive', displayName: 'Silk Archive', avatar: 'https://images.unsplash.com/photo-1564506088949-5b487ca03bae?w=80&h=80&fit=crop&crop=face' },
    { id: 'f6', name: 'atelier_muse', displayName: 'Atelier Muse', avatar: 'https://images.unsplash.com/photo-1506863530036-1efeddceb993?w=80&h=80&fit=crop&crop=face' },
]
const MOCK_FOLLOWING = [
    { id: 'g1', name: 'velvet_noir', displayName: 'Velvet Noir', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face' },
    { id: 'g2', name: 'shimmer_style', displayName: 'shimmer_style', avatar: 'https://images.unsplash.com/photo-1734669579642-a228b8feb994?w=80&h=80&fit=crop&crop=face' },
    { id: 'g3', name: 'luna_closet', displayName: 'Luna Closet', avatar: 'https://images.unsplash.com/photo-1649919073950-7c5ef1ea5af3?w=80&h=80&fit=crop&crop=face' },
]

function FollowListModal({ title, list, onClose }) {
    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            backgroundColor: 'rgba(28,26,24,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                width: 400, maxHeight: '75vh', backgroundColor: '#FFFFFF',
                borderRadius: 16, display: 'flex', flexDirection: 'column',
                boxShadow: '0 16px 48px rgba(0,0,0,0.16)', overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 16px' }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>{title}</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8C8479', lineHeight: 1 }}>×</button>
                </div>
                <div style={{ height: 1, backgroundColor: '#E8DDD0' }} />
                {/* List */}
                <div style={{ overflowY: 'auto', padding: '8px 0' }}>
                    {list.map(u => (
                        <div key={u.id} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 20px', transition: 'background 0.15s', cursor: 'pointer',
                        }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAF7F4'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <img src={u.avatar} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>{u.displayName}</div>
                                <div style={{ fontSize: 12, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>@{u.name}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 評價紀錄 Modal（匿名）
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_RATINGS = [
    { id: 'r1', stars: 5, text: '交易非常順暢，物品狀況如描述，是個很棒的賣家！', date: '2025-11-20', type: 'seller' },
    { id: 'r2', stars: 5, text: '包裝細心，溝通迅速，超滿意這次的交易。', date: '2025-10-14', type: 'seller' },
    { id: 'r3', stars: 4, text: '商品與照片相符，整體交易順暢。', date: '2025-09-03', type: 'seller' },
    { id: 'r4', stars: 5, text: '物品超美，賣家描述非常誠實，強力推薦！', date: '2025-08-28', type: 'seller' },
    { id: 'r5', stars: 3, text: '寄送稍慢，但商品沒問題。', date: '2025-07-15', type: 'seller' },
]

function RatingsModal({ user, onClose }) {
    const avg = (MOCK_RATINGS.reduce((s, r) => s + r.stars, 0) / MOCK_RATINGS.length).toFixed(1)
    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            backgroundColor: 'rgba(28,26,24,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                width: 460, maxHeight: '80vh', backgroundColor: '#FFFFFF',
                borderRadius: 16, display: 'flex', flexDirection: 'column',
                boxShadow: '0 16px 48px rgba(0,0,0,0.16)', overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{ padding: '20px 20px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>評價紀錄</span>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8C8479', lineHeight: 1 }}>×</button>
                    </div>
                    {/* 平均分 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 36, fontWeight: 700, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif', lineHeight: 1 }}>{avg}</span>
                        <div>
                            <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                                {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} size={14} color="#C4A882" fill={parseFloat(avg) >= s ? '#C4A882' : 'none'} strokeWidth={1.5} />
                                ))}
                            </div>
                            <div style={{ fontSize: 12, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>{MOCK_RATINGS.length} 則評價</div>
                        </div>
                        <div style={{ marginLeft: 8, fontSize: 11, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', lineHeight: 1.6 }}>
                            所有評價均為匿名，<br />以保護買賣雙方隱私。
                        </div>
                    </div>
                </div>
                <div style={{ height: 1, backgroundColor: '#E8DDD0' }} />
                {/* 評價列表 */}
                <div style={{ overflowY: 'auto', padding: '8px 0' }}>
                    {MOCK_RATINGS.map(r => (
                        <div key={r.id} style={{ padding: '16px 20px', borderBottom: '1px solid #F5F1EC' }}>
                            {/* 星星 + 日期 */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div style={{ display: 'flex', gap: 3 }}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} size={13} color="#C4A882" fill={r.stars >= s ? '#C4A882' : 'none'} strokeWidth={1.5} />
                                    ))}
                                </div>
                                <span style={{ fontSize: 11, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif' }}>{r.date}</span>
                            </div>
                            {/* 匿名評語 */}
                            <p style={{ margin: 0, fontSize: 13, color: '#3A3531', fontFamily: 'Noto Sans TC, sans-serif', lineHeight: 1.7 }}>
                                {r.text}
                            </p>
                            <div style={{ fontSize: 11, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', marginTop: 4 }}>匿名用戶</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}


function WorkCell({ work, onClick }) {
    const [hovered, setHovered] = useState(false)
    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                position: 'relative', borderRadius: 8, overflow: 'hidden',
                cursor: 'pointer', width: '100%', aspectRatio: '1 / 1',
                backgroundColor: '#E8DDD0',
            }}
        >
            <img
                src={work.image} alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.2s' }}
            />
            {/* Hover overlay */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundColor: 'rgba(28,26,24,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18,
                opacity: hovered ? 1 : 0, transition: 'opacity 0.18s',
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FFFFFF', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600 }}>
                    <Heart size={16} fill="#FFFFFF" strokeWidth={0} />{work.likes}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FFFFFF', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600 }}>
                    <MessageCircle size={16} fill="#FFFFFF" strokeWidth={0} />{work.comments}
                </span>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Profile() {
    const { userId } = useParams()
    const targetId = userId || CURRENT_USER_ID
    const isOwner = targetId === CURRENT_USER_ID

    const user = MOCK_USERS[targetId] || MOCK_USERS['shimmer_style']
    const works = MOCK_WORKS[targetId] || []

    const [followed, setFollowed] = useState(false)
    const [showAddWork, setShowAddWork] = useState(false)
    const [selectedWork, setSelectedWork] = useState(null)
    const [showFollowers, setShowFollowers] = useState(false)
    const [showFollowing, setShowFollowing] = useState(false)
    const [showRatings, setShowRatings] = useState(false)
    const isMobile = useIsMobile()

    return (
        <div style={{ minHeight: 'calc(100vh - 60px)', backgroundColor: '#F2EDE6' }}>
            <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '24px 16px' : '40px 0' }}>

                {/* ── Profile Header ───────────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? 12 : 32, marginBottom: 32 }}>

                    {/* 大頭照 */}
                    <div style={{ flexShrink: 0 }}>
                        <div style={{
                            width: 120, height: 120, borderRadius: '50%',
                            overflow: 'hidden', border: '2px solid #E8DDD0',
                        }}>
                            <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    </div>

                    {/* 資訊欄 */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingTop: isMobile ? 0 : 8, alignItems: isMobile ? 'center' : 'flex-start', width: isMobile ? '100%' : 'auto' }}>

                        {/* 帳號名稱行 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{
                                fontSize: 20, fontWeight: 700, color: '#1C1A18',
                                fontFamily: 'Noto Sans TC, sans-serif', letterSpacing: '0.02em'
                            }}>
                                {user.displayName || user.name}
                            </span>
                            {user.verified && (
                                <BadgeCheck size={18} color="#C4A882" strokeWidth={2} />
                            )}
                            {/* 操作按鈕 */}
                            <div style={{ display: 'flex', gap: 8, marginLeft: 4 }}>
                                {isOwner ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <button onClick={() => setShowAddWork(true)} style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: '7px 18px', borderRadius: 6, border: 'none',
                                            backgroundColor: '#1C1A18', color: '#F2EDE6',
                                            fontSize: 12, fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600,
                                            cursor: 'pointer',
                                        }}>
                                            <Plus size={13} strokeWidth={2.5} />
                                            新增作品
                                        </button>
                                        {/* 設定齒輪按鈕 */}
                                        <Link to="/settings" title="設定" style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            width: 32, height: 32, borderRadius: 6,
                                            border: '1.5px solid #D4CCC4', backgroundColor: 'transparent',
                                            color: '#5C5650', textDecoration: 'none',
                                            transition: 'background-color 0.15s, color 0.15s',
                                        }}
                                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F5F1EC'; e.currentTarget.style.color = '#1C1A18' }}
                                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#5C5650' }}
                                        >
                                            <Settings size={15} strokeWidth={1.8} />
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        <button onClick={() => setFollowed(f => !f)} style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: '7px 18px', borderRadius: 6,
                                            border: followed ? '1.5px solid #C4A882' : 'none',
                                            backgroundColor: followed ? 'transparent' : '#1C1A18',
                                            color: followed ? '#C4A882' : '#F2EDE6',
                                            fontSize: 12, fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600,
                                            cursor: 'pointer', transition: 'all 0.15s',
                                        }}>
                                            {followed ? '已追蹤' : '追蹤'}
                                        </button>
                                        <button style={{
                                            padding: '7px 18px', borderRadius: 6,
                                            border: '1.5px solid #D4CCC4',
                                            backgroundColor: 'transparent', color: '#1C1A18',
                                            fontSize: 12, fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600,
                                            cursor: 'pointer',
                                        }}>
                                            私訊
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 統計數字行 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 28 : 24, justifyContent: isMobile ? 'center' : 'flex-start' }}>
                            {[
                                { label: '粉絲', value: user.followers.toLocaleString(), onClick: () => setShowFollowers(true) },
                                { label: '追蹤', value: user.following, onClick: () => setShowFollowing(true) },
                            ].map(({ label, value, onClick }) => (
                                <button key={label} onClick={onClick} style={{
                                    display: 'flex', gap: 6, alignItems: 'baseline',
                                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                                }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>{value}</span>
                                    <span style={{ fontSize: 13, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>{label}</span>
                                </button>
                            ))}
                            <button onClick={() => setShowRatings(true)} style={{
                                display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8,
                                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                            }}>
                                <Star size={13} color="#C4A882" fill="#C4A882" strokeWidth={0} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>{user.rating}</span>
                                <span style={{ fontSize: 12, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>評價</span>
                            </button>
                        </div>

                        {/* Bio */}
                        <div style={{
                            fontSize: 14, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif',
                            lineHeight: 1.7, whiteSpace: 'pre-line', maxWidth: 500,
                            textAlign: isMobile ? 'center' : 'left',
                        }}>
                            {user.bio}
                        </div>
                    </div>
                </div>

                {/* 分隔線 */}
                <div style={{ height: 1, backgroundColor: '#E8DDD0', marginBottom: 24 }} />

                {/* ── 作品 Grid（4 欄）────────────────────────────────── */}
                {works.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '60px 0',
                        color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14,
                    }}>
                        {isOwner ? '還沒有作品，新增第一件吧 ✨' : '此用戶尚未發布作品'}
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                        gap: 8,
                    }}>
                        {works.map(work => (
                            <WorkCell key={work.id} work={work} onClick={() => setSelectedWork(work)} />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAddWork && <AddWorkModal onClose={() => setShowAddWork(false)} />}
            {selectedWork && <WorkModal work={selectedWork} user={user} onClose={() => setSelectedWork(null)} />}
            {showFollowers && <FollowListModal title={`粉絲（${user.followers}）`} list={MOCK_FOLLOWERS} onClose={() => setShowFollowers(false)} />}
            {showFollowing && <FollowListModal title={`追蹤中（${user.following}）`} list={MOCK_FOLLOWING} onClose={() => setShowFollowing(false)} />}
            {showRatings && <RatingsModal user={user} onClose={() => setShowRatings(false)} />}
        </div>
    )
}
