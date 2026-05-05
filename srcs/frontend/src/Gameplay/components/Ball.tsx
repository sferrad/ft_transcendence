interface BallProps {
  x: number
  y: number
  radius: number
}

export function Ball({ x, y, radius }: BallProps) {
  const base = import.meta.env.BASE_URL
  const size = radius * 2 // L'image est plus grande que le cercle de collision pour un meilleur rendu visuel

  return (
    <div style={{
      position: 'absolute',
      left: x - radius,
      top: y - radius,
      width: size,
      height: size,
      pointerEvents: 'none',
      userSelect: 'none',
      zIndex: 20,
    }}>
      <img
        src={`${base}assets/ball.png`}
        alt="ball"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
    </div>
  )
}