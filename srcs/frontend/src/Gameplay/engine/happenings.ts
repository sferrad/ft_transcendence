// Système de bonus aléatoires (« happenings »).
//
// Toutes les HAPPENING_SPAWN_INTERVAL frames (8s par défaut), une icône tombe
// du ciel, rebondit sur le sol et les murs, puis attend d'être collectée par
// un joueur. La collecte applique un effet temporaire (gel, vitesse, frappe,
// ralentissement du ballon).
//
// L'icône utilise la même physique que le ballon (gravité, rebond, friction)
// mais ne collisionne avec rien d'autre que les bords.

import {
  type GameState, type Happening, type HappeningKind, type Player,
} from './types'
import {
  CANVAS_WIDTH, GROUND_Y, GRAVITY_BALL, BOUNCE_DAMPING, BALL_FRICTION, MIN_BOUNCE_VY,
  HAPPENING_SPAWN_INTERVAL, HAPPENING_RADIUS,
  FREEZE_DURATION, SPEED_BOOST_DURATION, MEGA_KICK_DURATION, SLOW_BALL_DURATION,
} from './constants'

const KINDS: HappeningKind[] = ['freeze', 'speedBoost', 'megaKick', 'slowBall']

// Crée un nouveau bonus en haut de la scène, à X aléatoire et avec une légère
// dérive horizontale.
function spawnHappening(): Happening {
  const margin = 200
  return {
    kind: KINDS[Math.floor(Math.random() * KINDS.length)],
    x: margin + Math.random() * (CANVAS_WIDTH - margin * 2),
    y: 50,
    vx: (Math.random() - 0.5) * 4,
    vy: 0,
    radius: HAPPENING_RADIUS,
  }
}

// Avance la position du bonus : gravité + rebond sol/murs.
function advanceHappening(h: Happening): void {
  h.vy += GRAVITY_BALL
  h.x += h.vx
  h.y += h.vy

  if (h.y + h.radius >= GROUND_Y) {
    h.y = GROUND_Y - h.radius
    h.vy = Math.abs(h.vy) < MIN_BOUNCE_VY ? 0 : -Math.abs(h.vy) * BOUNCE_DAMPING
    h.vx *= BALL_FRICTION
  }
  if (h.x - h.radius < 0) {
    h.x = h.radius
    h.vx = Math.abs(h.vx)
  }
  if (h.x + h.radius > CANVAS_WIDTH) {
    h.x = CANVAS_WIDTH - h.radius
    h.vx = -Math.abs(h.vx)
  }
}

// Le bonus est collecté si son cercle touche celui du joueur.
function isCollectedBy(h: Happening, p: Player): boolean {
  const dx = h.x - p.x
  const dy = h.y - p.y
  const minDist = h.radius + p.radius
  return dx * dx + dy * dy <= minDist * minDist
}

// Applique l'effet selon le type. `collector` reçoit les bonus, `opponent`
// les malus.
function applyEffect(state: GameState, kind: HappeningKind, collector: Player, opponent: Player): void {
  switch (kind) {
    case 'freeze':
      opponent.freezeFrames = FREEZE_DURATION
      break
    case 'speedBoost':
      collector.speedBoostFrames = SPEED_BOOST_DURATION
      break
    case 'megaKick':
      collector.kickBoostFrames = MEGA_KICK_DURATION
      break
    case 'slowBall':
      state.slowBallFrames = SLOW_BALL_DURATION
      break
  }
}

// Décrémente tous les compteurs d'effets actifs. Appelé une fois par frame.
function tickEffectTimers(state: GameState): void {
  const { player1: p1, player2: p2 } = state
  if (p1.freezeFrames > 0) p1.freezeFrames--
  if (p1.speedBoostFrames > 0) p1.speedBoostFrames--
  if (p1.kickBoostFrames > 0) p1.kickBoostFrames--
  if (p2.freezeFrames > 0) p2.freezeFrames--
  if (p2.speedBoostFrames > 0) p2.speedBoostFrames--
  if (p2.kickBoostFrames > 0) p2.kickBoostFrames--
  if (state.slowBallFrames > 0) state.slowBallFrames--
}

// Point d'entrée appelé chaque frame depuis updateGame.
export function updateHappenings(state: GameState): void {
  tickEffectTimers(state)

  // Pas de bonus en cours : on attend le prochain spawn.
  if (!state.happening) {
    state.framesUntilNextHappening--
    if (state.framesUntilNextHappening <= 0) {
      state.happening = spawnHappening()
    }
    return
  }

  // Un bonus est en l'air : on l'avance et on teste la collecte.
  advanceHappening(state.happening)

  if (isCollectedBy(state.happening, state.player1)) {
    applyEffect(state, state.happening.kind, state.player1, state.player2)
    state.happening = null
    state.framesUntilNextHappening = HAPPENING_SPAWN_INTERVAL
  } else if (isCollectedBy(state.happening, state.player2)) {
    applyEffect(state, state.happening.kind, state.player2, state.player1)
    state.happening = null
    state.framesUntilNextHappening = HAPPENING_SPAWN_INTERVAL
  }
}
