interface BallProps {
  x: number
  y: number
  radius: number
  filter?: string
  glow?: string
  themeId?: string
}

export function Ball({ x, y, radius, filter, glow, themeId }: BallProps) {
  const base = import.meta.env.BASE_URL
  const size = radius * 2

  const baseStyle = {
    position: 'absolute' as const,
    left: x - radius,
    top: y - radius,
    width: size,
    height: size,
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
    zIndex: 20,
    borderRadius: '50%',
  }

  if (themeId === 'neon') {
    return (
      <div style={{
        ...baseStyle,
        background: 'radial-gradient(circle at 35% 30%, #ffffff 0%, #ff00cc 40%, #aa00ff 100%)',
        boxShadow: '0 0 12px 4px #ff00cc, 0 0 28px 10px #aa00ff66, inset 0 0 8px rgba(255,255,255,0.4)',
      }} />
    )
  }

  return (
    <div style={{ ...baseStyle, boxShadow: glow ?? 'none' }}>
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
