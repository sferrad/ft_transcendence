import { useEffect, useRef } from 'react'
import { CANVAS_HEIGHT } from '../engine'

const GROUND_Y = CANVAS_HEIGHT * 0.7
const FIELD_WIDTH = 1800
const FIELD_HEIGHT = 320
const FIELD_TOP = GROUND_Y - 80

const GRASS_COLOR = '#3b7b10'
const STRIPE_COLOR = 'rgba(21,61,10,0.14)'
const STRIPE_WIDTH = 80
const STRIPE_GAP = STRIPE_WIDTH * 2
const STRIPE_SKEW = 18

const PENALTY_MARGIN = 180
const PENALTY_WIDTH = 180
const PENALTY_HEIGHT = 200
const GOAL_AREA_WIDTH = 85
const GOAL_AREA_HEIGHT = 140
const PENALTY_SPOT_OFFSET = 396

function drawFootballField(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // Pelouse de base.
  ctx.fillStyle = GRASS_COLOR
  ctx.fillRect(0, 0, width, height)

  // Bandes verticales inclinées (perspective).
  ctx.fillStyle = STRIPE_COLOR
  for (let x = -STRIPE_WIDTH; x < width + STRIPE_WIDTH; x += STRIPE_GAP) {
    ctx.beginPath()
    ctx.moveTo(x + STRIPE_SKEW, 0)
    ctx.lineTo(x + STRIPE_WIDTH + STRIPE_SKEW, 0)
    ctx.lineTo(x + STRIPE_WIDTH, height)
    ctx.lineTo(x, height)
    ctx.closePath()
    ctx.fill()
  }

  // Lignes blanches (médiane, cercle central, lignes de touche).
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(width / 2, 0)
  ctx.lineTo(width / 2, height)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, 50, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(width, 0)
  ctx.moveTo(0, height)
  ctx.lineTo(width, height)
  ctx.stroke()

  // Surfaces de réparation et surfaces de but.
  const penaltyTop = (height - PENALTY_HEIGHT) / 2
  const goalAreaTop = (height - GOAL_AREA_HEIGHT) / 2
  const penaltyRightX = width - PENALTY_WIDTH - PENALTY_MARGIN

  ctx.strokeRect(PENALTY_MARGIN, penaltyTop, PENALTY_WIDTH, PENALTY_HEIGHT)
  ctx.strokeRect(PENALTY_MARGIN, goalAreaTop, GOAL_AREA_WIDTH, GOAL_AREA_HEIGHT)
  ctx.strokeRect(penaltyRightX, penaltyTop, PENALTY_WIDTH, PENALTY_HEIGHT)
  ctx.strokeRect(width - GOAL_AREA_WIDTH - PENALTY_MARGIN, goalAreaTop, GOAL_AREA_WIDTH, GOAL_AREA_HEIGHT)

  // Points de penalty.
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(PENALTY_SPOT_OFFSET, height / 2, 3, 0, Math.PI * 2)
  ctx.arc(width - PENALTY_SPOT_OFFSET, height / 2, 3, 0, Math.PI * 2)
  ctx.fill()
}

export function Field() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) drawFootballField(ctx, FIELD_WIDTH, FIELD_HEIGHT)
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
