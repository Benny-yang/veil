import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'
import PostModal from '../components/PostModal'
import { postApi } from '../services/api'
import { normalizePost } from '../utils/normalizers'


// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({ post, onLikeToggle, onClick }) {
    const isMobile = useIsMobile()
    const navigate = useNavigate()
    const imgHeight = isMobile ? 140 : 200

    return (
        <div
            className="rounded-lg overflow-hidden flex flex-col cursor-pointer"
            style={{
                backgroundColor: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                transition: 'box-shadow 0.2s'
            }}
            onClick={onClick}
        >
            {post.image ? (
                <img src={post.image} alt={post.author.name}
                    className="w-full object-cover" style={{ height: imgHeight }} />
            ) : (
                <div className="w-full flex items-center justify-center"
                    style={{ height: imgHeight, backgroundColor: '#F0EBE3', color: '#B0A89A', fontSize: 12 }}>
                    無圖片
                </div>
            )}
            <div className="p-3 flex flex-col gap-2">
                <div
                    className="flex items-center gap-2"
                    onClick={e => { e.stopPropagation(); navigate(`/profile/${post.author.name}`) }}
                    style={{ cursor: 'pointer' }}
                >
                    {post.author.avatar ? (
                        <img src={post.author.avatar} alt={post.author.name}
                            className="rounded-full flex-shrink-0"
                            style={{ width: isMobile ? 22 : 28, height: isMobile ? 22 : 28, objectFit: 'cover' }} />
                    ) : (
                        <div className="rounded-full flex-shrink-0"
                            style={{ width: isMobile ? 22 : 28, height: isMobile ? 22 : 28, backgroundColor: post.author.avatarColor }} />
                    )}
                    <span style={{
                        fontSize: isMobile ? 11 : 13, fontWeight: 500, color: '#1C1A18',
                        fontFamily: 'Noto Sans TC, sans-serif'
                    }}>
                        {post.author.displayName || post.author.name}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={e => { e.stopPropagation(); onLikeToggle(post) }}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            display: 'flex', alignItems: 'center', gap: 4,
                            color: post.liked ? '#C4A882' : '#8C8479', fontSize: 11,
                            fontFamily: 'Noto Sans TC, sans-serif'
                        }}
                    >
                        <Heart size={13} strokeWidth={1.5} fill={post.liked ? '#C4A882' : 'none'} />
                        {post.likes}
                    </button>
                    <span style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        color: '#8C8479', fontSize: 11, fontFamily: 'Noto Sans TC, sans-serif'
                    }}>
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

// ── Home Page ─────────────────────────────────────────────────────────────────
export default function Home() {
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedPost, setSelectedPost] = useState(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const res = await postApi.getFeed()
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
        // Optimistic update
        setPosts(prev => prev.map(p =>
            p.id === post.id
                ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
                : p
        ))
        try {
            if (post.liked) {
                await postApi.unlikePost(post.id)
            } else {
                await postApi.likePost(post.id)
            }
        } catch {
            // rollback on failure
            setPosts(prev => prev.map(p =>
                p.id === post.id
                    ? { ...p, liked: post.liked, likes: post.likes }
                    : p
            ))
        }
    }

    // 瀑布流：4 欄分配
    const columns = [[], [], [], []]
    posts.forEach((post, i) => { columns[i % 4].push(post) })

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F5F1EC' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full"
                style={{ padding: '24px 60px' }}>
                {loading ? (
                    // Skeleton
                    Array.from({ length: 4 }).map((_, ci) => (
                        <div key={ci} className="flex flex-col gap-3">
                            {Array.from({ length: 3 }).map((__, ri) => (
                                <SkeletonCard key={ri} />
                            ))}
                        </div>
                    ))
                ) : error ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 0', color: '#E07A5F', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14 }}>
                        {error}
                    </div>
                ) : posts.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 0', color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14 }}>
                        目前還沒有任何貼文 ✨
                    </div>

                ) : (
                    columns.map((col, i) => (
                        <div key={i} className="flex flex-col gap-3">
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
