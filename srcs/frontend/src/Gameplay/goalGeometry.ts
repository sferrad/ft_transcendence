import { type Goal } from './types'
import { GOAL_BASE_INNER_WIDTH } from './goalConfig'

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
  // Calcul basé uniquement sur les dimensions physiques de la cage
  const frontWidth = GOAL_BASE_INNER_WIDTH
  // La largeur visuelle est proportionnelle aux dimensions physiques
  const width = frontWidth * 4
  const height = goal.postHeight
  
  // Positionnement horizontal selon le côté
  const left = goal.side === 'left' ? goal.x - 130 : goal.x - width + 130
  const right = left + width
  const top = goal.crossbarY - 30
  
  const barBottom = top + goal.crossbarHeight
  const middleX = left + width / 2
  
  // Seuil de but : 20% de pénétration dans l'ouverture
  const entryThreshold = goal.side === 'left'
    ? right - width * 0.2
    : left + width * 0.2

  return { left, right, top, width, height, barBottom, middleX, entryThreshold }
}