import React, { useState, useRef } from 'react'
import useIsMobile from '../hooks/useIsMobile'
import { Camera, CheckCircle2, X, Upload, Phone } from 'lucide-react'

const INITIAL_PROFILE = {
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=240&h=240&fit=crop&crop=face',
    username: 'my_account',
    displayName: 'Aria Chen',
    bio: '品味是一種語言，衣著是一種態度。分享那些曾伴我走過的美麗舊衣。\n每一件物品都有它的故事，我只是暫時的守護者。',
    realPersonVerified: false,
    smsVerified: false,
    phone: '',   // 存在 profile 但透過 SMS 驗證流程綁定
}

const BIO_MAX = 200

const font = 'Noto Sans TC, sans-serif'

const baseInputStyle = {
    width: '100%', border: 'none', outline: 'none', padding: '4px 0 8px',
    fontSize: 15, fontFamily: font, color: '#1C1A18',
    backgroundColor: 'transparent', boxSizing: 'border-box',
}

function FieldRow({ label, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            <span style={{ fontSize: 13, color: '#5C5650', fontFamily: font }}>{label}</span>
            {children}
            <div style={{ height: 1, backgroundColor: '#E8DDD0' }} />
        </div>
    )
}

// ── Modal 底層 Overlay ────────────────────────────────────────────────────────
function Overlay({ onClose, children }) {
    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                backgroundColor: '#FFFFFF', borderRadius: 16,
                padding: '36px', width: 520, maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                position: 'relative',
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
                    cursor: 'pointer', color: '#8C8479', padding: 4,
                }}>
                    <X size={20} strokeWidth={1.5} />
                </button>
                {children}
            </div>
        </div>
    )
}

// ── 真人驗證 Modal ────────────────────────────────────────────────────────────
function RealPersonModal({ onClose, onSuccess }) {
    const [platform, setPlatform] = useState('')
    const [profileUrl, setProfileUrl] = useState('')
    const [photo, setPhoto] = useState(null)
    const [submitted, setSubmitted] = useState(false)
    const fileRef = useRef()

    const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })

    const handleFile = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = ev => setPhoto(ev.target.result)
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const canSubmit = platform.trim() && profileUrl.trim() && photo

    const handleSubmit = () => {
        if (!canSubmit) return
        setSubmitted(true)
        setTimeout(() => { onSuccess(); onClose() }, 1800)
    }

    const labelStyle = { fontSize: 13, color: '#5C5650', fontFamily: font, marginBottom: 6, display: 'block' }
    const inputStyle = {
        width: '100%', border: '1.5px solid #E8DDD0', borderRadius: 8,
        padding: '10px 14px', fontSize: 14, fontFamily: font, color: '#1C1A18',
        outline: 'none', boxSizing: 'border-box', backgroundColor: '#FAFAFA',
    }

    return (
        <Overlay onClose={onClose}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1C1A18', fontFamily: font, margin: '0 0 6px' }}>真人驗證</h3>
            <p style={{ fontSize: 13, color: '#8C8479', fontFamily: font, margin: '0 0 24px', lineHeight: 1.6 }}>
                提交驗證後，審核通常需要 1–3 個工作天。通過後將顯示認證標章。
            </p>

            {/* 範例說明 */}
            <div style={{ backgroundColor: '#F8F4EE', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#C4A882', fontFamily: font, marginBottom: 8 }}>📸 自拍照範例說明</div>
                <div style={{ fontSize: 13, color: '#5C5650', fontFamily: font, lineHeight: 1.8 }}>
                    請手持一張<strong>手寫紙</strong>，紙上寫明：<br />
                    • 你的 Veil 帳號：<strong style={{ color: '#1C1A18' }}>my_account</strong><br />
                    • 今日日期：<strong style={{ color: '#1C1A18' }}>{today}</strong><br />
                    <br />
                    <span style={{ color: '#B0A89A', fontSize: 12 }}>
                        ✓ 可不露臉，用手寫紙擋住臉部即可<br />
                        ✓ 確保文字清晰可讀<br />
                        ✓ 照片必須是本人拍攝（非截圖）
                    </span>
                </div>
                {/* 示意圖 */}
                <div style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                    <img src="/verify_example.png" alt="驗證示意圖" style={{ width: '100%', height: 160, objectFit: 'cover', objectPosition: 'center 60%', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', padding: '6px 12px' }}>
                        <span style={{ fontSize: 11, color: '#FFFFFF', fontFamily: font }}>示意圖：手持手寫紙擋臉，文字清晰即可</span>
                    </div>
                </div>
            </div>

            {/* 社群平台 */}
            <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>社群平台名稱</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ ...inputStyle }}>
                    <option value="">請選擇平台</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="twitter">X / Twitter</option>
                    <option value="tiktok">TikTok</option>
                    <option value="other">其他</option>
                </select>
            </div>

            {/* 個人頁連結 */}
            <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>社群個人頁連結</label>
                <input
                    type="url" value={profileUrl} onChange={e => setProfileUrl(e.target.value)}
                    placeholder="https://instagram.com/yourname" style={inputStyle}
                />
            </div>

            {/* 上傳自拍照 */}
            <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>上傳自拍驗證照</label>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
                {photo ? (
                    <div style={{ position: 'relative', width: '100%' }}>
                        <img src={photo} alt="preview" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, border: '1.5px solid #E8DDD0' }} />
                        <button onClick={() => setPhoto(null)} style={{
                            position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)',
                            border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <X size={14} color="#FFFFFF" />
                        </button>
                    </div>
                ) : (
                    <button onClick={() => fileRef.current?.click()} style={{
                        width: '100%', height: 100, border: '2px dashed #E8DDD0', borderRadius: 8,
                        backgroundColor: '#FAFAFA', cursor: 'pointer', display: 'flex',
                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                        <Upload size={20} color="#C4A882" strokeWidth={1.5} />
                        <span style={{ fontSize: 13, color: '#8C8479', fontFamily: font }}>點擊上傳照片</span>
                    </button>
                )}
            </div>

            {submitted ? (
                <div style={{ textAlign: 'center', color: '#4CAF50', fontSize: 14, fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <CheckCircle2 size={16} strokeWidth={2} /> 提交成功，審核中⋯
                </div>
            ) : (
                <button onClick={handleSubmit} disabled={!canSubmit} style={{
                    width: '100%', padding: '14px', borderRadius: 8, border: 'none',
                    backgroundColor: canSubmit ? '#1C1A18' : '#E8DDD0',
                    color: canSubmit ? '#F2EDE6' : '#B0A89A',
                    fontSize: 14, fontWeight: 500, fontFamily: font,
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                    transition: 'background-color 0.15s',
                }}>
                    提交驗證
                </button>
            )}
        </Overlay>
    )
}

// ── 簡訊驗證 Modal ────────────────────────────────────────────────────────────
function SmsModal({ onClose, initialPhone, onSuccess }) {
    const [step, setStep] = useState(1)          // 1=輸入手機 2=輸入驗證碼
    const [phone, setPhone] = useState(initialPhone || '')
    const [code, setCode] = useState('')
    const [sending, setSending] = useState(false)
    const [countdown, setCountdown] = useState(0)
    const [verifying, setVerifying] = useState(false)
    const [codeError, setCodeError] = useState(false)

    const startCountdown = () => {
        setCountdown(60)
        const t = setInterval(() => {
            setCountdown(c => { if (c <= 1) { clearInterval(t); return 0 } return c - 1 })
        }, 1000)
    }

    const handleSend = () => {
        if (!phone.match(/^09\d{8}$/)) return
        setSending(true)
        setTimeout(() => { setSending(false); setStep(2); startCountdown() }, 1000)
    }

    const handleVerify = () => {
        if (code.length !== 6) return
        setVerifying(true)
        setTimeout(() => {
            if (code === '123456') { onSuccess(phone); onClose() }
            else { setVerifying(false); setCodeError(true) }
        }, 1200)
    }

    const inputStyle = {
        width: '100%', border: '1.5px solid #E8DDD0', borderRadius: 8,
        padding: '12px 14px', fontSize: 15, fontFamily: font, color: '#1C1A18',
        outline: 'none', boxSizing: 'border-box', backgroundColor: '#FAFAFA',
        letterSpacing: step === 2 ? 6 : 0, textAlign: step === 2 ? 'center' : 'left',
    }
    const btnStyle = (active) => ({
        flex: 1, padding: '13px', borderRadius: 8, border: 'none',
        backgroundColor: active ? '#1C1A18' : '#E8DDD0',
        color: active ? '#F2EDE6' : '#B0A89A',
        fontSize: 14, fontWeight: 500, fontFamily: font,
        cursor: active ? 'pointer' : 'not-allowed',
    })

    return (
        <Overlay onClose={onClose}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Phone size={20} color="#C4A882" strokeWidth={1.5} />
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1C1A18', fontFamily: font, margin: 0 }}>簡訊驗證</h3>
            </div>

            {step === 1 ? (
                <>
                    <p style={{ fontSize: 13, color: '#8C8479', fontFamily: font, margin: '0 0 24px', lineHeight: 1.6 }}>
                        綁定手機號碼後，可提升帳號安全性並加速買賣信任。
                    </p>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 13, color: '#5C5650', fontFamily: font, marginBottom: 6, display: 'block' }}>手機號碼（台灣格式）</label>
                        <input
                            type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="09xxxxxxxx" style={inputStyle}
                        />
                        {phone && !phone.match(/^09\d{8}$/) && (
                            <div style={{ fontSize: 12, color: '#E07A5F', fontFamily: font, marginTop: 4 }}>請輸入正確的台灣手機號碼格式</div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={onClose} style={{ ...btnStyle(false), flex: 'none', padding: '13px 24px' }}>取消</button>
                        <button
                            onClick={handleSend}
                            disabled={!phone.match(/^09\d{8}$/) || sending}
                            style={btnStyle(phone.match(/^09\d{8}$/) && !sending)}
                        >
                            {sending ? '寄送中⋯' : '發送驗證碼'}
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <p style={{ fontSize: 13, color: '#8C8479', fontFamily: font, margin: '0 0 6px' }}>
                        驗證碼已傳送至 <strong style={{ color: '#1C1A18' }}>{phone}</strong>
                    </p>
                    <p style={{ fontSize: 12, color: '#B0A89A', fontFamily: font, margin: '0 0 24px' }}>（測試模式：請輸入 123456）</p>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 13, color: '#5C5650', fontFamily: font, marginBottom: 6, display: 'block' }}>6 位驗證碼</label>
                        <input
                            type="text" value={code}
                            onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setCodeError(false) }}
                            placeholder="· · · · · ·" maxLength={6} style={{ ...inputStyle, borderColor: codeError ? '#E07A5F' : '#E8DDD0' }}
                        />
                        {codeError && <div style={{ fontSize: 12, color: '#E07A5F', fontFamily: font, marginTop: 4 }}>驗證碼錯誤，請再試一次</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                        <button onClick={onClose} style={{ ...btnStyle(false), flex: 'none', padding: '13px 24px' }}>取消</button>
                        <button
                            onClick={handleVerify}
                            disabled={code.length !== 6 || verifying}
                            style={btnStyle(code.length === 6 && !verifying)}
                        >
                            {verifying ? '驗證中⋯' : '確認驗證'}
                        </button>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 13, color: '#8C8479', fontFamily: font }}>
                        {countdown > 0 ? (
                            <span>{countdown} 秒後可重新發送</span>
                        ) : (
                            <button onClick={() => { startCountdown(); handleSend() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4A882', fontSize: 13, fontFamily: font }}>
                                重新發送驗證碼
                            </button>
                        )}
                    </div>
                </>
            )}
        </Overlay>
    )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
    { key: 'profile', label: '個人資料' },
    { key: 'account', label: '帳號管理' },
    { key: 'verify', label: '實名驗證' },
    { key: 'terms', label: '服務條款' },
    { key: 'privacy', label: '隱私權條款' },
    { key: 'contact', label: '聯絡我們' },
]

function PlaceholderSection({ title, desc }) {
    return (
        <div>
            <h2 style={{ fontSize: 20, fontWeight: 500, color: '#1C1A18', fontFamily: font, margin: '0 0 16px' }}>{title}</h2>
            <div style={{ height: 1, backgroundColor: '#E8DDD0', marginBottom: 32 }} />
            <p style={{ fontSize: 14, color: '#8C8479', fontFamily: font, lineHeight: 1.8 }}>{desc}</p>
        </div>
    )
}

function TermsSection() {
    return (
        <div>
            <h2 style={{ fontSize: 20, fontWeight: 500, color: '#1C1A18', fontFamily: font, margin: '0 0 16px' }}>服務條款</h2>
            <div style={{ height: 1, backgroundColor: '#E8DDD0', marginBottom: 24 }} />
            <div style={{ fontSize: 14, color: '#5C5650', fontFamily: font, lineHeight: 2 }}>
                <p><strong>1. 服務範圍</strong><br />Veil 為提供用戶展示、交流品味衣著的線上社群平台。所有買賣行為均由用戶自行承擔風險。</p>
                <p><strong>2. 帳號責任</strong><br />用戶應妥善保管帳號密碼，並對帳號下的所有行為負責。</p>
                <p><strong>3. 禁止行為</strong><br />嚴禁散布仿冒品、詐騙、或任何違法物品。違規帳號將被停權。</p>
                <p><strong>4. 爭議處理</strong><br />交易爭議由買賣雙方自行協商。平台保留凍結帳號以配合調查的權利。</p>
                <p style={{ color: '#B0A89A', fontSize: 12 }}>最後更新：2025 年 1 月 1 日</p>
            </div>
        </div>
    )
}

function PrivacySection() {
    return (
        <div>
            <h2 style={{ fontSize: 20, fontWeight: 500, color: '#1C1A18', fontFamily: font, margin: '0 0 16px' }}>隱私權條款</h2>
            <div style={{ height: 1, backgroundColor: '#E8DDD0', marginBottom: 24 }} />
            <div style={{ fontSize: 14, color: '#5C5650', fontFamily: font, lineHeight: 2 }}>
                <p><strong>1. 資料蒐集</strong><br />我們蒐集您的帳號資訊、交易紀錄，以提供更好的服務。</p>
                <p><strong>2. 資料使用</strong><br />您的資料不會販售給第三方。我們可能以匿名方式用於服務改善。</p>
                <p><strong>3. 評價匿名</strong><br />所有買賣評價均以匿名方式顯示，以保護雙方隱私。</p>
                <p><strong>4. Cookie</strong><br />我們使用 Cookie 維持登入狀態與用戶偏好設定。</p>
                <p style={{ color: '#B0A89A', fontSize: 12 }}>最後更新：2025 年 1 月 1 日</p>
            </div>
        </div>
    )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Settings() {
    const [activeKey, setActiveKey] = useState('profile')
    const [profile, setProfile] = useState(INITIAL_PROFILE)
    const [avatarPreview, setAvatarPreview] = useState(null)
    const [saved, setSaved] = useState(false)
    const [showRealModal, setShowRealModal] = useState(false)
    const [showSmsModal, setShowSmsModal] = useState(false)
    const avatarRef = useRef()

    const set = (k, v) => setProfile(prev => ({ ...prev, [k]: v }))

    const handleAvatarFile = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = ev => setAvatarPreview(ev.target.result)
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2200) }

    const VERIFY_ROWS = [
        {
            label: '真人驗證',
            desc: profile.realPersonVerified ? '已驗證' : '未驗證・點此驗證',
            verified: profile.realPersonVerified,
            onAction: () => setShowRealModal(true),
        },
        {
            label: '簡訊驗證',
            desc: profile.smsVerified ? `已驗證（${profile.phone}）` : '未驗證・點此驗證',
            verified: profile.smsVerified,
            onAction: () => setShowSmsModal(true),
        },
    ]

    const isMobile = useIsMobile()

    return (
        <div style={{
            minHeight: 'calc(100vh - 60px)', backgroundColor: '#F2EDE6',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: isMobile ? '16px 0' : '40px 24px',
        }}>
            <div style={{
                display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                width: '100%', maxWidth: 900,
                backgroundColor: '#FFFFFF', borderRadius: isMobile ? 0 : 12,
                boxShadow: isMobile ? 'none' : '0 2px 12px rgba(0,0,0,0.07)',
                overflow: 'hidden', minHeight: isMobile ? 'auto' : 560,
            }}>
                {/* Sidebar / Mobile Tab */}
                {isMobile ? (
                    /* 手機版：Picchu 風格垂直清單 */
                    <div style={{ width: '100%' }}>
                        <div style={{ fontSize: 20, fontWeight: 600, color: '#1C1A18', fontFamily: font, padding: '8px 16px 16px' }}>設定</div>
                        <div style={{
                            backgroundColor: '#FFFFFF', borderRadius: 12,
                            border: '1px solid #F0EBE3', overflow: 'hidden',
                            margin: '0 0 20px',
                        }}>
                            {SIDEBAR_ITEMS.map(({ key, label }, idx) => {
                                const isActive = key === activeKey
                                return (
                                    <button key={key} onClick={() => setActiveKey(key)} style={{
                                        width: '100%', textAlign: 'left',
                                        padding: '16px 20px', border: 'none',
                                        borderBottom: idx < SIDEBAR_ITEMS.length - 1 ? '1px solid #F0EBE3' : 'none',
                                        outline: isActive ? '1.5px solid #1C1A18' : 'none',
                                        outlineOffset: -1.5,
                                        backgroundColor: isActive ? '#F8F4EE' : '#FFFFFF',
                                        cursor: 'pointer', transition: 'background-color 0.15s',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    }}>
                                        <span style={{ fontSize: 15, fontWeight: isActive ? 600 : 400, color: '#1C1A18', fontFamily: font }}>{label}</span>
                                        <span style={{ fontSize: 16, color: '#B0A89A' }}>›</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                ) : (
                    /* 桌面版：左側欄 */
                    <aside style={{ width: 200, flexShrink: 0, backgroundColor: '#FFFFFF', padding: '28px 0', display: 'flex', flexDirection: 'column', gap: 2, borderRight: '1px solid #F0EBE3' }}>
                        <div style={{ fontSize: 18, fontWeight: 500, color: '#1C1A18', fontFamily: font, padding: '0 20px', marginBottom: 12 }}>設定</div>
                        {SIDEBAR_ITEMS.map(({ key, label }) => {
                            const isActive = key === activeKey
                            return (
                                <button key={key} onClick={() => setActiveKey(key)} style={{
                                    width: '100%', textAlign: 'left', position: 'relative',
                                    padding: '11px 20px', border: 'none', cursor: 'pointer',
                                    backgroundColor: isActive ? '#F8F4EE' : 'transparent',
                                    display: 'flex', alignItems: 'center', transition: 'background-color 0.15s',
                                }}
                                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#F5F1EC' }}
                                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
                                >
                                    {isActive && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, borderRadius: 2, backgroundColor: '#C4A882' }} />}
                                    <span style={{ fontSize: 14, fontWeight: isActive ? 500 : 'normal', color: isActive ? '#C4A882' : '#5C5650', fontFamily: font }}>{label}</span>
                                </button>
                            )
                        })}
                    </aside>
                )}

                {/* Main content */}
                <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
                    {activeKey === 'profile' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div>
                                <h2 style={{ fontSize: 20, fontWeight: 500, color: '#1C1A18', fontFamily: font, margin: '0 0 14px' }}>個人資料</h2>
                                <div style={{ height: 1, backgroundColor: '#E8DDD0' }} />
                            </div>

                            {/* 大頭貼 */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <div onClick={() => avatarRef.current?.click()} style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', position: 'relative', border: '2px solid #E8DDD0' }}>
                                    <img src={avatarPreview || profile.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(28,26,24,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                        onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                                        <Camera size={20} color="#FFFFFF" strokeWidth={1.5} />
                                    </div>
                                </div>
                                <button onClick={() => avatarRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#C4A882', fontFamily: font, fontWeight: 500 }}>更換大頭貼</button>
                                <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />
                            </div>

                            {/* 驗證狀態（真人 + 簡訊） */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <span style={{ fontSize: 13, color: '#5C5650', fontFamily: font }}>驗證狀態</span>
                                {VERIFY_ROWS.map(({ label, desc, verified, onAction }) => (
                                    <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 14, color: '#1C1A18', fontFamily: font }}>{label}</span>
                                        {verified ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', padding: '4px 10px', borderRadius: 10 }}>
                                                <CheckCircle2 size={12} color="#4CAF50" strokeWidth={2} />
                                                <span style={{ fontSize: 11, color: '#4CAF50', fontWeight: 500, fontFamily: font }}>{desc}</span>
                                            </div>
                                        ) : (
                                            <button onClick={onAction} style={{ backgroundColor: '#F8F4EE', padding: '4px 10px', borderRadius: 10, border: '1px solid #E8DDD0', cursor: 'pointer' }}>
                                                <span style={{ fontSize: 11, color: '#8C8479', fontWeight: 500, fontFamily: font }}>{desc}</span>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <div style={{ height: 1, backgroundColor: '#E8DDD0' }} />
                            </div>

                            {/* 帳號名稱（唯讀） */}
                            <FieldRow label="帳號名稱">
                                <span style={{ ...baseInputStyle, color: '#8C8479', cursor: 'default' }}>{profile.username}</span>
                            </FieldRow>

                            {/* 顯示名稱 */}
                            <FieldRow label="顯示名稱">
                                <input value={profile.displayName} onChange={e => set('displayName', e.target.value)} style={baseInputStyle} placeholder="你的顯示名稱" />
                            </FieldRow>

                            {/* 簡介 */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <span style={{ fontSize: 13, color: '#5C5650', fontFamily: font }}>簡介</span>
                                <div style={{ backgroundColor: '#F8F4EE', borderRadius: 8, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 120, border: '1.5px solid #E8DDD0' }}>
                                    <textarea value={profile.bio} onChange={e => { if (e.target.value.length <= BIO_MAX) set('bio', e.target.value) }} rows={4}
                                        style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: 14, fontFamily: font, color: '#1C1A18', backgroundColor: 'transparent', lineHeight: 1.6, boxSizing: 'border-box' }}
                                        placeholder="介紹一下自己..." />
                                    <div style={{ textAlign: 'right', fontSize: 12, color: '#C4A882', fontFamily: font }}>{profile.bio.length} / {BIO_MAX}</div>
                                </div>
                            </div>

                            {/* 儲存 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <button onClick={handleSave} style={{ padding: '13px 48px', borderRadius: 8, border: 'none', backgroundColor: '#1C1A18', color: '#F2EDE6', fontSize: 14, fontWeight: 500, fontFamily: font, cursor: 'pointer' }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                    儲存變更
                                </button>
                                {saved && (
                                    <span style={{ fontSize: 13, color: '#4CAF50', fontFamily: font, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <CheckCircle2 size={14} strokeWidth={2} />已儲存
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {activeKey === 'account' && <PlaceholderSection title="帳號管理" desc="帳號管理功能即將推出" />}
                    {activeKey === 'verify' && <PlaceholderSection title="實名驗證" desc="實名驗證功能即將推出" />}
                    {activeKey === 'terms' && <TermsSection />}
                    {activeKey === 'privacy' && <PrivacySection />}
                    {activeKey === 'contact' && <PlaceholderSection title="聯絡我們" desc="如有問題，請來信 support@veil.tw" />}
                </main>
            </div>

            {/* Modals */}
            {showRealModal && (
                <RealPersonModal
                    onClose={() => setShowRealModal(false)}
                    onSuccess={() => set('realPersonVerified', true)}
                />
            )}
            {showSmsModal && (
                <SmsModal
                    onClose={() => setShowSmsModal(false)}
                    initialPhone={profile.phone}
                    onSuccess={(phone) => { set('smsVerified', true); set('phone', phone) }}
                />
            )}
        </div>
    )
}
