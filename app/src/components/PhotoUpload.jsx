import React, { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * 通用圖片上傳元件
 *
 * Props:
 *   photos         - { id, url, file? }[]：目前的照片列表
 *   coverId        - string：封面照片 id
 *   maxCount       - number：最多可上傳幾張（預設 5）
 *   onPhotosChange - (photos[]) => void
 *   onCoverChange  - (id: string) => void
 */
export default function PhotoUpload({ photos, coverId, maxCount = 5, onPhotosChange, onCoverChange }) {
    const inputRef = useRef()
    const photosRef = useRef(photos)   // always up-to-date
    const [hovered, setHovered] = useState(null)

    useEffect(() => { photosRef.current = photos }, [photos])

    const handleFiles = (e) => {
        const files = Array.from(e.target.files)
        const current = photosRef.current
        const remaining = maxCount - current.length
        if (remaining <= 0) return
        const toAdd = files.slice(0, remaining)
        let pending = toAdd.length
        const accumulated = []

        toAdd.forEach(file => {
            const reader = new FileReader()
            reader.onload = ev => {
                // 同時保留 file 物件供上傳用
                accumulated.push({ id: Date.now() + Math.random(), url: ev.target.result, file })
                pending--
                if (pending === 0) {
                    const updated = [...photosRef.current, ...accumulated]
                    onPhotosChange(updated)
                    if (!coverId) onCoverChange(updated[0].id)
                }
            }
            reader.readAsDataURL(file)
        })
        e.target.value = ''
    }

    const removePhoto = (id, e) => {
        e.stopPropagation()
        const updated = photos.filter(p => p.id !== id)
        onPhotosChange(updated)
        if (coverId === id) onCoverChange(updated[0]?.id || '')
    }

    const tileStyle = {
        width: 100, height: 100, borderRadius: 8, overflow: 'hidden',
        position: 'relative', flexShrink: 0, cursor: 'pointer',
    }

    return (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {photos.map(photo => (
                <div key={photo.id} style={tileStyle}
                    onClick={() => onCoverChange(photo.id)}
                    onMouseEnter={() => setHovered(photo.id)}
                    onMouseLeave={() => setHovered(null)}
                >
                    <img src={photo.url} alt="" style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        outline: photo.id === coverId ? '2.5px solid #C4A882' : 'none',
                        outlineOffset: -2,
                    }} />
                    {/* Cover badge */}
                    {photo.id === coverId && (
                        <div style={{
                            position: 'absolute', bottom: 4, left: 4,
                            backgroundColor: '#C4A882', color: '#FFFFFF',
                            fontSize: 10, fontWeight: 600, padding: '2px 6px',
                            borderRadius: 4, fontFamily: 'Noto Sans TC, sans-serif',
                        }}>封面</div>
                    )}
                    {/* Remove button */}
                    {hovered === photo.id && (
                        <button onClick={e => removePhoto(photo.id, e)} style={{
                            position: 'absolute', top: 4, right: 4,
                            width: 20, height: 20, borderRadius: '50%',
                            backgroundColor: 'rgba(28,26,24,0.7)', color: '#FFFFFF',
                            border: 'none', cursor: 'pointer', fontSize: 12, lineHeight: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}><X size={12} strokeWidth={2} /></button>
                    )}
                </div>
            ))}

            {/* Add tile */}
            {photos.length < maxCount && (
                <div onClick={() => inputRef.current.click()} style={{
                    ...tileStyle,
                    backgroundColor: '#F8F4EE', border: '1.5px dashed #D4CCC4',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 4,
                }}>
                    <span style={{ fontSize: 20, color: '#B0A89A', lineHeight: 1 }}>+</span>
                    <span style={{ fontSize: 10, color: '#B0A89A', fontFamily: 'Noto Sans TC, sans-serif' }}>
                        {photos.length}/{maxCount}
                    </span>
                </div>
            )}

            <input ref={inputRef} type="file" multiple accept="image/*"
                style={{ display: 'none' }} onChange={handleFiles} />
        </div>
    )
}
