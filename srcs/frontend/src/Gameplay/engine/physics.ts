// Résolution des collisions et mise à jour du ballon. Le moteur garantit :
//   - aucun corps ne traverse un autre (substepping + convergence)
//   - le tireur ne re-collisionne pas passivement avec sa propre frappe (cooldown)

import { type Ball, type GameState, type Goal, type Obstacle, type Player } from './types'
import {
  CANVAS_WIDTH, GROUND_Y,
  KICK_ANIM_FRAMES, MAX_KICK_POWER, VERTICAL_KICK_ATTENUATION,
  PLAYER_RESTITUTION, MIN_OUT_SPEED,
  GRAVITY_BALL, BOUNCE_DAMPING, BALL_FRICTION, MIN_BOUNCE_VY,
  BALL_SUBSTEP_RATIO, BALL_MAX_SUBSTEPS,
  PLAYER_FLOOR_Y,
  MEGA_KICK_MULTIPLIER, SLOW_BALL_GRAVITY_FACTOR,
} from './constants'
import { type Collision, collideBallPlayer } from './collisions'
import { getGoalVisualBounds, SHOE_BEHIND_OFFSET } from './geometry'
import { clampPlayerX, checkWinner, resetBall, resetPlayers } from './state'

// ─────────── ÉTAT MODULE (cooldown du tir) ───────────
// Pendant ce cooldown, le tireur ne peut pas re-collisionner passivement avec
// le ballon (sinon son propre pied écraserait la vélocité de la frappe).
// L'adversaire reste collidable.
let ballKickCooldown = 0
let lastKicker: Player | null = null

export function resetKickCooldown(): void {
  ballKickCooldown = 0
  lastKicker = null
}

// ═══════════════════════════════════════════════════════════════════════════
//                       COLLISION BALLON ↔ JOUEUR
// ═══════════════════════════════════════════════════════════════════════════

// Frappe active : direction = tangente à l'orbite du pied au moment de l'impact,
// puissance en cloche centrée sur la mi-course (un contact en plein élan
// transmet plus d'énergie qu'en début ou fin de swing).
function applyKickImpulse(ball: Ball, player: Player, facingRight: boolean): void {
  const kickProgress = (KICK_ANIM_FRAMES - player.kickTimer + 1) / KICK_ANIM_FRAMES
  const dir = facingRight ? 1 : -1
  const restAngle = Math.PI / 2 + dir * SHOE_BEHIND_OFFSET
  const kickAngle = facingRight ? 0 : Math.PI
  const orbitAngle = restAngle + (kickAngle - restAngle) * kickProgress

  const tangentX = dir * Math.sin(orbitAngle)
  const tangentY = -dir * Math.cos(orbitAngle)
  const swingPower = Math.sin(Math.PI * kickProgress) * 1.2
  // Bonus mega kick : +50% de puissance pendant l'effet.
  const power = MAX_KICK_POWER * (player.kickBoostFrames > 0 ? MEGA_KICK_MULTIPLIER : 1)

  ball.vx = tangentX * swingPower * power + player.vx * 0.3
  ball.vy = tangentY * swingPower * VERTICAL_KICK_ATTENUATION * power + player.vy * 0.1

  ballKickCooldown = KICK_ANIM_FRAMES
  lastKicker = player
}

// Rebond passif (tête / corps) : restitution + transfert de vélocité du joueur,
// avec une vitesse de sortie minimale pour éviter que le ballon « colle ».
function applyPassiveBounce(ball: Ball, player: Player, hit: Collision): void {
  const vn = (ball.vx - player.vx) * hit.nx + (ball.vy - player.vy) * hit.ny
  if (vn < 0) {
    const impulse = -(1 + PLAYER_RESTITUTION) * vn
    ball.vx += impulse * hit.nx
    ball.vy += impulse * hit.ny
  }

  ball.vx += player.vx * 0.2
  ball.vy += player.vy * 0.2

  const outSpeed = ball.vx * hit.nx + ball.vy * hit.ny
  if (outSpeed < MIN_OUT_SPEED) {
    const boost = MIN_OUT_SPEED - outSpeed
    ball.vx += hit.nx * boost
    ball.vy += hit.ny * boost
  }
}

// Sépare et applique l'impulsion (active ou passive) selon que le joueur tire ou non.
export function resolveBallPlayerCollision(ball: Ball, player: Player, facingRight: boolean): void {
  if (ballKickCooldown > 0 && player === lastKicker) return

  const hit = collideBallPlayer(ball, player, facingRight)
  if (!hit) return

  ball.x += hit.nx * (hit.overlap + 1)
  ball.y += hit.ny * (hit.overlap + 1)

  if (player.isKicking && player.kickTimer > 0) {
    applyKickImpulse(ball, player, facingRight)
  } else if (!player.isKicking) {
    applyPassiveBounce(ball, player, hit)
  }
}

// Lance l'animation de tir. La physique de la frappe est appliquée plus tard,
// quand le pied touche géométriquement le ballon (resolveBallPlayerCollision).
// Un joueur gelé ne peut pas déclencher de nouveau tir.
export function tryShoot(player: Player, wantShoot: boolean): void {
  if (player.kickTimer > 0) player.kickTimer--
  if (player.isKicking && player.kickTimer <= 0) player.isKicking = false
  if (player.freezeFrames > 0 || !wantShoot || player.kickTimer > 0) return
  player.isKicking = true
  player.kickTimer = KICK_ANIM_FRAMES
}

// ═══════════════════════════════════════════════════════════════════════════
//                   COLLISION JOUEUR ↔ JOUEUR & MOUVEMENT
// ═══════════════════════════════════════════════════════════════════════════

// Sépare deux joueurs qui se chevauchent et leur applique une impulsion réciproque.
export function preventPlayerOverlap(p1: Player, p2: Player): void {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const minDist = (p1.radius + p2.radius) * 1.3
  const distSq = dx * dx + dy * dy
  if (distSq >= minDist * minDist) return

  let nx = 1, ny = 0
  let dist = Math.sqrt(distSq)
  if (dist > 1e-6) {
    nx = dx / dist
    ny = dy / dist
  } else {
    // Centres confondus : on sépare horizontalement.
    nx = p1.x <= p2.x ? 1 : -1
    dist = 0
  }

  const push = (minDist - dist) * 0.5
  p1.x -= nx * push;  p1.y -= ny * push
  p2.x += nx * push;  p2.y += ny * push

  const vn = (p2.vx - p1.vx) * nx + (p2.vy - p1.vy) * ny
  if (vn < 0) {
    const impulse = -vn * 0.5
    p1.vx -= nx * impulse;  p1.vy -= ny * impulse
    p2.vx += nx * impulse;  p2.vy += ny * impulse
  }
}

// Avance les deux joueurs en sous-étapes (taille ≤ rayon ballon) pour empêcher
// le tunneling : à chaque pas, on résout l'overlap joueur ↔ joueur et la
// collision ballon ↔ joueur. Aucun corps ne peut traverser un autre.
export function advancePlayersSubstepped(p1: Player, p2: Player, ball: Ball): void {
  const maxDist = Math.max(Math.hypot(p1.vx, p1.vy), Math.hypot(p2.vx, p2.vy))
  const stepSize = Math.min(ball.radius, p1.radius) * 0.5
  const steps = Math.max(1, Math.ceil(maxDist / stepSize))

  for (let s = 0; s < steps; s++) {
    p1.x += p1.vx / steps
    p1.y += p1.vy / steps
    p2.x += p2.vx / steps
    p2.y += p2.vy / steps

    if (p1.y >= PLAYER_FLOOR_Y) { p1.y = PLAYER_FLOOR_Y; p1.vy = 0 }
    if (p2.y >= PLAYER_FLOOR_Y) { p2.y = PLAYER_FLOOR_Y; p2.vy = 0 }
    p1.x = clampPlayerX(p1.x)
    p2.x = clampPlayerX(p2.x)

    preventPlayerOverlap(p1, p2)
    resolveBallPlayerCollision(ball, p1, true)
    resolveBallPlayerCollision(ball, p2, false)
  }
}

// Passe finale : pousse le ballon hors des deux joueurs jusqu'à disparition de
// l'overlap. Si le ballon reste coincé entre les deux après 3 itérations, il
// est éjecté vers le haut pour débloquer la situation.
export function separateBallFromPlayers(ball: Ball, p1: Player, p2: Player): void {
  for (let iter = 0; iter < 8; iter++) {
    const p1Hit = collideBallPlayer(ball, p1, true)
    const p2Hit = collideBallPlayer(ball, p2, false)
    if (!p1Hit && !p2Hit) return

    if (p1Hit) {
      ball.x += p1Hit.nx * (p1Hit.overlap + 0.5)
      ball.y += p1Hit.ny * (p1Hit.overlap + 0.5)
    }
    if (p2Hit) {
      ball.x += p2Hit.nx * (p2Hit.overlap + 0.5)
      ball.y += p2Hit.ny * (p2Hit.overlap + 0.5)
    }
    if (p1Hit && p2Hit && iter >= 3) {
      ball.y -= ball.radius
      if (ball.vy > -3) ball.vy = -3
      return
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                          PHYSIQUE DU BALLON
// ═══════════════════════════════════════════════════════════════════════════

// Rebond contre les obstacles ronds (cercle vs cercle, statiques).
function checkObstacleCollisions(ball: Ball, obstacles: Obstacle[]): void {
  for (const o of obstacles) {
    const dx = ball.x - o.x
    const dy = ball.y - o.y
    const radSum = ball.radius + o.radius
    const distSq = dx * dx + dy * dy
    if (distSq > radSum * radSum) continue

    const dist = Math.sqrt(distSq)
    const nx = dist > 0 ? dx / dist : 0
    const ny = dist > 0 ? dy / dist : -1
    const penetration = radSum - dist

    // Sépare le ballon de l'obstacle, puis applique le rebond élastique.
    ball.x += nx * penetration
    ball.y += ny * penetration

    const vn = ball.vx * nx + ball.vy * ny
    if (vn < 0) {
      ball.vx -= (1 + BOUNCE_DAMPING) * vn * nx
      ball.vy -= (1 + BOUNCE_DAMPING) * vn * ny
    }
  }
}

// Rebond contre la barre transversale d'une cage.
function checkCrossbarCollision(ball: Ball, goal: Goal): void {
  const visual = getGoalVisualBounds(goal)
  const closestX = Math.max(visual.left, Math.min(ball.x, visual.left + visual.width))
  const closestY = Math.max(visual.top, Math.min(ball.y, visual.top + visual.barHeight))
  const dx = ball.x - closestX
  const dy = ball.y - closestY
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist >= ball.radius) return

  const nx = dist > 0 ? dx / dist : 0
  const ny = dist > 0 ? dy / dist : -1
  const penetration = ball.radius - dist
  ball.x += nx * penetration
  ball.y += ny * penetration

  const vn = ball.vx * nx + ball.vy * ny
  if (vn < 0) {
    ball.vx -= (1 + BOUNCE_DAMPING) * vn * nx
    ball.vy -= (1 + BOUNCE_DAMPING) * vn * ny
  }
}

// But validé quand le ballon a pénétré 20% dans l'ouverture visuelle.
// Retourne true si but marqué (et reset effectué).
function checkGoal(state: GameState): boolean {
  if (state.status !== 'playing') return false

  const { ball, goal1, goal2 } = state
  const leftVisual = getGoalVisualBounds(goal1)
  const rightVisual = getGoalVisualBounds(goal2)

  if (ball.x - ball.radius <= leftVisual.entryThreshold && ball.y - ball.radius > leftVisual.barBottom) {
    state.player2.score += 1
    checkWinner(state)
    resetBall(state)
    resetPlayers(state)
    return true
  }
  if (state.status !== 'playing') return true

  if (ball.x + ball.radius >= rightVisual.entryThreshold && ball.y - ball.radius > rightVisual.barBottom) {
    state.player1.score += 1
    checkWinner(state)
    resetBall(state)
    resetPlayers(state)
    return true
  }
  return false
}

// Bordures du monde : sol, plafond, et murs latéraux (sauf l'ouverture des cages).
function resolveBallWorldBounds(ball: Ball, g1: Goal, g2: Goal): void {
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius
    ball.vy = Math.abs(ball.vy) * BOUNCE_DAMPING
  }
  if (ball.y + ball.radius >= GROUND_Y) {
    ball.y = GROUND_Y - ball.radius
    ball.vy = Math.abs(ball.vy) < MIN_BOUNCE_VY ? 0 : -Math.abs(ball.vy) * BOUNCE_DAMPING
    ball.vx *= BALL_FRICTION
  }

  const leftBarBottom = getGoalVisualBounds(g1).barBottom
  const rightBarBottom = getGoalVisualBounds(g2).barBottom

  if (ball.x - ball.radius <= 0 && ball.y - ball.radius < leftBarBottom) {
    ball.x = ball.radius
    ball.vx = Math.abs(ball.vx)
  }
  if (ball.x + ball.radius >= CANVAS_WIDTH && ball.y - ball.radius < rightBarBottom) {
    ball.x = CANVAS_WIDTH - ball.radius
    ball.vx = -Math.abs(ball.vx)
  }
}

// Avance le ballon avec sous-pas (taille ≤ radius·ratio) pour gérer les
// vitesses élevées sans tunneling à travers les joueurs ou les barres.
// Le bonus slowBall divise la gravité tant qu'il est actif.
export function updateBall(state: GameState): void {
  const { ball, goal1, goal2 } = state
  const gravity = state.slowBallFrames > 0 ? GRAVITY_BALL * SLOW_BALL_GRAVITY_FACTOR : GRAVITY_BALL

  const projectedTravel = Math.hypot(ball.vx, ball.vy + gravity)
  const stepDistance = Math.max(1, ball.radius * BALL_SUBSTEP_RATIO)
  const steps = Math.max(1, Math.min(BALL_MAX_SUBSTEPS, Math.ceil(projectedTravel / stepDistance)))
  const stepGravity = gravity / steps

  for (let i = 0; i < steps; i++) {
    if (i === 0 && ballKickCooldown > 0) ballKickCooldown--

    ball.vy += stepGravity
    ball.x += ball.vx / steps
    ball.y += ball.vy / steps

    // Deux passes : si une collision déplace le ballon vers un autre joueur, on re-résout.
    for (let pass = 0; pass < 2; pass++) {
      resolveBallPlayerCollision(ball, state.player1, true)
      resolveBallPlayerCollision(ball, state.player2, false)
    }

    checkCrossbarCollision(ball, goal1)
    checkCrossbarCollision(ball, goal2)
    checkObstacleCollisions(ball, state.obstacles)
    resolveBallWorldBounds(ball, goal1, goal2)

    if (checkGoal(state)) break
  }
}
