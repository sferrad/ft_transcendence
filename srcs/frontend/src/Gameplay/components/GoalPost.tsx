import { type Goal } from '../types'

interface GoalPostProps {
  goal: Goal
}

export function GoalPost({ goal }: GoalPostProps) {
  const isLeft = goal.side === 'left'

  return (
    <div style={{ position: 'absolute', left: 0, top: 0 }}>
      {/* Poteau vertical */}
      <div style={{
        position: 'absolute',
        left: goal.x,
        top: goal.crossbarY,
        width: goal.postWidth,
        height: goal.postHeight,
        backgroundColor: '#ffffff',
      }} />

      {/* Barre transversale */}
      <div style={{
        position: 'absolute',
        left: isLeft ? goal.x : goal.x - goal.innerWidth,
        top: goal.crossbarY,
        width: goal.postWidth + goal.innerWidth,
        height: goal.crossbarHeight,
        backgroundColor: '#ffffff',
      }} />
    </div>
  )
}