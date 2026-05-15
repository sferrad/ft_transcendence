// Détection géométrique des collisions. Aucune réponse physique ici : ces
// fonctions retournent juste la normale et la pénétration, ou null si pas
// de contact. La résolution (impulsion, séparation) est dans physics.ts.

import { type Ball, type Player } from './types'
import { KICK_ANIM_FRAMES } from './constants'
import { getPlayerVisualLayout } from './geometry'

export interface Collision {
  nx: number             // normale X (du joueur vers le ballon)
  ny: number             // normale Y
  overlap: number        // pénétration en pixels
}

// Cercle vs cercle.
export function collideCircleCircle(
  ball: Ball, cx: number, cy: number, radius: number,
): Collision | null {
  const dx = ball.x - cx
  const dy = ball.y - cy
  const radSum = ball.radius + radius
  const distSq = dx * dx + dy * dy
  if (distSq > radSum * radSum) return null
  if (distSq > 0) {
    const dist = Math.sqrt(distSq)
    return { nx: dx / dist, ny: dy / dist, overlap: radSum - dist }
  }
  // Centres confondus, fallback X+.
  return { nx: 1, ny: 0, overlap: radSum }
}

// Cercle vs capsule (segment [a→b] avec rayon `capsuleRadius`).
// Permet de tester la collision avec n'importe quel point du pied, pas juste la pointe.
export function collideCircleCapsule(
  ball: Ball,
  ax: number, ay: number, bx: number, by: number,
  capsuleRadius: number,
): Collision | null {
  const segDx = bx - ax
  const segDy = by - ay
  const lenSq = segDx * segDx + segDy * segDy

  let closestX: number, closestY: number
  if (lenSq < 1e-10) {
    closestX = ax; closestY = ay
  } else {
    const t = Math.max(0, Math.min(1, ((ball.x - ax) * segDx + (ball.y - ay) * segDy) / lenSq))
    closestX = ax + t * segDx
    closestY = ay + t * segDy
  }

  const dx = ball.x - closestX
  const dy = ball.y - closestY
  const radSum = ball.radius + capsuleRadius
  const distSq = dx * dx + dy * dy
  if (distSq > radSum * radSum) return null
  if (distSq > 1e-10) {
    const dist = Math.sqrt(distSq)
    return { nx: dx / dist, ny: dy / dist, overlap: radSum - dist }
  }
  return { nx: 0, ny: -1, overlap: radSum }
}

// Collision ballon vs joueur : tête (cercle) + pied (capsule).
// Garde celle qui pénètre le plus.
export function collideBallPlayer(
  ball: Ball, player: Player, facingRight: boolean,
): Collision | null {
  const kickProgress = player.kickTimer > 0
    ? (KICK_ANIM_FRAMES - player.kickTimer + 1) / KICK_ANIM_FRAMES
    : 0
  const layout = getPlayerVisualLayout(
    player.x, player.y, player.radius, player.isKicking, facingRight, kickProgress,
  )

  // Tête.
  const headCenterX = (layout.head.left + layout.head.right) / 2
  const headCenterY = (layout.head.top + layout.head.bottom) / 2
  const headRadius = (layout.head.bottom - layout.head.top) / 2
  const headHit = collideCircleCircle(ball, headCenterX, headCenterY, headRadius)

  // Pied : capsule entre talon et bout du pied.
  const fwdX = Math.cos(layout.shoe.rotation)
  const fwdY = Math.sin(layout.shoe.rotation)
  const halfLen = layout.shoe.width / 2
  const heelX = layout.shoe.centerX - fwdX * halfLen
  const heelY = layout.shoe.centerY - fwdY * halfLen
  const toeX = layout.shoe.centerX + fwdX * halfLen
  const toeY = layout.shoe.centerY + fwdY * halfLen
  const shoeRadius = Math.max(6, layout.shoe.height * 0.5)
  const shoeHit = collideCircleCapsule(ball, heelX, heelY, toeX, toeY, shoeRadius)

  if (headHit && shoeHit) return headHit.overlap >= shoeHit.overlap ? headHit : shoeHit
  return headHit ?? shoeHit
}
