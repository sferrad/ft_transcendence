import { type ReactNode, useEffect, useState } from 'react'
import { Field } from './Field'
import { Score } from './Score'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../engine'

interface SceneProps {
  leftScore: number
  rightScore: number
  leftName: string
  rightName: string
  children: ReactNode
}

// Hauteur réservée au footer privacy (App.tsx, fixed bottom-0 ~36 px).
// On retire cette hauteur du calcul de scale pour que le bas du canvas
// (la zone noire avec le score) reste visible au-dessus du footer.
const FOOTER_HEIGHT = 36
// Hauteur du bandeau du score, en coordonnées canvas (sera scalé avec le reste).
// Calibrée pour que le haut du bandeau coïncide avec le bas visuel du Field
// (≈ y=870 après rotateX(25deg) + scaleY(0.85) dans Field.tsx).
const SCORE_BAND_HEIGHT = 130

function useScale(): number {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const compute = () => {
      const sx = window.innerWidth / CANVAS_WIDTH
      const sy = (window.innerHeight - FOOTER_HEIGHT) / CANVAS_HEIGHT
      setScale(Math.min(sx, sy))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])
  return scale
}

export function Scene({ leftScore, rightScore, leftName, rightName, children }: SceneProps) {
  const scale = useScale()

  return (
    <div style={{
      width: '100vw',
      height: `calc(100vh - ${FOOTER_HEIGHT}px)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#111',
      overflow: 'hidden',
    }}>
      <div style={{
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        flexShrink: 0,
      }}>
        <div style={{
          position: 'relative',
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundColor: '#000',
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.18)), url(/assets/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center -450px',
          overflow: 'hidden',
          border: '2px solid #4b5563',
          borderRadius: 4,
        }}>
          <Field />

          {children}

          {/* Bandeau du score : fin, collé au bas du canvas, au-dessus de
              tous les éléments du jeu (ball=20, goalpost=30, etc.) pour rester
              lisible même si un joueur descend bas. */}
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: SCORE_BAND_HEIGHT,
            backgroundColor: '#000',
            borderTop: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 40,
          }}>
            <Score
              leftScore={leftScore}
              rightScore={rightScore}
              leftName={leftName}
              rightName={rightName}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
