import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, X, Send, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'

/**
 * 共用作品詳細彈窗
 *
 * Props:
 *   item    - { images, image, desc, tags, likes, comments, mockComments }
 *   author  - { name, displayName, avatar, avatarColor, rating }
 *   onClose - () => void
 *   zIndex  - number (default 1000)
 */
export default function PostModal({ item, author, onClose, zIndex = 1000 }) {
    const [liked, setLiked] = useState(false)
    const [comment, setComment] = useState('')
    const [comments, setComments] = useState(item?.mockComments || [])
    const [imgIdx, setImgIdx] = useState(0)
    const isMobile = useIsMobile()
    const navigate = useNavigate()
    const authorKey = author?.name || author?.displayName || ''

    const images = item?.images?.length ? item.images : (item?.image ? [item.image] : [])
    if (!item) return null

    // ── IG 風格：#xxx 渲染為金色 inline hashtag ────────────
    const renderCaption = (text) => {
        if (!text) return null
        return text.split(/(#[\w\u4e00-\u9fa5]+)/g).map((part, i) =>
            part.startsWith('#')
                ? <span key={i} style={{ color: '#C4A882', fontWeight: 500, cursor: 'pointer' }}>{part}</span>
                : part
        )
    }

    const submitComment = () => {
        const text = comment.trim()
        if (!text) return
        setComments(prev => [...prev, { user: '我', text, time: '剛剛' }])
        setComment('')
    }

    // ── 作者頭像 ─────────────────────────────────────────
    const AuthorAvatar = ({ size = 36 }) => {
        if (author?.avatar) {
            return (
                <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
            )
        }
        return (
            <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: author?.avatarColor || '#E8DDD0', flexShrink: 0 }} />
        )
    }

    // ── 作者名稱 ─────────────────────────────────────────
    const authorName = author?.displayName || author?.name || ''

    // ── 留言列表 ─────────────────────────────────────────
    const CommentList = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {comments.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        backgroundColor: c.user === '我' ? '#C4A882' : '#E8DDD0',
                        flexShrink: 0, marginTop: 2,
                    }} />
                    <div style={{ flex: 1 }}>
                        <span
                            style={{
                                fontWeight: 600, fontSize: 12, color: '#1C1A18',
                                fontFamily: 'Noto Sans TC, sans-serif',
                                cursor: c.user !== '我' ? 'pointer' : 'default',
                            }}
                            onMouseEnter={e => { if (c.user !== '我') e.currentTarget.style.textDecoration = 'underline' }}
                            onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
                            onClick={() => c.user !== '我' && navigate(`/profile/${c.user}`)}
                        >{c.user}</span>
                        <span style={{ fontSize: 13, color: '#3A3531', fontFamily: 'Noto Sans TC, sans-serif', marginLeft: 6 }}>{c.text}</span>
                        <div style={{ fontSize: 10, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', marginTop: 2 }}>{c.time}</div>
                    </div>
                </div>
            ))}
            {comments.length === 0 && (
                <div style={{ fontSize: 12, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', textAlign: 'center', marginTop: 8 }}>
                    還沒有留言，快來第一個留言
                </div>
            )}
        </div>
    )

    // ── 底部 actions bar ─────────────────────────────────
    const ActionsBar = ({ borderStyle = '1px solid #F0EBE3' }) => (
        <div style={{ borderTop: borderStyle }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '10px 16px' }}>
                <button onClick={() => setLiked(l => !l)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center', gap: 5,
                    color: liked ? '#C4A882' : '#8C8479', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif',
                }}>
                    <Heart size={20} strokeWidth={1.5} fill={liked ? '#C4A882' : 'none'} />
                    {item.likes + (liked ? 1 : 0)}
                </button>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#8C8479', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif' }}>
                    <MessageCircle size={20} strokeWidth={1.5} />{comments.length}
                </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 16px 20px', borderTop: borderStyle }}>
                <input
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitComment()}
                    placeholder="留言..."
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif', color: '#1C1A18', backgroundColor: 'transparent' }}
                />
                <button onClick={submitComment} style={{ background: 'none', border: 'none', cursor: 'pointer', color: comment.trim() ? '#C4A882' : '#C8C0B4', padding: 0 }}>
                    <Send size={17} strokeWidth={1.5} />
                </button>
            </div>
        </div>
    )

    // ── 手機版：整頁滑動設計 ─────────────────────────────
    if (isMobile) {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex,
                backgroundColor: '#000000',
                display: 'flex', flexDirection: 'column',
            }}>
                {/* 關閉按鈕（固定在右上角） */}
                <button onClick={onClose} style={{
                    position: 'absolute', top: 12, right: 12, zIndex: zIndex + 10,
                    background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%',
                    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#FFFFFF',
                }}><X size={16} /></button>

                {/* 整頁滑動區（照片 + 資訊 + 留言） */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
                    {/* 照片區：1:1 比例，黑底 */}
                    <div style={{
                        width: '100%', aspectRatio: '1 / 1',
                        position: 'relative', backgroundColor: '#000', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <img src={images[imgIdx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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

                    {/* 作者列 */}
                    <div
                        onClick={() => { onClose(); navigate(`/profile/${authorKey}`) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #F0EBE3', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
                    >
                        <AuthorAvatar size={36} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>{authorName}</span>
                            {author?.rating && (
                                <span style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Star size={10} color="#C4A882" fill="#C4A882" strokeWidth={0} />{author.rating}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 說明（IG 風格：# 保留在內文，金色高亮） */}
                    <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid #F0EBE3', backgroundColor: '#FFFFFF' }}>
                        <p style={{ margin: 0, fontSize: 13, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif', lineHeight: 1.7 }}>{renderCaption(item.desc)}</p>
                    </div>

                    {/* 留言列表（隨頁面滾動） */}
                    <div style={{ padding: '8px 16px 16px', backgroundColor: '#FFFFFF' }}>
                        <CommentList />
                    </div>
                </div>

                {/* 底部固定：actions + 輸入欄 */}
                <div style={{ backgroundColor: '#FFFFFF', flexShrink: 0 }}>
                    <ActionsBar />
                </div>
            </div>
        )
    }

    // ── 桌面版：1000×680 橫向 Modal ──────────────────────
    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex,
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

                {/* Left: 圖片 */}
                <div style={{ width: 520, flexShrink: 0, overflow: 'hidden', borderRadius: '16px 0 0 16px', position: 'relative' }}>
                    <img src={images[imgIdx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.2s' }} />
                    {images.length > 1 && (
                        <>
                            <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.85)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronLeft size={16} strokeWidth={1.5} color="#1C1A18" />
                            </button>
                            <button onClick={() => setImgIdx(i => (i + 1) % images.length)}
                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.85)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

                {/* Right: 資訊 + 留言 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 24px 0 24px', overflow: 'hidden' }}>
                    {/* 作者列 */}
                    <div
                        onClick={() => { onClose(); navigate(`/profile/${authorKey}`) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}
                    >
                        <AuthorAvatar size={36} />
                        <div>
                            <div style={{ fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14, fontWeight: 600, color: '#1C1A18' }}>{authorName}</div>
                            {author?.rating ? (
                                <div style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Star size={10} color="#C4A882" fill="#C4A882" strokeWidth={0} />{author.rating}
                                </div>
                            ) : (
                                <div style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>2 小時前</div>
                            )}
                        </div>
                    </div>

                    {/* 描述（IG 風格：# 保留在內文，金色高亮） */}
                    <p style={{ fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14, color: '#3A3531', lineHeight: 1.8, marginBottom: 16 }}>{renderCaption(item.desc)}</p>

                    {/* 讚 / 留言數 */}
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid #EDE8E1', marginBottom: 14 }}>
                        <button onClick={() => setLiked(l => !l)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5, color: liked ? '#C4A882' : '#8C8479', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif' }}>
                            <Heart size={18} strokeWidth={1.5} fill={liked ? '#C4A882' : 'none'} />{item.likes + (liked ? 1 : 0)}
                        </button>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#8C8479', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif' }}>
                            <MessageCircle size={18} strokeWidth={1.5} />{comments.length}
                        </span>
                    </div>

                    {/* 留言列表 */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
                        {comments.map((c, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: c.user === '我' ? '#C4A882' : '#E8DDD0', flexShrink: 0 }} />
                                <div>
                                    <span
                                        style={{
                                            fontWeight: 600, fontSize: 12, color: '#1C1A18',
                                            fontFamily: 'Noto Sans TC, sans-serif',
                                            cursor: c.user !== '我' ? 'pointer' : 'default',
                                        }}
                                        onMouseEnter={e => { if (c.user !== '我') e.currentTarget.style.textDecoration = 'underline' }}
                                        onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
                                        onClick={() => c.user !== '我' && navigate(`/profile/${c.user}`)}
                                    >{c.user}</span>
                                    <span style={{ fontSize: 12, color: '#3A3531', fontFamily: 'Noto Sans TC, sans-serif', marginLeft: 6 }}>{c.text}</span>
                                    <div style={{ fontSize: 10, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', marginTop: 2 }}>{c.time}</div>
                                </div>
                            </div>
                        ))}
                        {comments.length === 0 && (
                            <div style={{ fontSize: 12, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', textAlign: 'center', marginTop: 16 }}>還沒有留言，快來第一個留言</div>
                        )}
                    </div>

                    {/* 輸入欄 */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px solid #EDE8E1', paddingTop: 14, paddingBottom: 16 }}>
                        <input value={comment} onChange={e => setComment(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && submitComment()}
                            placeholder="留言..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif', color: '#1C1A18', backgroundColor: 'transparent' }} />
                        <button onClick={submitComment} style={{ background: 'none', border: 'none', cursor: 'pointer', color: comment.trim() ? '#C4A882' : '#C8C0B4', padding: 0 }}>
                            <Send size={17} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
