import { type ReactNode, useEffect, useState } from 'react'
import { Field } from './Field'
import { Score } from './Score'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../engine'
import { type ThemeConfig, THEMES } from '../themes'

interface SceneProps {
  leftScore: number
  rightScore: number
  leftName: string
  rightName: string
  timeLeft?: number | null
  winningScore?: number | null
  theme?: ThemeConfig
  children: ReactNode
}

const FOOTER_HEIGHT = 36
const SCORE_BAND_HEIGHT = 150

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

export function Scene({ leftScore, rightScore, leftName, rightName, timeLeft, winningScore, theme = THEMES[0], children }: SceneProps) {
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
          overflow: 'hidden',
          border: '2px solid #4b5563',
          borderRadius: 4,
          ...theme.sceneBackground,
        }}>
          <Field fieldTheme={theme.field} />

          {children}

          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: SCORE_BAND_HEIGHT,
            backgroundColor: theme.scoreBand.backgroundColor,
            borderTop: `1px solid ${theme.scoreBand.borderColor}`,
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
              timeLeft={timeLeft}
              winningScore={winningScore}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
