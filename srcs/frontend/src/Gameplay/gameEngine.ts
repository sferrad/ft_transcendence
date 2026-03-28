import { type GameState, type Ball, type Player, type Goal } from './types'
import { type Keys } from './inputHandler'

export const CANVAS_WIDTH = 800
export const CANVAS_HEIGHT = 500
const WINNING_SCORE = 5

const PLAYER_RADIUS = 30
const GOAL_POST_WIDTH = 15
const GOAL_HEIGHT = 120
const CROSSBAR_HEIGHT = 10

// --- Physique balle ---
const GRAVITY_BALL = 0.35       // gravité par frame
const BOUNCE_DAMPING = 0.55     // amortissement rebond sol (0=stop, 1=parfait)
const BALL_FRICTION = 0.97      // friction horizontale au sol
const MIN_BOUNCE_VY = 1.8       // vitesse min pour rebondir, sinon glisse

// --- Physique joueurs ---
const KICK_SPEED = 8            // vitesse fixe appliquée à chaque contact joueur/balle
const GRAVITY_PLAYER = 0.5      // gravité joueur par frame
const JUMP_FORCE = -13          // force du saut (négatif = vers le haut)

// --- Cages ---
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

// --- État initial ---
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
      x: 180,
      y: CANVAS_HEIGHT - PLAYER_RADIUS,
      vx: 0,
      vy: 0,
      radius: PLAYER_RADIUS,
      speed: 5,
      score: 0,
      isKicking: false,
      kickTimer: 0,
    },
    player2: {
      x: CANVAS_WIDTH - 180,
      y: CANVAS_HEIGHT - PLAYER_RADIUS,
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

// --- Reset balle ---
export function resetBall(state: GameState): void {
  state.ball.x = CANVAS_WIDTH / 2
  state.ball.y = 30
  state.ball.vx = (Math.random() > 0.5 ? 1 : -1) * 3
  state.ball.vy = 0
}

// --- Victoire ---
function checkWinner(state: GameState, scorer: 'player1' | 'player2'): void {
  if (state.player1.score >= WINNING_SCORE) {
    state.status = 'finished'
    state.winner = 'player1'
  } else if (state.player2.score >= WINNING_SCORE) {
    state.status = 'finished'
    state.winner = 'player2'
  }
}

// --- Tir (pied) ---
const SHOOT_SPEED = 9         // vitesse du tir (réduit, plus naturel)
const SHOOT_UP_RATIO = 0.25   // légèrement vers le haut (tir rasant)
const KICK_ANIM_FRAMES = 12   // durée animation pied en frames
const SHOOT_COOLDOWN = 20     // frames minimum entre deux tirs
const KICK_RANGE = 20         // px supplémentaires au-delà de player.radius + ball.radius

function tryShoot(player: Player, ball: Ball, shootRight: boolean, wantShoot: boolean): void {
  // Décrémenter le timer (animation + cooldown)
  if (player.kickTimer > 0) player.kickTimer--

  // Fin d'animation
  if (player.isKicking && player.kickTimer <= 0) {
    player.isKicking = false
  }

  if (!wantShoot) return
  if (player.kickTimer > 0) return  // encore en cooldown ou animation

  // Déclencher l'animation dans tous les cas (même si la balle est loin)
  player.isKicking = true
  player.kickTimer = Math.max(KICK_ANIM_FRAMES, SHOOT_COOLDOWN)

  const dir = shootRight ? 1 : -1

  // Impulsion sur la balle seulement si elle est à portée du pied
  const dx = ball.x - player.x
  const dy = ball.y - player.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist <= player.radius + ball.radius + KICK_RANGE) {
    ball.vx = dir * SHOOT_SPEED
    ball.vy = -SHOOT_SPEED * SHOOT_UP_RATIO  // vers le haut

    // Séparer la balle pour éviter double collision
    const nx = dist > 0 ? dx / dist : dir
    const ny = dist > 0 ? dy / dist : 0
    const overlap = player.radius + ball.radius - dist
    if (overlap > 0) {
      ball.x += nx * (overlap + 2)
      ball.y += ny * (overlap + 2)
    }
  }
}

// --- Déplacement joueurs (hitbox cercle) ---
function updatePlayers(state: GameState, keys: Keys): void {
  const p1 = state.player1
  const p2 = state.player2
  const floor = CANVAS_HEIGHT - PLAYER_RADIUS - 10

  // --- Joueur 1 : A/D horizontal, W pour sauter ---
  p1.vx = 0
  if (keys.a) { p1.x -= p1.speed; p1.vx = -p1.speed }
  if (keys.d) { p1.x += p1.speed; p1.vx = p1.speed }

  // Saut uniquement si au sol
  if (keys.w && p1.y >= floor) {
    p1.vy = JUMP_FORCE
  }

  // Gravité + position verticale
  p1.vy += GRAVITY_PLAYER
  p1.y += p1.vy

  // Sol
  if (p1.y >= floor) {
    p1.y = floor
    p1.vy = 0
  }

  // --- Joueur 2 : flèches ---
  p2.vx = 0
  if (keys.ArrowLeft)  { p2.x -= p2.speed; p2.vx = -p2.speed }
  if (keys.ArrowRight) { p2.x += p2.speed; p2.vx = p2.speed }

  if (keys.ArrowUp && p2.y >= floor) {
    p2.vy = JUMP_FORCE
  }

  p2.vy += GRAVITY_PLAYER
  p2.y += p2.vy

  if (p2.y >= floor) {
    p2.y = floor
    p2.vy = 0
  }

  // Collision entre joueurs
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const dist = Math.sqrt(dx*dx + dy*dy)
  const minDist = p1.radius + p2.radius

  if (dist < minDist && dist > 0) {
    const overlap = minDist - dist
    const nx = dx / dist
    const ny = dy / dist

    // Déplace horizontalement uniquement
    // Vertical : on ne pousse pas vers le bas sous le sol
    p1.x -= nx * (overlap / 2)
    p2.x += nx * (overlap / 2)

    // Pour le vertical : seulement si pas collé au sol
    const p1OnFloor = p1.y >= floor
    const p2OnFloor = p2.y >= floor

    if (!p1OnFloor) p1.y -= ny * (overlap / 2)
    if (!p2OnFloor) p2.y += ny * (overlap / 2)

    // Si l'un est au sol et l'autre par dessus, pousse le dessus vers le haut uniquement
    if (p2OnFloor && !p1OnFloor) p1.y -= ny * overlap
    if (p1OnFloor && !p2OnFloor) p2.y += ny * overlap
  }

  // Limites horizontales
  p1.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, p1.x))
  p2.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, p2.x))

  // --- Tirs ---
  tryShoot(p1, state.ball, true,  keys.g)  // P1 tire vers la droite avec G
  tryShoot(p2, state.ball, false, keys.m)  // P2 tire vers la gauche avec M
}

function ballHitsPlayer(ball: Ball, player: Player): boolean {
  const dx = ball.x - player.x
  const dy = ball.y - player.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  return dist < ball.radius + player.radius
}

function resolveBallPlayerCollision(
  ball: Ball,
  player: Player,
  playerVx: number,  // vitesse horizontale réelle du joueur ce frame (0 si immobile)
  playerVy: number   // vitesse verticale réelle du joueur ce frame
): void {
  const dx = ball.x - player.x
  const dy = ball.y - player.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) return

  const nx = dx / dist
  const ny = dy / dist

  // --- Sépare la balle (toujours) ---
  const overlap = ball.radius + player.radius - dist
  ball.x += nx * (overlap + 1)
  ball.y += ny * (overlap + 1)

  // --- Empêche le joueur de traverser la balle par le dessus ---
  if (ny > 0 && playerVy > 0) {
    player.vy = 0
    player.y = ball.y - ball.radius - player.radius - 1
  }

  // --- Transfert de vitesse : dribble réaliste ---
  // La vitesse de la balle tend vers celle du joueur + séparation
  // Si le joueur est immobile → la balle continue sur son élan naturel
  // Si le joueur avance → la balle est poussée devant lui
  const PUSH_STRENGTH = 0.4   // à quel point le joueur "entraîne" la balle (0=rien, 1=collée)
  const MIN_PUSH = 1.5        // séparation minimale pour éviter chevauchement répété

  // Composante de séparation (toujours active, petite)
  const sepVx = nx * MIN_PUSH
  const sepVy = ny * MIN_PUSH

  // Composante transfert (proportionnelle à la vitesse du joueur)
  const transferVx = playerVx * PUSH_STRENGTH
  const transferVy = playerVy * PUSH_STRENGTH

  // On applique seulement si le joueur "pousse" la balle dans la bonne direction
  // (dot product positif = joueur va vers la balle)
  const dot = playerVx * nx + playerVy * ny
  if (dot < 0) {
    // Joueur va vers la balle → transfert actif
    ball.vx = ball.vx * (1 - PUSH_STRENGTH) + (transferVx + sepVx)
    ball.vy = ball.vy * (1 - PUSH_STRENGTH) + (transferVy + sepVy)
  } else {
    // Joueur s'éloigne ou immobile → juste séparation, la balle garde son élan
    ball.vx += sepVx
    ball.vy += sepVy
  }
}

// --- Collision balle/barre transversale ---
function checkCrossbarCollision(ball: Ball, goal: Goal): void {
  // La barre est un rectangle horizontal au-dessus de la cage
  const barX = goal.side === 'left' ? goal.x : goal.x
  const barW = goal.postWidth + 5  // légèrement plus large pour le visuel
  const barY = goal.crossbarY
  const barH = goal.crossbarHeight

  // Collision cercle/rectangle (barre)
  const closestX = Math.max(barX, Math.min(ball.x, barX + barW))
  const closestY = Math.max(barY, Math.min(ball.y, barY + barH))
  const dx = ball.x - closestX
  const dy = ball.y - closestY
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist < ball.radius) {
    // Rebond : si collision par le dessus/dessous → inverse vy
    if (Math.abs(dy) > Math.abs(dx)) {
      ball.vy *= -1
      ball.y += ball.vy  // évite le chevauchement
    } else {
      ball.vx *= -1
      ball.x += ball.vx
    }
  }
}

// --- Détection de but (balle dans la cage) ---
function checkGoal(state: GameState): void {
  const ball = state.ball
  const g1 = state.goal1
  const g2 = state.goal2

  // Cage gauche : balle dépasse le bord gauche ET est dans l'ouverture de la cage
  if (
    ball.x - ball.radius <= g1.postWidth &&
    ball.y > g1.crossbarY + g1.crossbarHeight
  ) {
    state.player2.score += 1
    checkWinner(state, 'player2')
    if (state.status === 'playing') resetBall(state)
  }

  // Cage droite
  if (
    ball.x + ball.radius >= g2.x &&
    ball.y > g2.crossbarY + g2.crossbarHeight
  ) {
    state.player1.score += 1
    checkWinner(state, 'player1')
    if (state.status === 'playing') resetBall(state)
  }
}

// --- Mise à jour balle ---
function updateBall(state: GameState): void {
  const ball = state.ball
  const g1 = state.goal1
  const g2 = state.goal2

  // Gravité
  ball.vy += GRAVITY_BALL

  ball.x += ball.vx
  ball.y += ball.vy

  // Plafond
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius
    ball.vy = Math.abs(ball.vy) * BOUNCE_DAMPING
  }

  // Sol — rebond amorti ou glisse
  if (ball.y + ball.radius >= CANVAS_HEIGHT) {
    ball.y = CANVAS_HEIGHT - ball.radius
    if (Math.abs(ball.vy) < MIN_BOUNCE_VY) {
      ball.vy = 0
    } else {
      ball.vy = -Math.abs(ball.vy) * BOUNCE_DAMPING
    }
    ball.vx *= BALL_FRICTION
  }

  // Mur gauche — rebond seulement si hors ouverture de la cage
  if (ball.x - ball.radius <= 0 && ball.y < g1.crossbarY + g1.crossbarHeight) {
    ball.x = ball.radius
    ball.vx = Math.abs(ball.vx)
  }

  // Mur droit — rebond seulement si hors ouverture de la cage
  if (ball.x + ball.radius >= CANVAS_WIDTH && ball.y < g2.crossbarY + g2.crossbarHeight) {
    ball.x = CANVAS_WIDTH - ball.radius
    ball.vx = -Math.abs(ball.vx)
  }

  // Collisions joueurs — toujours actives
  if (ballHitsPlayer(ball, state.player1)) {
    const p1Vx = state.player1.isKicking
      ? (state.player1.x < CANVAS_WIDTH / 2 ? KICK_SPEED : -KICK_SPEED)
      : state.player1.vx   // vraie vitesse horizontale ce frame
    resolveBallPlayerCollision(ball, state.player1, p1Vx, state.player1.vy)
  }
  if (ballHitsPlayer(ball, state.player2)) {
    const p2Vx = state.player2.isKicking
      ? (state.player2.x > CANVAS_WIDTH / 2 ? -KICK_SPEED : KICK_SPEED)
      : state.player2.vx
    resolveBallPlayerCollision(ball, state.player2, p2Vx, state.player2.vy)
  }

  // Barres transversales
  checkCrossbarCollision(ball, g1)
  checkCrossbarCollision(ball, g2)

  // Buts
  checkGoal(state)
}

// --- IA (mode solo) ---
// L'IA contrôle player2 : suit la balle, saute si nécessaire, tire si à portée
function updateAI(state: GameState): void {
  const ai = state.player2
  const ball = state.ball
  const floor = CANVAS_HEIGHT - PLAYER_RADIUS - 10

  // Vitesse IA légèrement inférieure au joueur pour que ce soit battable
  const aiSpeed = 4.2

  // Se déplacer vers la balle horizontalement
  if (ball.x > ai.x + 10) ai.x += aiSpeed
  else if (ball.x < ai.x - 10) ai.x -= aiSpeed

  // Sauter si la balle est haute ou si elle vient vers l'IA en hauteur
  const ballComingHigh = ball.vy < 0 && ball.y < CANVAS_HEIGHT * 0.6
  const ballAboveAI = ball.y < ai.y - ai.radius * 1.5
  if ((ballComingHigh || ballAboveAI) && ai.y >= floor) {
    ai.vy = JUMP_FORCE
  }

  // Gravité + sol
  ai.vy += GRAVITY_PLAYER
  ai.y += ai.vy
  if (ai.y >= floor) {
    ai.y = floor
    ai.vy = 0
  }

  // Limites horizontales
  ai.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, ai.x))

  // Tir : l'IA tire vers la gauche (vers la cage adverse) quand la balle est proche
  const dx = ball.x - ai.x
  const dy = ball.y - ai.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const ballInRange = dist <= ai.radius + ball.radius + KICK_RANGE + 30
  // L'IA tire avec une légère imprévisibilité (pas à chaque frame dispo)
  const wantShoot = ballInRange && Math.random() < 0.25
  tryShoot(ai, ball, false, wantShoot)
}

// --- Frame principale ---
export function updateGame(state: GameState, keys: Keys, isSolo: boolean = false): GameState {
  if (state.status !== 'playing') return state

  if (isSolo) {
    // Mode solo : P1 contrôlé par clavier, P2 = IA
    const p1 = state.player1
    const floor = CANVAS_HEIGHT - PLAYER_RADIUS - 10

    if (keys.a) p1.x -= p1.speed
    if (keys.d) p1.x += p1.speed
    if (keys.w && p1.y >= floor) p1.vy = JUMP_FORCE

    p1.vy += GRAVITY_PLAYER
    p1.y += p1.vy
    if (p1.y >= floor) { p1.y = floor; p1.vy = 0 }

    p1.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, p1.x))

    tryShoot(p1, state.ball, true, keys.m)  // solo: M pour tirer

    updateAI(state)
  } else {
    updatePlayers(state, keys)
  }

  updateBall(state)
  return { ...state }
}