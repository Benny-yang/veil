import React, { useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { appealApi, mediaApi } from '../services/api'

/**
 * SuspensionOverlay — 帳號停權鎖定畫面
 * 支援三種模式：
 * 1. 可申訴（有 appeal_deadline 且未過期且未提交）
 * 2. 審核中（已提交申訴，status = pending）
 * 3. 永久停權（申訴被駁回、逾期未申訴、或無申訴管道的一般停權）
 * 4. 一般停權（買家類，有解除時間）
 */
export default function SuspensionOverlay() {
    const { currentUser, logout } = useAuth()
    const [showForm, setShowForm] = useState(false)
    const [reason, setReason] = useState('')
    const [file, setFile] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')

    const handleSubmitAppeal = useCallback(async () => {
        if (!reason.trim() || reason.trim().length < 10) {
            setError('申訴原因至少需要 10 個字')
            return
        }
        if (!file) {
            setError('請上傳寄貨明細圖片')
            return
        }

        setSubmitting(true)
        setError('')
        try {
            const uploadRes = await mediaApi.upload(file)
            const evidenceUrl = uploadRes.data.data?.url || uploadRes.data.url
            await appealApi.create({ reason: reason.trim(), evidence_url: evidenceUrl })
            setSubmitted(true)
        } catch (err) {
            const msg = err?.response?.data?.error?.message || err?.response?.data?.message || '提交失敗，請稍後再試'
            setError(msg)
        } finally {
            setSubmitting(false)
        }
    }, [reason, file])

    if (!currentUser) return null

    const suspendedUntil = new Date(currentUser.suspended_until)
    const isPermanent = suspendedUntil.getFullYear() >= 2099
    const appealDeadline = currentUser.appeal_deadline ? new Date(currentUser.appeal_deadline) : null
    const appealStatus = currentUser.appeal_status // pending | approved | rejected | undefined
    const hasAppealChannel = !!appealDeadline
    const isAppealExpired = appealDeadline ? new Date() > appealDeadline : true

    // 已提交申訴審核完畢
    const isAppealSubmitted = submitted || appealStatus === 'pending'
    const isAppealRejected = appealStatus === 'rejected'

    // 可以申訴？有 deadline + 未過期 + 未提交過
    const canAppeal = hasAppealChannel && !isAppealExpired && !appealStatus

    const remainingMs = suspendedUntil - Date.now()
    const remainingDays = Math.ceil(remainingMs / 86400000)

    const formatDate = (date) => {
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const d = String(date.getDate()).padStart(2, '0')
        const h = String(date.getHours()).padStart(2, '0')
        const min = String(date.getMinutes()).padStart(2, '0')
        return `${y}/${m}/${d} ${h}:${min}`
    }

    const formatDeadlineRemaining = () => {
        if (!appealDeadline) return ''
        const ms = appealDeadline - Date.now()
        if (ms <= 0) return '已過期'
        const hours = Math.ceil(ms / 3600000)
        if (hours >= 24) return `${Math.ceil(hours / 24)} 天`
        return `${hours} 小時`
    }

    return (
        <div style={styles.overlay}>
            <div style={styles.card}>
                {/* 警告圖示 */}
                <div style={styles.iconCircle}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                        stroke={isPermanent ? '#C62828' : '#B44D1E'} strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>

                <h1 style={styles.title}>
                    {isPermanent ? '帳號已停權' : '帳號已暫時停權'}
                </h1>

                <div style={styles.reasonBox}>
                    <p style={styles.reasonLabel}>停權原因</p>
                    <p style={styles.reasonText}>
                        {currentUser.suspend_reason || '違反平台規定'}
                    </p>
                </div>

                {/* 非永久停權：顯示解除時間 */}
                {!isPermanent && (
                    <div style={styles.infoRow}>
                        <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>解除時間</span>
                            <span style={styles.infoValue}>{formatDate(suspendedUntil)}</span>
                        </div>
                    </div>
                )}

                {/* ── 申訴區域 ── */}
                {canAppeal && !showForm && !isAppealSubmitted && (
                    <>
                        <div style={styles.appealInfo}>
                            <p style={styles.appealInfoText}>
                                ⏰ 您可在 <strong>{formatDeadlineRemaining()}</strong> 內提交申訴
                            </p>
                            <p style={{ ...styles.appealInfoText, fontSize: 12, color: '#8A8078' }}>
                                請提供寄貨明細作為證據，管理員將進行審核
                            </p>
                        </div>
                        <button style={styles.appealBtn} onClick={() => setShowForm(true)}>
                            📝 提交申訴
                        </button>
                    </>
                )}

                {/* ── 申訴表單 ── */}
                {showForm && !isAppealSubmitted && (
                    <div style={styles.formContainer}>
                        <label style={styles.formLabel}>申訴原因（至少 10 字）</label>
                        <textarea
                            style={styles.textarea}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="請詳細說明您的情況..."
                            maxLength={500}
                        />
                        <p style={styles.charCount}>{reason.length}/500</p>

                        <label style={styles.formLabel}>上傳寄貨明細</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            style={styles.fileInput}
                        />

                        {error && <p style={styles.errorText}>⚠ {error}</p>}

                        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                            <button
                                style={{ ...styles.appealBtn, flex: 1, opacity: submitting ? 0.6 : 1 }}
                                onClick={handleSubmitAppeal}
                                disabled={submitting}
                            >
                                {submitting ? '提交中...' : '送出申訴'}
                            </button>
                            <button
                                style={{ ...styles.appealBtn, flex: 1, backgroundColor: '#A09890' }}
                                onClick={() => setShowForm(false)}
                            >
                                取消
                            </button>
                        </div>
                    </div>
                )}

                {/* ── 審核中 ── */}
                {isAppealSubmitted && !isAppealRejected && (
                    <div style={styles.appealInfo}>
                        <p style={{ ...styles.appealInfoText, color: '#1B5E20' }}>
                            ✅ 申訴已提交，管理員審核中
                        </p>
                        <p style={{ ...styles.appealInfoText, fontSize: 12, color: '#8A8078' }}>
                            審核通過後將自動解除停權，請耐心等待
                        </p>
                    </div>
                )}

                {/* ── 申訴被駁回 ── */}
                {isAppealRejected && (
                    <div style={{ ...styles.appealInfo, borderColor: '#EF9A9A', backgroundColor: '#FFEBEE' }}>
                        <p style={{ ...styles.appealInfoText, color: '#C62828' }}>
                            ❌ 申訴已被駁回，帳號已永久停權
                        </p>
                    </div>
                )}

                {/* 無申訴管道的永久停權（逾期未申訴） */}
                {isPermanent && !hasAppealChannel && (
                    <p style={styles.hint}>此帳號已被永久停權，無法再使用任何功能。</p>
                )}
                {isPermanent && hasAppealChannel && isAppealExpired && !appealStatus && (
                    <p style={styles.hint}>申訴期限已過，帳號已永久停權。</p>
                )}

                {/* 一般停權提示 */}
                {!isPermanent && !canAppeal && !isAppealSubmitted && (
                    <p style={styles.hint}>停權期間無法使用任何功能，請耐心等待解除。</p>
                )}

                <button style={styles.logoutBtn} onClick={logout}>登出</button>
            </div>
        </div>
    )
}

const styles = {
    overlay: {
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(28, 26, 24, 0.85)', backdropFilter: 'blur(8px)',
        fontFamily: "'Noto Sans TC', sans-serif",
    },
    card: {
        width: '90%', maxWidth: 420,
        backgroundColor: '#FFFCF8', borderRadius: 16,
        padding: '40px 28px', textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        maxHeight: '90vh', overflowY: 'auto',
    },
    iconCircle: {
        width: 72, height: 72, borderRadius: '50%',
        backgroundColor: '#FFF3E0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
    },
    title: { fontSize: 22, fontWeight: 700, color: '#1C1A18', margin: '0 0 24px' },
    reasonBox: {
        backgroundColor: '#FFF8F0', border: '1px solid #F5D9B8',
        borderRadius: 10, padding: '16px 20px', marginBottom: 20,
    },
    reasonLabel: { fontSize: 12, color: '#B0A89A', margin: '0 0 6px', fontWeight: 500 },
    reasonText: { fontSize: 15, color: '#B44D1E', margin: 0, fontWeight: 600, lineHeight: 1.5 },
    infoRow: { display: 'flex', gap: 12, marginBottom: 24 },
    infoItem: {
        flex: 1, backgroundColor: '#F5F1EC', borderRadius: 10,
        padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 4,
    },
    infoLabel: { fontSize: 11, color: '#B0A89A', fontWeight: 500 },
    infoValue: { fontSize: 14, color: '#1C1A18', fontWeight: 600 },
    hint: { fontSize: 13, color: '#8A8078', margin: '0 0 28px', lineHeight: 1.6 },
    logoutBtn: {
        width: '100%', padding: '14px 0', border: 'none', borderRadius: 10,
        backgroundColor: '#1C1A18', color: '#FFFCF8', fontSize: 15, fontWeight: 600,
        cursor: 'pointer', fontFamily: "'Noto Sans TC', sans-serif",
    },
    // ── 申訴相關樣式 ──
    appealInfo: {
        backgroundColor: '#F1F8E9', border: '1px solid #C5E1A5',
        borderRadius: 10, padding: '14px 16px', marginBottom: 20,
    },
    appealInfoText: { fontSize: 14, color: '#33691E', margin: 0, lineHeight: 1.6 },
    appealBtn: {
        width: '100%', padding: '14px 0', border: 'none', borderRadius: 10,
        backgroundColor: '#E65100', color: '#fff', fontSize: 15, fontWeight: 600,
        cursor: 'pointer', fontFamily: "'Noto Sans TC', sans-serif", marginBottom: 16,
    },
    formContainer: {
        textAlign: 'left', marginBottom: 20,
        backgroundColor: '#FAFAFA', borderRadius: 10, padding: 16,
    },
    formLabel: { fontSize: 13, fontWeight: 600, color: '#1C1A18', display: 'block', marginBottom: 6 },
    textarea: {
        width: '100%', minHeight: 100, padding: 12, borderRadius: 8,
        border: '1px solid #DDD', fontSize: 14, resize: 'vertical',
        fontFamily: "'Noto Sans TC', sans-serif", boxSizing: 'border-box',
    },
    charCount: { fontSize: 11, color: '#B0A89A', textAlign: 'right', margin: '4px 0 12px' },
    fileInput: { display: 'block', marginBottom: 8, fontSize: 13 },
    errorText: { fontSize: 13, color: '#C62828', margin: '8px 0' },
}
