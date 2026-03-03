import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Plus, Star, BadgeCheck, Heart, MessageCircle, Settings } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'
import PostModal from '../components/PostModal'
import { useAuth } from '../context/AuthContext'
import { userApi, workApi, userExtendedApi, mediaApi } from '../services/api'
import { buildCreateWorkPayload } from '../utils/normalizers'


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
                // 同時保留 file 物件供上傳用
                accumulated.push({ id: Date.now() + Math.random(), url: ev.target.result, file })
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
function AddWorkModal({ onClose, onSuccess }) {
    const [values, setValues] = React.useState({
        desc: '', photos: [], coverId: '',
    })
    const [saving, setSaving] = React.useState(false)
    const [saveError, setSaveError] = React.useState('')
    const onChange = (k, v) => setValues(prev => ({ ...prev, [k]: v }))
    const focus = e => e.target.style.borderColor = '#C4A882'
    const blur = e => e.target.style.borderColor = '#E8DDD0'
    const canSubmit = values.photos.length > 0 && !saving

    const handlePublish = async () => {
        if (!canSubmit) return
        setSaving(true)
        setSaveError('')
        try {
            // 1. 依序上傳所有照片取得 URL，保留 localId 供封面判斷
            const uploadedImages = []
            for (const photo of values.photos) {
                const res = await mediaApi.upload(photo.file)
                const url = res.data.data?.url || res.data.url
                if (url) uploadedImages.push({ url, id: photo.id })
            }
            if (uploadedImages.length === 0) {
                setSaveError('照片上傳失敗，請再試一次')
                setSaving(false)
                return
            }
            // 2. 建立作品（POST /users/me/works）
            await workApi.createWork(buildCreateWorkPayload({
                description: values.desc.trim(),
                photos: uploadedImages,
                coverId: values.coverId,
            }))
            onSuccess()
            onClose()
        } catch (err) {
            setSaveError(err.response?.data?.error?.message || '發布失敗，請稍後再試')
        } finally {
            setSaving(false)
        }
    }

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
                    <div>
                        <WFieldLabel>作品描述</WFieldLabel>
                        <textarea value={values.desc} onChange={e => onChange('desc', e.target.value)}
                            placeholder="描述這件作品的故事、材質、狀況⋯ 可加上 #古著 #復古 等標籤"
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
                </div>

                {saveError && (
                    <div style={{ fontSize: 12, color: '#E07A5F', fontFamily: 'Noto Sans TC, sans-serif', textAlign: 'center' }}>{saveError}</div>
                )}

                {/* 操作按鈕 */}
                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={onClose} disabled={saving} style={{
                        flex: 1, padding: '13px 0', borderRadius: 8,
                        border: '1px solid #E8DDD0', backgroundColor: '#FFFFFF',
                        fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif', color: '#8C8479', cursor: 'pointer',
                    }}>取消</button>
                    <button onClick={handlePublish} disabled={!canSubmit} style={{
                        flex: 1, padding: '13px 0', borderRadius: 8, border: 'none',
                        backgroundColor: canSubmit ? '#1C1A18' : '#D4CCC4',
                        fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif',
                        fontWeight: 600, color: '#F2EDE6',
                        cursor: canSubmit ? 'pointer' : 'not-allowed',
                    }}>{saving ? '發布中⋯' : '發布作品'}</button>
                </div>
                <div style={{ fontSize: 11, color: '#B0A89A', textAlign: 'center', fontFamily: 'Noto Sans TC, sans-serif' }}>
                    發布後可隨時在個人頁面編輯或刪除
                </div>
            </div>
        </div>
    )
}


// ─────────────────────────────────────────────────────────────────────────────
// 粉絲 / 追蹤名單 Modal
// ─────────────────────────────────────────────────────────────────────────────


function FollowListModal({ title, list, loading, onClose }) {
    const navigate = useNavigate()
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
                    {loading ? (
                        <div style={{ padding: '24px 20px', color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 13 }}>載入中⋯</div>
                    ) : list.length === 0 ? (
                        <div style={{ padding: '24px 20px', color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 13 }}>目前沒有資料</div>
                    ) : list.map(u => (
                        <div
                            key={u.id}
                            onClick={() => { onClose(); navigate(`/profile/${u.username || u.name}`) }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 20px', transition: 'background 0.15s', cursor: 'pointer',
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAF7F4'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {u.avatar_url || u.avatar ? (
                                <img src={u.avatar_url || u.avatar} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                                <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#E8DDD0', flexShrink: 0 }} />
                            )}
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>{u.display_name || u.displayName || u.username || u.name}</div>
                                <div style={{ fontSize: 12, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>@{u.username || u.name}</div>
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


function RatingsModal({ reviews, onClose }) {
    const avg = reviews.length > 0
        ? (reviews.reduce((s, r) => s + (r.rating ?? r.stars ?? 0), 0) / reviews.length).toFixed(1)
        : '0.0'
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
                            <div style={{ fontSize: 12, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>{reviews.length} 則評價</div>
                        </div>
                        <div style={{ marginLeft: 8, fontSize: 11, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', lineHeight: 1.6 }}>
                            所有評價均為匿名，<br />以保護買賣雙方隱私。
                        </div>
                    </div>
                </div>
                <div style={{ height: 1, backgroundColor: '#E8DDD0' }} />
                {/* 評價列表 */}
                <div style={{ overflowY: 'auto', padding: '8px 0' }}>
                    {reviews.map(r => (
                        <div key={r.id} style={{ padding: '16px 20px', borderBottom: '1px solid #F5F1EC' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div style={{ display: 'flex', gap: 3 }}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} size={13} color="#C4A882" fill={(r.rating ?? r.stars ?? 0) >= s ? '#C4A882' : 'none'} strokeWidth={1.5} />
                                    ))}
                                </div>
                                <span style={{ fontSize: 11, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif' }}>
                                    {r.created_at ? new Date(r.created_at).toLocaleDateString('zh-TW') : r.date}
                                </span>
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

// 後端 Work 轉換
function normalizeWork(w) {
    const images = (w.images || []).map(img => img.url || img).filter(Boolean)
    return {
        id: w.id,
        image: images[0] || '',
        images,
        desc: w.description || '',
        tags: w.tags || [],
        likes: w.like_count ?? 0,
        comments: w.comment_count ?? 0,
    }
}

export default function Profile() {
    const { userId: username } = useParams()
    const { currentUser } = useAuth()
    const isOwner = currentUser?.username === username || (!username && !!currentUser)
    const targetUsername = username || currentUser?.username

    const [profileData, setProfileData] = useState(null)
    const [works, setWorks] = useState([])
    const [loadingProfile, setLoadingProfile] = useState(true)
    const [profileError, setProfileError] = useState('')

    const [followed, setFollowed] = useState(false)
    const [followLoading, setFollowLoading] = useState(false)
    const [showAddWork, setShowAddWork] = useState(false)
    const [selectedWork, setSelectedWork] = useState(null)
    const [showFollowers, setShowFollowers] = useState(false)
    const [showFollowing, setShowFollowing] = useState(false)
    const [showRatings, setShowRatings] = useState(false)
    const [followersList, setFollowersList] = useState([])
    const [followingList, setFollowingList] = useState([])
    const [loadingFollowers, setLoadingFollowers] = useState(false)
    const [loadingFollowing, setLoadingFollowing] = useState(false)
    const [reviews, setReviews] = useState([])
    const isMobile = useIsMobile()

    const loadProfile = useCallback(async () => {
        if (!targetUsername) return
        setLoadingProfile(true)
        setProfileError('')
        try {
            const [profileRes, worksRes] = await Promise.all([
                userApi.getProfile(targetUsername),
                workApi.getWorks(targetUsername),
            ])
            const p = profileRes.data.data || profileRes.data
            setProfileData(p)
            setFollowed(p.is_following ?? false)
            const ws = worksRes.data.data || []
            setWorks(ws.map(normalizeWork))
        } catch {
            setProfileError('載入失敗，請稍後再試')
        } finally {
            setLoadingProfile(false)
        }
    }, [targetUsername])

    useEffect(() => { loadProfile() }, [loadProfile])

    const handleFollowToggle = async () => {
        if (followLoading) return
        setFollowLoading(true)
        const wasFollowed = followed
        setFollowed(!wasFollowed)
        try {
            if (wasFollowed) { await userApi.unfollow(targetUsername) }
            else { await userApi.follow(targetUsername) }
            // 刷新最新 follower count
            const res = await userApi.getProfile(targetUsername)
            setProfileData(res.data.data || res.data)
        } catch {
            setFollowed(wasFollowed) // rollback
        } finally {
            setFollowLoading(false)
        }
    }

    const openFollowers = async () => {
        setShowFollowers(true)
        setLoadingFollowers(true)
        try {
            const res = await userExtendedApi.getFollowers(targetUsername)
            setFollowersList(res.data.data || [])
        } catch { setFollowersList([]) }
        finally { setLoadingFollowers(false) }
    }

    const openFollowing = async () => {
        setShowFollowing(true)
        setLoadingFollowing(true)
        try {
            const res = await userExtendedApi.getFollowing(targetUsername)
            setFollowingList(res.data.data || [])
        } catch { setFollowingList([]) }
        finally { setLoadingFollowing(false) }
    }

    const openRatings = async () => {
        setShowRatings(true)
        try {
            const res = await userExtendedApi.getReviews(targetUsername)
            setReviews(res.data.data || [])
        } catch { setReviews([]) }
    }

    if (loadingProfile) {
        return (
            <div style={{ minHeight: 'calc(100vh - 60px)', backgroundColor: '#F2EDE6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14 }}>載入中⋯</div>
            </div>
        )
    }

    if (profileError || !profileData) {
        return (
            <div style={{ minHeight: 'calc(100vh - 60px)', backgroundColor: '#F2EDE6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: '#E07A5F', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14 }}>{profileError || '找不到此用戶'}</div>
            </div>
        )
    }

    const user = {
        name: profileData.username,
        displayName: profileData.display_name || profileData.username,
        avatar: profileData.avatar_url || null,
        avatarColor: profileData.avatar_color || '#E8DDD0',
        bio: profileData.bio || '',
        verified: profileData.is_verified ?? profileData.real_person_verified ?? false,
        followers: profileData.follower_count ?? profileData.followers_count ?? 0,
        following: profileData.following_count ?? 0,
        creditScore: profileData.credit_score ?? 50,
        rating: profileData.rating ?? 0,
        dealCount: profileData.deal_count ?? 0,
    }

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
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', backgroundColor: user.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: 36, fontWeight: 700, color: '#FFFFFF', fontFamily: 'Noto Sans TC, sans-serif', lineHeight: 1 }}>
                                        {(user.displayName || user.name || '').charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
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
                                        <button onClick={handleFollowToggle} disabled={followLoading} style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: '7px 18px', borderRadius: 6,
                                            border: followed ? '1.5px solid #C4A882' : 'none',
                                            backgroundColor: followed ? 'transparent' : '#1C1A18',
                                            color: followed ? '#C4A882' : '#F2EDE6',
                                            fontSize: 12, fontFamily: 'Noto Sans TC, sans-serif', fontWeight: 600,
                                            cursor: followLoading ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
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
                                { label: '粉絲', value: user.followers.toLocaleString(), onClick: openFollowers },
                                { label: '追蹤', value: user.following, onClick: openFollowing },
                            ].map(({ label, value, onClick }) => (
                                <button key={label} onClick={onClick} style={{
                                    display: 'flex', gap: 6, alignItems: 'baseline',
                                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                                }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>{value}</span>
                                    <span style={{ fontSize: 13, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>{label}</span>
                                </button>
                            ))}
                            {'rating' in profileData ? (
                                <button onClick={openRatings} style={{
                                    display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8,
                                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                                }}>
                                    <Star size={13} color="#C4A882" fill="#C4A882" strokeWidth={0} />
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1A18', fontFamily: 'Noto Sans TC, sans-serif' }}>{Number(user.rating).toFixed(1)}</span>
                                    <span style={{ fontSize: 12, color: '#8C8479', fontFamily: 'Noto Sans TC, sans-serif' }}>評價</span>
                                </button>
                            ) : null}
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
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 10,
                    }}>
                        {works.map(work => (
                            <WorkCell key={work.id} work={work} onClick={() => setSelectedWork(work)} />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAddWork && <AddWorkModal onClose={() => setShowAddWork(false)} onSuccess={loadProfile} />}
            {selectedWork && (
                <PostModal
                    item={selectedWork}
                    author={{ ...user, name: user.displayName || user.name }}
                    onClose={() => setSelectedWork(null)}
                    zIndex={2000}
                />
            )}
            {showFollowers && <FollowListModal title={`粉絲（${user.followers}）`} list={followersList} loading={loadingFollowers} onClose={() => setShowFollowers(false)} />}
            {showFollowing && <FollowListModal title={`追蹤中（${user.following}）`} list={followingList} loading={loadingFollowing} onClose={() => setShowFollowing(false)} />}
            {showRatings && <RatingsModal reviews={reviews} onClose={() => setShowRatings(false)} />}
        </div>
    )
}
