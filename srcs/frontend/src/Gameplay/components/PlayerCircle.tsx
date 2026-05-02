import { useState, useEffect } from 'react'

interface PlayerCircleProps {
  x: number
  y: number
  radius: number
  color: string
  nation?: string
  isKicking?: boolean
  facingRight?: boolean
}

function nationToFaceSrc(nation: string): string {
  const key = nation?.trim().toLowerCase() || ''
  // Be defensive: import.meta may not be available in some tooling/runtime
  const base = (typeof import !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/'

  try {
    if (key === 'morocco' || key === 'maroc') return `${base}assets/perso/morocco-face.png`
    if (key === 'tunisia' || key === 'tunisie') return `${base}assets/perso/tunisian-face.png`
  } catch (e) {
    // fallback handled below
  }

  return `${base}assets/perso/algerian-face.png`
}

export function PlayerCircle({ x, y, radius, color, nation = 'Algeria', isKicking = false, facingRight = true }: PlayerCircleProps) {
  const [imgFailed, setImgFailed] = useState(false)

  // We'll load the image to read its natural height and use that as the
  // square side. If loading fails or hasn't completed yet we fall back to
  // a size relative to `radius`.
  const [naturalHeight, setNaturalHeight] = useState<number | null>(null)
  const faceSrc = nationToFaceSrc(nation)

  useEffect(() => {
    setNaturalHeight(null)
    setImgFailed(false)
    const img = new Image()
    img.src = faceSrc
    img.onload = () => setNaturalHeight(img.naturalHeight || null)
    img.onerror = () => setImgFailed(true)
    useEffect(() => {
      setNaturalHeight(null)
      setImgFailed(false)
      if (typeof window === 'undefined' || !faceSrc) return

      let mounted = true
      try {
        const img = new window.Image()
        img.src = faceSrc
        img.onload = () => {
          if (!mounted) return
          try {
            const h = Number(img.naturalHeight || img.height || 0)
            setNaturalHeight(h > 0 ? h : null)
          } catch (_) {
            setNaturalHeight(null)
          }
        }
        img.onerror = () => {
          if (!mounted) return
          setImgFailed(true)
        }
        return () => {
          mounted = false
        }
      } catch (e) {
        setImgFailed(true)
      }
    }, [faceSrc])
  const rotation = (footAngleRad * 180) / Math.PI + (isKicking ? 0 : 6)

  return (
    <div style={{ position: 'absolute', left: 0, top: 0 }}>
      {/* Visage/joueur: visuel uniquement, collisions inchangées (rayon dans le moteur). */}
      {!imgFailed && (
        <div
          style={{
            position: 'absolute',
            left: spriteLeft,
            top: spriteTop,
            width: spriteFrameSize,
            height: spriteFrameSize,
            borderRadius: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={faceSrc}
            alt={nation}
            onError={() => setImgFailed(true)}
            style={{
              width: 'auto',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center center',
              transform: `scaleX(${facingRight ? 1 : -1}) scale(${spriteZoom})`,
              transformOrigin: '50% 50%',
              imageRendering: 'pixelated',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.55))',
              pointerEvents: 'none',
              userSelect: 'none',
              display: 'block',
            }}
          />
        </div>
      )}

      <div style={{
        position: 'absolute',
        left: x - radius,
        top: y - radius,
        width: radius * 2,
        height: radius * 2,
        borderRadius: 0,
        backgroundColor: imgFailed ? 'rgba(255,255,255,0.12)' : 'transparent',
        boxShadow: imgFailed ? `0 0 0 2px ${color}` : 'none',
      }} />

      {/* Pied */}
      <div style={{
        position: 'absolute',
        left: footCenterX - footW / 2,
        top: footCenterY - footH / 2,
        width: footW,
        height: footH,
        borderRadius: 6,
        backgroundColor: isKicking ? '#ffffff' : '#e0e0e0',
        border: `2.5px solid ${color}`,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center center',
        transition: isKicking
          ? 'transform 0.06s ease-out'
          : 'transform 0.12s ease-out',
        boxShadow: isKicking ? `0 2px 8px rgba(255,255,255,0.5)` : 'none',
      }} />
    </div>
  )
}