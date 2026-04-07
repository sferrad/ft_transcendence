interface PlayerCircleProps {
  x: number
  y: number
  radius: number
  color: string
  isKicking?: boolean
  facingRight?: boolean
}

export function PlayerCircle({ x, y, radius, color, isKicking = false, facingRight = true }: PlayerCircleProps) {
  const footW = Math.max(28, radius * 1.18)
  const footH = Math.max(13, radius * 0.54)

  // Le pied suit un arc naturel: repos sous le corps, tir vers l'avant.
  const restAngle = 1.5
  const kickAngle = 0
  const kickProgress = isKicking ? 1 : 0
  const localAngle = restAngle + (kickAngle - restAngle) * kickProgress
  const footAngleRad = facingRight ? localAngle : Math.PI - localAngle
  // On garde le pied accroché au bas du corps avec un léger décalage vers l'arrière.
  const footDistance = radius * (isKicking ? 0.98 : 0.85)

  const footCenterX = x + Math.cos(footAngleRad) * footDistance - (facingRight ? radius * 0.4 : -radius * 0.4)
  const footCenterY = y + Math.sin(footAngleRad) * footDistance + radius * 0.1
  const rotation = (footAngleRad * 180) / Math.PI + (isKicking ? 0 : 6)

  return (
    <div style={{ position: 'absolute', left: 0, top: 0 }}>
      {/* Corps */}
      <div style={{
        position: 'absolute',
        left: x - radius,
        top: y - radius,
        width: radius * 2,
        height: radius * 2,
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: `0 3px 8px rgba(0,0,0,0.4)`,
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