import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, X, Send, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'
import { workApi } from '../services/api'
import { normalizeComment } from '../utils/normalizers'
import { useAuth } from '../context/AuthContext'

/**
 * 共用作品詳細彈窗
 *
 * Props:
 *   item    - { id, images, image, desc, tags, likes, comments, liked }
 *   author  - { name, displayName, avatar, avatarColor, rating }
 *   onClose - () => void
 *   zIndex  - number (default 1000)
 */
export default function PostModal({ item, author, onClose, zIndex = 1000 }) {
    const { currentUser } = useAuth()
    const [liked, setLiked] = useState(item?.liked ?? false)
    const [likeCount, setLikeCount] = useState(item?.likes ?? 0)
    const [comment, setComment] = useState('')
    const [comments, setComments] = useState([])
    const [commentsLoading, setCommentsLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [imgIdx, setImgIdx] = useState(0)
    const isMobile = useIsMobile()
    const navigate = useNavigate()

    // 載入留言（必須在 early return 之前宣告，確保 Hooks 順序一致）
    const loadComments = useCallback(async () => {
        if (!item?.id) return
        setCommentsLoading(true)
        try {
            const res = await workApi.getComments(item.id)
            setComments((res.data.data || []).map(normalizeComment))
        } catch {
            // 靜默失敗：留言列表顯示空
        } finally {
            setCommentsLoading(false)
        }
    }, [item?.id])

    useEffect(() => {
        setLiked(item?.liked ?? false)
        setLikeCount(item?.likes ?? 0)
        setImgIdx(0)
        loadComments()
    }, [item?.id, loadComments])

    // ── Guard：所有 Hooks 已呼叫完畢，可以 early return ──
    if (!item) return null

    const authorKey = author?.name || author?.displayName || ''
    const images = item?.images?.length ? item.images : (item?.image ? [item.image] : [])

    // 按讚 / 取消讚
    const handleLike = async () => {
        if (!currentUser) return
        const next = !liked
        setLiked(next)
        setLikeCount(c => next ? c + 1 : c - 1)
        try {
            if (next) await workApi.likeWork(item.id)
            else await workApi.unlikeWork(item.id)
        } catch {
            // rollback
            setLiked(!next)
            setLikeCount(c => next ? c - 1 : c + 1)
        }
    }

    // 送出留言
    const submitComment = async () => {
        const text = comment.trim()
        if (!text || submitting || !currentUser) return
        setSubmitting(true)
        try {
            await workApi.addComment(item.id, text)
            setComment('')
            loadComments()
        } catch {
            // 保持 input 不清空
        } finally {
            setSubmitting(false)
        }
    }

    // ── IG 風格：#xxx 渲染為金色 inline hashtag ────────────
    const renderCaption = (text) => {
        if (!text) return null
        return text.split(/(#[\w\u4e00-\u9fa5]+)/g).map((part, i) =>
            part.startsWith('#')
                ? <span key={i} style={{ color: '#C4A882', fontWeight: 500, cursor: 'pointer' }}>{part}</span>
                : part
        )
    }

    // ── 作者頭像 ─────────────────────────────────────────
    const renderAuthorAvatar = (size = 36) => {
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
    const renderCommentList = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {commentsLoading ? (
                <div style={{ fontSize: 12, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', textAlign: 'center', marginTop: 8 }}>載入中⋯</div>
            ) : comments.length === 0 ? (
                <div style={{ fontSize: 12, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', textAlign: 'center', marginTop: 8 }}>還沒有留言，快來第一個留言</div>
            ) : comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    {c.author?.avatar ? (
                        <img src={c.author.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: 2 }} />
                    ) : (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: c.author?.avatarColor || '#E8DDD0', flexShrink: 0, marginTop: 2 }} />
                    )}
                    <div style={{ flex: 1 }}>
                        <span
                            style={{ fontWeight: 600, fontSize: 12, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                            onClick={() => navigate(`/profile/${c.author?.name}`)}
                        >{c.author?.name}</span>
                        <span style={{ fontSize: 13, color: '#3A3531', fontFamily: 'Noto Sans TC, sans-serif', marginLeft: 6 }}>{c.content}</span>
                        <div style={{ fontSize: 10, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', marginTop: 2 }}>{c.createdAt}</div>
                    </div>
                </div>
            ))}
        </div>
    )

    // ── 底部 actions bar ─────────────────────────────────
    const renderActionsBar = (borderStyle = '1px solid #F0EBE3') => (
        <div style={{ borderTop: borderStyle }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '10px 16px' }}>
                <button onClick={handleLike} style={{
                    background: 'none', border: 'none', cursor: currentUser ? 'pointer' : 'default', padding: 0,
                    display: 'flex', alignItems: 'center', gap: 5,
                    color: liked ? '#C4A882' : '#8C8479', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif',
                }}>
                    <Heart size={20} strokeWidth={1.5} fill={liked ? '#C4A882' : 'none'} />
                    {likeCount}
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
                    placeholder={currentUser ? '留言...' : '請登入後留言'}
                    disabled={!currentUser}
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif', color: '#1C1A18', backgroundColor: 'transparent' }}
                />
                <button onClick={submitComment} disabled={!comment.trim() || submitting || !currentUser}
                    style={{ background: 'none', border: 'none', cursor: comment.trim() && currentUser ? 'pointer' : 'default', color: comment.trim() && currentUser ? '#C4A882' : '#C8C0B4', padding: 0 }}>
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
                        {renderAuthorAvatar(36)}
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
                        {renderCommentList()}
                    </div>
                </div>

                {/* 底部固定：actions + 輸入欄 */}
                <div style={{ backgroundColor: '#FFFFFF', flexShrink: 0 }}>
                    {renderActionsBar()}
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
                        {renderAuthorAvatar(36)}
                        <div>
                            <div style={{ fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14, fontWeight: 600, color: '#1C1A18' }}>{authorName}</div>
                            {author?.rating && (
                                <div style={{ fontSize: 11, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Star size={10} color="#C4A882" fill="#C4A882" strokeWidth={0} />{author.rating}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 描述（IG 風格：# 保留在內文，金色高亮） */}
                    <p style={{ fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14, color: '#3A3531', lineHeight: 1.8, marginBottom: 16 }}>{renderCaption(item.desc)}</p>

                    {/* 讚 / 留言數 */}
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid #EDE8E1', marginBottom: 14 }}>
                        <button onClick={handleLike}
                            style={{ background: 'none', border: 'none', cursor: currentUser ? 'pointer' : 'default', padding: 0, display: 'flex', alignItems: 'center', gap: 5, color: liked ? '#C4A882' : '#8C8479', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif' }}>
                            <Heart size={18} strokeWidth={1.5} fill={liked ? '#C4A882' : 'none'} />{likeCount}
                        </button>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#8C8479', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif' }}>
                            <MessageCircle size={18} strokeWidth={1.5} />{comments.length}
                        </span>
                    </div>

                    {/* 留言列表 */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
                        {commentsLoading ? (
                            <div style={{ fontSize: 12, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', textAlign: 'center', marginTop: 16 }}>載入中⋯</div>
                        ) : comments.length === 0 ? (
                            <div style={{ fontSize: 12, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', textAlign: 'center', marginTop: 16 }}>還沒有留言，快來第一個留言</div>
                        ) : comments.map(c => (
                            <div key={c.id} style={{ display: 'flex', gap: 8 }}>
                                {c.author?.avatar ? (
                                    <img src={c.author.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                ) : (
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: c.author?.avatarColor || '#E8DDD0', flexShrink: 0 }} />
                                )}
                                <div>
                                    <span
                                        style={{ fontWeight: 600, fontSize: 12, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif', cursor: 'pointer' }}
                                        onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                                        onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                                        onClick={() => navigate(`/profile/${c.author?.name}`)}
                                    >{c.author?.name}</span>
                                    <span style={{ fontSize: 12, color: '#3A3531', fontFamily: 'Noto Sans TC, sans-serif', marginLeft: 6 }}>{c.content}</span>
                                    <div style={{ fontSize: 10, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif', marginTop: 2 }}>{c.createdAt}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 輸入欄 */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px solid #EDE8E1', paddingTop: 14, paddingBottom: 16 }}>
                        <input value={comment} onChange={e => setComment(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && submitComment()}
                            placeholder={currentUser ? '留言...' : '請登入後留言'}
                            disabled={!currentUser}
                            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif', color: '#1C1A18', backgroundColor: 'transparent' }} />
                        <button onClick={submitComment} disabled={!comment.trim() || submitting || !currentUser}
                            style={{ background: 'none', border: 'none', cursor: comment.trim() && currentUser ? 'pointer' : 'default', color: comment.trim() && currentUser ? '#C4A882' : '#C8C0B4', padding: 0 }}>
                            <Send size={17} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
