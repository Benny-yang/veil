/**
 * utils/normalizers.js
 * 後端回應資料的統一轉換函式，集中管理 API 欄位映射邏輯。
 * 所有函式均 export，供頁面 import 使用，確保可測試性。
 */

// ── Zone (私藏) ──────────────────────────────────────────────────────────────

/**
 * 計算距截止日的剩餘時間文字
 */
export function timeLeftText(endsAt) {
    if (!endsAt) return null
    const diff = new Date(endsAt) - new Date()
    if (diff <= 0) return '已截止'
    if (diff < 86400000) {
        const hours = Math.ceil(diff / 3600000)
        return `剩餘 ${hours} 小時`
    }
    const days = Math.ceil(diff / 86400000)
    return `剩餘 ${days} 天`
}

/**
 * 是否距截止不到 24 小時（緊迫）
 */
export function isUrgent(endsAt) {
    if (!endsAt) return false
    const diff = new Date(endsAt) - new Date()
    return diff > 0 && diff < 24 * 3600000
}

/**
 * 後端 Zone 原始資料 → UI 資料結構
 * 涵蓋 Explore、ZoneDetail、PrivateCollection 等頁面所需欄位。
 */
export function normalizeZone(z) {
    const accepted = z.accepted_count ?? 0
    const total = z.total_slots ?? 0
    const photos = z.photos || z.images || []
    const coverPhoto = photos.find(p => p.is_cover) || photos[0]
    const images = photos.map(p => p.url || p).filter(Boolean)
    const image = coverPhoto?.url || images[0] || null
    return {
        id: z.id,
        title: z.title || '無標題',
        image,                                           // 封面單張 URL（Explore / Card 用）
        images,                                          // 所有圖片 URL 陣列
        category: z.category || 'other',
        seller: {
            name: z.seller?.username || z.seller_username || '',
            avatar: z.seller?.avatar_url || null,
            avatarColor: z.seller?.avatar_color || '#C4A882',
            rating: z.seller?.rating ?? null,
        },
        timeLeft: timeLeftText(z.ends_at),
        timeUrgent: isUrgent(z.ends_at),
        slots: `${accepted}/${total}`,
        slotsLeft: total - accepted,
        threshold: z.min_credit_score ? String(z.min_credit_score) : null,
        pendingCount: z.pending_count ?? 0,
        description: z.description || '',
        status: z.status,
        raw: z,                                          // 保留原始資料供編輯用
    }
}

// ── Application (申請) ───────────────────────────────────────────────────────

/**
 * 後端 Application 原始資料 → UI 資料結構
 */
export function normalizeApp(a) {
    return {
        id: a.id,
        name: a.applicant?.username || a.user?.username || '',
        avatar: a.applicant?.avatar_url || a.user?.avatar_url || null,
        avatarColor: a.applicant?.avatar_color || '#C4A882',
        intro: a.message || a.intro || '',
        appliedAt: a.created_at
            ? new Date(a.created_at).toLocaleDateString('zh-TW') : '',
        creditScore: a.applicant?.credit_score ?? a.credit_score ?? 50,
        status: a.status || 'pending',
    }
}

// ── Post (作品牆貼文) ─────────────────────────────────────────────────────────

/**
 * 後端 Post 原始資料 → Home 頁面作品牆 UI 資料結構
 */
export function normalizePost(p) {
    const images = (p.images || []).map(img => img.url || img).filter(Boolean)
    return {
        id: p.id,
        author: {
            name: p.author?.username || p.author_username || '',
            displayName: p.author?.display_name || p.author_display_name || '',
            avatar: p.author?.avatar_url || p.author_avatar_url || null,
            avatarColor: '#C4A882',
        },
        image: images[0] || '',
        images,
        likes: p.like_count ?? p.likes ?? 0,
        comments: p.comment_count ?? p.comments ?? 0,
        liked: p.liked ?? false,
        desc: p.content || p.description || '',
        tags: p.tags || [],
    }
}

// ── Work (作品/WorkDetail) ───────────────────────────────────────────────────

/**
 * 後端 Post/Work 原始資料 → WorkDetail 頁面 UI 資料結構
 */
export function normalizeWork(w) {
    const images = (w.photos || w.images || []).map(img => img.url || img).filter(Boolean)
    return {
        id: w.id,
        images,
        image: images[0] || '',
        desc: w.content || w.description || '',
        tags: w.tags || [],
        likes: w.like_count ?? 0,
        comments: w.comment_count ?? 0,
        liked: w.liked ?? false,
        author: {
            name: w.author?.username || '',
            displayName: w.author?.display_name || w.author?.username || '',
            avatar: w.author?.avatar_url || null,
            avatarColor: w.author?.avatar_color || '#C4A882',
        },
    }
}

/**
 * 後端 Comment 原始資料 → UI 資料結構
 */
export function normalizeComment(c) {
    return {
        id: c.id,
        content: c.content || '',
        author: {
            name: c.author?.username || '',
            avatar: c.author?.avatar_url || null,
            avatarColor: c.author?.avatar_color || '#C4A882',
        },
        createdAt: c.created_at
            ? new Date(c.created_at).toLocaleDateString('zh-TW') : '',
    }
}

// ── Profile 頁面作品（workApi.getWorks 回傳） ─────────────────────────────────

/**
 * 後端 Work（個人主頁）原始資料 → Profile 頁面 UI 資料結構
 */
export function normalizeProfileWork(w) {
    const photos = w.photos || w.images || []
    const coverPhoto = photos.find(img => img.is_cover) || photos[0]
    const allImages = photos.map(img => img.url || img).filter(Boolean)
    return {
        id: w.id,
        image: coverPhoto?.url || allImages[0] || '',
        images: allImages,
        desc: w.content || w.description || '',
        likes: w.like_count ?? 0,
        comments: w.comment_count ?? 0,
        liked: w.liked ?? false,
        tags: w.tags || [],
    }
}

// ── CreateWork API payload 組裝 ──────────────────────────────────────────────

/**
 * 組裝 POST /users/me/works 的 request body
 * 對應後端 CreateWorkRequest struct:
 *   Description string       `json:"description" binding:"required"`
 *   Photos      []PhotoInput `json:"photos" binding:"required,min=1"`
 *     PhotoInput: { url string, sort_order int, is_cover bool }
 *
 * @param {string} description - 作品說明（必填，後端 required）
 * @param {{ url: string, id: string, coverId: string }[]} photos - 已上傳的照片
 * @param {string} coverId - 封面照片 id
 */
export function buildCreateWorkPayload({ description, photos, coverId }) {
    return {
        description: description ?? '',
        photos: photos.map((p, i) => ({
            url: p.url,
            sort_order: i,
            is_cover: p.id === coverId || (!coverId && i === 0),
        })),
    }
}
