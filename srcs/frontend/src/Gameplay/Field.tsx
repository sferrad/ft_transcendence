import { CANVAS_HEIGHT } from './gameEngine'
import { useEffect, useRef } from 'react'

const GROUND_Y = CANVAS_HEIGHT * 0.7
const FIELD_WIDTH = 1800
const FIELD_HEIGHT = 320

// Position field to align with GROUND_Y
const FIELD_TOP = GROUND_Y - 80

function drawFootballField(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // Remplir avec couleur herbe
  ctx.fillStyle = '#2d5016'
  ctx.fillRect(0, 0, width, height)

  // Herbe avec légère variation texture
  ctx.fillStyle = 'rgba(45, 80, 22, 0.3)'
  for (let i = 0; i < height; i += 10) {
    ctx.fillRect(0, i, width, 5)
  }

  // Lignes blanches du terrain
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3

  // Ligne médiane verticale
  ctx.beginPath()
  ctx.moveTo(width / 2, 0)
  ctx.lineTo(width / 2, height)
  ctx.stroke()

  // Cercle médian (approximé avec arc)
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, 50, 0, Math.PI * 2)
  ctx.stroke()

  // Marquages volontairement plus a l'interieur du terrain.
  const penaltyAreaX = 180
  const penaltyAreaWidth = 180
  const penaltyAreaHeight = 200
  const penaltyAreaTop = (height - penaltyAreaHeight) / 2

  // Penalty box gauche
  ctx.strokeRect(penaltyAreaX, penaltyAreaTop, penaltyAreaWidth, penaltyAreaHeight)

  // Goal area gauche (petit rectangle)
  const goalAreaWidth = 85
  const goalAreaHeight = 140
  const goalAreaTop = (height - goalAreaHeight) / 2
  ctx.strokeRect(penaltyAreaX, goalAreaTop, goalAreaWidth, goalAreaHeight)

  // Penalty spot gauche
  const penaltySpotX = 396
  const penaltySpotY = height / 2
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(penaltySpotX, penaltySpotY, 3, 0, Math.PI * 2)
  ctx.fill()

  // Penalty box droite (symétrique)
  const penaltyAreaXRight = width - penaltyAreaWidth - penaltyAreaX
  ctx.strokeRect(penaltyAreaXRight, penaltyAreaTop, penaltyAreaWidth, penaltyAreaHeight)

  // Goal area droite
  ctx.strokeRect(width - goalAreaWidth - penaltyAreaX, goalAreaTop, goalAreaWidth, goalAreaHeight)

  // Penalty spot droite
  const penaltySpotXRight = width - 396
  ctx.beginPath()
  ctx.arc(penaltySpotXRight, penaltySpotY, 3, 0, Math.PI * 2)
  ctx.fill()

  // Lignes de touche (haut et bas)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(width, 0)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(0, height)
  ctx.lineTo(width, height)
  ctx.stroke()
}

export function Field(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    drawFootballField(ctx, FIELD_WIDTH, FIELD_HEIGHT)
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: `${FIELD_TOP}px`,
        transform: 'translateX(-50%)',
        perspective: '1000px',
        zIndex: 2,
      }}
    >
      <canvas
        ref={canvasRef}
        width={FIELD_WIDTH}
        height={FIELD_HEIGHT}
        style={{
          display: 'block',
          transform: 'rotateX(25deg) scaleY(0.85)',
          transformOrigin: 'center top',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
