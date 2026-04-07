import { type GameState, type Ball, type Player, type Goal } from './types'
import { type Keys } from './inputHandler'

export const CANVAS_WIDTH = 1800
export const CANVAS_HEIGHT = 1000
const WINNING_SCORE = 5

const PLAYER_RADIUS = 30
const GOAL_POST_WIDTH = 15
const GOAL_HEIGHT = 195
export const GOAL_INNER_WIDTH = 70
const CROSSBAR_HEIGHT = 10

const GRAVITY_BALL = 0.35
const BOUNCE_DAMPING = 0.8
const BALL_FRICTION = 0.97
const MIN_BOUNCE_VY = 1.8

const KICK_SPEED = 50
const GRAVITY_PLAYER = 0.5
const JUMP_FORCE = -13
// Impulsion initiale du dash: plus grand = dash plus agressif.
const DASH_IMPULSE = 70
// Perte de vitesse du dash à chaque frame (proche de 1 = plus long).
const DASH_DECAY = 0.8
// Seuil d'arrêt pour couper la micro-glisse en fin de dash.
const DASH_STOP_EPSILON = 0.3

// Boost horizontal temporaire conservé d'une frame à l'autre.
const dashBoosts = [0, 0]

const PLAYER1_START_X = 180
const PLAYER2_START_X = CANVAS_WIDTH - 180
const PLAYER_START_Y = CANVAS_HEIGHT - PLAYER_RADIUS

function createGoals(): { goal1: Goal; goal2: Goal } {
  const goal1: Goal = {
    x: 0,
    postWidth: GOAL_POST_WIDTH,
    postHeight: GOAL_HEIGHT,
    innerWidth: GOAL_INNER_WIDTH,
    crossbarY: CANVAS_HEIGHT - GOAL_HEIGHT - CROSSBAR_HEIGHT,
    crossbarHeight: CROSSBAR_HEIGHT,
    side: 'left',
  }
  const goal2: Goal = {
    x: CANVAS_WIDTH - GOAL_POST_WIDTH,
    postWidth: GOAL_POST_WIDTH,
    postHeight: GOAL_HEIGHT,
    innerWidth: GOAL_INNER_WIDTH,
    crossbarY: CANVAS_HEIGHT - GOAL_HEIGHT - CROSSBAR_HEIGHT,
    crossbarHeight: CROSSBAR_HEIGHT,
    side: 'right',
  }
  return { goal1, goal2 }
}

export function createInitialState(): GameState {
  dashBoosts[0] = 0
  dashBoosts[1] = 0
  const { goal1, goal2 } = createGoals()
  return {
    ball: {
      x: CANVAS_WIDTH / 2,
      y: 30,
      vx: (Math.random() > 0.5 ? 1 : -1) * 3,
      vy: 0,
      radius: 20,
    },
    player1: {
      x: PLAYER1_START_X,
      y: PLAYER_START_Y,
      vx: 0,
      vy: 0,
      radius: PLAYER_RADIUS,
      speed: 7,
      score: 0,
      isKicking: false,
      kickTimer: 0,
    },
    player2: {
      x: PLAYER2_START_X,
      y: PLAYER_START_Y,
      vx: 0,
      vy: 0,
      radius: PLAYER_RADIUS,
      speed: 7,
      score: 0,
      isKicking: false,
      kickTimer: 0,
    },
    goal1,
    goal2,
    status: 'playing',
    winner: null,
  }
}

export function resetBall(state: GameState): void {
  state.ball.x = CANVAS_WIDTH / 2
  state.ball.y = 30
  state.ball.vx = (Math.random() > 0.5 ? 1 : -1) * 3
  state.ball.vy = 0
}

function resetPlayers(state: GameState): void {
  dashBoosts[0] = 0
  dashBoosts[1] = 0

  state.player1.x = PLAYER1_START_X
  state.player1.y = PLAYER_START_Y
  state.player1.vx = 0
  state.player1.vy = 0
  state.player1.isKicking = false
  state.player1.kickTimer = 0

  state.player2.x = PLAYER2_START_X
  state.player2.y = PLAYER_START_Y
  state.player2.vx = 0
  state.player2.vy = 0
  state.player2.isKicking = false
  state.player2.kickTimer = 0
}

function checkWinner(state: GameState): void {
  if (state.player1.score >= WINNING_SCORE) {
    state.status = 'finished'
    state.winner = 'player1'
  } else if (state.player2.score >= WINNING_SCORE) {
    state.status = 'finished'
    state.winner = 'player2'
  }
}

const SHOOT_SPEED = 9
const SHOOT_UP_RATIO = 1.9
const KICK_ANIM_FRAMES = 5
const KICK_RANGE = 25

function tryShoot(player: Player, ball: Ball, shootRight: boolean, wantShoot: boolean): void {
  if (player.kickTimer > 0) player.kickTimer--
  if (player.isKicking && player.kickTimer <= 0) player.isKicking = false
  if (!wantShoot) return
  if (player.kickTimer > 0) return

  // L'animation part toujours, même sans contact ballon.
  player.isKicking = true
  player.kickTimer = KICK_ANIM_FRAMES

  const dx = ball.x - player.x
  const dy = ball.y - player.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const maxRange = player.radius + ball.radius + KICK_RANGE

  if (dist > maxRange) return

  const dir = shootRight ? 1 : -1
  // Le contact doit se faire au niveau du pied avant, pas avec le centre du joueur.
  const toeX = player.x + dir * player.radius
  const toeY = player.y
  const toeDx = ball.x - toeX
  const toeDy = ball.y - toeY
  const toeDist = Math.sqrt(toeDx * toeDx + toeDy * toeDy)
  const ballIsInFrontOfToe = dir * toeDx > 0
  const toeContactRange = ball.radius + KICK_RANGE

  if (!ballIsInFrontOfToe || toeDist > toeContactRange) return

  const proximity = 1 - (toeDist - ball.radius) / KICK_RANGE
  const clampedProximity = Math.max(0, Math.min(1, proximity))

  const speed = SHOOT_SPEED * (0.4 + 0.6 * clampedProximity)
  const upRatio = SHOOT_UP_RATIO * clampedProximity

  ball.vx = dir * speed
  ball.vy = -speed * upRatio

  const nx = dist > 0 ? dx / dist : dir
  const ny = dist > 0 ? dy / dist : 0
  const overlap = player.radius + ball.radius - dist
  if (overlap > 0) {
    ball.x += nx * (overlap + 2)
    ball.y += ny * (overlap + 2)
  }
}

function updateDashBoost(currentBoost: number, dashLeft: boolean, dashRight: boolean): number {
  // Double-appui: on remplace immédiatement le boost courant.
  if (dashLeft && !dashRight) return -DASH_IMPULSE
  if (dashRight && !dashLeft) return DASH_IMPULSE

  // Sinon, le boost se dissipe progressivement.
  const decayed = currentBoost * DASH_DECAY
  return Math.abs(decayed) < DASH_STOP_EPSILON ? 0 : decayed
}

function applyHorizontalMovement(player: Player, moveLeft: boolean, moveRight: boolean, dashLeft: boolean, dashRight: boolean, dashIndex: 0 | 1): void {
  dashBoosts[dashIndex] = updateDashBoost(dashBoosts[dashIndex], dashLeft, dashRight)
  const direction = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0)
  player.vx = direction * player.speed + dashBoosts[dashIndex]
  player.x += player.vx
}

function updatePlayers(state: GameState, keys: Keys): void {
  const p1 = state.player1
  const p2 = state.player2
  const floor = CANVAS_HEIGHT - PLAYER_RADIUS - 10

  applyHorizontalMovement(p1, keys.a, keys.d, keys.p1DashLeft, keys.p1DashRight, 0)
  if (keys.w && p1.y >= floor) p1.vy = JUMP_FORCE
  p1.vy += GRAVITY_PLAYER
  p1.y += p1.vy
  if (p1.y >= floor) { p1.y = floor; p1.vy = 0 }

  applyHorizontalMovement(p2, keys.ArrowLeft, keys.ArrowRight, keys.p2DashLeft, keys.p2DashRight, 1)
  if (keys.ArrowUp && p2.y >= floor) p2.vy = JUMP_FORCE
  p2.vy += GRAVITY_PLAYER
  p2.y += p2.vy
  if (p2.y >= floor) { p2.y = floor; p2.vy = 0 }

  p1.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, p1.x))
  p2.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, p2.x))

  // On corrige uniquement le chevauchement pour empêcher le croisement.
  preventPlayerOverlap(p1, p2)

  tryShoot(p1, state.ball, true,  keys.g)
  tryShoot(p2, state.ball, false, keys.m)
}

function preventPlayerOverlap(player1: Player, player2: Player): void {
  const dx = player2.x - player1.x
  const dy = player2.y - player1.y
  const minDist = player1.radius + player2.radius
  const distSq = dx * dx + dy * dy

  if (distSq >= minDist * minDist) return

  const dist = Math.sqrt(distSq)
  const nx = dist > 0 ? dx / dist : 1
  const ny = dist > 0 ? dy / dist : 0
  const overlap = minDist - dist

  player1.x -= nx * (overlap / 2)
  player1.y -= ny * (overlap / 2)
  player2.x += nx * (overlap / 2)
  player2.y += ny * (overlap / 2)
}

function ballHitsPlayer(ball: Ball, player: Player): boolean {
  const dx = ball.x - player.x
  const dy = ball.y - player.y
  return Math.sqrt(dx * dx + dy * dy) < ball.radius + player.radius
}

function resolveBallPlayerCollision(ball: Ball, player: Player, playerVx: number, playerVy: number): void {
  const dx = ball.x - player.x
  const dy = ball.y - player.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const nx = dist > 0 ? dx / dist : 1
  const ny = dist > 0 ? dy / dist : 0
  const overlap = ball.radius + player.radius - dist
  if (overlap > 0) {
    ball.x += nx * (overlap + 1)
    ball.y += ny * (overlap + 1)
  }
  if (ny > 0 && playerVy > 0) {
    player.vy = 0
    player.y = ball.y - ball.radius - player.radius - 1
  }

  // Impulsion de rebond avec séparation minimale pour éviter que le ballon colle au joueur.
  const rvx = ball.vx - playerVx
  const rvy = ball.vy - playerVy
  const vn = rvx * nx + rvy * ny

  const PLAYER_RESTITUTION = 0.45
  if (vn < 0) {
    const impulse = -(1 + PLAYER_RESTITUTION) * vn
    ball.vx += impulse * nx
    ball.vy += impulse * ny
  }

  const PLAYER_VEL_TRANSFER = 0.2
  ball.vx += playerVx * PLAYER_VEL_TRANSFER
  ball.vy += playerVy * PLAYER_VEL_TRANSFER

  const minOutSpeed = 1.6
  const outSpeed = ball.vx * nx + ball.vy * ny
  if (outSpeed < minOutSpeed) {
    const boost = minOutSpeed - outSpeed
    ball.vx += nx * boost
    ball.vy += ny * boost
  }
}

function checkCrossbarCollision(ball: Ball, goal: Goal): void {
  // La barre est traitée comme un rectangle physique, pas comme une simple ligne.
  const barX = goal.side === 'left'
    ? goal.postWidth
    : goal.x - goal.innerWidth
  const barW = goal.innerWidth
  const barY = goal.crossbarY
  const barH = goal.crossbarHeight
  const closestX = Math.max(barX, Math.min(ball.x, barX + barW))
  const closestY = Math.max(barY, Math.min(ball.y, barY + barH))
  const dx = ball.x - closestX
  const dy = ball.y - closestY
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist >= ball.radius) return

  const nx = dist > 0 ? dx / dist : 0
  const ny = dist > 0 ? dy / dist : -1
  const penetration = ball.radius - dist

  // Pousse le ballon hors de la barre avant d'appliquer la réponse de collision.
  ball.x += nx * penetration
  ball.y += ny * penetration

  const vn = ball.vx * nx + ball.vy * ny
  if (vn < 0) {
    ball.vx -= (1 + BOUNCE_DAMPING) * vn * nx
    ball.vy -= (1 + BOUNCE_DAMPING) * vn * ny
  }
}

function checkGoal(state: GameState): void {
  // ← Guard en premier : on n'entre dans aucun bloc si la partie est déjà finie
  if (state.status !== 'playing') return

  const ball = state.ball
  const g1 = state.goal1
  const g2 = state.goal2
  // Le but est validé seulement si tout le ballon a franchi la barre.
  const leftCrossbarBottom = g1.crossbarY + g1.crossbarHeight
  const rightCrossbarBottom = g2.crossbarY + g2.crossbarHeight

  if (ball.x - ball.radius <= g1.postWidth && ball.y - ball.radius > leftCrossbarBottom) {
    state.player2.score += 1
    checkWinner(state)
    resetBall(state)
    resetPlayers(state)
  }

  // Re-vérifier après le premier but éventuel (partie peut être finie)
  if (state.status !== 'playing') return

  if (ball.x + ball.radius >= g2.x && ball.y - ball.radius > rightCrossbarBottom) {
    state.player1.score += 1
    checkWinner(state)
    resetBall(state)
    resetPlayers(state)
  }
}

function resolveBallWorldBounds(ball: Ball, g1: Goal, g2: Goal): void {
  // Clamp final pour éviter que le ballon s'enfonce dans le sol après des collisions multiples.
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius
    ball.vy = Math.abs(ball.vy) * BOUNCE_DAMPING
  }
  if (ball.y + ball.radius >= CANVAS_HEIGHT) {
    ball.y = CANVAS_HEIGHT - ball.radius
    if (Math.abs(ball.vy) < MIN_BOUNCE_VY) {
      ball.vy = 0
    } else {
      ball.vy = -Math.abs(ball.vy) * BOUNCE_DAMPING
    }
    ball.vx *= BALL_FRICTION
  }

  const leftCrossbarBottom = g1.crossbarY + g1.crossbarHeight
  const rightCrossbarBottom = g2.crossbarY + g2.crossbarHeight

  if (ball.x - ball.radius <= 0 && ball.y - ball.radius < leftCrossbarBottom) {
    ball.x = ball.radius
    ball.vx = Math.abs(ball.vx)
  }
  if (ball.x + ball.radius >= CANVAS_WIDTH && ball.y - ball.radius < rightCrossbarBottom) {
    ball.x = CANVAS_WIDTH - ball.radius
    ball.vx = -Math.abs(ball.vx)
  }
}

function updateBall(state: GameState): void {
  const ball = state.ball
  const g1 = state.goal1
  const g2 = state.goal2

  ball.vy += GRAVITY_BALL
  ball.x += ball.vx
  ball.y += ball.vy

  if (ballHitsPlayer(ball, state.player1)) {
    const p1Vx = state.player1.isKicking
      ? (state.player1.x < CANVAS_WIDTH / 2 ? KICK_SPEED : -KICK_SPEED)
      : state.player1.vx
    resolveBallPlayerCollision(ball, state.player1, p1Vx, state.player1.vy)
  }
  if (ballHitsPlayer(ball, state.player2)) {
    const p2Vx = state.player2.isKicking
      ? (state.player2.x > CANVAS_WIDTH / 2 ? -KICK_SPEED : KICK_SPEED)
      : state.player2.vx
    resolveBallPlayerCollision(ball, state.player2, p2Vx, state.player2.vy)
  }

  checkCrossbarCollision(ball, g1)
  checkCrossbarCollision(ball, g2)
  resolveBallWorldBounds(ball, g1, g2)
  checkGoal(state)
}

function updateAI(state: GameState): void {
  const ai = state.player2
  const ball = state.ball
  const floor = CANVAS_HEIGHT - PLAYER_RADIUS - 10

  const AI_SPEED_NORMAL = 4.5
  const AI_SPEED_DEFEND = 7.5

  const ballHeadingToAIGoal = ball.vx < -2

  const aiGoalX = CANVAS_WIDTH - GOAL_POST_WIDTH
  const defendX = Math.min(aiGoalX - ai.radius - 10, ball.x + 80)

  const targetX = ballHeadingToAIGoal ? defendX : ball.x
  const speed   = ballHeadingToAIGoal ? AI_SPEED_DEFEND : AI_SPEED_NORMAL

  if (ai.x < targetX - 10) ai.x += speed
  else if (ai.x > targetX + 10) ai.x -= speed

  const ballOnAISide  = ball.x > CANVAS_WIDTH * 0.55
  const ballRising    = ball.vy < -1 && ball.y < CANVAS_HEIGHT * 0.5
  const ballHighAbove = ball.y < ai.y - ai.radius * 2.5
  const shouldJump    = ballOnAISide && (ballRising || ballHighAbove) && ai.y >= floor

  if (shouldJump) ai.vy = JUMP_FORCE

  ai.vy += GRAVITY_PLAYER
  ai.y += ai.vy
  if (ai.y >= floor) { ai.y = floor; ai.vy = 0 }
  ai.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, ai.x))

  // Même correction minimale en solo pour garder les corps séparés.
  preventPlayerOverlap(state.player1, ai)

  const dx = ball.x - ai.x
  const dy = ball.y - ai.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const ballInRange = dist <= ai.radius + ball.radius + KICK_RANGE + 20
  const wantShoot   = ballInRange && Math.random() < 0.2
  tryShoot(ai, ball, false, wantShoot)
}

export function updateGame(state: GameState, keys: Keys, isSolo: boolean = false): GameState {
  if (state.status !== 'playing') return state

  if (isSolo) {
    const p1 = state.player1
    const floor = CANVAS_HEIGHT - PLAYER_RADIUS - 10
    applyHorizontalMovement(p1, keys.a, keys.d, keys.p1DashLeft, keys.p1DashRight, 0)
    if (keys.w && p1.y >= floor) p1.vy = JUMP_FORCE
    p1.vy += GRAVITY_PLAYER
    p1.y += p1.vy
    if (p1.y >= floor) { p1.y = floor; p1.vy = 0 }
    p1.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, p1.x))
    tryShoot(p1, state.ball, true, keys.g)
    updateAI(state)
  } else {
    updatePlayers(state, keys)
  }

  updateBall(state)
  return { ...state }
}