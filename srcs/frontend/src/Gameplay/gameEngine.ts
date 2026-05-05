import { type GameState, type Ball, type Player, type Goal } from './types'
import { type Keys } from './inputHandler'
import { getPlayerVisualLayout, getPlayerShoeBounds } from './playerSpriteGeometry'
import { getGoalVisualBounds } from './goalGeometry'
import { PLAYER_BASE_RADIUS, calculatePlayerFloorY, KICK_ANIM_FRAMES } from './playerConfig'
import {
  GOAL_BASE_HEIGHT,
  GOAL_BASE_INNER_WIDTH,
  calculateGoalCrossbarY,
} from './goalConfig'

// Dimensions du canvas de jeu
export const CANVAS_WIDTH = 1800
export const CANVAS_HEIGHT = 1000
// Score nécessaire pour gagner la partie
const WINNING_SCORE = 5

// Rayon de collision du joueur (en pixels) - importé depuis la configuration centralisée
const PLAYER_RADIUS = PLAYER_BASE_RADIUS
// Hauteur totale du but (en pixels) - importé depuis la configuration centralisée
const GOAL_HEIGHT = GOAL_BASE_HEIGHT
// Largeur intérieure de l'ouverture du but (en pixels) - importé depuis la configuration centralisée
export const GOAL_INNER_WIDTH = GOAL_BASE_INNER_WIDTH
// Hauteur de la barre transversale du but (en pixels)
const CROSSBAR_HEIGHT = GOAL_BASE_HEIGHT * 0.04
// Position Y du sol (70% de la hauteur du canvas)
const GROUND_Y = CANVAS_HEIGHT * 0.7
// Position Y où le joueur se tient au sol (calculée à partir du rayon centralisé)
const PLAYER_FLOOR_Y = calculatePlayerFloorY(GROUND_Y)

// Accélération de la gravité appliquée à la balle
const GRAVITY_BALL = 0.8
// Coefficient d'amortissement des rebonds (0 = arrêt, 1 = rebond parfait)
const BOUNCE_DAMPING = 0.8
// Coefficient de friction de la balle au sol (ralentit la balle)
const BALL_FRICTION = 0.6
// Vitesse Y minimale pour que la balle continue à rebondir
const MIN_BOUNCE_VY = 1.8

// Vitesse de tir (distance parcourue par la balle lors d'un tir)
const KICK_SPEED = 20
// Accélération de la gravité appliquée au joueur
const GRAVITY_PLAYER = 0.5
// Force du saut (valeur négative pour aller vers le haut)
const JUMP_FORCE = -13
// Impulsion initiale du dash: plus grand = dash plus agressif.
const DASH_IMPULSE = 70
// Perte de vitesse du dash à chaque frame (proche de 1 = plus long).
const DASH_DECAY = 0.8
// Seuil d'arrêt pour couper la micro-glisse en fin de dash.
const DASH_STOP_EPSILON = 0.3

// Boost horizontal temporaire conservé d'une frame à l'autre pour chaque joueur [joueur1, joueur2]
const dashBoosts = [0, 0]

// Position X de départ du joueur 1 (à gauche)
const PLAYER1_START_X = 180
// Position X de départ du joueur 2 (à droite)
const PLAYER2_START_X = CANVAS_WIDTH - 180
// Position Y de départ des deux joueurs (sur le sol)
const PLAYER_START_Y = PLAYER_FLOOR_Y

function createGoals(): { goal1: Goal; goal2: Goal } {
  const crossbarY = calculateGoalCrossbarY(GROUND_Y)
  const postHeight = GOAL_HEIGHT + CROSSBAR_HEIGHT
  
  const goal1: Goal = {
    x: 0,
    postWidth: GOAL_BASE_INNER_WIDTH / 2,
    postHeight: postHeight,
    innerWidth: GOAL_INNER_WIDTH,
    crossbarY: crossbarY,
    crossbarHeight: CROSSBAR_HEIGHT,
    side: 'left',
  }
  const goal2: Goal = {
    x: CANVAS_WIDTH - GOAL_BASE_INNER_WIDTH / 2,
    postWidth: GOAL_BASE_INNER_WIDTH / 2,
    postHeight: postHeight,
    innerWidth: GOAL_INNER_WIDTH,
    crossbarY: crossbarY,
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

// Vitesse de tir de base pour les mouvements secondaires
const SHOOT_SPEED = 9
// Ratio de la composante verticale du tir par rapport à la composante horizontale
const SHOOT_UP_RATIO = 1.9
// Distance maximale à laquelle la balle peut être frappée
const KICK_RANGE = 25
// Ratio pour déterminer la distance d'un pas lors de la mise à jour de la balle
const BALL_SUBSTEP_RATIO = 0.45
// Nombre maximum de sous-étapes pour mettre à jour la position de la balle
const BALL_MAX_SUBSTEPS = 24

// Type de collision pour un rectangle (ou forme orientée)
// nx, ny: composantes du vecteur normal de collision
// overlap: distance de pénétration entre les objets
type RectCollision = {
  nx: number
  ny: number
  overlap: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function resolveCircleOrientedRectCollision(ball: Ball, rect: ReturnType<typeof getPlayerShoeBounds>): RectCollision | null {
  const sin = Math.sin(rect.rotation)
  const cos = Math.cos(rect.rotation)
  const halfW = rect.width / 2
  const halfH = rect.height / 2
  const dx = ball.x - rect.centerX
  const dy = ball.y - rect.centerY
  const localX = dx * cos + dy * sin
  const localY = -dx * sin + dy * cos
  const closestX = clamp(localX, -halfW, halfW)
  const closestY = clamp(localY, -halfH, halfH)
  const diffX = localX - closestX
  const diffY = localY - closestY
  const distSq = diffX * diffX + diffY * diffY

  if (distSq > ball.radius * ball.radius) return null

  if (distSq > 0) {
    const dist = Math.sqrt(distSq)
    const localNx = diffX / dist
    const localNy = diffY / dist
    return {
      nx: localNx * cos - localNy * sin,
      ny: localNx * sin + localNy * cos,
      overlap: ball.radius - dist,
    }
  }

  const penLeft = halfW + localX
  const penRight = halfW - localX
  const penTop = halfH + localY
  const penBottom = halfH - localY
  const minPen = Math.min(penLeft, penRight, penTop, penBottom)

  if (minPen === penLeft) return { nx: -(cos), ny: -(sin), overlap: ball.radius + penLeft }
  if (minPen === penRight) return { nx: cos, ny: sin, overlap: ball.radius + penRight }
  if (minPen === penTop) return { nx: sin, ny: -cos, overlap: ball.radius + penTop }
  return { nx: -sin, ny: cos, overlap: ball.radius + penBottom }
}

function resolveCircleCircleCollision(ball: Ball, cx: number, cy: number, radius: number): RectCollision | null {
  const dx = ball.x - cx
  const dy = ball.y - cy
  const distSq = dx * dx + dy * dy
  const radSum = ball.radius + radius
  if (distSq > radSum * radSum) return null

  if (distSq > 0) {
    const dist = Math.sqrt(distSq)
    return { nx: dx / dist, ny: dy / dist, overlap: radSum - dist }
  }

  // Degenerate case: centers coincide. Push out along X.
  return { nx: 1, ny: 0, overlap: radSum }
}

function resolvePlayerCollision(ball: Ball, player: Player, facingRight: boolean): RectCollision | null {
  const kickProgress = player.kickTimer > 0 ? (KICK_ANIM_FRAMES - player.kickTimer + 1) / KICK_ANIM_FRAMES : 0
  const layout = getPlayerVisualLayout(player.x, player.y, player.radius, player.isKicking, facingRight, kickProgress)
  const headCx = (layout.head.left + layout.head.right) / 2
  const headCy = (layout.head.top + layout.head.bottom) / 2
  const headW = layout.head.right - layout.head.left
  const headH = layout.head.bottom - layout.head.top
  const headR = Math.max(headW, headH) / 2
  const headCollision = resolveCircleCircleCollision(ball, headCx, headCy, headR)
  const shoeCollision = resolveCircleOrientedRectCollision(ball, layout.shoe)

  if (headCollision && shoeCollision) {
    return headCollision.overlap >= shoeCollision.overlap ? headCollision : shoeCollision
  }
  return headCollision ?? shoeCollision
}

function tryShoot(player: Player, ball: Ball, shootRight: boolean, wantShoot: boolean): void {
  if (player.kickTimer > 0) player.kickTimer--
  if (player.isKicking && player.kickTimer <= 0) player.isKicking = false
  if (!wantShoot) return
  if (player.kickTimer > 0) return

  // L'animation part toujours, même sans contact ballon.
  player.isKicking = true
  player.kickTimer = KICK_ANIM_FRAMES

  const kickProgress = player.kickTimer > 0 ? (KICK_ANIM_FRAMES - player.kickTimer + 1) / KICK_ANIM_FRAMES : 0
  const layout = getPlayerVisualLayout(player.x, player.y, player.radius, player.isKicking, shootRight, kickProgress)
  const shoe = layout.shoe

  const maxRange = Math.max(shoe.width, shoe.height) / 2 + ball.radius + KICK_RANGE

  if (Math.abs(ball.x - shoe.centerX) > maxRange && Math.abs(ball.y - shoe.centerY) > maxRange) return

  const dir = shootRight ? 1 : -1
  const toeX = dir > 0 ? shoe.right : shoe.left
  const toeY = shoe.centerY
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

  const collision = resolveCircleOrientedRectCollision(ball, shoe)
  if (collision) {
    ball.x += collision.nx * (collision.overlap + 2)
    ball.y += collision.ny * (collision.overlap + 2)
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
  const floor = PLAYER_FLOOR_Y

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

  p1.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, p1.x))
  p2.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, p2.x))
  p1.y = Math.min(p1.y, PLAYER_FLOOR_Y)
  p2.y = Math.min(p2.y, PLAYER_FLOOR_Y)

  tryShoot(p1, state.ball, true,  keys.g)
  tryShoot(p2, state.ball, false, keys.m)
}

function preventPlayerOverlap(player1: Player, player2: Player): void {
  const dx = player2.x - player1.x
  const dy = player2.y - player1.y
  const minDist = player1.radius + player2.radius
  const distSq = dx * dx + dy * dy

  if (distSq >= minDist * minDist) return

  let nx = 1
  let ny = 0
  let dist = Math.sqrt(distSq)

  if (dist > 1e-6) {
    nx = dx / dist
    ny = dy / dist
  } else {
    // Cas dégénéré: on sépare horizontalement selon les positions courantes.
    nx = player1.x <= player2.x ? 1 : -1
    ny = 0
    dist = 0
  }

  const overlap = minDist - dist
  const push = overlap * 0.5
  player1.x -= nx * push
  player1.y -= ny * push
  player2.x += nx * push
  player2.y += ny * push

  const rvx = player2.vx - player1.vx
  const rvy = player2.vy - player1.vy
  const vn = rvx * nx + rvy * ny

  if (vn < 0) {
    const impulse = -vn * 0.5
    player1.vx -= nx * impulse
    player1.vy -= ny * impulse
    player2.vx += nx * impulse
    player2.vy += ny * impulse
  }
}

function ballHitsPlayer(ball: Ball, player: Player, facingRight: boolean): boolean {
  return resolvePlayerCollision(ball, player, facingRight) !== null
}

function resolveBallPlayerCollision(ball: Ball, player: Player, playerVx: number, playerVy: number, facingRight: boolean): void {
  const collision = resolvePlayerCollision(ball, player, facingRight)
  if (!collision) return

  ball.x += collision.nx * (collision.overlap + 1)
  ball.y += collision.ny * (collision.overlap + 1)

  if (collision.ny > 0 && playerVy > 0) {
    player.vy = 0
    player.y = ball.y - ball.radius - 1
  }

  // Impulsion de rebond avec séparation minimale pour éviter que le ballon colle au joueur.
  // Relative velocity entre la balle et le joueur
  const rvx = ball.vx - playerVx
  const rvy = ball.vy - playerVy
  // Composante de vélocité relative le long de la normale de collision
  const vn = rvx * collision.nx + rvy * collision.ny

  // Coefficient de restitution: détermine le "rebond" de la collision (0 = mou, 1 = élastique)
  const PLAYER_RESTITUTION = 0.45
  if (vn < 0) {
    const impulse = -(1 + PLAYER_RESTITUTION) * vn
    ball.vx += impulse * collision.nx
    ball.vy += impulse * collision.ny
  }

  // Ratio de transfert de la vélocité du joueur à la balle
  const PLAYER_VEL_TRANSFER = 0.2
  ball.vx += playerVx * PLAYER_VEL_TRANSFER
  ball.vy += playerVy * PLAYER_VEL_TRANSFER

  // Vitesse minimale de sortie garantie pour que la balle quitte le joueur
  const minOutSpeed = 1.6
  const outSpeed = ball.vx * collision.nx + ball.vy * collision.ny
  if (outSpeed < minOutSpeed) {
    const boost = minOutSpeed - outSpeed
    ball.vx += collision.nx * boost
    ball.vy += collision.ny * boost
  }
}

function checkCrossbarCollision(ball: Ball, goal: Goal): void {
  // Barre de collision alignée sur le haut visuel de la cage SVG.
  const visual = getGoalVisualBounds(goal)
  const barX = visual.left
  const barW = visual.width
  const barY = visual.top
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

function checkGoal(state: GameState): boolean {
  // ← Guard en premier : on n'entre dans aucun bloc si la partie est déjà finie
  if (state.status !== 'playing') return false

  const ball = state.ball
  const g1 = state.goal1
  const g2 = state.goal2
  const leftVisual = getGoalVisualBounds(g1)
  const rightVisual = getGoalVisualBounds(g2)

  const leftThreshold = leftVisual.entryThreshold
  const rightThreshold = rightVisual.entryThreshold

  // But validé quand le ballon a pénétré de 20% dans l'ouverture visuelle de la cage.
  if (ball.x - ball.radius <= leftThreshold && ball.y - ball.radius > leftVisual.barBottom) {
    state.player2.score += 1
    checkWinner(state)
    resetBall(state)
    resetPlayers(state)
    return true
  }

  // Re-vérifier après le premier but éventuel (partie peut être finie)
  if (state.status !== 'playing') return true

  if (ball.x + ball.radius >= rightThreshold && ball.y - ball.radius > rightVisual.barBottom) {
    state.player1.score += 1
    checkWinner(state)
    resetBall(state)
    resetPlayers(state)
    return true
  }

  return false
}

function resolveBallWorldBounds(ball: Ball, g1: Goal, g2: Goal): void {
  // Clamp final pour éviter que le ballon s'enfonce dans le sol après des collisions multiples.
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius
    ball.vy = Math.abs(ball.vy) * BOUNCE_DAMPING
  }
  if (ball.y + ball.radius >= GROUND_Y) {
    ball.y = GROUND_Y - ball.radius
    if (Math.abs(ball.vy) < MIN_BOUNCE_VY) {
      ball.vy = 0
    } else {
      ball.vy = -Math.abs(ball.vy) * BOUNCE_DAMPING
    }
    ball.vx *= BALL_FRICTION
  }

  const leftCrossbarBottom = getGoalVisualBounds(g1).barBottom
  const rightCrossbarBottom = getGoalVisualBounds(g2).barBottom

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

  const projectedVx = ball.vx
  const projectedVy = ball.vy + GRAVITY_BALL
  const projectedTravel = Math.hypot(projectedVx, projectedVy)
  const stepDistance = Math.max(1, ball.radius * BALL_SUBSTEP_RATIO)
  const steps = Math.max(1, Math.min(BALL_MAX_SUBSTEPS, Math.ceil(projectedTravel / stepDistance)))
  const stepGravity = GRAVITY_BALL / steps

  for (let i = 0; i < steps; i++) {
    ball.vy += stepGravity
    ball.x += ball.vx / steps
    ball.y += ball.vy / steps

    for (let pass = 0; pass < 2; pass++) {
      if (ballHitsPlayer(ball, state.player1, true)) {
        const p1Vx = state.player1.isKicking
          ? (state.player1.x < CANVAS_WIDTH / 2 ? KICK_SPEED : -KICK_SPEED)
          : state.player1.vx
        resolveBallPlayerCollision(ball, state.player1, p1Vx, state.player1.vy, true)
      }
      if (ballHitsPlayer(ball, state.player2, false)) {
        const p2Vx = state.player2.isKicking
          ? (state.player2.x > CANVAS_WIDTH / 2 ? -KICK_SPEED : KICK_SPEED)
          : state.player2.vx
        resolveBallPlayerCollision(ball, state.player2, p2Vx, state.player2.vy, false)
      }
    }

    checkCrossbarCollision(ball, g1)
    checkCrossbarCollision(ball, g2)
    resolveBallWorldBounds(ball, g1, g2)

    if (checkGoal(state)) break
  }
}

function updateAI(state: GameState): void {
  const ai = state.player2
  const ball = state.ball
  const floor = PLAYER_FLOOR_Y

  // Vitesse normale de l'IA quand elle attaque
  const AI_SPEED_NORMAL = 4.5
  // Vitesse de défense accélérée quand la balle se rapproche du but
  const AI_SPEED_DEFEND = 7.5

  const ballHeadingToAIGoal = ball.vx < -2

  const aiGoalX = CANVAS_WIDTH - GOAL_BASE_INNER_WIDTH / 2
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
  state.player1.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, state.player1.x))
  ai.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, ai.x))
  state.player1.y = Math.min(state.player1.y, PLAYER_FLOOR_Y)
  ai.y = Math.min(ai.y, PLAYER_FLOOR_Y)

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
    const floor = PLAYER_FLOOR_Y
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