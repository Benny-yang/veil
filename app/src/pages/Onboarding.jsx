import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Upload, X, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { userApi, verificationApi, mediaApi } from '../services/api'

const font = 'Noto Sans TC, sans-serif'
const logoFont = 'Cormorant Garamond, serif'
const BIO_MAX = 200

// ── Shared ────────────────────────────────────────────────────────────────────
function Field({ label, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            <span style={{ fontSize: 13, color: '#5C5650', fontFamily: font }}>{label}</span>
            {children}
            <div style={{ height: 1, backgroundColor: '#E8DDD0' }} />
        </div>
    )
}

function ProgressDots({ current, total }) {
    return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {Array.from({ length: total }).map((_, i) => (
                <div key={i} style={{
                    width: i === current ? 20 : 8, height: 8,
                    borderRadius: 4,
                    backgroundColor: i === current ? '#1C1A18' : '#D6CFC6',
                    transition: 'all 0.3s',
                }} />
            ))}
        </div>
    )
}

// ── 真人驗證 Modal（與 Settings.jsx 相同） ───────────────────────────────────
function Overlay({ onClose, children }) {
    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                backgroundColor: '#FFFFFF', borderRadius: 16,
                padding: '36px', width: 520, maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)', position: 'relative',
            }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#8C8479', padding: 4 }}>
                    <X size={20} strokeWidth={1.5} />
                </button>
                {children}
            </div>
        </div>
    )
}

function RealPersonModal({ onClose, onSuccess }) {
    const [platform, setPlatform] = useState('')
    const [profileUrl, setProfileUrl] = useState('')
    const [photoFile, setPhotoFile] = useState(null)   // 真實 File 物件
    const [photoPreview, setPhotoPreview] = useState(null) // 預覽 DataURL
    const [submitted, setSubmitted] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const fileRef = useRef()

    const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
    const handleFile = (e) => {
        const file = e.target.files[0]
        if (!file) return
        setPhotoFile(file)
        const reader = new FileReader()
        reader.onload = ev => setPhotoPreview(ev.target.result)
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const canSubmit = platform.trim() && profileUrl.trim() && photoFile
    const handleSubmit = async () => {
        if (!canSubmit) return
        // 前端先驗證 URL 格式
        try { new URL(profileUrl.trim()) } catch {
            setErrorMsg('社群個人頁連結需為完整網址（例如 https://instagram.com/name）')
            return
        }
        setSubmitted(true)
        setErrorMsg('')
        try {
            // 1. 先上傳圖片取得真實 URL
            const uploadRes = await mediaApi.upload(photoFile)
            const photoUrl = uploadRes.data.data?.url || uploadRes.data.url
            // 2. 提交驗證
            await verificationApi.submitRealPerson({
                platform: platform.trim(),
                profile_url: profileUrl.trim(),
                photo_url: photoUrl,
            })
            setTimeout(() => { onSuccess('pending'); onClose() }, 800)
        } catch (err) {
            const msg = err.response?.data?.error?.message || '提交失敗，請檢查欄位後重試'
            setErrorMsg(msg)
            setSubmitted(false)
        }
    }

    const labelStyle = { fontSize: 13, color: '#5C5650', fontFamily: font, marginBottom: 6, display: 'block' }
    const inputStyle = { width: '100%', border: '1.5px solid #E8DDD0', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: font, color: '#1C1A18', outline: 'none', boxSizing: 'border-box', backgroundColor: '#FAFAFA' }

    return (
        <Overlay onClose={onClose}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1C1A18', fontFamily: font, margin: '0 0 6px' }}>真人驗證</h3>
            <p style={{ fontSize: 13, color: '#8C8479', fontFamily: font, margin: '0 0 24px', lineHeight: 1.6 }}>
                提交驗證後，審核通常需要 1–3 個工作天。通過後將顯示認證標章。
            </p>

            {/* 範例說明 */}
            <div style={{ backgroundColor: '#F8F4EE', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#C4A882', fontFamily: font, marginBottom: 8 }}>自拍照範例說明</div>
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
                <select value={platform} onChange={e => setPlatform(e.target.value)} style={inputStyle}>
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
                <input type="url" value={profileUrl} onChange={e => setProfileUrl(e.target.value)} placeholder="https://instagram.com/yourname" style={inputStyle} />
            </div>

            {/* 上傳自拍照 */}
            <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>上傳自拍驗證照</label>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
                {photoPreview ? (
                    <div style={{ position: 'relative', width: '100%' }}>
                        <img src={photoPreview} alt="preview" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, border: '1.5px solid #E8DDD0' }} />
                        <button onClick={() => { setPhotoFile(null); setPhotoPreview(null) }} style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={14} color="#FFFFFF" />
                        </button>
                    </div>
                ) : (
                    <button onClick={() => fileRef.current?.click()} style={{ width: '100%', height: 100, border: '2px dashed #E8DDD0', borderRadius: 8, backgroundColor: '#FAFAFA', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Upload size={20} color="#C4A882" strokeWidth={1.5} />
                        <span style={{ fontSize: 13, color: '#8C8479', fontFamily: font }}>點擊上傳照片</span>
                    </button>
                )}
            </div>

            {submitted ? (
                <div style={{ textAlign: 'center', color: '#C4A882', fontSize: 14, fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Clock size={16} strokeWidth={2} /> 上傳圖片中⋯
                </div>
            ) : (
                <>
                    {errorMsg && (
                        <div style={{ fontSize: 12, color: '#E07A5F', fontFamily: font, textAlign: 'center', marginBottom: 8 }}>
                            {errorMsg}
                        </div>
                    )}
                    <button onClick={handleSubmit} disabled={!canSubmit} style={{ width: '100%', padding: '14px', borderRadius: 8, border: 'none', backgroundColor: canSubmit ? '#1C1A18' : '#E8DDD0', color: canSubmit ? '#F2EDE6' : '#B0A89A', fontSize: 14, fontWeight: 500, fontFamily: font, cursor: canSubmit ? 'pointer' : 'not-allowed', transition: 'background-color 0.15s' }}>
                        提交驗證
                    </button>
                </>
            )}
        </Overlay>
    )
}

// ── 簡訊驗證 Modal ─────────────────────────────────────────────────────────────
function SmsModal({ onClose, onSuccess }) {
    const [step, setStep] = useState(1)
    const [phone, setPhone] = useState('')
    const [code, setCode] = useState('')
    const [sending, setSending] = useState(false)
    const [countdown, setCountdown] = useState(0)
    const [verifying, setVerifying] = useState(false)
    const [codeError, setCodeError] = useState(false)

    const startCountdown = () => {
        setCountdown(60)
        const t = setInterval(() => { setCountdown(c => { if (c <= 1) { clearInterval(t); return 0 } return c - 1 }) }, 1000)
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

    const inputStyle = { width: '100%', border: '1.5px solid #E8DDD0', borderRadius: 8, padding: '12px 14px', fontSize: 15, fontFamily: font, color: '#1C1A18', outline: 'none', boxSizing: 'border-box', backgroundColor: '#FAFAFA' }
    const btnStyle = (active) => ({ flex: 1, padding: '13px', borderRadius: 8, border: 'none', backgroundColor: active ? '#1C1A18' : '#E8DDD0', color: active ? '#F2EDE6' : '#B0A89A', fontSize: 14, fontWeight: 500, fontFamily: font, cursor: active ? 'pointer' : 'not-allowed' })

    return (
        <Overlay onClose={onClose}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1C1A18', fontFamily: font, margin: '0 0 6px' }}>簡訊驗證</h3>
            {step === 1 ? (
                <>
                    <p style={{ fontSize: 13, color: '#8C8479', fontFamily: font, margin: '0 0 24px', lineHeight: 1.6 }}>綁定手機號碼後，可提升帳號安全性並加速買賣信任。</p>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 13, color: '#5C5650', fontFamily: font, marginBottom: 6, display: 'block' }}>手機號碼（台灣格式）</label>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="09xxxxxxxx" style={inputStyle} />
                        {phone && !phone.match(/^09\d{8}$/) && <div style={{ fontSize: 12, color: '#E07A5F', fontFamily: font, marginTop: 4 }}>請輸入正確的台灣手機號碼格式</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={onClose} style={{ ...btnStyle(false), flex: 'none', padding: '13px 24px' }}>取消</button>
                        <button onClick={handleSend} disabled={!phone.match(/^09\d{8}$/) || sending} style={btnStyle(phone.match(/^09\d{8}$/) && !sending)}>{sending ? '寄送中⋯' : '發送驗證碼'}</button>
                    </div>
                </>
            ) : (
                <>
                    <p style={{ fontSize: 13, color: '#8C8479', fontFamily: font, margin: '0 0 6px' }}>驗證碼已傳送至 <strong style={{ color: '#1C1A18' }}>{phone}</strong></p>
                    <p style={{ fontSize: 12, color: '#B0A89A', fontFamily: font, margin: '0 0 24px' }}>（測試模式：請輸入 123456）</p>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 13, color: '#5C5650', fontFamily: font, marginBottom: 6, display: 'block' }}>6 位驗證碼</label>
                        <input type="text" value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setCodeError(false) }} placeholder="· · · · · ·" maxLength={6} style={{ ...inputStyle, borderColor: codeError ? '#E07A5F' : '#E8DDD0', letterSpacing: 6, textAlign: 'center' }} />
                        {codeError && <div style={{ fontSize: 12, color: '#E07A5F', fontFamily: font, marginTop: 4 }}>驗證碼錯誤，請再試一次</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                        <button onClick={onClose} style={{ ...btnStyle(false), flex: 'none', padding: '13px 24px' }}>取消</button>
                        <button onClick={handleVerify} disabled={code.length !== 6 || verifying} style={btnStyle(code.length === 6 && !verifying)}>{verifying ? '驗證中⋯' : '確認驗證'}</button>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 13, color: '#8C8479', fontFamily: font }}>
                        {countdown > 0 ? <span>{countdown} 秒後可重新發送</span> : <button onClick={() => { startCountdown(); handleSend() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4A882', fontSize: 13, fontFamily: font }}>重新發送驗證碼</button>}
                    </div>
                </>
            )}
        </Overlay>
    )
}

// ── Step 1: 個人資料 ──────────────────────────────────────────────────────────
function ProfileStep({ onNext }) {
    const { currentUser } = useAuth()
    const [avatarPreview, setAvatarPreview] = useState(null)
    const [displayName, setDisplayName] = useState(currentUser?.display_name || '')
    const [bio, setBio] = useState('')
    const [saving, setSaving] = useState(false)
    const avatarRef = useRef()

    const handleFile = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = ev => setAvatarPreview(ev.target.result)
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const handleNext = async () => {
        setSaving(true)
        try {
            const updates = {}
            if (displayName.trim()) updates.display_name = displayName.trim()
            if (bio.trim()) updates.bio = bio.trim()
            if (Object.keys(updates).length > 0) {
                await userApi.updateMe(updates)
            }
        } catch {
            // 儲存失敗不阻斷流程，用戶之後可在設定補填
        } finally {
            setSaving(false)
            onNext()
        }
    }

    const inputStyle = { width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: '4px 0 8px', fontSize: 15, fontFamily: font, color: '#1C1A18', backgroundColor: 'transparent' }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, width: '100%', maxWidth: 480, padding: '0 16px 40px' }}>
            <div style={{ backgroundColor: '#C4A882', borderRadius: 12, padding: '4px 12px' }}>
                <span style={{ fontSize: 12, color: '#FFFFFF', fontFamily: font, fontWeight: 500 }}>Step 1 / 2</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 500, color: '#1C1A18', fontFamily: font }}>設定你的個人資料</div>
                <div style={{ fontSize: 13, color: '#8C8479', fontFamily: font, textAlign: 'center', lineHeight: 1.7 }}>讓其他人更認識你，完善資料有助於建立交易信任</div>
            </div>

            {/* Avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div onClick={() => avatarRef.current?.click()} style={{ width: 96, height: 96, borderRadius: '50%', backgroundColor: '#E8DDD0', border: '2px solid #D6CFC6', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
                    {avatarPreview && <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <button onClick={() => avatarRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#C4A882', fontFamily: font, fontWeight: 500 }}>
                    {avatarPreview ? '更換大頭貼' : '上傳大頭貼'}
                </button>
                <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
                <Field label="顯示名稱">
                    <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="讓別人認識你的名字" style={inputStyle} />
                </Field>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                    <span style={{ fontSize: 13, color: '#5C5650', fontFamily: font }}>簡介</span>
                    <div style={{ backgroundColor: '#FFFFFF', borderRadius: 8, padding: '12px 16px', border: '1.5px solid #E8DDD0', minHeight: 100 }}>
                        <textarea value={bio} onChange={e => { if (e.target.value.length <= BIO_MAX) setBio(e.target.value) }} rows={3} placeholder="介紹一下自己的品味或風格⋯"
                            style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: 14, fontFamily: font, color: '#1C1A18', backgroundColor: 'transparent', lineHeight: 1.6, boxSizing: 'border-box' }} />
                        <div style={{ textAlign: 'right', fontSize: 12, color: '#C4A882', fontFamily: font }}>{bio.length} / {BIO_MAX}</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', paddingTop: 8 }}>
                <button onClick={handleNext} disabled={saving} style={{ width: '100%', padding: '14px', borderRadius: 24, border: 'none', backgroundColor: saving ? '#D6CFC6' : '#1C1A18', color: '#F2EDE6', fontSize: 14, fontWeight: 500, fontFamily: font, cursor: saving ? 'not-allowed' : 'pointer' }}>
                    {saving ? '儲存中⋯' : '下一步'}
                </button>
                <button onClick={onNext} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8C8479', fontFamily: font }}>稍後設定</button>
            </div>

            <ProgressDots current={0} total={2} />
        </div>
    )
}

// ── VerifyCard（無 icon） ─────────────────────────────────────────────────────
function VerifyCard({ title, desc, verified, onVerify }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 12, padding: '16px 20px', border: '1px solid #E8DDD0' }}>
            <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1C1A18', fontFamily: font }}>{title}</div>
                <div style={{ fontSize: 12, color: '#8C8479', fontFamily: font }}>{desc}</div>
            </div>
            {verified ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', padding: '5px 10px', borderRadius: 10 }}>
                    <CheckCircle2 size={12} color="#4CAF50" strokeWidth={2} />
                    <span style={{ fontSize: 11, color: '#4CAF50', fontWeight: 500, fontFamily: font }}>已驗證</span>
                </div>
            ) : (
                <button onClick={onVerify} style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid #C4A882', backgroundColor: 'transparent', cursor: 'pointer' }}>
                    <span style={{ fontSize: 12, color: '#C4A882', fontWeight: 500, fontFamily: font }}>立即驗證</span>
                </button>
            )}
        </div>
    )
}

// ── Step 2: 實名驗證 ──────────────────────────────────────────────────────────
function VerifyStep({ onFinish, onSkip }) {
    const [realStatus, setRealStatus] = useState('none') // none | pending | approved
    const [smsVerified, setSmsVerified] = useState(false)
    const [showRealModal, setShowRealModal] = useState(false)
    const [showSmsModal, setShowSmsModal] = useState(false)

    const BENEFITS = ['認證標章顯示於個人頁', '提升買家信任，加速成交', '解鎖高價商品交易資格']

    // 真人驗證卡片顯示不同狀態
    const RealVerifyCard = () => {
        if (realStatus === 'approved') {
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 12, padding: '16px 20px', border: '1px solid #E8DDD0' }}>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#1C1A18', fontFamily: font }}>真人驗證</div>
                        <div style={{ fontSize: 12, color: '#8C8479', fontFamily: font }}>上傳自拍照 &middot; 審核 1-3 個工作天</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', padding: '5px 10px', borderRadius: 10 }}>
                        <CheckCircle2 size={12} color="#4CAF50" strokeWidth={2} />
                        <span style={{ fontSize: 11, color: '#4CAF50', fontWeight: 500, fontFamily: font }}>已驗證</span>
                    </div>
                </div>
            )
        }
        if (realStatus === 'pending') {
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 12, padding: '16px 20px', border: '1px solid #E8DDD0' }}>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#1C1A18', fontFamily: font }}>真人驗證</div>
                        <div style={{ fontSize: 12, color: '#8C8479', fontFamily: font }}>已提交，審核通常需 1–3 個工作天</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#FFF8E1', padding: '5px 10px', borderRadius: 10 }}>
                        <Clock size={12} color="#F9A825" strokeWidth={2} />
                        <span style={{ fontSize: 11, color: '#F9A825', fontWeight: 500, fontFamily: font }}>審核中</span>
                    </div>
                </div>
            )
        }
        return (
            <VerifyCard title="真人驗證" desc="上傳自拍照 &middot; 審核 1-3 個工作天" verified={false} onVerify={() => setShowRealModal(true)} />
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, width: '100%', maxWidth: 520, padding: '0 16px 40px' }}>
            <div style={{ backgroundColor: '#C4A882', borderRadius: 12, padding: '4px 12px' }}>
                <span style={{ fontSize: 12, color: '#FFFFFF', fontFamily: font, fontWeight: 500 }}>Step 2 / 2</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 500, color: '#1C1A18', fontFamily: font }}>實名驗證</div>
                <div style={{ fontSize: 13, color: '#8C8479', fontFamily: font, textAlign: 'center', lineHeight: 1.7 }}>
                    完成驗證可獲得認證標章，提升交易信任度<br />
                    <span style={{ color: '#C4A882' }}>（非必填，之後可在設定中完成）</span>
                </div>
            </div>

            {/* Benefits */}
            <div style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#C4A882', fontFamily: font }}>✦ 認證的好處</div>
                {BENEFITS.map(b => (
                    <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={14} color="#C4A882" strokeWidth={2} />
                        <span style={{ fontSize: 13, color: '#5C5650', fontFamily: font }}>{b}</span>
                    </div>
                ))}
            </div>

            {/* Verify cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
                <RealVerifyCard />
                <VerifyCard title="簡訊驗證" desc="綁定手機，即時接收交易通知" verified={smsVerified} onVerify={() => setShowSmsModal(true)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', paddingTop: 8 }}>
                <button onClick={onFinish} style={{ width: '100%', padding: '14px', borderRadius: 24, border: 'none', backgroundColor: '#1C1A18', color: '#F2EDE6', fontSize: 14, fontWeight: 500, fontFamily: font, cursor: 'pointer' }}>完成並進入 VEIL</button>
                <button onClick={onSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8C8479', fontFamily: font }}>跳過，稍後驗證</button>
            </div>

            <ProgressDots current={1} total={2} />

            {/* Modals */}
            {showRealModal && <RealPersonModal onClose={() => setShowRealModal(false)} onSuccess={(status) => setRealStatus(status)} />}
            {showSmsModal && <SmsModal onClose={() => setShowSmsModal(false)} onSuccess={() => setSmsVerified(true)} />}
        </div>
    )
}

// ── Main Onboarding Page ──────────────────────────────────────────────────────
export default function Onboarding() {
    const navigate = useNavigate()
    const [step, setStep] = useState(1)

    const goHome = () => {
        localStorage.setItem('veil_has_logged_in', 'true')
        navigate('/home')
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F2EDE6' }}>
            <div style={{ height: 60, backgroundColor: '#1C1A18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 20, fontFamily: logoFont, fontWeight: 300, color: '#F2EDE6', letterSpacing: 4 }}>VEIL</div>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 24px', overflowY: 'auto' }}>
                {step === 1 && <ProfileStep onNext={() => setStep(2)} />}
                {step === 2 && <VerifyStep onFinish={goHome} onSkip={goHome} />}
            </div>
        </div>
    )
}
