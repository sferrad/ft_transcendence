interface BallProps {
  x: number
  y: number
  radius: number
}

export function Ball({ x, y, radius }: BallProps) {
  return (
    <div style={{
      position: 'absolute',
      left: x - radius,
      top: y - radius,
      width: radius * 2,
      height: radius * 2,
      borderRadius: '50%',
      backgroundColor: 'white',
    }} />
  )
}