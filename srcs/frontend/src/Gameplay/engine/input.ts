// Mapping clavier → input joueur, et calcul de la vitesse cible pour la frame.
// Le mouvement réel est appliqué dans physics.ts avec sous-étapes pour éviter
// le tunneling.

import { type Player } from './types'
import { type Keys } from '../match/inputHandler'
import {
  PLAYER_FLOOR_Y, JUMP_FORCE, GRAVITY_PLAYER,
  DASH_IMPULSE, DASH_DECAY, DASH_STOP_EPSILON,
  SPEED_BOOST_MULTIPLIER,
} from './constants'
import { DASH_COOLDOWN_FRAMES } from './constants'

export interface PlayerInput {
  left: boolean
  right: boolean
  jump: boolean
  shoot: boolean
  dashLeft: boolean
  dashRight: boolean
}

// Index 0 = joueur 1, index 1 = joueur 2.
export const KEY_MAPPINGS: [(k: Keys) => PlayerInput, (k: Keys) => PlayerInput] = [
  (k) => ({
    left: k.a, right: k.d, jump: k.w, shoot: k.g,
    dashLeft: k.p1DashLeft, dashRight: k.p1DashRight,
  }),
  (k) => ({
    left: k.ArrowLeft, right: k.ArrowRight, jump: k.ArrowUp, shoot: k.m,
    dashLeft: k.p2DashLeft, dashRight: k.p2DashRight,
  }),
]

// Boost dash conservé entre frames pour [p1, p2].
export const dashBoosts = [0, 0]
// Cooldown timers (en frames) pour chaque joueur : si >0, dash refusé.
export const dashCooldowns = [0, 0]

export function resetDashBoosts(): void {
  dashBoosts[0] = 0
  dashBoosts[1] = 0
}

export function resetDashCooldowns(): void {
  dashCooldowns[0] = 0
  dashCooldowns[1] = 0
}

function updateDashBoost(currentBoost: number, dashLeft: boolean, dashRight: boolean, idx: 0 | 1): number {
  // Double-tap : remplace immédiatement le boost si le cooldown est écoulé.
  if (dashLeft && !dashRight) {
    if (dashCooldowns[idx] <= 0) {
      dashCooldowns[idx] = DASH_COOLDOWN_FRAMES
      return -DASH_IMPULSE
    }
  }
  if (dashRight && !dashLeft) {
    if (dashCooldowns[idx] <= 0) {
      dashCooldowns[idx] = DASH_COOLDOWN_FRAMES
      return DASH_IMPULSE
    }
  }
  // Sinon, dissipation progressive.
  const decayed = currentBoost * DASH_DECAY
  return Math.abs(decayed) < DASH_STOP_EPSILON ? 0 : decayed
}

// Calcule vx/vy ciblés pour la frame, sans appliquer le mouvement.
// Tient compte des effets actifs : gelé = immobile, speedBoost = vitesse x1.5.
export function computePlayerVelocity(player: Player, input: PlayerInput, dashIndex: 0 | 1): void {
  // Gelé : l'input est ignoré, le joueur reste sur place mais la gravité s'applique.
  if (player.freezeFrames > 0) {
    player.vx = 0
    player.vy += GRAVITY_PLAYER
    return
  }

  // Décrémente le cooldown si nécessaire, puis calcule le boost de dash.
  if (dashCooldowns[dashIndex] > 0) dashCooldowns[dashIndex]--
  dashBoosts[dashIndex] = updateDashBoost(dashBoosts[dashIndex], input.dashLeft, input.dashRight, dashIndex)
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0)
  const speedMul = player.speedBoostFrames > 0 ? SPEED_BOOST_MULTIPLIER : 1
  player.vx = direction * player.speed * speedMul + dashBoosts[dashIndex]
  if (input.jump && player.y >= PLAYER_FLOOR_Y) player.vy = JUMP_FORCE
  player.vy += GRAVITY_PLAYER
}
