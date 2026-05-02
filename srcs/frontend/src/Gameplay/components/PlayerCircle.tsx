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
  const key = nation.trim().toLowerCase()
  const base = import.meta.env.BASE_URL

  if (key === 'morocco' || key === 'maroc') return `${base}assets/perso/morocco-face.png`
  if (key === 'tunisia' || key === 'tunisie') return `${base}assets/perso/tunisian-face.png`
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
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [faceSrc])

  // If we have the image natural height, use it as the square side. Otherwise
  // fallback to a size proportional to the gameplay `radius`.
  const spriteFrameSize = naturalHeight || Math.round(radius * 2.35)
  const spriteLeft = x - spriteFrameSize / 2
  const spriteTop = y - spriteFrameSize / 2
  const spriteZoom = 2.2

  const footW = Math.max(28, radius * 1.18)
  const footH = Math.max(13, radius * 0.54)

  // Le pied suit un arc naturel: repos sous le corps, tir vers l'avant.
  const restAngle = 1.5
  const kickAngle = 0
  const kickProgress = isKicking ? 1 : 0
  const localAngle = restAngle + (kickAngle - restAngle) * kickProgress
  const footAngleRad = facingRight ? localAngle : Math.PI - localAngle
  // Le pivot du pied reste accroché au bas du sprite, la hitbox gameplay reste inchangée.
  const footPivotX = x + (facingRight ? radius * 0.2 : -radius * 0.2)
  const footPivotY = spriteTop + spriteFrameH * 0.92
  const footDistance = radius * (isKicking ? 0.94 : 0.82)

  const footCenterX = footPivotX + Math.cos(footAngleRad) * footDistance
  const footCenterY = footPivotY + Math.sin(footAngleRad) * footDistance
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