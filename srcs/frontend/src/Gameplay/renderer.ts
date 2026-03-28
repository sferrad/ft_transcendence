// srcs/frontend/src/Gameplay/renderer.ts

import { type GameState } from './types'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './gameEngine'

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState): void {
  // Fond
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Ligne centrale
  ctx.setLineDash([10, 10])
  ctx.strokeStyle = '#ffffff44'
  ctx.beginPath()
  ctx.moveTo(CANVAS_WIDTH / 2, 0)
  ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT)
  ctx.stroke()
  ctx.setLineDash([])

  // Joueur 1 (bleu)
  ctx.fillStyle = '#4fc3f7'
  ctx.fillRect(state.player1.x, state.player1.y, state.player1.width, state.player1.height)

  // Joueur 2 (rouge)
  ctx.fillStyle = '#ef5350'
  ctx.fillRect(state.player2.x, state.player2.y, state.player2.width, state.player2.height)

  // Balle
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2)
  ctx.fill()

  // Scores
  ctx.fillStyle = '#ffffff'
  ctx.font = '48px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(String(state.player1.score), CANVAS_WIDTH / 4, 60)
  ctx.fillText(String(state.player2.score), (CANVAS_WIDTH / 4) * 3, 60)
}