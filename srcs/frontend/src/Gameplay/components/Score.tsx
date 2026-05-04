import { type CSSProperties } from 'react'

interface ScoreProps {
  leftScore: number
  rightScore: number
  leftName: string
  rightName: string
  style?: CSSProperties
}

export function Score({ leftScore, rightScore, leftName, rightName, style }: ScoreProps) {
  return (
    <div style={{
      position: 'absolute',
      top: 20,
      width: '100%',
      display: 'flex',
      justifyContent: 'space-around',
      color: 'white',
      fontSize: 32,
      fontWeight: 'bold',
      ...style,
    }}>
      <span>{leftName}: {leftScore}</span>
      <span>{rightName}: {rightScore}</span>
    </div>
  )
}