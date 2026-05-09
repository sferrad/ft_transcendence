// Calculs géométriques (visuels et collisions) pour les joueurs et les cages.
// Le pied du joueur orbite autour d'un pivot situé sous la tête : repos = pied
// vers le bas, frappe = pied vers l'avant. Le rectangle « pied » est toujours
// perpendiculaire au rayon de l'orbite.

import { type Goal } from './types'
import { GOAL_BASE_INNER_WIDTH } from './constants'

// ─────────── SPRITE JOUEUR ───────────
const SPRITE_NATIVE_WIDTH = 1408
const SPRITE_NATIVE_HEIGHT = 768

export const PLAYER_SPRITE_FRAME_RATIO = 2.35
export const PLAYER_SPRITE_ZOOM = 2.2
export const PLAYER_SPRITE_ASPECT_RATIO = SPRITE_NATIVE_WIDTH / SPRITE_NATIVE_HEIGHT
export const PLAYER_SPRITE_TOP_OFFSET = 2.4

// ─────────── ORBITE DU PIED ───────────
const SHOE_ORBIT_RADIUS = 3                 // multiples du rayon joueur
const SHOE_PIVOT_FORWARD_RATIO = 0.25       // décalage du pivot vs centre tête
const SHOE_PIVOT_DOWN_RATIO = 0.5
const SHOE_ANGLE_REST = Math.PI / 2         // pied vers le bas (repos)
const SHOE_ANGLE_KICK = 0                   // pied vers l'avant (frappe)
// Légère inclinaison vers l'arrière au repos.
export const SHOE_BEHIND_OFFSET = Math.PI / 30

// ─────────── INTERFACES ───────────
export interface PlayerHeadBounds {
  left: number
  top: number
  right: number
  bottom: number
}

export interface PlayerShoeBounds {
  left: number
  top: number
  right: number
  bottom: number
  centerX: number
  centerY: number
  width: number
  height: number
  rotation: number
  mirrored: boolean
}

export interface PlayerVisualLayout {
  head: PlayerHeadBounds
  shoe: PlayerShoeBounds
  mirrored: boolean
}

export interface GoalVisualBounds {
  left: number
  right: number
  top: number
  width: number
  height: number
  barBottom: number
  // X au-delà duquel le ballon est considéré comme « entré » dans la cage.
  entryThreshold: number
}

// ─────────── PLAYER ───────────
export function getPlayerSpriteFrameSize(radius: number): number {
  return radius * PLAYER_SPRITE_FRAME_RATIO
}

function getPlayerHeadBounds(x: number, y: number, radius: number): PlayerHeadBounds {
  const frameSize = getPlayerSpriteFrameSize(radius)
  const width = frameSize * PLAYER_SPRITE_ZOOM * 0.92
  const height = (frameSize / PLAYER_SPRITE_ASPECT_RATIO) * PLAYER_SPRITE_ZOOM * 0.92
  const centerY = y - radius * PLAYER_SPRITE_TOP_OFFSET + frameSize / 2
  return {
    left: x - width / 2,
    top: centerY - height / 2,
    right: x + width / 2,
    bottom: centerY + height / 2,
  }
}

function getPlayerShoeBounds(
  radius: number,
  isKicking: boolean,
  facingRight: boolean,
  kickProgress: number,
  head: PlayerHeadBounds,
): PlayerShoeBounds {
  const swing = isKicking ? Math.min(1, Math.max(0, kickProgress)) : 0
  const headCenterX = (head.left + head.right) / 2
  const headCenterY = (head.top + head.bottom) / 2
  const dir = facingRight ? 1 : -1

  const pivotX = headCenterX + dir * radius * SHOE_PIVOT_FORWARD_RATIO
  const pivotY = headCenterY + radius * SHOE_PIVOT_DOWN_RATIO
  const orbitRadius = radius * SHOE_ORBIT_RADIUS

  // P1 (dir=+1) : repos = PI/2 + offset, frappe = 0      (devant à droite)
  // P2 (dir=-1) : repos = PI/2 - offset, frappe = PI     (devant à gauche)
  const restAngle = SHOE_ANGLE_REST + dir * SHOE_BEHIND_OFFSET
  const kickAngle = facingRight ? SHOE_ANGLE_KICK : Math.PI
  const orbitAngle = restAngle + (kickAngle - restAngle) * swing

  const centerX = pivotX + Math.cos(orbitAngle) * orbitRadius
  const centerY = pivotY + Math.sin(orbitAngle) * orbitRadius
  const width = Math.max(30, radius * 2.9)
  const height = Math.max(12, radius * 1.0)

  // Le rectangle est perpendiculaire au rayon d'orbite.
  const rotation = orbitAngle + Math.PI / 2

  return {
    left: centerX - width / 2,
    top: centerY - height / 2,
    right: centerX + width / 2,
    bottom: centerY + height / 2,
    centerX,
    centerY,
    width,
    height,
    rotation,
    mirrored: !facingRight,
  }
}

export function getPlayerVisualLayout(
  x: number,
  y: number,
  radius: number,
  isKicking: boolean,
  facingRight: boolean,
  kickProgress: number,
): PlayerVisualLayout {
  const head = getPlayerHeadBounds(x, y, radius)
  const shoe = getPlayerShoeBounds(radius, isKicking, facingRight, kickProgress, head)
  return { head, shoe, mirrored: !facingRight }
}

// ─────────── GOAL ───────────
export function getGoalVisualBounds(goal: Goal): GoalVisualBounds {
  // Le visuel SVG est plus large que l'ouverture interne (perspective).
  const width = GOAL_BASE_INNER_WIDTH * 4
  const height = goal.postHeight
  const left = goal.side === 'left' ? goal.x - 130 : goal.x - width + 130
  const right = left + width
  const top = goal.crossbarY - 30
  const barBottom = top + goal.crossbarHeight

  // But validé après 20% de pénétration dans l'ouverture.
  const entryThreshold = goal.side === 'left'
    ? right - width * 0.2
    : left + width * 0.2

  return { left, right, top, width, height, barBottom, entryThreshold }
}
