import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGameLoop } from './useGameLoop'
import { Ball } from './components/Ball'
import { PlayerCircle } from './components/PlayerCircle'
import { Score } from './components/Score'
import { GameOver } from './components/GameOver'
import { GoalPost } from './components/GoalPost'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './gameEngine'
import { getCurrentUser } from '../utils/auth'
import { useState, useEffect } from 'react'

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

const Gameplay = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const scale = useScale()

  const user = getCurrentUser()
  const playerName = user?.username || searchParams.get('player') || 'Joueur'
  const aiName = searchParams.get('ai') || 'CPU'

  const { gameState, goalFlash, restart } = useGameLoop(playerName, aiName, true)

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
      {/* Wrapper qui scale le terrain */}
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
        }}>
          <Score
            leftScore={gameState.player1.score}
            rightScore={gameState.player2.score}
            leftName={playerName}
            rightName={aiName}
          />

          {/* Ligne centrale */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: '#333',
            transform: 'translateX(-50%)',
          }} />

          <GoalPost goal={gameState.goal1} />
          <GoalPost goal={gameState.goal2} />

          <Ball
            x={gameState.ball.x}
            y={gameState.ball.y}
            radius={gameState.ball.radius}
          />

          <PlayerCircle
            x={gameState.player1.x}
            y={gameState.player1.y}
            radius={gameState.player1.radius}
            color="#3b82f6"
            isKicking={gameState.player1.isKicking}
            facingRight={true}
          />
          <PlayerCircle
            x={gameState.player2.x}
            y={gameState.player2.y}
            radius={gameState.player2.radius}
            color="#ef4444"
            isKicking={gameState.player2.isKicking}
            facingRight={false}
          />

          {goalFlash && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.65)',
              zIndex: 10,
            }}>
              <div style={{
                fontSize: 72,
                fontWeight: 900,
                color: '#facc15',
                letterSpacing: 4,
                textShadow: '0 0 30px #facc15, 0 0 60px #f97316',
              }}>
                BUUUUT !
              </div>
              <div style={{
                fontSize: 28,
                color: '#fff',
                marginTop: 12,
                fontWeight: 600,
              }}>
                {goalFlash} marque !
              </div>
            </div>
          )}

          {gameState.status === 'finished' && !goalFlash && (
            <GameOver
              winner={
                gameState.winner === 'player1' ? playerName :
                gameState.winner === 'player2' ? aiName : ''
              }
              onReplay={restart}
              onBack={() => navigate('/solo-select')}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default Gameplay