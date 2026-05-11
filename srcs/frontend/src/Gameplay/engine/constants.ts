// Toutes les constantes numériques du jeu. Modifier une valeur ici se propage
// partout. Les autres fichiers du moteur lisent depuis ce module.

// ─────────── MONDE ───────────
export const CANVAS_WIDTH = 1800
export const CANVAS_HEIGHT = 1000
export const GROUND_Y = CANVAS_HEIGHT * 0.7

// ─────────── JOUEUR (taille / placement) ───────────
export const PLAYER_BASE_RADIUS = 20
export const PLAYER_FLOOR_Y = GROUND_Y - PLAYER_BASE_RADIUS
export const PLAYER1_START_X = 180
export const PLAYER2_START_X = CANVAS_WIDTH - 180
export const PLAYER_SPEED = 7

// ─────────── CAGE (taille / position) ───────────
export const GOAL_BASE_HEIGHT = 260
export const GOAL_BASE_INNER_WIDTH = 70
export const GOAL_VERTICAL_OFFSET = 130        // positif = cage plus haute
export const CROSSBAR_HEIGHT = GOAL_BASE_HEIGHT * 0.04
export const GOAL_CROSSBAR_Y = GROUND_Y - GOAL_BASE_HEIGHT + GOAL_VERTICAL_OFFSET

// ─────────── PHYSIQUE BALLON ───────────
export const GRAVITY_BALL = 0.7
export const BOUNCE_DAMPING = 0.9              // 0 = pas de rebond, 1 = parfait
export const BALL_FRICTION = 0.6               // friction au sol
export const MIN_BOUNCE_VY = 1.8               // sous ce seuil, plus de rebond
export const BALL_SUBSTEP_RATIO = 0.45         // sous-pas = radius * ratio
export const BALL_MAX_SUBSTEPS = 24

// ─────────── PHYSIQUE JOUEUR ───────────
export const GRAVITY_PLAYER = 0.5
export const JUMP_FORCE = -12                  // négatif = vers le haut
export const DASH_IMPULSE = 40                 // vitesse instantanée du dash
export const DASH_DECAY = 0.8                  // dissipation par frame
export const DASH_STOP_EPSILON = 0.3           // sous ce seuil, dash arrêté net
// Cooldown entre deux dashes (en frames). 60 frames ≈ 1s à 60fps.
export const DASH_COOLDOWN_FRAMES = 30
export const PLAYER_RESTITUTION = 0.45         // élasticité ballon ↔ joueur
export const MIN_OUT_SPEED = 1.6               // vitesse min de sortie après rebond passif

// ─────────── FRAPPE ───────────
export const KICK_ANIM_FRAMES = 8              // durée de l'animation de tir
export const MAX_KICK_POWER = 35               // puissance maxi (frappe à mi-course)
export const VERTICAL_KICK_ATTENUATION = 0.5   // < 1 = frappes plus tendues
export const KICK_RANGE = 25                   // utilisé par l'IA pour décider de tirer

// ─────────── OBSTACLES (ronds blancs) ───────────
// Disposés en triangle inversé ▽ : 2 en haut, 1 en bas au centre.
export const OBSTACLE_RADIUS = 38
export const OBSTACLE_POSITIONS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 600,  y: 220 },   // haut gauche
  { x: 1200, y: 220 },   // haut droite
  { x: 900,  y: 400 },   // bas centre
]

// ─────────── HAPPENINGS (bonus aléatoires) ───────────
// Une icône tombe du ciel toutes les N frames après collecte/disparition.
// 60 fps → 480 frames = 8s.
export const HAPPENING_SPAWN_INTERVAL = 200
export const HAPPENING_RADIUS = 26
// Durées des effets en frames.
export const FREEZE_DURATION = 180          // 3s
export const SPEED_BOOST_DURATION = 300     // 5s
export const MEGA_KICK_DURATION = 300       // 5s
export const SLOW_BALL_DURATION = 300       // 5s
// Multiplicateurs des effets.
export const SPEED_BOOST_MULTIPLIER = 2
export const MEGA_KICK_MULTIPLIER = 3
export const SLOW_BALL_GRAVITY_FACTOR = 0.33

export const SHRINK_GOAL_DURATION = 300      // 5s
export const GROW_GOAL_DURATION = 300        // 5s
export const SHRINK_GOAL_MULTIPLIER = 0.5    // cage rétrécie de moitié
export const GROW_GOAL_MULTIPLIER = 1.5      // cage agrandie

// ─────────── PARTIE ───────────
export const WINNING_SCORE = 3
export const SCORE_OPTIONS: ReadonlyArray<3 | 5 | null> = [3, 5, null]
export const SCORE_DEFAULT: 3 | 5 | null = 3
export const GOAL_FLASH_DURATION_MS = 2200
export const VERSUS_SCREEN_DURATION_MS = 3500

// ─────────── TIMER ───────────
// Durées proposées dans la sélection de personnages (en secondes). null = illimité.
export const TIMER_OPTIONS: ReadonlyArray<30 | 60 | null> = [30, 60, null]
export const TIMER_DEFAULT: 30 | 60 | null = 30
