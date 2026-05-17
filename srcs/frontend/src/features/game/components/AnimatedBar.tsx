import { useState, useEffect } from 'react'

interface AnimatedBarProps {
  fromPct: number
  toPct: number
  color: string
  glowColor: string
}

export function AnimatedBar({ fromPct, toPct, color, glowColor }: AnimatedBarProps) {
  const [fill, setFill] = useState(fromPct)
  useEffect(() => {
    const id = setTimeout(() => setFill(toPct), 500)
    return () => clearTimeout(id)
  }, [toPct])
  return (
    <div style={{ width: '100%', height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.13)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)' }}>
      <div style={{ height: '100%', borderRadius: 14, background: `linear-gradient(90deg, ${color}99, ${color})`, width: `${fill}%`, transition: 'width 1.3s cubic-bezier(0.4,0,0.2,1)', boxShadow: `0 0 14px ${glowColor}99` }} />
    </div>
  )
}
