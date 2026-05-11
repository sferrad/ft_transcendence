import { type Happening as HappeningData, type HappeningKind } from '../engine'

interface HappeningProps {
  happening: HappeningData
  themeId?: string
}

const KIND_STYLE: Record<HappeningKind, { emoji: string; aura: string; neonColor: string }> = {
  freeze:     { emoji: '❄️', aura: 'rgba(125, 211, 252, 0.85)', neonColor: '#7dd3fc' },
  speedBoost: { emoji: '⚡', aura: 'rgba(250, 204, 21, 0.85)',  neonColor: '#facc15' },
  megaKick:   { emoji: '💥', aura: 'rgba(248, 113, 113, 0.85)', neonColor: '#f87171' },
  slowBall:   { emoji: '🐢', aura: 'rgba(134, 239, 172, 0.85)', neonColor: '#86efac' },
  shrinkGoal: { emoji: '🛡️', aura: 'rgba(165, 180, 252, 0.85)', neonColor: '#a5b4fc' },
  growGoal:   { emoji: '🎯', aura: 'rgba(251, 146, 60, 0.85)',  neonColor: '#fb923c' },
}

export function Happening({ happening, themeId }: HappeningProps) {
  const { emoji, aura, neonColor } = KIND_STYLE[happening.kind]
  const size = happening.radius * 2

  const isNeon = themeId === 'neon'

  return (
    <div
      style={{
        position: 'absolute',
        left: happening.x - happening.radius,
        top: happening.y - happening.radius,
        width: size,
        height: size,
        clipPath: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
        backgroundColor: isNeon ? 'rgba(0, 10, 20, 0.88)' : 'rgba(255,255,255,0.92)',
        border: isNeon ? `2px solid ${neonColor}` : 'none',
        boxShadow: isNeon
          ? `0 0 14px 4px ${neonColor}, 0 0 30px 8px ${neonColor}55`
          : `0 0 22px ${aura}, 0 0 6px rgba(0,0,0,0.3)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.65,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 15,
      }}
    >
      {emoji}
    </div>
  )
}
