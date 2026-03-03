import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, ChevronLeft, ChevronRight, ArrowLeft, User } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'
import { postApi } from '../services/api'
import { normalizeWork, normalizeComment } from '../utils/normalizers'

const font = 'Noto Sans TC, sans-serif'

export default function WorkDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const isMobile = useIsMobile()

    const [work, setWork] = useState(null)
    const [comments, setComments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [imgIdx, setImgIdx] = useState(0)
    const [newComment, setNewComment] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [liked, setLiked] = useState(false)
    const [likeCount, setLikeCount] = useState(0)

    const load = useCallback(async () => {
        if (!id) return
        setLoading(true)
        setError('')
        try {
            const [workRes, commentsRes] = await Promise.all([
                postApi.getPost(id),
                postApi.getComments(id),
            ])
            const w = normalizeWork(workRes.data.data || workRes.data)
            setWork(w)
            setLiked(w.liked)
            setLikeCount(w.likes)
            setComments((commentsRes.data.data || []).map(normalizeComment))
        } catch {
            setError('載入失敗，請稍後再試')
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { load() }, [load])

    const handleLike = async () => {
        const next = !liked
        setLiked(next)
        setLikeCount(c => next ? c + 1 : c - 1)
        try {
            if (next) await postApi.likePost(id)
            else await postApi.unlikePost(id)
        } catch {
            // rollback
            setLiked(!next)
            setLikeCount(c => next ? c - 1 : c + 1)
        }
    }

    const handleComment = async () => {
        if (!newComment.trim() || submitting) return
        setSubmitting(true)
        try {
            await postApi.addComment(id, { content: newComment.trim() })
            setNewComment('')
            load()
        } catch { /* 保持 input 不清空 */ }
        finally { setSubmitting(false) }
    }

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#F5F1EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 14, color: '#8C8479', fontFamily: font }}>載入中⋯</span>
            </div>
        )
    }

    if (error || !work) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#F5F1EC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <span style={{ fontSize: 14, color: '#E07A5F', fontFamily: font }}>{error || '找不到此作品'}</span>
                <button onClick={() => navigate(-1)} style={{ fontSize: 13, color: '#C4A882', fontFamily: font, background: 'none', border: 'none', cursor: 'pointer' }}>返回</button>
            </div>
        )
    }

    const images = work.images.length > 0 ? work.images : [null]

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F5F1EC' }}>
            <div style={{
                maxWidth: 1000, margin: '0 auto', padding: isMobile ? '12px 0 0' : '40px 32px',
                display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 0 : 40,
            }}>
                {/* 圖片區 */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#8C8479', fontFamily: font, padding: isMobile ? '0 16px' : 0 }}>
                        <ArrowLeft size={13} strokeWidth={1.5} />返回
                    </button>
                    <div style={{ position: 'relative', borderRadius: isMobile ? 0 : 10, overflow: 'hidden', backgroundColor: '#E8DDD0', aspectRatio: '4/5' }}>
                        {images[imgIdx] ? (
                            <img src={images[imgIdx]} alt={work.desc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B0A89A', fontSize: 13, fontFamily: font }}>無圖片</div>
                        )}
                        {images.length > 1 && (
                            <>
                                <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.85)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ChevronLeft size={16} strokeWidth={1.5} />
                                </button>
                                <button onClick={() => setImgIdx(i => (i + 1) % images.length)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.85)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ChevronRight size={16} strokeWidth={1.5} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* 資訊區 */}
                <div style={{ width: isMobile ? '100%' : 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 18, padding: isMobile ? '16px 16px 100px' : '32px 0 0' }}>
                    {/* 作者 */}
                    <Link to={`/profile/${work.author.name}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                        {work.author.avatar ? (
                            <img src={work.author.avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: work.author.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={16} color="#FFFFFF" strokeWidth={1.5} />
                            </div>
                        )}
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', fontFamily: font }}>
                            {work.author.displayName || work.author.name}
                        </span>
                    </Link>

                    {/* 描述 */}
                    {work.desc && (
                        <p style={{ fontSize: 14, color: '#3A3531', lineHeight: 1.8, margin: 0, fontFamily: font }}>
                            {work.desc}
                        </p>
                    )}

                    {/* 標籤 */}
                    {work.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {work.tags.map(t => (
                                <span key={t} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, backgroundColor: '#F0EBE3', color: '#8C8479', fontFamily: font }}>#{t}</span>
                            ))}
                        </div>
                    )}

                    <div style={{ height: 1, backgroundColor: '#E8DDD0' }} />

                    {/* 互動列 */}
                    <div style={{ display: 'flex', gap: 16 }}>
                        <button onClick={handleLike} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: liked ? '#C4A882' : '#8C8479', fontSize: 13, fontFamily: font, padding: 0 }}>
                            <Heart size={15} fill={liked ? '#C4A882' : 'none'} strokeWidth={1.5} />
                            {likeCount}
                        </button>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#8C8479', fontFamily: font }}>
                            <MessageCircle size={15} strokeWidth={1.5} />{comments.length}
                        </span>
                    </div>

                    {/* 留言列表 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 240, overflowY: 'auto' }}>
                        {comments.map(c => (
                            <div key={c.id} style={{ display: 'flex', gap: 8 }}>
                                {c.author.avatar ? (
                                    <img src={c.author.avatar} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                ) : (
                                    <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: c.author.avatarColor, flexShrink: 0 }} />
                                )}
                                <div style={{ fontSize: 13, color: '#3A3531', fontFamily: font, lineHeight: 1.6 }}>
                                    <strong style={{ color: '#1C1A18', marginRight: 4 }}>{c.author.name}</strong>{c.content}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 新增留言 */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleComment()}
                            placeholder="新增留言…"
                            style={{ flex: 1, border: 'none', borderBottom: '1px solid #E8DDD0', outline: 'none', padding: '6px 0', fontSize: 13, fontFamily: font, color: '#1C1A18', backgroundColor: 'transparent' }}
                        />
                        <button
                            onClick={handleComment}
                            disabled={!newComment.trim() || submitting}
                            style={{ fontSize: 12, color: newComment.trim() ? '#C4A882' : '#D4CCC4', fontFamily: font, fontWeight: 600, background: 'none', border: 'none', cursor: newComment.trim() ? 'pointer' : 'default', padding: 0 }}
                        >
                            {submitting ? '送出中' : '送出'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
