import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── normalizeZone（從 PrivateCollection.jsx 提取）────────────────────────────
function normalizeZone(z) {
    const now = new Date()
    const endsAt = z.ends_at ? new Date(z.ends_at) : null
    const isActive = z.is_active ?? (endsAt ? endsAt > now : true)
    const cover = (z.photos || []).find(p => p.is_cover)?.url
        || (z.photos?.[0]?.url || null)
    const slots = z.total_slots ?? 0
    const filled = z.filled_slots ?? 0
    return {
        id: z.id,
        title: z.title || '未命名',
        status: isActive ? '進行中' : '已結束',
        cover,
        slots,
        filled,
        timeLeft: endsAt
            ? endsAt > now
                ? `${Math.ceil((endsAt - now) / 86400000)} 天後截止`
                : '已截止'
            : '無期限',
        raw: z,
    }
}

// ── normalizeApp（從 PrivateCollection.jsx 提取）─────────────────────────────
function normalizeApp(a) {
    const statusMap = {
        pending: '審核中',
        approved: '已通過',
        rejected: '未通過',
        cancelled: '已撤回',
    }
    return {
        id: a.id,
        zoneId: a.zone_id,
        zoneTitle: a.zone?.title || '未知私藏',
        cover: (a.zone?.photos || []).find(p => p.is_cover)?.url
            || a.zone?.photos?.[0]?.url || null,
        appStatus: statusMap[a.status] || '審核中',
        raw: a,
    }
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('normalizeZone', () => {
    const baseZone = {
        id: 'z1',
        title: '神秘私藏',
        total_slots: 5,
        filled_slots: 2,
        is_active: true,
        ends_at: null,
        photos: [
            { url: 'https://cdn.test/cover.jpg', is_cover: true },
            { url: 'https://cdn.test/img2.jpg', is_cover: false },
        ],
    }

    it('正確映射基本欄位', () => {
        const result = normalizeZone(baseZone)
        expect(result.id).toBe('z1')
        expect(result.title).toBe('神秘私藏')
        expect(result.slots).toBe(5)
        expect(result.filled).toBe(2)
        expect(result.status).toBe('進行中')
        expect(result.cover).toBe('https://cdn.test/cover.jpg')
        expect(result.timeLeft).toBe('無期限')
    })

    it('is_active=false 時 status 為已結束', () => {
        const result = normalizeZone({ ...baseZone, is_active: false })
        expect(result.status).toBe('已結束')
    })

    it('沒有 is_cover 的圖片時使用第一張', () => {
        const zone = {
            ...baseZone,
            photos: [
                { url: 'https://cdn.test/first.jpg', is_cover: false },
                { url: 'https://cdn.test/second.jpg', is_cover: false },
            ],
        }
        const result = normalizeZone(zone)
        expect(result.cover).toBe('https://cdn.test/first.jpg')
    })

    it('無照片時 cover 為 null', () => {
        const result = normalizeZone({ ...baseZone, photos: [] })
        expect(result.cover).toBeNull()
    })

    it('ends_at 過期時 timeLeft 為已截止', () => {
        const pastDate = new Date(Date.now() - 86400000).toISOString()
        const result = normalizeZone({ ...baseZone, ends_at: pastDate })
        expect(result.timeLeft).toBe('已截止')
    })

    it('title 缺少時fallback 為未命名', () => {
        const result = normalizeZone({ ...baseZone, title: '' })
        expect(result.title).toBe('未命名')
    })
})

describe('normalizeApp', () => {
    const baseApp = {
        id: 'a1',
        zone_id: 'z1',
        status: 'pending',
        zone: {
            title: '神秘私藏',
            photos: [{ url: 'https://cdn.test/cover.jpg', is_cover: true }],
        },
    }

    it('pending 映射為審核中', () => {
        const result = normalizeApp(baseApp)
        expect(result.appStatus).toBe('審核中')
    })

    it('approved 映射為已通過', () => {
        const result = normalizeApp({ ...baseApp, status: 'approved' })
        expect(result.appStatus).toBe('已通過')
    })

    it('rejected 映射為未通過', () => {
        const result = normalizeApp({ ...baseApp, status: 'rejected' })
        expect(result.appStatus).toBe('未通過')
    })

    it('cancelled 映射為已撤回', () => {
        const result = normalizeApp({ ...baseApp, status: 'cancelled' })
        expect(result.appStatus).toBe('已撤回')
    })

    it('zone 無 title 時 zoneTitle 為未知私藏', () => {
        const result = normalizeApp({ ...baseApp, zone: { photos: [] } })
        expect(result.zoneTitle).toBe('未知私藏')
    })

    it('正確取得封面 URL', () => {
        const result = normalizeApp(baseApp)
        expect(result.cover).toBe('https://cdn.test/cover.jpg')
    })
})
