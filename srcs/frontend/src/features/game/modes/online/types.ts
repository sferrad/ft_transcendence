export interface ForfeitState {
  isWin: boolean
  opponentName: string
  voluntary: boolean
  winnerRole: 'player1' | 'player2' | null
  score1: number
  score2: number
}

export type Phase = 'idle' | 'searching' | 'error'
export type GameMode = 'ranked' | 'friendly'
