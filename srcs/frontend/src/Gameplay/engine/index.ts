// ═══════════════════════════════════════════════════════════════════════════
//  POINT D'ENTRÉE DU MOTEUR  —  import { ... } from '../engine'
// ═══════════════════════════════════════════════════════════════════════════
//
//  Ce fichier a deux rôles :
//
//  1. ORCHESTRATION D'UNE FRAME (updateGame ci-dessous)
//     Pour chaque tick, on enchaîne :
//        input clavier/IA  →  vitesses cibles
//                          →  mouvement substeppé (anti-tunneling)
//                          →  séparation ballon/joueurs (anti-coincement)
//                          →  clamp + animations de tir
//                          →  physique du ballon (gravité, rebonds, buts)
//     Aucune logique métier ici, juste l'enchaînement.
//
//  2. FAÇADE DE L'API PUBLIQUE (re-exports en bas)
//     Le reste de l'app (composants React, hook useGameLoop) n'importe que
//     depuis '../engine'. Les fichiers internes (physics, collisions, etc.)
//     ne sont jamais importés directement de l'extérieur.
//
// ═══════════════════════════════════════════════════════════════════════════

import { type GameState } from './types'
import { type Keys } from '../match/inputHandler'
import { KEY_MAPPINGS, computePlayerVelocity } from './input'
import { computeAIVelocity, aiWantsToShoot } from './ai'
import {
  advancePlayersSubstepped, separateBallFromPlayers, tryShoot, updateBall,
} from './physics'
import { updateHappenings } from './happenings'
import { clampPlayer } from './state'

// Une frame complète : input → mouvement substeppé → collisions → physique ballon.
function updatePlayers(state: GameState, keys: Keys, isSolo: boolean): void {
  const { player1: p1, player2: p2, ball } = state

  // 1. Vitesses cibles (sans appliquer le mouvement).
  const p1Input = KEY_MAPPINGS[0](keys)
  computePlayerVelocity(p1, p1Input, 0)

  let p2WantShoot: boolean
  if (isSolo) {
    computeAIVelocity(p2, ball)
    p2WantShoot = aiWantsToShoot(p2, ball)
  } else {
    const p2Input = KEY_MAPPINGS[1](keys)
    computePlayerVelocity(p2, p2Input, 1)
    p2WantShoot = p2Input.shoot
  }

  // 2. Mouvement substeppé : aucun tunneling possible.
  advancePlayersSubstepped(p1, p2, ball)

  // 3. Convergence : le ballon n'est jamais à l'intérieur d'un joueur.
  separateBallFromPlayers(ball, p1, p2)

  // 4. Clamp final + animations de tir.
  clampPlayer(p1)
  clampPlayer(p2)
  tryShoot(p1, p1Input.shoot)
  tryShoot(p2, p2WantShoot)
}

export function updateGame(state: GameState, keys: Keys, isSolo: boolean = false): GameState {
  if (state.status !== 'playing') return state
  updatePlayers(state, keys, isSolo)
  updateBall(state)
  updateHappenings(state)
  return { ...state }
}

// API publique consommée par les composants React.
export { createInitialState } from './state'
export { CANVAS_WIDTH, CANVAS_HEIGHT, KICK_ANIM_FRAMES } from './constants'
export {
  getPlayerVisualLayout, getPlayerSpriteFrameSize, getGoalVisualBounds,
  PLAYER_SPRITE_ASPECT_RATIO, PLAYER_SPRITE_TOP_OFFSET, PLAYER_SPRITE_ZOOM,
} from './geometry'
export type { GameState, Ball, Player, Goal, Obstacle, Happening, HappeningKind } from './types'
