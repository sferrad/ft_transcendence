import { useState } from 'react'
import {
  getPlayerVisualLayout,
  getPlayerSpriteFrameSize,
  PLAYER_SPRITE_ASPECT_RATIO,
  PLAYER_SPRITE_TOP_OFFSET,
  PLAYER_SPRITE_ZOOM,
  KICK_ANIM_FRAMES,
} from '../engine'

interface CharacterProps {
  x: number
  y: number
  radius: number
  color: string
  nation?: string
  isKicking?: boolean
  kickTimer?: number
  facingRight?: boolean
  // Effets temporaires actifs (frames restantes, 0 = aucun).
  freezeFrames?: number
  speedBoostFrames?: number
  kickBoostFrames?: number
}

function nationToFaceSrc(nation: string): string {
  const key = nation.trim().toLowerCase()
  const base = import.meta.env.BASE_URL
  if (key === 'morocco' || key === 'maroc') return `${base}assets/perso/morocco-face.png`
  if (key === 'tunisia' || key === 'tunisie') return `${base}assets/perso/tunisia-face.png`
  return `${base}assets/perso/algeria-face.png`
}

export function Character({
  x, y, radius, color,
  nation = 'Algeria',
  isKicking = false,
  kickTimer = 0,
  facingRight = true,
  freezeFrames = 0,
  speedBoostFrames = 0,
  kickBoostFrames = 0,
}: CharacterProps) {
  const [imgFailed, setImgFailed] = useState(false)

  const frameSize = getPlayerSpriteFrameSize(radius)
  const spriteLeft = x - frameSize / 2
  const spriteTop = y - radius * PLAYER_SPRITE_TOP_OFFSET
  const fallbackHeight = frameSize / PLAYER_SPRITE_ASPECT_RATIO

  const kickProgress = isKicking && kickTimer > 0
    ? (KICK_ANIM_FRAMES - kickTimer + 1) / KICK_ANIM_FRAMES
    : 0
  const layout = getPlayerVisualLayout(x, y, radius, isKicking, facingRight, kickProgress)
  const shoeSrc = `${import.meta.env.BASE_URL}assets/shoes.png`

  const isFrozen = freezeFrames > 0
  const activeEffects: string[] = []
  if (isFrozen) activeEffects.push('❄️')
  if (speedBoostFrames > 0) activeEffects.push('⚡')
  if (kickBoostFrames > 0) activeEffects.push('💥')

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, zIndex: 10 }}>
      {/* Badges des effets actifs, flottant au-dessus de la tête. */}
      {activeEffects.length > 0 && (
        <div
          style={{
            position: 'absolute',
            left: x - 40,
            top: spriteTop - 28,
            width: 80,
            display: 'flex',
            gap: 4,
            justifyContent: 'center',
            fontSize: 22,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {activeEffects.map((e, i) => <span key={i}>{e}</span>)}
        </div>
      )}

      {/* Visage du joueur (visuel uniquement, pas de collision). */}
      {!imgFailed && (
        <div
          style={{
            position: 'absolute',
            left: spriteLeft,
            top: spriteTop,
            width: frameSize,
            height: frameSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: layout.mirrored ? 'scaleX(-1)' : 'none',
            pointerEvents: 'none',
          }}
        >
          <img
            src={nationToFaceSrc(nation)}
            alt={nation}
            onError={() => setImgFailed(true)}
            style={{
              width: frameSize,
              height: 'auto',
              transform: `scale(${PLAYER_SPRITE_ZOOM})`,
              transformOrigin: 'center center',
              imageRendering: 'pixelated',
              filter: isFrozen
                ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.55)) hue-rotate(180deg) brightness(1.1) saturate(1.4)'
                : 'drop-shadow(0 4px 8px rgba(0,0,0,0.55))',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        </div>
      )}

      {/* Fallback visible uniquement si l'image a échoué : un cadre coloré. */}
      {imgFailed && (
        <div
          style={{
            position: 'absolute',
            left: spriteLeft,
            top: spriteTop,
            width: frameSize,
            height: fallbackHeight,
            backgroundColor: 'rgba(255,255,255,0.12)',
            boxShadow: `0 0 0 2px ${color}`,
          }}
        />
      )}

      {/* Pied : suit l'orbite calculée dans playerSpriteGeometry. */}
      <div
        style={{
          position: 'absolute',
          left: layout.shoe.left,
          top: layout.shoe.top,
          width: layout.shoe.width,
          height: layout.shoe.height,
          transform: `rotate(${(layout.shoe.rotation * 180) / Math.PI}deg) scaleX(${layout.shoe.mirrored ? -1 : 1})`,
          transformOrigin: 'center center',
          transition: 'transform 0.06s ease-out',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <img
          src={shoeSrc}
          alt="shoe"
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: 'scaleX(-4) scaleY(-4)',
            imageRendering: 'pixelated',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      </div>
    </div>
  )
}
