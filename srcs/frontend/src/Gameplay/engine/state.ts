// Création et reset de l'état de jeu. Reset des joueurs préserve les scores.

import { type GameState, type Goal, type Obstacle, type Player } from './types'
import {
  CANVAS_WIDTH, GROUND_Y,
  PLAYER_BASE_RADIUS, PLAYER_FLOOR_Y, PLAYER1_START_X, PLAYER2_START_X, PLAYER_SPEED,
  GOAL_BASE_HEIGHT, GOAL_BASE_INNER_WIDTH, GOAL_CROSSBAR_Y, CROSSBAR_HEIGHT,
  OBSTACLE_RADIUS, OBSTACLE_POSITIONS,
  HAPPENING_SPAWN_INTERVAL,
  WINNING_SCORE,
} from './constants'
import { resetDashBoosts, resetDashCooldowns } from './input'
import { resetKickCooldown } from './physics'
import { resetAIJumpDash } from './ai'

function createGoals(): { goal1: Goal; goal2: Goal } {
  const postHeight = GOAL_BASE_HEIGHT + CROSSBAR_HEIGHT
  const halfInner = GOAL_BASE_INNER_WIDTH / 2
  const baseGoal = {
    postWidth: halfInner,
    postHeight,
    innerWidth: GOAL_BASE_INNER_WIDTH,
    crossbarY: GOAL_CROSSBAR_Y,
    crossbarHeight: CROSSBAR_HEIGHT,
    widthMultiplier: 1,
    effectFrames: 0,
  }
  return {
    goal1: { ...baseGoal, x: 0, side: 'left' },
    goal2: { ...baseGoal, x: CANVAS_WIDTH - halfInner, side: 'right' },
  }
}

function createPlayer(startX: number): Player {
  return {
    x: startX,
    y: PLAYER_FLOOR_Y,
    vx: 0, vy: 0,
    radius: PLAYER_BASE_RADIUS,
    speed: PLAYER_SPEED,
    score: 0,
    isKicking: false,
    kickTimer: 0,
    freezeFrames: 0,
    speedBoostFrames: 0,
    kickBoostFrames: 0,
  }
}

function randomKickoffVx(): number {
  return (Math.random() > 0.5 ? 1 : -1) * 3
}

function createObstacles(): Obstacle[] {
  return OBSTACLE_POSITIONS.map(({ x, y }) => ({ x, y, radius: OBSTACLE_RADIUS }))
}

export function createInitialState(): GameState {
  resetDashBoosts()
  resetDashCooldowns()
  resetKickCooldown()
  resetAIJumpDash()
  return {
    ball: { x: CANVAS_WIDTH / 2, y: 30, vx: randomKickoffVx(), vy: 0, radius: 20 },
    player1: createPlayer(PLAYER1_START_X),
    player2: createPlayer(PLAYER2_START_X),
    ...createGoals(),
    obstacles: createObstacles(),
    happening: null,
    framesUntilNextHappening: HAPPENING_SPAWN_INTERVAL,
    slowBallFrames: 0,
    status: 'playing',
    winner: null,
  }
}

export function resetBall(state: GameState): void {
  state.ball.x = CANVAS_WIDTH / 2
  state.ball.y = 30
  state.ball.vx = randomKickoffVx()
  state.ball.vy = 0
}

export function resetPlayers(state: GameState): void {
  resetDashBoosts()
  resetDashCooldowns()
  resetKickCooldown()
  resetAIJumpDash()
  // Réinitialise positions et états (y compris effets) mais conserve les scores.
  Object.assign(state.player1, createPlayer(PLAYER1_START_X), { score: state.player1.score })
  Object.assign(state.player2, createPlayer(PLAYER2_START_X), { score: state.player2.score })
  state.happening = null
  state.framesUntilNextHappening = HAPPENING_SPAWN_INTERVAL
  state.slowBallFrames = 0
  state.goal1.widthMultiplier = 1
  state.goal1.effectFrames = 0
  state.goal2.widthMultiplier = 1
  state.goal2.effectFrames = 0
}

export function checkWinner(state: GameState): void {
  if (state.player1.score >= WINNING_SCORE) {
    state.status = 'finished'
    state.winner = 'player1'
  } else if (state.player2.score >= WINNING_SCORE) {
    state.status = 'finished'
    state.winner = 'player2'
  }
}

// Limite la position X du joueur à l'intérieur du terrain.
export function clampPlayerX(x: number): number {
  return Math.max(PLAYER_BASE_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_BASE_RADIUS, x))
}

// Clamp final post-mouvement : X dans le terrain, Y pas sous le sol.
export function clampPlayer(p: Player): void {
  p.x = clampPlayerX(p.x)
  p.y = Math.min(p.y, PLAYER_FLOOR_Y)
}

// Re-export pour ergonomie.
export { GROUND_Y, PLAYER_FLOOR_Y }
