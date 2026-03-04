import { describe, it, expect } from 'vitest'
import { normalizeMsg, normalizeDMChat, normalizeZoneChats } from '../pages/Chat'

// ── normalizeMsg ─────────────────────────────────────────────────────────────

describe('normalizeMsg', () => {
    const myUserID = 'user-001'

    it('自己發送的訊息標記為 me', () => {
        const raw = { id: 'm1', sender_id: 'user-001', type: 'text', content: '你好', created_at: '2026-03-04T15:00:00Z' }
        const result = normalizeMsg(raw, myUserID)
        expect(result.from).toBe('me')
        expect(result.text).toBe('你好')
        expect(result.id).toBe('m1')
    })

    it('對方發送的訊息標記為 peer', () => {
        const raw = { id: 'm2', sender_id: 'user-002', type: 'text', content: '嗨', created_at: '2026-03-04T15:01:00Z' }
        const result = normalizeMsg(raw, myUserID)
        expect(result.from).toBe('peer')
    })

    it('system 類型訊息標記為 system', () => {
        const raw = { id: 'm3', sender_id: 'system', type: 'system', content: '交易已建立', created_at: '2026-03-04T15:02:00Z' }
        const result = normalizeMsg(raw, myUserID)
        expect(result.from).toBe('system')
    })

    it('created_at 為 null 時 time 為空字串', () => {
        const raw = { id: 'm4', sender_id: 'user-001', type: 'text', content: 'test', created_at: null }
        const result = normalizeMsg(raw, myUserID)
        expect(result.time).toBe('')
    })

    it('created_at 格式化為 HH:mm', () => {
        const raw = { id: 'm5', sender_id: 'user-001', type: 'text', content: 'test', created_at: '2026-03-04T08:30:00Z' }
        const result = normalizeMsg(raw, myUserID)
        expect(result.time).toMatch(/\d{2}:\d{2}/)
    })
})

// ── normalizeDMChat ──────────────────────────────────────────────────────────

describe('normalizeDMChat', () => {
    const myUserID = 'user-001'

    it('正確解析對方 profile 的 username', () => {
        const chat = {
            id: 'chat-1',
            participants: [
                { user_id: 'user-001', profile: { username: 'me_user', display_name: 'Me' } },
                { user_id: 'user-002', profile: { username: 'peer_user', display_name: 'Peer' } },
            ],
            unread_count: 3,
        }
        const result = normalizeDMChat(chat, myUserID)
        expect(result.id).toBe('chat-1')
        expect(result.peer).toBe('peer_user')
        expect(result.unread).toBe(3)
    })

    it('participants 為空時 peer 為預設值「對方」', () => {
        const chat = { id: 'chat-2', participants: [], unread_count: 0 }
        const result = normalizeDMChat(chat, myUserID)
        expect(result.peer).toBe('對方')
    })

    it('對方 profile 無 username 時 fallback 到 display_name', () => {
        const chat = {
            id: 'chat-3',
            participants: [
                { user_id: 'user-001', profile: { username: 'me_user' } },
                { user_id: 'user-002', profile: { display_name: 'PeerDisplay' } },
            ],
        }
        const result = normalizeDMChat(chat, myUserID)
        expect(result.peer).toBe('PeerDisplay')
    })

    it('unread_count 未定義時預設 0', () => {
        const chat = {
            id: 'chat-4',
            participants: [
                { user_id: 'user-001', profile: { username: 'me' } },
                { user_id: 'user-002', profile: { username: 'peer' } },
            ],
        }
        const result = normalizeDMChat(chat, myUserID)
        expect(result.unread).toBe(0)
    })
})

// ── normalizeZoneChats ───────────────────────────────────────────────────────

describe('normalizeZoneChats', () => {
    const myUserID = 'user-001'

    it('依 zone_id 正確分組', () => {
        const chats = [
            {
                id: 'zc-1', zone_id: 'zone-A', zone_title: '私藏A',
                zone_total_slots: 3, zone_collector_count: 1,
                participants: [
                    { user_id: 'user-001', profile: { username: 'me' } },
                    { user_id: 'user-002', profile: { username: 'buyer1' } },
                ],
            },
            {
                id: 'zc-2', zone_id: 'zone-A', zone_title: '私藏A',
                zone_total_slots: 3, zone_collector_count: 1,
                participants: [
                    { user_id: 'user-001', profile: { username: 'me' } },
                    { user_id: 'user-003', profile: { username: 'buyer2' } },
                ],
            },
            {
                id: 'zc-3', zone_id: 'zone-B', zone_title: '私藏B',
                zone_total_slots: 5, zone_collector_count: 0,
                participants: [
                    { user_id: 'user-001', profile: { username: 'me' } },
                    { user_id: 'user-004', profile: { username: 'buyer3' } },
                ],
            },
        ]
        const result = normalizeZoneChats(chats, myUserID)
        expect(result).toHaveLength(2)

        const zoneA = result.find(z => z.zoneId === 'zone-A')
        expect(zoneA.chats).toHaveLength(2)
        expect(zoneA.zoneTitle).toBe('私藏A')
        expect(zoneA.totalSlots).toBe(3)

        const zoneB = result.find(z => z.zoneId === 'zone-B')
        expect(zoneB.chats).toHaveLength(1)
    })

    it('空陣列回傳空陣列', () => {
        const result = normalizeZoneChats([], myUserID)
        expect(result).toEqual([])
    })

    it('chat 的 peer 正確取對方 username', () => {
        const chats = [{
            id: 'zc-4', zone_id: 'z1', zone_title: 'Test',
            zone_total_slots: 1, zone_collector_count: 0,
            participants: [
                { user_id: 'user-001', profile: { username: 'me' } },
                { user_id: 'user-005', profile: { username: 'target_peer' } },
            ],
        }]
        const result = normalizeZoneChats(chats, myUserID)
        expect(result[0].chats[0].peer).toBe('target_peer')
    })
})
