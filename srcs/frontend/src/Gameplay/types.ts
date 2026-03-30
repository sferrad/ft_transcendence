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
  vx: number    // vélocité horizontale réelle ce frame
  vy: number    // vélocité verticale pour le saut
  radius: number 
  speed: number
  score: number
  isKicking: boolean   // true pendant l'animation du tir
  kickTimer: number    // compteur décroissant (animation + cooldown)
}

export interface Goal {
  x: number 
  postWidth: number
  postHeight: number
  innerWidth: number   // largeur intérieure de la cage
  crossbarY: number  
  crossbarHeight: number
  side: 'left' | 'right'
}

export interface GameState {
  ball: Ball
  player1: Player
  player2: Player
  goal1: Goal
  goal2: Goal
  status: 'playing' | 'finished'
  winner: string | null
}