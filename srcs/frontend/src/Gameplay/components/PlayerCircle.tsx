import { useState } from 'react'
import { getPlayerVisualLayout, PLAYER_SPRITE_ASPECT_RATIO, PLAYER_SPRITE_TOP_OFFSET, PLAYER_SPRITE_ZOOM, getPlayerSpriteFrameSize } from '../playerSpriteGeometry'

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
  if (key === 'tunisia' || key === 'tunisie') return `${base}assets/perso/tunisia-face.png`
  return `${base}assets/perso/algeria-face.png`
}

export function PlayerCircle({ x, y, radius, color, nation = 'Algeria', isKicking = false, facingRight = true }: PlayerCircleProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const base = import.meta.env.BASE_URL

  const spriteFrameSize = getPlayerSpriteFrameSize(radius)
  const spriteLeft = x - spriteFrameSize / 2
  const spriteTop = y - radius * PLAYER_SPRITE_TOP_OFFSET
  const faceSrc = nationToFaceSrc(nation)
  const pngRenderHeight = spriteFrameSize / PLAYER_SPRITE_ASPECT_RATIO
  const spriteZoom = PLAYER_SPRITE_ZOOM
  const layout = getPlayerVisualLayout(x, y, radius, isKicking, facingRight)
  const shoeSrc = `${base}assets/shoes.png`

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
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: layout.mirrored ? 'scaleX(-1)' : 'none',
          }}
        >
          <img
            src={faceSrc}
            alt={nation}
            onError={() => setImgFailed(true)}
            style={{
              width: spriteFrameSize,
              height: 'auto',
              transform: `scale(${spriteZoom})`,
              transformOrigin: 'center center',
              imageRendering: 'pixelated',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.55))',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        </div>
      )}

      <div style={{
        position: 'absolute',
        left: spriteLeft,
        top: spriteTop,
        width: spriteFrameSize,
        height: pngRenderHeight,
        borderRadius: 0,
        backgroundColor: imgFailed ? 'rgba(255,255,255,0.12)' : 'transparent',
        boxShadow: imgFailed ? `0 0 0 2px ${color}` : 'none',
      }} />

      {/* Pied */}
      <div
        style={{
          position: 'absolute',
          left: layout.shoe.left,
          top: layout.shoe.top,
          width: layout.shoe.width,
          height: layout.shoe.height,
          transform: `rotate(${(layout.shoe.rotation * 180) / Math.PI}deg) scaleX(${layout.shoe.mirrored ? -1 : 1})`,
          transformOrigin: 'center center',
          transition: isKicking
            ? 'transform 0.06s ease-out'
            : 'transform 0.12s ease-out',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <img
          src={shoeSrc}
          alt="shoe"
          onError={() => setImgFailed(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            imageRendering: 'auto',
            pointerEvents: 'none',
            userSelect: 'none',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
          }}
        />
      </div>
    </div>
  )
}