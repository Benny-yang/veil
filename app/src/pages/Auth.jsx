import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail } from 'lucide-react'

const font = 'Noto Sans TC, sans-serif'
const logoFont = 'Cormorant Garamond, serif'

// ── 共用樣式 ────────────────────────────────────────────────────────────────
const modalStyle = {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: '48px',
    width: '90vw',
    maxWidth: 400,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0,
    position: 'relative',
    maxHeight: '90vh',
    overflowY: 'auto',
}

const overlayStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
}

function InputField({ label, type = 'text', value, onChange, placeholder, rightEl }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            <span style={{ fontSize: 13, color: '#5C5650', fontFamily: font }}>{label}</span>
            <div style={{ position: 'relative' }}>
                <input
                    type={type} value={value} onChange={onChange} placeholder={placeholder}
                    style={{
                        width: '100%', boxSizing: 'border-box',
                        border: '1.5px solid #E8DDD0', borderRadius: 10,
                        padding: rightEl ? '12px 44px 12px 16px' : '12px 16px',
                        fontSize: 14, fontFamily: font, color: '#1C1A18',
                        backgroundColor: '#F8F4EE', outline: 'none',
                    }}
                />
                {rightEl && (
                    <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#8C8479' }}>
                        {rightEl}
                    </div>
                )}
            </div>
        </div>
    )
}

// ── 服務條款 Modal ───────────────────────────────────────────────────────────
function LegalModal({ title, onClose, children }) {
    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            backgroundColor: 'rgba(28,26,24,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)', padding: '24px 16px',
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                width: '100%', maxWidth: 480, maxHeight: '78vh',
                backgroundColor: '#FFFFFF', borderRadius: 20,
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: '1px solid #F0EBE3', flexShrink: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#1C1A18', fontFamily: font }}>{title}</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C8479', fontSize: 22, lineHeight: 1, padding: 0 }}>×</button>
                </div>
                <div style={{ overflowY: 'auto', padding: '20px 24px 28px', fontSize: 13, color: '#5C5650', fontFamily: font, lineHeight: 2 }}>
                    {children}
                </div>
            </div>
        </div>
    )
}

// ── Step: Welcome Popup ──────────────────────────────────────────────────────
function WelcomePopup({ onLogin, onRegister, onGuest }) {
    const [showTerms, setShowTerms] = useState(false)
    const [showPrivacy, setShowPrivacy] = useState(false)

    const primaryBtnStyle = (bg, color) => ({
        width: '100%', padding: '14px', borderRadius: 24, border: 'none',
        backgroundColor: bg, color, fontSize: 14, fontWeight: 500,
        fontFamily: font, cursor: 'pointer', letterSpacing: 1,
    })

    const linkStyle = {
        color: '#C4A882', cursor: 'pointer', textDecoration: 'none',
    }

    return (
        <>
            <div style={{ ...modalStyle, gap: 32 }}>
                {/* Logo */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 48, fontFamily: logoFont, fontWeight: 300, color: '#1C1A18', letterSpacing: 8 }}>VEIL</div>
                    <div style={{ fontSize: 14, color: '#8C8479', fontFamily: font, letterSpacing: 2 }}>每一件物品，都有它的故事</div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
                    <button onClick={onLogin} style={primaryBtnStyle('#C4A882', '#FFFFFF')}>登入</button>
                    <button onClick={onRegister} style={primaryBtnStyle('#1C1A18', '#F2EDE6')}>加入 VEIL</button>
                </div>

                {/* Guest */}
                <button onClick={onGuest} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8C8479', fontFamily: font }}>
                    訪客瀏覽
                </button>

                {/* Footer */}
                <p style={{ fontSize: 11, color: '#8C8479', fontFamily: font, textAlign: 'center', margin: 0 }}>
                    點擊註冊，即表示你同意{' '}
                    <span
                        style={linkStyle}
                        onClick={() => setShowTerms(true)}
                        onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                    >服務條款</span>
                    {' 及 '}
                    <span
                        style={linkStyle}
                        onClick={() => setShowPrivacy(true)}
                        onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                    >隱私權條款</span>
                </p>
            </div>

            {showTerms && (
                <LegalModal title="服務條款" onClose={() => setShowTerms(false)}>
                    <p style={{ color: '#B0A89A', fontSize: 12, marginTop: 0 }}>最後更新：2025 年 1 月 1 日</p>
                    <p><strong style={{ color: '#1C1A18' }}>1. 服務範圍</strong><br />Veil 為提供用戶展示、交流品味衣著的線上社群平台。所有買賣行為均由用戶自行承擔風險。</p>
                    <p><strong style={{ color: '#1C1A18' }}>2. 帳號責任</strong><br />用戶應妥善保管帳號密碼，並對帳號下的所有行為負責。</p>
                    <p><strong style={{ color: '#1C1A18' }}>3. 禁止行為</strong><br />嚴禁散布仿冒品、詐騙、或任何違法物品。違規帳號將被停權。</p>
                    <p><strong style={{ color: '#1C1A18' }}>4. 爭議處理</strong><br />交易爭議由買賣雙方自行協商。平台保留凍結帳號以配合調查的權利。</p>
                    <p style={{ color: '#B0A89A', fontSize: 12 }}>此為暫定內容，正式條款將於正式上線前公佈。</p>
                </LegalModal>
            )}

            {showPrivacy && (
                <LegalModal title="隱私權條款" onClose={() => setShowPrivacy(false)}>
                    <p style={{ color: '#B0A89A', fontSize: 12, marginTop: 0 }}>最後更新：2025 年 1 月 1 日</p>
                    <p><strong style={{ color: '#1C1A18' }}>1. 資料蒐集</strong><br />我們蒐集您的帳號資訊、交易紀錄，以提供更好的服務。</p>
                    <p><strong style={{ color: '#1C1A18' }}>2. 資料使用</strong><br />您的資料不會販售給第三方。我們可能以匿名方式用於服務改善。</p>
                    <p><strong style={{ color: '#1C1A18' }}>3. 評價匿名</strong><br />所有買賣評價均以匿名方式顯示，以保護雙方隱私。</p>
                    <p><strong style={{ color: '#1C1A18' }}>4. Cookie</strong><br />我們使用 Cookie 維持登入狀態與用戶偏好設定。</p>
                    <p style={{ color: '#B0A89A', fontSize: 12 }}>此為暫定內容，正式條款將於正式上線前公佈。</p>
                </LegalModal>
            )}
        </>
    )
}


// ── Step: Login Form ─────────────────────────────────────────────────────────
function LoginForm({ onBack, onSuccess }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPwd, setShowPwd] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = () => {
        if (!email || !password) { setError('請填寫所有欄位'); return }
        setLoading(true)
        setError('')
        // 模擬 API 呼叫
        setTimeout(() => {
            setLoading(false)
            const isFirstLogin = !localStorage.getItem('veil_has_logged_in')
            onSuccess({ isFirstLogin })
        }, 1000)
    }

    return (
        <div style={{ ...modalStyle, gap: 24, padding: '40px 48px' }}>
            {/* Back */}
            <button onClick={onBack} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8C8479', fontFamily: font, padding: 0 }}>← 返回</button>

            {/* Logo */}
            <div style={{ fontSize: 32, fontFamily: logoFont, fontWeight: 300, color: '#1C1A18', letterSpacing: 6 }}>VEIL</div>

            {/* Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
                <InputField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                <InputField
                    label="密碼" type={showPwd ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="請輸入密碼"
                    rightEl={
                        <div onClick={() => setShowPwd(v => !v)}>
                            {showPwd ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                        </div>
                    }
                />
            </div>

            {/* Forgot */}
            <div style={{ alignSelf: 'flex-end' }}>
                <span style={{ fontSize: 12, color: '#C4A882', fontFamily: font, cursor: 'pointer' }}>忘記密碼？</span>
            </div>

            {/* Error */}
            {error && <div style={{ fontSize: 12, color: '#E07A5F', fontFamily: font, alignSelf: 'flex-start' }}>{error}</div>}

            {/* Submit */}
            <button onClick={handleSubmit} disabled={loading} style={{
                padding: '14px 48px', borderRadius: 24, border: 'none',
                backgroundColor: loading ? '#D6CFC6' : '#C4A882',
                color: '#FFFFFF', fontSize: 14, fontWeight: 500,
                fontFamily: font, cursor: loading ? 'not-allowed' : 'pointer',
            }}>
                {loading ? '登入中⋯' : '登入'}
            </button>
        </div>
    )
}

// ── Step: Register Form ──────────────────────────────────────────────────────
function RegisterForm({ onBack, onSuccess }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPwd, setShowPwd] = useState(false)
    const [showCpwd, setShowCpwd] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = () => {
        if (!email || !password || !confirmPassword) { setError('請填寫所有欄位'); return }
        if (password !== confirmPassword) { setError('兩次密碼不一致'); return }
        if (password.length < 8) { setError('密碼至少 8 個字元'); return }
        setLoading(true)
        setError('')
        setTimeout(() => { setLoading(false); onSuccess({ email }) }, 1000)
    }

    return (
        <div style={{ ...modalStyle, gap: 20, padding: '36px 48px' }}>
            <button onClick={onBack} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8C8479', fontFamily: font, padding: 0 }}>← 返回</button>

            <div style={{ fontSize: 32, fontFamily: logoFont, fontWeight: 300, color: '#1C1A18', letterSpacing: 6 }}>VEIL</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
                <InputField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                <InputField
                    label="密碼（至少 8 個字元）" type={showPwd ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="請設定密碼"
                    rightEl={<div onClick={() => setShowPwd(v => !v)}>{showPwd ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}</div>}
                />
                <InputField
                    label="確認密碼" type={showCpwd ? 'text' : 'password'} value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)} placeholder="再輸入一次密碼"
                    rightEl={<div onClick={() => setShowCpwd(v => !v)}>{showCpwd ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}</div>}
                />
            </div>

            {error && <div style={{ fontSize: 12, color: '#E07A5F', fontFamily: font, alignSelf: 'flex-start' }}>{error}</div>}

            <button onClick={handleSubmit} disabled={loading} style={{
                padding: '14px 48px', borderRadius: 24, border: 'none',
                backgroundColor: loading ? '#D6CFC6' : '#1C1A18',
                color: '#F2EDE6', fontSize: 14, fontWeight: 500,
                fontFamily: font, cursor: loading ? 'not-allowed' : 'pointer',
            }}>
                {loading ? '建立中⋯' : '建立帳號'}
            </button>
        </div>
    )
}

// ── Step: Email Sent ─────────────────────────────────────────────────────────
function EmailSentView({ email, onResend, onBackToLogin }) {
    const [resent, setResent] = useState(false)

    const handleResend = () => { setResent(true); setTimeout(() => setResent(false), 3000); onResend?.() }

    return (
        <div style={{ ...modalStyle, gap: 24, padding: '48px 40px' }}>
            {/* Icon */}
            <div style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#F0EBE3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={28} color="#C4A882" strokeWidth={1.5} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 500, color: '#1C1A18', fontFamily: font }}>驗證信已寄出！</div>
                <div style={{ fontSize: 14, color: '#8C8479', fontFamily: font, textAlign: 'center', lineHeight: 1.8 }}>
                    驗證信已發送至<br />
                    <strong style={{ color: '#1C1A18' }}>{email}</strong><br />
                    請前往信箱點擊連結以啟用帳號
                </div>
            </div>

            <button onClick={onBackToLogin} style={{
                padding: '14px 48px', borderRadius: 24, border: 'none',
                backgroundColor: '#C4A882', color: '#FFFFFF',
                fontSize: 14, fontWeight: 500, fontFamily: font, cursor: 'pointer',
            }}>
                前往登入
            </button>

            <button onClick={handleResend} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#C4A882', fontFamily: font }}>
                {resent ? '✓ 已重新發送' : '沒收到驗證信？重新發送'}
            </button>
        </div>
    )
}

// ── Main Auth Page ────────────────────────────────────────────────────────────
export default function Auth() {
    const navigate = useNavigate()
    const [step, setStep] = useState('welcome') // welcome | login | register | emailSent
    const [registeredEmail, setRegisteredEmail] = useState('')

    const handleLoginSuccess = () => {
        navigate('/onboarding')
    }

    const handleRegisterSuccess = ({ email }) => {
        setRegisteredEmail(email)
        setStep('emailSent')
    }

    const handleGuest = () => navigate('/home')

    return (
        <div style={{
            minHeight: '100vh', backgroundColor: '#F2EDE6',
            backgroundImage: 'radial-gradient(ellipse at top, #E8DDD0 0%, #F2EDE6 60%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            {/* Blurred background overlay feel */}
            <div style={overlayStyle}>
                {step === 'welcome' && (
                    <WelcomePopup
                        onLogin={() => setStep('login')}
                        onRegister={() => setStep('register')}
                        onGuest={handleGuest}
                    />
                )}
                {step === 'login' && (
                    <LoginForm
                        onBack={() => setStep('welcome')}
                        onSuccess={handleLoginSuccess}
                    />
                )}
                {step === 'register' && (
                    <RegisterForm
                        onBack={() => setStep('welcome')}
                        onSuccess={handleRegisterSuccess}
                    />
                )}
                {step === 'emailSent' && (
                    <EmailSentView
                        email={registeredEmail}
                        onBackToLogin={() => setStep('login')}
                    />
                )}
            </div>
        </div>
    )
}
