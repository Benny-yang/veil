import { describe, it, expect } from 'vitest'
import {
    normalizeWork,
    normalizeProfileWork,
} from '../utils/normalizers'

// ── buildProfileUser（從 Profile.jsx 提取）────────────────────────────────────
function buildProfileUser(profileData) {
    return {
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
}

// ── normalizeNotif（從 AppNav.jsx 提取）──────────────────────────────────────
function normalizeNotif(n) {
    return {
        id: n.id,
        type: n.type,
        read: n.read,
        avatar: n.actor?.avatar_url || null,
        user: n.actor?.username || null,
        text: n.message,
        meta: null,
    }
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('normalizeWork', () => {
    it('正常作品：photos 欄位正確映射所有欄位', () => {
        const raw = {
            id: 'w1',
            photos: [{ url: 'https://cdn.test/img1.jpg' }, { url: 'https://cdn.test/img2.jpg' }],
            description: '我的作品',
            tags: ['art', 'photo'],
            like_count: 10,
            comment_count: 3,
        }
        const result = normalizeWork(raw)
        expect(result.id).toBe('w1')
        expect(result.image).toBe('https://cdn.test/img1.jpg')
        expect(result.images).toHaveLength(2)
        expect(result.desc).toBe('我的作品')
        expect(result.tags).toEqual(['art', 'photo'])
        expect(result.likes).toBe(10)
        expect(result.comments).toBe(3)
    })

    it('無圖片時 image 為空字串', () => {
        const result = normalizeWork({ id: 'w2', photos: [] })
        expect(result.image).toBe('')
    })

    it('like_count 缺少時預設 0', () => {
        const result = normalizeWork({ id: 'w3', photos: [] })
        expect(result.likes).toBe(0)
        expect(result.comments).toBe(0)
    })

    it('同時有 photos 和 images 時優先讀取 photos', () => {
        const raw = {
            id: 'w4',
            photos: [{ url: 'https://cdn.test/photo.jpg' }],
            images: [{ url: 'https://cdn.test/image.jpg' }],
        }
        const result = normalizeWork(raw)
        expect(result.image).toBe('https://cdn.test/photo.jpg')
    })
})

describe('normalizeProfileWork', () => {
    it('正確讀取 photos 欄位並設定封面', () => {
        const raw = {
            id: 'pw1',
            photos: [
                { url: 'https://cdn.test/a.jpg', is_cover: false },
                { url: 'https://cdn.test/b.jpg', is_cover: true },
            ],
            description: '封面測試',
            like_count: 5,
            comment_count: 1,
        }
        const result = normalizeProfileWork(raw)
        expect(result.id).toBe('pw1')
        expect(result.image).toBe('https://cdn.test/b.jpg') // is_cover=true 的那張
        expect(result.images).toHaveLength(2)
        expect(result.desc).toBe('封面測試')
    })

    it('無 is_cover 時取第一張作為封面', () => {
        const raw = {
            id: 'pw2',
            photos: [
                { url: 'https://cdn.test/first.jpg', is_cover: false },
                { url: 'https://cdn.test/second.jpg', is_cover: false },
            ],
        }
        const result = normalizeProfileWork(raw)
        expect(result.image).toBe('https://cdn.test/first.jpg')
    })

    it('photos 為空時 image 為空字串', () => {
        const result = normalizeProfileWork({ id: 'pw3', photos: [] })
        expect(result.image).toBe('')
    })
})


describe('buildProfileUser', () => {
    const baseProfile = {
        username: 'benny',
        display_name: 'Benny Yang',
        bio: 'Hello',
        avatar_url: 'https://cdn.test/avatar.jpg',
        avatar_color: '#C4A882',
        follower_count: 100,
        following_count: 50,
        credit_score: 75,
        rating: 4.5,
        deal_count: 10,
        is_verified: true,
    }

    it('正確映射所有欄位', () => {
        const user = buildProfileUser(baseProfile)
        expect(user.name).toBe('benny')
        expect(user.displayName).toBe('Benny Yang')
        expect(user.avatar).toBe('https://cdn.test/avatar.jpg')
        expect(user.avatarColor).toBe('#C4A882')
        expect(user.followers).toBe(100)
        expect(user.following).toBe(50)
        expect(user.creditScore).toBe(75)
        expect(user.rating).toBe(4.5)
        expect(user.dealCount).toBe(10)
        expect(user.verified).toBe(true)
    })

    it('avatar_url 為 null 時 avatar 為 null', () => {
        const user = buildProfileUser({ ...baseProfile, avatar_url: null })
        expect(user.avatar).toBeNull()
    })

    it('無 display_name 時 displayName fallback 到 username', () => {
        const user = buildProfileUser({ ...baseProfile, display_name: '' })
        expect(user.displayName).toBe('benny')
    })

    it('follower_count 不存在時 fallback 到 followers_count', () => {
        const { follower_count, ...profile } = baseProfile
        const user = buildProfileUser({ ...profile, followers_count: 999 })
        expect(user.followers).toBe(999)
    })

    it('rating 為 0 時仍正確設定', () => {
        const user = buildProfileUser({ ...baseProfile, rating: 0 })
        expect(user.rating).toBe(0)
    })

    it('credit_score 不存在時預設 50', () => {
        const { credit_score, ...profile } = baseProfile
        const user = buildProfileUser(profile)
        expect(user.creditScore).toBe(50)
    })
})

describe('normalizeNotif', () => {
    it('正確映射通知欄位', () => {
        const raw = {
            id: 'n1',
            type: 'like',
            read: false,
            message: '有人按讚了你的作品',
            created_at: new Date().toISOString(),
            actor: { username: 'alice', avatar_url: 'https://cdn.test/alice.jpg' },
        }
        const result = normalizeNotif(raw)
        expect(result.id).toBe('n1')
        expect(result.type).toBe('like')
        expect(result.read).toBe(false)
        expect(result.user).toBe('alice')
        expect(result.avatar).toBe('https://cdn.test/alice.jpg')
        expect(result.text).toBe('有人按讚了你的作品')
    })

    it('actor 為 null 時 user 和 avatar 為 null', () => {
        const result = normalizeNotif({ id: 'n2', type: 'system', read: true, message: '系統通知', actor: null })
        expect(result.user).toBeNull()
        expect(result.avatar).toBeNull()
    })
})
