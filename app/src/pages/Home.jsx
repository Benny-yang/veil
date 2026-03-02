import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'
import PostModal from '../components/PostModal'

const MOCK_POSTS = [
    {
        id: 1,
        author: { name: 'shimmer_style', avatarColor: '#C4A882' },
        image: 'https://images.unsplash.com/photo-1680350024349-293ae872d5b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        images: [
            'https://images.unsplash.com/photo-1680350024349-293ae872d5b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
            'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
            'https://images.unsplash.com/photo-1469334031218-e382a71b716b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        ],
        imageHeight: 260,
        likes: 24, comments: 6, column: 0,
        desc: '這件手工真絲洋裝帶著些許週末的慵懶氣息，穿上它你就是那個房間裡最有故事的人。',
        tags: ['真絲', '洋裝', '二手'],
        mockComments: [
            { user: 'velvet_noir', text: '想了解這件的版型，請問是修身嗎？', time: '1小時前' },
            { user: 'silk_archive', text: '顏色太美了，這個米白很百搭！', time: '3小時前' },
        ]
    },
    {
        id: 2,
        author: { name: 'velvet_noir', avatarColor: '#8C8479' },
        image: 'https://images.unsplash.com/photo-1711113456756-40a80c23491c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        images: [
            'https://images.unsplash.com/photo-1711113456756-40a80c23491c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
            'https://images.unsplash.com/photo-1551028719-00167b16eac5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        ],
        imageHeight: 200,
        likes: 42, comments: 11, column: 1,
        desc: '皮質背心，穿過三季，依然如新。對的人才懂它的好。',
        tags: ['皮革', '背心', '秋冬'],
        mockComments: [
            { user: 'atelier_muse', text: '請問有S號嗎？', time: '30分鐘前' },
        ]
    },
    {
        id: 3,
        author: { name: 'atelier_muse', avatarColor: '#C4A882' },
        image: 'https://images.unsplash.com/photo-1712512343634-f64161d3daa6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 220,
        likes: 18, comments: 3, column: 2,
        desc: '一雙陪我走過無數城市的楔形鞋，尋找懂得欣賞的新主人。',
        tags: ['鞋', '楔形', '黑色'],
        mockComments: [
            { user: 'velvet_noir', text: '尺碼多少？', time: '5小時前' },
        ]
    },
    {
        id: 4,
        author: { name: 'silk_archive', avatarColor: '#E8DDD0' },
        image: 'https://images.unsplash.com/photo-1761369332487-777e59fa4bcf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 190,
        likes: 57, comments: 9, column: 3,
        desc: '色彩繽紛的絲巾收藏，每一條都是不同旅途的紀念。',
        tags: ['絲巾', '收藏', '彩色'],
        mockComments: [
            { user: 'shimmer_style', text: '這個配色太好看了！', time: '1小時前' },
        ]
    },
    {
        id: 5,
        author: { name: 'miro_velvet', avatarColor: '#C4A882' },
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 240,
        likes: 33, comments: 7, column: 0,
        desc: '經典風衣，永不過時的選擇。這一件陪了我三個秋天。',
        tags: ['風衣', '經典', '秋冬'],
        mockComments: [
            { user: 'silk_archive', text: '哪個品牌？', time: '2小時前' },
        ]
    },
    {
        id: 6,
        author: { name: 'juni_archive', avatarColor: '#8C8479' },
        image: 'https://images.unsplash.com/photo-1550614000-4b95d46660dc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 170,
        likes: 19, comments: 4, column: 1,
        desc: '尋找一個懂得欣賞丹寧落色的人。每一處磨白都是歷史。',
        tags: ['丹寧', '牛仔', 'vintage'],
        mockComments: [
            { user: 'miro_velvet', text: '這個落色太帥了！', time: '4小時前' },
        ]
    },
    {
        id: 7,
        author: { name: 'nora_cult', avatarColor: '#C4A882' },
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 280,
        likes: 88, comments: 22, column: 2,
        desc: '整套手工刺繡上衣，只穿過兩次。找一個真的懂設計的新主人。',
        tags: ['刺繡', '手工', '限量'],
        mockComments: [
            { user: 'velvet_noir', text: '太精緻了，價格？', time: '30分鐘前' },
        ]
    },
    {
        id: 8,
        author: { name: 'sora_dress', avatarColor: '#E8DDD0' },
        image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 210,
        likes: 45, comments: 8, column: 3,
        desc: '薄荷綠針織上衣，清爽百搭，穿出初夏感。',
        tags: ['針織', '薄荷', '夏季'],
        mockComments: [
            { user: 'nora_cult', text: '這個綠很特別！', time: '1小時前' },
        ]
    },
    {
        id: 9,
        author: { name: 'felix_mode', avatarColor: '#C4A882' },
        image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 250,
        likes: 61, comments: 14, column: 0,
        desc: '白色亞麻長褲，夏天的必需品。微微的自然皺褶是它的魅力。',
        tags: ['亞麻', '白色', '夏天'],
        mockComments: [
            { user: 'sora_dress', text: '好喜歡亞麻材質！', time: '3小時前' },
        ]
    },
    {
        id: 10,
        author: { name: 'aris_collect', avatarColor: '#8C8479' },
        image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 200,
        likes: 37, comments: 5, column: 1,
        desc: '限量印花短洋裝，設計師款。穿過一次，狀態完美。',
        tags: ['印花', '設計師', '限量'],
        mockComments: [
            { user: 'felix_mode', text: '哪個設計師？', time: '6小時前' },
        ]
    },
    {
        id: 11,
        author: { name: 'luna_closet', avatarColor: '#C4A882' },
        image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 230,
        likes: 52, comments: 16, column: 2,
        desc: '蕾絲邊衣領白色上衣，帶有法式浪漫的細節，特別的存在。',
        tags: ['蕾絲', '白色', '法式'],
        mockComments: [
            { user: 'aris_collect', text: '超美的細節！', time: '2小時前' },
        ]
    },
    {
        id: 12,
        author: { name: 'vigo_shop', avatarColor: '#E8DDD0' },
        image: 'https://images.unsplash.com/photo-1485518994671-4ced98a5ed15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
        imageHeight: 180,
        likes: 29, comments: 6, column: 3,
        desc: '素色寬版老爹T，穿起來就是隨性有型，怎麼配都好看。',
        tags: ['T-shirt', '寬版', '素色'],
        mockComments: [
            { user: 'luna_closet', text: '顏色好喜歡！', time: '1小時前' },
        ]
    },
]

// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({ post, onClick }) {
    const [liked, setLiked] = useState(false)
    const isMobile = useIsMobile()
    const imgHeight = isMobile ? 140 : post.imageHeight
    const navigate = useNavigate()

    return (
        <div
            className="rounded-lg overflow-hidden flex flex-col cursor-pointer"
            style={{
                backgroundColor: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                transition: 'box-shadow 0.2s'
            }}
            onClick={onClick}
        >
            <img src={post.image} alt={post.author.name}
                className="w-full object-cover" style={{ height: imgHeight }} />
            <div className="p-3 flex flex-col gap-2">
                <div
                    className="flex items-center gap-2"
                    onClick={e => { e.stopPropagation(); navigate(`/profile/${post.author.name}`) }}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="rounded-full flex-shrink-0"
                        style={{ width: isMobile ? 22 : 28, height: isMobile ? 22 : 28, backgroundColor: post.author.avatarColor }} />
                    <span style={{
                        fontSize: isMobile ? 11 : 13, fontWeight: 500, color: '#1C1A18',
                        fontFamily: 'Noto Sans TC, sans-serif'
                    }}>
                        {post.author.name}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={e => { e.stopPropagation(); setLiked(l => !l) }}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            display: 'flex', alignItems: 'center', gap: 4,
                            color: liked ? '#C4A882' : '#8C8479', fontSize: 11,
                            fontFamily: 'Noto Sans TC, sans-serif'
                        }}
                    >
                        <Heart size={13} strokeWidth={1.5} fill={liked ? '#C4A882' : 'none'} />
                        {post.likes + (liked ? 1 : 0)}
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

// ── Home Page ─────────────────────────────────────────────────────────────────
export default function Home() {
    const [selectedPost, setSelectedPost] = useState(null)

    const columns = [[], [], [], []]
    MOCK_POSTS.forEach(post => { columns[post.column].push(post) })

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F5F1EC' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full"
                style={{ padding: '24px 60px' }}>
                {columns.map((col, i) => (
                    <div key={i} className="flex flex-col gap-3">
                        {col.map(post => (
                            <PostCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
                        ))}
                    </div>
                ))}
            </div>

            {/* Detail Modal */}
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
