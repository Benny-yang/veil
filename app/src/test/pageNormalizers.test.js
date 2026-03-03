/**
 * pageNormalizers.test.js
 *
 * 測試 utils/normalizers.js 的所有 export 函式。
 * ✅ 直接 import 真實模組，而非 copy-paste。
 *    若 normalizers.js 修改與後端不一致，測試立即失敗。
 */
import { describe, it, expect } from 'vitest'
import {
    timeLeftText,
    isUrgent,
    normalizeZone,
    normalizeApp,
    normalizePost,
    normalizeWork,
    normalizeComment,
    buildCreateWorkPayload,
} from '../utils/normalizers'

// ── 測試資料工廠（Factory functions）────────────────────────────────────────────

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

function makePostRaw(overrides = {}) {
    return {
        id: 'p1',
        content: '日本帶回的美麗洋裝',
        description: '',
        like_count: 5,
        comment_count: 2,
        liked: false,
        tags: ['古著'],
        images: [{ url: 'https://cdn.example.com/img1.jpg' }],
        author: {
            username: 'seller1',
            display_name: 'Seller One',
            avatar_url: null,
            avatar_color: '#C4A882',
        },
        ...overrides,
    }
}

function makeWorkRaw(overrides = {}) {
    return {
        id: 'w1',
        content: '古董洋裝',
        tags: ['古著'],
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
            avatar_url: null,
            avatar_color: '#C4A882',
        },
        ...overrides,
    }
}

// ── timeLeftText ──────────────────────────────────────────────────────────────
describe('timeLeftText', () => {
    it('endsAt 為 null 時回傳 null', () => {
        expect(timeLeftText(null)).toBeNull()
    })

    it('endsAt 已過期回傳「已截止」', () => {
        const past = new Date(Date.now() - 86400000).toISOString()
        expect(timeLeftText(past)).toBe('已截止')
    })

    it('剩餘 < 24 小時：回傳「剩餘 X 小時」', () => {
        const soon = new Date(Date.now() + 3 * 3600000).toISOString()
        expect(timeLeftText(soon)).toMatch(/^剩餘 \d+ 小時$/)
    })

    it('剩餘 >= 24 小時：回傳「剩餘 X 天」', () => {
        const future = new Date(Date.now() + 3 * 86400000).toISOString()
        expect(timeLeftText(future)).toMatch(/^剩餘 \d+ 天$/)
    })
})

// ── isUrgent ──────────────────────────────────────────────────────────────────
describe('isUrgent', () => {
    it('endsAt 為 null 時為 false', () => {
        expect(isUrgent(null)).toBe(false)
    })

    it('已過期為 false', () => {
        const past = new Date(Date.now() - 1000).toISOString()
        expect(isUrgent(past)).toBe(false)
    })

    it('剩餘 < 24 小時為 true（緊迫）', () => {
        const soon = new Date(Date.now() + 3 * 3600000).toISOString()
        expect(isUrgent(soon)).toBe(true)
    })

    it('剩餘 >= 24 小時為 false（不緊迫）', () => {
        const later = new Date(Date.now() + 2 * 86400000).toISOString()
        expect(isUrgent(later)).toBe(false)
    })
})

// ── normalizeZone ─────────────────────────────────────────────────────────────
describe('normalizeZone', () => {
    it('正常資料完整轉換', () => {
        const result = normalizeZone(makeZoneRaw())
        expect(result.id).toBe('z1')
        expect(result.title).toBe('春季洋裝私藏')
        expect(result.slots).toBe('1/3')
        expect(result.slotsLeft).toBe(2)
        expect(result.threshold).toBe('80')
        expect(result.images).toEqual(['https://cdn.example.com/photo1.jpg'])
        expect(result.seller.name).toBe('seller1')
        expect(result.seller.rating).toBe(4.8)
    })

    it('title 為空時回傳「無標題」', () => {
        expect(normalizeZone(makeZoneRaw({ title: '' })).title).toBe('無標題')
    })

    it('同時支援 photos 和 images 欄位', () => {
        const result = normalizeZone(makeZoneRaw({
            photos: undefined,
            images: [{ url: 'https://cdn.example.com/img.jpg' }],
        }))
        expect(result.images).toEqual(['https://cdn.example.com/img.jpg'])
    })

    it('min_credit_score 為 0 時 threshold 為 null', () => {
        expect(normalizeZone(makeZoneRaw({ min_credit_score: 0 })).threshold).toBeNull()
    })

    it('seller 為 null 時使用預設值，rating 為 null', () => {
        const result = normalizeZone(makeZoneRaw({ seller: null }))
        expect(result.seller.name).toBe('')
        expect(result.seller.avatarColor).toBe('#C4A882')
        expect(result.seller.rating).toBeNull()
    })

    it('seller.rating 為 0 時仍顯示（不被 nullish 過濾掉）', () => {
        const raw = makeZoneRaw()
        raw.seller.rating = 0
        expect(normalizeZone(raw).seller.rating).toBe(0)
    })

    it('accepted/total 為 undefined 時 slots 預設為 0/0', () => {
        const result = normalizeZone(makeZoneRaw({ accepted_count: undefined, total_slots: undefined }))
        expect(result.slots).toBe('0/0')
        expect(result.slotsLeft).toBe(0)
    })
})

// ── normalizeApp ──────────────────────────────────────────────────────────────
describe('normalizeApp', () => {
    it('正常資料完整轉換', () => {
        const result = normalizeApp(makeApplicationRaw())
        expect(result.id).toBe('app1')
        expect(result.name).toBe('buyer1')
        expect(result.intro).toBe('我很喜歡古著！')
        expect(result.creditScore).toBe(90)
        expect(result.status).toBe('pending')
    })

    it('status 沒有時預設為 pending', () => {
        expect(normalizeApp(makeApplicationRaw({ status: undefined })).status).toBe('pending')
    })

    it('支援 user 欄位（兩種命名）', () => {
        const result = normalizeApp({
            ...makeApplicationRaw(),
            applicant: undefined,
            user: { username: 'other_user', credit_score: 75 },
        })
        expect(result.name).toBe('other_user')
    })

    it('creditScore 無值時 fallback 為 50', () => {
        const result = normalizeApp({
            ...makeApplicationRaw(),
            applicant: { username: 'u' },
            credit_score: undefined,
        })
        expect(result.creditScore).toBe(50)
    })

    it('created_at 為 null 時 appliedAt 為空字串', () => {
        expect(normalizeApp(makeApplicationRaw({ created_at: null })).appliedAt).toBe('')
    })
})

// ── normalizePost ─────────────────────────────────────────────────────────────
describe('normalizePost', () => {
    it('正常資料：author、image、likes 等欄位正確', () => {
        const result = normalizePost(makePostRaw())
        expect(result.id).toBe('p1')
        expect(result.image).toBe('https://cdn.example.com/img1.jpg')
        expect(result.likes).toBe(5)
        expect(result.author.name).toBe('seller1')
    })

    it('desc 優先取 content，fallback 是 description', () => {
        expect(normalizePost(makePostRaw({ content: '內文' })).desc).toBe('內文')
        expect(normalizePost(makePostRaw({ content: '', description: '備用' })).desc).toBe('備用')
    })

    it('like_count 優先，fallback 是 likes', () => {
        expect(normalizePost(makePostRaw({ like_count: undefined, likes: 3 })).likes).toBe(3)
    })

    it('liked 為 undefined 時預設 false', () => {
        expect(normalizePost(makePostRaw({ liked: undefined })).liked).toBe(false)
    })
})

// ── normalizeWork ─────────────────────────────────────────────────────────────
describe('normalizeWork', () => {
    it('正常資料完整轉換', () => {
        const result = normalizeWork(makeWorkRaw())
        expect(result.id).toBe('w1')
        expect(result.images).toHaveLength(2)
        expect(result.image).toBe('https://cdn.example.com/work1.jpg')
        expect(result.author.displayName).toBe('Seller One')
    })

    it('沒有 images 時 image 為空字串', () => {
        const result = normalizeWork(makeWorkRaw({ images: [] }))
        expect(result.image).toBe('')
    })

    it('author 為 null 時使用預設值', () => {
        const result = normalizeWork(makeWorkRaw({ author: null }))
        expect(result.author.name).toBe('')
        expect(result.author.avatarColor).toBe('#C4A882')
    })
})

// ── normalizeComment ──────────────────────────────────────────────────────────
describe('normalizeComment', () => {
    it('正常資料完整轉換', () => {
        const raw = {
            id: 'c1', content: '很美！',
            created_at: '2024-03-01T10:00:00Z',
            author: { username: 'fan1', avatar_url: null, avatar_color: '#8C8479' },
        }
        const result = normalizeComment(raw)
        expect(result.content).toBe('很美！')
        expect(result.author.name).toBe('fan1')
        expect(result.createdAt).not.toBe('')
    })

    it('created_at 為 null 時 createdAt 為空字串', () => {
        expect(normalizeComment({ id: 'c2', content: 'hi', created_at: null, author: {} }).createdAt).toBe('')
    })
})

// ── buildCreateWorkPayload ────────────────────────────────────────────────────
// 關鍵 contract test：驗證後端 CreateWorkRequest struct 的欄位名稱
describe('buildCreateWorkPayload', () => {
    it('輸出欄位必須符合後端 CreateWorkRequest struct', () => {
        const photos = [
            { url: 'https://cdn.example.com/a.jpg', id: 'local-1' },
            { url: 'https://cdn.example.com/b.jpg', id: 'local-2' },
        ]
        const payload = buildCreateWorkPayload({
            description: '美麗的古著',
            photos,
            coverId: 'local-1',
        })

        // 後端 struct: Description string `binding:"required"` + Photos []PhotoInput `binding:"required,min=1"`
        expect(payload).toHaveProperty('description', '美麗的古著')
        expect(payload).toHaveProperty('photos')
        expect(Array.isArray(payload.photos)).toBe(true)
        expect(payload.photos).toHaveLength(2)

        // 封面照片正確設定
        expect(payload.photos[0].is_cover).toBe(true)
        expect(payload.photos[1].is_cover).toBe(false)

        // sort_order 正確
        expect(payload.photos[0].sort_order).toBe(0)
        expect(payload.photos[1].sort_order).toBe(1)

        // photos 每個有 url（字串），不是 blob/DataURL
        expect(typeof payload.photos[0].url).toBe('string')

        // 確保沒有錯誤的舊欄位名稱
        expect(payload).not.toHaveProperty('image_urls')
        expect(payload).not.toHaveProperty('images')
    })

    it('沒有指定 coverId 時第一張自動設為封面', () => {
        const photos = [
            { url: 'https://cdn.example.com/a.jpg', id: 'local-1' },
            { url: 'https://cdn.example.com/b.jpg', id: 'local-2' },
        ]
        const payload = buildCreateWorkPayload({ description: '測試', photos, coverId: '' })
        expect(payload.photos[0].is_cover).toBe(true)
        expect(payload.photos[1].is_cover).toBe(false)
    })

    it('photos 格式中 url 為純字串，不含 File 物件', () => {
        const photos = [{ url: 'https://cdn.example.com/a.jpg', id: 'x' }]
        const payload = buildCreateWorkPayload({ description: '', photos, coverId: 'x' })
        expect(Object.keys(payload.photos[0])).toEqual(
            expect.arrayContaining(['url', 'sort_order', 'is_cover'])
        )
        expect(payload.photos[0]).not.toHaveProperty('file')
        expect(payload.photos[0]).not.toHaveProperty('id')
    })
})
