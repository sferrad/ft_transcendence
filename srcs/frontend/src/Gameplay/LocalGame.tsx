import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGameLoop } from './useGameLoop'
import { Ball } from './components/Ball'
import { PlayerCircle } from './components/PlayerCircle'
import { Score } from './components/Score'
import { GameOver } from './components/GameOver'
import { GoalPost } from './components/GoalPost'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './gameEngine'

const LocalGame = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const player1Name = searchParams.get('player1') || 'Joueur 1'
  const player2Name = searchParams.get('player2') || 'Joueur 2'

  const { gameState, goalFlash, restart } = useGameLoop(player1Name, player2Name, false)

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
      <div
        style={{
          position: 'relative',
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundColor: '#000',
          overflow: 'hidden',
        }}
        className="border-2 border-gray-600 rounded"
      >
        <Score
          leftScore={gameState.player1.score}
          rightScore={gameState.player2.score}
          leftName={player1Name}
          rightName={player2Name}
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

        {/* Cages */}
        <GoalPost goal={gameState.goal1} />
        <GoalPost goal={gameState.goal2} />

        {/* Balle */}
        <Ball
          x={gameState.ball.x}
          y={gameState.ball.y}
          radius={gameState.ball.radius}
        />

        {/* Joueurs */}
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

        {/* Écran BUUUT! */}
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
              gameState.winner === 'player1' ? player1Name :
              gameState.winner === 'player2' ? player2Name : ''
            }
            onReplay={restart}
            onBack={() => navigate('/local-select')}
          />
        )}
      </div>

      <p className="text-gray-500 text-sm mt-2">
        J1 (A/D · W · G tir) vs J2 (←/→ · ↑ · M tir)
      </p>
    </div>
  )
}

export default LocalGame
