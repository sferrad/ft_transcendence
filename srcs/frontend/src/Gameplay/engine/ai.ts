// Comportement de l'adversaire IA en mode solo.

import { type Ball, type Player } from './types'
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, GOAL_BASE_INNER_WIDTH,
  PLAYER_FLOOR_Y, JUMP_FORCE, GRAVITY_PLAYER, KICK_RANGE,
} from './constants'

const AI_SPEED_NORMAL = 4.5
const AI_SPEED_DEFEND = 7.5
// Probabilité de déclencher un tir quand le ballon est à portée.
const AI_SHOOT_PROBABILITY = 0.2

// Calcule vx/vy de l'IA. Elle se positionne offensivement quand elle attaque,
// défend devant son but quand le ballon vient vers elle. Saute pour les balles
// aériennes.
export function computeAIVelocity(ai: Player, ball: Ball): void {
  const ballHeadingToAIGoal = ball.vx < -2
  const aiGoalX = CANVAS_WIDTH - GOAL_BASE_INNER_WIDTH / 2
  const defendX = Math.min(aiGoalX - ai.radius - 10, ball.x + 80)
  const targetX = ballHeadingToAIGoal ? defendX : ball.x
  const speed = ballHeadingToAIGoal ? AI_SPEED_DEFEND : AI_SPEED_NORMAL

  if (ai.x < targetX - 10) ai.vx = speed
  else if (ai.x > targetX + 10) ai.vx = -speed
  else ai.vx = 0

  const ballOnAISide = ball.x > CANVAS_WIDTH * 0.55
  const ballRising = ball.vy < -1 && ball.y < CANVAS_HEIGHT * 0.5
  const ballHighAbove = ball.y < ai.y - ai.radius * 2.5
  const shouldJump = ballOnAISide && (ballRising || ballHighAbove) && ai.y >= PLAYER_FLOOR_Y
  if (shouldJump) ai.vy = JUMP_FORCE
  ai.vy += GRAVITY_PLAYER
}

export function aiWantsToShoot(ai: Player, ball: Ball): boolean {
  const dist = Math.hypot(ball.x - ai.x, ball.y - ai.y)
  const inRange = dist <= ai.radius + ball.radius + KICK_RANGE + 20
  return inRange && Math.random() < AI_SHOOT_PROBABILITY
}
