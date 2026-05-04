import { type ReactNode, useEffect, useState } from 'react'
import { Field } from './Field'
import { Score } from './components/Score'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './gameEngine'

interface GameSceneLayoutProps {
  leftScore: number
  rightScore: number
  leftName: string
  rightName: string
  children: ReactNode
}

function useScale() {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    function compute() {
      const scaleX = window.innerWidth / CANVAS_WIDTH
      const scaleY = window.innerHeight / CANVAS_HEIGHT
      setScale(Math.min(scaleX, scaleY))
    }

    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  return scale
}

export function GameSceneLayout({ leftScore, rightScore, leftName, rightName, children }: GameSceneLayoutProps) {
  const scale = useScale()
  const groundY = CANVAS_HEIGHT * 0.7

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

          <div style={{
            position: 'absolute',
            top: `${groundY}px`,
            left: 0,
            right: 0,
            height: `${CANVAS_HEIGHT - groundY}px`,
            backgroundColor: '#000',
            zIndex: 0,
          }} />

          <Score
            leftScore={leftScore}
            rightScore={rightScore}
            leftName={leftName}
            rightName={rightName}
            style={{
              top: 'auto',
              bottom: 8,
              left: 0,
              zIndex: 10,
            }}
          />

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
