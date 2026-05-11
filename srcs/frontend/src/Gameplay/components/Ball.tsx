interface BallProps {
  x: number
  y: number
  radius: number
  filter?: string
  glow?: string
}

export function Ball({ x, y, radius, filter, glow }: BallProps) {
  const base = import.meta.env.BASE_URL
  const size = radius * 2

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
      borderRadius: '50%',
      boxShadow: glow ?? 'none',
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
          filter: filter ?? 'none',
        }}
      />
    </div>
  )
}
