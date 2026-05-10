// Modèles de données du jeu. Tous les états mutables tiennent dans GameState.

export interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

export interface Player {
  x: number
  y: number
  vx: number              // vélocité horizontale appliquée cette frame
  vy: number              // vélocité verticale (saut, gravité)
  radius: number
  speed: number
  score: number
  isKicking: boolean      // true pendant l'animation du tir
  kickTimer: number       // décompte de frames d'animation
  // Effets temporaires des happenings (frames restantes, 0 = aucun effet)
  freezeFrames: number       // gelé : ne peut ni bouger ni tirer
  speedBoostFrames: number   // vitesse augmentée
  kickBoostFrames: number    // puissance de tir augmentée
}

// Rond statique sur lequel le ballon rebondit (cercle vs cercle).
export interface Obstacle {
  x: number
  y: number
  radius: number
}

// Bonus qui apparaît à intervalles, tombe avec rebonds, et applique un effet
// quand il est touché par un joueur.
export type HappeningKind = 'freeze' | 'speedBoost' | 'megaKick' | 'slowBall' | 'shrinkGoal' | 'growGoal'

export interface Happening {
  kind: HappeningKind
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

export interface Goal {
  x: number
  postWidth: number
  postHeight: number
  innerWidth: number      // largeur intérieure de la cage
  crossbarY: number
  crossbarHeight: number
  side: 'left' | 'right'
  // Bonus shrinkGoal/growGoal : multiplicateur de largeur (1 = normal).
  widthMultiplier: number
  effectFrames: number    // frames restantes de l'effet ; 0 = retour à la normale
}

export interface GameState {
  ball: Ball
  player1: Player
  player2: Player
  goal1: Goal
  goal2: Goal
  obstacles: Obstacle[]
  // Bonus actuellement à collecter (null si aucun en cours).
  happening: Happening | null
  // Décompte avant le prochain spawn (0 = spawn dès que le slot est libre).
  framesUntilNextHappening: number
  // Effet global : gravité du ballon réduite tant que > 0.
  slowBallFrames: number
  status: 'playing' | 'finished'
  winner: string | null
}
