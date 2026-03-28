import { type Goal } from '../types'

interface GoalPostProps {
  goal: Goal
}

export function GoalPost({ goal }: GoalPostProps) {
  const isLeft = goal.side === 'left'

  return (
    <>
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
        left: isLeft ? goal.x : goal.x - 30,
        top: goal.crossbarY,
        width: goal.postWidth + 30,
        height: goal.crossbarHeight,
        backgroundColor: '#ffffff',
      }} />
    </>
  )
}