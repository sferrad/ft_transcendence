import type React from 'react'

interface ObstacleProps {
  x: number
  y: number
  radius: number
  themeId?: string
}

export function Obstacle({ x, y, radius, themeId }: ObstacleProps) {
  const size = radius * 2
  const base: React.CSSProperties = {
    position: 'absolute',
    left: x - radius,
    top: y - radius,
    width: size,
    height: size,
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 5,
  }

  if (themeId === 'neon') {
    return (
      <div style={{
        ...base,
        borderRadius: 6,
        background: 'linear-gradient(135deg, #00ffe0 0%, #0066ff 100%)',
        boxShadow: '0 0 10px 3px #00ffe0, 0 0 22px 6px #0066ff66, inset 0 0 8px rgba(0,255,224,0.3)',
        border: '2px solid #00ffe0',
      }} />
    )
  }

  return (
    <img
      src="/assets/brick.png"
      alt=""
      style={base}
    />
  )
}
