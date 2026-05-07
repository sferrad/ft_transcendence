import { type Goal } from '../types'
import { getGoalVisualBounds } from '../goalGeometry'


interface GoalPostProps {
  goal: Goal
}

export function GoalPost({ goal }: GoalPostProps) {
  const isLeft = goal.side === 'left'
  const base = import.meta.env.BASE_URL
  const visual = getGoalVisualBounds(goal)

  return (
    <div
      style={{
        position: 'absolute',
        left: visual.left,
        top: visual.top,
        width: visual.width,
        height: visual.height,
        zIndex: 30,
        pointerEvents: 'none',
      }}
    >
      <img
        src={`${base}assets/Cage.png`}
        alt="goal cage"
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '60vw',
          maxHeight: '60vh',
          objectFit: 'contain',
          display: 'block',
          transform: isLeft ? 'scaleX(-1)' : 'none',
          transformOrigin: 'center',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}