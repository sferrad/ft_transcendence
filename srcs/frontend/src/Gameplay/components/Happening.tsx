import { type Happening as HappeningData, type HappeningKind } from '../engine'

interface HappeningProps {
  happening: HappeningData
}

// Icône emoji + couleur d'aura selon l'effet.
const KIND_STYLE: Record<HappeningKind, { emoji: string; aura: string }> = {
  freeze:     { emoji: '❄️', aura: 'rgba(125, 211, 252, 0.85)' },  // cyan
  speedBoost: { emoji: '⚡', aura: 'rgba(250, 204, 21, 0.85)' },   // jaune
  megaKick:   { emoji: '💥', aura: 'rgba(248, 113, 113, 0.85)' },  // rouge
  slowBall:   { emoji: '🐢', aura: 'rgba(134, 239, 172, 0.85)' },  // vert
  shrinkGoal: { emoji: '🛡️', aura: 'rgba(165, 180, 252, 0.85)' }, // bleu (défensif)
  growGoal:   { emoji: '🎯', aura: 'rgba(251, 146, 60, 0.85)' },   // orange (offensif)
}

// Bonus visible : bulle blanche ronde avec emoji centré et aura colorée
// (la couleur indique le type d'effet d'un coup d'œil).
export function Happening({ happening }: HappeningProps) {
  const { emoji, aura } = KIND_STYLE[happening.kind]
  const size = happening.radius * 2

  return (
    <div
      style={{
        position: 'absolute',
        left: happening.x - happening.radius,
        top: happening.y - happening.radius,
        width: size,
        height: size,
        clipPath: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
        backgroundColor: 'rgba(255,255,255,0.92)',
        boxShadow: `0 0 22px ${aura}, 0 0 6px rgba(0,0,0,0.3)`,
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
