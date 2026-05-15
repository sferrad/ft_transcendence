// Comportement de l'adversaire IA en mode solo.

import { type Ball, type Player, type Happening } from './types'
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, GOAL_BASE_INNER_WIDTH,
  PLAYER_FLOOR_Y, JUMP_FORCE, GRAVITY_PLAYER, KICK_RANGE,
  SPEED_BOOST_MULTIPLIER,
  DASH_IMPULSE, DASH_DECAY, DASH_STOP_EPSILON, DASH_COOLDOWN_FRAMES,
} from './constants'
import { dashBoosts, dashCooldowns } from './input'
import { rng } from './rng'

const AI_SPEED_NORMAL = 4.5
const AI_SPEED_DEFEND = 7.5
const AI_SHOOT_PROBABILITY = 0.2

// Frames avant que le second dash du saut-derrière se déclenche (0 = inactif).
let aiSecondDashFrames = 0

export function resetAIJumpDash(): void {
  aiSecondDashFrames = 0
}

// Dissipation du dash, identique à celle de input.ts.
function decayDash(boost: number): number {
  const decayed = boost * DASH_DECAY
  return Math.abs(decayed) < DASH_STOP_EPSILON ? 0 : decayed
}

// Calcule vx/vy de l'IA pour la frame courante.
export function computeAIVelocity(ai: Player, ball: Ball, happening: Happening | null): void {
  // Gelé : immobile, seule la gravité s'applique.
  if (ai.freezeFrames > 0) {
    ai.vx = 0
    ai.vy += GRAVITY_PLAYER
    return
  }

  // Cooldown + dissipation du boost (slot 1 = joueur 2 / IA).
  if (dashCooldowns[1] > 0) dashCooldowns[1]--
  dashBoosts[1] = decayDash(dashBoosts[1])

  // Décompte du second dash du saut-derrière.
  if (aiSecondDashFrames > 0) aiSecondDashFrames--
  // Déclenchement du second dash dès que le compteur arrive à 1 et que le cooldown est libre.
  if (aiSecondDashFrames === 1 && dashCooldowns[1] <= 0) {
    dashBoosts[1] = DASH_IMPULSE
    dashCooldowns[1] = DASH_COOLDOWN_FRAMES
  }

  const ballHeadingToAIGoal = ball.vx < -2
  const ballFastToAIGoal    = ball.vx < -5
  const aiGoalX = CANVAS_WIDTH - GOAL_BASE_INNER_WIDTH / 2
  const onGround = ai.y >= PLAYER_FLOOR_Y - 1
  const speedMul = ai.speedBoostFrames > 0 ? SPEED_BOOST_MULTIPLIER : 1

  // ── Saut + double dash pour passer derrière le ballon ────────────────────
  // Condition : ballon clairement à droite de l'IA (= derrière elle),
  // pas en urgence défensive, sur le sol, pas de manœuvre en cours.
  const ballBehindAI =
    ball.x > ai.x + ai.radius * 3 &&
    ball.x < CANVAS_WIDTH - 80
  if (
    ballBehindAI &&
    !ballFastToAIGoal &&
    onGround &&
    dashCooldowns[1] <= 0 &&
    aiSecondDashFrames === 0
  ) {
    ai.vy = JUMP_FORCE                         // saut
    dashBoosts[1] = DASH_IMPULSE               // premier dash à droite
    dashCooldowns[1] = DASH_COOLDOWN_FRAMES
    // Le second dash se déclenchera quand ce compteur atteint 1.
    aiSecondDashFrames = DASH_COOLDOWN_FRAMES + 1
  }

  // ── Cible de déplacement ─────────────────────────────────────────────────
  const happeningReachable =
    happening !== null &&
    !ballFastToAIGoal &&
    Math.abs(happening.x - ai.x) < 350

  let targetX: number
  if (happeningReachable && happening) {
    targetX = happening.x
  } else if (ballHeadingToAIGoal) {
    targetX = Math.min(aiGoalX - ai.radius - 10, ball.x + 80)
  } else {
    targetX = ball.x
  }

  const baseSpeed = ballHeadingToAIGoal && !happeningReachable ? AI_SPEED_DEFEND : AI_SPEED_NORMAL
  const speed = baseSpeed * speedMul

  let vx = 0
  if (ai.x < targetX - 10) vx = speed
  else if (ai.x > targetX + 10) vx = -speed

  // ── Dashes situationnels (hors séquence saut-derrière) ───────────────────
  if (dashCooldowns[1] <= 0 && onGround && aiSecondDashFrames === 0) {
    const distToTarget = Math.abs(targetX - ai.x)

    // Repositionnement rapide si cible lointaine (~1 fois/2s).
    if (distToTarget > 200 && rng() < 0.008) {
      dashBoosts[1] = targetX > ai.x ? DASH_IMPULSE : -DASH_IMPULSE
      dashCooldowns[1] = DASH_COOLDOWN_FRAMES
    }

    // Dash offensif pour écraser le ballon à portée.
    const distToBall = Math.hypot(ball.x - ai.x, ball.y - ai.y)
    if (!ballHeadingToAIGoal && distToBall < ai.radius * 5 && rng() < 0.012) {
      dashBoosts[1] = ball.x > ai.x ? DASH_IMPULSE : -DASH_IMPULSE
      dashCooldowns[1] = DASH_COOLDOWN_FRAMES
    }
  }

  ai.vx = vx + dashBoosts[1]

  // ── Saut ─────────────────────────────────────────────────────────────────
  const ballOnAISide  = ball.x > CANVAS_WIDTH * 0.55
  const ballRising    = ball.vy < -1 && ball.y < CANVAS_HEIGHT * 0.5
  const ballHighAbove = ball.y < ai.y - ai.radius * 2.5
  const happeningHigh =
    happening !== null &&
    happening.y < ai.y - ai.radius * 3 &&
    Math.abs(happening.x - ai.x) < 120

  const shouldJump =
    ((ballOnAISide && (ballRising || ballHighAbove)) || happeningHigh) && onGround
  if (shouldJump) ai.vy = JUMP_FORCE
  ai.vy += GRAVITY_PLAYER
}

export function aiWantsToShoot(ai: Player, ball: Ball): boolean {
  if (ai.freezeFrames > 0) return false
  const dist = Math.hypot(ball.x - ai.x, ball.y - ai.y)
  const inRange = dist <= ai.radius + ball.radius + KICK_RANGE + 20
  const prob = ai.kickBoostFrames > 0 ? AI_SHOOT_PROBABILITY * 2 : AI_SHOOT_PROBABILITY
  return inRange && rng() < prob
}
