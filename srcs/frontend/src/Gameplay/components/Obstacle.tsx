interface ObstacleProps {
  x: number
  y: number
  radius: number
}

// Rond blanc statique : visuel d'un obstacle. La physique du rebond est gérée
// dans engine/physics.ts (checkObstacleCollisions).
export function Obstacle({ x, y, radius }: ObstacleProps) {
  const size = radius * 2
  return (
    <div
      style={{
        position: 'absolute',
        left: x - radius,
        top: y - radius,
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, #ffffff 0%, #e5e7eb 70%, #cbd5e1 100%)',
        boxShadow: '0 0 18px rgba(255,255,255,0.55), inset 0 -4px 8px rgba(0,0,0,0.15)',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 5,
      }}
    />
  )
}
