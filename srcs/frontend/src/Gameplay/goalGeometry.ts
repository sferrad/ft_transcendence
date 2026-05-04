import { type Goal } from './types'

export const GOAL_VISUAL_WIDTH_MULTIPLIER = 4
export const CAGE_ASPECT_RATIO = 1
export const GOAL_VISUAL_OUTER_OFFSET = 130
export const GOAL_VISUAL_TOP_OFFSET = 30
export const GOAL_SCORE_ENTRY_RATIO = 0.2

export type GoalVisualBounds = {
  left: number
  right: number
  top: number
  width: number
  height: number
  barBottom: number
  middleX: number
  entryThreshold: number
}

export function getGoalVisualBounds(goal: Goal): GoalVisualBounds {
  const frontWidth = goal.postWidth + goal.innerWidth
  const width = frontWidth * GOAL_VISUAL_WIDTH_MULTIPLIER
  const height = width / CAGE_ASPECT_RATIO
  const left = goal.side === 'left' ? goal.x - GOAL_VISUAL_OUTER_OFFSET : goal.x - width + GOAL_VISUAL_OUTER_OFFSET
  const right = left + width
  const top = goal.crossbarY + goal.postHeight - height / 2 - GOAL_VISUAL_TOP_OFFSET
  const barBottom = top + goal.crossbarHeight
  const middleX = left + width / 2
  const entryThreshold = goal.side === 'left'
    ? right - width * GOAL_SCORE_ENTRY_RATIO
    : left + width * GOAL_SCORE_ENTRY_RATIO

  return { left, right, top, width, height, barBottom, middleX, entryThreshold }
}