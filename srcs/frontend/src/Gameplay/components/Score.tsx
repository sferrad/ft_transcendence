interface ScoreProps {
  leftScore: number
  rightScore: number
  leftName: string
  rightName: string
}

export function Score({ leftScore, rightScore, leftName, rightName }: ScoreProps) {
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
    }}>
      <span>{leftName}: {leftScore}</span>
      <span>{rightName}: {rightScore}</span>
    </div>
  )
}