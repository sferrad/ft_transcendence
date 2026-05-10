import { type CSSProperties } from 'react'

interface ScoreProps {
  leftScore: number
  rightScore: number
  leftName: string
  rightName: string
  style?: CSSProperties
}

// Affiche les deux noms et scores en flex space-around. Position-agnostique :
// le parent (Scene) le place dans la zone noire sous le terrain.
export function Score({ leftScore, rightScore, leftName, rightName, style }: ScoreProps) {
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-around',
        color: 'white',
        fontSize: 32,
        fontWeight: 'bold',
        ...style,
      }}
    >
      <span>{leftName}: {leftScore}</span>
      <span>{rightName}: {rightScore}</span>
    </div>
  )
}
