import React, { useState, useRef } from 'react'
import { X, Upload, Phone, CheckCircle2 } from 'lucide-react'

const font = 'Noto Sans TC, sans-serif'

// ── Modal 底層 Overlay ────────────────────────────────────────────────────────
export function Overlay({ onClose, children }) {
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
export function RealPersonModal({ onClose, onSubmit }) {
    const [platform, setPlatform] = useState('')
    const [profileUrl, setProfileUrl] = useState('')
    const [photo, setPhoto] = useState(null)
    const [submitting, setSubmitting] = useState(false)
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
        setSubmitting(true)
        // 回傳給呼叫端處理狀態，0.8 秒後關閉
        setTimeout(() => { onSubmit(); onClose() }, 800)
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

            {submitting ? (
                <div style={{ textAlign: 'center', color: '#8C8479', fontSize: 14, fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <CheckCircle2 size={16} strokeWidth={2} color="#C4A882" /> 提交中⋯
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
export function SmsModal({ onClose, initialPhone, onSuccess }) {
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
