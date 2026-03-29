import { type GameState, type Ball, type Player, type Goal } from './types'
import { type Keys } from './inputHandler'

export const CANVAS_WIDTH = 1800
export const CANVAS_HEIGHT = 1000
const WINNING_SCORE = 5

const PLAYER_RADIUS = 30
const GOAL_POST_WIDTH = 15
const GOAL_HEIGHT = 195
const CROSSBAR_HEIGHT = 10

const GRAVITY_BALL = 0.35
const BOUNCE_DAMPING = 0.55
const BALL_FRICTION = 0.97
const MIN_BOUNCE_VY = 1.8

const KICK_SPEED = 8
const GRAVITY_PLAYER = 0.5
const JUMP_FORCE = -13

const PLAYER1_START_X = 180
const PLAYER2_START_X = CANVAS_WIDTH - 180
const PLAYER_START_Y = CANVAS_HEIGHT - PLAYER_RADIUS

function createGoals(): { goal1: Goal; goal2: Goal } {
  const goal1: Goal = {
    x: 0,
    postWidth: GOAL_POST_WIDTH,
    postHeight: GOAL_HEIGHT,
    crossbarY: CANVAS_HEIGHT - GOAL_HEIGHT - CROSSBAR_HEIGHT,
    crossbarHeight: CROSSBAR_HEIGHT,
    side: 'left',
  }
  const goal2: Goal = {
    x: CANVAS_WIDTH - GOAL_POST_WIDTH,
    postWidth: GOAL_POST_WIDTH,
    postHeight: GOAL_HEIGHT,
    crossbarY: CANVAS_HEIGHT - GOAL_HEIGHT - CROSSBAR_HEIGHT,
    crossbarHeight: CROSSBAR_HEIGHT,
    side: 'right',
  }
  return { goal1, goal2 }
}

export function createInitialState(): GameState {
  const { goal1, goal2 } = createGoals()
  return {
    ball: {
      x: CANVAS_WIDTH / 2,
      y: 30,
      vx: (Math.random() > 0.5 ? 1 : -1) * 3,
      vy: 0,
      radius: 10,
    },
    player1: {
      x: PLAYER1_START_X,
      y: PLAYER_START_Y,
      vx: 0,
      vy: 0,
      radius: PLAYER_RADIUS,
      speed: 5,
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
      speed: 5,
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

function checkWinner(state: GameState, scorer: 'player1' | 'player2'): void {
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

  player.isKicking = true
  player.kickTimer = KICK_ANIM_FRAMES

  const dx = ball.x - player.x
  const dy = ball.y - player.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const maxRange = player.radius + ball.radius + KICK_RANGE

  if (dist > maxRange) return

  const dir = shootRight ? 1 : -1
  const proximity = 1 - (dist - (player.radius + ball.radius)) / KICK_RANGE
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

function updatePlayers(state: GameState, keys: Keys): void {
  const p1 = state.player1
  const p2 = state.player2
  const floor = CANVAS_HEIGHT - PLAYER_RADIUS - 10

  p1.vx = 0
  if (keys.a) { p1.x -= p1.speed; p1.vx = -p1.speed }
  if (keys.d) { p1.x += p1.speed; p1.vx = p1.speed }
  if (keys.w && p1.y >= floor) p1.vy = JUMP_FORCE
  p1.vy += GRAVITY_PLAYER
  p1.y += p1.vy
  if (p1.y >= floor) { p1.y = floor; p1.vy = 0 }

  p2.vx = 0
  if (keys.ArrowLeft)  { p2.x -= p2.speed; p2.vx = -p2.speed }
  if (keys.ArrowRight) { p2.x += p2.speed; p2.vx = p2.speed }
  if (keys.ArrowUp && p2.y >= floor) p2.vy = JUMP_FORCE
  p2.vy += GRAVITY_PLAYER
  p2.y += p2.vy
  if (p2.y >= floor) { p2.y = floor; p2.vy = 0 }

  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const minDist = p1.radius + p2.radius
  if (dist < minDist && dist > 0) {
    const overlap = minDist - dist
    const nx = dx / dist
    const ny = dy / dist
    p1.x -= nx * (overlap / 2)
    p2.x += nx * (overlap / 2)
    const p1OnFloor = p1.y >= floor
    const p2OnFloor = p2.y >= floor
    if (!p1OnFloor) p1.y -= ny * (overlap / 2)
    if (!p2OnFloor) p2.y += ny * (overlap / 2)
    if (p2OnFloor && !p1OnFloor) p1.y -= ny * overlap
    if (p1OnFloor && !p2OnFloor) p2.y += ny * overlap
  }

  p1.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, p1.x))
  p2.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, p2.x))

  tryShoot(p1, state.ball, true,  keys.g)
  tryShoot(p2, state.ball, false, keys.m)
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
  if (dist === 0) return
  const nx = dx / dist
  const ny = dy / dist
  const overlap = ball.radius + player.radius - dist
  ball.x += nx * (overlap + 1)
  ball.y += ny * (overlap + 1)
  if (ny > 0 && playerVy > 0) {
    player.vy = 0
    player.y = ball.y - ball.radius - player.radius - 1
  }
  const PUSH_STRENGTH = 0.4
  const MIN_PUSH = 1.5
  const sepVx = nx * MIN_PUSH
  const sepVy = ny * MIN_PUSH
  const transferVx = playerVx * PUSH_STRENGTH
  const transferVy = playerVy * PUSH_STRENGTH
  const dot = playerVx * nx + playerVy * ny
  if (dot < 0) {
    ball.vx = ball.vx * (1 - PUSH_STRENGTH) + (transferVx + sepVx)
    ball.vy = ball.vy * (1 - PUSH_STRENGTH) + (transferVy + sepVy)
  } else {
    ball.vx += sepVx
    ball.vy += sepVy
  }
}

function checkCrossbarCollision(ball: Ball, goal: Goal): void {
  const barX = goal.x
  const barW = goal.postWidth + 5
  const barY = goal.crossbarY
  const barH = goal.crossbarHeight
  const closestX = Math.max(barX, Math.min(ball.x, barX + barW))
  const closestY = Math.max(barY, Math.min(ball.y, barY + barH))
  const dx = ball.x - closestX
  const dy = ball.y - closestY
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < ball.radius) {
    if (Math.abs(dy) > Math.abs(dx)) {
      ball.vy *= -1
      ball.y += ball.vy
    } else {
      ball.vx *= -1
      ball.x += ball.vx
    }
  }
}

function checkGoal(state: GameState): void {
  const ball = state.ball
  const g1 = state.goal1
  const g2 = state.goal2

  if (ball.x - ball.radius <= g1.postWidth && ball.y > g1.crossbarY + g1.crossbarHeight) {
    state.player2.score += 1
    checkWinner(state, 'player2')
    if (state.status === 'playing') {
      resetBall(state)
      resetPlayers(state)
    }
  }

  if (ball.x + ball.radius >= g2.x && ball.y > g2.crossbarY + g2.crossbarHeight) {
    state.player1.score += 1
    checkWinner(state, 'player1')
    if (state.status === 'playing') {
      resetBall(state)
      resetPlayers(state)
    }
  }
}

function updateBall(state: GameState): void {
  const ball = state.ball
  const g1 = state.goal1
  const g2 = state.goal2

  ball.vy += GRAVITY_BALL
  ball.x += ball.vx
  ball.y += ball.vy

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
  if (ball.x - ball.radius <= 0 && ball.y < g1.crossbarY + g1.crossbarHeight) {
    ball.x = ball.radius
    ball.vx = Math.abs(ball.vx)
  }
  if (ball.x + ball.radius >= CANVAS_WIDTH && ball.y < g2.crossbarY + g2.crossbarHeight) {
    ball.x = CANVAS_WIDTH - ball.radius
    ball.vx = -Math.abs(ball.vx)
  }

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
  checkGoal(state)
}

function updateAI(state: GameState): void {
  const ai = state.player2
  const ball = state.ball
  const floor = CANVAS_HEIGHT - PLAYER_RADIUS - 10

  const AI_SPEED_NORMAL = 4.5
  const AI_SPEED_DEFEND = 7.5  // rush défensif quand la balle fonce vers les cages IA

  // La balle fonce-t-elle vers les cages de l'IA (vx négatif fort) ?
  const ballHeadingToAIGoal = ball.vx < -2

  // En mode défense, l'IA se place entre la balle et sa cage
  const aiGoalX = CANVAS_WIDTH - GOAL_POST_WIDTH
  const defendX = Math.min(aiGoalX - ai.radius - 10, ball.x + 80)

  const targetX = ballHeadingToAIGoal ? defendX : ball.x
  const speed   = ballHeadingToAIGoal ? AI_SPEED_DEFEND : AI_SPEED_NORMAL

  if (ai.x < targetX - 10) ai.x += speed
  else if (ai.x > targetX + 10) ai.x -= speed

  // Saut : seulement si la balle est dans le camp de l'IA, haute, et monte
  const ballOnAISide  = ball.x > CANVAS_WIDTH * 0.55
  const ballRising    = ball.vy < -1 && ball.y < CANVAS_HEIGHT * 0.5
  const ballHighAbove = ball.y < ai.y - ai.radius * 2.5
  const shouldJump    = ballOnAISide && (ballRising || ballHighAbove) && ai.y >= floor

  if (shouldJump) ai.vy = JUMP_FORCE

  ai.vy += GRAVITY_PLAYER
  ai.y += ai.vy
  if (ai.y >= floor) { ai.y = floor; ai.vy = 0 }
  ai.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, ai.x))

  // Tir : portée réduite, probabilité un peu plus basse
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
    if (keys.a) p1.x -= p1.speed
    if (keys.d) p1.x += p1.speed
    if (keys.w && p1.y >= floor) p1.vy = JUMP_FORCE
    p1.vy += GRAVITY_PLAYER
    p1.y += p1.vy
    if (p1.y >= floor) { p1.y = floor; p1.vy = 0 }
    p1.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, p1.x))
    tryShoot(p1, state.ball, true, keys.g)  // ← G en solo (corrigé)
    updateAI(state)
  } else {
    updatePlayers(state, keys)
  }

  updateBall(state)
  return { ...state }
}