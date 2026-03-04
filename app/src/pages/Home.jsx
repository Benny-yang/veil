import React, { useState, useEffect, useCallback } from 'react'
import { Heart, MessageCircle } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'
import PostModal from '../components/PostModal'
import { workApi } from '../services/api'
import { normalizePost } from '../utils/normalizers'


// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({ post, onLikeToggle, onClick }) {
    return (
        <div
            onClick={onClick}
            style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 10,
                overflow: 'hidden',
                cursor: 'pointer',
                breakInside: 'avoid',
                display: 'block',
                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                transition: 'box-shadow 0.2s, transform 0.15s',
                marginBottom: 12,
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.07)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
            {/* 圖片區：按原始比例顯示 */}
            {post.image ? (
                <img
                    src={post.image}
                    alt={post.author?.name}
                    style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                    loading="lazy"
                />
            ) : (
                <div style={{
                    width: '100%', aspectRatio: '4/3',
                    backgroundColor: '#F0EBE3', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#B0A89A', fontSize: 12,
                    fontFamily: 'Noto Sans TC, sans-serif',
                }}>
                    無圖片
                </div>
            )}

            {/* 作者 + 互動 */}
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {post.author?.avatar ? (
                        <img src={post.author.avatar} alt=""
                            style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                        <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: post.author?.avatarColor || '#C4A882', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif', lineHeight: 1.2 }}>
                        {post.author?.displayName || post.author?.name}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        onClick={e => { e.stopPropagation(); onLikeToggle(post) }}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            display: 'flex', alignItems: 'center', gap: 4,
                            color: post.liked ? '#C4A882' : '#8C8479', fontSize: 11,
                            fontFamily: 'Noto Sans TC, sans-serif',
                        }}
                    >
                        <Heart size={13} strokeWidth={1.5} fill={post.liked ? '#C4A882' : 'none'} />
                        {post.likes}
                    </button>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#8C8479', fontSize: 11, fontFamily: 'Noto Sans TC, sans-serif' }}>
                        <MessageCircle size={13} strokeWidth={1.5} />
                        {post.comments}
                    </span>
                </div>
            </div>
        </div>
    )
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <div style={{ height: 200, backgroundColor: '#F0EBE3', animation: 'pulse 1.5s infinite' }} />
            <div className="p-3 flex flex-col gap-2">
                <div style={{ height: 14, width: '60%', backgroundColor: '#F0EBE3', borderRadius: 4 }} />
                <div style={{ height: 12, width: '40%', backgroundColor: '#F0EBE3', borderRadius: 4 }} />
            </div>
        </div>
    )
}

// ── Home Page ──────────────────────────────────────────────────────────────────
export default function Home() {
    const isMobile = useIsMobile()
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedPost, setSelectedPost] = useState(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const res = await workApi.getFeed()
            const data = res.data.data || []
            setPosts(data.map(normalizePost))
        } catch (err) {
            setError(err.response?.data?.error?.message || '載入失敗，請稍後再試')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const handleLikeToggle = async (post) => {
        setPosts(prev => prev.map(p =>
            p.id === post.id
                ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
                : p
        ))
        try {
            if (post.liked) await workApi.unlikeWork(post.id)
            else await workApi.likeWork(post.id)
        } catch {
            setPosts(prev => prev.map(p =>
                p.id === post.id
                    ? { ...p, liked: post.liked, likes: post.likes }
                    : p
            ))
        }
    }

    // 由左至右瀑布流：將 posts 依欄高平衡分配，每篇去最矮的欄
    const colCount = isMobile ? 2 : 4
    const distributeToColumns = (items) => {
        const cols = Array.from({ length: colCount }, () => [])
        const heights = new Array(colCount).fill(0)
        items.forEach((item, idx) => {
            // 預估高度：有圖片用 3:4 比例，無圖片用固定 80px，footer 固定 56px
            const imgHeight = item.image ? 300 : 80
            const cardHeight = imgHeight + 56
            const shortestCol = heights.indexOf(Math.min(...heights))
            cols[shortestCol].push(item)
            heights[shortestCol] += cardHeight
        })
        return cols
    }
    const postColumns = !loading && !error && posts.length > 0
        ? distributeToColumns(posts)
        : []
    const skeletonColumns = loading
        ? Array.from({ length: colCount }, (_, ci) =>
            [true, false, true, false, false, true, false, true]
                .filter((_, i) => i % colCount === ci)
        )
        : []

    const colGap = isMobile ? 8 : 12
    const padding = isMobile ? '12px 12px' : '24px 60px'

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F5F1EC' }}>
            <div style={{ display: 'flex', gap: colGap, padding, alignItems: 'flex-start' }}>
                {loading ? (
                    skeletonColumns.map((col, ci) => (
                        <div key={ci} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: colGap }}>
                            {col.map((tall, i) => <SkeletonCard key={i} tall={tall} />)}
                        </div>
                    ))
                ) : error ? (
                    <div style={{ flex: 1, textAlign: 'center', padding: '80px 0', color: '#E07A5F', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14 }}>
                        {error}
                    </div>
                ) : posts.length === 0 ? (
                    <div style={{ flex: 1, textAlign: 'center', padding: '80px 0', color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14 }}>
                        目前還沒有任何作品 ✨
                    </div>
                ) : (
                    postColumns.map((col, ci) => (
                        <div key={ci} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: colGap }}>
                            {col.map(post => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    onLikeToggle={handleLikeToggle}
                                    onClick={() => setSelectedPost(post)}
                                />
                            ))}
                        </div>
                    ))
                )}
            </div>

            {selectedPost && (
                <PostModal
                    item={selectedPost}
                    author={selectedPost.author}
                    onClose={() => setSelectedPost(null)}
                    zIndex={1000}
                />
            )}
        </div>
    )
}
