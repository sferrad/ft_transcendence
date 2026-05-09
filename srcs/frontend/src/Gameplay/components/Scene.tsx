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

const GROUND_Y = CANVAS_HEIGHT * 0.7

// Adapte l'échelle du canvas pour qu'il tienne dans la fenêtre.
function useScale(): number {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const compute = () => {
      const sx = window.innerWidth / CANVAS_WIDTH
      const sy = window.innerHeight / CANVAS_HEIGHT
      setScale(Math.min(sx, sy))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])
  return scale
}

// Conteneur visuel : fond, terrain, cache sous-sol, ligne médiane, score, et
// les enfants (joueurs, ballon, cages, overlays). Tout le reste se positionne
// en absolu dans cet espace de 1800×1000.
export function Scene({ leftScore, rightScore, leftName, rightName, children }: SceneProps) {
  const scale = useScale()

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
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

          {/* Cache sous le sol pour ne pas voir le fond. */}
          <div style={{
            position: 'absolute',
            top: GROUND_Y,
            left: 0,
            right: 0,
            height: CANVAS_HEIGHT - GROUND_Y,
            backgroundColor: '#000',
            zIndex: 0,
          }} />

          <Score
            leftScore={leftScore}
            rightScore={rightScore}
            leftName={leftName}
            rightName={rightName}
            style={{ top: 'auto', bottom: 8, left: 0, zIndex: 10 }}
          />

          {/* Ligne médiane. */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: '#333',
            transform: 'translateX(-50%)',
          }} />

          {children}
        </div>
      </div>
    </div>
  )
}
