/**
 * pageNormalizers.test.js
 * 測試 ZoneDetail / ReviewApplications / WorkDetail 頁面的 normalize 函式
 * 以及 PhotoUpload 的照片處理邏輯
 */
import { describe, it, expect } from 'vitest'

// ── 從頁面複製出來的 normalizer（保持與頁面一致）─────────────────────────────

/**
 * ZoneDetail.jsx: timeLeftText
 */
function timeLeftText(endsAt) {
    if (!endsAt) return null
    const diff = new Date(endsAt) - new Date()
    if (diff <= 0) return '已截止'
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(hours / 24)
    if (hours < 24) return `剩餘 ${hours} 小時`
    return `剩餘 ${days} 天`
}

function isUrgent(endsAt) {
    if (!endsAt) return false
    const diff = new Date(endsAt) - new Date()
    return diff > 0 && diff < 24 * 3600000
}

function normalizeZone(z) {
    const accepted = z.accepted_count ?? 0
    const total = z.total_slots ?? 0
    const images = (z.photos || z.images || []).map(p => p.url || p).filter(Boolean)
    return {
        id: z.id,
        title: z.title || '無標題',
        images,
        seller: {
            name: z.seller?.username || '',
            avatar: z.seller?.avatar_url || null,
            avatarColor: z.seller?.avatar_color || '#C4A882',
            rating: z.seller?.rating ?? null,
        },
        timeLeft: timeLeftText(z.ends_at),
        timeUrgent: isUrgent(z.ends_at),
        slots: `${accepted}/${total}`,
        slotsLeft: total - accepted,
        threshold: z.min_credit_score ? String(z.min_credit_score) : null,
        description: z.description || '',
        status: z.status,
    }
}

/**
 * ReviewApplications.jsx: normalizeApp
 */
function normalizeApp(a) {
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

/**
 * WorkDetail.jsx: normalizeWork + normalizeComment
 */
function normalizeWork(w) {
    const images = (w.images || []).map(img => img.url || img).filter(Boolean)
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

function normalizeComment(c) {
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

// ── 測試資料工廠 ──────────────────────────────────────────────────────────────

function makeZoneRaw(overrides = {}) {
    return {
        id: 'z1',
        title: '春季洋裝私藏',
        description: '限量 3 名',
        accepted_count: 1,
        total_slots: 3,
        min_credit_score: 80,
        status: '進行中',
        ends_at: null,
        photos: [{ url: 'https://cdn.example.com/photo1.jpg' }],
        seller: {
            username: 'seller1',
            avatar_url: 'https://cdn.example.com/seller.jpg',
            avatar_color: '#C4A882',
            rating: 4.8,
        },
        ...overrides,
    }
}

function makeApplicationRaw(overrides = {}) {
    return {
        id: 'app1',
        message: '我很喜歡古著！',
        created_at: '2024-03-01T10:00:00Z',
        status: 'pending',
        credit_score: 90,
        applicant: {
            username: 'buyer1',
            avatar_url: null,
            avatar_color: '#8C8479',
            credit_score: 90,
        },
        ...overrides,
    }
}

function makeWorkRaw(overrides = {}) {
    return {
        id: 'w1',
        content: '日本帶回的美麗洋裝 #古著 #日本',
        tags: ['古著', '日本'],
        like_count: 10,
        comment_count: 3,
        liked: false,
        images: [
            { url: 'https://cdn.example.com/work1.jpg' },
            { url: 'https://cdn.example.com/work2.jpg' },
        ],
        author: {
            username: 'seller1',
            display_name: 'Seller One',
            avatar_url: 'https://cdn.example.com/avatar.jpg',
            avatar_color: '#C4A882',
        },
        ...overrides,
    }
}

// ── ZoneDetail: normalizeZone ─────────────────────────────────────────────────
describe('normalizeZone', () => {
    it('正常資料：完整轉換', () => {
        const result = normalizeZone(makeZoneRaw())
        expect(result.id).toBe('z1')
        expect(result.title).toBe('春季洋裝私藏')
        expect(result.slots).toBe('1/3')
        expect(result.slotsLeft).toBe(2)
        expect(result.threshold).toBe('80')
        expect(result.images).toEqual(['https://cdn.example.com/photo1.jpg'])
        expect(result.seller.name).toBe('seller1')
        expect(result.seller.rating).toBe(4.8)
        expect(result.description).toBe('限量 3 名')
    })

    it('沒有 title 時回傳「無標題」', () => {
        const result = normalizeZone(makeZoneRaw({ title: '' }))
        expect(result.title).toBe('無標題')
    })

    it('沒有 photos 時 images 為空陣列', () => {
        const result = normalizeZone(makeZoneRaw({ photos: [] }))
        expect(result.images).toEqual([])
    })

    it('同時支援 photos 和 images 欄位', () => {
        const result = normalizeZone(makeZoneRaw({
            photos: undefined,
            images: [{ url: 'https://cdn.example.com/from-images.jpg' }]
        }))
        expect(result.images).toEqual(['https://cdn.example.com/from-images.jpg'])
    })

    it('min_credit_score 為 0 時 threshold 為 null', () => {
        const result = normalizeZone(makeZoneRaw({ min_credit_score: 0 }))
        expect(result.threshold).toBeNull()
    })

    it('seller 為 null 時使用預設值', () => {
        const result = normalizeZone(makeZoneRaw({ seller: null }))
        expect(result.seller.name).toBe('')
        expect(result.seller.avatar).toBeNull()
        expect(result.seller.avatarColor).toBe('#C4A882')
        expect(result.seller.rating).toBeNull()
    })

    it('seller.rating 為 0 時正常顯示（不被 nullish 過濾）', () => {
        const result = normalizeZone(makeZoneRaw({ seller: { ...makeZoneRaw().seller, rating: 0 } }))
        expect(result.seller.rating).toBe(0)
    })

    it('ends_at 已過期時 timeLeft 為「已截止」', () => {
        const past = new Date(Date.now() - 86400000).toISOString()
        const result = normalizeZone(makeZoneRaw({ ends_at: past }))
        expect(result.timeLeft).toBe('已截止')
        expect(result.timeUrgent).toBe(false)
    })

    it('ends_at 為 null 時 timeLeft 為 null', () => {
        const result = normalizeZone(makeZoneRaw({ ends_at: null }))
        expect(result.timeLeft).toBeNull()
        expect(result.timeUrgent).toBe(false)
    })

    it('accepted_count 和 total_slots 為 undefined 時預設為 0', () => {
        const result = normalizeZone(makeZoneRaw({ accepted_count: undefined, total_slots: undefined }))
        expect(result.slots).toBe('0/0')
        expect(result.slotsLeft).toBe(0)
    })
})

// ── ReviewApplications: normalizeApp ─────────────────────────────────────────
describe('normalizeApp', () => {
    it('正常資料：完整轉換', () => {
        const result = normalizeApp(makeApplicationRaw())
        expect(result.id).toBe('app1')
        expect(result.name).toBe('buyer1')
        expect(result.intro).toBe('我很喜歡古著！')
        expect(result.creditScore).toBe(90)
        expect(result.status).toBe('pending')
        expect(result.avatar).toBeNull()
    })

    it('status 預設為 pending（無 status 欄位）', () => {
        const result = normalizeApp(makeApplicationRaw({ status: undefined }))
        expect(result.status).toBe('pending')
    })

    it('支援 user 欄位（兩種命名都接受）', () => {
        const result = normalizeApp(makeApplicationRaw({
            applicant: undefined,
            user: { username: 'other_user', avatar_url: null, avatar_color: '#C4A882', credit_score: 75 },
        }))
        expect(result.name).toBe('other_user')
    })

    it('creditScore：優先從 applicant.credit_score 取，fallback 為 50', () => {
        const result = normalizeApp(makeApplicationRaw({
            applicant: { username: 'u', credit_score: undefined },
            credit_score: undefined,
        }))
        expect(result.creditScore).toBe(50)
    })

    it('created_at 為空時 appliedAt 為空字串', () => {
        const result = normalizeApp(makeApplicationRaw({ created_at: null }))
        expect(result.appliedAt).toBe('')
    })

    it('avatarColor 預設為 #C4A882', () => {
        const result = normalizeApp(makeApplicationRaw({
            applicant: { username: 'u', credit_score: 50, avatar_color: undefined },
        }))
        expect(result.avatarColor).toBe('#C4A882')
    })
})

// ── WorkDetail: normalizeWork ─────────────────────────────────────────────────
describe('normalizeWork', () => {
    it('正常資料：完整轉換', () => {
        const result = normalizeWork(makeWorkRaw())
        expect(result.id).toBe('w1')
        expect(result.images).toHaveLength(2)
        expect(result.image).toBe('https://cdn.example.com/work1.jpg')
        expect(result.desc).toBe('日本帶回的美麗洋裝 #古著 #日本')
        expect(result.tags).toEqual(['古著', '日本'])
        expect(result.likes).toBe(10)
        expect(result.liked).toBe(false)
        expect(result.author.name).toBe('seller1')
        expect(result.author.displayName).toBe('Seller One')
    })

    it('沒有 images 時 images/image 為空', () => {
        const result = normalizeWork(makeWorkRaw({ images: [] }))
        expect(result.images).toEqual([])
        expect(result.image).toBe('')
    })

    it('liked 為 undefined 時預設為 false', () => {
        const result = normalizeWork(makeWorkRaw({ liked: undefined }))
        expect(result.liked).toBe(false)
    })

    it('content 優先於 description', () => {
        const result = normalizeWork(makeWorkRaw({ content: '內文', description: '備用' }))
        expect(result.desc).toBe('內文')
    })

    it('沒有 content 時使用 description', () => {
        const result = normalizeWork(makeWorkRaw({ content: '', description: '備用說明' }))
        expect(result.desc).toBe('備用說明')
    })

    it('author 為 null 時使用預設值', () => {
        const result = normalizeWork(makeWorkRaw({ author: null }))
        expect(result.author.name).toBe('')
        expect(result.author.displayName).toBe('')
        expect(result.author.avatar).toBeNull()
        expect(result.author.avatarColor).toBe('#C4A882')
    })

    it('tags 為 undefined 時預設為空陣列', () => {
        const result = normalizeWork(makeWorkRaw({ tags: undefined }))
        expect(result.tags).toEqual([])
    })
})

// ── WorkDetail: normalizeComment ─────────────────────────────────────────────
describe('normalizeComment', () => {
    it('正常資料：完整轉換', () => {
        const raw = {
            id: 'c1',
            content: '很美！',
            created_at: '2024-03-01T10:00:00Z',
            author: { username: 'fan1', avatar_url: null, avatar_color: '#8C8479' },
        }
        const result = normalizeComment(raw)
        expect(result.id).toBe('c1')
        expect(result.content).toBe('很美！')
        expect(result.author.name).toBe('fan1')
        expect(result.author.avatarColor).toBe('#8C8479')
        expect(result.createdAt).not.toBe('')
    })

    it('content 為空時回傳空字串', () => {
        const raw = { id: 'c2', content: '', created_at: null, author: {} }
        const result = normalizeComment(raw)
        expect(result.content).toBe('')
        expect(result.createdAt).toBe('')
    })

    it('author 無 avatar_url 時 avatar 為 null', () => {
        const raw = { id: 'c3', content: '👍', created_at: null, author: { username: 'u' } }
        const result = normalizeComment(raw)
        expect(result.author.avatar).toBeNull()
        expect(result.author.avatarColor).toBe('#C4A882')
    })
})

// ── PhotoUpload 照片篩選邏輯 ──────────────────────────────────────────────────
/**
 * 模擬 NewZoneModal/EditZoneModal 的照片分類邏輯：
 *   - p.file 存在 → 新上傳，需要呼叫 mediaApi.upload
 *   - p.url 是後端 URL → 既有照片，直接保留
 *   - p.url 是 data: → 無效（舊 bug 狀況），應排除
 */
function classifyPhotos(photos) {
    const toUpload = photos.filter(p => !!p.file)
    const existing = photos.filter(p => !p.file && p.url && !p.url.startsWith('data:'))
    const invalid = photos.filter(p => !p.file && (!p.url || p.url.startsWith('data:')))
    return { toUpload, existing, invalid }
}

describe('PhotoUpload 照片分類邏輯', () => {
    it('新上傳照片（有 file 物件）被歸為 toUpload', () => {
        const photos = [
            { id: '1', url: 'data:image/png;base64,abc', file: new File([''], 'photo.jpg') },
        ]
        const { toUpload, existing, invalid } = classifyPhotos(photos)
        expect(toUpload).toHaveLength(1)
        expect(existing).toHaveLength(0)
        expect(invalid).toHaveLength(0)
    })

    it('後端 URL 照片（無 file）被歸為 existing', () => {
        const photos = [
            { id: '2', url: 'https://cdn.example.com/photo.jpg' },
        ]
        const { toUpload, existing } = classifyPhotos(photos)
        expect(existing).toHaveLength(1)
        expect(toUpload).toHaveLength(0)
    })

    it('舊 bug：純 data: URL（無 file）被歸為 invalid，不會送到後端', () => {
        const photos = [
            { id: '3', url: 'data:image/png;base64,xyz' },  // 沒有 file 物件
        ]
        const { invalid } = classifyPhotos(photos)
        expect(invalid).toHaveLength(1)
    })

    it('混合情況：正確分類', () => {
        const photos = [
            { id: '1', url: 'data:image/png;base64,abc', file: new File([''], 'new.jpg') },
            { id: '2', url: 'https://cdn.example.com/exist.jpg' },
            { id: '3', url: 'data:image/png;base64,old' },  // 舊 bug 狀況
        ]
        const { toUpload, existing, invalid } = classifyPhotos(photos)
        expect(toUpload).toHaveLength(1)
        expect(existing).toHaveLength(1)
        expect(invalid).toHaveLength(1)
    })
})
