interface PlayerCircleProps {
  x: number
  y: number
  radius: number
  color: string
  isKicking?: boolean
  facingRight?: boolean
}

export function PlayerCircle({ x, y, radius, color, isKicking = false, facingRight = true }: PlayerCircleProps) {
  const footW = 26
  const footH = 13
  const side = facingRight ? 1 : -1

  // Repos : pied centré sous le cercle, légèrement décalé vers l'avant
  const restOffsetX = side * 6
  const restOffsetY = radius - 2

  // Frappe : pied part loin vers l'avant-bas avec rotation franche
  const kickOffsetX = side * (radius * 0.7)
  const kickOffsetY = radius + 10
  const kickRotation = side * 45

  const offsetX = isKicking ? kickOffsetX : restOffsetX
  const offsetY = isKicking ? kickOffsetY : restOffsetY
  const rotation = isKicking ? kickRotation : side * 5  // légère inclinaison au repos

  const footCenterX = x + offsetX
  const footCenterY = y + offsetY

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
        transition: isKicking ? 'none' : 'transform 0.1s ease-out, left 0.1s ease-out, top 0.1s ease-out',
        boxShadow: isKicking ? `0 2px 8px rgba(255,255,255,0.5)` : 'none',
      }} />
    </div>
  )
}